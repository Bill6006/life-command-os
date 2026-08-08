import type { CanonicalRecord, GoalRecord } from '../../domain/records';
import type { CandidateAction } from '../../intelligence/types';
import { type ArbitrationFacts, type Level, deriveFacts } from './facts';

/**
 * The arbitration contract, filled from a real episode (`V33-058`, v3.3 section E).
 *
 * ## Why this module exists separately from `facts.ts`
 *
 * `deriveFacts` knows a pattern and nothing else — it can read what the catalogue declares
 * and stops there. Four of the fourteen fields are not about the move at all: they are
 * about the owner's direction, their week, and how much today has already asked. Those
 * come from records, and keeping the record-reading out of `facts.ts` is what stops the
 * contract quietly becoming a second state assessment.
 *
 * ## How North Star relevance is derived, and why not from the words
 *
 * The North Star is free text and stays that way: *the system never scores it*. There is
 * no network model here to read it with and there should not be one — an app that graded
 * somebody's statement of what their life is for would be doing something this product
 * exists to refuse.
 *
 * So relevance is read from what the owner *did* about it: the goals they keep active.
 * A goal is the North Star made operational, it carries a category, and a candidate
 * carries a category. That match is deterministic, inspectable, and wrong in an obvious
 * way when it is wrong, which is the standard the whole engine is held to.
 *
 * When no North Star is recorded the answer is `unknown` — never `low`. Somebody who has
 * not said what matters has not said that this does not.
 */

/** Categories the owner's active goals are in. Empty when there are none. */
function activeGoalCategories(records: readonly CanonicalRecord[]): ReadonlySet<string> {
  return new Set(
    records
      .filter((record): record is GoalRecord => record.recordType === 'goal')
      .filter((goal) => goal.state === 'active')
      .map((goal) => goal.category),
  );
}

/**
 * The categories this week's direction is about.
 *
 * Only a **confirmed or adjusted** focus counts. A proposal the owner snoozed, skipped or
 * rejected is not a direction, and treating it as one would let the app's own suggestion
 * feed back into its ranking as though the owner had agreed to it.
 */
function weeklyFocusCategories(records: readonly CanonicalRecord[]): ReadonlySet<string> {
  const directions = records
    .filter((record) => record.recordType === 'weekly-direction')
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const latest = directions[directions.length - 1];
  if (latest?.recordType !== 'weekly-direction') return new Set();

  const answer = latest.userResponse;
  if (answer.status !== 'known') return new Set();
  if (answer.value.response !== 'confirmed' && answer.value.response !== 'adjusted') {
    return new Set();
  }
  if (latest.proposal.kind !== 'focus') return new Set();

  return new Set(latest.proposal.categories);
}

/** Moves already started or completed today, in the owner's own day. */
function actionsToday(records: readonly CanonicalRecord[], now: Date): number {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  return records.filter(
    (record) =>
      record.recordType === 'execution' &&
      record.state === 'executed' &&
      Date.parse(record.recordedAt) >= dayStart.getTime(),
  ).length;
}

export interface EpisodeFactInputs {
  readonly records: readonly CanonicalRecord[];
  readonly now: Date;
  /** Whether the situation admits each candidate's shape, by candidate id. */
  readonly feasible: ReadonlyMap<string, boolean>;
  /** Candidate ids something already done or chosen rules out. */
  readonly contradicted: ReadonlySet<string>;
}

/**
 * One candidate's fourteen fields.
 *
 * Everything the catalogue can answer comes from `deriveFacts`; the four fields that are
 * about the owner rather than the move are layered on here. `sustainability` is not among
 * them — nothing has been observed often enough to say, and it stays `unknown` on purpose.
 */
export function episodeFacts(
  candidate: CandidateAction,
  inputs: EpisodeFactInputs,
  goalCategories: ReadonlySet<string>,
  weeklyCategories: ReadonlySet<string>,
  load: number,
): ArbitrationFacts {
  const base = deriveFacts(candidate.patternId ?? candidate.id, {
    northStarChannels: new Set<string>(),
    weeklyChannels: new Set<string>(),
    feasible: inputs.feasible.get(candidate.id),
    actionsToday: load,
    contradicted: inputs.contradicted.has(candidate.id),
  });

  /*
   * A candidate attached to an active goal is serving the direction as directly as this
   * engine can establish. One merely in the same category as an active goal is serving it
   * indirectly. Neither is a guess: both are facts about records the owner wrote.
   */
  const northStarRelevance: Level =
    goalCategories.size === 0
      ? 'unknown'
      : candidate.goalId !== undefined
        ? 'high'
        : goalCategories.has(candidate.category)
          ? 'moderate'
          : 'low';

  const weeklyDirectionRelevance: Level =
    weeklyCategories.size === 0
      ? 'unknown'
      : weeklyCategories.has(candidate.category)
        ? 'high'
        : 'low';

  /*
   * Confidence is about what has been *earned*, not about what is plausible.
   *
   * A candidate a slice raised carries the owner's own records behind it: this friction
   * recurred three times, this goal has not moved in eleven days, this practice went
   * quiet. A catalogue pattern admitted by eligibility carries only that nothing rules it
   * out — true, and much weaker.
   *
   * Without this distinction the widened catalogue actively degrades the answer. Where
   * every other field is unknown for both, the tie falls to input order, and an
   * alphabetically early generic move beats a specific observation about this person.
   * That is the failure the catalogue work was supposed to avoid, and it showed up in the
   * fatherhood and emotional scenarios the moment the pool widened.
   *
   * `deriveFacts` has already read what the pattern's own lifecycle supports; this can
   * only raise it where there is a reason on record, and never past `moderate` — nothing
   * here has been observed often enough for `high`.
   */
  const raisedFromOwnEvidence =
    candidate.originDomainId !== undefined || candidate.goalId !== undefined;

  return {
    ...base,
    northStarRelevance,
    weeklyDirectionRelevance,
    confidence: raisedFromOwnEvidence ? 'moderate' : base.confidence,
    reversibility: candidate.reversibility,
  };
}

/** The shared inputs, read once per episode rather than once per candidate. */
export function episodeContext(records: readonly CanonicalRecord[], now: Date) {
  const hasNorthStar = records.some((record) => record.recordType === 'north-star');
  return {
    /* No recorded direction means no claim either way, so the field stays unknown. */
    goalCategories: hasNorthStar ? activeGoalCategories(records) : new Set<string>(),
    weeklyCategories: weeklyFocusCategories(records),
    load: actionsToday(records, now),
  };
}
