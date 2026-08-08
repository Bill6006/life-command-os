import { knownValue, type CanonicalRecord } from '../../domain/records';
import { selectQuestion } from '../questioning/selectQuestion';
import { fits } from '../../domain/domains/capacity';
import { supportingWins } from './supportingWins';
import { assessConfidence, northStar, openCommitments } from '../support';
import { episodeContext, episodeFacts } from '../../command-core/arbitration/episodeFacts';
import { opportunityCost, weigh } from '../../command-core/arbitration/weigh';
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
  now: Date,
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
  /*
   * The contract decides the order (`V33-059`, section E).
   *
   * What replaced what: the integer total used to decide *both* which candidate won and
   * whether any of them was worth an interruption. Those are different questions, and
   * fusing them meant the answer to "why this one" was a number — unarguable, and blind
   * to the one thing the owner had actually declared. North Star relevance was applied as
   * a yes/no gate and then dropped, so two survivors ranked identically no matter what the
   * direction said.
   *
   * Ranking is now the ordered comparison in `weigh`: feasibility, then North Star, then
   * the week, then urgency, leverage, opportunity cost, upside, confidence. The first
   * field that separates two candidates decides, and it can be named. The integer survives
   * for the second question only — see the interruption threshold below — because "is
   * anything here worth breaking into someone's evening for" genuinely is a magnitude
   * question, and it is asked of the winner alone rather than used to find one.
   */
  const shared = episodeContext(records, now);
  const feasible = new Map(
    eligible.map((candidate) => [
      candidate.id,
      candidate.capacity === undefined
        ? true
        : fits(candidate.capacity, state.situation).eligible,
    ]),
  );

  /*
   * Contradictions are resolved before ranking, so every survivor here is uncontradicted
   * by construction. Passing an empty set states that rather than leaving the field to a
   * default nobody chose.
   */
  const inputs = { records, now, feasible, contradicted: new Set<string>() };

  const withFacts = eligible.map((candidate) => ({
    candidate,
    id: candidate.id,
    minutes: candidate.durationMinutes,
    facts: episodeFacts(
      candidate,
      inputs,
      shared.goalCategories,
      shared.weeklyCategories,
      shared.load,
    ),
  }));

  /*
   * Opportunity cost is relative, so it can only be filled once every alternative is
   * known. A move is expensive because of what it displaces, never because it is long.
   */
  const weighed = withFacts.map((entry) => ({
    ...entry,
    facts: { ...entry.facts, opportunityCost: opportunityCost(entry, withFacts, free) },
  }));

  const ranking = weigh(weighed);
  const order = new Map(ranking.ordered.map((entry, index) => [entry.id, index]));

  const scored = [...weighed]
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((entry) => {
      const prediction = predictions.find((item) => item.candidateId === entry.id) ?? {
        candidateId: entry.id,
        effects: [],
        confidence: state.confidence,
        reasonTrace: [],
      };
      return scoreCandidate(entry.candidate, prediction, free);
    });

  const best = scored[0];
  if (best === undefined) {
    throw new Error('Unreachable: eligible candidates exist but none scored');
  }

  for (const loser of scored.slice(1)) {
    rejected.push({
      candidateId: loser.candidate.id,
      stage: 'comparison',
      reason: ranking.whyItWon.startsWith('Chosen because ')
        ? `Beaten by ${best.candidate.id}: ${ranking.whyItWon.slice('Chosen because '.length)}`
        : `Beaten by ${best.candidate.id}`,
    });
  }

  /* --- Interruption is not automatic ------------------------------------- */
  /*
   * Asked of the whole set, not of the winner (`V33-060`).
   *
   * The threshold answers a different question from the ranking: not *which* of these is
   * best, but whether **anything** here is worth breaking into someone's day for. While
   * ranking was itself the score, the winner's score was the maximum and the distinction
   * did not matter. It does now — the contract can rightly prefer a modest move that
   * serves the owner's direction over a bigger one that does not, and thresholding on that
   * winner alone would turn "we chose the quieter option" into "we have nothing for you".
   *
   * Four home scenarios did exactly that when this seam was first wired: a real repeated
   * friction, correctly identified, silently dropped because the move chosen to address it
   * scored two.
   */
  const strongest = scored.reduce((high, entry) => Math.max(high, entry.score), 0);
  if (strongest < INTERRUPTION_THRESHOLD) {
    return {
      output: {
        kind: 'silence',
        statement: 'Nothing requires attention right now',
        rationale: `The strongest available action scored ${String(strongest)}, below the threshold worth interrupting you for.`,
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
      /*
       * Whatever small things fit around the answer, capped at three and usually empty
       * (`V33-020`). Drawn from the survivors of every filter above, so a supporting win
       * has already passed safety, protected context, time, capacity and shape.
       */
      supportingWins: supportingWins(best.candidate, eligible, state),
    },
    rejected,
  };
}
