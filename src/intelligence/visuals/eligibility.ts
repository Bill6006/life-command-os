/**
 * Which visual a piece of evidence has earned (Prompt 8A tasks 9–10, Blueprint §11).
 *
 * Six representations, each with an eligibility rule, and **a rule that refuses is the
 * useful half**. The failure this module exists to prevent is a percentage rendered
 * over a construct with no valid denominator: "Fatherhood 68%", "Faith 41%". Numbers
 * like that are not wrong so much as meaningless, and they are meaningless in a way
 * that reads as precision.
 *
 * ## Every visual declares eight things
 *
 * They are fields on `VisualSpec`, not documentation, so a visual that cannot say what
 * decision it informs cannot be constructed. That is the same device `GraphMeta` used
 * for graphs in Phase 5, widened to cover meters, stages, timelines, and summaries.
 *
 * ## The fallback is not a failure
 *
 * When nothing else is eligible, an evidence summary is — and it is a legitimate
 * answer, not a degraded one. Sparse, subjective, or conflicting evidence is better
 * shown as words with its uncertainty attached than as a chart implying a shape the
 * data does not have (`OWN-054`).
 */

export const VISUAL_KINDS = [
  'meter',
  'line-graph',
  'bar-comparison',
  'stage-path',
  'timeline',
  'evidence-summary',
] as const;
export type VisualKind = (typeof VISUAL_KINDS)[number];

/** Where a visual is allowed to appear. Now stays compact (`OWN-060`). */
export const VISUAL_LOCATIONS = [
  'now',
  'direction',
  'timeline',
  'learning',
  'domain-detail',
  'review',
] as const;
export type VisualLocation = (typeof VISUAL_LOCATIONS)[number];

/**
 * The eight declarations every visual carries (`UX-003`, task 10).
 *
 * `decisionValue` is the one that does the most work in review: a visual that cannot
 * finish the sentence "seeing this would change…" is decoration, and decoration is
 * what the Console was selected against.
 */
export interface VisualSpec {
  readonly kind: VisualKind;
  readonly decisionQuestion: string;
  readonly source: string;
  readonly window: string;
  readonly units: string;
  readonly missingData: string;
  readonly uncertainty: string;
  readonly location: VisualLocation;
  readonly decisionValue: string;
  /**
   * What a meter or stage path draws with, when one has been earned.
   *
   * Absent by default, and absent is the common case: a spec also records a
   * representation that was **considered and refused**, and a refusal has nothing to
   * draw. Health earned neither of these; career is the first domain to earn both,
   * which is when the data had to travel alongside the declaration.
   *
   * Line graphs and bar comparisons are not here — they carry their points as
   * `Graph`s, which several surfaces outside the domain panel already render.
   */
  readonly data?: VisualData | undefined;
}

/** The points behind a meter or a stage path. */
export type VisualData =
  | {
      readonly kind: 'meter';
      readonly current: string;
      readonly target: string;
      /** `undefined` when the fraction would be invented — the bar is then omitted. */
      readonly percent: number | undefined;
    }
  | {
      readonly kind: 'stage-path';
      readonly stages: readonly string[];
      readonly currentIndex: number | undefined;
    };

export type Eligibility =
  { readonly eligible: true } | { readonly eligible: false; readonly because: string };

const YES: Eligibility = { eligible: true };
const no = (because: string): Eligibility => ({ eligible: false, because });

/* -------------------------------------------------------------------------- */
/* Meter                                                                       */
/* -------------------------------------------------------------------------- */

export interface MeterInput {
  readonly current: number | undefined;
  readonly target: number | undefined;
  readonly baseline: number | undefined;
  readonly unit: string;
  /** True when the construct genuinely has a countable denominator. */
  readonly hasValidDenominator: boolean;
}

/**
 * A meter needs somewhere to be going and a way of knowing how far along you are.
 *
 * Money paid off a car loan qualifies. "Fatherhood" does not, and no amount of data
 * will make it — the construct has no denominator, which is a fact about the construct
 * rather than about the evidence (`OWN-051`, `AT-081`).
 */
export function meterEligibility(input: MeterInput): Eligibility {
  if (!input.hasValidDenominator) {
    return no('This is not the kind of thing that has a total to be a fraction of');
  }
  if (input.current === undefined) return no('No current value is known');
  if (input.target === undefined) return no('No target has been set');
  if (input.target === input.baseline) return no('Target and starting point are the same');
  if (input.unit.trim() === '') return no('No unit, so the number would mean nothing');
  return YES;
}

/**
 * Percent complete, or `undefined`.
 *
 * Returns `undefined` rather than throwing or clamping when the meter is not eligible,
 * because the caller's correct response is to render something else — not to render a
 * zero, which is what a clamped value would become.
 */
