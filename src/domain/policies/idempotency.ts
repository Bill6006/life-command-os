import type { CanonicalRecord } from '../records';

/**
 * One logical event, one canonical record (v3.3 `V33-061`).
 *
 * ## The bug this exists to end
 *
 * Owner testing produced duplicate Timeline entries at the same timestamp from repeated
 * guide use. The record store already refuses a repeated **record id**, so these were
 * genuinely distinct records describing one thing that happened once — a double submit, a
 * retried write, a handler that ran twice before `busy` propagated through a re-render.
 *
 * Guarding the button would have hidden it. Deduplicating in the Timeline projection would
 * have hidden it better and left the canonical store wrong, which is worse: every export,
 * every count, and every piece of learning downstream would still see two events.
 *
 * ## The key
 *
 * A record may carry an `idempotencyKey` describing **what happened**, not which attempt
 * wrote it. Two attempts at the same event produce the same key; two different events
 * produce different keys.
 *
 * ## The window, and why there is one
 *
 * A key alone would mean the owner could never complete the same guide twice with the same
 * answers — which is a real thing people do, days apart. So a key suppresses a write only
 * when a record carrying it already exists **inside a short window**. Retries and double
 * submits land inside it; a deliberate repeat tomorrow does not.
 *
 * Two minutes. Long enough to cover a slow write, a reload, and an impatient second tap;
 * far too short to swallow anything the owner meant as a separate act.
 */

/** Long enough for a retry, far too short for a deliberate repeat. */
export const IDEMPOTENCY_WINDOW_MS = 2 * 60 * 1000;

/**
 * A stable key from the parts that make an event what it is.
 *
 * Order-independent for collections, because "the prompts I answered" is a set and two
 * writes of the same set must not differ because a map iterated differently.
 */
export function logicalEventKey(
  kind: string,
  parts: readonly (string | readonly string[])[],
): string {
  const flattened = parts.map((part) =>
    typeof part === 'string' ? part : [...part].sort().join(','),
  );
  return `${kind}|${flattened.join('|')}`;
}

/** The record carrying this key inside the window, if one already exists. */
export function existingWithKey(
  records: readonly CanonicalRecord[],
  key: string,
  now: Date,
  windowMs: number = IDEMPOTENCY_WINDOW_MS,
): CanonicalRecord | undefined {
  const floor = now.getTime() - windowMs;
  return records.find((record) => {
    const carried = (record as { idempotencyKey?: string }).idempotencyKey;
    if (carried !== key) return false;
    const at = Date.parse(record.recordedAt);
    return !Number.isNaN(at) && at >= floor;
  });
}
