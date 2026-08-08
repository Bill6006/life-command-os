import type { CandidateAction } from '../../intelligence/types';
import type { ArbitrationFacts } from './facts';

/**
 * Best-known move versus bounded experiment (`V33-066`, v3.3 section H).
 *
 * ## Why the mode has to be named
 *
 * An engine with sparse evidence has two honest things it can do: recommend the
 * best-supported option, or try something to find out. Both are legitimate. What is not
 * legitimate is doing the second while presenting it as the first, which is what every
 * system does by default — a guess and a finding look identical once they are rendered as
 * a recommendation.
 *
 * So the mode is explicit (`H1`). A candidate is `supported`, `experiment`, or the whole
 * output is a deliberate `abstention`. The owner can always tell which one they are
 * looking at, and an experiment carries a stop condition and says when anyone will know
 * whether it helped.
 *
 * ## The gate is conjunctive, and stays that way
 *
 * Every condition in `H2` must hold. They are not weighed against each other and there is
 * no total to clear, because the failure mode of a scored gate is that a large enough
 * information value eventually buys its way past a safety condition. Information value is
 * the *last* test here, not the first.
 *
 * ## One at a time
 *
 * `H5`. The budget is one unresolved low-confidence experiment, and the reason is that
 * the owner is a person rather than a test harness. Two simultaneous experiments also
 * make each other uninterpretable: whatever happens, neither can be attributed.
 */

export type RecommendationMode = 'supported' | 'experiment' | 'abstention';

export const EXPERIMENT_BUDGET = 1;

/** Why a candidate may not be run as an experiment. Each is a hard stop. */
export type ExperimentRefusal =
  | 'not-low-confidence'
  | 'material-downside'
  | 'not-reversible'
  | 'unbounded'
  | 'a-supported-option-exists'
  | 'budget-spent'
  | 'nothing-to-learn';

export interface ExperimentVerdict {
  readonly eligible: boolean;
  readonly refusal: ExperimentRefusal | undefined;
  /** Shown to the owner when an experiment is offered. Never when it is refused. */
  readonly stopCondition: string | undefined;
  readonly because: string;
}

/**
 * Areas where finding out is not worth the cost of being wrong (`H4`).
 *
 * A protected context is not merely a scheduling constraint here: it marks the kinds of
 * consequence that cannot be undone by noticing them afterwards. Sleep is on the list
 * because a bad night is not reversible by deciding it was a bad idea, and because
 * `F`/`AT33-042` already treat protecting sleep as something that can beat a good move.
 */
const HIGH_STAKES_CONTEXTS = new Set(['sleep', 'caregiving', 'family']);

export interface ExperimentContext {
  /** Unresolved low-confidence experiments already running. */
  readonly unresolvedExperiments: number;
  /** True when some other candidate is genuinely supported by evidence. */
  readonly supportedAlternativeExists: boolean;
  /** How long the owner has, when known. An unbounded move cannot be a bounded trial. */
  readonly minutesAvailable: number | undefined;
}

/**
 * Whether this candidate may be offered as a bounded experiment.
 *
 * Ordered most-protective first, so the reason reported is the one that matters most.
 * A refusal is never overridden by anything later in the list.
 */
