import type { CapturePrompt } from '../../domain/prompts/definitions';

/**
 * How many questions a check-in asks, and why (`V33-024`, owner clarification 1).
 *
 * ## What this replaced
 *
 * A `15 / 30 / 45 / Full` control mapped to a question count: three, five, seven, ten. The
 * owner picked a number and the guide sliced its queue to that length.
 *
 * Two things were wrong with that, and only one of them was the label. The deeper problem
 * is that **the owner is not in a position to answer it.** Choosing "five" requires already
 * knowing which five questions are worth asking today, which is precisely the judgement the
 * app exists to make. So the control asked the owner to do the app's work, then truncated
 * an ordered list at an arbitrary point — dropping a question that would have changed the
 * recommendation because it happened to sit sixth.
 *
 * ## What decides it now
 *
 * Nothing the owner sets. Each candidate question is appraised on what its answer could
 * actually do, and the guide asks the ones that earn it:
 *
 *   - **Existing evidence** — a current answer already on file makes a question worthless
 *     regardless of how important the topic is.
 *   - **Coverage and cadence** — Command Core's suppression rules (cooldown, expiry,
 *     repeated skip, snooze) remove a question before value is even considered.
 *   - **Decision value** — can this answer change what is *possible*, or only how things
 *     are described? Eligibility outranks commentary.
 *   - **Marginal value** — once the decision is no longer blocked, a further question
 *     cannot change today's recommendation. It is coverage, and coverage waits its turn
 *     behind the response budget.
 *
 * The result is that a morning with everything already known asks nothing, and a morning
 * with three unknowns blocking the call asks those three — without the owner having
 * predicted either.
 */

/** The most a check-in may ask, whatever the appraisal says. */
export const HARD_CEILING = 8;

/** The soft budget for questions that inform rather than unblock (`OWN-023`, `CI-016`). */
export const NORMAL_RESPONSE_BUDGET = 5;

/**
 * `due` is coverage and cadence speaking (`V33-025`).
 *
 * Command Core's coverage plan offers a question when an area has gone unasked long enough
 * that its evidence is decaying — it has already survived suppression and already been
 * declared decision-relevant. That is a different claim from "this could change today's
 * call", and it loses to one every single time, so under a plain priority order a coverage
 * question would never once be asked. One slot is reserved for it instead.
 */
export type QuestionWorth = 'decisive' | 'due' | 'useful' | 'marginal' | 'none';

export interface QuestionAppraisal {
  readonly promptId: string;
  readonly worth: QuestionWorth;
  /** Stated in the owner's terms — this is what an omission reason is built from. */
  readonly because: string;
}

export interface AppraisalContext {
  /** A current answer already exists, so asking again changes nothing. */
  readonly hasCurrentAnswer: boolean;
  /** Command Core suppressed it — cooldown, expiry, cadence, snooze. Carries its reason. */
  readonly suppressedBecause: string | undefined;
  /**
   * The owner went looking for this question, so freshness and suppression do not apply.
   * They opened the area, or tapped `Answer it` on the thing being displayed.
   */
  readonly askedFor: boolean;
}

/**
 * What one question's answer could do.
 *
 * `candidate-eligibility` is the discriminator that matters. A question whose answer can
 * make a move possible or impossible decides *whether there is anything to recommend*;
 * one that only sharpens a description decides how the recommendation reads. The first is
 * worth interrupting someone for and the second is not.
 */
export function appraise(prompt: CapturePrompt, context: AppraisalContext): QuestionAppraisal {
  const { promptId, whatItCouldChange } = prompt;

  if (context.askedFor) {
    /*
     * The owner went looking for this. Grading a question someone deliberately opened
     * would be the app overruling them about their own attention, which is the one
     * judgement it is definitely not better placed to make.
     */
    return { promptId, worth: 'decisive', because: 'You opened this' };
  }

  if (context.suppressedBecause !== undefined) {
    return { promptId, worth: 'none', because: context.suppressedBecause };
  }

  if (context.hasCurrentAnswer) {
    return {
      promptId,
      worth: 'none',
      because: 'A current answer already exists — asking again would not change anything',
    };
  }

  if (whatItCouldChange.includes('candidate-eligibility')) {
    return {
      promptId,
      worth: 'decisive',
      because: 'Changes what is possible right now',
    };
  }

  if (
    whatItCouldChange.includes('recommendation') ||
    whatItCouldChange.includes('state-interpretation') ||
    whatItCouldChange.includes('safety')
  ) {
    return { promptId, worth: 'useful', because: 'Sharpens the call without gating it' };
  }

  return { promptId, worth: 'marginal', because: 'Recorded for later, not needed for today' };
}

export interface Selection {
  /** Prompt ids to ask, in the order given. */
  readonly asked: readonly string[];
  /** Prompt ids not asked, each with the reason it was not. */
  readonly held: readonly { readonly promptId: string; readonly because: string }[];
}

/**
 * Which of the appraised questions to actually ask.
 *
 * Decisive first and in full, because a blocked decision stays blocked until they are
 * answered. Useful ones fill whatever remains of the normal response budget. Marginal ones
 * are never raised unasked — they are not withheld out of caution, they simply have nothing
 * to contribute to today's decision.
 *
 * The hard ceiling is the last line of defence: if a profile somehow produces nine decisive
 * questions, the owner gets eight and the rest are held, because an interrogation is a
 * worse failure than an incomplete picture.
 */
export function choose(
  appraisals: readonly QuestionAppraisal[],
  budget: number = NORMAL_RESPONSE_BUDGET,
): Selection {
  const limit = Math.min(budget, HARD_CEILING);
  const chosen = new Set<string>();

  /*
   * One slot is held back for coverage before anything else is allocated, so a due area
   * cannot be crowded out week after week by whatever today's decision happens to need.
   */
  const hasDue = appraisals.some((item) => item.worth === 'due');
  const reserved = hasDue ? 1 : 0;

  /*
   * Priority passes decide *which* questions make the cut — decisive ones first, because
   * a blocked decision stays blocked until they are answered.
   */
  for (const item of appraisals) {
    if (item.worth !== 'decisive' || chosen.size >= limit - reserved) continue;
    chosen.add(item.promptId);
  }
  for (const item of appraisals) {
    if (item.worth !== 'due' || chosen.size >= limit) continue;
    chosen.add(item.promptId);
  }
  for (const item of appraisals) {
    if (item.worth !== 'useful' || chosen.size >= limit) continue;
    chosen.add(item.promptId);
  }

  /*
   * Order is then restored to the planner's, which is not the same thing as priority.
   * A guide that asks "which child?" before "how is that going?" is following a
   * sequence that has to hold whatever the relative value of the two questions is —
   * sorting by worth once put the second question first.
   */
  const asked: string[] = [];
  const held: { promptId: string; because: string }[] = [];
  for (const item of appraisals) {
    if (chosen.has(item.promptId)) {
      asked.push(item.promptId);
      continue;
    }
    held.push({
      promptId: item.promptId,
      because:
        item.worth === 'none'
          ? item.because
          : 'Would not change today’s call, and the check-in is already long enough',
    });
  }

  return { asked, held };
}
