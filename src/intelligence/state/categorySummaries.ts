import { ENABLED_CATEGORIES, knownValue, type CanonicalRecord } from '../../domain/records';
import {
  ATTRIBUTES,
  activeGoals,
  assessConfidence,
  currentObservations,
  openCommitments,
} from '../support';
import { assessHealth, summariseHealthCategory } from '../domains/health';
import { assessEmotional, summariseEmotionalCategory } from '../domains/emotional';
import { assessFaith, summariseFaithCategory } from '../domains/faith';
import { assessFatherhood, summariseFatherhoodCategory } from '../domains/fatherhood';
import type { CategorySummary, StateAssessment, TrajectoryResult } from '../types';

/**
 * A structured summary for every enabled category (Prompt 5 task 15).
 *
 * **No numerical category score.** Every metric here is a real domain quantity —
 * hours, counts, days — that means something on its own. The score gate requires
 * evidence adequate for the displayed precision, and this baseline has none, so
 * nothing here manufactures a 0–100 number to look complete (`UX-009`).
 *
 * Conditions are written in plain, non-moral language. "Losing ground on focused
 * work" describes a situation; "poor performance" would grade a person.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string | undefined, now: Date): number | undefined {
  if (iso === undefined) return undefined;
  return Math.floor((now.getTime() - Date.parse(iso)) / DAY_MS);
}

export function summariseCategories(
  records: readonly CanonicalRecord[],
  state: StateAssessment,
  trajectory: TrajectoryResult,
  now: Date,
): CategorySummary[] {
  const observations = currentObservations(records);
  const commitments = openCommitments(records);
  const goals = activeGoals(records);

  const focusObservations = observations.filter(
    (observation) => observation.attribute === ATTRIBUTES.focusedBlockMinutes,
  );
  const learningObservations = observations.filter(
    (observation) => observation.attribute === ATTRIBUTES.learningSession,
  );

  const thisWeekFocusMinutes = focusObservations
    .filter((observation) => now.getTime() - Date.parse(observation.occurredAt) < 7 * DAY_MS)
    .reduce((sum, observation) => {
      const value = observation.value;
      return sum + (value.kind === 'duration' ? value.minutes : 0);
    }, 0);

  const free = knownValue(state.availableMinutes);
  const capacity = knownValue(state.capacity);

  const latestGoalProgress = goals
    .map((goal) => daysSince(goal.recordedAt, now))
    .filter((days): days is number => days !== undefined)
    .sort((a, b) => b - a)[0];

  const summaries: CategorySummary[] = [];

  for (const category of ENABLED_CATEGORIES) {
    if (category === 'time-attention-capacity') {
      const hasEvidence = free !== undefined || capacity !== undefined;
      summaries.push({
        category,
        condition: !hasEvidence
          ? 'Not enough evidence to describe'
          : capacity === 'depleted' || capacity === 'low'
            ? 'Running low on capacity'
            : free !== undefined && free < 25
              ? 'Fragmented — no block long enough to be useful'
              : 'Fragmented, but not overloaded',
        trajectory: hasEvidence ? 'stable' : 'insufficient-evidence',
        confidence: assessConfidence({
          comparableCount: observations.length,
          freshness: state.readings[0]?.freshness ?? 'none',
          consistent: state.contradictions.length === 0,
          complete: hasEvidence,
        }),
        freshness: state.readings[0]?.freshness ?? 'none',
        drivers: [
          free === undefined
            ? 'Free time is unknown'
            : `${String(free)} minutes free right now`,
          state.protectedContexts.length === 0
            ? 'No protected context is active'
            : `Protected: ${state.protectedContexts.join(', ')}`,
        ],
        metrics: [
          {
            label: 'Free right now',
            value: free === undefined ? 'Unknown' : `${String(free)} min`,
          },
          { label: 'Capacity', value: capacity ?? 'Unknown' },
          { label: 'Protected contexts active', value: String(state.protectedContexts.length) },
        ],
        wouldChangeIt: 'A second week of fragmented mornings would move this to declining.',
      });
      continue;
    }

    if (category === 'direction-and-commitments') {
      const blocked = commitments.filter(
        (commitment) => commitment.state === 'blocked' || commitment.state === 'waiting',
      );
      const hasEvidence = commitments.length > 0 || goals.length > 0;
      summaries.push({
        category,
        condition: !hasEvidence
          ? 'Nothing recorded yet'
          : blocked.length > 0
            ? `${String(commitments.length)} open, ${String(blocked.length)} waiting on someone else`
            : `${String(commitments.length)} open, none blocked`,
        trajectory: !hasEvidence
          ? 'insufficient-evidence'
          : blocked.length > 0
            ? 'mixed'
            : 'stable',
        confidence: assessConfidence({
          comparableCount: commitments.length + goals.length,
          freshness: 'fresh',
          consistent: true,
          complete: hasEvidence,
        }),
        freshness: hasEvidence ? 'fresh' : 'none',
        drivers: hasEvidence
          ? [
              `${String(goals.length)} active goal${goals.length === 1 ? '' : 's'}`,
              blocked.length > 0
                ? `${String(blocked.length)} commitment${blocked.length === 1 ? '' : 's'} blocked or waiting`
                : 'No commitment is blocked',
            ]
          : ['No commitments or goals recorded'],
        metrics: [
          { label: 'Open loops', value: String(commitments.length) },
          { label: 'Blocked or waiting', value: String(blocked.length) },
          {
            label: 'Non-negotiable',
            value: String(commitments.filter((commitment) => commitment.nonNegotiable).length),
          },
        ],
        wouldChangeIt: 'Unblocking a waiting commitment, or agreeing to drop it.',
      });
      continue;
    }

    if (category === 'health-recovery-energy') {
      // Delegated to the Health slice so the reading exists in exactly one place.
      // A second copy here would drift from the panel within a phase.
      summaries.push(summariseHealthCategory(assessHealth(records, now), state));
      continue;
    }

    if (category === 'fatherhood-and-child') {
      // Delegated to the Fatherhood slice, for the same reason health's is.
      summaries.push(summariseFatherhoodCategory(assessFatherhood(records, now)));
      continue;
    }

    /*
     * Career, and only career.
     *
     * This used to be the loop's fallback, which meant every future category silently
     * inherited a reading about focused hours. Activating `fatherhood-and-child` put
     * "losing ground on focused work" under a heading about a two-year-old before the
     * exhaustiveness check below was added.
     */
    if (category === 'emotional-and-relationships') {
      // Delegated to the Emotional slice, for the same reason health's and
      // fatherhood's are: the slice created the category, so nothing else can describe
      // it without inventing a second version of the same reading.
      summaries.push(summariseEmotionalCategory(assessEmotional(records, now)));
      continue;
    }

    if (category === 'faith-and-meaning') {
      // Delegated to the Faith slice. It is the only summary in the product that can
      // never say `declining`, because that word here would be a verdict on a person's
      // faith rather than a reading of their records.
      summaries.push(summariseFaithCategory(assessFaith(records, now)));
      continue;
    }

    /*
     * Exhaustive by assignment.
     *
     * `category` must already be narrowed to career for this to compile, so adding a
     * life category without writing its summary is a **type error** rather than a panel
     * quietly inheriting another category's words. That is not hypothetical: this used
     * to be the loop's fallback, and activating `fatherhood-and-child` put "losing
     * ground on focused work" under a heading about a two-year-old.
     */
    const careerCategory: 'career-work-learning' = category;
    {
      const declining = trajectory.direction === 'declining';
      const insufficient = trajectory.direction === 'insufficient-evidence';
      summaries.push({
        category: careerCategory,
        condition: insufficient
          ? 'Not enough evidence to describe'
          : declining
            ? 'Losing ground on focused work'
            : trajectory.direction === 'improving'
              ? 'Focused work is recovering'
              : 'Focused work is holding steady',
        trajectory: trajectory.direction,
        confidence: trajectory.confidence,
        freshness: trajectory.freshness,
        drivers: insufficient
          ? ['Too few weeks carry evidence to say anything']
          : [
              trajectory.detail,
              latestGoalProgress === undefined
                ? 'No active goal recorded'
                : `Most recent goal update was ${String(latestGoalProgress)} day${latestGoalProgress === 1 ? '' : 's'} ago`,
            ],
        metrics: [
          {
            label: 'Focused hours this week',
            value:
              focusObservations.length === 0
                ? 'Unknown'
                : String(Math.round((thisWeekFocusMinutes / 60) * 10) / 10),
          },
          { label: 'Learning sessions this week', value: String(learningObservations.length) },
          { label: 'Active goals', value: String(goals.length) },
        ],
        wouldChangeIt: 'Two focused blocks this week would be enough to call it stable.',
      });
    }
  }

  return summaries;
}
