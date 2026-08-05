import { northStar } from '../intelligence/support';
import { NORMAL_RESPONSE_BUDGET } from '../intelligence/guides/planGuide';
import { arbitrate } from './arbitration/arbitrate';
import { planCoverage } from './coverage/plan';
import { buildDeepReview } from './review/deepReview';
import { buildSynthesis } from './review/synthesis';
import { buildWeeklyScan } from './review/weeklyScan';
import { buildDecisionTrace } from './trace/decisionTrace';
import type { CommandCoreInput, CommandCoreResult } from './boundary';
import type { SuppressionContext } from './coverage/suppression';

/**
 * Command Core — the public entry point (Phase 8).
 *
 * ## One function
 *
 * `runCommandCore` is the whole surface. Everything else in this directory is internal:
 * arbitration, coverage, review, trace, export, recompute. A caller that reaches past this
 * function into a submodule is coupling to an implementation detail, and the point of the
 * subsystem is that those details can be replaced.
 *
 * The exceptions are deliberate and few, re-exported below: the boundary types a caller
 * needs to build an input, `recomputeAfterCantNow` because a constraint arrives after the
 * episode rather than during it, and the review-prompt builder because the export surface
 * assembles it from data this function does not hold.
 *
 * ## What it does, in order
 *
 * 1. **Arbitrate.** Merge equivalent candidates, apply the North Star gate, then hand the
 *    survivors to the constraint-first selection Phase 4 built. One thing comes out.
 * 2. **Plan coverage.** Decide which declared questions are worth asking now, and record
 *    why each of the others is not.
 * 3. **Review.** Build the weekly scan, the synthesis, and the deep review from what the
 *    domains submitted.
 * 4. **Trace.** Say what happened to everything that did not win.
 *
 * Nothing here is scheduled and nothing is stored. Records in, result out, at a `now` the
 * caller supplies — so the same evidence at the same instant always produces the same
 * screen, which is what makes every assertion in the test suite possible.
 *
 * ## Where the boundary is, and why it is testable
 *
 * See `boundary.ts`. In short: domains submit, Command Core decides, and nothing in this
 * directory may import a domain's content or intelligence modules. A test walks the import
 * graph both ways. Upgrading the arbitration — a research-backed model, a better coverage
 * policy — means replacing files here, and no slice moves.
 */

export type {
  CommandCoreInput,
  CommandCoreResult,
  CoverageItem,
  CoveragePlan,
  DecisionTrace,
  DeepReview,
  DeepReviewSection,
  DomainScan,
  DomainSubmission,
  QuietArea,
  SuppressedItem,
  SuppressionReason,
  Tradeoff,
  TraceStep,
  WeeklyScan,
  WeeklyScanRow,
  WeeklySynthesis,
} from './boundary';

export {
  recomputeAfterCantNow,
  type CantNowReason,
  type RecomputeResult,
} from './recompute/cantNow';
export {
  buildReviewPrompt,
  COACHING_INTENSITIES,
  DEFAULT_COACHING_INTENSITY,
  DEFAULT_REVIEW_MODE,
  INTENSITY_LABELS,
  MODE_LABELS,
  REVIEW_MODES,
  type CoachingIntensity,
  type ReviewMode,
  type ReviewPromptInput,
} from './export/reviewPrompt';
export type { NorthStarQualification, NorthStarVerdict } from './arbitration/northStar';
export { QUIET_AFTER_DAYS, LONG_FORGOTTEN_DAYS } from './coverage/forgotten';

export function runCommandCore(input: CommandCoreInput): CommandCoreResult {
  const arbitration = arbitrate(input);

  const suppressionContext: SuppressionContext = {
    records: input.records,
    now: input.now,
    protectedContexts: input.state.protectedContexts,
    enabledTopics: input.enabledTopics,
  };

  const coverage = planCoverage({
    submissions: input.submissions,
    context: suppressionContext,
    budget: NORMAL_RESPONSE_BUDGET,
  });

  const synthesis = buildSynthesis(input.submissions, input.categories, input.trajectory);
  const weeklyScan = buildWeeklyScan(input.submissions, coverage.quietAreas);

  const deepReview = buildDeepReview({
    records: input.records,
    now: input.now,
    submissions: input.submissions,
    categories: input.categories,
    synthesis,
    quietAreas: coverage.quietAreas,
    northStarStatement: northStar(input.records)?.statement,
  });

  const trace = buildDecisionTrace({
    submissions: input.submissions,
    coreCandidateCount: input.coreCandidates.length,
    afterDedupe: arbitration.considered,
    northStar: arbitration.northStar,
    rejected: arbitration.rejected,
    output: arbitration.output,
    state: input.state,
  });

  return {
    output: arbitration.output,
    coverage,
    weeklyScan,
    deepReview,
    synthesis,
    trace,
    rejected: arbitration.rejected,
    considered: arbitration.considered,
  };
}
