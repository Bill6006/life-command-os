import type { CanonicalRecord } from '../../domain/records';
import { activeGoals, shortLabel, weekEnd } from '../support';
import type { TrajectoryResult, UntreatedForecast } from '../types';

/**
 * What happens if nothing changes (`FORECAST-UNTREATED`).
 *
 * Persistence: carry the observed direction forward and state the assumptions that
 * make that valid. It is the standard naive baseline for a short horizon and the
 * honest starting point — it claims only that things continue as they have been.
 *
 * **It abstains rather than guessing.** When the trajectory reports insufficient
 * evidence, the projection is `unknown` with a reason, not a hedged sentence. An
 * unsupported forecast that produces plausible words is worse than no forecast,
 * because the user cannot tell the difference.
 *
 * This is an *untreated* forecast — no action is attached to it. What an action
 * would do is a separate prediction, in a separate module, with a required link to
 * the candidate (`INTEL-003`).
 */
export function untreatedForecast(
  records: readonly CanonicalRecord[],
  trajectory: TrajectoryResult,
  now: Date,
): UntreatedForecast {
  const end = weekEnd(now);
  const horizon = {
    start: now.toISOString(),
    end: end.toISOString(),
    label: `Through ${shortLabel(new Date(end.getTime() - 1).toISOString())}`,
  };

  const goals = activeGoals(records);
  const goalAtRisk = goals.find((goal) => goal.category === trajectory.category);

  if (trajectory.direction === 'insufficient-evidence') {
    return {
      category: trajectory.category,
      target: 'Focused hours by the end of this week',
      horizon,
      projection: {
        status: 'unknown',
        reason: 'Not enough comparable weeks to project anything honestly',
      },
      assumptions: [],
      uncertainty: trajectory.detail,
      confidence: trajectory.confidence,
      reasonTrace: [
        'A projection needs at least three weeks carrying evidence',
        trajectory.detail,
        'Abstaining rather than producing a plausible-sounding guess',
      ],
    };
  }

  const direction =
    trajectory.direction === 'improving'
      ? 'improving'
      : trajectory.direction === 'declining'
        ? 'declining'
        : trajectory.direction === 'mixed'
          ? 'mixed'
          : 'stable';

  const summary =
    direction === 'declining'
      ? `Focused hours fall again this week${goalAtRisk === undefined ? '' : `, and ${goalAtRisk.statement} passes its window with no progress recorded`}.`
      : direction === 'improving'
        ? 'Focused hours continue to recover this week.'
        : 'Focused hours stay roughly where they are this week.';

  return {
    category: trajectory.category,
    target: 'Focused hours by the end of this week',
    horizon,
    projection: { status: 'known', value: { summary, direction } },
    assumptions: [
      'Current commitments hold',
      'No new blocks appear before the end of the week',
      'Focus sessions continue to be recorded the same way',
    ],
    uncertainty: `${trajectory.detail}. Persistence assumes the recent pattern continues, which a single changed week would break.`,
    confidence: trajectory.confidence,
    reasonTrace: [
      `The observed trajectory is ${trajectory.direction}`,
      'Persistence carries that direction to the end of the week',
      goalAtRisk === undefined
        ? 'No active goal in this category is affected'
        : `${goalAtRisk.statement} depends on this category`,
    ],
  };
}
