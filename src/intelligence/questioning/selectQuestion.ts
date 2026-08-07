import { promptById } from '../../domain/prompts/definitions';
import { situationFieldMatters, timeWouldDiscriminate } from '../../domain/domains/capacity';
import type { CandidateAction, HighValueQuestion, StateAssessment } from '../types';

/**
 * Question-value selection (`UX-007`, `V33-023`, owner clarification 2).
 *
 * A question is asked **only when its answer would change which actions are eligible** —
 * not to refine a ranking, and never to fill out a profile.
 *
 * ## Why this stopped asking for minutes first
 *
 * It used to open with "how much time is genuinely free?" and nothing else. That is a
 * reasonable-sounding question which almost never earns its place, because minutes are the
 * *last* thing that decides whether a move is possible. Forty free minutes at a desk in an
 * open-plan office rules out most of what forty minutes at home would allow, and the number
 * is identical in both. Asking for it first collects the one input that cannot be acted on
 * alone, and spends the single question this surface is allowed doing it.
 *
 * So the ladder runs from most constraining to least. Where you are rules out whole
 * categories. What you are in the middle of rules out more. Whether you can step away, and
 * whether you can speak freely, decide between what is left. Only when all of that is known
 * — and two surviving moves are separated by nothing but length — is a minute count worth
 * one of the owner's answers.
 *
 * At most one question is ever returned. There is no batch, no questionnaire, and no
 * onboarding sequence, by construction rather than by discipline.
 */

/**
 * The situation questions, most constraining first.
 *
 * Each entry names the field it fills, so "have we already asked this?" is a lookup on the
 * assessment rather than a second list that can drift out of step with the first.
 */
const SITUATION_LADDER: readonly {
  readonly promptId: string;
  readonly field: 'setting' | 'engagement' | 'interruptibility' | 'privacy';
  readonly known: (state: StateAssessment) => boolean;
  readonly whyItMatters: string;
}[] = [
  {
    promptId: 'context:setting',
    field: 'setting',
    known: (state) => state.situation.setting !== undefined,
    whyItMatters:
      'Where you are rules whole categories of move in or out before anything else is considered — a number of free minutes cannot.',
  },
  {
    promptId: 'context:engagement',
    field: 'engagement',
    known: (state) => state.situation.engagement !== undefined,
    whyItMatters:
      'What you are already in the middle of decides whether something has to wait or can run alongside it.',
  },
  {
    promptId: 'context:interruptibility',
    field: 'interruptibility',
    known: (state) => state.situation.interruptibility !== undefined,
    whyItMatters:
      'Anything needing an unbroken block is either possible or it is not, and this is the answer that settles it.',
  },
  {
    promptId: 'context:privacy',
    field: 'privacy',
    known: (state) => state.situation.privacy !== undefined,
    whyItMatters:
      'Some moves need room to speak or think. This decides whether those are on the table at all.',
  },
];

/** `Not sure` is always available, and is a real answer rather than a way out. */
const NOT_SURE = 'Not sure';

function ask(
  promptId: string,
  whyItMatters: string,
  state: StateAssessment,
  answers: readonly string[],
): HighValueQuestion {
  return {
    kind: 'question',
    promptId,
    prompt: promptById(promptId).text,
    whyItMatters,
    couldChange: ['Candidate eligibility', 'Recommendation', 'Confidence'],
    answers: [...answers, NOT_SURE],
    confidence: state.confidence,
  };
}

export function selectQuestion(
  state: StateAssessment,
  candidates: readonly CandidateAction[],
): HighValueQuestion | undefined {
  if (candidates.length === 0) return undefined;

  for (const rung of SITUATION_LADDER) {
    if (rung.known(state)) continue;
    /*
     * Unknown is not sufficient reason to ask. The answer has to be able to rule something
     * in or out among the moves actually on the table — otherwise this surface spends its
     * one question describing a situation nothing consults.
     */
    if (!situationFieldMatters(rung.field, candidates)) continue;
    return ask(rung.promptId, rung.whyItMatters, state, promptById(rung.promptId).answers);
  }

  /*
   * The situation is known. A minute count is now worth asking for, but only if it could
   * still reorder something: two or more eligible moves that need genuinely different
   * amounts of time. If they all need the same, or only one survives, the answer changes
   * nothing and the question is noise.
   */
  if (timeWouldDiscriminate(candidates, state.situation)) {
    return ask(
      'context:available-minutes',
      'Everything else about the situation is known, and the moves still open differ only in how long they take — so this is the answer that separates them.',
      state,
      /*
       * Bands rather than the catalogue's answer list: that prompt takes a minutes input
       * and declares none. The guide reached by `Answer it` collects the same fact through
       * the same prompt id.
       */
      ['Under 15 minutes', '15 to 40 minutes', 'More than 40 minutes'],
    );
  }

  return undefined;
}
