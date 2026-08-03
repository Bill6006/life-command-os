import { z } from 'zod';
import { lifeCategory, protectedContext } from './categories';
import { envelopeShape, isoInstant, timeWindow, withEnvelopeInvariants } from './envelope';
import { evidenceValue } from './semantics';

/**
 * Recorded fact: observations, their corrections, and contextual snapshots.
 *
 * Every schema here is a **strict object with an observed-only provenance basis
 * and no confidence field**. That combination is what makes "an inference is never
 * displayed as an observed fact" a parse failure rather than a code review note:
 * an inferred state carries `confidence` and an inferred provenance method, and
 * both are rejected outright by these schemas.
 */

/** What was actually observed. Deliberately shape-agnostic — not a domain schema. */
export const observedValue = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('quantity'),
    amount: z.number(),
    unit: z.string().min(1).max(40),
  }),
  z.strictObject({ kind: z.literal('duration'), minutes: z.number().min(0) }),
  z.strictObject({ kind: z.literal('count'), count: z.int().min(0) }),
  z.strictObject({ kind: z.literal('state'), state: z.string().min(1).max(80) }),
  z.strictObject({ kind: z.literal('note'), text: z.string().min(1).max(2000) }),
]);
export type ObservedValue = z.infer<typeof observedValue>;

/* -------------------------------------------------------------------------- */

export const observationRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('observation', 'observed'),
    category: lifeCategory,
    /** What was observed, e.g. `available-minutes`, `focus-session`, `interruption`. */
    attribute: z.string().min(1).max(120),
    value: observedValue,
    /** Present when the observation covers a period rather than an instant. */
    window: timeWindow.optional(),
  }),
);
export type ObservationRecord = z.infer<typeof observationRecord>;

/* -------------------------------------------------------------------------- */

/**
 * Corrections append and supersede (`DATA-002`).
 *
 * `supersedesRecordId` is **required** here: a correction that corrects nothing is
 * not a correction. The original record is never touched — it stays readable, which
 * is what lets Phase 5 evaluate what the system believed at the time rather than
 * what it believes now.
 *
 * Note what this is *not*: a redaction. The superseded value remains in storage.
 * Genuine deletion is a separate, still-undecided operation — see PROJECT_STATUS.
 */
export const observationCorrectionRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('observation-correction', 'observed'),
    supersedesRecordId: z.uuid(),
    category: lifeCategory,
    attribute: z.string().min(1).max(120),
    value: observedValue,
    window: timeWindow.optional(),
    /** Why the earlier record was wrong. Required, so history stays explicable. */
    reason: z.string().min(1).max(500),
  }),
);
export type ObservationCorrectionRecord = z.infer<typeof observationCorrectionRecord>;

/* -------------------------------------------------------------------------- */

export const capacityLevel = z.enum(['depleted', 'low', 'moderate', 'high']);

/**
 * The circumstances surrounding other records.
 *
 * Capacity and available time are wrapped in `EvidenceValue` rather than being
 * plain numbers, because "we do not know how much time is free" and "zero minutes
 * are free" are completely different inputs to a decision, and a bare `number`
 * cannot tell them apart.
 */
export const contextSnapshotRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('context-snapshot', 'observed'),
    capacity: evidenceValue(capacityLevel),
    availableMinutes: evidenceValue(z.number().min(0)),
    /** Active protected contexts. An empty array means "none active", which is known. */
    protectedContexts: z.array(protectedContext),
    lifeSeasonId: z.uuid().optional(),
    window: timeWindow.optional(),
    note: z.string().max(1000).optional(),
  }),
);
export type ContextSnapshotRecord = z.infer<typeof contextSnapshotRecord>;

/* -------------------------------------------------------------------------- */

/**
 * A durable change in circumstances that should discount older patterns.
 *
 * Mixed provenance: the user may report it, or Phase 5 may detect it. Either way
 * the derived form must cite its inputs.
 */
export const lifeContextChangeRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('life-context-change', 'mixed'),
    summary: z.string().min(1).max(500),
    affectedCategories: z.array(lifeCategory).min(1),
    effectiveFrom: isoInstant,
    /**
     * Patterns learned before this point lose influence. Phase 5 consumes it;
     * Phase 2 only guarantees it is recorded and cannot be silently ignored.
     */
    invalidatesPatternsBefore: isoInstant.optional(),
    note: z.string().max(1000).optional(),
  }),
);
export type LifeContextChangeRecord = z.infer<typeof lifeContextChangeRecord>;
