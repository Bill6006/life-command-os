import type {
  CanonicalRecord,
  LifeContextChangeRecord,
  UntreatedForecastRecord,
} from '../../domain/records';
import { assessConfidence, currentOfType } from '../support';
import type { ConfidenceAssessment } from '../types';
import { outcomeWindows, type OutcomeWindow } from './outcomeWindows';

/**
 * The two evaluations, kept permanently apart (`LEARN-001`).
 *
 * **Forecast accuracy** asks: did what we said would happen, happen?
 * **Recommendation effectiveness** asks: did following the advice help?
 *
 * These are different questions with different evidence requirements, and a
 * well-calibrated forecast says nothing about whether the advice was good. They live
 * in separate functions producing separate result types, and nothing in this module
 * combines them into a single figure.
 *
 * Three rules are non-negotiable and are enforced here rather than trusted:
 *   - **Non-execution is never judged.** Declining is not evidence about the
 *     recommendation (`LEARN-002`).
 *   - **A missing outcome stays unresolved.** Absence never becomes "contradicted".
 *   - **A confounded episode cannot be called supported.** That is exactly how a
 *     coincidence gets promoted into a causal belief.
 */

export const VERDICTS = [
  'supported',
  'partially-supported',
  'contradicted',
  'context-invalidated',
  'unresolved',
] as const;
export type Verdict = (typeof VERDICTS)[number];

export type ConfoundingRisk = 'low' | 'moderate' | 'high' | 'unknown';

export interface ForecastEvaluation {
  readonly forecastRecordId: string;
  readonly target: string;
  readonly predictedDirection: string;
  readonly observedDirection: string | undefined;
  readonly verdict: Verdict;
  readonly why: string;
  readonly confidence: ConfidenceAssessment;
  readonly outcomeRecordId: string | undefined;
}

export interface EffectivenessEvaluation {
  readonly recommendationRecordId: string;
  readonly executionRecordId: string;
  readonly executionState: string;
  readonly verdict: Verdict;
  readonly why: string;
  readonly confounding: { readonly risk: ConfoundingRisk; readonly factors: readonly string[] };
  readonly confidence: ConfidenceAssessment;
  readonly outcomeRecordId: string | undefined;
  /** True only when the prediction preceded the outcome it is judged against. */
  readonly prospective: boolean;
}

function contextChangeWithin(
  records: readonly CanonicalRecord[],
  from: string,
  to: string,
): LifeContextChangeRecord | undefined {
  return currentOfType<LifeContextChangeRecord>(records, 'life-context-change').find(
    (change) => change.effectiveFrom >= from && change.effectiveFrom <= to,
  );
}

/* -------------------------------------------------------------------------- */
/* Forecast accuracy                                                           */
/* -------------------------------------------------------------------------- */

