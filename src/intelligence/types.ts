import type {
  CanonicalRecord,
  ConfidenceLabel,
  EvidenceValue,
  LifeCategory,
  ProtectedContext,
  TrajectoryDirection,
} from '../domain/records';

/**
 * Structured results emitted by the intelligence layer.
 *
 * These are **outputs, not records**. The application layer decides what to
 * persist as canonical records; intelligence never writes to storage (ARCH-001).
 *
 * Every type here carries its own uncertainty and reason trace, because the
 * interface built in Phase 3 has a place for each of those and an empty place
 * would be visible. The surface is the contract.
 */

export interface EpisodeInput {
  /** Passed in, never read from the clock, so every result is reproducible. */
  readonly now: Date;
  /** Already validated by the application layer. Intelligence never parses. */
  readonly records: readonly CanonicalRecord[];
}

/* -------------------------------------------------------------------------- */
/* Evidence and confidence                                                     */
/* -------------------------------------------------------------------------- */

export interface ConfidenceAssessment {
  readonly label: ConfidenceLabel;
  readonly why: string;
  readonly dimensions: readonly {
    readonly dimension: string;
    readonly assessment: 'supports' | 'neutral' | 'undermines';
    readonly note: string;
  }[];
}

export type FreshnessStatus = 'fresh' | 'aging' | 'stale' | 'none';

export interface Reading {
  readonly label: string;
  /** `unknown` and `conflicting` are first-class. Never coerced to a number. */
  readonly value: EvidenceValue<string>;
  readonly evidence: 'observed' | 'inferred';
  readonly basis: string;
  readonly freshness: FreshnessStatus;
}

/* -------------------------------------------------------------------------- */
/* State                                                                       */
/* -------------------------------------------------------------------------- */

export interface StateAssessment {
  readonly readings: readonly Reading[];
  /** Minutes genuinely free, or absent. Absence is not zero. */
  readonly availableMinutes: EvidenceValue<number>;
  readonly capacity: EvidenceValue<'depleted' | 'low' | 'moderate' | 'high'>;
  readonly protectedContexts: readonly ProtectedContext[];
  /** Attributes where credible records disagree. Reduces confidence; never hidden. */
  readonly contradictions: readonly {
    readonly attribute: string;
    readonly recordIds: readonly string[];
  }[];
  /** What is not known. An empty list is itself a claim. */
  readonly unknowns: readonly string[];
  readonly staleAttributes: readonly string[];
  readonly basisRecordIds: readonly string[];
  readonly confidence: ConfidenceAssessment;
}

export interface TrajectoryResult {
  readonly category: LifeCategory;
  readonly question: string;
  readonly attribute: string;
  readonly direction: TrajectoryDirection;
  readonly detail: string;
  readonly periods: readonly { readonly label: string; readonly value: number | null }[];
  readonly confidence: ConfidenceAssessment;
  readonly freshness: FreshnessStatus;
  readonly basisRecordIds: readonly string[];
}

export interface CategorySummary {
  readonly category: LifeCategory;
  readonly condition: string;
  readonly trajectory: TrajectoryDirection;
  readonly confidence: ConfidenceAssessment;
  readonly freshness: FreshnessStatus;
  readonly drivers: readonly string[];
  /**
   * Real domain metrics — hours, counts, days. **Never a 0–100 score.** The score
   * gate cannot be satisfied by this baseline, so no number pretends to be one.
   */
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
  readonly wouldChangeIt: string;
}

/* -------------------------------------------------------------------------- */
/* Forecast                                                                    */
/* -------------------------------------------------------------------------- */

