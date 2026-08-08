import type { MovePattern } from '../../domain/moves/families';
import { findPattern } from '../../domain/moves/registry';

/**
 * What the arbiter is allowed to know about a candidate (`V33-051`, v3.3 section E).
 *
 * ## Why this is a contract rather than a score
 *
 * The obvious design is one number per candidate. It is also the design that makes every
 * later question unanswerable: why did this win, what would have to change for it to lose,
 * which part of the judgement was evidence and which was a guess. A single number answers
 * none of those and cannot be argued with, which is exactly why it feels authoritative.
 *
 * So each consideration stays separate, keeps its own name, and keeps its own uncertainty.
 * The arbiter compares them by stated rules. A reader can disagree with one field without
 * having to reject the whole answer.
 *
 * ## Unknown is a value
 *
 * Every field can be `unknown`, and most of them are, today. That is not a gap to be
 * filled with a default — a default is a claim, and an unearned claim inside a ranking is
 * worse than an admitted absence because it is invisible. Sections F and G will populate
 * some of these from real evidence. Until then they say so.
 *
 * There is deliberately no arithmetic in this file.
 */

/** Three-valued, because "we do not know" is not the middle of a scale. */
export type Level = 'low' | 'moderate' | 'high' | 'unknown';

/** Qualitative direction and size. Never a number, never combined. */
export type Magnitude = 'none' | 'small' | 'meaningful' | 'unknown';

export interface ArbitrationFacts {
  /**
   * How directly this serves what the owner said their life is for.
   *
   * `unknown` when no North Star is recorded — not `low`. Someone who has not stated a
   * direction has not stated that this move is off it.
   */
  readonly northStarRelevance: Level;
  /** Whether this serves the focus chosen for the current week. */
  readonly weeklyDirectionRelevance: Level;
  /**
   * How much worse this gets by waiting.
   *
   * Not importance. A rare career window is urgent because it closes; a stalled goal is
   * important and can usually wait a day. Conflating them is how everything becomes
   * urgent.
   */
  readonly urgency: Level;
  /**
   * How much this unlocks beyond itself.
   *
   * A prerequisite has leverage its own effect does not explain. So does anything that
   * removes a recurring obstacle rather than working around it once.
   */
  readonly leverage: Level;
  /** Whether the current situation actually admits it. Decided by capacity shape. */
  readonly feasibility: Level;
  /** How much the app has earned the right to assert any of the above. */
  readonly confidence: Level;
  /** What it is expected to give, in words. Never a number without a metric. */
  readonly expectedUpside: Magnitude;
  /** What it might cost. `unknown` where nothing has been observed. */
  readonly possibleDownside: Magnitude;
  /** Whether a bad outcome can be undone. */
  readonly reversibility: 'reversible' | 'partially-reversible' | 'irreversible' | 'unknown';
  /**
   * What doing this costs by not doing something else.
   *
   * Populated against the *actual* alternatives in the set, not as a standing penalty —
   * see `opportunityCost.ts`. A move is expensive only relative to what it displaces.
   */
  readonly opportunityCost: Level;
  /**
   * Whether this could be done repeatedly without eroding something.
   *
   * Deliberately separate from whether it works. A move can produce a good outcome and
   * still be exhausting, disruptive, or quietly abandoned after a fortnight, and an engine
   * that folds the two together will keep recommending the thing being avoided.
   *
   * `unknown` for every pattern today. Nothing has been observed often enough to say, and
   * guessing would put an unearned judgement inside the ranking.
   */
  readonly sustainability: Level;
  /** How much the owner has already taken on today. */
  readonly actionLoad: Level;
  /** Whether something already chosen or done rules this out right now. */
  readonly contradicted: boolean;
  /** Where the move sits in its own evidence history. */
  readonly lifecycle: MovePattern['lifecycle'] | 'unknown';
}

