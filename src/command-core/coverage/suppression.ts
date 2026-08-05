import { assessFreshness, type CanonicalRecord } from '../../domain/records';
import type { ContextualCapture } from '../../domain/capture/contextualCapture';
import type { ProtectedContext } from '../../domain/records/categories';
import type { SuppressedItem, SuppressionReason } from '../boundary';

/**
 * Why a question is not asked (Phase 8 deliverable 10).
 *
 * Every domain declared, in its contextual-capture metadata, when re-asking would be
 * noise: a freshness window, a cooldown, an expiry, and what to do when the owner keeps
 * passing. Phase 7 wrote those declarations and deliberately built no scheduler. This is
 * the scheduler, and it reads the declarations rather than holding a second copy of them.
 *
 * ## Suppression is reported, never silent
 *
 * Each decision comes back as a `SuppressedItem` with a reason and a sentence. A question
 * that vanished because of a cooldown looks identical, from the outside, to a question
 * that was never written — and the difference matters when something stops appearing and
 * nobody can say why.
 *
 * ## Skipping costs nothing and is never evidence
 *
 * `repeatedSkip` backs off or stops offering. Neither writes a record about the skipping,
 * and nothing downstream reads a skip as a fact about the owner (`OWN-007`). The count
 * below is derived from guide sessions that already exist for other reasons.
 */

const HOUR_MS = 60 * 60 * 1000;

/** Passing this many times running is the owner saying "not this". */
const REPEATED_SKIP_THRESHOLD = 3;

export interface SuppressionContext {
  readonly records: readonly CanonicalRecord[];
  readonly now: Date;
  readonly protectedContexts: readonly ProtectedContext[];
  /** Protected topics the owner has switched on. Absent means the topic is off. */
  readonly enabledTopics: ReadonlySet<string>;
}

function lastAnsweredAt(
  records: readonly CanonicalRecord[],
  attribute: string,
): string | undefined {
  let latest: string | undefined;
  for (const record of records) {
    if (record.recordType !== 'observation') continue;
    if (record.attribute !== attribute) continue;
    if (latest === undefined || record.recordedAt > latest) latest = record.recordedAt;
  }
  return latest;
}

/** How many of the most recent guide sessions skipped this prompt without answering it. */
function consecutiveSkips(records: readonly CanonicalRecord[], promptId: string): number {
  const sessions = records
    .filter((record) => record.recordType === 'guide-session')
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  let run = 0;
  for (const session of sessions) {
    if (session.promptIdsAnswered.includes(promptId)) break;
    if (session.promptIdsSkipped.includes(promptId)) {
      run += 1;
      continue;
    }
    // Not offered in that session, so it says nothing either way.
  }
  return run;
}

export interface SuppressionVerdict {
  readonly suppressed: boolean;
  readonly item: SuppressedItem | undefined;
}

const allow: SuppressionVerdict = { suppressed: false, item: undefined };

function deny(
  promptId: string,
  reason: SuppressionReason,
  detail: string,
): SuppressionVerdict {
  return { suppressed: true, item: { promptId, reason, detail } };
}

/**
 * Whether one declared capture may be offered right now.
 *
 * The order matters and is from cheapest and most absolute to most contingent: an area
 * that is off, or a topic that is not permitted, is not a question that was suppressed —
 * it is a question that does not exist for this owner today.
 */
export function assessSuppression(
  capture: ContextualCapture,
  attribute: string,
  context: SuppressionContext,
  areaEnabled: boolean,
): SuppressionVerdict {
  const promptId = capture.promptId ?? capture.id;

  if (!areaEnabled) {
    return deny(promptId, 'area-switched-off', 'This area is switched off');
  }

  if (capture.protectedTopic !== undefined && !context.enabledTopics.has(capture.protectedTopic)) {
    return deny(
      promptId,
      'topic-not-permitted',
      'A protected topic the owner has not switched on',
    );
  }

  const clash = capture.excludedContexts.filter((excluded) =>
    context.protectedContexts.includes(excluded),
  );
  if (clash.length > 0) {
    return deny(promptId, 'protected-context', `Excluded during: ${clash.join(', ')}`);
  }

  /*
   * A triggered question must be able to change the current decision. This is already a
   * build-time rule on the metadata; applying it again here is not redundancy — it is the
   * difference between "no declaration may say otherwise" and "nothing is asked without
   * decision value", and the second is the gate's wording.
   */
  if (capture.captureClass === 'triggered-domain-question' && !capture.canAffectCurrentDecision) {
    return deny(promptId, 'no-decision-value', 'Its answer could not change anything now');
  }

  const answeredAt = lastAnsweredAt(context.records, attribute);

  if (answeredAt !== undefined && capture.freshnessHours > 0) {
    const status = assessFreshness(
      answeredAt,
      context.now,
      capture.freshnessHours * HOUR_MS,
    ).status;
    if (status !== 'stale') {
      return deny(
        promptId,
        'answered-recently',
        `Answered inside its ${String(capture.freshnessHours)}-hour window`,
      );
    }
  }

  if (answeredAt !== undefined && capture.cooldownHours > 0) {
    const since = context.now.getTime() - Date.parse(answeredAt);
    if (since < capture.cooldownHours * HOUR_MS) {
      return deny(
        promptId,
        'in-cooldown',
        `Asked again inside its ${String(capture.cooldownHours)}-hour cooldown`,
      );
    }
  }

  if (capture.expiresAfterHours !== undefined && answeredAt === undefined) {
    /*
     * An action follow-up expires. Chasing an outcome a month late produces recall rather
     * than observation, and an unresolved outcome is a true statement about the evidence
     * where a late guess would be a false one.
     */
    const linkedAt = lastAnsweredAt(context.records, `${attribute}:started`);
    if (linkedAt !== undefined) {
      const since = context.now.getTime() - Date.parse(linkedAt);
      if (since > capture.expiresAfterHours * HOUR_MS) {
        return deny(promptId, 'expired', 'Its follow-up window has closed — it stays unresolved');
      }
    }
  }

  if (capture.repeatedSkip !== 'owner-initiated') {
    const skips = consecutiveSkips(context.records, promptId);
    if (skips >= REPEATED_SKIP_THRESHOLD) {
      return deny(
        promptId,
        'repeatedly-skipped',
        capture.repeatedSkip === 'stop-offering'
          ? 'Passed over repeatedly, so it is not offered again until you ask for it'
          : `Passed over ${String(skips)} times running, so it is backing off`,
      );
    }
  }

  return allow;
}