export function meterPercent(input: MeterInput): number | undefined {
  if (!meterEligibility(input).eligible) return undefined;
  const baseline = input.baseline ?? 0;
  const span = (input.target ?? 0) - baseline;
  if (span === 0) return undefined;
  const progressed = ((input.current ?? 0) - baseline) / span;
  return Math.max(0, Math.min(100, Math.round(progressed * 100)));
}

/* -------------------------------------------------------------------------- */
/* Line graph                                                                  */
/* -------------------------------------------------------------------------- */

export interface SeriesInput {
  /** `null` is a gap. Gaps are expected, and are never plotted as zero. */
  readonly points: readonly { readonly label: string; readonly value: number | null }[];
  readonly ordered: boolean;
}

export function lineGraphEligibility(input: SeriesInput): Eligibility {
  if (!input.ordered) return no('The points are not in a meaningful order');
  const observed = input.points.filter((point) => point.value !== null);
  if (observed.length < 2) {
    return no('Fewer than two periods have evidence, so there is no trend to show');
  }
  return YES;
}

/* -------------------------------------------------------------------------- */
/* Bar comparison                                                              */
/* -------------------------------------------------------------------------- */

export interface ComparisonInput {
  readonly bars: readonly { readonly label: string; readonly value: number }[];
  /** True when the categories are genuinely distinct rather than a split continuum. */
  readonly discrete: boolean;
}

export function barComparisonEligibility(input: ComparisonInput): Eligibility {
  if (!input.discrete) return no('These categories are points on a scale, not separate things');
  if (input.bars.length < 2) return no('Nothing to compare against');
  return YES;
}

/* -------------------------------------------------------------------------- */
/* Stage path                                                                  */
/* -------------------------------------------------------------------------- */

export interface StageInput {
  readonly stages: readonly string[];
  readonly currentIndex: number | undefined;
  /** True when the stages are genuinely ordered rather than merely listed. */
  readonly ordinal: boolean;
}

/**
 * Stages replace percentages wherever development is ordinal (`OWN-053`).
 *
 * "Practising with Daddy" is further along than "Exposed through play". It is not 43%
 * of anything, and rendering it as 43% would invent a precision the ladder was
 * explicitly designed to avoid.
 */
export function stagePathEligibility(input: StageInput): Eligibility {
  if (!input.ordinal) return no('These are categories, not steps along a path');
  if (input.stages.length < 2) return no('A path needs more than one step');
  if (input.currentIndex === undefined) return YES; // Not assessed is a valid position.
  if (input.currentIndex < 0 || input.currentIndex >= input.stages.length) {
    return no('The current stage is outside the defined path');
  }
  return YES;
}

/* -------------------------------------------------------------------------- */
/* Timeline and evidence summary                                               */
/* -------------------------------------------------------------------------- */

export function timelineEligibility(events: readonly { readonly at: string }[]): Eligibility {
  if (events.length === 0) return no('No events in this window');
  return YES;
}

/**
 * Always eligible, deliberately.
 *
 * This is the honest answer when a number would mislead, and something has to be able
 * to say "here is what we have, and it is thin". A representation set whose fallback
 * could itself be ineligible would leave the interface with nothing to render but a
 * blank space, and a blank space says "nothing happened" rather than "not enough is
 * known" (`OWN-054`, `XDS-066`).
 */
export function evidenceSummaryEligibility(): Eligibility {
  return YES;
}

/* -------------------------------------------------------------------------- */

/**
 * The best representation the evidence has earned, in order of informativeness.
 *
 * Falls through to an evidence summary, which never refuses. The order encodes a
 * preference for precision *where precision is real*, and a refusal to manufacture it
 * where it is not.
 */
export function chooseRepresentation(options: {
  readonly meter?: MeterInput | undefined;
  readonly series?: SeriesInput | undefined;
  readonly comparison?: ComparisonInput | undefined;
  readonly stages?: StageInput | undefined;
  readonly events?: readonly { readonly at: string }[] | undefined;
}): { readonly kind: VisualKind; readonly rejected: readonly string[] } {
  const rejected: string[] = [];

  const consider = (
    kind: VisualKind,
    result: Eligibility | undefined,
  ): VisualKind | undefined => {
    if (result === undefined) return undefined;
    if (result.eligible) return kind;
    rejected.push(`${kind}: ${result.because}`);
    return undefined;
  };

  const chosen =
    consider('meter', options.meter && meterEligibility(options.meter)) ??
    consider('stage-path', options.stages && stagePathEligibility(options.stages)) ??
    consider('line-graph', options.series && lineGraphEligibility(options.series)) ??
    consider(
      'bar-comparison',
      options.comparison && barComparisonEligibility(options.comparison),
    ) ??
    consider('timeline', options.events && timelineEligibility(options.events)) ??
    'evidence-summary';

  return { kind: chosen, rejected };
}
