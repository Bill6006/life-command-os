import {
  classificationOf,
  parseCanonicalRecord,
  type CanonicalRecord,
  type PrivacyClass,
  type RecordType,
} from '../../domain/records';
import { openDatabase, SCHEMA_VERSION } from '../../infrastructure/database/connection';
import {
  getAllRecords,
  replaceAllRecords,
} from '../../infrastructure/database/recordRepository';
import { clearProjections } from '../../infrastructure/database/projectionStore';
import {
  listSnapshots as readSnapshots,
  readSnapshot,
  writeSnapshot,
} from '../../infrastructure/database/snapshotStore';
import { digestOf } from '../../infrastructure/crypto/backupCrypto';
import {
  createBackupFile,
  describeProblem,
  openBackup,
  previewBackup,
  serialiseRecords,
  type BackupPreview,
  type BackupProblem,
} from '../../infrastructure/backup/portableBackup';

/**
 * Backup, restore, verification, and rollback (`OWN-066`, `OWN-067`, LEG-133–136).
 *
 * The sequence below is the whole safety argument, and each step exists because the
 * step after it can fail:
 *
 *   1. **Validate everything.** Nothing is opened, nothing is written. A bad file is
 *      rejected with canonical state untouched.
 *   2. **Dry run.** What would change, described before anything does.
 *   3. **Snapshot.** The current state is written to durable storage *first*, so the
 *      way back exists before the way forward is taken.
 *   4. **Replace.** One transaction.
 *   5. **Verify.** Read back from storage and compare digests. Not the values that
 *      were written — the values that are *there*.
 *   6. **Roll back automatically** if verification fails.
 *
 * Success is reported only after step 5. That is what makes "an interrupted restore
 * cannot report success" true rather than hoped for: an interruption at any point
 * means step 5 never runs, so nothing reports success, and the snapshot from step 3
 * survives the interruption.
 */

/* -------------------------------------------------------------------------- */
/* Backup                                                                      */
/* -------------------------------------------------------------------------- */

export type BackupCreation =
  | {
      readonly ok: true;
      readonly file: string;
      readonly filename: string;
      readonly recordCount: number;
    }
  | { readonly ok: false; readonly reason: string };

/** The shortest passphrase the app will accept. Length beats character classes. */
export const MINIMUM_PASSPHRASE_LENGTH = 12;

export async function createEncryptedBackup(
  passphrase: string,
  now: Date,
): Promise<BackupCreation> {
  if (passphrase.length < MINIMUM_PASSPHRASE_LENGTH) {
    return {
      ok: false,
      reason: `Use at least ${String(MINIMUM_PASSPHRASE_LENGTH)} characters. A few unrelated words is stronger than a short scramble, and easier to remember — which matters, because nobody can recover this for you.`,
    };
  }

  const database = await openDatabase();
  const records = await getAllRecords(database);
  const file = await createBackupFile(records, SCHEMA_VERSION, passphrase, now);

  return {
    ok: true,
    file,
    filename: `life-command-os-backup-${now.toISOString().slice(0, 10)}.json`,
    recordCount: records.length,
  };
}

export function inspectBackup(
  raw: string,
): { ok: true; preview: BackupPreview } | { ok: false; message: string } {
  const result = previewBackup(raw);
  return result.ok ? result : { ok: false, message: describeProblem(result.problem) };
}

/* -------------------------------------------------------------------------- */
/* Dry run                                                                     */
/* -------------------------------------------------------------------------- */

export interface RestorePlan {
  readonly createdAt: string;
  readonly incomingCount: number;
  readonly currentCount: number;
  /** In the backup and not here. */
  readonly added: number;
  /** In both, by record id. Restore is a replacement, so these are overwritten. */
  readonly retained: number;
  /**
   * Here and **not** in the backup. A replacement restore removes them, which is the
   * single most consequential fact on this screen and is stated as a number, not
   * buried in prose.
   */
  readonly removed: number;
  readonly byType: readonly { readonly recordType: RecordType; readonly count: number }[];
  readonly privacyClasses: readonly PrivacyClass[];
  readonly quarantinedFieldCount: number;
  readonly storageSchemaVersion: number;
  readonly currentSchemaVersion: number;
  readonly rollbackAvailable: boolean;
}

export type DryRunResult =
  | { readonly ok: true; readonly plan: RestorePlan }
  | { readonly ok: false; readonly problem: BackupProblem; readonly message: string };

/**
 * Says what a restore would do. **Writes nothing.**
 *
 * The owner sees coverage, conflicts, what is added, what is kept, what is removed,
 * which privacy classes are present, and whether rollback will be available — before
 * committing to any of it (LEG-136).
 */
