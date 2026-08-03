import { knownValue } from '../../domain/records';
import type { CandidateAction, HighValueQuestion, StateAssessment } from '../types';

/**
 * Question-value selection (`UX-007`).
 *
 * A question is asked **only when its answer would change which actions are
 * eligible** — not to refine a ranking, and never to fill out a profile.
 *
 * This is the schema-level rule made operational: `QuestionRecord.couldChange`
 * cannot be empty, so a question that changes nothing has no valid form. Here that
 * becomes: return `undefined` unless the answer flips eligibility.
 *
 * At most one is ever returned. There is no batch, no questionnaire, and no
 * onboarding sequence — by construction, not by discipline.
 */
export function selectQuestion(
  state: StateAssessment,
  candidates: readonly CandidateAction[],
): HighValueQuestion | undefined {
  if (candidates.length === 0) return undefined;

  const free = knownValue(state.availableMinutes);

  /*
   * Unknown free time is the one question worth interrupting for in this baseline:
   * it decides which candidates fit at all. Everything else the engine can either
   * reason about or honestly abstain from.
   */
  if (free === undefined) {
    return {
      kind: 'question',
      prompt: 'How much time is actually free before your next commitment?',
      whyItMatters:
        'It decides which actions are eligible at all, not how they are ranked — so the answer changes the recommendation rather than refining it.',
      couldChange: ['Candidate eligibility', 'Recommendation', 'Confidence'],
      answers: ['Under 15 minutes', '15 to 40 minutes', 'More than 40 minutes'],
      confidence: state.confidence,
    };
  }

  return undefined;
}
