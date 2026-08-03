import type { CanonicalRecord, UntreatedForecastRecord } from '../../domain/records';
import { ago, currentObservations, currentOfType, openCommitments } from '../support';

/**
 * Graceful return after absence (Prompt 6 task 13).
 *
 * The single design rule: **nothing here may make the user feel behind.**
 *
 * No backlog is generated, no missed days are counted, no streak was broken because
 * there are no streaks. What absence actually produces is stale predictions and a
 * thinner evidence base, and those are the only things reported.
 *
 * Concretely:
 *   - predictions whose horizon passed unobserved are **expired**, not failed;
 *   - history is preserved untouched;
 *   - open loops are summarised, not listed as chores;
 *   - at most one question is asked;
 *   - the baseline rebuilds gradually, and confidence says so.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Long enough that the picture has probably moved on without us. */
export const ABSENCE_THRESHOLD_DAYS = 7;

export interface ReturnAfterAbsence {
  readonly returning: boolean;
  readonly awayDays: number;
  readonly summary: string;
  /** Predictions whose horizon closed while nobody was looking. */
  readonly expiredPredictions: readonly {
    readonly target: string;
    readonly horizonEnded: string;
  }[];
  readonly openLoops: readonly string[];
  readonly rebuildingNote: string;
}

export function assessReturn(
  records: readonly CanonicalRecord[],
  now: Date,
): ReturnAfterAbsence {
  const observations = currentObservations(records);

  const latest = observations.reduce<string | undefined>(
    (newest, observation) =>
      newest === undefined || observation.recordedAt > newest ? observation.recordedAt : newest,
    undefined,
  );

  const awayDays =
    latest === undefined ? 0 : Math.floor((now.getTime() - Date.parse(latest)) / DAY_MS);
  const returning = awayDays >= ABSENCE_THRESHOLD_DAYS;

  const expiredPredictions = currentOfType<UntreatedForecastRecord>(
    records,
    'untreated-forecast',
  )
    .filter((forecast) => Date.parse(forecast.horizon.end) < now.getTime() - DAY_MS)
    .map((forecast) => ({
      target: forecast.target,
      horizonEnded: ago(forecast.horizon.end, now),
    }));

  const loops = openCommitments(records);

  return {
    returning,
    awayDays,
    summary: returning
      ? `Nothing was recorded for ${String(awayDays)} days. That is not a problem to fix — it just means the picture is thinner than it was.`
      : 'No gap in recording.',
    expiredPredictions,
    openLoops: loops
      .slice(0, 3)
      .map((commitment) => `${commitment.statement} — ${commitment.state}`),
    rebuildingNote: returning
      ? 'Confidence stays low until there is recent evidence again. One observation is enough to start rebuilding it.'
      : 'The baseline is current.',
  };
}
