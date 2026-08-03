import type { CanonicalRecord, ObservationRecord } from '../../domain/records';
import {
  ATTRIBUTES,
  assessConfidence,
  assessFreshnessStatus,
  currentObservations,
  isoWeekKey,
  shortLabel,
  weekStart,
} from '../support';
import type { TrajectoryResult } from '../types';

/**
 * Focused-hours trajectory (`TRAJECTORY-FOCUSED-HOURS`).
 *
 * Sums observed focus blocks per ISO week and compares the most recent complete
 * week against the mean of the prior weeks that carry evidence. A 15 percent band
 * separates direction from noise — a stated convention, not a finding, and labelled
 * as such wherever it is shown.
 *
 * Two rules matter more than the arithmetic:
 *   - **A week with no evidence is a gap, never a zero.** Plotting absent evidence
 *     at the bottom of the axis would tell the user something false about their life.
 *   - **Fewer than three weeks with evidence abstains.** The direction is reported as
 *     `insufficient-evidence`, and the confidence label agrees with it.
 */

const WEEKS_IN_WINDOW = 8;
const DIRECTION_BAND = 0.15;
const OBSERVATION_USEFUL_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function minutesOf(observation: ObservationRecord): number {
  const value = observation.value;
  if (value.kind === 'duration') return value.minutes;
  if (value.kind === 'quantity' && value.unit === 'minutes') return value.amount;
  return 0;
}

export function focusedHoursTrajectory(
  records: readonly CanonicalRecord[],
  now: Date,
): TrajectoryResult {
  const observations = currentObservations(records).filter(
    (observation) => observation.attribute === ATTRIBUTES.focusedBlockMinutes,
  );

  // Build the window of weeks first, so weeks with no evidence exist as gaps.
  const thisWeekStart = weekStart(now);
  const weeks: { key: string; label: string; value: number | null }[] = [];
  for (let index = WEEKS_IN_WINDOW - 1; index >= 0; index -= 1) {
    const start = new Date(thisWeekStart.getTime() - index * 7 * DAY_MS);
    weeks.push({
      key: isoWeekKey(start.toISOString()),
      label: shortLabel(start.toISOString()),
      value: null,
    });
  }

  const totals = new Map<string, number>();
  for (const observation of observations) {
    const key = isoWeekKey(observation.occurredAt);
    totals.set(key, (totals.get(key) ?? 0) + minutesOf(observation));
  }
  for (const week of weeks) {
    const minutes = totals.get(week.key);
    if (minutes !== undefined) week.value = Math.round((minutes / 60) * 10) / 10;
  }

  const withEvidence = weeks.filter((week) => week.value !== null);
  const latestRecordedAt = observations.reduce<string | undefined>(
    (latest, observation) =>
      latest === undefined || observation.recordedAt > latest ? observation.recordedAt : latest,
    undefined,
  );
  const freshness = assessFreshnessStatus(latestRecordedAt, now, OBSERVATION_USEFUL_AGE_MS);

  const question = 'Is focused work recovering, or still declining?';
  const basisRecordIds = observations.map((observation) => observation.recordId);

  if (withEvidence.length < 3) {
    // Abstention, not a guess. The confidence label agrees with the direction.
    return {
      category: 'career-work-learning',
      question,
      attribute: ATTRIBUTES.focusedBlockMinutes,
      direction: 'insufficient-evidence',
      detail:
        withEvidence.length === 0
          ? 'No focus blocks recorded in the last eight weeks'
          : `Only ${String(withEvidence.length)} of the last eight weeks carry evidence`,
      periods: weeks.map((week) => ({ label: week.label, value: week.value })),
      confidence: assessConfidence({
        comparableCount: withEvidence.length,
        freshness,
        consistent: true,
        complete: false,
      }),
      freshness,
      basisRecordIds,
    };
  }

  const latest = withEvidence[withEvidence.length - 1];
  const priorValues = withEvidence.slice(0, -1).map((week) => week.value ?? 0);
  const priorMean = priorValues.reduce((sum, value) => sum + value, 0) / priorValues.length;
  const latestValue = latest?.value ?? 0;

  const delta = priorMean === 0 ? 0 : (latestValue - priorMean) / priorMean;
  const direction =
    delta > DIRECTION_BAND ? 'improving' : delta < -DIRECTION_BAND ? 'declining' : 'stable';

  const series = withEvidence
    .slice(-3)
    .map((week) => String(week.value))
    .join(' → ');

  return {
    category: 'career-work-learning',
    question,
    attribute: ATTRIBUTES.focusedBlockMinutes,
    direction,
    detail: `${series} hours over the last ${String(Math.min(3, withEvidence.length))} weeks with evidence`,
    periods: weeks.map((week) => ({ label: week.label, value: week.value })),
    confidence: assessConfidence({
      comparableCount: withEvidence.length,
      freshness,
      consistent: true,
      complete: true,
    }),
    freshness,
    basisRecordIds,
  };
}