export function evaluateForecasts(
  records: readonly CanonicalRecord[],
  now: Date,
): ForecastEvaluation[] {
  const forecasts = currentOfType<UntreatedForecastRecord>(records, 'untreated-forecast');
  const windows = outcomeWindows(records, now);

  return forecasts.map((forecast) => {
    const horizonClosed = Date.parse(forecast.horizon.end) <= now.getTime();

    const predicted =
      forecast.projection.status === 'known'
        ? forecast.projection.value.direction
        : 'abstained';

    // An outcome covering the same target inside the horizon.
    const matching = windows.find(
      (window) =>
        window.outcome?.target === forecast.target &&
        window.outcome.outcomeWindow.start >= forecast.occurredAt,
    );
    const outcome = matching?.outcome;
    const observed =
      outcome?.result.status === 'known' ? outcome.result.value.direction : undefined;

    const contextChange = contextChangeWithin(
      records,
      forecast.occurredAt,
      forecast.horizon.end,
    );

    let verdict: Verdict;
    let why: string;

    if (forecast.projection.status !== 'known') {
      // The forecast abstained. There is nothing to be right or wrong about.
      verdict = 'unresolved';
      why = 'The forecast abstained, so there is no claim to evaluate.';
    } else if (contextChange !== undefined) {
      verdict = 'context-invalidated';
      why = `Circumstances changed inside the horizon: ${contextChange.summary}. The forecast is neither right nor wrong — it was answering a different question.`;
    } else if (!horizonClosed) {
      verdict = 'unresolved';
      why = 'The horizon has not closed yet.';
    } else if (observed === undefined) {
      verdict = 'unresolved';
      why =
        'The horizon closed but no outcome was observed. Absence is not evidence against it.';
    } else {
      const agrees =
        (predicted === 'declining' && observed === 'worsened') ||
        (predicted === 'improving' && observed === 'improved') ||
        (predicted === 'stable' && observed === 'unchanged');
      const partly = observed === 'mixed' || predicted === 'mixed';

      verdict = agrees ? 'supported' : partly ? 'partially-supported' : 'contradicted';
      why = agrees
        ? `Predicted ${predicted}; observed ${observed}.`
        : partly
          ? `Predicted ${predicted}; observed ${observed}. Partly consistent.`
          : `Predicted ${predicted}; observed ${observed}. The forecast was wrong.`;
    }

    return {
      forecastRecordId: forecast.recordId,
      target: forecast.target,
      predictedDirection: predicted,
      observedDirection: observed,
      verdict,
      why,
      confidence: assessConfidence({
        comparableCount: verdict === 'unresolved' ? 0 : 1,
        freshness: 'fresh',
        consistent: true,
        complete: verdict !== 'unresolved',
      }),
      outcomeRecordId: outcome?.recordId,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Recommendation effectiveness                                                */
/* -------------------------------------------------------------------------- */

function assessConfounding(
  records: readonly CanonicalRecord[],
  window: OutcomeWindow,
): { risk: ConfoundingRisk; factors: string[] } {
  const factors: string[] = [];

  if (window.overlappingExecutionIds.length > 0) {
    factors.push(
      `${String(window.overlappingExecutionIds.length)} other action${window.overlappingExecutionIds.length === 1 ? '' : 's'} ran inside the same window`,
    );
  }

  const change = contextChangeWithin(records, window.opensAt, window.closesAt);
  if (change !== undefined) factors.push(`Circumstances changed: ${change.summary}`);

  if (window.executionState === 'partially-executed') {
    factors.push('The action was only partly carried out, so the dose is uncertain');
  }

  const risk: ConfoundingRisk =
    factors.length >= 2 ? 'high' : factors.length === 1 ? 'moderate' : 'low';

  return { risk, factors };
}

export function evaluateEffectiveness(
  records: readonly CanonicalRecord[],
  now: Date,
): EffectivenessEvaluation[] {
  return outcomeWindows(records, now).map((window) => {
    const confounding = assessConfounding(records, window);
    const outcome = window.outcome;

    let verdict: Verdict;
    let why: string;

    if (
      window.executionState === 'not-executed' ||
      window.executionState === 'unknown-execution'
    ) {
      /*
       * The rule that matters most in this file. A recommendation the user declined
       * — or that we simply cannot confirm — tells us nothing about whether it would
       * have helped. Treating it as a failure would punish honesty (`LEARN-002`).
       */
      verdict = 'unresolved';
      why =
        window.executionState === 'not-executed'
          ? 'It was not carried out, so there is nothing to judge. Declining is not evidence about the recommendation.'
          : 'There is no reliable evidence it was carried out either way.';
    } else if (window.state === 'open') {
      verdict = 'unresolved';
      why = 'The outcome window is still open.';
    } else if (outcome === undefined) {
      verdict = 'unresolved';
      why =
        window.state === 'expired'
          ? 'The window closed long ago with no outcome recorded. It stays unresolved rather than being counted against the recommendation.'
          : 'No outcome has been observed yet.';
    } else if (outcome.result.status !== 'known') {
      verdict = 'unresolved';
      why = 'The outcome itself is unresolved.';
    } else {
      const improved = outcome.result.value.direction === 'improved';
      const worsened = outcome.result.value.direction === 'worsened';

      if (confounding.risk === 'high') {
        /*
         * A confounded episode cannot support a causal-sounding claim, however good
         * the outcome looks. This is precisely the path by which a coincidence would
         * otherwise become a belief.
         */
        verdict = 'partially-supported';
        why = `The outcome ${outcome.result.value.direction}, but too much else was going on to attribute it. ${confounding.factors.join('; ')}.`;
      } else if (improved) {
        verdict = 'supported';
        why =
          'The outcome improved and nothing else obvious explains it. Association, not proof.';
      } else if (worsened) {
        verdict = 'contradicted';
        why = 'The outcome worsened after following the recommendation.';
      } else {
        verdict = 'partially-supported';
        why = `The outcome was ${outcome.result.value.direction}.`;
      }
    }

    return {
      recommendationRecordId: window.recommendationRecordId,
      executionRecordId: window.executionRecordId,
      executionState: window.executionState,
      verdict,
      why,
      confounding,
      confidence: assessConfidence({
        comparableCount: verdict === 'unresolved' ? 0 : 1,
        freshness: 'fresh',
        consistent: confounding.risk !== 'high',
        complete: verdict !== 'unresolved',
      }),
      outcomeRecordId: outcome?.recordId,
      // The recommendation always precedes its own outcome, so a resolved
      // evaluation is prospective by construction.
      prospective: verdict !== 'unresolved',
    };
  });
}
