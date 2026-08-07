/**
 * What a move costs to do, in capacity rather than in minutes (`V33-026`, clarification 3).
 *
 * ## Why minutes were never enough
 *
 * Every candidate has carried a `durationMinutes` and a `minimumMinutes` since Phase 4, and
 * for a while that looked like a capacity model. It is not. Twenty minutes of paperwork and
 * twenty minutes of a difficult conversation with your wife are the same number and nothing
 * else the same: one can be done in four interrupted bursts at a desk, the other cannot be
 * done at all unless you are in the same room, uninterrupted, and neither of you is about
 * to leave. Ranking those two by duration produces confident nonsense.
 *
 * A move's *shape* is what decides whether the current situation admits it:
 *
 *   - **`exclusive-time`** — needs an uninterrupted block. Interrupting it wastes it.
 *   - **`parallel`** — runs alongside something else. A walk during a call; a soak while
 *     cooking. These stay eligible when the owner is "busy", which is precisely when a
 *     minutes-only model gives up and recommends nothing.
 *   - **`transition`** — fits in the seam between two other things, and only there.
 *   - **`prerequisite`** — a small thing that unlocks a larger one later. Its value is not
 *     its own effect; it is that something else becomes possible.
 *   - **`protected-focus`** — needs privacy or emotional room as well as time. Cannot be
 *     done in an open-plan office at any duration.
 *
 * ## Setup and interruption cost
 *
 * Two further numbers, because a move with a fifteen-minute setup is not a fifteen-minute
 * move, and a move that survives interruption is worth offering in a situation where one is
 * likely. Both are optional: a domain that has not thought about it says nothing rather
 * than guessing, and the arbiter treats an absent value as unknown rather than as zero.
 */

export const CAPACITY_SHAPES = [
  'exclusive-time',
  'parallel',
  'transition',
  'prerequisite',
  'protected-focus',
] as const;
export type CapacityShape = (typeof CAPACITY_SHAPES)[number];

export interface CapacityProfile {
  readonly shape: CapacityShape;
  /**
   * Minutes of preparation before the move itself begins, when that is material.
   *
   * Omitted rather than zeroed when unknown. A domain that has not measured it must not
   * assert that there is none.
   */
  readonly setupMinutes?: number | undefined;
  /**
   * What an interruption costs.
   *
   * `none` — pick it straight back up. `partial` — some of it is lost. `total` — the whole
   * attempt is wasted, which is what makes a short exclusive block worse than no attempt.
   */
  readonly interruptionCost?: 'none' | 'partial' | 'total' | undefined;
}

/**
 * The situation a move has to fit into.
 *
 * Every field is optional because every one of them is genuinely unknown until the owner
 * says so, and an unknown must never be read as a permission or a prohibition.
 */
export interface SituationalCapacity {
  readonly setting?: 'home' | 'work' | 'out' | 'travelling' | 'other' | undefined;
  readonly engagement?:
    'free' | 'working' | 'with-family' | 'eating' | 'travelling' | 'winding-down' | undefined;
  readonly interruptibility?: 'free' | 'brief' | 'none' | undefined;
  readonly privacy?: 'private' | 'semi-private' | 'public' | undefined;
  readonly minutesFree?: number | undefined;
}

export interface Fit {
  readonly eligible: boolean;
  /** Stated so a trace can quote it. Present whether or not the move fits. */
  readonly because: string;
}

const FITS = (because: string): Fit => ({ eligible: true, because });
const BLOCKED = (because: string): Fit => ({ eligible: false, because });

/**
 * Whether a move's shape survives the current situation.
 *
 * **Unknown never blocks.** If the owner has not said where they are, a `protected-focus`
 * move stays eligible — the app has no evidence against it, and inventing some in the name
 * of caution would quietly delete whole categories of move from a fresh profile.
 *
 * Only an explicit, incompatible fact rules something out. That asymmetry is the whole
 * design: this function is looking for a reason to say no, and refuses to invent one.
 */
