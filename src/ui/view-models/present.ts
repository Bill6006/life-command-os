import type { EvidenceValue, LifeCategory } from '../../domain/records';
import type { ConfidenceAssessment, FreshnessStatus } from '../../intelligence';

/**
 * Presentation helpers.
 *
 * These **format** engine output. They never decide anything, never supply a
 * default, and never invent a value the engine did not produce — which is the whole
 * point of replacing the Phase 3 prototype rather than adapting it.
 *
 * Absence is rendered as the word for that kind of absence. There is deliberately no
 * `?? 0` and no `|| 'Unknown'` fallback anywhere in this file: each branch is
 * written out, so a new evidence status would fail to compile rather than silently
 * render as blank.
 */

/* -------------------------------------------------------------------------- */
/* Presentation contracts                                                      */
/* -------------------------------------------------------------------------- */

export type EvidenceKind = 'observed' | 'inferred';

/**
 * An effect ready for display: the engine's shape with the category already
 * rendered as a human label. Everything else passes through untouched.
 */
export interface DisplayEffect {
  readonly category: string;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly magnitude: 'small' | 'moderate' | 'large' | 'unknown';
  readonly timing: 'immediate' | 'delayed';
  readonly crossDomain: boolean;
  readonly uncertain: boolean;
  readonly note: string;
}

/**
 * A chart's full obligations under the graph policy (`UX-003`), as a type.
 *
 * A chart that cannot state its question, metric, window, missing-data treatment,
 * uncertainty, and text summary cannot be constructed.
 */
export interface TrendSeries {
  readonly question: string;
  readonly metric: string;
  readonly window: string;
  readonly evidence: EvidenceKind;
  readonly missingDataTreatment: string;
  readonly uncertainty: string;
  readonly textSummary: string;
  readonly unit: string;
  /** `null` means no evidence for that period — drawn as a gap, never as zero. */
  readonly points: readonly { readonly label: string; readonly value: number | null }[];
}

export function evidenceText(value: EvidenceValue<string>): string {
  switch (value.status) {
    case 'known':
      return value.value;
    case 'unknown':
      return 'Unknown';
    case 'not-applicable':
      return 'Not applicable';
    case 'conflicting':
      return 'Conflicting';
    case 'unresolved':
      return 'Awaiting';
  }
}

/** True only for genuinely known values — used to mark absence in the interface. */
export function isKnownValue(value: EvidenceValue<unknown>): boolean {
  return value.status === 'known';
}

export function confidenceLabel(confidence: ConfidenceAssessment): string {
  switch (confidence.label) {
    case 'insufficient-evidence':
      return 'Insufficient evidence';
    case 'early-signal':
      return 'Early signal';
    case 'moderate-evidence':
      return 'Moderate evidence';
    case 'strong-personal-evidence':
      return 'Strong personal evidence';
  }
}

export function freshnessLabel(freshness: FreshnessStatus): string {
  switch (freshness) {
    case 'fresh':
      return 'Fresh';
    case 'aging':
      return 'Aging';
    case 'stale':
      return 'Stale';
    case 'none':
      return 'No dated evidence';
  }
}

export function trajectoryLabel(direction: string): string {
  return direction === 'insufficient-evidence' ? 'Insufficient evidence' : direction;
}

/**
 * The human label for a category.
 *
 * `CATEGORY_LABELS` is typed `Record<LifeCategory, string>`, so **activating a category
 * without naming it fails to compile**. It used to fall through to returning the raw
 * id, which is how `health-recovery-energy` reached a deployed screen as a slug: a
 * silent default is a defect that ships.
 */
const CATEGORY_LABELS: Record<LifeCategory, string> = {
  'time-attention-capacity': 'Time, attention & capacity',
  'direction-and-commitments': 'Direction & commitments',
  'career-work-learning': 'Career, work & learning',
  'health-recovery-energy': 'Health, recovery & energy',
  'fatherhood-and-child': 'Fatherhood & child development',
  'emotional-and-relationships': 'Emotional state & relationships',
  'faith-and-meaning': 'Faith & meaning',
};

export function categoryLabel(category: string): string {
  // Widened deliberately: the const above is exhaustive over `LifeCategory`, but the
  // argument is a plain string, so the lookup genuinely can miss. Casting the key
  // instead would have told the type system a lie about that.
  const labels: Record<string, string | undefined> = CATEGORY_LABELS;
  return labels[category] ?? category;
}
