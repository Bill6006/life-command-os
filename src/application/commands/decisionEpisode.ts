import {
  newRecordId,
  RECORD_SCHEMA_VERSION,
  type CanonicalRecord,
  type ProtectedContext,
} from '../../domain/records';
import { OUTCOME_PROMPTS, UNSURE } from '../../domain/prompts/definitions';
import type { EpisodeResult, RecommendedAction } from '../../intelligence';
import { localTimeContextFor, observationDrafts, type AnsweredPrompt } from './capture';
import { writeRecords, type WriteResult } from './writeRecord';

/**
 * The decision episode, written down (Prompt 7A tasks 2–4).
 *
 * Until now the engine computed a recommendation on every render and nothing about it
 * survived a reload. These commands persist the chain the product is built on —
 * recommendation, execution or decline, constraint, outcome — as canonical records, so
 * that what the app proposed last Tuesday is still inspectable next Tuesday.
 *
 * **Two separations are preserved with some care here**, because they are exactly the
 * ones that quietly collapse in systems like this:
 *
 *   - *Starting is not executing.* Pressing Start writes an execution in the
 *     `unknown-execution` state. It opens the outcome window so the evening guide can
 *     follow up, and it claims nothing about what happened. The real state is written
 *     later, as a superseding record, when the owner reports it.
 *   - *Completing is not an outcome.* "Did you finish it?" describes the execution.
 *     Whether anything changed afterwards is a separate observable question, and if
 *     the owner does not answer one, the outcome stays `unresolved`. Finishing an
 *     action is never quietly promoted into evidence that the action helped.
 */

/* -------------------------------------------------------------------------- */
/* Declining                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What a decline actually constrains.
 *
 * A decline is a fact about circumstances, never about the owner and never about the
 * recommendation's quality (`OWN-033`, `XDS-030`). Each reason therefore maps to a
 * constraint the engine can act on, and to nothing else.
 *
 * `time-unclear` deliberately makes free time *unresolved* rather than guessing a
 * smaller number. The engine's honest response to unknown time is to ask how much
 * there is — which is the recomputation the owner wanted when they said "not now".
 */
export type DeclineConstraint =
  | { readonly kind: 'time-unclear' }
  | { readonly kind: 'protected'; readonly context: ProtectedContext }
  | { readonly kind: 'capacity'; readonly level: 'depleted' | 'low' }
  | { readonly kind: 'preference' };

export interface DeclineReason {
  readonly id: string;
  readonly label: string;
  readonly constraint: DeclineConstraint;
}

export const DECLINE_REASONS: readonly DeclineReason[] = [
  { id: 'no-time', label: 'Not enough time', constraint: { kind: 'time-unclear' } },
  {
    id: 'low-physical-energy',
    label: 'Low physical energy',
    constraint: { kind: 'capacity', level: 'depleted' },
  },
  {
    id: 'low-mental-energy',
    label: 'Low mental energy',
    constraint: { kind: 'capacity', level: 'low' },
  },
  { id: 'sleepy', label: 'Too sleepy', constraint: { kind: 'capacity', level: 'depleted' } },
  {
    id: 'pain-or-symptom',
    label: 'Pain or a symptom',
    constraint: { kind: 'capacity', level: 'depleted' },
  },
  {
    id: 'responsibility',
    label: 'Looking after someone',
    constraint: { kind: 'protected', context: 'caregiving' },
  },
  {
    id: 'family-time',
    label: 'Family time',
    constraint: { kind: 'protected', context: 'family' },
  },
  {
    id: 'in-transit',
    label: 'Travelling',
    constraint: { kind: 'protected', context: 'commute' },
  },
  {
    id: 'not-relevant',
    label: 'Not the right action',
    constraint: { kind: 'preference' },
  },
];

export function declineReasonById(id: string): DeclineReason {
  const found = DECLINE_REASONS.find((reason) => reason.id === id);
  if (found === undefined) throw new Error(`Unknown decline reason: ${id}`);
  return found;
}

/* -------------------------------------------------------------------------- */
/* Persisting the decision                                                     */
/* -------------------------------------------------------------------------- */

export type DecisionCommandResult =
  | { readonly ok: true; readonly episodeId: string; readonly executionRecordId: string }
  | { readonly ok: false; readonly reason: string; readonly issues: readonly string[] };

function firstFailure(results: readonly WriteResult[]): DecisionCommandResult | undefined {
  const failure = results.find((result) => !result.ok);
  return failure === undefined
    ? undefined
    : { ok: false, reason: failure.reason, issues: failure.issues };
}

