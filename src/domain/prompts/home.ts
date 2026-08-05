import {
  ACCESS_ANSWERS,
  CONDITION_ANSWERS,
  FRICTION_LABELS,
  FRICTION_OUTCOMES,
  HOME_ATTRIBUTES,
  NOTHING_IN_THE_WAY,
  SETUP_TIMES,
  TRANSITION_ANSWERS,
} from '../home/environment';
import type { CapturePrompt } from './definitions';

/**
 * What the home domain asks (Prompt 8G).
 *
 * Every question is about **an activity that was attempted** — did you get started, was
 * the thing you needed where you were, did anything get in the way. Not one of them asks
 * about the state of a room, because the state of a room is not a fact this application
 * has any use for and asking about it is the first step to grading it.
 *
 * There is no question anywhere in this catalogue of the form "is the kitchen tidy", "how
 * often do you clean", or "which jobs are outstanding". Those are the three questions a
 * home feature is most tempted to ask, and each one turns the product into a chore list.
 */

const UNSURE_ANSWER = 'Unsure';

function choice(options: readonly string[]): CapturePrompt['input'] {
  return { kind: 'choice', options };
}

const FRICTION_ANSWERS = [NOTHING_IN_THE_WAY, ...FRICTION_LABELS, UNSURE_ANSWER];

export const HOME_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:home-and-environment',
    text: 'Did anything get in the way of what you sat down to do?',
    kind: 'observable',
    answers: FRICTION_ANSWERS,
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(FRICTION_ANSWERS),
    attribute: HOME_ATTRIBUTES.friction,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    promptId: 'home:access',
    text: 'Was what you needed where you were?',
    kind: 'observable',
    answers: [...ACCESS_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: choice([...ACCESS_ANSWERS, UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.access,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    promptId: 'home:setup-time',
    text: 'How long before you could start?',
    kind: 'observable',
    answers: [...SETUP_TIMES, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'candidate-eligibility'],
    input: choice([...SETUP_TIMES, UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.setupTime,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    /**
     * Noise, light, and privacy, as a present state rather than a complaint.
     *
     * The one question in this domain that may interrupt: whether the room is too loud
     * decides whether a focus action is worth suggesting at all, so the answer changes
     * what is eligible rather than merely describing the afternoon.
     */
    promptId: 'home:conditions',
    text: 'Noise, light, and privacy where you are',
    kind: 'state',
    answers: [...CONDITION_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice([...CONDITION_ANSWERS, UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.conditions,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    promptId: 'home:transition',
    text: 'When you switched the space over to something else, did anything have to move first?',
    kind: 'observable',
    answers: [...TRANSITION_ANSWERS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: choice([...TRANSITION_ANSWERS, UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.transition,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    /**
     * The one change, in his words.
     *
     * Phrased as something he has already decided rather than something he ought to work
     * out, for the same reason the faith slice phrased its repair that way: a question
     * that asks a person to produce a solution on the spot is answered with a shrug.
     */
    promptId: 'home:change-named',
    text: 'Is there one thing you have decided to change about the setup?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'text', maxLength: 200 },
    attribute: HOME_ATTRIBUTES.changeNamed,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    promptId: 'home:change-made',
    text: 'Did you make the change?',
    kind: 'observable',
    answers: ['Yes', 'Started it', 'No', UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Started it', 'No', UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.changeMade,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    /**
     * The observable friction outcome, and the only measure of success this domain has.
     *
     * Not "was the change worth it" and not "does it look better" — both are judgements.
     * Whether the same thing got in the way again is a fact, and it is the fact that
     * decides whether anything more is offered.
     */
    promptId: 'home:friction-again',
    text: 'Since you changed it, has the same thing got in the way again?',
    kind: 'observable',
    answers: [...FRICTION_OUTCOMES, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence', 'candidate-eligibility'],
    input: choice([...FRICTION_OUTCOMES, UNSURE_ANSWER]),
    attribute: HOME_ATTRIBUTES.frictionOutcome,
    category: 'home-and-environment',
    privacy: 'general',
  },
  {
    /** The unexpected route, for something that got in the way and has no button. */
    promptId: 'home:something-in-the-way',
    text: 'Anything that got in the way just now? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 500 },
    attribute: HOME_ATTRIBUTES.frictionNote,
    category: 'home-and-environment',
    privacy: 'general',
  },
];
