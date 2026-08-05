import type { CanonicalRecord } from '../domain/records';
import type { DomainId } from '../domain/domains/definitions';
import type {
  CandidateAction,
  CategorySummary,
  DecisionOutput,
  EffectPrediction,
  FreshnessStatus,
  RejectedCandidate,
  StateAssessment,
  TrajectoryResult,
  UntreatedForecast,
} from '../intelligence/types';

/**
 * Command Core — the boundary (Phase 8).
 *
 * ## What Command Core is
 *
 * The cross-domain intelligence. Seven domain slices each read their own records and
 * produce a reading, at most one candidate, a scan summary, and their permissions.
 * Command Core takes those seven submissions and the shared state, and decides **what
 * the owner is actually shown**: which single action or question or silence, which
 * questions are worth asking now, which areas have gone quiet, and what a weekly or
 * seasonal review should say.
 *
 * ## Where it begins
 *
 * At `runCommandCore(input)`. Everything before that — assessing state, running each
 * domain slice, gathering the submissions — is **episode assembly**, and it lives in
 * `src/intelligence/index.ts`. Command Core does not know how a submission was
 * produced and cannot ask.
 *
 * ## Where it ends
 *
 * At the returned `CommandCoreResult`. It writes nothing (`ARCH-001` holds throughout),
 * reads no clock, and consumes no randomness. The same input at the same instant always
 * produces the same result.
 *
 * ## The line, enforced rather than described
 *
 * Command Core **must not import from any domain's content or intelligence modules** —
 * not `domain/health/`, not `intelligence/domains/faith/`, not any of the other twelve.
 * It may import the shared contracts every domain already speaks: canonical records, the
 * domain *registry* (ids, labels, enablement), the prompt catalogue, the contextual-capture
 * registry, and the shared intelligence types.
 *
 * A test walks the import graph and fails the build if that line is crossed
 * (`tests/unit/commandCore.test.ts`). That is what makes "upgrade the core without
 * rewriting the domains" a property of the code rather than an intention: a smarter
 * arbitration or a research-backed coverage model replaces files inside this directory,
 * and no domain slice changes, because no domain slice is reachable from here.
 *
 * The reverse is equally true and equally checked: no domain imports Command Core.
 * Domains declare; the core decides.
 *
 * ## What is deliberately not here
 *
 * No domain vocabulary. Nothing in this directory knows what a milestone, a practice, a
 * friction kind, or a resilience band is. Every one of those would be a decision the
 * core has no standing to make and a reason to edit the core when a domain changes.
 */

/* -------------------------------------------------------------------------- */
/* What a domain hands in                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A domain's compact summary for the Weekly Quick Domain Scan (shared rule 20).
 *
 * Structural, not nominal: each slice builds its own and they satisfy this shape without
 * importing it. Command Core reads the shape and never the slice.
 */