export async function dryRunRestore(raw: string, passphrase: string): Promise<DryRunResult> {
  const opened = await openBackup(raw, passphrase);
  if (!opened.ok) {
    return { ok: false, problem: opened.problem, message: describeProblem(opened.problem) };
  }

  const database = await openDatabase();
  const current = await getAllRecords(database);
  const currentIds = new Set(current.map((record) => record.recordId));
  const incomingIds = new Set(opened.backup.records.map((record) => record.recordId));

  const counts = new Map<RecordType, number>();
  const classes = new Set<PrivacyClass>();
  for (const record of opened.backup.records) {
    counts.set(record.recordType, (counts.get(record.recordType) ?? 0) + 1);
    classes.add(classificationOf(record));
  }

  return {
    ok: true,
    plan: {
      createdAt: opened.backup.createdAt,
      incomingCount: opened.backup.records.length,
      currentCount: current.length,
      added: [...incomingIds].filter((id) => !currentIds.has(id)).length,
      retained: [...incomingIds].filter((id) => currentIds.has(id)).length,
      removed: [...currentIds].filter((id) => !incomingIds.has(id)).length,
      byType: [...counts.entries()]
        .map(([recordType, count]) => ({ recordType, count }))
        .sort((a, b) => a.recordType.localeCompare(b.recordType)),
      privacyClasses: [...classes].sort(),
      quarantinedFieldCount: opened.backup.quarantinedFieldCount,
      storageSchemaVersion: opened.backup.storageSchemaVersion,
      currentSchemaVersion: SCHEMA_VERSION,
      rollbackAvailable: true,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Apply, verify, roll back                                                    */
/* -------------------------------------------------------------------------- */

export type RestoreOutcome =
  | {
      readonly ok: true;
      readonly restoredCount: number;
      readonly snapshotId: string;
      readonly verifiedDigest: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
      /** True when canonical state was put back exactly as it was. */
      readonly rolledBack: boolean;
      readonly snapshotId?: string | undefined;
    };

async function snapshotCurrent(
  reason: string,
  now: Date,
): Promise<{ snapshotId: string; recordCount: number }> {
  const database = await openDatabase();
  const records = await getAllRecords(database);
  const serialised = serialiseRecords(records);

  const snapshotId = crypto.randomUUID();
  await writeSnapshot(database, {
    snapshotId,
    createdAt: now.toISOString(),
    reason,
    recordCount: records.length,
    digest: await digestOf(serialised),
    records: JSON.parse(serialised) as unknown[],
  });

  return { snapshotId, recordCount: records.length };
}

/**
 * Replaces canonical state from a backup, reversibly.
 *
 * Note the verification step: it re-reads from IndexedDB and hashes what came back.
 * Comparing the values just written would prove only that the code can remember what
 * it did a moment ago. The question worth answering is whether the *database* holds
 * them, and the only way to answer it is to ask the database.
 */
export async function applyRestore(
  raw: string,
  passphrase: string,
  now: Date,
): Promise<RestoreOutcome> {
  const opened = await openBackup(raw, passphrase);
  if (!opened.ok) {
    // Nothing was opened and nothing was written.
    return { ok: false, message: describeProblem(opened.problem), rolledBack: false };
  }

  const { snapshotId } = await snapshotCurrent('Before restoring from a backup', now);
  const database = await openDatabase();

  try {
    await replaceAllRecords(database, opened.backup.records);
    await clearProjections(database);
  } catch (error) {
    const rolled = await rollbackToSnapshot(snapshotId);
    return {
      ok: false,
      message:
        `The restore could not be written${rolled.ok ? ' and your previous records have been put back' : ''}. ${error instanceof Error ? error.message : ''}`.trim(),
      rolledBack: rolled.ok,
      snapshotId,
    };
  }

  // Verify against storage, not against memory.
  const persisted = await getAllRecords(database);
  const persistedDigest = await digestOf(serialiseRecords(persisted));

  if (
    persistedDigest !== opened.backup.digest ||
    persisted.length !== opened.backup.records.length
  ) {
    const rolled = await rollbackToSnapshot(snapshotId);
    return {
      ok: false,
      message: rolled.ok
        ? 'The restore did not verify against what is actually stored, so it was undone. Your previous records have been put back exactly as they were.'
        : 'The restore did not verify against what is actually stored, and the rollback also failed. Do not enter anything further; use your backup on a fresh profile.',
      rolledBack: rolled.ok,
      snapshotId,
    };
  }

  return {
    ok: true,
    restoredCount: opened.backup.records.length,
    snapshotId,
    verifiedDigest: persistedDigest,
  };
}

/* -------------------------------------------------------------------------- */
/* Rollback                                                                    */
/* -------------------------------------------------------------------------- */

export interface SnapshotSummary {
  readonly snapshotId: string;
  readonly createdAt: string;
  readonly reason: string;
  readonly recordCount: number;
}

export async function listRestorePoints(): Promise<SnapshotSummary[]> {
  const database = await openDatabase();
  const snapshots = await readSnapshots(database);
  return snapshots.map((snapshot) => ({
    snapshotId: snapshot.snapshotId,
    createdAt: snapshot.createdAt,
    reason: snapshot.reason,
    recordCount: snapshot.recordCount,
  }));
}

export type RollbackOutcome =
  | { readonly ok: true; readonly restoredCount: number }
  | { readonly ok: false; readonly message: string };

/**
 * Puts canonical state back to a snapshot.
 *
 * The snapshot is validated first — record by record, and against its own digest.
 * A rollback that restored a corrupted snapshot would turn a recoverable problem into
 * an unrecoverable one, which is the opposite of the job.
 */
export async function rollbackToSnapshot(snapshotId: string): Promise<RollbackOutcome> {
  const database = await openDatabase();
  const snapshot = await readSnapshot(database, snapshotId);
  if (snapshot === undefined) {
    return { ok: false, message: 'That restore point no longer exists.' };
  }

  const records: CanonicalRecord[] = [];
  for (const candidate of snapshot.records) {
    const result = parseCanonicalRecord(candidate);
    if (!result.ok) {
      return {
        ok: false,
        message: 'That restore point is damaged and was not applied. Nothing has been changed.',
      };
    }
    records.push(result.record);
  }

  const digest = await digestOf(serialiseRecords(records));
  if (digest !== snapshot.digest) {
    return {
      ok: false,
      message: 'That restore point does not match its own checksum. Nothing has been changed.',
    };
  }

  await replaceAllRecords(database, records);
  await clearProjections(database);

  return { ok: true, restoredCount: records.length };
}
