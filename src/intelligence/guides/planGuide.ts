import type { CanonicalRecord, ExecutionRecord } from '../../domain/records';
import { assessFreshness } from '../../domain/records';
import type { GuideDepth, GuideKind } from '../../domain/records/guides';
import { domainDefinition, type DomainId } from '../../domain/domains/definitions';
import {
  ALL_PROMPTS,
  CONTEXT_PROMPTS,
  FOOD_PROMPTS,
  OUTCOME_PROMPTS,
  SLEEP_PROMPTS,
  STATE_PROMPTS,
  promptById,
  type CapturePrompt,
} from '../../domain/prompts/definitions';
import { currentObservations } from '../support';
import { outcomeWindows } from '../evaluation/outcomeWindows';

/**
 * Guide planning (`OWN-016`–`OWN-023`, Blueprint §6).
 *
 * A guide is not a form. It is a short sequence chosen from what is currently worth
 * asking, and the planner's real job is **deciding what not to ask**. A question
 * appears only when its answer could change safety, eligibility, selection, timing,
 * dose, follow-up interpretation, confidence, or the weekly direction (`UX-007`).
 *
 * Deterministic and storage-free: records in, plan out. The same records at the same
 * instant always produce the same plan, which is what lets the tests assert the
 * catch-up rule rather than describe it.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * How long an answer stays current enough that re-asking would waste the owner's
 * time. Present-state readings go stale fastest; last night's sleep is settled for
 * the day.
 */
const STILL_CURRENT_MS: Record<string, number> = {
  'state:energy': 3 * HOUR_MS,
  'state:mood': 4 * HOUR_MS,
  'state:stress': 3 * HOUR_MS,
  'state:confidence': 6 * HOUR_MS,
  'state:overwhelm': 3 * HOUR_MS,
  'state:sleep-recovery': 20 * HOUR_MS,
  'state:readiness': 2 * HOUR_MS,
  'context:available-minutes': 90 * MINUTE_MS,
  'context:protected': 90 * MINUTE_MS,
};

const DEFAULT_STILL_CURRENT_MS = 12 * HOUR_MS;

/**
 * Steps per depth (`OWN-021`).
 *
 * Depth changes how many questions are worth the owner's time, never what a question
 * means. A fifteen-minute morning and a full morning record the same kinds of
 * observation and neither invents a value.
 */
export const MAX_STEPS: Record<GuideDepth, number> = { '15': 3, '30': 5, '45': 7, full: 10 };

/** The normal check-in budget (`OWN-023`, `CI-016`). */
export const NORMAL_RESPONSE_BUDGET = 5;

/** The depth a guide opens at unless the owner chooses otherwise. */
export const DEFAULT_DEPTH: GuideDepth = '30';

/**
 * Depths that count as a normal check-in.
 *
 * `45` and `full` are the owner deliberately asking for more, and are the only way to
 * exceed five responses. Nothing reaches them by default.
 */
export function isNormalDepth(depth: GuideDepth): boolean {
  return MAX_STEPS[depth] <= NORMAL_RESPONSE_BUDGET;
}

export type GuideStep =
  | {
      readonly kind: 'prompt';
      readonly prompt: CapturePrompt;
      /** The record this question is about, when it follows one up. */
      readonly aboutRecordId?: string | undefined;
      /** Shown above the question so a follow-up is not asked out of context. */
      readonly context?: string | undefined;
    }
  | { readonly kind: 'weekly-direction' };

export interface OmittedStep {
  readonly promptId: string;
  readonly because: string;
}

export interface GuidePlan {
  readonly kind: GuideKind;
  readonly depth: GuideDepth;
  readonly steps: readonly GuideStep[];
  /** What was deliberately not asked, and why. Inspectable rather than invisible. */
  readonly omitted: readonly OmittedStep[];
  readonly withinNormalBudget: boolean;
}

/* -------------------------------------------------------------------------- */

