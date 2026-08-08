import type { CapabilityEffect } from '../capabilities';
import type { CapacityProfile } from '../domains/capacity';
import { pattern } from './registry';

/**
 * Deriving a domain's action list from the catalogue (`V33-047`, v3.3 section D).
 *
 * ## What this replaces
 *
 * Each domain used to own a small hand-written list of actions, and each generator read
 * its own. That was seven authored move systems, and the catalogue would have been an
 * eighth if the lists had simply been left alongside it.
 *
 * A domain's list is now a **view over the catalogue**: it names which patterns it may
 * offer and, where its own sentence was better than the generic one, keeps that sentence.
 * There is no independent authoring left in it. Adding a move to a domain means adding a
 * pattern to the catalogue and naming it here — there is no other route, and
 * `moveReachability.test.ts` fails if one appears.
 *
 * ## Why wording may be overridden but identity may not
 *
 * "Worth mentioning to your health visitor or GP at the next opportunity" is better than
 * "Worth mentioning at the next appointment you already have" for a father with a small
 * child, because it names the person he would actually speak to. Losing that to a
 * migration would be a real loss.
 *
 * But it is the *same move*, and the evidence recorded against it has to stay attached to
 * one identity. So the override is presentation only: `patternId` comes from the
 * catalogue and cannot be set here. The type enforces it — there is no field for it.
 */

export interface DomainMoveView<LocalId extends string = string> {
  /** Canonical. Comes from the catalogue and is never overridden. */
  readonly patternId: string;
  /**
   * The id the domain has always used for this move.
   *
   * Generic so a domain keeps its own literal union — `HealthActionId` stays exactly as
   * narrow as it was, and a typo in a selection is still a compile error.
   */
  readonly id: LocalId;
  readonly statement: string;
  readonly intendedOutcome: string;
  readonly followUp: { readonly promptId: string; readonly windowHours: number };
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly minimumVersion: string;
  readonly fallback: string;
  readonly stoppingPoint: string;
  readonly friction: 'low' | 'moderate' | 'high';
  readonly capabilityEffects: readonly CapabilityEffect[];
  readonly capacity?: CapacityProfile | undefined;
}

/**
 * What a domain may change about a catalogue pattern.
 *
 * Deliberately narrow. Wording the owner reads, and the follow-up where the domain has a
 * more specific observable question than the generic one. Everything that decides
 * *whether* a move is offered — duration, shape, friction, safety, lifecycle — comes from
 * the catalogue, because those are the fields ranking reads and a domain quietly
 * disagreeing with the catalogue about them is the fragmentation this replaced.
 */
export interface WordingOverride {
  readonly statement?: string | undefined;
  readonly intendedOutcome?: string | undefined;
  readonly minimumVersion?: string | undefined;
  readonly fallback?: string | undefined;
  readonly stoppingPoint?: string | undefined;
  readonly followUp?: { readonly promptId: string; readonly windowHours: number } | undefined;
}

/**
 * One catalogue pattern, as a domain sees it.
 *
 * `localId` is what the domain's own code and its historical candidate ids use. The
 * canonical `patternId` travels alongside it, so a candidate built from this can carry
 * both: the id the generator knows, and the identity the evidence belongs to.
 */
export function adapt<LocalId extends string>(
  localId: LocalId,
  patternId: string,
  override: WordingOverride = {},
): DomainMoveView<LocalId> {
  const source = pattern(patternId);

  return {
    patternId: source.patternId,
    id: localId,
    statement: override.statement ?? source.statement,
    intendedOutcome: override.intendedOutcome ?? source.intendedOutcome,
    followUp: override.followUp ?? source.followUp,
    durationMinutes: source.durationMinutes,
    minimumMinutes: source.minimumMinutes,
    minimumVersion: override.minimumVersion ?? source.minimumVersion,
    fallback: override.fallback ?? source.fallback,
    stoppingPoint: override.stoppingPoint ?? source.stoppingPoint,
    friction: source.friction,
    capabilityEffects: source.effects.map((effect) => ({
      channel: effect.channel,
      effect: effect.effect,
      magnitude: effect.magnitude,
      /*
       * The catalogue is authored from external research and general reasoning, not from
       * this owner's own evidence. Saying so on every effect is what keeps a generic
       * expectation from reading as a personal finding.
       */
      basis: 'external-research' as const,
      crossDomain: false,
    })),
    ...(source.capacity === undefined ? {} : { capacity: source.capacity }),
  };
}

/* -------------------------------------------------------------------------- */

/**
 * The flat shape five of the domain slices use.
 *
 * They predate health's and carry `followUpPromptId` as a bare string, no `fallback`, and
 * no `friction`. Rather than rewrite six generators and their tests to health's shape —
 * which would be a large, risky change unrelated to the actual goal — the adapter produces
 * what each domain already consumes.
 *
 * The point of the migration is that the *authored move* lives in one place, not that
 * every slice reads it through an identical interface. What matters is that nothing here
 * can invent a move: `patternId` still comes from the catalogue and there is still no way
 * to set it.
 */
export interface FlatDomainMoveView<LocalId extends string = string> {
  readonly patternId: string;
  readonly id: LocalId;
  readonly statement: string;
  readonly intendedOutcome: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly followUpPromptId: string;
  readonly capabilityEffects: readonly CapabilityEffect[];
  readonly capacity?: CapacityProfile | undefined;
}

export function adaptFlat<LocalId extends string>(
  localId: LocalId,
  patternId: string,
  override: WordingOverride & { readonly followUpPromptId?: string | undefined } = {},
): FlatDomainMoveView<LocalId> {
  const full = adapt(localId, patternId, override);

  return {
    patternId: full.patternId,
    id: full.id,
    statement: full.statement,
    intendedOutcome: full.intendedOutcome,
    minimumVersion: full.minimumVersion,
    stoppingPoint: full.stoppingPoint,
    durationMinutes: full.durationMinutes,
    minimumMinutes: full.minimumMinutes,
    followUpPromptId: override.followUpPromptId ?? full.followUp.promptId,
    capabilityEffects: full.capabilityEffects,
    ...(full.capacity === undefined ? {} : { capacity: full.capacity }),
  };
}
