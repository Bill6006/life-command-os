import Dexie from 'dexie';
import { DATABASE_NAME, closeDatabase } from '../../src/infrastructure/database/connection';

/**
 * Drops the database entirely so each test starts from nothing.
 *
 * `fake-indexeddb/auto` gives one in-memory implementation per process, not per
 * test, so without this a test would inherit whatever the previous one wrote — and
 * append-only storage makes that leakage especially misleading, because records
 * cannot be overwritten away.
 */
export async function resetDatabase(): Promise<void> {
  closeDatabase();
  await Dexie.delete(DATABASE_NAME);
}
