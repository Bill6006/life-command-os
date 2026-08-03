import { z } from 'zod';
import { lifeCategory } from './categories';
import { envelopeShape, timeWindow, withEnvelopeInvariants } from './envelope';
import { evidenceValue } from './semantics';

/**
 * What actually happened: execution and outcome.
 *
 * Both are **observed**, and both are deliberately missing fields you might expect:
 *
 *   - `ExecutionRecord` has no effectiveness or success field. Whether following a
 *     recommendation helped is an evaluation, computed later and only when evidence
 *     permits. Recording a judgement here would let non-execution be read as
 *     failure, which `LEARN-002` forbids.
 *   - `OutcomeRecord` has no causal attribution — no `causedBy`, no `attributableTo`.
 *     A result observed after an action does not establish that the action produced
 *     it. Because the schema is strict, adding such a field is a parse error rather
 *     than a design drift.
 */

export const EXECUTION_STATES = [
  'executed',
  'partially-executed',
  'not-executed',
  'unknown-execution',
] as const;
export type ExecutionState = (typeof EXECUTION_STATES)[number];

/**
 * How a recommendation was acted on, if at all.
 *
 * `declineReason` exists so the user can say "cannot now" without that being turned
 * into evidence about the recommendation's quality. It informs future eligibility,
 * never effectiveness.
 */
export const executionRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('execution', 'observed'),
      /** Required. An execution is always the execution *of* a recommendation. */
      recommendationRecordId: z.uuid(),
      state: z.enum(EXECUTION_STATES),
      executedWindow: timeWindow.optional(),
      /** How closely the action matched what was recommended. */
      fidelityNote: z.string().max(500).optional(),
      declineReason: z.string().max(500).optional(),
    })
    .refine((r) => r.state !== 'executed' || r.executedWindow !== undefined, {
      message: 'A completed execution must record when it happened',
      path: ['executedWindow'],
    })
    .refine((r) => r.state !== 'unknown-execution' || r.executedWindow === undefined, {
      message: 'Unknown execution cannot claim a known execution window',
      path: ['executedWindow'],
    }),
);
export type ExecutionRecord = z.infer<typeof executionRecord>;

/* -------------------------------------------------------------------------- */

/**
 * What was actually observed within a defined outcome window.
 *
 * `result` is an `EvidenceValue`, so an outcome that has not arrived stays
 * `unresolved` instead of becoming a zero, a false, or a quiet failure. This is the
 * single most important use of the evidence wrapper in the whole model: missing
 * outcomes are the normal case, not an error state.
 */
export const outcomeRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('outcome', 'observed'),
      category: lifeCategory,
      target: z.string().min(1).max(200),
      outcomeWindow: timeWindow,
      /** May be unresolved. Never defaulted to a value. */
      result: evidenceValue(
        z.strictObject({
          summary: z.string().min(1).max(400),
          direction: z.enum(['improved', 'unchanged', 'worsened', 'mixed']),
        }),
      ),
      /** The observations that constitute this outcome. */
      observationRecordIds: z.array(z.uuid()),
      /** Present when the outcome follows an execution. Association only — not cause. */
      executionRecordId: z.uuid().optional(),
    })
    .refine((r) => r.result.status !== 'known' || r.observationRecordIds.length > 0, {
      message: 'A known outcome must cite the observations that established it',
      path: ['observationRecordIds'],
    }),
);
export type OutcomeRecord = z.infer<typeof outcomeRecord>;