export interface DomainScan {
  readonly domainId: DomainId;
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  /** One line, counts only. Never quotes anything the owner wrote. */
  readonly standing: string;
  /** An unresolved item, named as a category of thing rather than by its content. */
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

/** Everything one domain submits for one decision episode. */
export interface DomainSubmission {
  readonly domainId: DomainId;
  /** At most one. A slice offering more has misunderstood its contract (`XDS-015`). */
  readonly candidate: CandidateAction | undefined;
  /** Why the slice offered what it did, or why it stayed silent. */
  readonly because: string;
  readonly scan: DomainScan;
  /** Whether the owner has this area switched on right now. */
  readonly enabled: boolean;
}

/* -------------------------------------------------------------------------- */
/* Input and output                                                            */
/* -------------------------------------------------------------------------- */

export interface CommandCoreInput {
  readonly records: readonly CanonicalRecord[];
  readonly now: Date;
  readonly state: StateAssessment;
  readonly trajectory: TrajectoryResult;
  readonly categories: readonly CategorySummary[];
  readonly forecast: UntreatedForecast;
  /** Candidates the core engine produced itself, before any domain offered one. */
  readonly coreCandidates: readonly CandidateAction[];
  readonly submissions: readonly DomainSubmission[];
  /** Effect predictions for every candidate under consideration. */
  readonly predictions: readonly EffectPrediction[];
  /**
   * Protected topics the owner has switched on.
   *
   * A set of strings rather than the `ProtectedTopic` union, because the union is owned by
   * the records layer and passing it here would be the only place Command Core cared which
   * topics exist. It checks membership; it never enumerates.
   */
  readonly enabledTopics: ReadonlySet<string>;
}

export interface CommandCoreResult {
  /** Exactly one thing: an action, a question, or silence. */
  readonly output: DecisionOutput;
  readonly coverage: CoveragePlan;
  readonly weeklyScan: WeeklyScan;
  readonly deepReview: DeepReview;
  readonly synthesis: WeeklySynthesis;
  readonly trace: DecisionTrace;
  /** Candidates removed before or during comparison. Never rendered as a menu. */
  readonly rejected: readonly RejectedCandidate[];
  /** Every candidate that reached comparison, after deduplication. */
  readonly considered: readonly CandidateAction[];
}

/* -------------------------------------------------------------------------- */
/* Coverage                                                                    */
/* -------------------------------------------------------------------------- */

/** Why a question was not asked. Inspectable rather than invisible. */
export type SuppressionReason =
  | 'answered-recently'
  | 'in-cooldown'
  | 'expired'
  | 'repeatedly-skipped'
  | 'area-switched-off'
  | 'protected-context'
  | 'topic-not-permitted'
  | 'no-decision-value'
  | 'beyond-budget';

export interface CoverageItem {
  readonly promptId: string;
  readonly domainId: DomainId | undefined;
  /** What it would change. A question that changes nothing is never offered. */
  readonly couldChange: readonly string[];
  /** Where the capture declared it belongs. */
  readonly surface: string;
}

export interface SuppressedItem {
  readonly promptId: string;
  readonly reason: SuppressionReason;
  readonly detail: string;
}

export interface CoveragePlan {
  /** Questions worth asking right now, in decision-value order. */
  readonly offered: readonly CoverageItem[];
  readonly suppressed: readonly SuppressedItem[];
  /** Areas with nothing recorded for a long time, and what to do about it. */
  readonly quietAreas: readonly QuietArea[];
  /** True when the plan stays inside the normal check-in budget (`OWN-023`). */
  readonly withinBudget: boolean;
}

export interface QuietArea {
  readonly domainId: DomainId;
  readonly daysSinceUpdate: number | undefined;
  /** Where it will be raised. Never a daily guide — that is a checklist by another name. */
  readonly raiseOn: 'weekly-scan' | 'deep-review';
  readonly because: string;
}

/* -------------------------------------------------------------------------- */
/* Review surfaces                                                             */
/* -------------------------------------------------------------------------- */

export interface WeeklyScanRow {
  readonly domainId: DomainId;
  readonly label: string;
  readonly freshness: FreshnessStatus;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly lastMeaningfulUpdate: string | undefined;
  /** `No change`, `Quick update`, and `Open` all write through the ordinary path. */
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
  readonly quiet: boolean;
}

export interface WeeklyScan {
  readonly rows: readonly WeeklyScanRow[];
  readonly quietCount: number;
  readonly note: string;
}

export interface DeepReviewSection {
  readonly heading: string;
  readonly lines: readonly string[];
}

export interface DeepReview {
  readonly due: boolean;
  readonly window: string;
  readonly sections: readonly DeepReviewSection[];
  /** Named explicitly so the review cannot quietly become a scorecard. */
  readonly noScoreNote: string;
}

/** A disagreement between two areas, stated rather than resolved. */
export interface Tradeoff {
  readonly between: readonly [DomainId, DomainId];
  readonly statement: string;
}

export interface WeeklySynthesis {
  readonly headline: string;
  readonly improving: readonly string[];
  readonly drifting: readonly string[];
  readonly tradeoffs: readonly Tradeoff[];
  /** Where the recent picture and the longer one disagree. Both are kept. */
  readonly recentVersusLongTerm: readonly string[];
}

/* -------------------------------------------------------------------------- */
/* Trace                                                                       */
/* -------------------------------------------------------------------------- */

export interface TraceStep {
  readonly stage: string;
  readonly detail: string;
}

export interface DecisionTrace {
  /** In order, from what was offered to what survived to what was chosen. */
  readonly steps: readonly TraceStep[];
  /** What would have to change for the answer to change. */
  readonly wouldChangeIt: readonly string[];
}
