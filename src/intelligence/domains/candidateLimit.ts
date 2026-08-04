import type { DomainId } from '../../domain/domains/definitions';
import type { CandidateAction } from '../types';

/**
 * Zero or one candidate per domain, per decision point (Prompt 8A task 4, `XDS-015`).
 *
 * ## Why this is a hard limit rather than a ranking rule
 *
 * Seven domains each offering "just their best two" is fourteen candidates, and
 * fourteen candidates is a menu however carefully the interface hides thirteen of
 * them. The one-output rule (`PROD-005`) survives at the surface only if the pressure
 * on it is removed further back — so a domain does its own choosing, in its own terms,
 * and brings one thing to the comparison.
 *
 * It also forces each domain slice to answer a question it would otherwise dodge:
 * *given everything you know about this area right now, what is the single move?* A
 * domain that cannot answer that has not understood its own job.
 *
 * ## Rejection is loud
 *
 * A second candidate is dropped and **reported**, not silently ignored. A domain
 * quietly losing half its output would look like a domain with nothing to say, which
 * is the hardest kind of bug to notice.
 */

export interface RejectedByLimit {
  readonly domainId: DomainId;
  readonly candidateId: string;
  readonly because: string;
}

export interface LimitResult {
  readonly accepted: readonly CandidateAction[];
  readonly rejected: readonly RejectedByLimit[];
}

/**
 * Keeps the first candidate each domain offers and rejects the rest.
 *
 * "First" is deterministic because candidate generation is: the same records at the
 * same instant produce the same order. A domain that wants a different one should
 * offer a different one, not rely on ordering — which is precisely the discipline the
 * limit is there to impose.
 *
 * Candidates with no origin domain — the core engine's own — pass through untouched.
 * The domain limit is about domains.
 */
export function enforceOneCandidatePerDomain(
  candidates: readonly (CandidateAction & { readonly originDomainId?: DomainId | undefined })[],
): LimitResult {
  const seen = new Set<DomainId>();
  const accepted: CandidateAction[] = [];
  const rejected: RejectedByLimit[] = [];

  for (const candidate of candidates) {
    const domainId = candidate.originDomainId;
    if (domainId === undefined) {
      accepted.push(candidate);
      continue;
    }
    if (seen.has(domainId)) {
      rejected.push({
        domainId,
        candidateId: candidate.id,
        because:
          'A domain may offer one candidate per decision point. This one was not compared.',
      });
      continue;
    }
    seen.add(domainId);
    accepted.push(candidate);
  }

  return { accepted, rejected };
}

/**
 * True when this set already violates the limit.
 *
 * Used by validation rather than by the pipeline: the pipeline enforces, this reports.
 * A domain slice under development should fail a test rather than have its second
 * candidate quietly removed at runtime and never notice (`AT-016`).
 */
export function violatesOneCandidateLimit(
  candidates: readonly { readonly originDomainId?: DomainId | undefined }[],
): boolean {
  const seen = new Set<DomainId>();
  for (const candidate of candidates) {
    const domainId = candidate.originDomainId;
    if (domainId === undefined) continue;
    if (seen.has(domainId)) return true;
    seen.add(domainId);
  }
  return false;
}
