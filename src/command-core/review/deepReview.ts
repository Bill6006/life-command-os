import { domainDefinition } from '../../domain/domains/definitions';
import type { CanonicalRecord } from '../../domain/records';
import type { CategorySummary } from '../../intelligence/types';
import type { DeepReview, DeepReviewSection, DomainSubmission, QuietArea } from '../boundary';
import type { WeeklySynthesis } from '../boundary';

/**
 * The monthly or seasonal deep review (Phase 8 deliverables 14, 30).
 *
 * > A deliberate review examines: every enabled domain; North Star alignment; long-term
 * > versus recent patterns; neglected or stale areas; cross-domain tradeoffs; changed life
 * > season or context.
 *
 * ## Deliberate, and never overdue
 *
 * `due` says a month has passed since the last one. It does not say the owner owes
 * anybody a review, nothing counts up while it is unopened, and skipping three in a row
 * leaves no trace and no backlog — the same non-punitive re-entry the daily guides have
 * had since Prompt 7A. A review that accumulated guilt would be read once and avoided
 * afterwards, which is the opposite of a strategic surface.
 *
 * ## Useful without a scorecard
 *
 * The gate is explicit: "strategic review is useful without a scorecard". So there is no
 * total, no rating, no ranking of areas, and no percentage anywhere in this output. Every
 * section is sentences drawn from readings the domains already published, and
 * `noScoreNote` says so on the surface rather than only in a comment.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** A month, roughly. Nothing here is precise enough to warrant calendar arithmetic. */
const REVIEW_INTERVAL_DAYS = 30;

const LIFE_CONTEXT_LOOKBACK_DAYS = 120;

function daysSince(iso: string | undefined, now: Date): number | undefined {
  if (iso === undefined) return undefined;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? undefined : Math.floor((now.getTime() - parsed) / DAY_MS);
}

/** The newest guide session that was a deliberate review, if there has ever been one. */
function lastReviewAt(records: readonly CanonicalRecord[]): string | undefined {
  let latest: string | undefined;
  for (const record of records) {
    if (record.recordType !== 'guide-session') continue;
    if (record.kind !== 'weekly') continue;
    if (record.depth !== 'full') continue;
    if (latest === undefined || record.recordedAt > latest) latest = record.recordedAt;
  }
  return latest;
}

/**
 * Life-season and context drift.
 *
 * A `life-context-change` is the owner saying something structural moved — a new job, a
 * new baby, a move. Anything recorded before one of those was recorded under different
 * conditions, and a review that compared across it without saying so would be comparing
 * two different lives.
 */
function contextDrift(records: readonly CanonicalRecord[], now: Date): readonly string[] {
  return records
    .filter((record) => record.recordType === 'life-context-change')
    .filter((record) => {
      const days = daysSince(record.occurredAt, now);
      return days !== undefined && days <= LIFE_CONTEXT_LOOKBACK_DAYS;
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, 3)
    .map((record) => {
      const days = daysSince(record.occurredAt, now) ?? 0;
      return `Something changed ${String(days)} days ago. Readings from before it were taken in different conditions.`;
    });
}

export function buildDeepReview(input: {
  readonly records: readonly CanonicalRecord[];
  readonly now: Date;
  readonly submissions: readonly DomainSubmission[];
  readonly categories: readonly CategorySummary[];
  readonly synthesis: WeeklySynthesis;
  readonly quietAreas: readonly QuietArea[];
  readonly northStarStatement: string | undefined;
}): DeepReview {
  const since = daysSince(lastReviewAt(input.records), input.now);
  const enabled = input.submissions.filter((submission) => submission.enabled);

  const sections: DeepReviewSection[] = [];

  sections.push({
    heading: 'Every area you have switched on',
    lines:
      enabled.length === 0
        ? ['None yet.']
        : enabled.map(
            (submission) =>
              `${domainDefinition(submission.domainId).label} — ${submission.scan.standing}`,
          ),
  });

  sections.push({
    heading: 'The direction you named',
    lines:
      input.northStarStatement === undefined
        ? ['Nothing recorded as the enduring direction, so nothing is measured against one.']
        : [
            input.northStarStatement,
            input.synthesis.improving.length === 0
              ? 'Nothing has moved forward enough this month to point at.'
              : `Moving forward: ${input.synthesis.improving.join('; ')}`,
          ],
  });

  if (input.synthesis.recentVersusLongTerm.length > 0) {
    sections.push({
      heading: 'Where the recent picture and the longer one disagree',
      lines: input.synthesis.recentVersusLongTerm,
    });
  }

  const longForgotten = input.quietAreas.filter((area) => area.raiseOn === 'deep-review');
  if (longForgotten.length > 0) {
    sections.push({
      heading: 'Areas that have been quiet a long time',
      lines: longForgotten.map(
        (area) => `${domainDefinition(area.domainId).label} — ${area.because}`,
      ),
    });
  }

  if (input.synthesis.tradeoffs.length > 0) {
    sections.push({
      heading: 'Where two areas are pulling against each other',
      lines: input.synthesis.tradeoffs.map((tradeoff) => tradeoff.statement),
    });
  }

  const drift = contextDrift(input.records, input.now);
  if (drift.length > 0) {
    sections.push({ heading: 'Changed conditions', lines: drift });
  }

  return {
    due: since === undefined || since >= REVIEW_INTERVAL_DAYS,
    window:
      since === undefined
        ? 'No deliberate review recorded yet'
        : `${String(since)} days since the last one`,
    sections,
    noScoreNote:
      'No total, no rating, and no ranking of areas. Everything above is a sentence about something you recorded.',
  };
}
