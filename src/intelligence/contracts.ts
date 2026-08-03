/**
 * Intelligence problem contracts (Prompt 5 task 3).
 *
 * Every consequential rule this phase makes authoritative declares, before it is
 * allowed to run: the decision it supports, its target and horizon, the baseline
 * chosen, the evidence behind that choice, its uncertainty, when it abstains, how
 * it fails, its safety and privacy boundary, how it could be validated later, and
 * what would retire it.
 *
 * These are **data, not prose**, so a test can assert that no rule ships without
 * them — which is the difference between a discipline and an intention.
 *
 * The honest status of every rule here is `unproven-transparent-baseline`. None has
 * been validated against this user's outcomes, because no outcome has been observed
 * yet. Phase 5 is what changes that.
 */

export type EvidenceClass =
  | 'authoritative-technical-standard'
  | 'professional-guidance'
  | 'systematic-research'
  | 'population-level-only'
  | 'personally-validated'
  | 'unproven-transparent-baseline'
  | 'descriptive-association-only';

export interface IntelligenceContract {
  readonly id: string;
  readonly problem: string;
  /** The user decision this exists to improve. If none, the rule should not exist. */
  readonly decisionTarget: string;
  readonly target: string;
  readonly horizon: string;
  readonly baseline: string;
  readonly evidenceClass: EvidenceClass;
  readonly evidenceNote: string;
  readonly uncertainty: string;
  /** When it declines to answer. A rule with no abstention condition is overconfident. */
  readonly abstainsWhen: readonly string[];
  readonly failsWhen: readonly string[];
  readonly safetyBoundary: string;
  readonly privacyBoundary: string;
  readonly futureValidation: string;
  readonly retireWhen: string;
}

