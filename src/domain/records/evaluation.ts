import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';
import { confidence } from './semantics';
import { EXECUTION_STATES } from './execution';

/**
 * Self-evaluation: was the forecast right, and did the recommendation help?
 *
 * These are **two permanently separate questions** (`LEARN-001`). A well-calibrated
 * forecast says nothing about whether the recommendation was useful, and a helpful
 * recommendation says nothing about forecast accuracy. They are separate record
 * families so they cannot quietly become one number.
 */

/** The five verdicts. `unresolved` is a real, permanent-until-evidence-arrives answer. */
export const EVALUATION_VERDICTS = [
  'supported',
  'partially-supported',
  'contradicted',
  'context-invalidated',
  'unresolved',
] as const;
export type EvaluationVerdict = (typeof EVALUATION_VERDICTS)[number];

export const evaluationVerdict = z.enum(EVALUATION_VERDICTS);

/* -------------------------------------------------------------------------- */

/**
 * Did what we predicted would happen, happen?
 *
 * Without an outcome, the verdict must be `unresolved`. Missing outcomes never
 * become "contradicted" — absence of evidence is not evidence of a bad forecast.
 */
export const forecastEvaluationRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('forecast-evaluation', 'derived'),
      untreatedForecastRecordId: z.uuid(),
      outcomeRecordId: z.uuid().optional(),
      verdict: evaluationVerdict,
      confidence,
      reasonTrace: z.array(z.string().min(1).max(300)).min(1),
    })
    .refine((r) => r.outcomeRecordId !== undefined || r.verdict === 'unresolved', {
      message: 'Without an outcome, a forecast evaluation must remain unresolved',
      path: ['verdict'],
    }),
);
export type ForecastEvaluationRecord = z.infer<typeof forecastEvaluationRecord>;

/* -------------------------------------------------------------------------- */

export const CONFOUNDING_RISKS = ['low', 'moderate', 'high', 'unknown'] as const;

/**
 * Did following the recommendation help?
 *
 * Three rules are enforced structurally, and each corresponds directly to a way
 * this product could otherwise start lying to its user:
 *
 *   1. **Non-execution cannot be judged** (`LEARN-002`). If the recorded execution
 *      state is `not-executed` or `unknown-execution`, the verdict must be
 *      `unresolved`. A recommendation the user declined was not "ineffective".
 *   2. **Missing outcomes stay unresolved.** No outcome, no verdict.
 *   3. **Confounded episodes cannot be called supported.** A high-confounding-risk
 *      episode may not produce a `supported` verdict — that is precisely how a
 *      coincidence gets promoted into a causal belief.
 *
 * `executionStateAtEvaluation` is duplicated onto this record deliberately: an
 * invariant that has to load another record to check itself is not an invariant,
 * it is a hope.
 */
export const recommendationEffectEvaluationRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('recommendation-effect-evaluation', 'derived'),
      recommendationRecordId: z.uuid(),
      executionRecordId: z.uuid(),
      executionStateAtEvaluation: z.enum(EXECUTION_STATES),
      outcomeRecordId: z.uuid().optional(),
      verdict: evaluationVerdict,
      confoundingAssessment: z.strictObject({
        risk: z.enum(CONFOUNDING_RISKS),
        factors: z.array(z.string().min(1).max(300)),
      }),
      confidence,
      reasonTrace: z.array(z.string().min(1).max(300)).min(1),
    })
    .refine(
      (r) =>
        !['not-executed', 'unknown-execution'].includes(r.executionStateAtEvaluation) ||
        r.verdict === 'unresolved',
      {
        message:
          'A recommendation that was not executed cannot be judged effective or ineffective',
        path: ['verdict'],
      },
    )
    .refine((r) => r.outcomeRecordId !== undefined || r.verdict === 'unresolved', {
      message: 'Without an outcome, recommendation effectiveness must remain unresolved',
      path: ['verdict'],
    })
    .refine((r) => r.confoundingAssessment.risk !== 'high' || r.verdict !== 'supported', {
      message: 'A confounded episode cannot support a claim that the recommendation worked',
      path: ['verdict'],
    }),
);
export type RecommendationEffectEvaluationRecord = z.infer<
  typeof recommendationEffectEvaluationRecord
>;
