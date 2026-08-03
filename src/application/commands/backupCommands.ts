import { openDatabase, SCHEMA_VERSION } from '../../infrastructure/database/connection';
import {
  getAllRecords,
  replaceAllRecords,
} from '../../infrastructure/database/recordRepository';
import { clearProjections } from '../../infrastructure/database/projectionStore';
import {
  serializeBackup,
  validateBackup,
  type BackupProblem,
} from '../../infrastructure/backup/developmentBackup';

/**
 * Development backup commands.
 *
 * Unencrypted and synthetic-only until Phase 6 (`STORE-003`). The ordering below is
 * the part worth protecting: **validate everything, then mutate**. A restore that
 * clears the store first and discovers a bad record second has destroyed canonical
 * history to learn something it could have learned for free.
 */

export async function exportBackup(now: Date): Promise<string> {
  const database = await openDatabase();
  const records = await getAllRecords(database);
  return serializeBackup(records, SCHEMA_VERSION, now);
}

export type RestoreResult =
  | { readonly ok: true; readonly restoredCount: number }
  | { readonly ok: false; readonly problem: BackupProblem };

/**
 * Replaces canonical state from a backup.
 *
 * This is the only operation in the system that removes canonical records, and it
 * is destructive by design — a restore that merged would produce a state that
 * matches neither the backup nor what was there before. Phase 6 adds the dry run,
 * safety snapshot, and integrity checks that make it safe for real data.
 */
export async function restoreBackup(raw: string): Promise<RestoreResult> {
  const validation = validateBackup(raw);
  if (!validation.ok) {
    // Nothing has been touched. Canonical state is exactly as it was.
    return { ok: false, problem: validation.problem };
  }

  const database = await openDatabase();
  await replaceAllRecords(database, validation.backup.records);
  await clearProjections(database);

  return { ok: true, restoredCount: validation.backup.records.length };
}
