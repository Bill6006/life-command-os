import { contradicts } from '../../domain/moves/registry';
import type { CandidateAction, RejectedCandidate } from '../../intelligence/types';

/**
 * Resolving contradictions during arbitration (`V33-045`, v3.3 section D4).
 *
 * ## What a contradiction is, and is not
 *
 * Two moves contradict when both are defensible and only one can be right in this moment.
 * "Stop for tonight, protect sleep" and "take twenty minutes on the thing that is stalled"
 * are each a reasonable answer at ten in the evening; offering both is not richness, it is
 * the app declining to decide and handing the decision back.
 *
 * It is **not** a permanent incompatibility. Nothing here writes anything down, and nothing
 * removes a pattern from the catalogue. The move that loses tonight competes again
 * tomorrow morning against a different situation, which is the whole difference between an
 * arbitration rule and a blacklist.
 *
 * ## How the winner is chosen
 *
 * Not by a score. Ranking has already happened by the time this runs — the candidates
 * arrive in order — so the first one is, by the arbiter's own reckoning, the better answer.
 * The job here is to remove what cannot coexist with it and to say why, so the trace can
 * show that the alternative was *beaten* rather than never considered.
 *
 * Deliberately rule-based: with sparse evidence, "the higher-ranked one wins and the
 * conflict is recorded" is honest, and an invented tie-break number would not be.
 */

export interface ContradictionResult {
  /** The candidates that survive, in the order they arrived. */
  readonly kept: readonly CandidateAction[];
  /** What was removed, for the internal audit trail. Never surfaced. */
  readonly rejected: readonly RejectedCandidate[];
}

/**
 * Removes anything that contradicts a higher-ranked survivor.
 *
 * Order is the input's own: the caller has already ranked, and re-ranking here would be a
 * second opinion competing with the first.
 */
export function resolveContradictions(ranked: readonly CandidateAction[]): ContradictionResult {
  const kept: CandidateAction[] = [];
  const rejected: RejectedCandidate[] = [];

  for (const candidate of ranked) {
    const clash = kept.find((survivor) => contradicts(survivor.id, candidate.id));
    if (clash !== undefined) {
      rejected.push({
        candidateId: candidate.id,
        stage: 'comparison',
        reason: `Cannot hold at the same time as ${clash.statement}, which ranked above it`,
      });
      continue;
    }
    kept.push(candidate);
  }

  return { kept, rejected };
}

/**
 * Whether a move the owner just completed rules out one being considered now.
 *
 * The other half of D4. Having *done* the thing that contradicts a candidate is stronger
 * evidence than having merely been offered it: someone who has just wound down for the
 * night should not then be offered a focus block, and the arbiter would otherwise have no
 * way to know, because the wind-down is no longer a candidate — it is history.
 *
 * Scoped to the recent past for the same reason the whole rule is contextual. A move
 * completed this morning says nothing about this evening.
 */
export const RECENTLY_COMPLETED_MS = 4 * 60 * 60 * 1000;

export function ruledOutByRecentAction(
  candidateId: string,
  recentlyCompleted: readonly { readonly engineCandidateId: string; readonly at: string }[],
  now: Date,
): string | undefined {
  const floor = now.getTime() - RECENTLY_COMPLETED_MS;

  for (const done of recentlyCompleted) {
    const at = Date.parse(done.at);
    if (Number.isNaN(at) || at < floor) continue;
    if (contradicts(done.engineCandidateId, candidateId)) {
      return 'You have already done something this would undo';
    }
  }
  return undefined;
}
