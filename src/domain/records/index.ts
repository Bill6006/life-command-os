import type { z } from 'zod';

import {
  contextSnapshotRecord,
  lifeContextChangeRecord,
  observationCorrectionRecord,
  observationRecord,
  type ContextSnapshotRecord,
  type LifeContextChangeRecord,
  type ObservationCorrectionRecord,
  type ObservationRecord,
} from './evidence';
import {
  inferredStateRecord,
  trajectoryRecord,
  type InferredStateRecord,
  type TrajectoryRecord,
} from './state';
import {
  commitmentRecord,
  goalRecord,
  northStarRecord,
  weeklyDirectionRecord,
  type CommitmentRecord,
  type GoalRecord,
  type NorthStarRecord,
  type WeeklyDirectionRecord,
} from './direction';
import {
  candidateActionRecord,
  interventionEffectPredictionRecord,
  recommendationRecord,
  untreatedForecastRecord,
  type CandidateActionRecord,
  type InterventionEffectPredictionRecord,
  type RecommendationRecord,
  type UntreatedForecastRecord,
} from './decision';
import {
  executionRecord,
  outcomeRecord,
  type ExecutionRecord,
  type OutcomeRecord,
} from './execution';
import {
  forecastEvaluationRecord,
  recommendationEffectEvaluationRecord,
  type ForecastEvaluationRecord,
  type RecommendationEffectEvaluationRecord,
} from './evaluation';
import { learnedBeliefRecord, type LearnedBeliefRecord } from './learning';
import {
  questionAnswerRecord,
  questionRecord,
  type QuestionAnswerRecord,
  type QuestionRecord,
} from './questions';

export * from './categories';
export * from './envelope';
export * from './semantics';
export * from './evidence';
export * from './state';
export * from './direction';
export * from './decision';
export * from './execution';
export * from './evaluation';
export * from './questions';
export * from './learning';

/**
 * Twenty-one canonical record families.
 *
 * The twenty of the first vertical slice, plus `learned-belief`, **activated in
 * Phase 5** now that there is learning behaviour for it to describe. It was
 * deliberately absent until there was.
 *
 * Domain-specific families arrive one at a time in Phase 7. Adding one early is a
 * stop condition (`LEAN-001`).
 */
export const RECORD_TYPES = [
  'observation',
  'observation-correction',
  'context-snapshot',
  'inferred-state',
  'trajectory',
  'north-star',
  'goal',
  'weekly-direction',
  'commitment',
  'candidate-action',
  'untreated-forecast',
  'intervention-effect-prediction',
  'recommendation',
  'execution',
  'outcome',
  'forecast-evaluation',
  'recommendation-effect-evaluation',
  'life-context-change',
  'question',
  'question-answer',
  'learned-belief',
] as const;

export type RecordType = (typeof RECORD_TYPES)[number];

export type CanonicalRecord =
  | ObservationRecord
  | ObservationCorrectionRecord
  | ContextSnapshotRecord
  | InferredStateRecord
  | TrajectoryRecord
  | NorthStarRecord
  | GoalRecord
  | WeeklyDirectionRecord
  | CommitmentRecord
  | CandidateActionRecord
  | UntreatedForecastRecord
  | InterventionEffectPredictionRecord
  | RecommendationRecord
  | ExecutionRecord
  | OutcomeRecord
  | ForecastEvaluationRecord
  | RecommendationEffectEvaluationRecord
  | LifeContextChangeRecord
  | QuestionRecord
  | QuestionAnswerRecord
  | LearnedBeliefRecord;

/**
 * Schema per family.
 *
 * Typed as `Record<RecordType, ...>`, so adding a family to `RECORD_TYPES` without
 * registering its schema fails to compile. That matters more than it looks: an
 * unregistered family would silently bypass validation on the write path.
 */
export const RECORD_SCHEMAS: Record<RecordType, z.ZodType> = {
  observation: observationRecord,
  'observation-correction': observationCorrectionRecord,
  'context-snapshot': contextSnapshotRecord,
  'inferred-state': inferredStateRecord,
  trajectory: trajectoryRecord,
  'north-star': northStarRecord,
  goal: goalRecord,
  'weekly-direction': weeklyDirectionRecord,
  commitment: commitmentRecord,
  'candidate-action': candidateActionRecord,
  'untreated-forecast': untreatedForecastRecord,
  'intervention-effect-prediction': interventionEffectPredictionRecord,
  recommendation: recommendationRecord,
  execution: executionRecord,
  outcome: outcomeRecord,
  'forecast-evaluation': forecastEvaluationRecord,
  'recommendation-effect-evaluation': recommendationEffectEvaluationRecord,
  'life-context-change': lifeContextChangeRecord,
  question: questionRecord,
  'question-answer': questionAnswerRecord,
  'learned-belief': learnedBeliefRecord,
};

/** Families that record first-hand fact rather than system interpretation. */
export const OBSERVED_RECORD_TYPES = [
  'observation',
  'observation-correction',
  'context-snapshot',
  'north-star',
  'goal',
  'commitment',
  'execution',
  'outcome',
  'question-answer',
] as const satisfies readonly RecordType[];

export function isRecordType(value: unknown): value is RecordType {
  return typeof value === 'string' && (RECORD_TYPES as readonly string[]).includes(value);
}

export interface ParseFailure {
  readonly ok: false;
  readonly reason: 'not-an-object' | 'unknown-record-type' | 'schema-violation';
  readonly issues: readonly string[];
}

export interface ParseSuccess {
  readonly ok: true;
  readonly record: CanonicalRecord;
}

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Validates an unknown value as a canonical record.
 *
 * Dispatches on `recordType` first, which is what makes cross-concept substitution
 * fail loudly: handing an inferred state to this function while claiming it is an
 * observation does not "mostly work with extra fields" — it is rejected, because
 * every family schema is strict and every `recordType` is a literal.
 *
 * Every write path in the application goes through here. Nothing reaches IndexedDB
 * without passing it.
 */
export function parseCanonicalRecord(input: unknown): ParseResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, reason: 'not-an-object', issues: ['Expected a record object'] };
  }

  const candidate = input as { recordType?: unknown };
  if (!isRecordType(candidate.recordType)) {
    return {
      ok: false,
      reason: 'unknown-record-type',
      issues: [`Unknown record type: ${String(candidate.recordType)}`],
    };
  }

  const result = RECORD_SCHEMAS[candidate.recordType].safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: result.error.issues.map(
        (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
      ),
    };
  }

  return { ok: true, record: result.data as CanonicalRecord };
}