/** Prompt ids each guide considers, in decision-value order. */
const MORNING_ORDER: readonly string[] = [
  'state:sleep-recovery',
  'state:energy',
  'context:available-minutes',
  'state:readiness',
  'context:protected',
  'sleep:bedtime',
  'sleep:wake-time',
  'sleep:sleepiness',
  'sleep:onset-minutes',
  'sleep:awakenings',
  'sleep:disruption',
];

const AFTERNOON_ORDER: readonly string[] = [
  'state:energy',
  'context:available-minutes',
  'state:stress',
  'context:protected',
  'state:overwhelm',
  'state:readiness',
  'state:confidence',
];

const EVENING_TAIL: readonly string[] = [
  'state:mood',
  'food:energy-after',
  'food:digestive-response',
  'state:stress',
];

/**
 * Morning detail that stops being worth asking once the morning has passed.
 *
 * Not because it would be wrong, but because its only use — shaping *this morning's*
 * plan — has already gone, and fine-grained recall of the night hours later is poor
 * evidence. Bedtime and wake time stay: they are settled facts, and sleep duration
 * cannot be calculated without them.
 */
const CATCH_UP_DROPS: readonly string[] = [
  'sleep:onset-minutes',
  'sleep:awakenings',
  'sleep:disruption',
];

/* -------------------------------------------------------------------------- */

/** The most recent answer to a prompt, if any. */
function lastAnsweredAt(
  records: readonly CanonicalRecord[],
  attribute: string,
): string | undefined {
  return currentObservations(records)
    .filter((observation) => observation.attribute === attribute)
    .reduce<string | undefined>(
      (latest, observation) =>
        latest === undefined || observation.recordedAt > latest
          ? observation.recordedAt
          : latest,
      undefined,
    );
}

/** True when a fresh-enough answer already exists, so asking again would be noise. */
function alreadyCurrent(
  records: readonly CanonicalRecord[],
  prompt: CapturePrompt,
  now: Date,
): boolean {
  const answeredAt = lastAnsweredAt(records, prompt.attribute);
  if (answeredAt === undefined) return false;
  const window = STILL_CURRENT_MS[prompt.promptId] ?? DEFAULT_STILL_CURRENT_MS;
  return assessFreshness(answeredAt, now, window).status !== 'stale';
}

/**
 * Executions still waiting on an observable outcome.
 *
 * Open and closed windows both qualify; expired ones do not, because chasing an
 * outcome three weeks late produces recall, not observation. An expired window stays
 * unresolved — which is a true statement about the evidence, not a failure.
 */