/**
 * The records the recommendation was derived from.
 *
 * Never empty by the time it is used: the candidate action is always among the
 * recommendation's inputs, and the candidate itself cites the state evidence or the
 * goal it came from. A derived record that cannot say what it was built on does not
 * validate, which is the point.
 */
function basisFor(episode: EpisodeResult, action: RecommendedAction): readonly string[] {
  const basis = [
    ...(action.candidate.goalId === undefined ? [] : [action.candidate.goalId]),
    ...episode.state.basisRecordIds,
  ];
  return basis.length > 0 ? basis : [];
}

interface PersistedDecision {
  readonly episodeId: string;
  readonly candidateRecordId: string;
  readonly recommendationRecordId: string;
  readonly drafts: readonly unknown[];
}

/**
 * Builds the candidate-action and recommendation records for a live episode.
 *
 * Returns `undefined` when the episode has nothing to persist — either the engine did
 * not emit an action, or there is no evidence to cite as the basis. Both are ordinary
 * states, not errors: an app with no records yet has no decision to write down.
 */
function decisionDrafts(episode: EpisodeResult, now: Date): PersistedDecision | undefined {
  if (episode.output.kind !== 'action') return undefined;

  const action = episode.output;
  const basis = basisFor(episode, action);
  if (basis.length === 0) return undefined;

  const episodeId = newRecordId();
  const candidateRecordId = newRecordId();
  const recommendationRecordId = newRecordId();
  const instant = now.toISOString();
  const localTime = localTimeContextFor(now);

  const common = {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime,
    source: 'system-derived' as const,
    privacy: 'general' as const,
    decisionEpisodeId: episodeId,
  };

  const confidence = {
    label: action.confidence.label,
    dimensions: action.confidence.dimensions.map((dimension) => ({
      dimension: dimension.dimension,
      assessment: dimension.assessment,
      ...(dimension.note === '' ? {} : { note: dimension.note }),
    })),
    basisRecordIds: [...basis],
  };

  const candidate = {
    ...common,
    recordId: candidateRecordId,
    recordType: 'candidate-action',
    provenance: { method: 'derived', derivedFromRecordIds: [...basis] },
    statement: action.candidate.statement,
    category: action.candidate.category,
    intendedOutcome: action.candidate.intendedOutcome,
    observableFollowUp: {
      promptId: action.candidate.followUp.promptId,
      windowHours: action.candidate.followUp.windowHours,
    },
    capabilityEffects: [...action.candidate.capabilityEffects],
    ...(action.candidate.originDomainId === undefined
      ? {}
      : { originDomainId: action.candidate.originDomainId }),
    ...(action.northStar === undefined ? {} : { northStarLink: action.northStar.relevance }),
    timing: {},
    durationMinutes: action.candidate.durationMinutes,
    friction: action.candidate.friction,
    minimumViableVersion: action.candidate.minimumVersion,
    fallback: action.candidate.fallback,
    stoppingPoint: action.candidate.stoppingPoint,
    risk: action.candidate.risk,
    reversibility: action.candidate.reversibility,
    blockedByProtectedContexts: [...action.candidate.blockedByProtectedContexts],
  };

  const recommendation = {
    ...common,
    recordId: recommendationRecordId,
    recordType: 'recommendation',
    provenance: {
      method: 'derived',
      derivedFromRecordIds: [candidateRecordId, ...basis],
    },
    output: { kind: 'action', candidateActionRecordId: candidateRecordId },
    confidence,
    reasonTrace: [...action.reasonTrace],
    ...(action.northStar === undefined
      ? {}
      : { northStarRelevance: action.northStar.relevance }),
    consideredCandidateActionIds: [],
    whatChanged: episode.whatChanged.changes.map((change) => change.change),
  };

  return {
    episodeId,
    candidateRecordId,
    recommendationRecordId,
    drafts: [candidate, recommendation],
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Start.
 *
 * Writes the decision and opens an outcome window. The execution state is
 * `unknown-execution` because at this instant that is the truth: the owner has said
 * they are beginning, and nothing has been observed about whether they did.
 */
export async function startRecommendation(
  episode: EpisodeResult,
  now: Date,
): Promise<DecisionCommandResult> {
  const decision = decisionDrafts(episode, now);
  if (decision === undefined) {
    return { ok: false, reason: 'nothing-to-record', issues: ['No action to start'] };
  }

  const executionRecordId = newRecordId();
  const instant = now.toISOString();

  const execution = {
    recordId: executionRecordId,
    recordType: 'execution',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    decisionEpisodeId: decision.episodeId,
    recommendationRecordId: decision.recommendationRecordId,
    state: 'unknown-execution',
    fidelityNote: episode.output.kind === 'action' ? episode.output.candidate.statement : '',
  };

  const results = await writeRecords([...decision.drafts, execution]);
  return (
    firstFailure(results) ?? {
      ok: true,
      episodeId: decision.episodeId,
      executionRecordId,
    }
  );
}

/**
 * Can't Now.
 *
 * Records the decline **and** the constraint it implies, as separate facts. The
 * decline is an execution in the `not-executed` state, which the evaluation layer
 * already refuses to read as evidence about the recommendation. The constraint is a
 * new context snapshot, which changes what the engine may propose next.
 */
export async function declineRecommendation(
  episode: EpisodeResult,
  reason: DeclineReason,
  now: Date,
): Promise<DecisionCommandResult> {
  const decision = decisionDrafts(episode, now);
  if (decision === undefined) {
    return { ok: false, reason: 'nothing-to-record', issues: ['No action to decline'] };
  }

  const executionRecordId = newRecordId();
  const instant = now.toISOString();
  const localTime = localTimeContextFor(now);

  const observed = {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime,
    source: 'user-entry' as const,
    provenance: { method: 'direct-report' as const },
    privacy: 'general' as const,
    decisionEpisodeId: decision.episodeId,
  };

  const execution = {
    ...observed,
    recordId: executionRecordId,
    recordType: 'execution',
    recommendationRecordId: decision.recommendationRecordId,
    state: 'not-executed',
    declineReason: reason.label,
  };

  const existing = episode.state;
  const constraint = reason.constraint;

  const availableMinutes =
    constraint.kind === 'time-unclear'
      ? { status: 'unresolved', awaiting: 'How much time is actually free' }
      : existing.availableMinutes;

  const capacity =
    constraint.kind === 'capacity'
      ? { status: 'known', value: constraint.level }
      : existing.capacity;

  const protectedContexts =
    constraint.kind === 'protected'
      ? [...new Set([...existing.protectedContexts, constraint.context])]
      : [...existing.protectedContexts];

  const contextSnapshot = {
    ...observed,
    recordId: newRecordId(),
    recordType: 'context-snapshot',
    capacity,
    availableMinutes,
    protectedContexts,
    note: `Recorded when the suggestion was declined: ${reason.label}`,
  };

  const results = await writeRecords([...decision.drafts, execution, contextSnapshot]);
  return (
    firstFailure(results) ?? { ok: true, episodeId: decision.episodeId, executionRecordId }
  );
}

/* -------------------------------------------------------------------------- */
/* Outcome                                                                     */
/* -------------------------------------------------------------------------- */

export interface OutcomeReport {
  readonly executionRecordId: string;
  readonly recommendationRecordId: string;
  readonly decisionEpisodeId: string | undefined;
  readonly category:
    'time-attention-capacity' | 'direction-and-commitments' | 'career-work-learning';
  readonly target: string;
  readonly openedAt: string;
  /** Answers to the observable follow-ups. Any of them may be absent. */
  readonly answers: readonly AnsweredPrompt[];
}

function answerFor(report: OutcomeReport, promptId: string): AnsweredPrompt | undefined {
  return report.answers.find((entry) => entry.prompt.promptId === promptId);
}

/**
 * The answer to a choice question, normalised.
 *
 * "I cannot tell" reaches this two ways — the dedicated control, and `Unsure` in the
 * option list — and they mean the same thing. Reading only one of them was a real
 * defect: pressing the button that says "I cannot tell" produced `unresolved` (nothing
 * reported) instead of `unknown` (looked, and could not say), which are different
 * claims about the evidence.
 */
function choiceValue(entry: AnsweredPrompt | undefined): string | undefined {
  if (entry === undefined) return undefined;
  if (entry.answer.kind === 'unsure') return UNSURE;
  if (entry.answer.kind === 'choice') return entry.answer.choice;
  return undefined;
}

/**
 * Records what happened after an execution.
 *
 * Writes three things and keeps them apart:
 *
 *   1. **A superseding execution** carrying what the owner reported about carrying the
 *      action out — finished, cut short, or still not known. The original record is
 *      untouched; the correction points back at it.
 *   2. **The observations themselves**, one per answered follow-up, including any
 *      explicit "Unsure".
 *   3. **An outcome**, whose result is derived *only* from observable questions about
 *      what changed — never from whether the action was completed. With no such
 *      answer the outcome is `unresolved`, and unresolved is where it stays until
 *      something is actually observed.
 */
export async function recordOutcome(
  report: OutcomeReport,
  now: Date,
): Promise<DecisionCommandResult> {
  const instant = now.toISOString();
  const localTime = localTimeContextFor(now);
  const episodeId = report.decisionEpisodeId;

  const observationParts = observationDrafts(report.answers, now, episodeId);

  const completed = choiceValue(answerFor(report, OUTCOME_PROMPTS.completed.promptId));
  const durationEntry = answerFor(report, OUTCOME_PROMPTS.duration.promptId);
  const durationMinutes =
    durationEntry?.answer.kind === 'minutes' ? durationEntry.answer.minutes : undefined;

  const executionState =
    completed === 'Yes'
      ? 'executed'
      : completed === 'No'
        ? 'partially-executed'
        : 'unknown-execution';

  const openedMs = Date.parse(report.openedAt);
  const endMs = Math.max(
    openedMs + 60_000,
    durationMinutes === undefined ? now.getTime() : openedMs + durationMinutes * 60_000,
  );

  const observedEnvelope = {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime,
    source: 'user-correction' as const,
    provenance: { method: 'direct-report' as const },
    privacy: 'general' as const,
    ...(episodeId === undefined ? {} : { decisionEpisodeId: episodeId }),
  };

  const supersedingExecution = {
    ...observedEnvelope,
    recordId: newRecordId(),
    recordType: 'execution',
    supersedesRecordId: report.executionRecordId,
    recommendationRecordId: report.recommendationRecordId,
    state: executionState,
    ...(executionState === 'unknown-execution'
      ? {}
      : {
          executedWindow: {
            start: new Date(openedMs).toISOString(),
            end: new Date(endMs).toISOString(),
          },
        }),
  };

  /*
   * The outcome's direction comes from what was observed to change, and from nothing
   * else. "Still getting in the way?" answers it; "did you finish?" does not.
   */
  const stillInterfering = choiceValue(
    answerFor(report, OUTCOME_PROMPTS['still-interfering'].promptId),
  );

  const observationIds = observationParts.map((part) => part.recordId);

  const result =
    stillInterfering === 'No'
      ? {
          status: 'known',
          value: {
            summary: 'The problem is no longer getting in the way',
            direction: 'improved',
          },
        }
      : stillInterfering === 'Yes'
        ? {
            status: 'known',
            value: {
              summary: 'The problem is still getting in the way',
              direction: 'unchanged',
            },
          }
        : stillInterfering === UNSURE
          ? { status: 'unknown', reason: 'Reported as impossible to tell' }
          : {
              status: 'unresolved',
              awaiting: 'An observation of whether anything actually changed',
            };

  const outcome = {
    ...observedEnvelope,
    source: 'user-entry' as const,
    recordId: newRecordId(),
    recordType: 'outcome',
    category: report.category,
    target: report.target,
    outcomeWindow: {
      start: new Date(openedMs).toISOString(),
      end: new Date(Math.max(endMs, now.getTime())).toISOString(),
    },
    result:
      result.status === 'known' && observationIds.length === 0
        ? {
            status: 'unresolved',
            awaiting: 'An observation of whether anything actually changed',
          }
        : result,
    observationRecordIds: observationIds,
    executionRecordId: supersedingExecution.recordId,
  };

  const results = await writeRecords([
    ...observationParts.map((part) => part.draft),
    supersedingExecution,
    outcome,
  ]);

  return (
    firstFailure(results) ?? {
      ok: true,
      episodeId: episodeId ?? '',
      executionRecordId: supersedingExecution.recordId,
    }
  );
}

/* -------------------------------------------------------------------------- */

/** Executions still waiting on an outcome, newest first. Drives the evening follow-up. */
export function openEpisodes(records: readonly CanonicalRecord[]): readonly {
  readonly executionRecordId: string;
  readonly recommendationRecordId: string;
  readonly decisionEpisodeId: string | undefined;
  readonly openedAt: string;
  readonly statement: string;
}[] {
  const outcomes = new Set(
    records.flatMap((record) =>
      record.recordType === 'outcome' && record.executionRecordId !== undefined
        ? [record.executionRecordId]
        : [],
    ),
  );
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesRecordId === undefined ? [] : [record.supersedesRecordId],
    ),
  );

  return records
    .flatMap((record) =>
      record.recordType === 'execution' &&
      record.state !== 'not-executed' &&
      !outcomes.has(record.recordId) &&
      !superseded.has(record.recordId)
        ? [
            {
              executionRecordId: record.recordId,
              recommendationRecordId: record.recommendationRecordId,
              decisionEpisodeId: record.decisionEpisodeId,
              openedAt: record.occurredAt,
              statement: record.fidelityNote ?? 'the action you started',
            },
          ]
        : [],
    )
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}
