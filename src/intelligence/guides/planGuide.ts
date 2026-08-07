import type { CanonicalRecord, ExecutionRecord } from '../../domain/records';
import { assessFreshness } from '../../domain/records';
import type { GuideDepth, GuideKind } from '../../domain/records/guides';
import { domainDefinition, type DomainId } from '../../domain/domains/definitions';
import { capturesForDomain } from '../../domain/capture/registry';
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
import { isAfterMorning, isSunday, timeBlockAt } from '../../domain/time/localTime';
import { HARD_CEILING, NORMAL_RESPONSE_BUDGET, appraise, choose } from './questionValue';

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
 * Historic question counts per depth (`OWN-021`), retained for reading old records only.
 *
 * **Nothing plans a guide from this any more** (`V33-024`, owner clarification 1). Depth
 * stopped being an input the day it stopped being something the owner could sensibly
 * answer; see `questionValue.ts` for what decides length now. A stored `depth` describes
 * the session that happened, and records are append-only, so the mapping stays readable.
 */
export const MAX_STEPS: Record<GuideDepth, number> = { '15': 3, '30': 5, '45': 7, full: 10 };

/** The normal check-in budget (`OWN-023`, `CI-016`). */
export { NORMAL_RESPONSE_BUDGET } from './questionValue';

/**
 * The depth stamped on a session that nobody chose a depth for.
 *
 * Every session, now. It is provenance on the record rather than a setting, and it names
 * the briefest level so an old reader cannot mistake it for the owner having asked for
 * more than the app decided to ask.
 */
export const DEFAULT_DEPTH: GuideDepth = '15';

/**
 * Whether a stored session stayed inside the normal check-in budget.
 *
 * Reads a historic record. Not consulted when planning.
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
  /**
   * Questions this guide would ask at a deeper level and is not asking now (`V33-020`).
   *
   * Zero means every level covers the same ground, so offering the owner a coverage
   * control would be offering a choice that changes nothing. The surface uses this to
   * decide whether the control is worth showing at all.
   */
  readonly moreAvailable: number;
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
/**
 * What Command Core decided about coverage (Phase 8 repair pass).
 *
 * The planner used to apply only its own twelve-hour freshness rule, which meant the
 * domains' declared cooldowns, expiries, repeated-skip behaviour, cadence, and snooze were
 * computed and then ignored. A rule that governs nothing the owner is asked is not a rule.
 *
 * Two effects, and both narrow:
 *
 * - **`suppressed` removes.** A prompt Command Core suppressed never becomes a step, and
 *   the reason it gave is recorded in `omitted` rather than replaced with the planner's own.
 * - **`offered` may add, but only what a guide already owns.** A capture whose owning
 *   surface is `guide` is appended after the planner's own questions, at the back of the
 *   queue and inside the same depth budget. Nothing an area declared for its own page can
 *   reach a check-in this way.
 *
 * There is deliberately no path by which coverage promotes a question ahead of the
 * planner's, and none by which time alone adds one: every offered item earned its place by
 * being declared decision-relevant *and* surviving suppression.
 */
export interface CoverageDecision {
  readonly suppressed: ReadonlyMap<string, string>;
  readonly offered: readonly { readonly promptId: string; readonly surface: string }[];
}