/** Everything unknown. The honest starting point for a candidate nobody knows anything about. */
export const UNKNOWN_FACTS: ArbitrationFacts = {
  northStarRelevance: 'unknown',
  weeklyDirectionRelevance: 'unknown',
  urgency: 'unknown',
  leverage: 'unknown',
  feasibility: 'unknown',
  confidence: 'unknown',
  expectedUpside: 'unknown',
  possibleDownside: 'unknown',
  reversibility: 'unknown',
  opportunityCost: 'unknown',
  sustainability: 'unknown',
  actionLoad: 'unknown',
  contradicted: false,
  lifecycle: 'unknown',
};

export interface FactInputs {
  /** Capability channels the recorded North Star is about, if one exists. */
  readonly northStarChannels: ReadonlySet<string>;
  /** Channels this week's confirmed direction is about, if one is confirmed. */
  readonly weeklyChannels: ReadonlySet<string>;
  /** Whether the situation admits the move's shape. */
  readonly feasible: boolean | undefined;
  /** Moves already started or completed today. */
  readonly actionsToday: number;
  readonly contradicted: boolean;
}

/** Load bands. Three moves in a day is a full day for most people, most days. */
const BUSY_AT = 3;
const SOME_AT = 1;

/**
 * The facts that can be derived deterministically today.
 *
 * Everything here follows from the pattern's own declarations and the current situation.
 * Nothing is inferred from outcome history, because the learning that would justify it has
 * not been built — and the fields it will populate are left `unknown` rather than
 * pre-filled with something plausible.
 */
export function deriveFacts(patternId: string, inputs: FactInputs): ArbitrationFacts {
  const pattern = findPattern(patternId);
  if (pattern === undefined) {
    return { ...UNKNOWN_FACTS, contradicted: inputs.contradicted };
  }

  const channels = new Set(pattern.effects.map((effect) => effect.channel));
  const overlaps = (against: ReadonlySet<string>): Level => {
    if (against.size === 0) return 'unknown';
    const shared = [...channels].filter((channel) => against.has(channel)).length;
    if (shared === 0) return 'low';
    return shared > 1 ? 'high' : 'moderate';
  };

  /*
   * Leverage comes from the pattern's declared shape, not from a guess. A prerequisite
   * exists to unlock something else, and a `prepare` family exists to remove friction from
   * a later thing — both are worth more than their own effect suggests.
   */
  const unlocksSomething =
    pattern.capacity?.shape === 'prerequisite' ||
    pattern.observationWindow === 'multi-week' ||
    pattern.observationWindow === 'multi-day';

  const strongest = pattern.effects.reduce<Magnitude>((best, effect) => {
    if (effect.magnitude === 'meaningful') return 'meaningful';
    if (effect.magnitude === 'small' && best === 'unknown') return 'small';
    return best;
  }, 'unknown');

  return {
    northStarRelevance: overlaps(inputs.northStarChannels),
    weeklyDirectionRelevance: overlaps(inputs.weeklyChannels),

    /*
     * Urgency is about closing windows, and the catalogue has no field for that yet. A
     * move whose effect lands tomorrow morning is the one case a pattern *can* express:
     * the chance to affect tonight closes tonight.
     */
    urgency: pattern.observationWindow === 'next-morning' ? 'moderate' : 'unknown',

    leverage: unlocksSomething ? 'moderate' : 'low',
    feasibility: inputs.feasible === undefined ? 'unknown' : inputs.feasible ? 'high' : 'low',

    /*
     * An authored pattern that has never been observed here cannot be more than low
     * confidence, whatever the research behind it says about people in general.
     */
    confidence: pattern.lifecycle === 'supported' ? 'moderate' : 'low',

    expectedUpside: strongest,

    /* Nothing observed. A guessed downside is worse than an admitted unknown. */
    possibleDownside: pattern.safety === 'sensitive' ? 'unknown' : 'none',

    reversibility: 'reversible',
    opportunityCost: 'unknown',
    sustainability: 'unknown',

    actionLoad:
      inputs.actionsToday >= BUSY_AT
        ? 'high'
        : inputs.actionsToday >= SOME_AT
          ? 'moderate'
          : 'low',

    contradicted: inputs.contradicted,
    lifecycle: pattern.lifecycle,
  };
}