function awaitingOutcome(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly { readonly execution: ExecutionRecord; readonly executionId: string }[] {
  const executions = new Map(
    records
      .filter((record): record is ExecutionRecord => record.recordType === 'execution')
      .map((execution) => [execution.recordId, execution]),
  );

  return outcomeWindows(records, now)
    .filter(
      (window) =>
        window.outcome === undefined &&
        window.state !== 'expired' &&
        window.executionState !== 'not-executed',
    )
    .flatMap((window) => {
      const execution = executions.get(window.executionRecordId);
      return execution === undefined
        ? []
        : [{ execution, executionId: window.executionRecordId }];
    });
}

/* -------------------------------------------------------------------------- */

/**
 * Builds the plan for one guide.
 *
 * `records` is the full local history; `now` is supplied by the caller. The planner
 * neither reads the clock nor touches storage.
 */
export function planGuide(
  kind: GuideKind,
  depth: GuideDepth,
  records: readonly CanonicalRecord[],
  now: Date,
  /** Required for `update-area`, ignored otherwise. */
  domainId?: DomainId,
): GuidePlan {
  const omitted: OmittedStep[] = [];
  const steps: GuideStep[] = [];

  /*
   * "Update state" is the owner saying something has changed. Freshness cannot rule a
   * question out there — the whole reason they pressed it is that the current answer
   * is no longer current.
   */
  const askRegardless = kind === 'quick-check-in' || kind === 'update-area';

  const consider = (
    prompt: CapturePrompt,
    extra?: { readonly aboutRecordId?: string; readonly context?: string },
  ): void => {
    if (!askRegardless && alreadyCurrent(records, prompt, now)) {
      omitted.push({
        promptId: prompt.promptId,
        because: 'A current answer already exists — asking again would not change anything',
      });
      return;
    }
    steps.push({
      kind: 'prompt',
      prompt,
      aboutRecordId: extra?.aboutRecordId,
      context: extra?.context,
    });
  };

  if (kind === 'weekly') {
    // The weekly guide proposes; it does not interrogate. One decision, four responses.
    return {
      kind,
      depth,
      steps: [{ kind: 'weekly-direction' }],
      omitted,
      withinNormalBudget: true,
    };
  }

  if (kind === 'morning' || kind === 'morning-catch-up') {
    for (const promptId of MORNING_ORDER) {
      if (kind === 'morning-catch-up' && CATCH_UP_DROPS.includes(promptId)) {
        omitted.push({
          promptId,
          because: 'Only useful first thing — the morning it would have shaped has passed',
        });
        continue;
      }
      consider(promptById(promptId));
    }
  }

  if (kind === 'afternoon' || kind === 'quick-check-in') {
    for (const promptId of AFTERNOON_ORDER) consider(promptById(promptId));
  }

  /*
   * Update This Area asks one domain's own questions, and only that domain's.
   *
   * The prompts are found by namespace rather than listed here, so a slice adds its
   * questions by naming them and this planner never needs to know a domain exists.
   */
  if (kind === 'update-area' && domainId !== undefined) {
    const definition = domainDefinition(domainId);
    const owned = ALL_PROMPTS.filter(
      (prompt) =>
        prompt.promptId === definition.updatePromptId ||
        (definition.captureNamespace !== undefined &&
          prompt.promptId.startsWith(`${definition.captureNamespace}:`)),
    );
    // The entry question first — it is the one that can change what may be suggested.
    const entry = owned.find((prompt) => prompt.promptId === definition.updatePromptId);
    if (entry !== undefined) consider(entry);
    for (const prompt of owned) {
      if (prompt.promptId !== definition.updatePromptId) consider(prompt);
    }
  }

  if (kind === 'evening') {
    // Closing loops comes first: an outcome is the scarcest evidence this app has.
    for (const { execution, executionId } of awaitingOutcome(records, now)) {
      const context = `Following up: ${execution.fidelityNote ?? 'the action you started'}`;
      consider(OUTCOME_PROMPTS.completed, { aboutRecordId: executionId, context });
      consider(OUTCOME_PROMPTS.duration, { aboutRecordId: executionId, context });
      consider(OUTCOME_PROMPTS['still-interfering'], { aboutRecordId: executionId, context });
    }
    for (const promptId of EVENING_TAIL) consider(promptById(promptId));
  }

  const limit = MAX_STEPS[depth];
  const kept = steps.slice(0, limit);
  for (const step of steps.slice(limit)) {
    if (step.kind === 'prompt') {
      omitted.push({
        promptId: step.prompt.promptId,
        because: `Beyond the ${depth === 'full' ? 'full' : `${depth}-minute`} depth you chose`,
      });
    }
  }

  return {
    kind,
    depth,
    steps: kept,
    omitted,
    withinNormalBudget: kept.length <= NORMAL_RESPONSE_BUDGET,
  };
}

/* -------------------------------------------------------------------------- */

/**
 * Which guide the current moment suggests.
 *
 * A suggestion only. Nothing is scheduled, nothing is owed, and a guide that was
 * never opened leaves no trace — so there is nothing for a backlog to be built from
 * (`OWN-007`).
 */
export function suggestedGuide(now: Date): GuideKind {
  if (now.getDay() === 0) return 'weekly';
  const hour = now.getHours();
  if (hour < 11) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * True when the morning guide is being opened late.
 *
 * The consequence is narrower questioning, never a penalty: `morning-catch-up`
 * asks less, not more, and records nothing about having been late.
 */
export function isLateMorning(now: Date): boolean {
  return now.getHours() >= 11;
}

export { SLEEP_PROMPTS, FOOD_PROMPTS, STATE_PROMPTS, CONTEXT_PROMPTS };
