import type { ProtectedContext } from '../../domain/records/categories';
import type { CandidateAction, StateAssessment } from '../../intelligence/types';
import type { CommandCoreInput } from '../boundary';
import { arbitrate, type ArbitrationResult } from '../arbitration/arbitrate';

/**
 * Full recomputation after a new constraint (Phase 8 deliverable 21).
 *
 * ## Why this re-runs everything rather than picking the runner-up
 *
 * "Can't now" is new evidence, not a veto on one row. The obvious implementation — drop
 * the winner and show whoever came second — is wrong in a way that takes months to notice:
 * the second-place candidate was ranked under the old constraints, and the constraint that
 * just arrived may rule it out too, or may promote something that had been ranked fifth.
 *
 * So the whole arbitration runs again against the updated state. That is affordable
 * because every stage is a pure function of records and an instant, which is a property
 * the engine has had since Phase 4 and this is the first thing to genuinely need.
 *
 * ## Proportionate adaptation, not cancellation
 *
 * > including proportionate adaptation to pain or symptoms rather than automatic
 * > cancellation
 *
 * A new physical constraint lowers the ceiling; it does not empty the day. The state
 * assessment already expresses capacity as a band, and `selectOutput` already treats a low
 * band as a **duration ceiling** rather than as a blanket refusal — so a recompute under
 * pain returns the ten-minute version of something rather than silence, whenever a
 * ten-minute version exists. This function's job is to make sure that recompute actually
 * happens.
 */

export type CantNowReason =
  | { readonly kind: 'protected-context'; readonly context: ProtectedContext }
  | { readonly kind: 'no-time'; readonly minutesFree: number }
  | { readonly kind: 'capacity'; readonly capacity: 'depleted' | 'low' }
  | { readonly kind: 'not-now' };

export interface RecomputeResult extends ArbitrationResult {
  /** What the owner declined, so the trace can say it was not ranked away. */
  readonly declined: string;
  /** True when the answer genuinely moved rather than repeating itself. */
  readonly changed: boolean;
  readonly note: string;
}

/**
 * Applies the constraint to the state, then arbitrates again from scratch.
 *
 * The declined candidate is excluded by id — that is the one thing carried over, because
 * offering back the thing somebody just declined is the single most irritating behaviour a
 * recommender can have.
 */
export function recomputeAfterCantNow(
  input: CommandCoreInput,
  declined: CandidateAction,
  reason: CantNowReason,
): RecomputeResult {
  const state: StateAssessment = applyConstraint(input.state, reason);

  const withoutDeclined: CommandCoreInput = {
    ...input,
    state,
    coreCandidates: input.coreCandidates.filter((candidate) => candidate.id !== declined.id),
    submissions: input.submissions.map((submission) =>
      submission.candidate?.id === declined.id
        ? { ...submission, candidate: undefined }
        : submission,
    ),
  };

  const result = arbitrate(withoutDeclined);
  const nowShowing = result.output.kind === 'action' ? result.output.candidate.id : undefined;

  return {
    ...result,
    declined: declined.id,
    changed: nowShowing !== declined.id,
    note:
      result.output.kind === 'action'
        ? 'Recomputed from the start under the new constraint, not the next one down the old list.'
        : reason.kind === 'capacity'
          ? 'Nothing small enough survived the lowered ceiling. That is a ceiling, not a cancellation — the shorter version will be offered when one exists.'
          : 'Nothing else survived the new constraint. Silence is the honest answer rather than the next-best guess.',
  };
}

/**
 * Folds the declared constraint into the state.
 *
 * Only the fields the constraint genuinely speaks to are touched. A "no time" answer says
 * nothing about capacity, and inferring one from the other would manufacture evidence the
 * owner did not give.
 */
function applyConstraint(state: StateAssessment, reason: CantNowReason): StateAssessment {
  switch (reason.kind) {
    case 'protected-context':
      return state.protectedContexts.includes(reason.context)
        ? state
        : { ...state, protectedContexts: [...state.protectedContexts, reason.context] };

    case 'no-time':
      return {
        ...state,
        availableMinutes: { status: 'known', value: reason.minutesFree },
      };

    case 'capacity':
      return { ...state, capacity: { status: 'known', value: reason.capacity } };

    case 'not-now':
      return state;
  }
}
