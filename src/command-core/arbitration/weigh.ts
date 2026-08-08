import type { ArbitrationFacts, Level } from './facts';

/**
 * Comparing candidates on the contract, and deciding when none of them wins
 * (`V33-052`, v3.3 sections E and F).
 *
 * ## Deterministic, and inspectable
 *
 * No weights, no total. The comparison is a stated order of questions, applied in order,
 * and the first one that separates two candidates decides between them. That means the
 * answer to "why did this win" is always a single sentence naming a single field, which is
 * the property a weighted sum can never have.
 *
 * Sparse evidence is the normal case, so the order is built to degrade well: every rule
 * treats `unknown` as *not a reason to prefer*, never as a reason to reject. A candidate
 * nobody knows anything about loses to one with a known advantage and beats nothing.
 */

const LEVELS: Record<Level, number> = { unknown: 0, low: 1, moderate: 2, high: 3 };

/**
 * Compares one field, in the direction where more is better.
 *
 * Returns 0 when either side is unknown, so an absence never wins and never loses on that
 * field alone — the comparison simply moves on to the next question.
 */
function better(a: Level, b: Level): number {
  if (a === 'unknown' || b === 'unknown') return 0;
  return LEVELS[b] - LEVELS[a];
}

/** The same, where less is better. */
function cheaper(a: Level, b: Level): number {
  if (a === 'unknown' || b === 'unknown') return 0;
  return LEVELS[a] - LEVELS[b];
}

export interface Weighed {
  readonly id: string;
  readonly facts: ArbitrationFacts;
}

/**
 * The order the arbiter asks its questions in.
 *
 * Each entry is one comparison and the sentence it justifies. The order is the product
 * decision — feasibility before everything because an impossible move is not a candidate;
 * North Star before urgency because urgency without direction is just noise being loud;
 * opportunity cost late, because it only means something once the rest is equal.
 */
const ORDER: readonly {
  readonly field: string;
  readonly compare: (a: ArbitrationFacts, b: ArbitrationFacts) => number;
  readonly because: string;
}[] = [
  {
    field: 'feasibility',
    compare: (a, b) => better(a.feasibility, b.feasibility),
    because: 'the situation actually allows it',
  },
  {
    field: 'northStarRelevance',
    compare: (a, b) => better(a.northStarRelevance, b.northStarRelevance),
    because: 'it serves what you said your life is for',
  },
  {
    field: 'weeklyDirectionRelevance',
    compare: (a, b) => better(a.weeklyDirectionRelevance, b.weeklyDirectionRelevance),
    because: 'it serves this week’s focus',
  },
  {
    field: 'urgency',
    compare: (a, b) => better(a.urgency, b.urgency),
    because: 'the chance to do it is closing',
  },
  {
    field: 'leverage',
    compare: (a, b) => better(a.leverage, b.leverage),
    because: 'it unlocks more than itself',
  },
  {
    field: 'opportunityCost',
    compare: (a, b) => cheaper(a.opportunityCost, b.opportunityCost),
    because: 'it costs less of what is scarce',
  },
  {
    field: 'expectedUpside',
    compare: (a, b) =>
      better(
        a.expectedUpside === 'meaningful'
          ? 'high'
          : a.expectedUpside === 'small'
            ? 'low'
            : 'unknown',
        b.expectedUpside === 'meaningful'
          ? 'high'
          : b.expectedUpside === 'small'
            ? 'low'
            : 'unknown',
      ),
    because: 'more is expected of it',
  },
  {
    field: 'confidence',
    compare: (a, b) => better(a.confidence, b.confidence),
    because: 'there is more behind the claim',
  },
  {
    /*
     * Last, and deliberately so (`G5`). Sustainability breaks a tie between two moves the
     * evidence cannot otherwise separate: offered the same thing twice, prefer the one the
     * owner has actually kept doing. It sits below confidence because a well-supported move
     * that is hard to repeat is still the better answer today — the point of keeping the two
     * apart is that neither silently overwrites the other.
     */
    field: 'sustainability',
    compare: (a, b) => better(a.sustainability, b.sustainability),
    because: 'it is one you have been able to keep doing',
  },
];

export interface Ranking {
  readonly ordered: readonly Weighed[];
  /** Why the winner beat the runner-up, naming the field that separated them. */
  readonly whyItWon: string;
}

/**
 * Orders candidates by the contract.
 *
 * Stable: candidates the order cannot separate keep the sequence they arrived in, so an
 * arbitrary tie never looks like a judgement.
 */
