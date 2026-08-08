import type { CanonicalRecord } from '../../domain/records';
import { canonicalPatternId } from '../../domain/moves/registry';
import type { CompletedMove } from './catalogueEligibility';

/**
 * What the owner has actually done, in catalogue terms (`V33-055`, v3.3 section D).
 *
 * ## Why this is not simply a list of executions
 *
 * An execution record says *that* something was carried out; it does not say *what move it
 * was*. The identity lives on the `candidate-action` record written in the same
 * transaction, under `engineCandidateId` — the generator's own id, like `health:pause`.
 *
 * That id is not the catalogue's. Evidence has been accruing against generator ids since
 * Phase 7, and the rename to canonical pattern ids happened later, so resolving through
 * `canonicalPatternId` is what lets a move completed under the old name suppress and
 * unlock the right things under the new one. Without it every prerequisite and every
 * contradiction check would silently see an empty history.
 *
 * ## Only what was done
 *
 * Declines are deliberately not here. `activeDeclines` handles those, and it treats them
 * as facts about the next hour rather than about the move — which is the distinction the
 * whole sovereignty model rests on. A decline that leaked into this list would read as
 * "you have just done this", which is the opposite of what happened.
 */
export function completedMoves(records: readonly CanonicalRecord[]): readonly CompletedMove[] {
  /*
   * Indexed once. The join runs for every execution, and a nested scan over the full
   * history would make this quadratic in the size of a record set that only ever grows.
   */
  const byEpisode = new Map<string, string>();
  for (const record of records) {
    if (record.recordType !== 'candidate-action') continue;
    if (record.decisionEpisodeId === undefined) continue;
    if (record.engineCandidateId === undefined) continue;
    byEpisode.set(record.decisionEpisodeId, record.engineCandidateId);
  }

  const done: CompletedMove[] = [];

  for (const record of records) {
    if (record.recordType !== 'execution') continue;
    if (record.state !== 'executed') continue;
    if (record.decisionEpisodeId === undefined) continue;

    const engineCandidateId = byEpisode.get(record.decisionEpisodeId);
    if (engineCandidateId === undefined) continue;

    /*
     * When it happened, not when it was written down. Someone recording last night's
     * wind-down over breakfast has not just wound down, and the four-hour windows this
     * feeds would otherwise silence the whole morning.
     */
    const at = record.executedWindow?.start ?? record.recordedAt;
    done.push({ patternId: canonicalPatternId(engineCandidateId), at });
  }

  return done;
}
