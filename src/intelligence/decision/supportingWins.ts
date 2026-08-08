import type { CandidateAction, StateAssessment } from '../types';

/**
 * Supporting minimum wins (`V33-020`, v3.3 B3).
 *
 * ## What this is not allowed to become
 *
 * A task list. Now emits one answer, and the whole product rests on that — a ranked column
 * of six things is the thing every other planner already is, and the reason none of them
 * help. So this returns **zero to three**, it never competes with the primary move for
 * emphasis, and returning nothing is the normal case rather than a failure.
 *
 * ## What earns a place
 *
 * Three tests, all of which must pass:
 *
 *   1. **It is genuinely small.** A supporting win is something that fits in the gaps
 *      around the real move. Anything with a meaningful minimum is not a supporting win,
 *      it is a second recommendation wearing a smaller label.
 *   2. **It is not the same ground as the primary.** Another move from the same area is
 *      almost always a variation on the thing already being suggested, and showing both
 *      makes the primary look negotiable.
 *   3. **It costs nothing to skip.** Anything with real friction, real risk, or anything
 *      irreversible cannot be offered as an aside — an aside is read as optional, and
 *      those three are exactly the things that must not be.
 *
 * The result is that a sparse profile shows none, a rich one shows one or two, and three
 * is the ceiling rather than the target.
 */

/** Above this, a move is a recommendation rather than something you fit around one. */
export const SUPPORTING_MAX_MINUTES = 10;

/** The ceiling. Not a quota — most days should be under it, and zero is fine. */
export const MAX_SUPPORTING_WINS = 3;

export interface SupportingWin {
  readonly id: string;
  /** The minimum version, because that is what is being offered. */
  readonly statement: string;
  readonly minutes: number;
}

export function supportingWins(
  primary: CandidateAction | undefined,
  eligible: readonly CandidateAction[],
  state: StateAssessment,
): readonly SupportingWin[] {
  if (primary === undefined) return [];

  /*
   * Nothing extra when capacity is already spent. Offering a depleted owner three more
   * things is the pestering this product exists not to do, and the primary move is
   * already the most that should be asked.
   */
  const capacity = state.capacity.status === 'known' ? state.capacity.value : undefined;
  if (capacity === 'depleted' || capacity === 'low') return [];

  const wins: SupportingWin[] = [];

  for (const candidate of eligible) {
    if (wins.length >= MAX_SUPPORTING_WINS) break;
    if (candidate.id === primary.id) continue;

    /* Same area as the primary: a variation on what is already being suggested. */
    if (
      candidate.originDomainId !== undefined &&
      candidate.originDomainId === primary.originDomainId
    ) {
      continue;
    }

    if (candidate.minimumMinutes > SUPPORTING_MAX_MINUTES) continue;
    if (candidate.friction !== 'low') continue;
    if (candidate.risk !== 'none-identified') continue;
    if (candidate.reversibility !== 'reversible') continue;

    wins.push({
      id: candidate.id,
      statement: candidate.minimumVersion,
      minutes: candidate.minimumMinutes,
    });
  }

  return wins;
}
