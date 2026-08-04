import type { DomainId } from '../domains/definitions';
import type { ProtectedContext } from '../records/categories';
import type { PrivacyClass } from '../records/envelope';
import type { RecordType } from '../records';
import type { GuideKind } from '../records/guides';

/**
 * Contextual-capture metadata (Master Plan v3.1 §9, Phase 7 shared rules 14–19).
 *
 * ## The problem this exists to solve
 *
 * Quick Capture works only for what the owner remembers to record. Seven domains'
 * worth of capture types is a memory test, and the memory test is how the legacy app
 * became a wall of checkboxes: every domain added its questions to the daily flow,
 * each one individually reasonable, and the total was unusable.
 *
 * So each capture declares **when it is worth asking and where it belongs**, and
 * Phase 8 later reads those declarations to decide what actually appears. This file is
 * the contract and the validator. It is deliberately **not** the scheduler — nothing
 * here chooses anything, and building that early is a stop condition.
 *
 * ## Why the metadata is domain-owned
 *
 * The domain knows that a milestone review is a deliberate act and a meaningful moment
 * is an interruption. A central scheduler would have to be told, and a list of things
 * the scheduler was told is a list that goes stale. Declaring it beside the domain
 * means the slice that adds a question also states its placement, and the validator
 * refuses the ones that contradict the placement rules.
 */

/** How the answer reaches the owner. */
export const CAPTURE_CLASSES = [
  /** Predictable and recurring, so a guide is the right place — sparingly. */
  'guide-recurring',
  /** Follows a specific action that was started. Owned by the decision episode. */
  'action-follow-up',
  /** Asked only when current evidence makes the answer decision-relevant. */
  'triggered-domain-question',
  /** The owner deliberately opening one area. Never appears unasked. */
  'update-this-area',
  /** The compact manual route for something unexpected. */
  'quick-capture',
] as const;
export type CaptureClass = (typeof CAPTURE_CLASSES)[number];

export const CAPTURE_OWNING_SURFACES = [
  'guide',
  'decision-episode',
  'update-this-area',
  'quick-capture',
  'review',
] as const;
export type CaptureOwningSurface = (typeof CAPTURE_OWNING_SURFACES)[number];

/** What happens when the owner keeps passing on this question. */
export const REPEATED_SKIP_BEHAVIOURS = [
  /** Stop offering it for a while. Nothing is recorded about the skipping. */
  'back-off',
  /** Stop offering it entirely until the owner asks for it. */
  'stop-offering',
  /** Not applicable: the owner initiates this one, so there is nothing to skip. */
  'owner-initiated',
] as const;
export type RepeatedSkipBehaviour = (typeof REPEATED_SKIP_BEHAVIOURS)[number];

export interface ContextualCapture {
  readonly id: string;
  readonly domainId: DomainId;
  /** The canonical family one answer writes. Exactly one, whatever the entry path. */
  readonly recordFamily: RecordType;
  readonly captureClass: CaptureClass;
  readonly owningSurface: CaptureOwningSurface;
  /**
   * The prompt carrying the observable wording and allowed answers.
   *
   * A reference rather than a copy: the wording lives in the prompt catalogue, which
   * validates itself against the behaviour-first policy. A capture cannot smuggle in a
   * question that policy would reject, because it has nowhere to write one.
   */
  readonly promptId: string | undefined;
  /** Guides this may appear in. Empty means it never appears in one. */
  readonly eligibleGuides: readonly GuideKind[];
  /** The situation that makes it relevant, in words. Phase 8 turns these into rules. */
  readonly triggers: readonly string[];
  /** When in the owner's life this makes sense at all. */
  readonly parentingContext: string | undefined;
  readonly privacy: PrivacyClass;
  /** Contexts in which this must not be put on screen. */
  readonly excludedContexts: readonly ProtectedContext[];
  /** Asking again inside this window would be noise. */
  readonly freshnessHours: number;
  readonly duplicateSuppression: string;
  readonly cooldownHours: number;
  readonly repeatedSkip: RepeatedSkipBehaviour;
  /** Skipping always writes nothing. Stated per capture so it cannot drift. */
  readonly skipWritesNothing: true;
  readonly offersUnsure: boolean;
  /** The action or decision this follows up, when it follows one. */
  readonly linkedAction: string | undefined;
  readonly followUpWindowHours: number | undefined;
  readonly expiresAfterHours: number | undefined;
  /** Whether the answer could change what is recommended right now. */
  readonly canAffectCurrentDecision: boolean;
  /**
   * The label Quick Capture offers, for the `quick-capture` class only.
   *
   * Carried here rather than in the interface so that the surface offering it does not
   * need to know which domains exist — it asks which enabled domains declared one.
   */
  readonly quickCaptureKind?: string | undefined;
}

