import { domainDefinition, type DomainId } from '../../domain/domains/definitions';
import type { CategorySummary, TrajectoryResult } from '../../intelligence/types';
import type { DomainSubmission, Tradeoff, WeeklySynthesis } from '../boundary';

/**
 * Weekly synthesis and cross-domain tradeoffs (Phase 8 deliverables 29, 33, 36).
 *
 * ## Tradeoffs are stated, never resolved
 *
 * When two areas pull in opposite directions the app says so and stops. It does not
 * recommend which to sacrifice, does not compute a net position, and does not decide that
 * career should give way to health this week. Those are the owner's calls, and an
 * application that made them would be substituting its priorities for his — which is the
 * failure the whole product is built against.
 *
 * A tradeoff here is therefore a **sentence with two domain ids attached**, and there is
 * nowhere in the type to put a resolution.
 *
 * ## Recent and long-term evidence are allowed to disagree
 *
 * The gate wording is "recent and long-term patterns can disagree", and the honest form of
 * that is to report both rather than averaging them into one direction. A month that is
 * improving inside a quarter that is declining is a real and useful shape; a mean of the
 * two is neither.
 */

/** A domain reads as under strain when its own summary says declining or mixed. */
function strained(summary: CategorySummary | undefined): boolean {
  return summary?.trajectory === 'declining' || summary?.trajectory === 'mixed';
}

function improving(summary: CategorySummary | undefined): boolean {
  return summary?.trajectory === 'improving';
}

/**
 * The domain's **own** category summary.
 *
 * `reads` lists a domain's own category first and any shared ones after — health reads
 * `health-recovery-energy` then `time-attention-capacity`, money reads `money` then
 * `direction-and-commitments`. Matching on membership instead of on the first entry
 * returned whichever shared category happened to come first in `ENABLED_CATEGORIES`, so
 * health, emotional, and home all resolved to `time-attention-capacity` and faith and
 * money both resolved to `direction-and-commitments`.
 *
 * The consequence was not a missing feature but a false statement: the synthesis, the deep
 * review, and the block pasted into an external model would each report a conclusion about
 * one area of the owner's life computed from a different area's evidence. Five of seven
 * domains could never read as improving, and money could read as drifting because an
 * unrelated commitment was blocked.
 *
 * It is the same defect the fatherhood slice hit in `categorySummaries` — a lookup that
 * falls through to a neighbour rather than failing — and it is caught here by asserting the
 * resolved category equals the domain's own.
 */
function summaryFor(
  categories: readonly CategorySummary[],
  domainId: DomainId,
): CategorySummary | undefined {
  const own = domainDefinition(domainId).reads[0];
  return categories.find((summary) => summary.category === own);
}

/**
 * Pairs worth naming when they disagree.
 *
 * Deliberately a short, fixed list rather than every combination. Twenty-one pairings
 * would produce noise, and most of them describe no real tension — "faith and home are
 * moving differently" is not an insight. Each pair below is one the plan's research names
 * as a genuine competition for the same finite thing: hours, attention, or recovery.
 */
const WATCHED_PAIRS: readonly (readonly [DomainId, DomainId])[] = [
  ['career-and-learning', 'health-recovery-energy'],
  ['career-and-learning', 'fatherhood'],
  ['money', 'emotional-and-relationships'],
  ['home-and-environment', 'career-and-learning'],
  ['fatherhood', 'health-recovery-energy'],
];

function tradeoffsBetween(
  categories: readonly CategorySummary[],
  enabled: ReadonlySet<DomainId>,
): readonly Tradeoff[] {
  const tradeoffs: Tradeoff[] = [];

  for (const [left, right] of WATCHED_PAIRS) {
    if (!enabled.has(left) || !enabled.has(right)) continue;

    const a = summaryFor(categories, left);
    const b = summaryFor(categories, right);

    if (improving(a) && strained(b)) {
      tradeoffs.push({
        between: [left, right],
        statement: `${domainDefinition(left).label} is moving forward while ${domainDefinition(right).label.toLowerCase()} is not. Both are your calls; this only says they are pulling against each other.`,
      });
      continue;
    }
    if (improving(b) && strained(a)) {
      tradeoffs.push({
        between: [right, left],
        statement: `${domainDefinition(right).label} is moving forward while ${domainDefinition(left).label.toLowerCase()} is not. Both are your calls; this only says they are pulling against each other.`,
      });
    }
  }

  return tradeoffs;
}

export function buildSynthesis(
  submissions: readonly DomainSubmission[],
  categories: readonly CategorySummary[],
  trajectory: TrajectoryResult,
): WeeklySynthesis {
  const enabled = new Set(
    submissions
      .filter((submission) => submission.enabled)
      .map((submission) => submission.domainId),
  );

  const readings = [...enabled].map((domainId) => ({
    domainId,
    summary: summaryFor(categories, domainId),
  }));

  const improvingAreas = readings
    .filter((entry) => improving(entry.summary))
    .map(
      (entry) =>
        `${domainDefinition(entry.domainId).label}: ${entry.summary?.condition ?? 'improving'}`,
    );

  const driftingAreas = readings
    .filter((entry) => strained(entry.summary))
    .map(
      (entry) =>
        `${domainDefinition(entry.domainId).label}: ${entry.summary?.condition ?? 'drifting'}`,
    );

  /*
   * The two horizons, kept apart.
   *
   * `trajectory` is the long read over weeks of focused work; the category summaries are
   * the recent one. Where they disagree, both sentences are printed and neither is
   * reconciled — a single direction would be a claim the evidence does not support.
   */
  const recentVersusLongTerm: string[] = [];
  if (trajectory.direction !== 'insufficient-evidence') {
    if (trajectory.direction === 'declining' && improvingAreas.length > 0) {
      recentVersusLongTerm.push(
        `Over the last several weeks the longer trend is declining, and ${String(improvingAreas.length)} area${improvingAreas.length === 1 ? '' : 's'} improved recently. Both are true and neither cancels the other.`,
      );
    }
    if (trajectory.direction === 'improving' && driftingAreas.length > 0) {
      recentVersusLongTerm.push(
        `The longer trend is improving while ${String(driftingAreas.length)} area${driftingAreas.length === 1 ? '' : 's'} is drifting right now. A good quarter does not mean a good week.`,
      );
    }
  }

  const headline =
    enabled.size === 0
      ? 'No areas are switched on yet.'
      : driftingAreas.length === 0 && improvingAreas.length === 0
        ? 'Nothing has moved enough in either direction to be worth a sentence.'
        : driftingAreas.length === 0
          ? `${String(improvingAreas.length)} area${improvingAreas.length === 1 ? '' : 's'} moving forward, none drifting.`
          : `${String(improvingAreas.length)} moving forward, ${String(driftingAreas.length)} drifting.`;

  return {
    headline,
    improving: improvingAreas,
    drifting: driftingAreas,
    tradeoffs: tradeoffsBetween(categories, enabled),
    recentVersusLongTerm,
  };
}
