import { ALL_PROMPTS } from '../prompts/definitions';
import { DOMAIN_LIST, type DomainDefinition, type DomainId } from './definitions';

/**
 * Which areas the owner is allowed to switch on.
 *
 * Seven domains are defined; two have been built. Offering the other five as switchable
 * would hand the owner a control that produces a panel with a shared category summary in
 * it and nothing that understands the area — a frame that looks like a feature and
 * answers no question. The Blueprint's whole objection to the legacy app was surfaces
 * that exist before they have anything to say.
 *
 * ## Derived, never listed
 *
 * Availability is **computed from the prompt catalogue**: a domain is available when the
 * prompt that owns updating it exists. That is not a proxy — a slice's first obligation
 * is to define what its area asks, so a domain with an update prompt is a domain with a
 * slice, and a domain without one has nothing to ask and nothing to say.
 *
 * The alternative was a boolean on each definition. Two lists that must agree eventually
 * disagree, and the failure mode there is silent: an `implemented: true` left behind
 * after a revert offers the owner a switch onto an empty room. Deriving it means the
 * next slice makes its domain available by doing the work, and cannot make it available
 * any other way.
 */

/** True when this domain has a slice behind it. */
export function isImplemented(definition: DomainDefinition): boolean {
  return ALL_PROMPTS.some((prompt) => prompt.promptId === definition.updatePromptId);
}

/** The domains the owner may switch on today. */
export function implementedDomains(): readonly DomainDefinition[] {
  return DOMAIN_LIST.filter(isImplemented);
}

/** The domains that are defined, named, and not yet built. */
export function unimplementedDomains(): readonly DomainDefinition[] {
  return DOMAIN_LIST.filter((definition) => !isImplemented(definition));
}

export function isImplementedId(domainId: DomainId): boolean {
  return implementedDomains().some((definition) => definition.id === domainId);
}
