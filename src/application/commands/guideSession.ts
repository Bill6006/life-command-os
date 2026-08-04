import {
  newRecordId,
  RECORD_SCHEMA_VERSION,
  type GuideDepth,
  type GuideKind,
  type GuideOutcome,
} from '../../domain/records';
import { domainDefinition, type DomainId } from '../../domain/domains/definitions';
import { captureAttribute } from '../../intelligence/domains/captureRouting';
import type { EpisodeResult } from '../../intelligence';
import { localTimeContextFor, observationDrafts, type AnsweredPrompt } from './capture';
import { writeRecord, writeRecords, type WriteResult } from './writeRecord';

/**
 * Guide sessions, weekly responses, and Quick Capture (Prompt 7A tasks 10, 15, 16).
 *
 * Everything a guide produces is written in **one transaction**: the observations and
 * the session record that cites them. A half-written guide — answers stored but the
 * session lost, or the reverse — would be a small, permanent lie about what happened,
 * and it is exactly the failure an append-oriented store makes easy to create by
 * accident.
 */

export interface GuideCompletion {
  readonly kind: GuideKind;
  readonly depth: GuideDepth;
  readonly outcome: GuideOutcome;
  readonly answers: readonly AnsweredPrompt[];
  /** Prompts the owner passed over. Costless, and recorded as such. */
  readonly skippedPromptIds: readonly string[];
  /** Required for `snoozed`. A snooze with no return date is a silent drop. */
  readonly remindAt?: string | undefined;
}

export type GuideCommandResult =
  | {
      readonly ok: true;
      readonly sessionRecordId: string;
      readonly writtenRecordIds: readonly string[];
    }
  | { readonly ok: false; readonly reason: string; readonly issues: readonly string[] };

function firstFailure(results: readonly WriteResult[]): GuideCommandResult | undefined {
  const failure = results.find((result) => !result.ok);
  return failure === undefined
    ? undefined
    : { ok: false, reason: failure.reason, issues: failure.issues };
}

/**
 * Ends a guide session and stores whatever it produced.
 *
 * Note what happens when the owner answers nothing: a session record with two empty
 * arrays is still written. That is not an empty result — it is the fact that the app
 * was opened and had nothing worth asking, which is the outcome the interaction
 * budget is designed to produce.
 */
export async function completeGuideSession(
  completion: GuideCompletion,
  now: Date,
): Promise<GuideCommandResult> {
  const instant = now.toISOString();
  const drafts = observationDrafts(completion.answers, now);
  const answeredPromptIds = completion.answers
    .filter((entry) => entry.answer.kind !== 'not-answered')
    .map((entry) => entry.prompt.promptId);

  // A prompt cannot be both answered and skipped; the schema rejects it, so the
  // command resolves the overlap here rather than letting a race produce a failure.
  const skipped = completion.skippedPromptIds.filter((id) => !answeredPromptIds.includes(id));

  const sessionRecordId = newRecordId();
  const session = {
    recordId: sessionRecordId,
    recordType: 'guide-session',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    kind: completion.kind,
    depth: completion.depth,
    outcome: completion.outcome,
    promptIdsAnswered: answeredPromptIds,
    promptIdsSkipped: skipped,
    producedRecordIds: drafts.map((draft) => draft.recordId),
    ...(completion.remindAt === undefined ? {} : { remindAt: completion.remindAt }),
  };

  const results = await writeRecords([...drafts.map((draft) => draft.draft), session]);
  return (
    firstFailure(results) ?? {
      ok: true,
      sessionRecordId,
      writtenRecordIds: drafts.map((draft) => draft.recordId),
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Weekly direction                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The four responses the Sunday Weekly Guide offers (`OWN-019`).
 *
 * Snooze and Skip are first-class answers, not refusals. Nothing downstream reads
 * either as a judgement about the owner or about the proposal.
 */
export type WeeklyResponse =
  | { readonly response: 'confirmed' }
  | { readonly response: 'adjusted'; readonly adjustedStatement: string }
  | { readonly response: 'snoozed'; readonly remindAt: string }
  | { readonly response: 'skipped'; readonly reason?: string | undefined };

export async function respondToWeeklyDirection(
  episode: EpisodeResult,
  response: WeeklyResponse,
  now: Date,
): Promise<WriteResult> {
  const weekly = episode.weeklyDirection;
  const basis = [...episode.state.basisRecordIds];
  if (basis.length === 0) {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: ['A weekly direction must cite the evidence it was proposed from'],
    };
  }

  const instant = now.toISOString();

  return writeRecord({
    recordId: newRecordId(),
    recordType: 'weekly-direction',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'system-derived',
    provenance: { method: 'derived', derivedFromRecordIds: basis },
    privacy: 'general',
    weekWindow: { start: weekly.window.start, end: weekly.window.end },
    proposal:
      weekly.kind === 'focus'
        ? {
            kind: 'focus',
            statement: weekly.proposal,
            categories: ['career-work-learning'],
          }
        : { kind: 'deliberately-quiet', rationale: weekly.proposal },
    userResponse: { status: 'known', value: response },
    confidence: {
      label: weekly.confidence.label,
      dimensions: weekly.confidence.dimensions.map((dimension) => ({
        dimension: dimension.dimension,
        assessment: dimension.assessment,
        ...(dimension.note === '' ? {} : { note: dimension.note }),
      })),
      basisRecordIds: basis,
    },
    reasonTrace: [...weekly.basedOn],
  });
}

/* -------------------------------------------------------------------------- */
/* Quick Capture                                                               */
/* -------------------------------------------------------------------------- */

/**
 * One capture, one canonical event (`OWN-063`).
 *
 * The shell only. Domain-specific captures — a Work Win, a fatherhood moment, a
 * financial decision — arrive with their domains in Phase 7 and reuse this write path
 * rather than adding parallel ones. That is what stops the same fact being entered in
 * three places, which is the duplication the whole rebuild exists to end.
 */
export async function quickCapture(
  input: {
    readonly kind: string;
    readonly what: string;
    readonly domainId?: DomainId | undefined;
  },
  now: Date,
): Promise<WriteResult> {
  const text = input.what.trim();
  if (text === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }

  const instant = now.toISOString();
  const definition =
    input.domainId === undefined ? undefined : domainDefinition(input.domainId);

  return writeRecord({
    recordId: newRecordId(),
    recordType: 'observation',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    /*
     * A domain capture inherits its domain's classification — a fatherhood moment is
     * `child` data whatever else it is. Without one, free text about the owner's life
     * is a private note until they say otherwise.
     */
    privacy: definition?.privacy ?? 'note',
    category: definition?.reads[0] ?? 'career-work-learning',
    attribute: captureAttribute(input.kind, input.domainId),
    value: { kind: 'note', text },
  });
}
