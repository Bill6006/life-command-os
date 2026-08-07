import type {
  CandidateActionRecord,
  CommitmentRecord,
  Confidence,
  ContextSnapshotRecord,
  ExecutionRecord,
  ForecastEvaluationRecord,
  DomainPreferenceRecord,
  GoalRecord,
  GuideSessionRecord,
  InferredStateRecord,
  LearnedBeliefRecord,
  InterventionEffectPredictionRecord,
  LifeContextChangeRecord,
  NorthStarRecord,
  ObservationCorrectionRecord,
  ObservationRecord,
  OutcomeRecord,
  QuestionAnswerRecord,
  QuestionRecord,
  RecommendationEffectEvaluationRecord,
  RecommendationRecord,
  SkillClaimRecord,
  MilestoneObservationRecord,
  SurfacePermissionRecord,
  FaithAnchorRecord,
  MovePreferenceRecord,
  TrajectoryRecord,
  UntreatedForecastRecord,
  WeeklyDirectionRecord,
} from '../../src/domain/records';
import { SYNTHETIC_EPOCH, syntheticInstant } from './synthetic';

/**
 * Deterministic neutral fixture builders (Phase 2 task 12, `PRIV-002`).
 *
 * Every value here is invented. Nothing is anonymised from anything real — see
 * ADR-0007 for why that distinction is not pedantic.
 *
 * Determinism is the other requirement: identifiers are generated from a counter,
 * instants are offsets from a fixed epoch, and nothing consults the wall clock or a
 * random source. A scenario that produces different records on different runs
 * cannot be used as evidence for a gate.
 */

let counter = 0;

/** Resets the id counter. Call in `beforeEach` so each test starts identically. */
export function resetFixtureIds(): void {
  counter = 0;
}

