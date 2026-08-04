import type { CanonicalRecord } from '../../domain/records';
import type { DomainId } from '../../domain/domains/definitions';
import type { CandidateAction } from '../types';
import { resolveDomains } from './registry';

/**
 * Manual Domain Focus — the shell (Prompt 8A task 7, `OWN-004`, `XDS-033`).
 *
 * The owner says "show me career for a minute". They get that domain's best eligible
 * move, **clearly labelled as their choice rather than the system's**, and the global
 * decision on Now does not move an inch.
 *
 * ## Why the labelling matters more than the feature
 *
 * Without it, manual focus becomes a way to make the app agree with you. Pick a
 * domain, get a recommendation, and it reads exactly like the system's judgement —
 * except the system did not judge it best, it judged it best *within a constraint you
 * imposed*. `chosenByOwner` is on the result and the interface renders it, so the
 * difference stays visible at the moment of deciding.
 *
 * ## What this is in Prompt 8A
 *
 * A shell. It resolves the domain, checks it is enabled, and returns the move a slice
 * supplied. No slice exists yet, so today it always returns `no-move-available` — and
 * that is a correct, complete answer rather than a stub.
 */

export type ManualFocusResult =
  | {
      readonly kind: 'move';
      readonly domainId: DomainId;
      readonly candidate: CandidateAction;
      /** Always true. This is the owner's constraint, not the engine's conclusion. */
      readonly chosenByOwner: true;
      readonly note: string;
    }
  | {
      readonly kind: 'no-move-available';
      readonly domainId: DomainId;
      readonly because: string;
    }
  | { readonly kind: 'domain-not-enabled'; readonly domainId: DomainId };

/**
 * The best eligible move inside one domain.
 *
 * `available` is what a slice supplies. The framework picks the first, because a
 * domain is already limited to one candidate per decision point — if a slice offers
 * several here it has misunderstood its own contract, and the limit rejects the extras
 * before they reach a person.
 */
export function focusOnDomain(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
  available: readonly CandidateAction[],
): ManualFocusResult {
  const domain = resolveDomains(records).find((entry) => entry.definition.id === domainId);

  if (domain?.state !== 'enabled') {
    return { kind: 'domain-not-enabled', domainId };
  }

  const candidate = available[0];
  if (candidate === undefined) {
    return {
      kind: 'no-move-available',
      domainId,
      because:
        'Nothing in this area is eligible right now. That is an answer, not an empty screen.',
    };
  }

  return {
    kind: 'move',
    domainId,
    candidate,
    chosenByOwner: true,
    note: `You asked for ${domain.definition.label.toLowerCase()}. This is the best move inside that area — the answer on Now is still the answer.`,
  };
}
