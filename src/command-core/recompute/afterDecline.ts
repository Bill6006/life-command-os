import type { CandidateAction } from '../../intelligence/types';

/**
 * What a recomputation after `Can't now` is not allowed to come back with
 * (`V33-027`, clarifications 5, 7 and 8).
 *
 * `recomputeAfterCantNow` already re-runs the whole arbitration rather than picking the
 * runner-up, which is the hard part and was built in Phase 8. What it could not see is
 * that a *technically different* candidate can still be the same answer wearing a hat:
 *
 *   - the same move with the duration halved, which reads as haggling;
 *   - a near-identical statement from the same generator;
 *   - another move from the domain the owner just refused.
 *
 * All three make the app feel like it is negotiating rather than listening, and all three
 * are ranked perfectly legitimately by an arbiter that only compares merit. The filter has
 * to be applied to the *result*, against what was declined, which is what this does.
 *
 * ## Why "nothing further" is a first-class outcome
 *
 * Clarification 7. If nothing credibly beats continuing, resting, or waiting, the app stops
 * recommending. A manufactured micro-action is worse than silence: it spends the owner's
 * trust to fill a slot, and it teaches the app that trivial moves get completed.
 *
 * Clarification 8 is the reason that is not laziness. What is being optimised is North Star
 * progress per unit of real capacity, not the number of moves closed. One strong move, a
 * continuation, or a deliberate stop can all beat three small ones, and only a system that
 * is allowed to return nothing can ever choose the last of those.
 */

/** Words that carry no meaning when comparing two statements for sameness. */
const NOISE = new Set([
  'a',
  'an',
  'the',
  'to',
  'of',
  'for',
  'and',
  'or',
  'in',
  'on',
  'at',
  'with',
  'your',
  'you',
  'is',
  'it',
  'this',
  'that',
  'do',
  'go',
  'get',
  'some',
  'one',
  'today',
  'now',
  'minutes',
  'minute',
  'min',
]);

function meaningfulWords(statement: string): ReadonlySet<string> {
  return new Set(
    statement
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !NOISE.has(word)),
  );
}

/**
 * How much two statements overlap, 0 to 1.
 *
 * Jaccard over meaningful words. Crude on purpose: anything cleverer would need a model,
 * and the thing being caught here — "Take a 20 minute walk" against "Take a 10 minute
 * walk" — does not need one.
 */
export function statementOverlap(left: string, right: string): number {
  const a = meaningfulWords(left);
  const b = meaningfulWords(right);
  if (a.size === 0 || b.size === 0) return 0;

  let shared = 0;
  for (const word of a) if (b.has(word)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/** Above this, two statements are the same suggestion reworded. */
export const NEAR_DUPLICATE_THRESHOLD = 0.6;

export interface RejectedReplacement {
  readonly rejected: true;
  readonly because: string;
}

export type ReplacementVerdict = { readonly rejected: false } | RejectedReplacement;

/**
 * Whether a proposed replacement is genuinely a different answer.
 *
 * Order matters: the shrunk-duration check runs before the wording check, because a
 * shortened version of the same move is the most tempting wrong answer and deserves to be
 * named as such in the trace rather than filed under "too similar".
 */
export function judgeReplacement(
  declined: CandidateAction,
  replacement: CandidateAction,
): ReplacementVerdict {
  if (replacement.id === declined.id) {
    return { rejected: true, because: 'The same move the owner just declined' };
  }

  const overlap = statementOverlap(declined.statement, replacement.statement);

  if (overlap >= NEAR_DUPLICATE_THRESHOLD) {
    return replacement.durationMinutes < declined.durationMinutes
      ? {
          rejected: true,
          because: 'The same move, shortened. Declining is not an invitation to haggle',
        }
      : { rejected: true, because: 'Too close to the move just declined to be a real answer' };
  }

  if (
    replacement.originDomainId !== undefined &&
    replacement.originDomainId === declined.originDomainId
  ) {
    return {
      rejected: true,
      because: 'Still the area the owner just stepped away from — the rerank has to leave it',
    };
  }

  return { rejected: false };
}

/**
 * The first replacement that is a real answer, or nothing.
 *
 * Returning `undefined` is a result, not a failure. It is how "nothing else credibly beats
 * carrying on" reaches the surface, and the surface is required to say so plainly rather
 * than reaching for filler.
 */
export function firstRealAlternative(
  declined: CandidateAction,
  ranked: readonly CandidateAction[],
): { readonly candidate: CandidateAction | undefined; readonly rejected: readonly string[] } {
  const rejected: string[] = [];

  for (const candidate of ranked) {
    const verdict = judgeReplacement(declined, candidate);
    if (!verdict.rejected) return { candidate, rejected };
    rejected.push(`${candidate.id}: ${verdict.because}`);
  }

  return { candidate: undefined, rejected };
}
