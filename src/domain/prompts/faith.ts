import { FAITH_ATTRIBUTES, PRACTICE_OUTCOMES } from '../faith/meaning';
import type { CapturePrompt } from './definitions';

/**
 * What the faith domain asks (Prompt 8F).
 *
 * Every question is about something the owner already named. None of them asks what he
 * believes, whether he believes it strongly, whether a practice helped, or what anything
 * meant — those are the questions a faith feature is most tempted to ask and has least
 * business asking.
 *
 * The struggle prompt is the sharpest case. It records that something is hard, in his
 * words, and the domain does nothing with it: no suggestion, no interpretation, no
 * concern. Recording it is the whole feature.
 */

const UNSURE_ANSWER = 'Unsure';
const OUTCOME_ANSWERS = PRACTICE_OUTCOMES.map((outcome) => outcome.label);

function choice(options: readonly string[]): CapturePrompt['input'] {
  return { kind: 'choice', options };
}

export const FAITH_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:faith-and-meaning',
    text: 'Did you do any of the things you said you wanted to?',
    kind: 'observable',
    answers: [...OUTCOME_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice([...OUTCOME_ANSWERS, UNSURE_ANSWER]),
    attribute: FAITH_ATTRIBUTES.practiceDone,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
  {
    promptId: 'faith:practice-happened',
    text: 'Did it happen?',
    kind: 'observable',
    answers: [...OUTCOME_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice([...OUTCOME_ANSWERS, UNSURE_ANSWER]),
    attribute: FAITH_ATTRIBUTES.practiceHappened,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
  {
    promptId: 'faith:service-happened',
    text: 'Did you do the thing for someone else?',
    kind: 'observable',
    answers: ['Yes', 'Partly', 'No', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Partly', 'No', UNSURE_ANSWER]),
    attribute: FAITH_ATTRIBUTES.serviceHappened,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
  {
    promptId: 'faith:repair-needed',
    text: 'Is there something you have decided to put right?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'text', maxLength: 200 },
    attribute: FAITH_ATTRIBUTES.repairNeeded,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
  {
    promptId: 'faith:repair-happened',
    text: 'Did you do it?',
    kind: 'observable',
    answers: ['Yes', 'Started it', 'No', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Started it', 'No', UNSURE_ANSWER]),
    attribute: FAITH_ATTRIBUTES.repairHappened,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
  {
    /**
     * Struggle, recorded and left alone.
     *
     * Classified `faith-struggle` and protected: it is written in full sentences, it is
     * nobody else's business, and it is the last thing anyone would want on a shared
     * screen. Protected because it is private, **not** because it is a problem — the
     * domain has no view on that, and nothing reads this to decide anything.
     */
    promptId: 'faith:struggle',
    text: 'Anything you want to write down about how this is going? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 2000 },
    attribute: FAITH_ATTRIBUTES.struggle,
    category: 'faith-and-meaning',
    privacy: 'faith',
  },
];