export function mayExperiment(
  candidate: CandidateAction,
  facts: ArbitrationFacts,
  context: ExperimentContext,
): ExperimentVerdict {
  const no = (refusal: ExperimentRefusal, because: string): ExperimentVerdict => ({
    eligible: false,
    refusal,
    stopCondition: undefined,
    because,
  });

  /*
   * 1. Serious downside. Checked first and never traded away (`H4`, `AT33-051`).
   *
   * Both halves matter: what the move itself risks, and what it would intrude on. A
   * reversible five-minute action is still not a reasonable thing to experiment with
   * during caregiving.
   */
  if (candidate.risk === 'moderate' || candidate.risk === 'high') {
    return no('material-downside', 'The downside here is too material to try something on');
  }
  if (facts.possibleDownside === 'meaningful') {
    return no('material-downside', 'A meaningful downside has been recorded for this');
  }
  if (candidate.blockedByProtectedContexts.some((entry) => HIGH_STAKES_CONTEXTS.has(entry))) {
    return no('material-downside', 'This touches something not worth experimenting with');
  }

  /* 2. Reversibility. An experiment you cannot undo is a decision. */
  if (candidate.reversibility !== 'reversible') {
    return no('not-reversible', 'This could not be undone if it went badly');
  }

  /*
   * 3. Bounded. A move with no stopping point is not a trial, and one that will not fit
   * the window is not bounded in any sense the owner would recognise.
   */
  if (candidate.stoppingPoint.trim().length === 0) {
    return no('unbounded', 'This has no defined stopping point');
  }
  if (
    context.minutesAvailable !== undefined &&
    candidate.minimumMinutes > context.minutesAvailable
  ) {
    return no('unbounded', 'There is not enough time to run this as a bounded try');
  }

  /* 4. Experiments are for uncertainty. Something already supported is not one. */
  if (facts.confidence === 'high') {
    return no('not-low-confidence', 'This is not uncertain enough to need testing');
  }

  /*
   * 5. A supported option makes the experiment unnecessary rather than unsafe (`H2`).
   * Learning is worth something; it is not worth more than a known good answer.
   */
  if (context.supportedAlternativeExists) {
    return no('a-supported-option-exists', 'Something better supported is available right now');
  }

  /* 6. The budget. One unresolved experiment at a time (`H5`, `AT33-040`). */
  if (context.unresolvedExperiments >= EXPERIMENT_BUDGET) {
    return no('budget-spent', 'Something else is already being tried and is not settled');
  }

  /*
   * 7. Information value, last. A move nobody could learn anything from is not an
   * experiment even when it is entirely harmless — it is just a suggestion.
   */
  if (facts.expectedUpside === 'none') {
    return no('nothing-to-learn', 'There is nothing here worth finding out');
  }

  return {
    eligible: true,
    refusal: undefined,
    stopCondition: candidate.stoppingPoint,
    because: 'Untested here, low risk, and worth finding out',
  };
}

/* -------------------------------------------------------------------------- */

export interface RetestRationale {
  readonly allowed: boolean;
  /** What is different now. Required — a retest with no stated change is a repeat. */
  readonly changed: readonly string[];
  readonly because: string;
}

/**
 * Whether a move that went badly before may be tried again (`H3`, `AT33-041`).
 *
 * A poor result reduces confidence; it does not ban the move for ever, because the result
 * was about a situation and situations change. But the burden is on the change: a retest
 * needs a *named* material difference, and "some time has passed" is not one.
 *
 * `changed` is returned rather than merely checked, so the reason can be shown. A retest
 * the owner cannot see the rationale for is indistinguishable from the engine having
 * forgotten.
 */
export function mayRetest(
  priorPoorResults: number,
  materialChanges: readonly string[],
): RetestRationale {
  if (priorPoorResults === 0) {
    return { allowed: true, changed: [], because: 'Nothing has gone badly with this' };
  }

  if (materialChanges.length === 0) {
    return {
      allowed: false,
      changed: [],
      because: 'This has not gone well before, and nothing has changed since',
    };
  }

  return {
    allowed: true,
    changed: materialChanges,
    because: `This did not help before, but ${materialChanges.join(' and ')} since then`,
  };
}

/**
 * How an offered move should be labelled.
 *
 * Deliberately three-valued and deliberately not derived from a number. `supported` is a
 * claim that evidence backs this move *here*; anything less says so.
 */
export function modeFor(facts: ArbitrationFacts, isExperiment: boolean): RecommendationMode {
  if (isExperiment) return 'experiment';
  return facts.confidence === 'high' || facts.confidence === 'moderate'
    ? 'supported'
    : 'experiment';
}
