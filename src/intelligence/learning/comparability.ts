import type { CanonicalRecord, LifeContextChangeRecord } from '../../domain/records';
import { currentOfType } from '../support';
import { comparableToCurrent, type Comparability } from '../direction/northStarVersions';

/**
 * Whether old evidence still speaks to the present (`V33-022`, `V33-023`, sections G7/G8).
 *
 * ## Age is not the question
 *
 * The rule this file exists to enforce, and the one almost every learning system gets
 * wrong: **evidence does not decay because time passed.** A six-month-old observation from
 * a situation that still holds is better evidence than last Tuesday's from a life that has
 * since changed shape. Exponential recency weighting is easy, defensible-sounding, and
 * throws away the most useful thing the owner has.
 *
 * So the only thing that reduces influence here is a *material change in context* — the
 * owner saying, in a `life-context-change` record, that something structural moved. A new
 * job, a new baby, a move, a changed sleep routine. Nothing is deleted; the older evidence
 * keeps its place in the record and loses its claim on the present.
 *
 * ## And it must be reducible to a reason
 *
 * `V33-022` requires the decision trace to show *why* older evidence was discounted. A
 * weight with no sentence behind it is indistinguishable from a bug, so every discount here
 * carries the change that caused it, in the owner's own summary.
 *
 * ## Rule versions are a second axis
 *
 * Evidence gathered under one interpretation rule and evidence gathered under another are
 * not directly comparable, whatever the context. That is segmented rather than smoothed,
 * and an absent version means `unknown` — never version zero (`rules.ts`, migration rule 2).
 */

/**
 * The version of the *interpretation* rules, distinct from the decision rules.
 *
 * `DECISION_RULES_VERSION` versions how a candidate is chosen. This versions how an
 * observation becomes a belief: the facet vocabulary, the strength thresholds, the
 * favourable/unfavourable split. Both can move independently and a comparison has to
 * respect whichever changed.
 *
 * Bumped when the meaning of an interpretation changes, never when its wording does.
 */
export const EVIDENCE_RULES_VERSION = 'evidence-2026-08-A';

export type Influence = 'full' | 'reduced' | 'not-comparable';

export interface Applicability {
  readonly influence: Influence;
  /** Named cause, for the trace. Empty only when influence is full. */
  readonly because: string | undefined;
  /** Whether the North Star has changed since, and whether that can even be established. */
  readonly northStar: Comparability;
  /** The material changes recorded since this evidence, oldest first. */
  readonly changedSince: readonly string[];
}

/** Material changes the owner has recorded, oldest first. */
export function materialChanges(
  records: readonly CanonicalRecord[],
): readonly LifeContextChangeRecord[] {
  return currentOfType<LifeContextChangeRecord>(records, 'life-context-change').sort((a, b) =>
    a.effectiveFrom.localeCompare(b.effectiveFrom),
  );
}

/**
 * How much weight a piece of evidence still carries, and why.
 *
 * Three levels rather than a coefficient. A number would imply a precision nobody has
 * measured, and would invite arithmetic across evidence that the rest of this layer
 * deliberately refuses to average.
 *
 *   - **full** — nothing structural has happened since. Age is irrelevant.
 *   - **reduced** — the owner has recorded a change affecting this evidence's categories.
 *     It still counts; it counts for less, and the trace can say which change.
 *   - **not-comparable** — the interpretation rules differ, so the two readings are not
 *     statements about the same thing at all.
 */
export function applicabilityOf(
  records: readonly CanonicalRecord[],
  evidence: {
    readonly recordedAt: string;
    readonly categories: readonly string[];
    /** The interpretation version in force when this was derived, where it is known. */
    readonly evidenceRulesVersion?: string | undefined;
  },
): Applicability {
  const northStar = comparableToCurrent(records, evidence.recordedAt);

  /*
   * A different rule version is not a discount, it is a different measurement. Checked
   * first because no amount of contextual similarity makes two incompatible readings
   * comparable. An absent version is `unknown`, and unknown does not block — it is treated
   * as ordinary evidence rather than silently assumed to be the earliest rules.
   */
  if (
    evidence.evidenceRulesVersion !== undefined &&
    evidence.evidenceRulesVersion !== EVIDENCE_RULES_VERSION
  ) {
    return {
      influence: 'not-comparable',
      because: `Recorded under a different interpretation (${evidence.evidenceRulesVersion})`,
      northStar,
      changedSince: [],
    };
  }

  const at = Date.parse(evidence.recordedAt);
  const relevant = materialChanges(records).filter((change) => {
    if (Date.parse(change.effectiveFrom) <= at) return false;
    /*
     * Only a change that touches what this evidence is about. A new job does not make an
     * observation about the kitchen less applicable, and treating it as though it did is
     * how a single life event silently wipes an entire history.
     */
    return (
      evidence.categories.length === 0 ||
      change.affectedCategories.some((category) => evidence.categories.includes(category))
    );
  });

  if (relevant.length === 0) {
    /*
     * Deliberately no age branch. However old this is, nothing has been recorded that
     * makes the situation it came from different from the situation now.
     */
    return { influence: 'full', because: undefined, northStar, changedSince: [] };
  }

  const summaries = relevant.map((change) => change.summary);
  return {
    influence: 'reduced',
    because: `Recorded before ${summaries.join('; ')}`,
    northStar,
    changedSince: summaries,
  };
}

/**
 * Whether a material change explicitly invalidates patterns learned before it.
 *
 * `invalidatesPatternsBefore` is the owner saying the break was clean. Stronger than the
 * ordinary discount and still not a deletion: the observations remain, and only their
 * claim on the present is withdrawn.
 */
export function invalidatedBefore(records: readonly CanonicalRecord[]): string | undefined {
  const marks = materialChanges(records)
    .map((change) => change.invalidatesPatternsBefore)
    .filter((mark): mark is string => mark !== undefined)
    .sort();
  return marks[marks.length - 1];
}