export function planGuide(
  kind: GuideKind,
  depth: GuideDepth,
  records: readonly CanonicalRecord[],
  now: Date,
  /** Required for `update-area`, ignored otherwise. */
  domainId?: DomainId,
  coverage?: CoverageDecision,
  /**
   * The exact question to ask first (v3.3 `V33-049`).
   *
   * Set when the owner tapped `Answer it` on a question Command Core displayed. It leads,
   * unconditionally — freshness cannot rule out the question the app just said it needed,
   * and neither can suppression, because the owner is answering it on purpose.
   */
  leadPromptId?: string,
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
    // Already leading. Asking it twice in one flow would be its own defect.
    if (prompt.promptId === leadPromptId) return;
    /*
     * Command Core's decision comes first and is reported in its own words. Its rules read
     * the domains' declarations — cooldown, expiry, repeated skip, cadence, snooze — which
     * the planner has no view of and should not acquire one of.
     *
     * `update-area` is exempt: the owner opened that page, and a question he went looking
     * for is never suppressed. Suppression governs what the app raises, not what he asks.
     */
    const suppressedBecause =
      kind === 'update-area' ? undefined : coverage?.suppressed.get(prompt.promptId);
    if (suppressedBecause !== undefined) {
      omitted.push({ promptId: prompt.promptId, because: suppressedBecause });
      return;
    }

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

  /*
   * The displayed question, first and always.
   *
   * Pushed before any of the planner's own ordering so `Answer it` opens on exactly what
   * Now was showing, rather than dropping the owner into a generic check-in that starts
   * somewhere else.
   */
  if (leadPromptId !== undefined) {
    steps.push({ kind: 'prompt', prompt: promptById(leadPromptId) });
  }

  if (kind === 'weekly') {
    // The weekly guide proposes; it does not interrogate. One decision, four responses.
    return {
      kind,
      depth,
      steps: [{ kind: 'weekly-direction' }],
      omitted,
      withinNormalBudget: true,
      /* One decision. Coverage does not apply, so the control must not appear. */
      moreAvailable: 0,
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
    const declared = capturesForDomain(domainId);

    /*
     * A domain's questions, minus the ones that belong somewhere else.
     *
     * Namespace alone was too broad: a domain's action follow-ups share its prefix and
     * were being asked here, out of context, with no action to follow up. Where a
     * domain has declared contextual-capture metadata, that declaration decides — only
     * captures this surface owns appear. Domains without metadata keep the namespace
     * behaviour, which is what health and career still rely on.
     */
    const ownedElsewhere = new Set(
      declared
        .filter((capture) => capture.owningSurface !== 'update-this-area')
        .flatMap((capture) => (capture.promptId === undefined ? [] : [capture.promptId])),
    );

    const owned = ALL_PROMPTS.filter(
      (prompt) =>
        !ownedElsewhere.has(prompt.promptId) &&
        (prompt.promptId === definition.updatePromptId ||
          (definition.captureNamespace !== undefined &&
            prompt.promptId.startsWith(`${definition.captureNamespace}:`))),
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

  /*
   * Coverage may add, at the back, and only what a guide owns.
   *
   * A triggered domain question that survived suppression has already proved it could
   * change what is eligible right now — which is the only thing that justifies interrupting.
   * It goes behind the planner's own questions and inside the same budget, so a domain
   * cannot push its way to the front of a morning.
   */
  const dueByCoverage = new Set<string>();
  if (coverage !== undefined && kind !== 'update-area') {
    const already = new Set(
      steps.flatMap((step) => (step.kind === 'prompt' ? [step.prompt.promptId] : [])),
    );
    for (const item of coverage.offered) {
      if (item.surface !== 'guide') continue;
      if (already.has(item.promptId)) continue;
      already.add(item.promptId);
      dueByCoverage.add(item.promptId);
      steps.push({ kind: 'prompt', prompt: promptById(item.promptId) });
    }
  }

  /*
   * How many questions this asks is decided here, by what the answers could do — never by
   * a number the owner picked in advance (`V33-024`, owner clarification 1). Suppression
   * and freshness have already removed their candidates above; what remains is ranked by
   * whether it can change what is possible, and cut at the response budget.
   */
  const appraisals = steps.flatMap((step) => {
    if (step.kind !== 'prompt') return [];
    const { promptId } = step.prompt;
    if (dueByCoverage.has(promptId)) {
      return [{ promptId, worth: 'due' as const, because: 'This area is due a look' }];
    }
    return [
      appraise(step.prompt, {
        hasCurrentAnswer: false,
        suppressedBecause: undefined,
        askedFor: askRegardless || promptId === leadPromptId,
      }),
    ];
  });
  /*
   * A guide the owner opened themselves may run past the normal budget — they came
   * looking. One the app raised may not: five responses is the whole promise (`OWN-023`).
   */
  const selection = choose(appraisals, askRegardless ? HARD_CEILING : NORMAL_RESPONSE_BUDGET);
  const askedIds = new Set(selection.asked);
  const kept = steps.filter(
    (step) => step.kind !== 'prompt' || askedIds.has(step.prompt.promptId),
  );
  for (const item of selection.held) omitted.push(item);

  return {
    kind,
    depth,
    steps: kept,
    omitted,
    withinNormalBudget: kept.length <= NORMAL_RESPONSE_BUDGET,
    moreAvailable: selection.held.length,
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
  /*
   * The owner's zone, not the runtime's.
   *
   * `Date#getDay` and `getHours` read whatever timezone the process is set to. In a browser
   * that is the device and was right by accident; in a test runner it is the machine, which
   * made this untestable and would be wrong for anyone whose device differs. One time
   * service now decides what part of the day it is, everywhere (`V33-031`).
   */
  if (isSunday(now)) return 'weekly';
  const block = timeBlockAt(now);
  return block === 'morning' ? 'morning' : block === 'afternoon' ? 'afternoon' : 'evening';
}

/**
 * True when the morning guide is being opened late.
 *
 * The consequence is narrower questioning, never a penalty: `morning-catch-up`
 * asks less, not more, and records nothing about having been late.
 */
export function isLateMorning(now: Date): boolean {
  return isAfterMorning(now);
}

export { SLEEP_PROMPTS, FOOD_PROMPTS, STATE_PROMPTS, CONTEXT_PROMPTS };
