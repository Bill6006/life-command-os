import { z } from 'zod';
import { isoInstant } from './envelope';

/**
 * Evidence, confidence, and freshness semantics (Phase 2 task 5).
 *
 * The single rule this file exists to enforce:
 *
 *   **Missing, not-applicable, conflicting, and unresolved never become zero,
 *   false, or failure.**
 *
 * They are distinct, first-class states. A capacity of "unknown" is not a capacity
 * of 0. An outcome that has not arrived yet is not an outcome of "no effect".
 * Collapsing these is how a system starts lying to its user without anyone
 * deciding that it should.
 */

/* -------------------------------------------------------------------------- */
/* Evidence values                                                             */
/* -------------------------------------------------------------------------- */

export const EVIDENCE_STATUSES = [
  'known',
  'unknown',
  'not-applicable',
  'conflicting',
  'unresolved',
] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/**
 * Wraps any value in explicit evidence status.
 *
 * `conflicting` requires at least two candidate records, because a conflict with
 * nothing to conflict against is not a conflict — it is an unexplained doubt.
 * `unresolved` must say what it is waiting for, so it can be resolved or expired
 * later rather than lingering as a permanent shrug.
 */
export function evidenceValue<T extends z.ZodType>(inner: T) {
  return z.discriminatedUnion('status', [
    z.strictObject({ status: z.literal('known'), value: inner }),
    z.strictObject({ status: z.literal('unknown'), reason: z.string().max(300).optional() }),
    z.strictObject({
      status: z.literal('not-applicable'),
      reason: z.string().max(300).optional(),
    }),
    z.strictObject({
      status: z.literal('conflicting'),
      candidateRecordIds: z.array(z.uuid()).min(2),
      note: z.string().max(300).optional(),
    }),
    z.strictObject({
      status: z.literal('unresolved'),
      awaiting: z.string().min(1).max(300),
      expectedBy: isoInstant.optional(),
    }),
  ]);
}

/**
 * The hand-written mirror of {@link evidenceValue}.
 *
 * Optional members spell out `| undefined` because the project compiles with
 * `exactOptionalPropertyTypes`, under which `reason?: string` and
 * `reason?: string | undefined` are genuinely different types. Without this the
 * inferred zod type and this one would silently drift apart.
 */
export type EvidenceValue<T> =
  | { status: 'known'; value: T }
  | { status: 'unknown'; reason?: string | undefined }
  | { status: 'not-applicable'; reason?: string | undefined }
  | { status: 'conflicting'; candidateRecordIds: string[]; note?: string | undefined }
  | { status: 'unresolved'; awaiting: string; expectedBy?: string | undefined };

/** Narrowing helper. Deliberately has no `unwrapOr(default)` counterpart. */
export function isKnown<T>(value: EvidenceValue<T>): value is { status: 'known'; value: T } {
  return value.status === 'known';
}

/**
 * Reads a value only when it is genuinely known.
 *
 * There is intentionally no `valueOrZero` or `valueOrFalse` in this codebase.
 * Callers must handle absence explicitly, because silently substituting a number
 * for missing evidence is the exact failure this module exists to prevent.
 */
export function knownValue<T>(value: EvidenceValue<T>): T | undefined {
  return value.status === 'known' ? value.value : undefined;
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                  */
/* -------------------------------------------------------------------------- */

/** The only four labels the user ever sees (Product Constitution §16). */
export const CONFIDENCE_LABELS = [
  'insufficient-evidence',
  'early-signal',
  'moderate-evidence',
  'strong-personal-evidence',
] as const;
export type ConfidenceLabel = (typeof CONFIDENCE_LABELS)[number];

/** The dimensions confidence may be reasoned from (master plan §27). */
export const CONFIDENCE_DIMENSIONS = [
  'comparable-evidence-volume',
  'recency',
  'contextual-similarity',
  'observation-completeness',
  'consistency',
  'confounding-risk',
  'prospective-validation',
  'context-drift',
  'execution-fidelity',
  'missing-outcome-rate',
] as const;
export type ConfidenceDimension = (typeof CONFIDENCE_DIMENSIONS)[number];

export const confidenceDimensionAssessment = z.strictObject({
  dimension: z.enum(CONFIDENCE_DIMENSIONS),
  assessment: z.enum(['supports', 'neutral', 'undermines']),
  note: z.string().max(300).optional(),
});

/**
 * Confidence is never a bare label and never a decorative percentage.
 *
 * Two structural requirements:
 *   1. **At least one dimension.** A confidence with no evidence dimensions is
 *      one of the seven forbidden substitutions and simply will not parse.
 *   2. **`strong-personal-evidence` requires prospective validation** that
 *      actually supports the claim (`LEARN-003`). A pattern found by looking
 *      backwards through history cannot reach the top label, no matter how
 *      striking it looks.
 */
export const confidence = z
  .strictObject({
    label: z.enum(CONFIDENCE_LABELS),
    dimensions: z.array(confidenceDimensionAssessment).min(1),
    basisRecordIds: z.array(z.uuid()).min(1),
  })
  .refine(
    (c) =>
      c.label !== 'strong-personal-evidence' ||
      c.dimensions.some(
        (d) => d.dimension === 'prospective-validation' && d.assessment === 'supports',
      ),
    {
      message:
        'strong-personal-evidence requires a prospective-validation dimension that supports the claim',
      path: ['label'],
    },
  );
export type Confidence = z.infer<typeof confidence>;

/* -------------------------------------------------------------------------- */
/* Freshness                                                                   */
/* -------------------------------------------------------------------------- */

export const FRESHNESS_STATUSES = ['fresh', 'aging', 'stale'] as const;
export type FreshnessStatus = (typeof FRESHNESS_STATUSES)[number];

export interface Freshness {
  readonly status: FreshnessStatus;
  readonly ageMs: number;
  readonly maxUsefulAgeMs: number;
}

/**
 * Freshness is **computed, never stored**.
 *
 * A record does not become stale by being rewritten; it becomes stale because time
 * passed and the decision at hand needs something more recent. Storing it would
 * mean either mutating history or carrying a value that silently goes wrong.
 *
 * `maxUsefulAgeMs` is supplied by the caller because staleness is relative to the
 * decision being made, not a property of the record. Sleep evidence from nine
 * hours ago is fresh for a weekly review and stale for "should I nap now".
 */
export function assessFreshness(
  recordedAt: string,
  now: Date,
  maxUsefulAgeMs: number,
): Freshness {
  const ageMs = Math.max(0, now.getTime() - Date.parse(recordedAt));
  const status: FreshnessStatus =
    ageMs <= maxUsefulAgeMs * 0.5 ? 'fresh' : ageMs <= maxUsefulAgeMs ? 'aging' : 'stale';
  return { status, ageMs, maxUsefulAgeMs };
}
