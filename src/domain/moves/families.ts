import type {
  CapabilityChannel,
  CapabilityEffectKind,
  CapabilityMagnitude,
} from '../capabilities';
import type { CapacityProfile } from '../domains/capacity';
import type { DomainId } from '../domains/definitions';

/**
 * The move family model (`V33-040`, v3.3 section D1).
 *
 * ## Why families rather than a flat list
 *
 * A flat list of a hundred moves is a hundred things that can each drift, duplicate, and
 * contradict each other independently. Families give the catalogue a spine: everything in
 * `protect-a-block` is the same idea at different sizes and in different settings, so a
 * new variant is checked against its siblings rather than against ninety-nine strangers,
 * and evidence about one can inform the family without being asserted about all of them.
 *
 * It is also how the breadth target stays honest. Padding is easy in a flat list and
 * obvious in a family — three variants of "drink some water" sit next to each other and
 * declare their own distinct decision job or they do not belong.
 *
 * ## Identity, and why it must survive a rewording
 *
 * Every pattern carries a **stable `patternId`** that is not derived from its wording. The
 * statement is what the owner reads and may change; the id is what evidence attaches to and
 * may not. A pattern that has been observed twelve times must keep those twelve
 * observations when someone improves its sentence, which is only true if identity was never
 * the sentence in the first place.
 *
 * ## Contextual variants
 *
 * A variant is *the same intent* shaped for a situation the base pattern cannot serve —
 * ten minutes instead of forty, at a desk instead of at home, with a child present. It
 * shares the family and carries its own `patternId`, because "the short version worked and
 * the long one did not" is a finding worth being able to hold.
 */

/* -------------------------------------------------------------------------- */
/* Families                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The purpose a family serves, independent of which area of life it sits in.
 *
 * Deliberately about the *decision job*, not the topic. Two families in different domains
 * that both exist to unblock something stalled have more in common, for ranking purposes,
 * than two health families with opposite jobs.
 */
export const MOVE_PURPOSES = [
  /** Restore capacity that has been spent. Rest, recovery, stepping away. */
  'restore',
  /** Reduce a load that is currently pressing. */
  'relieve',
  /** Move a stalled thing forward by the smallest real increment. */
  'unblock',
  /** Protect a condition that is currently good, so it stays that way. */
  'protect',
  /** Make something later possible. Value is in what it unlocks, not itself. */
  'prepare',
  /** Find something out. The point is the answer, not the doing. */
  'learn',
  /** Reach or tend a relationship with another person. */
  'connect',
  /** Bring behaviour back into line with something the owner said matters. */
  'realign',
] as const;
export type MovePurpose = (typeof MOVE_PURPOSES)[number];

/**
 * How a move should be handled when things go wrong (`V33-046`, section H).
 *
 * Not a risk *score* — a class, because these are different kinds of caution and cannot be
 * traded off against each other. `sensitive` is the one that matters most: no experimental
 * or exploratory logic may ever select a move in that class, whatever the expected value
 * calculation says.
 */
export const MOVE_SAFETY = [
  /** Ordinary. Worst case is a wasted ten minutes. */
  'routine',
  /** Involves another person, so a bad call costs more than the owner's time. */
  'interpersonal',
  /**
   * Health, money, privacy, caregiving, or sleep. Never selected as an experiment, never
   * offered on thin evidence, and always the conservative version when in doubt.
   */
  'sensitive',
] as const;
export type MoveSafety = (typeof MOVE_SAFETY)[number];

/**
 * Where a move sits in its own evidence history (`V33-047`, section G6).
 *
 * A lifecycle, not a verdict. `weakened` and `retired` are reached by repeated observed
 * outcomes rather than by a single bad day, and neither deletes anything — a retired move
 * keeps its history and can return when the context that defeated it has changed.
 */
export const MOVE_LIFECYCLE = [
  /** Authored, never yet observed here. Eligible, offered honestly as untested. */
  'experimental',
  /** Observed enough times, consistently enough, to be offered on its merits. */
  'supported',
  /** Works, but only in identifiable conditions. Offered when they hold. */
  'context-specific',
  /** Repeatedly failed to help. Ranked down, not removed. */
  'weakened',
  /** Withdrawn by evidence. Keeps its history and may return on material change. */
  'retired',
] as const;
export type MoveLifecycle = (typeof MOVE_LIFECYCLE)[number];

