import type {
  CanonicalRecord,
  DomainPreferenceRecord,
  DomainState,
} from '../../domain/records';
import {
  DOMAIN_LIST,
  type DomainDefinition,
  type DomainId,
} from '../../domain/domains/definitions';
import { currentOfType } from '../support';

/**
 * Resolving which domains are on (Prompt 8A task 1).
 *
 * Definitions are code; enablement is the owner's data. This module joins the two and
 * is the only place that decides whether a domain is active.
 *
 * **Every domain is off until the owner turns it on**, and no slice exists yet to turn
 * on. That is not a placeholder — it is what "shared domain framework, without
 * implementing the full content of several domains" means. `Direction` shows exactly
 * what it showed before this file existed, and every gate about compactness and score
 * walls holds trivially because there is nothing new on screen.
 *
 * Note what is **not** here: no domain store, no per-domain query, no cache. A domain
 * reads the same canonical records as everything else, filtered by category.
 */

export interface ResolvedDomain {
  readonly definition: DomainDefinition;
  readonly state: DomainState;
  /** The record that set it, when the owner has expressed a preference. */
  readonly setBy: string | undefined;
  readonly reason: string | undefined;
}

/** Off unless the owner says otherwise. */
export const DEFAULT_DOMAIN_STATE: DomainState = 'disabled';

/**
 * The current state of every approved domain.
 *
 * Supersession is resolved first, so an old preference cannot outvote a newer one, and
 * the superseded records stay in storage — turning a domain off never erases the
 * history of it having been on.
 */
export function resolveDomains(records: readonly CanonicalRecord[]): ResolvedDomain[] {
  const preferences = currentOfType<DomainPreferenceRecord>(records, 'domain-preference');

  const newest = new Map<DomainId, DomainPreferenceRecord>();
  for (const preference of preferences) {
    const existing = newest.get(preference.domainId);
    if (existing === undefined || preference.recordedAt > existing.recordedAt) {
      newest.set(preference.domainId, preference);
    }
  }

  return DOMAIN_LIST.map((definition) => {
    const preference = newest.get(definition.id);
    return {
      definition,
      state: preference?.state ?? DEFAULT_DOMAIN_STATE,
      setBy: preference?.recordId,
      reason: preference?.reason,
    };
  });
}

/** Domains that may generate a candidate and show a panel. */
export function enabledDomains(records: readonly CanonicalRecord[]): ResolvedDomain[] {
  return resolveDomains(records).filter((domain) => domain.state === 'enabled');
}

/**
 * Domains that may show a panel but must stay silent.
 *
 * Deprioritised is the useful middle: an area that matters and is not the current
 * focus. It is readable and it never interrupts (`OWN-008`).
 */
export function visibleDomains(records: readonly CanonicalRecord[]): ResolvedDomain[] {
  return resolveDomains(records).filter((domain) => domain.state !== 'disabled');
}

export function domainState(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
): DomainState {
  return (
    resolveDomains(records).find((domain) => domain.definition.id === domainId)?.state ??
    DEFAULT_DOMAIN_STATE
  );
}

/** True when a domain may put a candidate into the global comparison. */
export function mayGenerateCandidate(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
): boolean {
  return domainState(records, domainId) === 'enabled';
}
