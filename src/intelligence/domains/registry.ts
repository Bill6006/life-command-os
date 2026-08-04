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
import { isImplemented } from '../../domain/domains/availability';
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
  /**
   * Whether a slice exists behind this domain.
   *
   * Kept beside the state rather than folded into it, because the two say different
   * things: `state` is what the owner asked for and belongs to them, `available` is
   * what this build can honour. A preference for an unbuilt area — from an older
   * backup, or a record written by hand — stays exactly as the owner wrote it and is
   * simply not acted on.
   */
  readonly available: boolean;
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
      available: isImplemented(definition),
    };
  });
}

/**
 * Domains that may generate a candidate and show a panel.
 *
 * Availability is checked here rather than only at the control that writes the
 * preference, so a record saying an unbuilt area is on — restored from a backup taken
 * by a later build, say — cannot put an empty panel on screen.
 */
export function enabledDomains(records: readonly CanonicalRecord[]): ResolvedDomain[] {
  return resolveDomains(records).filter(
    (domain) => domain.available && domain.state === 'enabled',
  );
}

/**
 * Domains that may show a panel but must stay silent.
 *
 * Deprioritised is the useful middle: an area that matters and is not the current
 * focus. It is readable and it never interrupts (`OWN-008`).
 */
export function visibleDomains(records: readonly CanonicalRecord[]): ResolvedDomain[] {
  return resolveDomains(records).filter(
    (domain) => domain.available && domain.state !== 'disabled',
  );
}

/** What the owner asked for, whether or not this build can honour it. */
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
  return enabledDomains(records).some((domain) => domain.definition.id === domainId);
}
