import type { CandidateAction, RejectedCandidate } from '../../intelligence/types';

/**
 * Candidate and prompt deduplication (Phase 8 deliverable 3).
 *
 * ## The failure this prevents
 *
 * Seven domains reason independently, which is the point — and it means two of them can
 * legitimately arrive at the same move. Health offers ten minutes of breathing to restore
 * regulation; emotional offers the same ten minutes to steady before a difficult
 * conversation. Both are right. Showing them as two candidates would make the comparison
 * meaningless, and showing one while silently discarding the other would lose the fact
 * that two areas of life wanted it.
 *
 * So equivalent candidates **merge**: one survives, and it carries the reasons both gave.
 * The gate wording is "equivalent candidates merge", not "duplicates are removed", and the
 * difference is exactly this — a merged candidate is stronger evidence than either was
 * alone, and the trace says so.
 *
 * ## What counts as equivalent
 *
 * Same intended outcome, same follow-up prompt, **and different origins**.
 *
 * The first two say "these would be satisfied by the same event", which is the only
 * definition that survives contact with seven independent vocabularies — the statements
 * will differ, and the ids are namespaced so they can never collide.
 *
 * The third is the one that took a bug to find. The core engine emits one `unblock`
 * candidate per blocked commitment, and they legitimately share a generic intended outcome
 * and follow-up. Grouping on the first two alone merged two different commitments into
 * one and dropped the other from the comparison entirely — a silent loss of an open loop.
 *
 * So merging happens only when every candidate in a group came from a **different**
 * generator. Within one generator, the generator already decided these are distinct
 * subjects, and it is in a far better position to know than this function is. Two core
 * candidates therefore never merge with each other, and a group with any repeated origin
 * is left intact rather than guessed at.
 */

export interface DedupeResult {
  readonly merged: readonly CandidateAction[];
  readonly rejected: readonly RejectedCandidate[];
  /** How many originals each survivor stands for. One means nothing merged. */
  readonly mergeCounts: ReadonlyMap<string, number>;
}

function equivalenceKey(candidate: CandidateAction): string {
  return `${candidate.intendedOutcome.trim().toLowerCase()}|${candidate.followUp.promptId}`;
}

/**
 * Keeps the cheaper of two equivalent candidates.
 *
 * Lower minimum first, then lower friction, then the id, so the result is deterministic
 * and the survivor is the version most likely to actually happen. A merge that kept the
 * more demanding wording would make two domains agreeing into a reason to do more.
 */
function preferable(a: CandidateAction, b: CandidateAction): CandidateAction {
  const frictionRank = { low: 0, moderate: 1, high: 2 } as const;
  if (a.minimumMinutes !== b.minimumMinutes) {
    return a.minimumMinutes < b.minimumMinutes ? a : b;
  }
  if (frictionRank[a.friction] !== frictionRank[b.friction]) {
    return frictionRank[a.friction] < frictionRank[b.friction] ? a : b;
  }
  return a.id.localeCompare(b.id) <= 0 ? a : b;
}

/** Two candidates from one generator are two subjects, not one thing said twice. */
function originsAreDistinct(group: readonly CandidateAction[]): boolean {
  const origins = group.map((candidate) => candidate.originDomainId ?? '(core)');
  return new Set(origins).size === origins.length;
}

export function dedupeCandidates(candidates: readonly CandidateAction[]): DedupeResult {
  const groups = new Map<string, CandidateAction[]>();
  for (const candidate of candidates) {
    const key = equivalenceKey(candidate);
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }

  const merged: CandidateAction[] = [];
  const rejected: RejectedCandidate[] = [];
  const mergeCounts = new Map<string, number>();

  for (const group of groups.values()) {
    const first = group[0];
    if (first === undefined) continue;

    if (group.length === 1) {
      merged.push(first);
      mergeCounts.set(first.id, 1);
      continue;
    }

    if (!originsAreDistinct(group)) {
      // Same generator, same outcome: different subjects. Every one survives.
      for (const candidate of group) {
        merged.push(candidate);
        mergeCounts.set(candidate.id, 1);
      }
      continue;
    }

    const survivor = group.reduce(preferable);
    const others = group.filter((candidate) => candidate.id !== survivor.id);

    /*
     * The survivor carries every reason. Two areas wanting the same ten minutes is a
     * better argument for those ten minutes than either area made alone, and dropping the
     * second reason would throw that away.
     */
    const withReasons: CandidateAction = {
      ...survivor,
      reason: [survivor.reason, ...others.map((candidate) => candidate.reason)].join(' · '),
    };

    merged.push(withReasons);
    mergeCounts.set(survivor.id, group.length);

    for (const other of others) {
      rejected.push({
        candidateId: other.id,
        stage: 'duplicate',
        reason: `Merged into ${survivor.id}: the same outcome, followed up the same way`,
      });
    }
  }

  return { merged, rejected, mergeCounts };
}

/**
 * Prompt deduplication.
 *
 * The same question reaching a surface twice — once because a domain declared it and once
 * because a guide already asks it — is how the legacy application became a wall of
 * checkboxes. Ownership (`XDS-014`) prevents two *surfaces* claiming a question; this
 * prevents one surface offering it twice in a single plan.
 *
 * Order is preserved, because the first appearance is the one the planner ranked.
 */
export function dedupePromptIds(promptIds: readonly string[]): readonly string[] {
  const seen = new Set<string>();
  return promptIds.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}
