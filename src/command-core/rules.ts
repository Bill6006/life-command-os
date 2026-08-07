/**
 * Research-rule versioning (Phase 8 deliverable 32).
 *
 * ## What is versioned
 *
 * The deterministic rules Command Core applies: the North Star gate's four routes, the
 * merge definition, the suppression policy, the quiet-area thresholds, and the constraint
 * order `selectOutput` uses. Not the owner's records, and not the domain vocabularies —
 * those are versioned by `RECORD_SCHEMA_VERSION` and by their own slices.
 *
 * ## Why a recommendation carries it
 *
 * A decision trace is only readable against the rules that produced it. "Removed before
 * ranking for not serving the recorded direction" means one thing under the gate as written
 * today and could mean something narrower tomorrow. Without the version on the record, a
 * trace from March read in September is quietly reinterpreted under rules it never saw.
 *
 * It also protects the learning layer. `evaluateEffectiveness` compares what was
 * recommended against what happened; a rules change part-way through a series makes two
 * systems look like one improving system. The version is what lets a later evaluation
 * segment the series rather than average across a discontinuity.
 *
 * ## How future upgrades coexist with prior traces
 *
 * Three rules, and they are the whole migration policy:
 *
 * 1. **Nothing is rewritten.** A recommendation records the version that produced it and
 *    keeps it forever. Upgrading the rules never touches a record — the same
 *    append-oriented guarantee everything else in this product has (ADR-0005).
 * 2. **Absent means unknown, never zero.** Records written before this field existed carry
 *    no version. A reader must treat that as "cannot be compared", the same way absence is
 *    treated everywhere else in this codebase, rather than assuming the earliest version.
 * 3. **Comparison is opt-in and segmented.** Anything comparing recommendations over time
 *    groups by version first and says so. Two versions may coexist in one export, one
 *    review, and one evaluation, provided the boundary is stated rather than smoothed.
 *
 * A future Command Core that replaces the arbitration bumps `DECISION_RULES_VERSION` and
 * changes nothing else. Old traces stay valid statements about what the old rules did.
 *
 * ## The format
 *
 * `YYYY.MM-n` — the month the rule set was settled and its ordinal within that month.
 * Deliberately not semver: these are not an API and there is no compatibility contract to
 * express, only a question of which set was in force.
 */
export const DECISION_RULES_VERSION = '2026.08-1';

/**
 * What changed in each version, newest first.
 *
 * Kept beside the constant so a reader looking at an old trace can find out what the rules
 * were without archaeology through the git history.
 */
export const DECISION_RULES_HISTORY: readonly {
  readonly version: string;
  readonly summary: string;
}[] = [
  {
    version: '2026.08-1',
    summary:
      'First versioned set. North Star gate with four qualifying routes; equivalent candidates merge across distinct generators only; constraint-first selection in the Phase 4 order; suppression from the domains’ own contextual-capture declarations; quiet at 21 days, long-forgotten at 60.',
  },
];

/** True when two records can honestly be compared as products of the same rules. */
export function comparableUnderSameRules(
  a: string | undefined,
  b: string | undefined,
): boolean {
  return a !== undefined && b !== undefined && a === b;
}
