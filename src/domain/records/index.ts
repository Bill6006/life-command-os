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
import { guideSessionRecord, type GuideSessionRecord } from './guides';
import { domainPreferenceRecord, type DomainPreferenceRecord } from './domains';
import { skillClaimRecord, type SkillClaimRecord } from './career';
import { milestoneObservationRecord, type MilestoneObservationRecord } from './fatherhood';
import { surfacePermissionRecord, type SurfacePermissionRecord } from './permissions';
import { faithAnchorRecord, type FaithAnchorRecord } from './faith';
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
export * from './scales';
export * from './guides';
export * from './domains';
export * from './career';
export * from './fatherhood';
export * from './permissions';
export * from './faith';

/**
 * Twenty-seven canonical record families.
 *
 * The twenty of the first vertical slice, plus `learned-belief` (**Phase 5**),
 * `guide-session` (**Phase 6**), `domain-preference` (**Prompt 8A**), `skill-claim`
 * (**Prompt 8C**), `milestone-observation` (**Prompt 8D**), `surface-permission`
 * (**Prompt 8E**), and `faith-anchor` (**Prompt 8F**). Each was deliberately absent
 * until there was behaviour for it to describe.
 *
 * `guide-session` is canonical rather than derived because it cannot be
 * reconstructed from the observations it produced: a guide that legitimately asked
 * nothing new leaves no observations, and "I checked in and nothing had changed" is
 * a different fact from "I never opened it".
 *
 * `domain-preference` is canonical because switching an area of life on or off is the
 * owner's decision with a date and a reason, and it belongs in a backup. It carries
 * **no domain content** — every fact a domain shows still comes from the shared
 * records, which is what stops seven domains becoming seven databases.
 *
 * `skill-claim` is the **first genuinely domain-specific family**, and it earns that
 * by being irreducible: what the owner would claim about themselves cannot be derived
 * from observations, and the gap between it and what the evidence supports is the most
 * useful thing the career slice has to say. It carries no assertion of truth — see
 * `career.ts`.
 *
 * `milestone-observation` is irreducible for a different reason: an answer against a
 * developmental checklist is meaningless without which list and which revision it was
 * answered against, and checklists get revised. See `fatherhood.ts`.
 *
 * `surface-permission` is the only one that is not about the owner's life at all. It
 * decides what the product may show **without being asked**, so its topic and surface
 * are enums rather than strings: a permission that cannot be stated incorrectly is
 * better than one that merely fails closed when mistyped. See `permissions.ts`.
 *
 * Domain content families arrive one at a time with their slice. Adding one early is a
 * stop condition (`LEAN-001`); Prompt 8B needed none, and this is 8C's only one.
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
  'guide-session',
  'domain-preference',
  'skill-claim',
  'milestone-observation',
  'surface-permission',
  'faith-anchor',
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
  | LearnedBeliefRecord
  | GuideSessionRecord
  | DomainPreferenceRecord
  | SkillClaimRecord
  | MilestoneObservationRecord
  | SurfacePermissionRecord
  | FaithAnchorRecord;

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
  'guide-session': guideSessionRecord,
  'domain-preference': domainPreferenceRecord,
  'skill-claim': skillClaimRecord,
  'milestone-observation': milestoneObservationRecord,
  'surface-permission': surfacePermissionRecord,
  'faith-anchor': faithAnchorRecord,
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
  'guide-session',
  'domain-preference',
  'skill-claim',
  'milestone-observation',
  'surface-permission',
  'faith-anchor',
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

/**
 * Parses a record, quarantining top-level fields this version does not understand.
 *
 * Only the import path uses this. A backup written by a **newer** version of the app
 * carries fields these schemas have never heard of, and because every family schema
 * is strict, plain parsing rejects the whole record — which would mean a restore that
 * silently refuses your own data, or worse, one that drops the parts it cannot read.
 *
 * So unrecognised top-level keys are moved into `unknownFields` and the record is
 * parsed again. They survive storage, export, and rollback untouched (LEG-152), and
 * are put back at the top level when the file is written out.
 *
 * **Top level only.** An unknown key nested inside `value` or `confidence` is still a
 * rejection, because moving it would change the meaning of a field this version does
 * claim to understand. That boundary is deliberate rather than an oversight.
 */
export function parseWithUnknownFieldQuarantine(input: unknown): ParseResult {
  const direct = parseCanonicalRecord(input);
  if (direct.ok) return direct;
  if (direct.reason !== 'schema-violation') return direct;

  const candidate = input as Record<string, unknown> & { recordType?: unknown };
  if (!isRecordType(candidate.recordType)) return direct;

  const parsed = RECORD_SCHEMAS[candidate.recordType].safeParse(input);
  if (parsed.success) return direct;

  const unrecognised = parsed.error.issues.flatMap((issue) =>
    issue.code === 'unrecognized_keys' && issue.path.length === 0
      ? (issue as unknown as { keys: string[] }).keys
      : [],
  );
  if (unrecognised.length === 0) return direct;

  const quarantined: Record<string, unknown> = {
    ...(candidate['unknownFields'] as Record<string, unknown> | undefined),
  };
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (unrecognised.includes(key)) quarantined[key] = value;
    else cleaned[key] = value;
  }
  cleaned['unknownFields'] = quarantined;

  return parseCanonicalRecord(cleaned);
}

/** Puts quarantined fields back at the top level, for writing a file out. */
export function withUnknownFieldsRestored(record: CanonicalRecord): unknown {
  const source = record as unknown as Record<string, unknown>;
  const unknown = source['unknownFields'] as Record<string, unknown> | undefined;
  if (unknown === undefined) return record;
  const rest: Record<string, unknown> = { ...source };
  delete rest['unknownFields'];
  return { ...rest, ...unknown };
}
