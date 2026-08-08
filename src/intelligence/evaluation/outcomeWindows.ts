import type { CanonicalRecord, ExecutionRecord, OutcomeRecord } from '../../domain/records';
import { currentOfType } from '../support';
import { horizonFor } from '../../domain/moves/horizons';

/**
 * Outcome windows and what closes them (Prompt 6 task 2).
 *
 * An execution opens a window. The window closes at a fixed horizon, and **only
 * then** can anything be evaluated. Before that, the honest answer is `unresolved` —
 * not "no effect", not "pending success".
 *
 * This module answers one question and refuses to answer others: has enough time
 * passed, and is there an observation covering it? Whether the outcome was good is
 * somebody else's job.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The horizon for a move with no declared observation window.
 *
 * Retained as the fallback rather than removed: an execution recorded before per-move
 * horizons existed must not have its window move because the code changed.
 */
export const OUTCOME_WINDOW_MS = 7 * DAY_MS;

/** Beyond this, a window that never received an outcome is expired rather than open. */
export const OUTCOME_EXPIRY_MS = 21 * DAY_MS;

export type WindowState = 'open' | 'closed' | 'expired';

export interface OutcomeWindow {
  readonly executionRecordId: string;
  readonly recommendationRecordId: string;
  readonly executionState: ExecutionRecord['state'];
  readonly opensAt: string;
  readonly closesAt: string;
  readonly state: WindowState;
  readonly outcome: OutcomeRecord | undefined;
  /** Other executions inside the same window — the raw material for confounding. */
  readonly overlappingExecutionIds: readonly string[];
}

export function outcomeWindows(
  records: readonly CanonicalRecord[],
  now: Date,
): OutcomeWindow[] {
  const executions = currentOfType<ExecutionRecord>(records, 'execution');
  const outcomes = currentOfType<OutcomeRecord>(records, 'outcome');

  /*
   * Which move each execution was of, so its own declared horizon can be used
   * (`V33-062`, G3). Indexed once — the join would otherwise be quadratic in a record
   * set that only grows.
   */
  const patternByEpisode = new Map<string, string>();
  for (const record of records) {
    if (record.recordType !== 'candidate-action') continue;
    if (record.decisionEpisodeId === undefined) continue;
    if (record.engineCandidateId === undefined) continue;
    patternByEpisode.set(record.decisionEpisodeId, record.engineCandidateId);
  }

  return executions
    .map((execution) => {
      const opens = Date.parse(execution.occurredAt);

      /*
       * The move's own window, not one constant for everything. A glass of water and a
       * change of routine are not answerable on the same clock, and judging both at seven
       * days got each of them wrong in opposite directions.
       */
      const horizon = horizonFor(
        execution.decisionEpisodeId === undefined
          ? undefined
          : patternByEpisode.get(execution.decisionEpisodeId),
      );
      const closes = opens + horizon.closesAfterMs;
      const outcome = outcomes.find(
        (candidate) => candidate.executionRecordId === execution.recordId,
      );

      const state: WindowState =
        now.getTime() < closes
          ? 'open'
          : outcome === undefined && now.getTime() > opens + horizon.expiresAfterMs
            ? 'expired'
            : 'closed';

      /*
       * Confounding is judged on this move's own window too: something that happened two
       * days later cannot have confounded a thirty-minute effect.
       */
      const overlapping = executions
        .filter(
          (other) =>
            other.recordId !== execution.recordId &&
            Math.abs(Date.parse(other.occurredAt) - opens) < horizon.closesAfterMs,
        )
        .map((other) => other.recordId);

      return {
        executionRecordId: execution.recordId,
        recommendationRecordId: execution.recommendationRecordId,
        executionState: execution.state,
        opensAt: execution.occurredAt,
        closesAt: new Date(closes).toISOString(),
        state,
        outcome,
        overlappingExecutionIds: overlapping,
      };
    })
    .sort((a, b) => a.opensAt.localeCompare(b.opensAt));
}