export const INTELLIGENCE_CONTRACTS: readonly IntelligenceContract[] = [
  {
    id: 'STATE-CAPACITY',
    problem: 'What is true right now about time, capacity, and protected contexts?',
    decisionTarget: 'Whether any action is eligible at all, and which ones fit.',
    target: 'Available minutes, capacity level, and active protected contexts.',
    horizon: 'The present moment, from the most recent context snapshot.',
    baseline:
      'Read the most recent context snapshot. Report each field with its own evidence status. Detect contradictions by comparing observations of the same attribute within the same window.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'Reading the latest report is the simplest defensible rule. No inference, smoothing, or imputation is applied.',
    uncertainty:
      'Capacity is self-reported and inferred; available time is observed from a calendar and is more reliable.',
    abstainsWhen: [
      'No context snapshot exists, so every field is unknown',
      'Two credible records disagree, which is reported as conflicting rather than resolved',
      'The most recent snapshot is older than its useful age for the decision at hand',
    ],
    failsWhen: [
      'The calendar is wrong and the user does not correct it',
      'Capacity changed since the last report and no new observation was made',
    ],
    safetyBoundary: 'Reports state only. It never proposes an action and never filters one.',
    privacyBoundary: 'Local computation over local records. Nothing leaves the device.',
    futureValidation:
      'Compare inferred capacity against later self-reports for the same window once outcomes exist.',
    retireWhen:
      'Contradiction rates or user corrections show that the latest-snapshot rule misreads capacity.',
  },
  {
    id: 'TRAJECTORY-FOCUSED-HOURS',
    problem: 'Is focused work recovering or still declining?',
    decisionTarget: 'Whether the untreated path is worth acting against this week.',
    target: 'Hours in blocks of 25 minutes or more, summed per ISO week.',
    horizon: 'The last eight weeks.',
    baseline:
      'Sum observed focus blocks per week. Compare the most recent complete week with the mean of the prior comparable weeks. Improving or declining when the difference exceeds 15 percent; otherwise stable.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'A threshold on a simple mean is the least machinery that can answer the question. The 15 percent band is a stated convention, not a finding, and is labelled as such wherever it is shown.',
    uncertainty:
      'Counts are observed rather than estimated, so the series carries no model uncertainty. The threshold itself is a judgement.',
    abstainsWhen: [
      'Fewer than three weeks contain any evidence — direction is reported as insufficient evidence',
      'A week has no evidence, which is carried as a gap and never counted as zero',
    ],
    failsWhen: [
      'The user records focus sessions inconsistently, making a reporting change look like a behaviour change',
      'A life-context change makes older weeks non-comparable — Phase 5 detects this; Phase 4 does not',
    ],
    safetyBoundary: 'Descriptive only. It never implies the user should be working more.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation:
      'Check whether declared direction matches the following weeks once enough windows have closed.',
    retireWhen:
      'The 15 percent band proves to flag noise as direction, or a better-calibrated rule beats it in Phase 8.',
  },
  {
    id: 'FORECAST-UNTREATED',
    problem: 'What happens if nothing changes?',
    decisionTarget: 'Whether the cost of interrupting the user is justified.',
    target: 'The direction of the focused-hours series at the end of the current week.',
    horizon: 'To the end of the current ISO week.',
    baseline:
      'Persist the observed trajectory direction forward unchanged, stating the assumptions that make that valid.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'Persistence is the standard naive baseline for a short-horizon series and the honest starting point. It claims only that things continue as they have been.',
    uncertainty:
      'Three to eight weeks of comparable evidence. No confidence interval is offered, because a number here would be false precision.',
    abstainsWhen: [
      'The trajectory is insufficient evidence — the projection is `unknown`, not a guess',
      'Fewer than two weeks carry evidence',
      'The state assessment cannot establish the current week',
    ],
    failsWhen: [
      'A known upcoming change makes persistence wrong, and it is not recorded as a commitment',
      'The horizon is long enough for persistence to be a poor model — mitigated by keeping it to one week',
    ],
    safetyBoundary:
      'Never forecasts health, mood, or anything outside the enabled alpha categories.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation:
      'Phase 5 evaluates each forecast against the observed outcome, separately from whether any recommendation helped.',
    retireWhen:
      'Forecast evaluation shows persistence is contradicted more often than supported.',
  },
  {
    id: 'INTERVENTION-EFFECTS',
    problem: 'What would this action do, and what would it cost?',
    decisionTarget: 'Whether the benefit is worth the cross-domain cost.',
    target: 'Direction, magnitude, and timing of effect per enabled category.',
    horizon:
      'From now to the end of the available window, plus one delayed horizon to end of day.',
    baseline:
      'Rule-based. Benefit to the action’s own category scales with dose against its minimum useful version. Cost to time and capacity scales with the share of the free window consumed. An action finishing within fifteen minutes of a protected boundary carries a delayed, uncertain effect on that context.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'No personal evidence exists for effect sizes yet, so magnitudes are coarse words — small, moderate, large — and never numbers. Nothing here claims to have measured anything.',
    uncertainty:
      'Every effect is a prediction with no personal validation behind it. Uncertain effects are marked uncertain rather than being dropped.',
    abstainsWhen: [
      'Available time is unknown, so the share of the window consumed cannot be computed and the cost is reported as unknown magnitude',
    ],
    failsWhen: [
      'The user’s actual effect sizes differ from the coarse assumptions, which Phase 5 will surface',
    ],
    safetyBoundary:
      'Effects are predictions, never claims about what did happen. Nothing here establishes causation.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation:
      'Phase 5 compares expected against actual effects once outcomes are observed.',
    retireWhen: 'Expected-versus-actual comparison shows the dose rule does not track reality.',
  },
  {
    id: 'DECISION-CONSTRAINT-FIRST',
    problem: 'What is the single best realistic move, if any?',
    decisionTarget: 'The one thing worth doing now, or the decision not to interrupt.',
    target: 'Exactly one output: an action, a question, or deliberate silence.',
    horizon: 'The current free window.',
    baseline:
      'Constraint-first. Remove unsafe actions, then those violating protected contexts, then those blocked by non-negotiable commitments, then those whose minimum version does not fit the free window. Compare survivors on an inspectable integer score over goal relevance, expected benefit, friction, reversibility, and fit. Emit silence when nothing survives or the best score does not clear the interruption threshold.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'Filtering before ranking is the structure the Constitution requires: unsafe and ineligible actions are removed, never merely penalised. The weights are stated conventions and are shown in the reason trace.',
    uncertainty:
      'The weights are a judgement, not a measurement. The interruption threshold is deliberately conservative — the product prefers silence to noise.',
    abstainsWhen: [
      'No candidate survives the constraints — deliberate silence, with the reason',
      'The best surviving score does not clear the interruption threshold — deliberate silence',
      'The state assessment lacks the evidence to filter honestly — insufficient evidence, not a guess',
      'A single answer would change which candidates are eligible — one high-value question instead',
    ],
    failsWhen: [
      'A constraint the user cares about is not recorded, so an ineligible action survives',
      'The weights systematically prefer the wrong kind of action, which Phase 8 would test',
    ],
    safetyBoundary:
      'Safety filtering runs first and cannot be outscored. No experiment involving medication, health risk, driving, dependents, legal, financial, or security-sensitive behaviour can be generated by this baseline at all.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation:
      'Phase 5 evaluates recommendation effectiveness, and only for recommendations that were actually carried out.',
    retireWhen:
      'Effectiveness evaluation shows the ranking picks worse actions than a simpler or different rule, or Phase 8 finds a candidate that meaningfully beats it.',
  },
  {
    id: 'CHANGE-MATERIAL',
    problem: 'What materially changed, and why did the answer change?',
    decisionTarget: 'Whether to trust a changed recommendation, and what caused it.',
    target:
      'The records recorded since the last useful assessment, and the resulting output diff.',
    horizon: 'Since the previous assessment.',
    baseline:
      'Re-run the whole engine over the records that existed at the previous assessment, then diff the two results. What changed is what actually differs, not a list of new records.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'Diffing two real runs is the only approach that cannot claim a change the engine did not actually make. A hand-maintained changelog would drift from the truth immediately.',
    uncertainty: 'None in the mechanism. It reports differences that demonstrably exist.',
    abstainsWhen: [
      'This is the first assessment, which is stated as such rather than dressed as a change',
    ],
    failsWhen: ['Records arrive out of order, making the previous assessment unrepresentative'],
    safetyBoundary: 'Descriptive only.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation: 'Not applicable — the mechanism is deterministic and self-evidencing.',
    retireWhen:
      'Re-running the engine becomes too costly, which profiling would have to show first.',
  },
  {
    id: 'WEEKLY-DIRECTION',
    problem: 'What is worth focusing on this week, if anything?',
    decisionTarget: 'One weekly direction the user confirms, adjusts, or rejects.',
    target: 'One focus proposal, or a deliberately quiet week.',
    horizon: 'The current ISO week.',
    baseline:
      'Propose focus on the enabled category whose trajectory is declining with the most evidence behind it, sized to the capacity actually observed. Propose a deliberately quiet week when capacity is depleted, when protected obligations dominate the week, or when no category is declining.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'The system proposes and the user disposes. The rule exists to remove the blank slate, not to be right — which is why rejecting it costs the user nothing.',
    uncertainty: 'Rests on the trajectory rule and inherits its uncertainty.',
    abstainsWhen: [
      'Every category reports insufficient evidence — a quiet week is proposed with that stated as the reason',
    ],
    failsWhen: [
      'The user’s real priority is outside the enabled categories, which they can say by rejecting it',
    ],
    safetyBoundary:
      'A direction never overrides safety, protected responsibilities, or changed evidence.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation: 'Phase 5 compares the proposed direction against what actually happened.',
    retireWhen:
      'The user rejects proposals often enough that the blank slate would be no worse.',
  },
  {
    id: 'CONFIDENCE-LABEL',
    problem: 'How much should the user trust this?',
    decisionTarget: 'Whether to act on a conclusion or wait for better evidence.',
    target: 'One of four labels.',
    horizon: 'Per conclusion.',
    baseline:
      'Count comparable evidence, check recency, completeness, and consistency. No comparable evidence is insufficient evidence; one or two is early signal; three or more that are fresh and consistent is moderate evidence.',
    evidenceClass: 'unproven-transparent-baseline',
    evidenceNote:
      'Counting is transparent and cannot manufacture precision. The dimensions shown to the user are the ones actually used.',
    uncertainty: 'The thresholds are conventions, stated wherever confidence is explained.',
    abstainsWhen: ['No comparable evidence exists, which is reported as insufficient evidence'],
    failsWhen: [
      'Volume is mistaken for quality — three poor observations outrank one good one',
    ],
    safetyBoundary: 'Never inflates a label to make a recommendation look stronger.',
    privacyBoundary: 'Local computation over local records.',
    futureValidation:
      'Phase 5 checks whether higher labels really do correspond to better-supported conclusions.',
    retireWhen: 'Calibration shows the labels do not track reliability.',
  },
];

/**
 * `strong-personal-evidence` is unreachable in Phase 4, and that is deliberate.
 *
 * The top label requires prospective validation (`LEARN-003`), and no recommendation
 * has yet been carried out and observed through a full outcome window. A baseline
 * that could award its own highest confidence on its first day would be exactly the
 * false precision the Constitution forbids. Phase 5 makes it reachable.
 */
export const MAX_CONFIDENCE_THIS_PHASE = 'moderate-evidence' as const;

export function contractFor(id: string): IntelligenceContract {
  const found = INTELLIGENCE_CONTRACTS.find((contract) => contract.id === id);
  if (found === undefined) throw new Error(`No intelligence contract registered for ${id}`);
  return found;
}
