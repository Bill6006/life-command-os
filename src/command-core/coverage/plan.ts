import { ALL_CONTEXTUAL_CAPTURES } from '../../domain/capture/registry';
import { promptById } from '../../domain/prompts/definitions';
import type { DomainId } from '../../domain/domains/definitions';
import type { CoverageItem, CoveragePlan, DomainSubmission, SuppressedItem } from '../boundary';
import { findQuietAreas } from './forgotten';
import { assessSuppression, type SuppressionContext } from './suppression';
import { dedupePromptIds } from '../arbitration/dedupe';

/**
 * Contextual-capture orchestration (Phase 8 deliverables 4, 6, 7, 9, 10).
 *
 * Phase 7 had every domain declare when its questions are worth asking and where they
 * belong, and deliberately built nothing that acted on those declarations. This acts on
 * them.
 *
 * ## What it produces, and what it deliberately does not
 *
 * A **plan**, not a form. `offered` is the questions that could honestly be asked right
 * now, in decision-value order; `suppressed` is everything that could not, with the reason.
 * Command Core does not render either. The guide planner still shows one question at a
 * time and still applies its own depth budget — this decides what is *eligible* to be
 * shown, which is a different job and the one that was missing.
 *
 * ## Why the budget check is here and not only in the guide
 *
 * Seven domains can each declare a reasonable question and produce an unreasonable
 * morning. The guide's depth limit would truncate that to five, which looks fine and
 * hides the fact that the plan wanted twelve. `withinBudget` reports on the plan rather
 * than on what survived truncation, so a domain quietly turning the daily flow into a
 * checklist is visible instead of silently trimmed.
 *
 * ## Ordering
 *
 * Decision value first: a question whose answer changes what may be recommended at all
 * outranks one that refines confidence. Within that, the declaration order of the capture
 * registry, which is the order the slices were written and is stable.
 */

/** Captures that may be considered for the ambient flow at all. */
const AMBIENT_CLASSES = new Set(['guide-recurring', 'triggered-domain-question', 'action-follow-up']);

export interface CoverageInput {
  readonly submissions: readonly DomainSubmission[];
  readonly context: SuppressionContext;
  /** The normal check-in budget (`OWN-023`). */
  readonly budget: number;
  /** Areas the owner deliberately made quiet. */
  readonly intentionallyQuiet: ReadonlySet<DomainId>;
}

export function planCoverage(input: CoverageInput): CoveragePlan {
  const enabled = new Map<DomainId, boolean>(
    input.submissions.map((submission) => [submission.domainId, submission.enabled]),
  );

  const offered: CoverageItem[] = [];
  const suppressed: SuppressedItem[] = [];

  for (const capture of ALL_CONTEXTUAL_CAPTURES) {
    /*
     * Update This Area and Quick Capture are reached by the owner opening something. They
     * are not part of the ambient plan and cannot be suppressed out of existence — a
     * question he went looking for is always available.
     */
    if (!AMBIENT_CLASSES.has(capture.captureClass)) continue;

    const promptId = capture.promptId;
    if (promptId === undefined) continue;

    const prompt = promptById(promptId);
    const changesEligibility = prompt.whatItCouldChange.includes('candidate-eligibility');
    const verdict = assessSuppression(
      capture,
      prompt.attribute,
      input.context,
      enabled.get(capture.domainId) ?? false,
      changesEligibility,
    );

    if (verdict.suppressed) {
      if (verdict.item !== undefined) suppressed.push(verdict.item);
      continue;
    }

    offered.push({
      promptId,
      domainId: capture.domainId,
      couldChange: prompt.whatItCouldChange,
      surface: capture.owningSurface,
    });
  }

  /* Decision value first, then declaration order. */
  const changesEligibility = (item: CoverageItem): number =>
    item.couldChange.includes('candidate-eligibility') ? 0 : 1;

  const ordered = [...offered].sort((a, b) => changesEligibility(a) - changesEligibility(b));

  /*
   * Keep the first appearance of each prompt id.
   *
   * The first version built a `Set` of the deduplicated ids and then filtered the original
   * list by membership, which keeps every element including the duplicates — a filter that
   * always passes. `dedupePromptIds` was correct and unit-tested in isolation; the call
   * site threw the result away.
   */
  const keepOrder = dedupePromptIds(ordered.map((item) => item.promptId));
  const unique = keepOrder.flatMap((promptId) => {
    const first = ordered.find((item) => item.promptId === promptId);
    return first === undefined ? [] : [first];
  });

  return {
    offered: unique,
    suppressed,
    quietAreas: findQuietAreas(
      input.submissions,
      input.context.now,
      input.intentionallyQuiet,
    ),
    withinBudget: unique.length <= input.budget,
  };
}
