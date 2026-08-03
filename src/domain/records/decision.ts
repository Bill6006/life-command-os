import { z } from 'zod';
import { lifeCategory, protectedContext } from './categories';
import { envelopeShape, isoInstant, timeWindow, withEnvelopeInvariants } from './envelope';
import { confidence, evidenceValue } from './semantics';

/**
 * The decision families: candidate actions, the untreated forecast, predicted
 * intervention effects, and the single recommendation.
 *
 * Two separations are load-bearing here and are enforced by record type plus
 * required links, not by convention:
 *
 *   - **Untreated forecast vs predicted intervention effect** (`INTEL-003`).
 *     An untreated forecast says what happens if nothing changes and has no action
 *     attached. A predicted effect *requires* a `candidateActionRecordId`. Neither
 *     can be parsed as the other.
 *   - **Recommendation vs execution.** A recommendation is a proposal. It carries
 *     no execution state at all, so it cannot be mistaken for evidence that
 *     anything happened.
 */

export const FRICTION_LEVELS = ['low', 'moderate', 'high'] as const;
export const RISK_LEVELS = ['none-identified', 'low', 'moderate', 'high'] as const;
export const REVERSIBILITY = ['reversible', 'partially-reversible', 'irreversible'] as const;

/**
 * A realistic possible action. **Internal by construction.**
 *
 * Candidates are generated and compared internally; only the selected one is ever
 * surfaced (`INTEL-006`). Nothing in this schema is designed for display as a list.
 */
export const candidateActionRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('candidate-action', 'derived'),
    statement: z.string().min(1).max(400),
    category: lifeCategory,
    timing: z.strictObject({
      earliestAt: isoInstant.optional(),
      latestAt: isoInstant.optional(),
      preferredWindow: timeWindow.optional(),
    }),
    /** Duration or dose. Absent when genuinely not applicable, never guessed. */
    durationMinutes: z.number().min(0).optional(),
    friction: z.enum(FRICTION_LEVELS),
    /** The smallest version that still captures most of the benefit. */
    minimumViableVersion: z.string().min(1).max(300),
    fallback: z.string().max(300).optional(),
    /** When to stop. Required — an experiment with no stopping point is not safe. */
    stoppingPoint: z.string().min(1).max(300),
    risk: z.enum(RISK_LEVELS),
    reversibility: z.enum(REVERSIBILITY),
    /** Contexts that would make this action ineligible (`SAFE-001`). */
    blockedByProtectedContexts: z.array(protectedContext),
  }),
);
export type CandidateActionRecord = z.infer<typeof candidateActionRecord>;

/* -------------------------------------------------------------------------- */

/**
 * What is likely if nothing materially changes.
 *
 * Requires an explicit target, horizon, assumptions, uncertainty, and a reason
 * trace (`INTEL-002`). A forecast that cannot state its assumptions will not parse.
 */
export const untreatedForecastRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('untreated-forecast', 'derived'),
    category: lifeCategory,
    target: z.string().min(1).max(200),
    horizon: timeWindow,
    /** May legitimately abstain: an unsupported forecast is `unknown`, not a guess. */
    projection: evidenceValue(
      z.strictObject({
        summary: z.string().min(1).max(400),
        direction: z.enum(['improving', 'stable', 'declining', 'mixed']),
      }),
    ),
    assumptions: z.array(z.string().min(1).max(300)).min(1),
    uncertainty: z.string().min(1).max(500),
    confidence,
    reasonTrace: z.array(z.string().min(1).max(300)).min(1),
  }),
);
export type UntreatedForecastRecord = z.infer<typeof untreatedForecastRecord>;

/* -------------------------------------------------------------------------- */

export const EFFECT_DIRECTIONS = ['positive', 'negative', 'neutral'] as const;
export const EFFECT_MAGNITUDES = ['small', 'moderate', 'large', 'unknown'] as const;
export const EFFECT_TIMINGS = ['immediate', 'delayed', 'unknown'] as const;

/**
 * One predicted effect on one category.
 *
 * Positive, negative, delayed, uncertain, and cross-domain effects are represented
 * **independently** rather than netted into a single score, because a net score
 * hides exactly the tradeoff the user needs to see.
 */
export const predictedEffect = z.strictObject({
  category: lifeCategory,
  direction: z.enum(EFFECT_DIRECTIONS),
  magnitude: z.enum(EFFECT_MAGNITUDES),
  timing: z.enum(EFFECT_TIMINGS),
  /** True when this effect lands outside the category the action targets. */
  crossDomain: z.boolean(),
  uncertain: z.boolean(),
  note: z.string().max(300).optional(),
});
export type PredictedEffect = z.infer<typeof predictedEffect>;

export const interventionEffectPredictionRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('intervention-effect-prediction', 'derived'),
      /** Required. This is what makes it a prediction *about an action*. */
      candidateActionRecordId: z.uuid(),
      /** The untreated forecast this is measured against, when one exists. */
      untreatedForecastRecordId: z.uuid().optional(),
      horizon: timeWindow,
      effects: z.array(predictedEffect).min(1),
      confidence,
      reasonTrace: z.array(z.string().min(1).max(300)).min(1),
    })
    .refine((r) => r.effects.some((e) => e.direction === 'negative') || r.effects.length > 0, {
      message: 'At least one effect is required',
      path: ['effects'],
    }),
);
export type InterventionEffectPredictionRecord = z.infer<
  typeof interventionEffectPredictionRecord
>;

/* -------------------------------------------------------------------------- */

/**
 * The single thing shown to the user.
 *
 * `output` is a discriminated union of exactly three branches — one action, one
 * high-value question, or deliberate silence. There is no fourth branch and no
 * array. `PROD-005` and `INTEL-006` are therefore impossible to violate by
 * accident: a ranked list of recommendations cannot be represented at all.
 *
 * `consideredCandidateActionIds` preserves the internal comparison for reason
 * traces and later evaluation. It is **internal audit data** — the interface layer
 * may not render it, which is what keeps "compared internally, one shown" true.
 */
export const recommendationOutput = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('action'),
    candidateActionRecordId: z.uuid(),
    predictedEffectRecordId: z.uuid().optional(),
  }),
  z.strictObject({ kind: z.literal('question'), questionRecordId: z.uuid() }),
  z.strictObject({
    kind: z.literal('deliberate-silence'),
    /** Silence is a conclusion and must be explicable, not an empty state. */
    rationale: z.string().min(1).max(400),
  }),
]);
export type RecommendationOutput = z.infer<typeof recommendationOutput>;

export const recommendationRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('recommendation', 'derived'),
    output: recommendationOutput,
    confidence,
    reasonTrace: z.array(z.string().min(1).max(300)).min(1),
    /** Relevance to enduring direction, when there is one to relate to. */
    northStarRelevance: z.string().max(300).optional(),
    /** Internal only. Never surfaced as an alternatives list. */
    consideredCandidateActionIds: z.array(z.uuid()),
    /** What materially changed since the last useful assessment (`INTEL-008`). */
    whatChanged: z.array(z.string().min(1).max(300)),
  }),
);
export type RecommendationRecord = z.infer<typeof recommendationRecord>;
