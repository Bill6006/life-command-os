import type { CanonicalRecord, ExecutionRecord, OutcomeRecord } from '../../domain/records';
import { currentOfType } from '../support';

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

/** How long after an execution its effect is considered observable. */
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

  return executions
    .map((execution) => {
      const opens = Date.parse(execution.occurredAt);
      const closes = opens + OUTCOME_WINDOW_MS;
      const outcome = outcomes.find(
        (candidate) => candidate.executionRecordId === execution.recordId,
      );

      const state: WindowState =
        now.getTime() < closes
          ? 'open'
          : outcome === undefined && now.getTime() > opens + OUTCOME_EXPIRY_MS
            ? 'expired'
            : 'closed';

      const overlapping = executions
        .filter(
          (other) =>
            other.recordId !== execution.recordId &&
            Math.abs(Date.parse(other.occurredAt) - opens) < OUTCOME_WINDOW_MS,
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