/** A valid, obviously-synthetic UUID. Sequential rather than random, by design. */
export function fixtureId(index?: number): string {
  const n = index ?? ++counter;
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const LOCAL_TIME = {
  localIso: '2026-01-05T09:00:00',
  timeZone: 'UTC',
  utcOffsetMinutes: 0,
} as const;

function envelope(recordType: string, minutesAfterEpoch: number) {
  return {
    recordId: fixtureId(),
    recordType,
    schemaVersion: 1,
    occurredAt: syntheticInstant(minutesAfterEpoch),
    recordedAt: syntheticInstant(minutesAfterEpoch),
    localTime: LOCAL_TIME,
  };
}

const OBSERVED = { source: 'user-entry', provenance: { method: 'direct-report' } } as const;

function derived(from: readonly string[]) {
  return {
    source: 'system-derived',
    provenance: { method: 'derived', derivedFromRecordIds: [...from] },
  } as const;
}

/** Minimal valid confidence. At least one dimension and one basis record, always. */
export function fixtureConfidence(overrides: Partial<Confidence> = {}): Confidence {
  return {
    label: 'early-signal',
    dimensions: [{ dimension: 'comparable-evidence-volume', assessment: 'supports' }],
    basisRecordIds: [fixtureId(9001)],
    ...overrides,
  };
}

const WINDOW = { start: SYNTHETIC_EPOCH, end: syntheticInstant(60) };

/* -------------------------------------------------------------------------- */
/* Recorded fact                                                               */
/* -------------------------------------------------------------------------- */

export function anObservation(overrides: Partial<ObservationRecord> = {}): ObservationRecord {
  return {
    ...envelope('observation', 0),
    ...OBSERVED,
    category: 'time-attention-capacity',
    attribute: 'available-minutes',
    value: { kind: 'duration', minutes: 45 },
    ...overrides,
  } as ObservationRecord;
}

export function anObservationCorrection(
  supersedesRecordId: string,
  overrides: Partial<ObservationCorrectionRecord> = {},
): ObservationCorrectionRecord {
  return {
    ...envelope('observation-correction', 10),
    source: 'user-correction',
    provenance: { method: 'direct-report' },
    supersedesRecordId,
    category: 'time-attention-capacity',
    attribute: 'available-minutes',
    value: { kind: 'duration', minutes: 30 },
    reason: 'Original entry double-counted a break',
    ...overrides,
  } as ObservationCorrectionRecord;
}

export function aContextSnapshot(
  overrides: Partial<ContextSnapshotRecord> = {},
): ContextSnapshotRecord {
  return {
    ...envelope('context-snapshot', 1),
    ...OBSERVED,
    capacity: { status: 'known', value: 'moderate' },
    availableMinutes: { status: 'known', value: 45 },
    protectedContexts: [],
    ...overrides,
  } as ContextSnapshotRecord;
}

export function aLifeContextChange(
  overrides: Partial<LifeContextChangeRecord> = {},
): LifeContextChangeRecord {
  return {
    ...envelope('life-context-change', 2),
    ...OBSERVED,
    summary: 'Working pattern changed to four longer days',
    affectedCategories: ['time-attention-capacity'],
    effectiveFrom: SYNTHETIC_EPOCH,
    ...overrides,
  } as LifeContextChangeRecord;
}

/* -------------------------------------------------------------------------- */
/* Interpretation                                                              */
/* -------------------------------------------------------------------------- */

export function anInferredState(
  overrides: Partial<InferredStateRecord> = {},
): InferredStateRecord {
  return {
    ...envelope('inferred-state', 3),
    ...derived([fixtureId(9002)]),
    category: 'time-attention-capacity',
    condition: {
      status: 'known',
      value: {
        summary: 'Moderate capacity with a protected evening',
        drivers: ['Activity One'],
      },
    },
    confidence: fixtureConfidence(),
    unknowns: [],
    conflicts: [],
    ...overrides,
  } as InferredStateRecord;
}

export function aTrajectory(overrides: Partial<TrajectoryRecord> = {}): TrajectoryRecord {
  return {
    ...envelope('trajectory', 4),
    ...derived([fixtureId(9003)]),
    category: 'career-work-learning',
    attribute: 'focused-hours-per-week',
    window: WINDOW,
    direction: 'improving',
    confidence: fixtureConfidence(),
    observationRecordIds: [fixtureId(9004)],
    ...overrides,
  } as TrajectoryRecord;
}

/* -------------------------------------------------------------------------- */
/* Direction                                                                   */
/* -------------------------------------------------------------------------- */

export function aNorthStar(overrides: Partial<NorthStarRecord> = {}): NorthStarRecord {
  return {
    ...envelope('north-star', 5),
    ...OBSERVED,
    statement: 'Build durable capability without burning out',
    ...overrides,
  } as NorthStarRecord;
}

export function aGoal(overrides: Partial<GoalRecord> = {}): GoalRecord {
  return {
    ...envelope('goal', 6),
    ...OBSERVED,
    statement: 'Goal One',
    category: 'career-work-learning',
    state: 'active',
    ...overrides,
  } as GoalRecord;
}

export function aCommitment(overrides: Partial<CommitmentRecord> = {}): CommitmentRecord {
  return {
    ...envelope('commitment', 7),
    ...OBSERVED,
    statement: 'Commitment One',
    category: 'direction-and-commitments',
    state: 'active',
    nonNegotiable: false,
    ...overrides,
  } as CommitmentRecord;
}

export function aWeeklyDirection(
  overrides: Partial<WeeklyDirectionRecord> = {},
): WeeklyDirectionRecord {
  return {
    ...envelope('weekly-direction', 8),
    ...derived([fixtureId(9005)]),
    weekWindow: { start: SYNTHETIC_EPOCH, end: syntheticInstant(60 * 24 * 7) },
    proposal: {
      kind: 'focus',
      statement: 'Protect two deep-work blocks',
      categories: ['career-work-learning'],
    },
    // Unresolved until the user actually answers. Never defaulted to confirmed.
    userResponse: { status: 'unresolved', awaiting: 'user confirmation' },
    confidence: fixtureConfidence(),
    reasonTrace: ['Two commitments compete for the same window'],
    ...overrides,
  } as WeeklyDirectionRecord;
}

/* -------------------------------------------------------------------------- */
/* Decision                                                                    */
/* -------------------------------------------------------------------------- */

export function aCandidateAction(
  overrides: Partial<CandidateActionRecord> = {},
): CandidateActionRecord {
  return {
    ...envelope('candidate-action', 9),
    ...derived([fixtureId(9006)]),
    statement: 'Activity One for 25 minutes',
    category: 'career-work-learning',
    // Required by the final candidate contract: a candidate that cannot say what it is
    // for, or how the result would be observed, is invalid (`XDS-016`).
    intendedOutcome: 'The block is started and Goal One moves',
    observableFollowUp: { promptId: 'outcome:completed', windowHours: 24 },
    capabilityEffects: [],
    timing: {},
    durationMinutes: 25,
    friction: 'low',
    minimumViableVersion: 'Activity One for 10 minutes',
    stoppingPoint: 'Stop at the end of the block regardless of progress',
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: ['sleep'],
    ...overrides,
  } as CandidateActionRecord;
}

export function anUntreatedForecast(
  overrides: Partial<UntreatedForecastRecord> = {},
): UntreatedForecastRecord {
  return {
    ...envelope('untreated-forecast', 10),
    ...derived([fixtureId(9007)]),
    category: 'career-work-learning',
    target: 'focused-hours-this-week',
    horizon: WINDOW,
    projection: {
      status: 'known',
      value: { summary: 'Focused hours continue to decline', direction: 'declining' },
    },
    assumptions: ['Current commitments remain unchanged'],
    uncertainty: 'Two weeks of comparable evidence only',
    confidence: fixtureConfidence(),
    reasonTrace: ['Declining trend across the last three comparable weeks'],
    ...overrides,
  } as UntreatedForecastRecord;
}

export function anInterventionEffectPrediction(
  candidateActionRecordId: string,
  overrides: Partial<InterventionEffectPredictionRecord> = {},
): InterventionEffectPredictionRecord {
  return {
    ...envelope('intervention-effect-prediction', 11),
    ...derived([candidateActionRecordId]),
    candidateActionRecordId,
    horizon: WINDOW,
    effects: [
      {
        category: 'career-work-learning',
        direction: 'positive',
        magnitude: 'moderate',
        timing: 'immediate',
        crossDomain: false,
        uncertain: false,
      },
      {
        category: 'time-attention-capacity',
        direction: 'negative',
        magnitude: 'small',
        timing: 'immediate',
        crossDomain: true,
        uncertain: false,
      },
    ],
    confidence: fixtureConfidence(),
    reasonTrace: ['Comparable blocks produced similar results'],
    ...overrides,
  } as InterventionEffectPredictionRecord;
}

export function aRecommendation(
  overrides: Partial<RecommendationRecord> = {},
): RecommendationRecord {
  return {
    ...envelope('recommendation', 12),
    ...derived([fixtureId(9008)]),
    output: { kind: 'action', candidateActionRecordId: fixtureId(9009) },
    confidence: fixtureConfidence(),
    reasonTrace: ['Fits the available window and no protected context is active'],
    consideredCandidateActionIds: [fixtureId(9009), fixtureId(9010)],
    whatChanged: ['A commitment was completed, freeing 25 minutes'],
    ...overrides,
  } as RecommendationRecord;
}

export function aSilentRecommendation(): RecommendationRecord {
  return aRecommendation({
    output: { kind: 'deliberate-silence', rationale: 'No action justifies interrupting now' },
    consideredCandidateActionIds: [],
  });
}

/* -------------------------------------------------------------------------- */
/* What happened                                                               */
/* -------------------------------------------------------------------------- */

export function anExecution(
  recommendationRecordId: string,
  overrides: Partial<ExecutionRecord> = {},
): ExecutionRecord {
  return {
    ...envelope('execution', 13),
    ...OBSERVED,
    recommendationRecordId,
    state: 'executed',
    executedWindow: WINDOW,
    ...overrides,
  } as ExecutionRecord;
}

export function anOutcome(overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    ...envelope('outcome', 14),
    ...OBSERVED,
    category: 'career-work-learning',
    target: 'focused-hours-this-week',
    outcomeWindow: WINDOW,
    result: {
      status: 'known',
      value: { summary: 'Focused hours rose slightly', direction: 'improved' },
    },
    observationRecordIds: [fixtureId(9011)],
    ...overrides,
  } as OutcomeRecord;
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                  */
/* -------------------------------------------------------------------------- */

export function aForecastEvaluation(
  untreatedForecastRecordId: string,
  overrides: Partial<ForecastEvaluationRecord> = {},
): ForecastEvaluationRecord {
  return {
    ...envelope('forecast-evaluation', 15),
    ...derived([untreatedForecastRecordId]),
    untreatedForecastRecordId,
    verdict: 'unresolved',
    confidence: fixtureConfidence({ label: 'insufficient-evidence' }),
    reasonTrace: ['Outcome window has not closed'],
    ...overrides,
  } as ForecastEvaluationRecord;
}

export function aRecommendationEffectEvaluation(
  recommendationRecordId: string,
  executionRecordId: string,
  overrides: Partial<RecommendationEffectEvaluationRecord> = {},
): RecommendationEffectEvaluationRecord {
  return {
    ...envelope('recommendation-effect-evaluation', 16),
    ...derived([recommendationRecordId, executionRecordId]),
    recommendationRecordId,
    executionRecordId,
    executionStateAtEvaluation: 'executed',
    outcomeRecordId: fixtureId(9012),
    verdict: 'partially-supported',
    confoundingAssessment: { risk: 'moderate', factors: ['Workload also fell that week'] },
    confidence: fixtureConfidence(),
    reasonTrace: ['Improvement is consistent but confounded'],
    ...overrides,
  } as RecommendationEffectEvaluationRecord;
}

/* -------------------------------------------------------------------------- */
/* Questions                                                                   */
/* -------------------------------------------------------------------------- */

export function aQuestion(overrides: Partial<QuestionRecord> = {}): QuestionRecord {
  return {
    ...envelope('question', 17),
    ...derived([fixtureId(9013)]),
    prompt: 'Is the evening block still protected this week?',
    category: 'time-attention-capacity',
    couldChange: ['candidate-eligibility', 'recommendation'],
    whyItMatters: 'It decides whether any evening action can be suggested at all',
    ...overrides,
  } as QuestionRecord;
}

export function aQuestionAnswer(
  questionRecordId: string,
  overrides: Partial<QuestionAnswerRecord> = {},
): QuestionAnswerRecord {
  return {
    ...envelope('question-answer', 18),
    ...OBSERVED,
    questionRecordId,
    answer: { status: 'known', value: { kind: 'boolean', value: true } },
    ...overrides,
  } as QuestionAnswerRecord;
}

/**
 * A learned belief (Phase 5).
 *
 * Deliberately `forming` with `early-signal`: the schema refuses the top label
 * without prospective validation, and a fixture that quietly satisfied that would be
 * modelling the exception rather than the ordinary case.
 */
export function aLearnedBelief(
  supportingEvaluationId: string,
  overrides: Partial<LearnedBeliefRecord> = {},
): LearnedBeliefRecord {
  return {
    ...envelope('learned-belief', 30),
    ...derived([supportingEvaluationId]),
    statement: 'Focused blocks earlier in the day are followed by longer sessions',
    status: 'forming',
    categories: ['career-work-learning'],
    applicability: { contexts: [], note: 'Weekdays only' },
    confidence: fixtureConfidence({ label: 'early-signal' }),
    supportingEvaluationIds: [supportingEvaluationId],
    contradictingEvaluationIds: [],
    prospectivelyValidated: false,
    history: [
      {
        change: 'formed',
        at: syntheticInstant(30),
        because: 'Two comparable episodes pointed the same way',
        evaluationRecordIds: [supportingEvaluationId],
      },
    ],
    ...overrides,
  } as LearnedBeliefRecord;
}

/** A domain preference (Phase 7 Prompt 8A). */
export function aDomainPreference(
  overrides: Partial<DomainPreferenceRecord> = {},
): DomainPreferenceRecord {
  return {
    ...envelope('domain-preference', 34),
    ...OBSERVED,
    domainId: 'career-and-learning',
    state: 'enabled',
    ...overrides,
  } as DomainPreferenceRecord;
}

/**
 * A skill claim (Prompt 8C).
 *
 * Unsupported by default, because that is the normal state of a new claim and the one
 * the export rule cares about.
 */
export function aSkillClaim(overrides: Partial<SkillClaimRecord> = {}): SkillClaimRecord {
  return {
    ...envelope('skill-claim', 36),
    ...OBSERVED,
    statement: 'I can set up Activity One end to end',
    topic: 'Topic One',
    intendedUse: 'interview',
    supportingRecordIds: [],
    state: 'active',
    ...overrides,
  } as SkillClaimRecord;
}

/**
 * One milestone answer (Prompt 8D).
 *
 * The milestone text lives in the catalogue, not here, and no fixture anywhere in this
 * repository contains a real child's name — the display name is owner data that never
 * leaves their device.
 */
export function aMilestoneObservation(
  overrides: Partial<MilestoneObservationRecord> = {},
): MilestoneObservationRecord {
  return {
    ...envelope('milestone-observation', 30),
    ...OBSERVED,
    privacy: 'child',
    milestoneId: 'points-to-show',
    checklistSource: 'General guidance (built in)',
    checklistVersion: '2026-08',
    status: 'yes',
    ...overrides,
  } as MilestoneObservationRecord;
}

/**
 * One surface permission (Prompt 8E).
 *
 * Granting, because a fixture of a revocation would be a fixture of the default. The
 * default is that nothing is granted and no record exists at all.
 */
export function aSurfacePermission(
  overrides: Partial<SurfacePermissionRecord> = {},
): SurfacePermissionRecord {
  return {
    ...envelope('surface-permission', 34),
    ...OBSERVED,
    privacy: 'relationship',
    topic: 'relationship-detail',
    surface: 'weekly-scan',
    granted: true,
    ...overrides,
  } as SurfacePermissionRecord;
}

/**
 * One thing the owner named (Prompt 8F).
 *
 * A practice, because that is the kind other records point at. The statement is neutral
 * synthetic text — no fixture in this repository asserts anything about what anyone
 * believes.
 */
export function aFaithAnchor(overrides: Partial<FaithAnchorRecord> = {}): FaithAnchorRecord {
  return {
    ...envelope('faith-anchor', 38),
    ...OBSERVED,
    privacy: 'faith',
    kind: 'practice',
    statement: 'Ten quiet minutes before the house wakes up',
    state: 'active',
    ...overrides,
  } as FaithAnchorRecord;
}

/**
 * A standing stance on a move (v3.3, section I).
 *
 * `blocked-here` by default rather than `forbidden`, so the fixture exercises the case
 * that has to carry a context alongside it — the one where getting it wrong turns "not at
 * my desk" into "never".
 */
export function aMovePreference(
  overrides: Partial<MovePreferenceRecord> = {},
): MovePreferenceRecord {
  return {
    ...envelope('move-preference', 41),
    ...OBSERVED,
    engineCandidateId: 'health:meditate',
    stance: 'blocked-here',
    inContext: { setting: 'work', privacy: 'public' },
    ...overrides,
  } as MovePreferenceRecord;
}

/** A guide session (Phase 6). Completed with nothing skipped. */
export function aGuideSession(
  producedRecordIds: readonly string[] = [],
  overrides: Partial<GuideSessionRecord> = {},
): GuideSessionRecord {
  return {
    ...envelope('guide-session', 32),
    ...OBSERVED,
    kind: 'morning',
    depth: '30',
    outcome: 'completed',
    promptIdsAnswered: ['state:energy'],
    promptIdsSkipped: [],
    producedRecordIds: [...producedRecordIds],
    ...overrides,
  } as GuideSessionRecord;
}

/**
 * One valid record of every family, for coverage-style assertions.
 *
 * `records.test.ts` asserts that this covers every registered family, so activating a
 * family without a fixture fails rather than quietly going untested — which is how
 * `learned-belief` went unfixtured through Phase 5.
 */
export function oneOfEveryFamily(): Record<string, unknown> {
  const observation = anObservation();
  const candidate = aCandidateAction();
  const recommendation = aRecommendation();
  const execution = anExecution(recommendation.recordId);
  const forecast = anUntreatedForecast();
  const question = aQuestion();
  const effectEvaluation = aRecommendationEffectEvaluation(
    recommendation.recordId,
    execution.recordId,
  );

  return {
    observation,
    'observation-correction': anObservationCorrection(observation.recordId),
    'context-snapshot': aContextSnapshot(),
    'inferred-state': anInferredState(),
    trajectory: aTrajectory(),
    'north-star': aNorthStar(),
    goal: aGoal(),
    'weekly-direction': aWeeklyDirection(),
    commitment: aCommitment(),
    'candidate-action': candidate,
    'untreated-forecast': forecast,
    'intervention-effect-prediction': anInterventionEffectPrediction(candidate.recordId),
    recommendation,
    execution,
    outcome: anOutcome(),
    'forecast-evaluation': aForecastEvaluation(forecast.recordId),
    'recommendation-effect-evaluation': effectEvaluation,
    'life-context-change': aLifeContextChange(),
    question,
    'question-answer': aQuestionAnswer(question.recordId),
    'learned-belief': aLearnedBelief(effectEvaluation.recordId),
    'guide-session': aGuideSession([observation.recordId]),
    'domain-preference': aDomainPreference(),
    'skill-claim': aSkillClaim(),
    'milestone-observation': aMilestoneObservation(),
    'surface-permission': aSurfacePermission(),
    'faith-anchor': aFaithAnchor(),
    'move-preference': aMovePreference(),
  };
}
