import type { CanonicalRecord, RecordType } from '../../domain/records';
import type { LifeCommandDatabase, StoredRecord } from './connection';
import { withTransaction } from './connection';

/**
 * The canonical record store (STORE-001).
 *
 * The single most important line in this file is the use of Dexie's `add` rather
 * than `put`. `put` overwrites an existing key; `add` throws on a duplicate. Since
 * every canonical record is keyed by `recordId`, using `add` means **a stored
 * record can never be overwritten** — the storage layer itself refuses. Append and
 * supersede is therefore a property of the system, not a convention writers are
 * asked to remember.
 *
 * Corrections work by appending a new record that names what it supersedes. The
 * superseded record stays exactly where it was.
 */

export class DuplicateRecordError extends Error {
  constructor(readonly recordId: string) {
    super(`A record with id ${recordId} already exists and cannot be overwritten`);
    this.name = 'DuplicateRecordError';
  }
}

function toStored(record: CanonicalRecord): StoredRecord {
  // Structured-clone safe: records are plain JSON values by construction.
  return record as unknown as StoredRecord;
}

function fromStored(stored: StoredRecord): CanonicalRecord {
  return stored as unknown as CanonicalRecord;
}

/** Appends one already-validated record. Rejects any attempt to overwrite. */
export async function appendRecord(
  database: LifeCommandDatabase,
  record: CanonicalRecord,
): Promise<void> {
  try {
    await database.records.add(toStored(record));
  } catch (error) {
    if (error instanceof Error && error.name === 'ConstraintError') {
      throw new DuplicateRecordError((record as unknown as StoredRecord).recordId);
    }
    throw error;
  }
}

/**
 * Appends many records atomically.
 *
 * All or nothing: if any record is a duplicate, the transaction aborts and none of
 * them are written. A partially applied batch would leave canonical state that no
 * caller ever intended.
 */
export async function appendRecords(
  database: LifeCommandDatabase,
  records: readonly CanonicalRecord[],
): Promise<void> {
  if (records.length === 0) return;
  await withTransaction(database, ['records'], async () => {
    await database.records.bulkAdd(records.map(toStored));
  });
}

export async function getRecordById(
  database: LifeCommandDatabase,
  recordId: string,
): Promise<CanonicalRecord | undefined> {
  const stored = await database.records.get(recordId);
  return stored === undefined ? undefined : fromStored(stored);
}

export async function getAllRecords(database: LifeCommandDatabase): Promise<CanonicalRecord[]> {
  const stored = await database.records.orderBy('recordedAt').toArray();
  return stored.map(fromStored);
}

export async function getRecordsByType(
  database: LifeCommandDatabase,
  recordType: RecordType,
): Promise<CanonicalRecord[]> {
  const stored = await database.records.where('recordType').equals(recordType).toArray();
  return stored.map(fromStored);
}

export async function countRecords(database: LifeCommandDatabase): Promise<number> {
  return database.records.count();
}

/**
 * Replaces the entire canonical store in one transaction.
 *
 * Reserved for restore. It is the only operation in the system that removes
 * canonical records, which is why it is named for exactly what it does rather than
 * hidden behind a friendlier word. Callers must have validated every record and
 * checked cross-record invariants first — a failed restore that has already cleared
 * the store would be unrecoverable.
 */
export async function replaceAllRecords(
  database: LifeCommandDatabase,
  records: readonly CanonicalRecord[],
): Promise<void> {
  await withTransaction(database, ['records', 'projections'], async () => {
    await database.records.clear();
    await database.records.bulkAdd(records.map(toStored));
    // Projections describe the previous canonical state and are now meaningless.
    await database.projections.clear();
  });
}
