import { openDatabase, SCHEMA_VERSION } from '../../infrastructure/database/connection';
import { countRecords } from '../../infrastructure/database/recordRepository';
import { listSnapshots } from '../../infrastructure/database/snapshotStore';

/**
 * Storage health (LEG-137, LEG-141, Prompt 7B task 7).
 *
 * **Quiet when healthy, actionable when not.** There is no "all systems operational"
 * panel here and there never will be — a status that is always on screen stops being
 * read, and then the one time it says something different, it is not read either.
 *
 * Every issue below is something the owner can actually do something about. Anything
 * they could not act on belongs in a log, not on a surface.
 */

const BACKUP_KEY = 'last-backup-at';
const STALE_BACKUP_MS = 7 * 24 * 60 * 60 * 1000;

export type HealthIssueCode =
  | 'no-backup-yet'
  | 'backup-stale'
  | 'storage-not-persistent'
  | 'storage-nearly-full'
  | 'another-tab-upgraded';

export interface HealthIssue {
  readonly code: HealthIssueCode;
  readonly severity: 'act-now' | 'worth-knowing';
  readonly message: string;
}

export interface StorageHealth {
  readonly recordCount: number;
  readonly schemaVersion: number;
  readonly snapshotCount: number;
  readonly lastBackupAt: string | undefined;
  readonly usageBytes: number | undefined;
  readonly quotaBytes: number | undefined;
  readonly persistent: boolean | undefined;
  /** Empty when nothing needs attention, which is the normal case. */
  readonly issues: readonly HealthIssue[];
}

export async function recordBackupTaken(now: Date): Promise<void> {
  const database = await openDatabase();
  await database.meta.put({ key: BACKUP_KEY, value: now.toISOString() });
}

export async function readStorageHealth(now: Date): Promise<StorageHealth> {
  const database = await openDatabase();
  const recordCount = await countRecords(database);
  const snapshots = await listSnapshots(database);
  const lastBackup = await database.meta.get(BACKUP_KEY);

  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;
  let persistent: boolean | undefined;

  // `navigator.storage` is absent in some contexts and under the Node test runner.
  // Its absence is reported as unknown rather than filled in with a plausible-looking
  // zero — the whole point of this file is that a made-up number is worse than none.
  const storage =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator.storage as StorageManager | undefined);
  if (storage !== undefined) {
    try {
      const estimate = await storage.estimate();
      usageBytes = estimate.usage;
      quotaBytes = estimate.quota;
      persistent = await storage.persisted();
    } catch {
      usageBytes = undefined;
    }
  }

  const issues: HealthIssue[] = [];

  if (recordCount > 0 && lastBackup === undefined) {
    issues.push({
      code: 'no-backup-yet',
      severity: 'act-now',
      message:
        'You have records on this device and no backup. If this browser profile is cleared, they are gone — there is no copy anywhere else.',
    });
  } else if (
    lastBackup !== undefined &&
    now.getTime() - Date.parse(lastBackup.value) > STALE_BACKUP_MS
  ) {
    issues.push({
      code: 'backup-stale',
      severity: 'worth-knowing',
      message: `Your last backup was ${new Date(lastBackup.value).toISOString().slice(0, 10)}. Anything recorded since then exists only here.`,
    });
  }

  if (persistent === false) {
    issues.push({
      code: 'storage-not-persistent',
      severity: 'worth-knowing',
      message:
        'The browser has not granted persistent storage, so it may clear this data on its own if the device runs low. A current backup is the only real protection.',
    });
  }

  if (usageBytes !== undefined && quotaBytes !== undefined && quotaBytes > 0) {
    if (usageBytes / quotaBytes > 0.9) {
      issues.push({
        code: 'storage-nearly-full',
        severity: 'act-now',
        message:
          'This site is close to its storage limit. Further writes may start failing. Take a backup now.',
      });
    }
  }

  return {
    recordCount,
    schemaVersion: SCHEMA_VERSION,
    snapshotCount: snapshots.length,
    lastBackupAt: lastBackup?.value,
    usageBytes,
    quotaBytes,
    persistent,
    issues,
  };
}

/**
 * Asks the browser to keep this data unless the owner deletes it.
 *
 * Best effort by definition: the browser decides, and on some platforms it decides
 * silently. The answer is reported honestly rather than assumed.
 */
export async function requestPersistentStorage(): Promise<boolean | undefined> {
  const storage =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator.storage as StorageManager | undefined);
  if (storage === undefined) return undefined;
  try {
    return await storage.persist();
  } catch {
    return undefined;
  }
}
