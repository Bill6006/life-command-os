import type { CanonicalRecord } from '../domain/records';
import {
  detectMaterialChange,
  newestCluster,
  recordsBefore,
} from './change-detection/materialChange';
import { selectOutput } from './decision/selectOutput';
import { proposeWeeklyDirection } from './decision/weeklyDirection';
import { untreatedForecast } from './forecast/untreatedForecast';
import { generateCandidates } from './intervention/candidateActions';
import { predictEffects } from './intervention/predictedEffects';
import { assessState } from './state/assessState';
import { summariseCategories } from './state/categorySummaries';
import { focusedHoursTrajectory } from './state/trajectories';
import type { EpisodeResult } from './types';

export * from './types';
export * from './contracts';

/**
 * One decision episode.
 *
 * The lifecycle from the architecture, in order: gather, assess, forecast, generate
 * candidates, predict their effects, filter, compare, emit exactly one output.
 *
 * Deterministic throughout — `now` is passed in and no module reads the clock or a
 * random source. The same records at the same instant always produce the same
 * episode, which is what makes the scenario harness evidence rather than decoration.
 *
 * Intelligence emits structured results and **never writes to storage** (ARCH-001).
 * Persisting any of this is the application layer's decision.
 */
export function runEpisode(records: readonly CanonicalRecord[], now: Date): EpisodeResult {
  const state = assessState(records, now);
  const trajectory = focusedHoursTrajectory(records, now);
  const categories = summariseCategories(records, state, trajectory, now);
  const forecast = untreatedForecast(records, trajectory, now);

  const candidates = generateCandidates(records, state, now);
  const effects = candidates.map((candidate) => predictEffects(candidate, state));

  const { output, rejected } = selectOutput(records, state, candidates, effects, forecast);
  const weeklyDirection = proposeWeeklyDirection(records, state, categories, now);

  /*
   * Material change is a diff of two real runs. Re-running the engine over the
   * records that existed at the previous assessment is the only approach that
   * cannot claim a change the engine did not actually make.
   */
  const cluster = newestCluster(records);
  const clusterAt = cluster[0]?.recordedAt;
  const previousRecords = clusterAt === undefined ? [] : recordsBefore(records, clusterAt);

  const previous =
    previousRecords.length === 0
      ? undefined
      : (() => {
          const previousState = assessState(previousRecords, now);
          const previousTrajectory = focusedHoursTrajectory(previousRecords, now);
          const previousForecast = untreatedForecast(previousRecords, previousTrajectory, now);
          const previousCandidates = generateCandidates(previousRecords, previousState, now);
          const previousEffects = previousCandidates.map((candidate) =>
            predictEffects(candidate, previousState),
          );
          const previousSelection = selectOutput(
            previousRecords,
            previousState,
            previousCandidates,
            previousEffects,
            previousForecast,
          );
          return { output: previousSelection.output, state: previousState };
        })();

  const whatChanged = detectMaterialChange(records, previous, { output, state }, now);

  return {
    episodeId: `episode-${now.toISOString()}`,
    at: now.toISOString(),
    clock: now.toLocaleString('en-GB', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
      hour12: false,
    }),
    state,
    trajectory,
    categories,
    forecast,
    whatChanged,
    output,
    weeklyDirection,
    internal: { candidates, effects, rejected },
  };
}
