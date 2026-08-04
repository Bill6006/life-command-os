import { z } from 'zod';
import { lifeCategory, protectedContext } from './categories';
import { envelopeShape, isoInstant, timeWindow, withEnvelopeInvariants } from './envelope';
import { confidence, evidenceValue } from './semantics';

/**
 * Direction: North Star, goals, the weekly direction, and commitments.
 *
 * Note the provenance split. North Star, goals, and commitments are things the user
 * states — observed. The **weekly direction is derived**, because `INTEL-007`
 * requires the *system* to propose it: the user must never be made to invent the
 * week's priority from a blank slate.
 */

export const northStarRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('north-star', 'observed'),
    statement: z.string().min(1).max(500),
    /** Free text by design. The user owns this definition; the system never scores it. */
    horizon: z.string().max(120).optional(),
  }),
);
export type NorthStarRecord = z.infer<typeof northStarRecord>;

/* -------------------------------------------------------------------------- */

export const GOAL_STATES = ['active', 'achieved', 'abandoned', 'paused', 'expired'] as const;

export const goalRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('goal', 'observed'),
    statement: z.string().min(1).max(500),
    category: lifeCategory,
    state: z.enum(GOAL_STATES),
    targetWindow: timeWindow.optional(),
    /** What evidence would show progress. Absent is honest; invented precision is not. */
    progressEvidenceIntent: z.string().max(500).optional(),
    northStarRecordId: z.uuid().optional(),
  }),
);
export type GoalRecord = z.infer<typeof goalRecord>;

/* -------------------------------------------------------------------------- */

export const COMMITMENT_STATES = [
  'active',
  'scheduled',
  'waiting',
  'blocked',
  'postponed',
  'delegated',
  'completed',
  'abandoned',
  'expired',
  'unclear',
] as const;
export type CommitmentState = (typeof COMMITMENT_STATES)[number];

/**
 * An obligation or open loop.
 *
 * State changes append a new record superseding the previous one, so the history of
 * how a commitment moved through `active → blocked → completed` survives intact.
 */
export const commitmentRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('commitment', 'observed'),
    statement: z.string().min(1).max(500),
    category: lifeCategory,
    state: z.enum(COMMITMENT_STATES),
    dueAt: isoInstant.optional(),
    /** Non-negotiable commitments remove candidates before ranking, never after. */
    nonNegotiable: z.boolean(),
    requiresProtectedContext: protectedContext.optional(),
    goalRecordId: z.uuid().optional(),
    note: z.string().max(1000).optional(),
  }),
);
export type CommitmentRecord = z.infer<typeof commitmentRecord>;

/* -------------------------------------------------------------------------- */

/**
 * One system-proposed direction for the week — or a deliberately quiet week.
 *
 * Three things are enforced structurally here:
 *
 *   1. **The system proposes.** Derived basis, provenance must cite the evidence
 *      the proposal was built from. The user is never handed a blank slate.
 *   2. **A quiet week is a first-class proposal**, not an absence of one. It is a
 *      branch of the union with its own required rationale.
 *   3. **The user's response starts `unresolved`.** It is not defaulted to
 *      "confirmed", and silence is never read as agreement.
 */
export const weeklyDirectionProposal = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('focus'),
    statement: z.string().min(1).max(400),
    categories: z.array(lifeCategory).min(1),
  }),
  z.strictObject({
    kind: z.literal('deliberately-quiet'),
    rationale: z.string().min(1).max(400),
  }),
]);

/**
 * The four responses the Sunday Weekly Guide offers, plus outright rejection.
 *
 * `snoozed` and `skipped` were added in Phase 6 (`OWN-019`). They are deliberately
 * **their own branches rather than flavours of `rejected`**: deferring a proposal and
 * declining one are different facts, and neither is a failure. Nothing downstream may
 * read either as evidence about the owner or about the proposal's quality — a snooze
 * carries only when to ask again, and a skip carries only an optional reason.
 */
export const weeklyDirectionResponse = z.discriminatedUnion('response', [
  z.strictObject({ response: z.literal('confirmed') }),
  z.strictObject({
    response: z.literal('adjusted'),
    adjustedStatement: z.string().min(1).max(400),
  }),
  z.strictObject({ response: z.literal('snoozed'), remindAt: isoInstant }),
  z.strictObject({ response: z.literal('skipped'), reason: z.string().max(400).optional() }),
  z.strictObject({ response: z.literal('rejected'), reason: z.string().max(400).optional() }),
]);

export const weeklyDirectionRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('weekly-direction', 'derived'),
    weekWindow: timeWindow,
    proposal: weeklyDirectionProposal,
    /** Unresolved until the user actually answers. Never defaulted. */
    userResponse: evidenceValue(weeklyDirectionResponse),
    confidence,
    /** Why this direction, in terms the user can inspect. */
    reasonTrace: z.array(z.string().min(1).max(300)).min(1),
    /** Why it changed from the previous week, when it did. */
    changedBecause: z.string().max(400).optional(),
  }),
);
export type WeeklyDirectionRecord = z.infer<typeof weeklyDirectionRecord>;