/**
 * When a move's effect could honestly be looked for (`V33-048`, section G3).
 *
 * Asking "did that help?" ten minutes after something whose effect appears tomorrow morning
 * produces noise and teaches the owner the question is meaningless. The window belongs to
 * the move because only the move knows.
 */
export const OBSERVATION_WINDOWS = [
  /** Minutes. A pause, a glass of water. */
  'immediate',
  /** Later the same day. */
  'same-day',
  /** Tomorrow morning — anything whose real effect is on sleep. */
  'next-morning',
  /** Several days. Habits, repairs, anything cumulative. */
  'multi-day',
  /** Weeks. Direction-level change. */
  'multi-week',
] as const;
export type ObservationWindow = (typeof OBSERVATION_WINDOWS)[number];

export interface MoveFamily {
  readonly familyId: string;
  readonly label: string;
  readonly purpose: MovePurpose;
  /** The areas this family can serve. A family may legitimately serve several. */
  readonly domains: readonly DomainId[];
  /** What the family is for, in one sentence. The test of whether a variant belongs. */
  readonly decisionJob: string;
}

/* -------------------------------------------------------------------------- */
/* Patterns                                                                     */
/* -------------------------------------------------------------------------- */

export interface MovePattern {
  /** Stable, never derived from the wording. Evidence attaches to this. */
  readonly patternId: string;
  readonly familyId: string;
  /** What the owner reads. May be improved without breaking evidence. */
  readonly statement: string;
  /**
   * The distinct decision job this variant does that its siblings do not.
   *
   * Required, and the anti-padding rule: a variant that cannot say how it differs from
   * the rest of its family is a rewording, and `moveCatalogue.test.ts` fails the build.
   */
  readonly distinctBecause: string;
  /** Observable, and never "feel better". */
  readonly intendedOutcome: string;
  readonly followUp: { readonly promptId: string; readonly windowHours: number };
  readonly observationWindow: ObservationWindow;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly minimumVersion: string;
  readonly fallback: string;
  readonly stoppingPoint: string;
  readonly friction: 'low' | 'moderate' | 'high';
  readonly safety: MoveSafety;
  readonly lifecycle: MoveLifecycle;
  /**
   * Qualitative, never netted, structurally unable to become a score.
   *
   * Typed against the canonical capability vocabulary rather than a local one. The first
   * draft of this file invented `protects` and `large`, neither of which exists in
   * `capabilities.ts` — a second effect vocabulary, which is precisely the divergence the
   * catalogue was built to end. Borrowing the types makes that a compile error.
   */
  readonly effects: readonly {
    readonly channel: CapabilityChannel;
    readonly effect: CapabilityEffectKind;
    readonly magnitude: CapabilityMagnitude;
  }[];
  /** Declared only where the situation genuinely decides eligibility. */
  readonly capacity?: CapacityProfile | undefined;
  /**
   * A pattern this one should usually follow.
   *
   * The prerequisite relationship, kept to one hop. Chains of three become task lists,
   * which is the thing the whole product refuses to be.
   */
  readonly after?: string | undefined;
  /**
   * Patterns this one contradicts and must never be offered alongside.
   *
   * "Go to bed now" and "start a focus block" are both reasonable and cannot both be
   * right at eleven at night.
   */
  readonly contradicts?: readonly string[] | undefined;
  /**
   * The rule version this pattern was authored against (`V33-049`, section G8).
   *
   * Bumped when the pattern's meaning changes rather than its wording, so evidence
   * gathered under the old meaning can be told apart from evidence gathered under the new.
   */
  readonly version: number;
}

/**
 * The words a move is allowed to use about its own effect.
 *
 * There is no numeric field on `MovePattern` for expected effect, and that is deliberate
 * (`V33-014`). A number would need a defined metric and enough comparable observations to
 * estimate from; the catalogue has neither at authoring time and never will, because
 * authoring happens before any evidence exists.
 */
export const QUALITATIVE_EFFECT = [
  'likely small lift',
  'likely meaningful lift',
  'uncertain',
  'possible downside',
] as const;
export type QualitativeEffect = (typeof QUALITATIVE_EFFECT)[number];
