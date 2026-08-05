import {
  BOUNDARY_OUTCOMES,
  CONNECTION_KINDS,
  EMOTIONAL_ATTRIBUTES,
  REJECTION_RESPONSES,
  REPAIR_OUTCOMES,
  SOCIAL_PRACTICES,
} from '../emotional/social';
import type { CapturePrompt } from './definitions';

/**
 * What this domain asks (Prompt 8E).
 *
 * Its own module because it is the largest set in the catalogue, and because this is the
 * domain where the behaviour-first rule earns its keep. The obvious questions here are
 * all forbidden and all tempting: how did that make you feel, why do you think they said
 * that, did talking about it help, are you avoiding them. Every one asks the owner to
 * narrate someone else's mind or his own, and every one would store a guess as evidence.
 *
 * What is left is small and answerable: did it happen, did you send it, is it still
 * unresolved, did either of you go back.
 *
 * `UNSURE` is imported lazily through the answer lists rather than from `definitions.ts`
 * to keep this module free of a runtime cycle — the catalogue imports these.
 */

export const UNSURE_ANSWER = 'Unsure';

const CONNECTION_ANSWERS = CONNECTION_KINDS.map((kind) => kind.label);
const PRACTICE_ANSWERS = SOCIAL_PRACTICES.map((practice) => practice.label);
const BOUNDARY_ANSWERS = BOUNDARY_OUTCOMES.map((outcome) => outcome.label);
const REPAIR_ANSWERS = REPAIR_OUTCOMES.map((outcome) => outcome.label);
const REJECTION_ANSWERS = REJECTION_RESPONSES.map((response) => response.label);

function choice(options: readonly string[]): CapturePrompt['input'] {
  return { kind: 'choice', options };
}

export const EMOTIONAL_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:emotional-and-relationships',
    text: 'Have you spent time with anyone since last time?',
    kind: 'observable',
    answers: [...CONNECTION_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice([...CONNECTION_ANSWERS, UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.connection,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    /**
     * Interference, not distress.
     *
     * "Is something getting in the way" is observable — he either had to work around it
     * or he did not. "How bad is it" would be a severity rating about his own inner
     * life, which is the judgement this product refuses to ask for.
     */
    promptId: 'emotional:interference',
    text: 'Is something on your mind getting in the way of what you meant to do?',
    kind: 'observable',
    answers: ['Not really', 'A bit', 'A lot', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice(['Not really', 'A bit', 'A lot', UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.interference,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:practice',
    text: 'Did you do any of these since last time?',
    kind: 'observable',
    answers: [...PRACTICE_ANSWERS, 'None of these', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice([...PRACTICE_ANSWERS, 'None of these', UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.practice,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:reached-out',
    text: 'Did you send it?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'No', UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.reachedOut,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:boundary-decided',
    text: 'What did you decide to do, or not do?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'text', maxLength: 200 },
    attribute: EMOTIONAL_ATTRIBUTES.boundaryDecided,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:boundary-outcome',
    text: 'Did that happen?',
    kind: 'observable',
    answers: [...BOUNDARY_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice([...BOUNDARY_ANSWERS, UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.boundaryOutcome,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:conflict-open',
    text: 'Is anything still unresolved with someone?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice(['Yes', 'No', UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.conflictOpen,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    promptId: 'emotional:repair-happened',
    text: 'Has either of you been back in touch since?',
    kind: 'observable',
    answers: [...REPAIR_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice([...REPAIR_ANSWERS, UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.repairOutcome,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    /**
     * Recovery measured by re-entry, not by mood.
     *
     * "Did you try again" is answerable. "Have you got over it" is not, and asking would
     * be asking him to grade himself on something nobody can grade.
     */
    promptId: 'emotional:rejection-response',
    text: 'Since that did not go your way, have you tried anything similar again?',
    kind: 'observable',
    answers: [...REJECTION_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice([...REJECTION_ANSWERS, UNSURE_ANSWER]),
    attribute: EMOTIONAL_ATTRIBUTES.rejectionResponse,
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
  {
    /**
     * Private by default, and classified as the most protected class there is.
     *
     * An optional note in this domain is the one place a relationship, a conflict, or
     * anything else could be described in full sentences. `private-pattern` keeps it out
     * of every export unless the owner separately says otherwise.
     */
    promptId: 'emotional:note',
    text: 'Anything you want to keep a note of? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 1000 },
    attribute: EMOTIONAL_ATTRIBUTES.note,
    category: 'emotional-and-relationships',
    privacy: 'private-pattern',
  },
];
