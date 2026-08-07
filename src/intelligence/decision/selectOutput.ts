import { knownValue, type CanonicalRecord } from '../../domain/records';
import { selectQuestion } from '../questioning/selectQuestion';
import { fits } from '../../domain/domains/capacity';
import { assessConfidence, northStar, openCommitments } from '../support';
import type {
  CandidateAction,
  DecisionOutput,
  EffectPrediction,
  RejectedCandidate,
  StateAssessment,
  UntreatedForecast,
} from '../types';

/**
 * Constraint-first decision selection (`DECISION-CONSTRAINT-FIRST`).
 *
 * The order is the point. Unsafe and ineligible actions are **removed**, never
 * merely penalised, so no amount of expected benefit can outscore a safety or
 * protected-context violation. Only what survives is compared.
 *
 *   1. Safety
 *   2. Protected contexts
 *   3. Non-negotiable commitments
 *   4. Time and capacity, judged against the *minimum* useful version
 *   5. Compare survivors on an inspectable integer score
 *
 * Exactly one thing is emitted. Rejected candidates go into an internal audit trail
 * that the interface layer must never render — that separation is what makes
 * "compared internally, one shown" true rather than aspirational (`INTEL-006`).
 *
 * Silence is a first-class result, not a fallback. The product prefers saying
 * nothing to manufacturing something.
 */

/** Below this, interrupting costs more than the action is expected to return. */
const INTERRUPTION_THRESHOLD = 3;

/** Slack the minimum useful version needs beyond the raw window. */
const MINIMUM_MARGIN_MINUTES = 5;

/** Ceilings that depleted or low capacity imposes, before any ranking happens. */
const DEPLETED_CEILING_MINUTES = 15;
const LOW_CEILING_MINUTES = 30;

const MAGNITUDE_POINTS: Record<string, number> = {
  large: 3,
  moderate: 2,
  small: 1,
  unknown: 0,
};
const FRICTION_POINTS: Record<string, number> = { low: 0, moderate: -1, high: -2 };
const REVERSIBILITY_POINTS: Record<string, number> = {
  reversible: 0,
  'partially-reversible': -1,
  irreversible: -3,
};

export interface SelectionResult {
  readonly output: DecisionOutput;
  readonly rejected: readonly RejectedCandidate[];
}

interface Scored {
  readonly candidate: CandidateAction;
  readonly prediction: EffectPrediction;
  readonly score: number;
  readonly workings: readonly string[];
}

function scoreCandidate(
  candidate: CandidateAction,
  prediction: EffectPrediction,
  free: number | undefined,
): Scored {
  const workings: string[] = [];
  let score = 0;

  if (candidate.goalId !== undefined) {
    const points = candidate.reason.includes('No recorded progress') ? 3 : 2;
    score += points;
    workings.push(`+${String(points)} relevance to an active goal`);
  }

  const benefit = prediction.effects.find((effect) => effect.direction === 'positive');
  const benefitPoints = MAGNITUDE_POINTS[benefit?.magnitude ?? 'unknown'] ?? 0;
  score += benefitPoints;
  workings.push(
    `+${String(benefitPoints)} expected benefit (${benefit?.magnitude ?? 'unknown'})`,
  );

  const frictionPoints = FRICTION_POINTS[candidate.friction] ?? 0;
  score += frictionPoints;
  if (frictionPoints !== 0)
    workings.push(`${String(frictionPoints)} friction (${candidate.friction})`);

  const reversibilityPoints = REVERSIBILITY_POINTS[candidate.reversibility] ?? 0;
  score += reversibilityPoints;
  if (reversibilityPoints !== 0) {
    workings.push(`${String(reversibilityPoints)} reversibility (${candidate.reversibility})`);
  }

  if (free !== undefined && candidate.durationMinutes <= free - 5) {
    score += 1;
    workings.push('+1 fits the window with margin');
  }

  const heavyCost = prediction.effects.some(
    (effect) =>
      effect.direction === 'negative' &&
      (effect.magnitude === 'moderate' || effect.magnitude === 'large'),
  );
  if (heavyCost) {
    score -= 1;
    workings.push('−1 carries a moderate or larger cost');
  }

  return { candidate, prediction, score, workings };
}

