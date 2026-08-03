import type { CanonicalRecord } from '../records';

/**
 * The seven Phase 2 invariants (Prompt 3 task 11), and where each is enforced.
 *
 * Six of the seven are enforced **inside the schemas**, which is deliberate: an
 * invariant checked by a separate validator can be forgotten at a call site, while
 * one encoded in the schema cannot be bypassed by any write path.
 *
 *  1. **Inference masquerading as observation** — `observation` is a strict object
 *     with an observed-only provenance basis and no `confidence` field. An inferred
 *     state carries both an inferred provenance method and a confidence, so it
 *     cannot parse as an observation, and vice versa.
 *  2. **Forecast masquerading as outcome** — distinct `recordType` literals; an
 *     outcome requires an `outcomeWindow` and observed provenance, a forecast
 *     requires a `horizon`, assumptions, and derived provenance.
 *  3. **Recommendation masquerading as execution** — `execution` requires
 *     `recommendationRecordId` and an execution state; `recommendation` has no
 *     execution state at all.
 *  4. **Outcome masquerading as causal effect** — `outcome` has no causal
 *     attribution field, and being strict, gaining one is a parse error. Causal-ish
 *     claims live only in `recommendation-effect-evaluation`, which requires a
 *     confounding assessment and refuses a `supported` verdict under high
 *     confounding risk.
 *  5. **Confidence without evidence dimensions** — `confidence` requires at least
 *     one dimension assessment and at least one basis record.
 *  6. **Invalid time windows** — `timeWindow` requires `end > start`, and every
 *     record requires `occurredAt <= recordedAt`.
 *  7. **Forbidden circular references** — *cannot* be checked by a single record's
 *     schema, because a cycle is a property of the set. That is what this module is
 *     for.
 *
 * These checks run on restore and on any bulk write, where records arrive as a set.
 */

export type InvariantCode =
  | 'duplicate-record-id'
  | 'self-supersession'
  | 'supersession-cycle'
  | 'derivation-cycle'
  | 'dangling-supersession';

export interface InvariantViolation {
  readonly code: InvariantCode;
  readonly recordId: string;
  readonly detail: string;
}

interface LinkedRecord {
  recordId: string;
  supersedesRecordId?: string | undefined;
  provenance: { derivedFromRecordIds?: string[] | undefined };
}

function asLinked(record: CanonicalRecord): LinkedRecord {
  return record;
}

/**
 * Detects a cycle reachable from `start` by following `edges`.
 *
 * Iterative rather than recursive: a corrupted or hostile backup could contain a
 * chain long enough to blow the stack, and a crash during import is a worse failure
 * than a rejection.
 */
function findsCycle(start: string, edges: ReadonlyMap<string, readonly string[]>): boolean {
  const seen = new Set<string>([start]);
  const stack = [...(edges.get(start) ?? [])];

  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined) break;
    if (next === start) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...(edges.get(next) ?? []));
  }

  return false;
}

/**
 * Checks the invariants that only make sense across a set of records.
 *
 * `dangling-supersession` is reported only when the superseded record is genuinely
 * absent from a set that claims to be complete — a partial export legitimately
 * references records it does not contain, so the caller decides whether
 * completeness applies.
 */
export function checkCrossRecordInvariants(
  records: readonly CanonicalRecord[],
  options: { readonly expectComplete: boolean } = { expectComplete: false },
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const linked = records.map(asLinked);

  const byId = new Map<string, LinkedRecord>();
  for (const record of linked) {
    if (byId.has(record.recordId)) {
      violations.push({
        code: 'duplicate-record-id',
        recordId: record.recordId,
        detail: 'The same record id appears more than once',
      });
      continue;
    }
    byId.set(record.recordId, record);
  }

  const supersessionEdges = new Map<string, readonly string[]>();
  const derivationEdges = new Map<string, readonly string[]>();

  for (const record of linked) {
    if (record.supersedesRecordId !== undefined) {
      if (record.supersedesRecordId === record.recordId) {
        violations.push({
          code: 'self-supersession',
          recordId: record.recordId,
          detail: 'A record cannot supersede itself',
        });
      }
      supersessionEdges.set(record.recordId, [record.supersedesRecordId]);

      if (options.expectComplete && !byId.has(record.supersedesRecordId)) {
        violations.push({
          code: 'dangling-supersession',
          recordId: record.recordId,
          detail: `Supersedes ${record.supersedesRecordId}, which is not present`,
        });
      }
    }

    const derivedFrom = record.provenance.derivedFromRecordIds;
    if (derivedFrom !== undefined && derivedFrom.length > 0) {
      derivationEdges.set(record.recordId, derivedFrom);
    }
  }

  for (const record of linked) {
    if (
      supersessionEdges.has(record.recordId) &&
      findsCycle(record.recordId, supersessionEdges)
    ) {
      violations.push({
        code: 'supersession-cycle',
        recordId: record.recordId,
        detail: 'Supersession links form a cycle',
      });
    }
    if (derivationEdges.has(record.recordId) && findsCycle(record.recordId, derivationEdges)) {
      violations.push({
        code: 'derivation-cycle',
        recordId: record.recordId,
        detail: 'Provenance derivation links form a cycle',
      });
    }
  }

  return violations;
}

/**
 * Resolves which records are current.
 *
 * Supersession points backwards only, so "current" means: not named by any other
 * record's `supersedesRecordId`. The superseded records are **not deleted and not
 * hidden from storage** — they remain readable, which is what lets Phase 5 evaluate
 * what the system believed at the time rather than what it believes now.
 */
export function currentRecords(records: readonly CanonicalRecord[]): CanonicalRecord[] {
  const superseded = new Set<string>();
  for (const record of records) {
    const link = asLinked(record).supersedesRecordId;
    if (link !== undefined) superseded.add(link);
  }
  return records.filter((record) => !superseded.has(asLinked(record).recordId));
}

/** Walks a supersession chain from newest to oldest. Cycle-safe. */
export function supersessionChain(
  records: readonly CanonicalRecord[],
  headRecordId: string,
): CanonicalRecord[] {
  const byId = new Map(records.map((record) => [asLinked(record).recordId, record]));
  const chain: CanonicalRecord[] = [];
  const seen = new Set<string>();

  let cursor: string | undefined = headRecordId;
  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor);
    const record = byId.get(cursor);
    if (record === undefined) break;
    chain.push(record);
    cursor = asLinked(record).supersedesRecordId;
  }

  return chain;
}
