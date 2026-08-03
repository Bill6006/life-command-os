import { parseCanonicalRecord, type CanonicalRecord } from '../../domain/records';
import { checkCrossRecordInvariants } from '../../domain/policies/invariants';
import { openDatabase } from '../../infrastructure/database/connection';
import {
  appendRecord,
  appendRecords,
  getAllRecords,
} from '../../infrastructure/database/recordRepository';
import { clearProjections } from '../../infrastructure/database/projectionStore';

/**
 * The write path (`ARCH-001`, ADR-0004).
 *
 * Every canonical record enters storage through this module, and nothing reaches
 * IndexedDB without being validated first. The UI cannot call the repository
 * directly — ESLint forbids the import — so this is not merely the recommended
 * route, it is the only one.
 *
 * The result type is deliberately explicit rather than throw-based: a rejected
 * write is an ordinary outcome the interface has to show honestly, not an
 * exceptional condition to swallow.
 */

export type WriteFailureReason =
  | 'not-an-object'
  | 'unknown-record-type'
  | 'schema-violation'
  | 'invariant-violation'
  | 'duplicate-record';

export interface WriteSuccess {
  readonly ok: true;
  readonly record: CanonicalRecord;
}

export interface WriteFailure {
  readonly ok: false;
  readonly reason: WriteFailureReason;
  readonly issues: readonly string[];
}

export type WriteResult = WriteSuccess | WriteFailure;

/**
 * Validates and appends one record.
 *
 * Returns only after the authoritative transaction has committed. Callers may
 * therefore treat a success as genuinely durable — which is what the rule "never
 * display saved before the transaction commits" actually requires of this layer.
 */
export async function writeRecord(input: unknown): Promise<WriteResult> {
  const parsed = parseCanonicalRecord(input);
  if (!parsed.ok) {
    return { ok: false, reason: parsed.reason, issues: parsed.issues };
  }

  const database = await openDatabase();

  try {
    await appendRecord(database, parsed.record);
  } catch (error) {
    if (error instanceof Error && error.name === 'DuplicateRecordError') {
      return { ok: false, reason: 'duplicate-record', issues: [error.message] };
    }
    throw error;
  }

  // Canonical state changed, so every derived view is now potentially wrong.
  // Dropping them is safe precisely because they are rebuildable.
  await clearProjections(database);

  return { ok: true, record: parsed.record };
}

/**
 * Validates and appends many records atomically.
 *
 * Cross-record invariants are checked against the incoming batch **combined with**
 * what is already stored, because a cycle can be formed by a record that is
 * individually valid. Checking the batch alone would miss exactly the case that
 * matters.
 */
export async function writeRecords(inputs: readonly unknown[]): Promise<WriteResult[]> {
  const parsedResults = inputs.map(parseCanonicalRecord);

  const failures: WriteResult[] = parsedResults.map((parsed) =>
    parsed.ok
      ? { ok: true, record: parsed.record }
      : { ok: false, reason: parsed.reason, issues: parsed.issues },
  );

  if (failures.some((result) => !result.ok)) return failures;

  const incoming = parsedResults.flatMap((parsed) => (parsed.ok ? [parsed.record] : []));
  const database = await openDatabase();
  const existing = await getAllRecords(database);

  const violations = checkCrossRecordInvariants([...existing, ...incoming]);
  if (violations.length > 0) {
    const issues = violations.map((v) => `${v.code} on ${v.recordId}: ${v.detail}`);
    return incoming.map(() => ({ ok: false, reason: 'invariant-violation', issues }));
  }

  await appendRecords(database, incoming);
  await clearProjections(database);

  return incoming.map((record) => ({ ok: true, record }));
}