export function selectOutput(
  records: readonly CanonicalRecord[],
  state: StateAssessment,
  candidates: readonly CandidateAction[],
  predictions: readonly EffectPrediction[],
  forecast: UntreatedForecast,
): SelectionResult {
  const rejected: RejectedCandidate[] = [];
  const free = knownValue(state.availableMinutes);
  const capacity = knownValue(state.capacity);
  const star = northStar(records);
  const nonNegotiable = openCommitments(records).filter(
    (commitment) => commitment.nonNegotiable,
  );

  /* --- Nothing to reason from at all ------------------------------------- */
  if (candidates.length === 0 && state.basisRecordIds.length === 0) {
    return {
      output: {
        kind: 'insufficient-evidence',
        statement: 'Not enough recorded yet to recommend anything',
        missing: state.unknowns.length > 0 ? state.unknowns : ['No observations recorded'],
        wouldHelp:
          'One observation — how much time is free, or what you just finished — is enough to start.',
        confidence: assessConfidence({
          comparableCount: 0,
          freshness: 'none',
          consistent: true,
          complete: false,
        }),
      },
      rejected,
    };
  }

  /* --- Constraint filters, in order -------------------------------------- */
  let eligible = [...candidates];

  eligible = eligible.filter((candidate) => {
    if (candidate.risk === 'high' || candidate.reversibility === 'irreversible') {
      rejected.push({
        candidateId: candidate.id,
        stage: 'safety',
        reason: `Removed before ranking: risk ${candidate.risk}, ${candidate.reversibility}`,
      });
      return false;
    }
    return true;
  });

  eligible = eligible.filter((candidate) => {
    const clash = candidate.blockedByProtectedContexts.filter((context) =>
      state.protectedContexts.includes(context),
    );
    if (clash.length > 0) {
      rejected.push({
        candidateId: candidate.id,
        stage: 'protected-context',
        reason: `Protected context active: ${clash.join(', ')}`,
      });
      return false;
    }
    return true;
  });

  eligible = eligible.filter((candidate) => {
    const clash = nonNegotiable.find(
      (commitment) =>
        commitment.requiresProtectedContext !== undefined &&
        candidate.blockedByProtectedContexts.includes(commitment.requiresProtectedContext),
    );
    if (clash !== undefined) {
      rejected.push({
        candidateId: candidate.id,
        stage: 'commitment',
        reason: `Conflicts with non-negotiable commitment: ${clash.statement}`,
      });
      return false;
    }
    return true;
  });

  if (free !== undefined) {
    eligible = eligible.filter((candidate) => {
      /*
       * The minimum useful version needs the window *plus a little slack*. An
       * action that exactly fills the gap has no margin for starting late or
       * running over, and recommending it would be setting the user up to fail —
       * which is worse than saying nothing.
       */
      const needed = candidate.minimumMinutes + MINIMUM_MARGIN_MINUTES;
      if (needed > free) {
        rejected.push({
          candidateId: candidate.id,
          stage: 'capacity',
          reason: `Minimum version needs ${String(candidate.minimumMinutes)} min plus margin, only ${String(free)} free`,
        });
        return false;
      }
      return true;
    });
  }

  /*
   * Capacity is a constraint, not a penalty (master plan §28 step 3). When capacity
   * is low the product does not quietly rank a demanding action lower — it removes
   * it, because "you are depleted, here is something big" is exactly the
   * productivity-at-all-costs behaviour the Constitution forbids.
   */
  if (capacity === 'depleted' || capacity === 'low') {
    const ceiling = capacity === 'depleted' ? DEPLETED_CEILING_MINUTES : LOW_CEILING_MINUTES;
    eligible = eligible.filter((candidate) => {
      if (candidate.durationMinutes > ceiling) {
        rejected.push({
          candidateId: candidate.id,
          stage: 'capacity',
          reason: `Capacity is ${capacity}, which rules out anything over ${String(ceiling)} min`,
        });
        return false;
      }
      return true;
    });
  }

  /*
   * Shape, not duration (`V33-026`, clarification 3).
   *
   * The two filters above ask "is there enough time" and "is there enough capacity", and
   * between them they still cannot tell that sitting quietly is impossible at an open-plan
   * desk with ten free minutes and moderate energy. Shape is the third question, and the
   * only one that can say so.
   *
   * It runs last of the three because it is the most specific, and it can only ever remove
   * a candidate that has explicitly declared what it needs. An undeclared shape passes —
   * see `fits`, where unknown never blocks.
   */
  eligible = eligible.filter((candidate) => {
    if (candidate.capacity === undefined) return true;
    const verdict = fits(candidate.capacity, state.situation);
    if (!verdict.eligible) {
      rejected.push({
        candidateId: candidate.id,
        stage: 'capacity',
        reason: verdict.because,
      });
      return false;
    }
    return true;
  });

  /* --- One high-value question, when an answer changes eligibility -------- */
  const question = selectQuestion(state, eligible);
  if (question !== undefined) {
    return { output: question, rejected };
  }

  /* --- Nothing survived --------------------------------------------------- */
  if (eligible.length === 0) {
    const why =
      rejected.length === 0
        ? 'There is nothing recorded that would be worth doing now.'
        : rejected[0]?.stage === 'protected-context'
          ? `Everything worth doing is ruled out by a protected context (${state.protectedContexts.join(', ')}).`
          : rejected[0]?.stage === 'capacity'
            ? `Every candidate needs more time than the ${String(free ?? 0)} minutes available.`
            : 'Every candidate was ruled out before ranking.';

    return {
      output: {
        kind: 'silence',
        statement: 'Nothing requires attention right now',
        rationale: why,
        confidence: state.confidence,
        reasonTrace: [
          ...rejected.slice(0, 3).map((entry) => entry.reason),
          'Interrupting you would cost more than it could return',
        ],
        nextCheck: 'Next look when something material changes',
        secondaryActions: ['Something changed', 'Show details'],
      },
      rejected,
    };
  }

  /* --- Compare survivors -------------------------------------------------- */
  const scored = eligible
    .map((candidate) => {
      const prediction = predictions.find((entry) => entry.candidateId === candidate.id) ?? {
        candidateId: candidate.id,
        effects: [],
        confidence: state.confidence,
        reasonTrace: [],
      };
      return scoreCandidate(candidate, prediction, free);
    })
    // Deterministic: score, then lower friction, then shorter, then id.
    .sort(
      (a, b) =>
        b.score - a.score ||
        (FRICTION_POINTS[b.candidate.friction] ?? 0) -
          (FRICTION_POINTS[a.candidate.friction] ?? 0) ||
        a.candidate.durationMinutes - b.candidate.durationMinutes ||
        a.candidate.id.localeCompare(b.candidate.id),
    );

  const best = scored[0];
  if (best === undefined) {
    throw new Error('Unreachable: eligible candidates exist but none scored');
  }

  for (const loser of scored.slice(1)) {
    rejected.push({
      candidateId: loser.candidate.id,
      stage: 'comparison',
      reason: `Scored ${String(loser.score)} against ${String(best.score)}`,
    });
  }

  /* --- Interruption is not automatic ------------------------------------- */
  if (best.score < INTERRUPTION_THRESHOLD) {
    return {
      output: {
        kind: 'silence',
        statement: 'Nothing requires attention right now',
        rationale: `The best available action scored ${String(best.score)}, below the threshold worth interrupting you for.`,
        confidence: state.confidence,
        reasonTrace: [
          ...best.workings,
          `Below the interruption threshold of ${String(INTERRUPTION_THRESHOLD)}`,
          'Doing nothing is the better call',
        ],
        nextCheck: 'Next look when something material changes',
        secondaryActions: ['Something changed', 'Show details'],
      },
      rejected,
    };
  }

  const capacityNote =
    capacity === undefined ? 'Capacity is unknown' : `Capacity is ${capacity}`;

  return {
    output: {
      kind: 'action',
      candidate: best.candidate,
      effects: best.prediction.effects,
      northStar:
        star === undefined
          ? undefined
          : {
              relevance: best.candidate.goalId === undefined ? 'Indirect' : 'Moves toward it',
              statement: star.statement,
            },
      confidence: best.prediction.confidence,
      reasonTrace: [
        best.candidate.reason,
        free === undefined
          ? 'Fits the window once time is confirmed'
          : `The window is long enough for the minimum useful version (${String(best.candidate.minimumMinutes)} of ${String(free)} min)`,
        state.protectedContexts.length === 0
          ? 'No protected context is active'
          : `Protected contexts respected: ${state.protectedContexts.join(', ')}`,
        capacityNote,
        `Selected over ${String(scored.length - 1)} other candidate${scored.length === 2 ? '' : 's'}: ${best.workings.join(', ')}`,
        forecast.projection.status === 'known'
          ? `Untreated path: ${forecast.projection.value.summary}`
          : 'Untreated path could not be projected',
      ],
      primaryAction: 'Start',
      // The approved Console response set (Blueprint §7.4). Declining and updating
      // state are first-class responses, and neither becomes evidence about whether
      // the recommendation was any good.
      secondaryActions: ['Can’t now', 'Update state', 'Why this'],
    },
    rejected,
  };
}
