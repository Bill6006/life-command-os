import { z } from 'zod';

/**
 * Capability channels (`OWN-014`, `CI-015`, Blueprint §8).
 *
 * Ten channels that connect the domains underneath the surface. A focus block and a
 * good night's sleep both touch *focus and clarity*; a difficult conversation and a
 * paid-off debt both touch *confidence and courage*. That shared vocabulary is what
 * lets one domain's action be compared against another's without either of them
 * knowing the other exists.
 *
 * ## They are evidence channels, and they cannot become a score
 *
 * The Blueprint says it in four words — "not a visible score wall" — and the enforcement
 * here is structural rather than editorial: **`CapabilityEffect` has no numeric field
 * and no place to put one.** Direction is a word from a closed set, magnitude is a word
 * from a closed set, and the schema is strict, so adding `value: number` is a parse
 * error rather than a design drift.
 *
 * There is deliberately no function anywhere that turns a set of capability effects
 * into a number. Not a private one, not a "just for sorting" one. The moment such a
 * function exists, something will render it.
 */

export const CAPABILITY_CHANNELS = [
  'energy-and-recovery',
  'focus-and-clarity',
  'emotional-regulation',
  'confidence-and-courage',
  'follow-through',
  'learning-and-capability',
  'connection-and-relationships',
  'financial-freedom-and-resilience',
  'environmental-ease',
  'purpose-and-values-alignment',
] as const;
export type CapabilityChannel = (typeof CAPABILITY_CHANNELS)[number];

export const capabilityChannel = z.enum(CAPABILITY_CHANNELS);

export const CAPABILITY_LABELS: Record<CapabilityChannel, string> = {
  'energy-and-recovery': 'Energy and recovery',
  'focus-and-clarity': 'Focus and clarity',
  'emotional-regulation': 'Emotional regulation',
  'confidence-and-courage': 'Confidence and courage',
  'follow-through': 'Follow-through',
  'learning-and-capability': 'Learning and capability',
  'connection-and-relationships': 'Connection and relationships',
  'financial-freedom-and-resilience': 'Financial freedom and resilience',
  'environmental-ease': 'Environmental ease',
  'purpose-and-values-alignment': 'Purpose and values alignment',
};

/**
 * The qualitative vocabulary, and the only vocabulary.
 *
 * `CI-015` is explicit that numeric effect estimates require calibration this product
 * does not have. Until it does, an effect is one of these six words — and a word
 * cannot be averaged, summed, or turned into a percentage by accident.
 */
export const CAPABILITY_EFFECTS = [
  'improves',
  'costs',
  'improves-later',
  'costs-later',
  'uncertain',
  'no-meaningful-effect',
] as const;
export type CapabilityEffectKind = (typeof CAPABILITY_EFFECTS)[number];

export const CAPABILITY_EFFECT_LABELS: Record<CapabilityEffectKind, string> = {
  improves: 'improves',
  costs: 'costs',
  'improves-later': 'improves later',
  'costs-later': 'costs later',
  uncertain: 'uncertain',
  'no-meaningful-effect': 'no meaningful effect',
};

/** How much, in words. Never a number, and never a rank. */
export const CAPABILITY_MAGNITUDES = ['small', 'meaningful', 'unknown'] as const;
export type CapabilityMagnitude = (typeof CAPABILITY_MAGNITUDES)[number];

/**
 * One claim about one channel.
 *
 * `basis` is required. An effect that cannot say where it came from — research, an
 * owner rule, personal evidence, or a legacy heuristic — is an assertion rather than
 * evidence, and this product does not display assertions as evidence (`XDS-051`).
 */
export const EFFECT_BASES = [
  'external-research',
  'owner-rule',
  'personal-evidence',
  'app-inference',
  'legacy-heuristic',
] as const;
export type EffectBasis = (typeof EFFECT_BASES)[number];

export const capabilityEffect = z.strictObject({
  channel: capabilityChannel,
  effect: z.enum(CAPABILITY_EFFECTS),
  magnitude: z.enum(CAPABILITY_MAGNITUDES),
  basis: z.enum(EFFECT_BASES),
  /** True when the effect lands outside the domain that produced the action. */
  crossDomain: z.boolean(),
  note: z.string().max(300).optional(),
});
export type CapabilityEffect = z.infer<typeof capabilityEffect>;

/**
 * Groups effects for display without combining them.
 *
 * Benefits and costs are returned as two lists rather than one netted figure, because
 * the tradeoff *is* the information — a "net positive" hides exactly the cost the
 * owner needed to see before deciding.
 */
export function partitionEffects(effects: readonly CapabilityEffect[]): {
  readonly benefits: readonly CapabilityEffect[];
  readonly costs: readonly CapabilityEffect[];
  readonly uncertain: readonly CapabilityEffect[];
} {
  return {
    benefits: effects.filter((e) => e.effect === 'improves' || e.effect === 'improves-later'),
    costs: effects.filter((e) => e.effect === 'costs' || e.effect === 'costs-later'),
    uncertain: effects.filter(
      (e) => e.effect === 'uncertain' || e.effect === 'no-meaningful-effect',
    ),
  };
}
