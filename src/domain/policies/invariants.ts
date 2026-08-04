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
 * Every node that lies on a cycle, found in a single pass.
 *
 * Iterative rather than recursive: a corrupted or hostile backup could contain a
 * chain long enough to blow the stack, and a crash during import is a worse failure
 * than a rejection.
 *
 * **One pass, not one per record.** The original implementation asked "is a cycle
 * reachable from here?" separately for every node, each search starting with a fresh
 * visited set — quadratic in the number of records. That was tolerable while nothing
 * but restore went through this path. Phase 6 wired it to every user interaction, at
 * which point a few thousand stored records would have made saving a check-in take
 * seconds. A three-colour depth-first search visits each edge once instead.
 *
 * A node is on a cycle when the search finds a back edge to something still on the
 * current path; everything from that node to the top of the path is part of it. That
 * is the same claim the per-node version made — cycle *members*, not everything that
 * can reach one.
 */
function nodesOnCycles(edges: ReadonlyMap<string, readonly string[]>): Set<string> {
  /** 1 = on the current path, 2 = fully explored and known cycle-free from here. */
  const state = new Map<string, 1 | 2>();
  const onCycle = new Set<string>();

  for (const start of edges.keys()) {
    if (state.has(start)) continue;

    const path: string[] = [start];
    const frames: { node: string; next: number }[] = [{ node: start, next: 0 }];
    state.set(start, 1);

    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      if (frame === undefined) break;

      const neighbours = edges.get(frame.node) ?? [];
      if (frame.next >= neighbours.length) {
        state.set(frame.node, 2);
        frames.pop();
        path.pop();
        continue;
      }

      const next = neighbours[frame.next];
      frame.next += 1;
      if (next === undefined) continue;

      const seen = state.get(next);
      if (seen === 1) {
        // Back edge: everything from `next` up to the top of the path is on the cycle.
        for (let index = Math.max(0, path.lastIndexOf(next)); index < path.length; index += 1) {
          const node = path[index];
          if (node !== undefined) onCycle.add(node);
        }
      } else if (seen === undefined) {
        state.set(next, 1);
        path.push(next);
        frames.push({ node: next, next: 0 });
      }
    }
  }

  return onCycle;
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

  const supersessionCycles = nodesOnCycles(supersessionEdges);
  const derivationCycles = nodesOnCycles(derivationEdges);

  for (const record of linked) {
    if (supersessionCycles.has(record.recordId)) {
      violations.push({
        code: 'supersession-cycle',
        recordId: record.recordId,
        detail: 'Supersession links form a cycle',
      });
    }
    if (derivationCycles.has(record.recordId)) {
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