export interface UntreatedForecast {
  readonly category: LifeCategory;
  readonly target: string;
  readonly horizon: { readonly start: string; readonly end: string; readonly label: string };
  /** Abstains as `unknown` when evidence does not support a projection. */
  readonly projection: EvidenceValue<{
    readonly summary: string;
    readonly direction: 'improving' | 'stable' | 'declining' | 'mixed';
  }>;
  readonly assumptions: readonly string[];
  readonly uncertainty: string;
  readonly confidence: ConfidenceAssessment;
  readonly reasonTrace: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* Intervention                                                                */
/* -------------------------------------------------------------------------- */

export interface CandidateAction {
  readonly id: string;
  readonly statement: string;
  readonly category: LifeCategory;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly minimumVersion: string;
  readonly fallback: string;
  readonly stoppingPoint: string;
  readonly friction: 'low' | 'moderate' | 'high';
  readonly risk: 'none-identified' | 'low' | 'moderate' | 'high';
  readonly reversibility: 'reversible' | 'partially-reversible' | 'irreversible';
  readonly blockedByProtectedContexts: readonly ProtectedContext[];
  readonly goalId: string | undefined;
  readonly reason: string;
}

export interface PredictedEffect {
  readonly category: LifeCategory;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly magnitude: 'small' | 'moderate' | 'large' | 'unknown';
  readonly timing: 'immediate' | 'delayed';
  readonly crossDomain: boolean;
  readonly uncertain: boolean;
  readonly note: string;
}

export interface EffectPrediction {
  readonly candidateId: string;
  readonly effects: readonly PredictedEffect[];
  readonly confidence: ConfidenceAssessment;
  readonly reasonTrace: readonly string[];
}

/** Why a candidate was removed. Internal audit only — never surfaced (INTEL-006). */
export interface RejectedCandidate {
  readonly candidateId: string;
  readonly stage: 'safety' | 'protected-context' | 'commitment' | 'capacity' | 'comparison';
  readonly reason: string;
}

/* -------------------------------------------------------------------------- */
/* Decision                                                                    */
/* -------------------------------------------------------------------------- */

export interface RecommendedAction {
  readonly kind: 'action';
  readonly candidate: CandidateAction;
  readonly effects: readonly PredictedEffect[];
  readonly northStar: { readonly relevance: string; readonly statement: string } | undefined;
  readonly confidence: ConfidenceAssessment;
  readonly reasonTrace: readonly string[];
  readonly primaryAction: string;
  readonly secondaryActions: readonly string[];
}

export interface HighValueQuestion {
  readonly kind: 'question';
  readonly prompt: string;
  readonly whyItMatters: string;
  readonly couldChange: readonly string[];
  readonly answers: readonly string[];
  readonly confidence: ConfidenceAssessment;
}

export interface DeliberateSilence {
  readonly kind: 'silence';
  readonly statement: string;
  readonly rationale: string;
  readonly confidence: ConfidenceAssessment;
  readonly reasonTrace: readonly string[];
  readonly nextCheck: string;
  readonly secondaryActions: readonly string[];
}

export interface InsufficientEvidence {
  readonly kind: 'insufficient-evidence';
  readonly statement: string;
  readonly missing: readonly string[];
  readonly wouldHelp: string;
  readonly confidence: ConfidenceAssessment;
}

/**
 * Exactly one of four things reaches the user.
 *
 * A ranked list is unrepresentable, which is the type-level form of `PROD-005`.
 * `insufficient-evidence` is a distinct branch rather than a degraded silence,
 * because "I have nothing useful to say" and "I know enough to say nothing is
 * needed" are different claims and the user deserves to know which one this is.
 */
export type DecisionOutput =
  RecommendedAction | HighValueQuestion | DeliberateSilence | InsufficientEvidence;

/* -------------------------------------------------------------------------- */
/* Change and direction                                                        */
/* -------------------------------------------------------------------------- */

export interface MaterialChange {
  readonly change: string;
  readonly detail: string;
  readonly when: string;
  readonly altered: 'state' | 'recommendation' | 'confidence';
  readonly recordIds: readonly string[];
}

export interface WhatChanged {
  readonly changes: readonly MaterialChange[];
  readonly why: string;
  readonly since: string;
  readonly unchanged: readonly string[];
}

export interface WeeklyDirection {
  readonly weekOf: string;
  readonly window: { readonly start: string; readonly end: string };
  readonly kind: 'focus' | 'deliberately-quiet';
  readonly proposal: string;
  readonly basedOn: readonly string[];
  readonly confidence: ConfidenceAssessment;
  readonly lastWeek: string;
  readonly responses: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* The episode                                                                 */
/* -------------------------------------------------------------------------- */

export interface EpisodeCore {
  readonly episodeId: string;
  readonly at: string;
  readonly clock: string;
  readonly state: StateAssessment;
  readonly trajectory: TrajectoryResult;
  readonly categories: readonly CategorySummary[];
  readonly forecast: UntreatedForecast;
  readonly whatChanged: WhatChanged;
  readonly output: DecisionOutput;
  readonly weeklyDirection: WeeklyDirection;
  /**
   * Internal audit trail. The interface layer must never render this — it is the
   * record of comparison, not a menu of alternatives.
   */
  readonly internal: {
    readonly candidates: readonly CandidateAction[];
    readonly effects: readonly EffectPrediction[];
    readonly rejected: readonly RejectedCandidate[];
  };
}
