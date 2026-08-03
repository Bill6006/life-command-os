import { knownValue } from '../../domain/records';
import { assessConfidence } from '../support';
import type {
  CandidateAction,
  EffectPrediction,
  PredictedEffect,
  StateAssessment,
} from '../types';

/**
 * Predicted intervention effects (`INTERVENTION-EFFECTS`).
 *
 * Structurally separate from the untreated forecast and required to name the
 * candidate it is about (`INTEL-003`). One is "what happens anyway"; this is "what
 * this action would change".
 *
 * Positive, negative, delayed, uncertain, and cross-domain effects are emitted
 * **independently and never netted**. A single combined figure would hide exactly
 * the tradeoff the user needs to see, which is the whole reason the effects table
 * exists on the surface.
 *
 * Magnitudes are coarse words, never numbers. No personal evidence for effect sizes
 * exists yet, and a number would claim a measurement nobody has taken.
 */

/** An action finishing this close to a protected boundary may run into it. */
const BOUNDARY_RISK_MINUTES = 15;

export function predictEffects(
  candidate: CandidateAction,
  state: StateAssessment,
): EffectPrediction {
  const free = knownValue(state.availableMinutes);
  const effects: PredictedEffect[] = [];
  const reasonTrace: string[] = [];

  // Benefit to the action's own category, scaled by dose against its minimum.
  const doseRatio = candidate.durationMinutes / Math.max(1, candidate.minimumMinutes);
  const benefitMagnitude = doseRatio >= 3 ? 'large' : doseRatio >= 1.8 ? 'moderate' : 'small';
  effects.push({
    category: candidate.category,
    direction: 'positive',
    magnitude: benefitMagnitude,
    timing: 'immediate',
    crossDomain: false,
    uncertain: false,
    note: candidate.reason,
  });
  reasonTrace.push(
    `Dose is ${String(candidate.durationMinutes)} minutes against a ${String(candidate.minimumMinutes)}-minute minimum, so benefit is ${benefitMagnitude}`,
  );

  // Cost to time and capacity, scaled by the share of the free window consumed.
  if (free === undefined) {
    effects.push({
      category: 'time-attention-capacity',
      direction: 'negative',
      magnitude: 'unknown',
      timing: 'immediate',
      crossDomain: candidate.category !== 'time-attention-capacity',
      uncertain: true,
      note: 'Free time is unknown, so the cost cannot be sized',
    });
    reasonTrace.push(
      'Available time is unknown, so the cost is reported as unknown rather than assumed small',
    );
  } else {
    const share = candidate.durationMinutes / Math.max(1, free);
    const costMagnitude = share >= 0.85 ? 'moderate' : share >= 0.5 ? 'small' : 'small';
    effects.push({
      category: 'time-attention-capacity',
      direction: 'negative',
      magnitude: costMagnitude,
      timing: 'immediate',
      crossDomain: candidate.category !== 'time-attention-capacity',
      uncertain: false,
      note:
        share >= 0.85
          ? 'Consumes the entire free window with no margin'
          : 'Uses part of the free window',
    });
    reasonTrace.push(
      `Uses ${String(Math.round(share * 100))} percent of the free window, so the cost is ${costMagnitude}`,
    );

    // A delayed, uncertain effect when the action lands near a protected boundary.
    const margin = free - candidate.durationMinutes;
    if (margin <= BOUNDARY_RISK_MINUTES) {
      effects.push({
        category: 'time-attention-capacity',
        direction: state.protectedContexts.length > 0 ? 'negative' : 'neutral',
        magnitude: 'unknown',
        timing: 'delayed',
        crossDomain: true,
        uncertain: true,
        note:
          state.protectedContexts.length > 0
            ? `May overrun into protected time (${state.protectedContexts.join(', ')})`
            : 'Finishes close to the end of the window',
      });
      reasonTrace.push(
        `Only ${String(Math.max(0, margin))} minutes of margin, so overrun is possible but not certain`,
      );
    }
  }

  return {
    candidateId: candidate.id,
    effects,
    confidence: assessConfidence({
      comparableCount: state.basisRecordIds.length,
      freshness: state.readings[0]?.freshness ?? 'none',
      consistent: state.contradictions.length === 0,
      complete: free !== undefined,
    }),
    reasonTrace,
  };
}
