import { z } from 'zod';

/**
 * The approved anchored state scales (`OWN-026`–`OWN-032`, Blueprint §4.4).
 *
 * An anchored scale is the one place this product asks the owner to summarise how
 * they are, and it is deliberately the *only* such place. The anchors are concrete
 * present-tense descriptions — "Drained", "Two minutes possible" — because those
 * describe current experience without demanding a causal explanation for it
 * (`OBS-005`). Nothing here asks why.
 *
 * Three properties are structural rather than conventional:
 *
 *   1. **Direction is data.** `higherMeans` is stored on the definition, so
 *      "higher ordinal always means more stress" (`AT-050`) is a value a test can
 *      assert rather than an assumption spread across call sites.
 *   2. **Versions are explicit.** Anchors are wording, and wording drifts. A
 *      recorded observation cites `scaleVersion`, so a future rewording produces a
 *      new version instead of silently changing what old records meant.
 *   3. **There is no default position.** A scale has no midpoint, no initial
 *      selection, and no "neutral" fallback. An untouched control is Unknown
 *      (`OWN-024`), which is a different fact from any point on the scale.
 */

export const SCALE_IDS = [
  'energy',
  'mood',
  'stress',
  'confidence',
  'overwhelm',
  'sleep-recovery',
  'readiness',
] as const;
export type ScaleId = (typeof SCALE_IDS)[number];

export interface ScaleAnchor {
  readonly ordinal: number;
  readonly label: string;
}

export interface ScaleDefinition {
  readonly scaleId: ScaleId;
  readonly scaleVersion: number;
  /** The question shown to the owner. Observable/anchored — never causal. */
  readonly prompt: string;
  /** What a higher ordinal means, so the direction cannot silently invert. */
  readonly higherMeans: string;
  readonly anchors: readonly ScaleAnchor[];
}

function scale(
  scaleId: ScaleId,
  prompt: string,
  higherMeans: string,
  labels: readonly string[],
): ScaleDefinition {
  return {
    scaleId,
    scaleVersion: 1,
    prompt,
    higherMeans,
    anchors: labels.map((label, index) => ({ ordinal: index + 1, label })),
  };
}

/**
 * Every approved scale, exactly as the Blueprint states it.
 *
 * The prompts are phrased as present-state reports. "How is your energy right now"
 * is answerable by looking inward for a second; "why is your energy low" is not,
 * and is prohibited (`OBS-002`).
 */
export const SCALES: Record<ScaleId, ScaleDefinition> = {
  energy: scale('energy', 'Energy right now', 'more energy', [
    'Drained',
    'Low',
    'Functional',
    'Good',
    'Strong',
  ]),
  mood: scale('mood', 'Mood right now', 'better mood', [
    'Very low',
    'Low',
    'Neutral',
    'Good',
    'Very good',
  ]),
  stress: scale('stress', 'Stress right now', 'more stress', [
    'Calm',
    'Mild',
    'Noticeable',
    'High',
    'Overloaded',
  ]),
  confidence: scale('confidence', 'Confidence right now', 'more confidence', [
    'Shaken',
    'Uncertain',
    'Functional',
    'Confident',
    'Strong',
  ]),
  overwhelm: scale('overwhelm', 'Overwhelm right now', 'more overwhelm', [
    'Clear',
    'Manageable',
    'Pressured',
    'Overwhelmed',
    'Flooded',
  ]),
  'sleep-recovery': scale('sleep-recovery', 'Last night’s recovery', 'better recovery', [
    'Very poor',
    'Poor',
    'Mixed',
    'Good',
    'Restorative',
  ]),
  readiness: scale('readiness', 'What is possible right now', 'more capacity available', [
    'Need recovery',
    'Two minutes possible',
    'Ten minutes possible',
    'Can lift',
  ]),
};

export const SCALE_LIST: readonly ScaleDefinition[] = SCALE_IDS.map((id) => SCALES[id]);

/** The canonical observation attribute a scale is recorded under. */
export function scaleAttribute(scaleId: ScaleId): string {
  return `state:${scaleId}`;
}

export function scaleDefinition(scaleId: ScaleId): ScaleDefinition {
  return SCALES[scaleId];
}

/** The visible label for an ordinal, or undefined when the ordinal is off-scale. */
export function anchorLabel(scaleId: ScaleId, ordinal: number): string | undefined {
  return SCALES[scaleId].anchors.find((anchor) => anchor.ordinal === ordinal)?.label;
}

/**
 * The stored form of an anchored reading.
 *
 * Both the ordinal **and** the label are stored. Storing only the ordinal would make
 * old records unreadable after a rewording; storing only the label would make them
 * uncomparable. Storing both, with the version, means a later reader can always tell
 * what the owner actually saw when they answered.
 */
export const anchoredScaleShape = z.strictObject({
  kind: z.literal('anchored-scale'),
  scaleId: z.enum(SCALE_IDS),
  scaleVersion: z.int().min(1),
  ordinal: z.int().min(1),
  label: z.string().min(1).max(80),
});
export type AnchoredScaleReading = z.infer<typeof anchoredScaleShape>;

/**
 * True when an ordinal and label agree with the named scale version.
 *
 * Applied by `observedValue` rather than baked into the object schema, because a
 * discriminated union needs plain object members to dispatch on `kind`.
 */
export function anchorsAgree(reading: AnchoredScaleReading): boolean {
  return anchorLabel(reading.scaleId, reading.ordinal) === reading.label;
}

/** Standalone refined form, for validating a reading outside a record. */
export const anchoredScaleReading = anchoredScaleShape.refine(anchorsAgree, {
  message: 'Ordinal and label must match the named scale version',
  path: ['label'],
});