export type CaptureViolationCode =
  | 'unknown-prompt'
  | 'guide-eligibility-mismatch'
  | 'follow-up-incomplete'
  | 'trigger-without-decision-value'
  | 'milestone-in-daily-guide'
  | 'sensitive-without-exclusions'
  | 'no-triggers'
  | 'suppression-not-declared'
  | 'quick-capture-unlabelled';

export interface CaptureViolation {
  readonly code: CaptureViolationCode;
  readonly detail: string;
}

/**
 * The placement rules, enforced.
 *
 * Each of these is a way the capture layer could quietly become the thing it was built
 * to prevent, so each is a build failure rather than a review comment.
 */
export function validateContextualCapture(
  capture: ContextualCapture,
  knownPromptIds: ReadonlySet<string>,
): readonly CaptureViolation[] {
  const violations: CaptureViolation[] = [];
  const fail = (code: CaptureViolationCode, detail: string): void => {
    violations.push({ code, detail });
  };

  if (capture.promptId !== undefined && !knownPromptIds.has(capture.promptId)) {
    fail('unknown-prompt', `${capture.id} names a prompt that does not exist`);
  }

  // Only a guide-recurring capture may name guides, and it must name at least one.
  if (capture.captureClass === 'guide-recurring' && capture.eligibleGuides.length === 0) {
    fail('guide-eligibility-mismatch', `${capture.id} is guide-recurring but names no guide`);
  }
  if (capture.captureClass !== 'guide-recurring' && capture.eligibleGuides.length > 0) {
    fail(
      'guide-eligibility-mismatch',
      `${capture.id} is ${capture.captureClass} but claims guide eligibility`,
    );
  }

  // A follow-up that cannot say what it follows, or for how long, is not a follow-up.
  if (capture.captureClass === 'action-follow-up') {
    if (
      capture.linkedAction === undefined ||
      capture.followUpWindowHours === undefined ||
      capture.expiresAfterHours === undefined
    ) {
      fail(
        'follow-up-incomplete',
        `${capture.id} is an action follow-up without a linked action, window, and expiry`,
      );
    }
  }

  /*
   * A triggered question interrupts. The only thing that justifies interrupting is
   * that the answer could change what happens next — otherwise it is a nag with a
   * rule attached.
   */
  if (
    capture.captureClass === 'triggered-domain-question' &&
    !capture.canAffectCurrentDecision
  ) {
    fail(
      'trigger-without-decision-value',
      `${capture.id} is triggered but its answer cannot change the current decision`,
    );
  }

  /*
   * Milestone review is a deliberate act. In a daily guide it becomes a checklist
   * about a child, asked when the owner is halfway out of the door.
   */
  if (capture.recordFamily === 'milestone-observation') {
    if (capture.owningSurface !== 'update-this-area' && capture.owningSurface !== 'review') {
      fail(
        'milestone-in-daily-guide',
        `${capture.id} puts milestone review on ${capture.owningSurface}`,
      );
    }
    if (capture.eligibleGuides.length > 0) {
      fail('milestone-in-daily-guide', `${capture.id} makes milestone review guide-eligible`);
    }
  }

  /*
   * Sensitive content must say where it will not appear. `work-focus` is required for
   * anything about a child: a question about your daughter has no business arriving on
   * a shared screen in the middle of a work block.
   */
  if (capture.privacy !== 'general' && capture.excludedContexts.length === 0) {
    fail(
      'sensitive-without-exclusions',
      `${capture.id} is ${capture.privacy} and excludes no context`,
    );
  }
  if (capture.privacy === 'child' && !capture.excludedContexts.includes('work-focus')) {
    fail('sensitive-without-exclusions', `${capture.id} is child data and allows work-focus`);
  }

  if (
    capture.captureClass === 'quick-capture' &&
    (capture.quickCaptureKind ?? '').trim() === ''
  ) {
    fail(
      'quick-capture-unlabelled',
      `${capture.id} is a Quick Capture route with no label to offer`,
    );
  }

  if (capture.triggers.length === 0) {
    fail('no-triggers', `${capture.id} declares no condition that makes it relevant`);
  }
  if (capture.duplicateSuppression.trim() === '') {
    fail('suppression-not-declared', `${capture.id} declares no duplicate-suppression rule`);
  }

  return violations;
}

/**
 * Validates a whole set, and throws.
 *
 * Called at module load by each domain's declarations, the same way the prompt
 * catalogue validates itself: a capture that breaks a placement rule breaks the build
 * rather than reaching a person.
 */
export function assertContextualCaptures(
  captures: readonly ContextualCapture[],
  knownPromptIds: ReadonlySet<string>,
): void {
  const problems = captures.flatMap((capture) =>
    validateContextualCapture(capture, knownPromptIds).map(
      (violation) => `${violation.code}: ${violation.detail}`,
    ),
  );

  const ids = captures.map((capture) => capture.id);
  const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
  for (const id of new Set(duplicated)) problems.push(`duplicate capture id: ${id}`);

  if (problems.length > 0) {
    throw new Error(`Contextual-capture metadata is invalid:\n  ${problems.join('\n  ')}`);
  }
}
