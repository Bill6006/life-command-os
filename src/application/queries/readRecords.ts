import type { CanonicalRecord, RecordType } from '../../domain/records';
import { currentRecords, supersessionChain } from '../../domain/policies/invariants';
import { openDatabase } from '../../infrastructure/database/connection';
import {
  getAllRecords,
  getRecordById,
  getRecordsByType,
} from '../../infrastructure/database/recordRepository';

/**
 * The read path.
 *
 * Two distinct questions this layer keeps separate, because conflating them is how
 * an append-oriented store quietly starts behaving like a mutable one:
 *
 *   - *What is true now?* → `listCurrentRecords`, which resolves supersession.
 *   - *What did we believe, and when?* → `listAllRecords` and `readSupersessionChain`,
 *     which return history including superseded records.
 *
 * Superseded records are never deleted and never filtered out of storage. They are
 * only filtered out of the "current" view.
 */

export async function listAllRecords(): Promise<CanonicalRecord[]> {
  return getAllRecords(await openDatabase());
}

export async function listRecordsOfType(recordType: RecordType): Promise<CanonicalRecord[]> {
  return getRecordsByType(await openDatabase(), recordType);
}

export async function readRecord(recordId: string): Promise<CanonicalRecord | undefined> {
  return getRecordById(await openDatabase(), recordId);
}

/** Records not superseded by any other record. */
export async function listCurrentRecords(): Promise<CanonicalRecord[]> {
  return currentRecords(await listAllRecords());
}

export async function listCurrentRecordsOfType(
  recordType: RecordType,
): Promise<CanonicalRecord[]> {
  const all = await listAllRecords();
  return currentRecords(all).filter((record) => record.recordType === recordType);
}

/**
 * The full history behind a current record, newest first.
 *
 * This is what makes a correction inspectable rather than merely non-destructive:
 * the user can see what a value was, what it became, and why it changed.
 */
export async function readSupersessionChain(headRecordId: string): Promise<CanonicalRecord[]> {
  return supersessionChain(await listAllRecords(), headRecordId);
}