export function weigh(candidates: readonly Weighed[]): Ranking {
  const ordered = [...candidates].sort((a, b) => {
    for (const rule of ORDER) {
      const verdict = rule.compare(a.facts, b.facts);
      if (verdict !== 0) return verdict;
    }
    return 0;
  });

  const winner = ordered[0];
  const runnerUp = ordered[1];

  if (winner === undefined) return { ordered, whyItWon: 'Nothing to choose between' };
  if (runnerUp === undefined) return { ordered, whyItWon: 'It was the only thing available' };

  for (const rule of ORDER) {
    if (rule.compare(winner.facts, runnerUp.facts) < 0) {
      return { ordered, whyItWon: `Chosen because ${rule.because}` };
    }
  }
  return { ordered, whyItWon: 'Nothing separated the options; the first was taken' };
}

/* -------------------------------------------------------------------------- */
/* Opportunity cost                                                             */
/* -------------------------------------------------------------------------- */

export interface Alternative {
  readonly id: string;
  readonly facts: ArbitrationFacts;
  /** Minutes the alternative needs, so a cheap move is not charged for a costly one. */
  readonly minutes: number;
}

/**
 * What a move costs by displacing the alternatives actually present (`V33-053`).
 *
 * Relative, never a standing penalty. A twenty-minute walk is free on an empty evening and
 * expensive in the hour before a rare career window closes — and the only difference is
 * what else is in the set. A generic "long moves are costly" rule would get both wrong.
 *
 * The rule: a move is costly when it consumes time something *more urgent* also needs.
 * Urgency is the right test rather than importance, because an important thing that can
 * wait is not displaced by twenty minutes; a closing window is.
 */
export function opportunityCost(
  candidate: Alternative,
  alternatives: readonly Alternative[],
  minutesAvailable: number | undefined,
): Level {
  const others = alternatives.filter((entry) => entry.id !== candidate.id);
  if (others.length === 0) return 'low';

  const displaced = others.filter((other) => {
    if (other.facts.urgency !== 'high' && other.facts.urgency !== 'moderate') return false;
    if (LEVELS[other.facts.urgency] <= LEVELS[candidate.facts.urgency]) return false;
    /* Only genuinely competing for the same scarce time. */
    if (minutesAvailable === undefined) return true;
    return candidate.minutes + other.minutes > minutesAvailable;
  });

  if (displaced.length === 0) return 'low';
  return displaced.some((other) => other.facts.urgency === 'high') ? 'high' : 'moderate';
}

/* -------------------------------------------------------------------------- */
/* Abstention                                                                   */
/* -------------------------------------------------------------------------- */

export type Abstention =
  | { readonly kind: 'act' }
  | { readonly kind: 'continue'; readonly because: string }
  | { readonly kind: 'wait'; readonly because: string }
  | { readonly kind: 'recover'; readonly because: string }
  | { readonly kind: 'stop-for-tonight'; readonly because: string }
  | { readonly kind: 'nothing-further'; readonly because: string };

export interface LoadContext {
  /** Moves the owner has already started or completed today. */
  readonly actionsToday: number;
  /** Capacity, where it is known. */
  readonly capacity: 'depleted' | 'low' | 'moderate' | 'high' | undefined;
  /** Minutes until the owner's usual bedtime, where it is known. */
  readonly minutesToBedtime: number | undefined;
  /** True when something is already underway. */
  readonly somethingInProgress: boolean;
}

/** Below this many minutes to bedtime, starting something is borrowing from tomorrow. */
export const BEDTIME_GUARD_MINUTES = 60;

/** The most a day should ask of anyone before the answer becomes "that is enough". */
export const DAILY_ACTION_BUDGET = 3;

/**
 * Whether anything should be recommended at all (`V33-054`, section F).
 *
 * Runs **before** ranking and independently of how many candidates exist. That ordering is
 * the whole point: a hundred eligible moves is not a reason to pick one, and an engine that
 * only ever abstains when its list is empty will fill every evening with the best available
 * thing rather than the right one.
 *
 * Checked most-protective first, so the reason the owner sees is the one that matters most.
 */
export function shouldAbstain(load: LoadContext): Abstention {
  if (load.minutesToBedtime !== undefined && load.minutesToBedtime <= BEDTIME_GUARD_MINUTES) {
    return {
      kind: 'stop-for-tonight',
      because: 'Sleep is worth more than anything left on today’s list',
    };
  }

  if (load.capacity === 'depleted') {
    return { kind: 'recover', because: 'There is nothing left to spend' };
  }

  if (load.somethingInProgress) {
    return {
      kind: 'continue',
      because: 'Finishing what is started beats beginning something else',
    };
  }

  if (load.actionsToday >= DAILY_ACTION_BUDGET) {
    return { kind: 'nothing-further', because: 'Today has already asked enough' };
  }

  if (load.capacity === 'low') {
    return { kind: 'wait', because: 'Better to let this pass than push through it' };
  }

  return { kind: 'act' };
}
