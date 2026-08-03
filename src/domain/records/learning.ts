import { z } from 'zod';
import { lifeCategory, protectedContext } from './categories';
import { envelopeShape, isoInstant, withEnvelopeInvariants } from './envelope';
import { confidence } from './semantics';

/**
 * `LearnedBeliefRecord` — activated in Phase 5, when there is learning behaviour for
 * it to describe.
 *
 * A belief is a **conservative, revisable personal claim**. Three properties are
 * enforced by the schema rather than left to the governor that writes them:
 *
 *   1. **A belief must cite the evaluations behind it.** `supportingEvaluationIds`
 *      cannot be empty. A claim that cannot say what it rests on is not inspectable,
 *      and inspectability is the whole basis of trust here.
 *   2. **Applicability is explicit.** A belief always states the categories and
 *      contexts it applies to. "A belief should become narrower before it becomes
 *      stronger" is only meaningful if narrowness is representable.
 *   3. **The top confidence label still requires prospective validation**, inherited
 *      from the shared `confidence` schema (`LEARN-003`). A belief formed by looking
 *      backwards through history cannot reach it.
 *
 * Beliefs are append-oriented like everything else: strengthening, narrowing,
 * suspending, or retiring appends a new record that supersedes the previous one, so
 * the history of what the system believed and why survives intact.
 */

export const BELIEF_STATUSES = [
  /** Enough evidence to state, not enough to rely on. */
  'forming',
  /** Supported often enough, and consistently enough, to act on. */
  'held',
  /** Contradicted somewhere, so its applicability was reduced rather than its truth denied. */
  'narrowed',
  /** A life-context change made the evidence non-comparable. Not deleted — paused. */
  'suspended',
  /** Contradicted enough that it should no longer influence anything. */
  'retired',
] as const;
export type BeliefStatus = (typeof BELIEF_STATUSES)[number];

export const BELIEF_CHANGES = [
  'formed',
  'strengthened',
  'weakened',
  'narrowed',
  'suspended',
  'retired',
] as const;
export type BeliefChange = (typeof BELIEF_CHANGES)[number];

/** One step in a belief's history, with the evidence that caused it. */
export const beliefHistoryEntry = z.strictObject({
  change: z.enum(BELIEF_CHANGES),
  at: isoInstant,
  /** Why, in the user's terms. Required — an unexplained belief change is not inspectable. */
  because: z.string().min(1).max(400),
  evaluationRecordIds: z.array(z.uuid()),
});

export const learnedBeliefRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('learned-belief', 'derived'),
      /** Stated as an association unless prospectively validated. */
      statement: z.string().min(1).max(400),
      status: z.enum(BELIEF_STATUSES),
      categories: z.array(lifeCategory).min(1),
      /** Where the belief is claimed to hold. Narrowing adds constraints here. */
      applicability: z.strictObject({
        contexts: z.array(protectedContext),
        note: z.string().max(300),
      }),
      confidence,
      supportingEvaluationIds: z.array(z.uuid()).min(1),
      contradictingEvaluationIds: z.array(z.uuid()),
      /**
       * True only when the belief was stated *before* the outcomes that support it.
       * This is what separates a personal causal claim from an association found by
       * looking backwards (`LEARN-003`).
       */
      prospectivelyValidated: z.boolean(),
      /** Set when a life-context change made the supporting evidence non-comparable. */
      suspendedByContextChangeId: z.uuid().optional(),
      history: z.array(beliefHistoryEntry).min(1),
    })
    .refine(
      (r) => r.prospectivelyValidated || r.confidence.label !== 'strong-personal-evidence',
      {
        message:
          'A belief that has not been prospectively validated cannot claim strong personal evidence',
        path: ['confidence', 'label'],
      },
    )
    .refine((r) => r.status !== 'retired' || r.contradictingEvaluationIds.length > 0, {
      message: 'A belief can only be retired on the strength of contradicting evidence',
      path: ['status'],
    })
    .refine((r) => r.status !== 'suspended' || r.suspendedByContextChangeId !== undefined, {
      message: 'A suspended belief must name the context change that suspended it',
      path: ['suspendedByContextChangeId'],
    })
    .refine(
      (r) =>
        r.status !== 'narrowed' ||
        r.applicability.contexts.length > 0 ||
        r.applicability.note.length > 0,
      {
        message: 'A narrowed belief must say what it is now limited to',
        path: ['applicability'],
      },
    ),
);
export type LearnedBeliefRecord = z.infer<typeof learnedBeliefRecord>;
