import type { CanonicalRecord, WeeklyDirectionRecord } from '../../domain/records';
import { currentOfType, openCommitments, shortLabel } from '../support';
import type { EffectivenessEvaluation } from '../evaluation/evaluate';

/**
 * Weekly-direction continuity (Prompt 6 task 12).
 *
 * Compares what was proposed last week with what actually happened, and decides
 * whether to carry it forward, adjust it, abandon it, or go deliberately quiet.
 *
 * **Nothing here scores the week morally.** A direction that was not followed is
 * information about the direction — it was probably wrong about the week — not a
 * verdict on the person. The vocabulary is deliberately flat: *carried forward*,
 * *adjusted*, *abandoned*, *quiet*. There is no "missed", no "failed", no
 * "completion rate".
 *
 * Why the direction changed is always preserved, because a direction that silently
 * mutates week to week teaches the user nothing.
 */

export type ContinuityDecision =
  'carry-forward' | 'adjust' | 'abandon' | 'quiet' | 'first-week';

export interface WeeklyContinuity {
  readonly decision: ContinuityDecision;
  readonly previousProposal: string | undefined;
  readonly previousResponse: string;
  readonly whatHappened: string;
  readonly whyItChanged: string;
  readonly carriedForward: boolean;
}

export function assessWeeklyContinuity(
  records: readonly CanonicalRecord[],
  evaluations: readonly EffectivenessEvaluation[],
): WeeklyContinuity {
  const directions = currentOfType<WeeklyDirectionRecord>(records, 'weekly-direction').sort(
    (a, b) => a.occurredAt.localeCompare(b.occurredAt),
  );
  const previous = directions[directions.length - 1];

  if (previous === undefined) {
    return {
      decision: 'first-week',
      previousProposal: undefined,
      previousResponse: 'No previous direction recorded',
      whatHappened: 'There is no earlier week to compare against.',
      whyItChanged: 'This is the first weekly direction.',
      carriedForward: false,
    };
  }

  const proposal =
    previous.proposal.kind === 'focus'
      ? previous.proposal.statement
      : 'A deliberately quiet week';

  const response =
    previous.userResponse.status === 'known'
      ? previous.userResponse.value.response
      : previous.userResponse.status === 'unresolved'
        ? 'never answered'
        : previous.userResponse.status;

  const resolved = evaluations.filter((evaluation) => evaluation.verdict !== 'unresolved');
  const executed = evaluations.filter(
    (evaluation) =>
      evaluation.executionState === 'executed' ||
      evaluation.executionState === 'partially-executed',
  );
  const supported = resolved.filter(
    (evaluation) =>
      evaluation.verdict === 'supported' || evaluation.verdict === 'partially-supported',
  );
  const stillOpen = openCommitments(records).length;

  const whatHappened =
    executed.length === 0
      ? 'Nothing proposed under it was carried out.'
      : `${String(executed.length)} action${executed.length === 1 ? '' : 's'} carried out, ${String(supported.length)} associated with a better outcome. ${String(stillOpen)} loops still open.`;

  // Never answered and never acted on: the proposal did not fit the week.
  if (response === 'never answered' && executed.length === 0) {
    return {
      decision: 'quiet',
      previousProposal: proposal,
      previousResponse: response,
      whatHappened,
      whyItChanged:
        'It was neither confirmed nor acted on, which usually means it did not fit the week. Proposing a quiet week rather than repeating it.',
      carriedForward: false,
    };
  }

  if (response === 'rejected') {
    return {
      decision: 'abandon',
      previousProposal: proposal,
      previousResponse: response,
      whatHappened,
      whyItChanged: 'You rejected it, so it is dropped rather than carried forward.',
      carriedForward: false,
    };
  }

  if (executed.length > 0 && supported.length === 0) {
    return {
      decision: 'adjust',
      previousProposal: proposal,
      previousResponse: response,
      whatHappened,
      whyItChanged:
        'It was acted on but nothing improved. Adjusting the direction rather than asking for more of the same.',
      carriedForward: false,
    };
  }

  return {
    decision: 'carry-forward',
    previousProposal: proposal,
    previousResponse: response,
    whatHappened,
    whyItChanged: `Carried forward from the week of ${shortLabel(previous.weekWindow.start)} — it was acted on and the outcomes were consistent with it.`,
    carriedForward: true,
  };
}