export function fits(profile: CapacityProfile, situation: SituationalCapacity): Fit {
  switch (profile.shape) {
    case 'parallel':
      /* The point of a parallel move is that being busy does not disqualify it. */
      return FITS('Runs alongside what you are already doing');

    case 'transition':
      if (situation.engagement === 'working' && situation.interruptibility === 'none') {
        return BLOCKED('Needs a gap between two things, and there is not one yet');
      }
      return FITS('Fits in the gap between two things');

    case 'exclusive-time':
      if (situation.interruptibility === 'none') {
        return BLOCKED('Needs an uninterrupted block, and you cannot step away');
      }
      if (situation.interruptibility === 'brief' && profile.interruptionCost === 'total') {
        return BLOCKED('An interruption would waste the whole attempt');
      }
      return FITS('There is room to give it your full attention');

    case 'protected-focus':
      if (situation.privacy === 'public') {
        return BLOCKED('Needs privacy, and you are around other people');
      }
      if (situation.setting === 'work') {
        return BLOCKED('Not something to do at work');
      }
      if (situation.interruptibility === 'none') {
        return BLOCKED('Needs room to think, and you cannot step away');
      }
      return FITS('There is enough privacy and room for it');

    case 'prerequisite':
      /* Small by construction, and its value is unlocking something else. */
      return FITS('Small, and it unlocks something larger later');
  }
}

/**
 * Which shapes each situational field can actually rule out.
 *
 * Derived from the branches in `fits` above, and the reason `selectQuestion` is allowed to
 * ask about a field at all. A question whose answer no rule reads is not a cheap question —
 * it is the one question that surface gets, spent on nothing (`UX-007`).
 */
const FIELD_AFFECTS: Record<
  'setting' | 'engagement' | 'interruptibility' | 'privacy',
  readonly CapacityShape[]
> = {
  setting: ['protected-focus'],
  engagement: ['transition'],
  interruptibility: ['exclusive-time', 'transition', 'protected-focus'],
  privacy: ['protected-focus'],
};

/**
 * Whether asking about one part of the situation could change what is eligible.
 *
 * False when nothing on the table has a shape that field can block — including the case
 * that matters most today, where no candidate declares a profile at all. The ladder then
 * asks nothing and the app keeps recommending, which is correct: a question that cannot
 * change the answer must not be allowed to delay it.
 */
export function situationFieldMatters(
  field: keyof typeof FIELD_AFFECTS,
  candidates: readonly { readonly capacity?: CapacityProfile | undefined }[],
): boolean {
  const blocks = FIELD_AFFECTS[field];
  return candidates.some(
    (candidate) =>
      candidate.capacity !== undefined && blocks.includes(candidate.capacity.shape),
  );
}

/**
 * Whether asking for a minute count could still change anything (clarification 2).
 *
 * The generic "how much usable time do you have?" question is asked **only here**: when the
 * situation is already known well enough that time is the last remaining discriminator, and
 * more than one eligible move is separated by nothing else. Anywhere earlier and it is a
 * number with nothing to compare against.
 */
export function timeWouldDiscriminate(
  eligible: readonly {
    readonly minimumMinutes: number;
    readonly durationMinutes: number;
  }[],
  situation: SituationalCapacity,
): boolean {
  if (situation.minutesFree !== undefined) return false;
  if (eligible.length === 0) return false;

  /*
   * Asked directly rather than inferred: does the answer change the answer?
   *
   * The bands offered on Now are "under 15", "15 to 40" and "more than 40". Two things can
   * move between the shortest band and the longest — **which moves are possible at all**
   * (their minimum version fits, or it does not) and **which can be done in full** rather
   * than cut down to that minimum. Either is a material change to what gets recommended.
   *
   * If neither count moves, no reply can rule anything in or out or change what is offered,
   * and the question is noise.
   */
  const possible = (limit: number): number =>
    eligible.filter((move) => move.minimumMinutes <= limit).length;
  const inFull = (limit: number): number =>
    eligible.filter((move) => move.durationMinutes <= limit).length;

  return (
    possible(SHORTEST_BAND_MINUTES) !== possible(LONGEST_BAND_MINUTES) ||
    inFull(SHORTEST_BAND_MINUTES) !== inFull(LONGEST_BAND_MINUTES)
  );
}

/** The bands Now offers, as the numbers they mean. */
const SHORTEST_BAND_MINUTES = 14;
const LONGEST_BAND_MINUTES = 41;
