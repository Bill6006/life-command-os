import {
  DECISION_OUTCOMES,
  LAST_LOOKED,
  MONEY_ATTRIBUTES,
  PRESSURE_SINCE,
  RESILIENCE_BANDS,
} from '../money/strategy';
import type { CapturePrompt } from './definitions';

/**
 * What the money domain asks (Prompt 8H).
 *
 * Seven questions, and the pressure scale generated alongside them. Not one asks what
 * anything cost, what came in, what is owed, or where it went — those are the questions a
 * money feature is most tempted to ask, and each one requires the transaction machinery
 * the plan defers.
 *
 * The two figure questions are the exception that proves it: they exist, they are the only
 * numbers in the domain, and they are unreachable until the owner separately switches
 * `money-figures` on.
 */

const UNSURE_ANSWER = 'Unsure';

function choice(options: readonly string[]): CapturePrompt['input'] {
  return { kind: 'choice', options };
}

export const MONEY_PROMPTS: readonly CapturePrompt[] = [
  {
    /**
     * The opening question of the area, and deliberately the gentlest.
     *
     * Whether he has looked is the fact everything else depends on: readings taken by
     * somebody who has not opened anything in six weeks are recollections. It is also the
     * one question here that can be answered honestly on a bad month without admitting
     * anything.
     */
    promptId: 'update-area:money',
    text: 'When did you last look at it?',
    kind: 'observable',
    answers: [...LAST_LOOKED, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'candidate-eligibility', 'recommendation'],
    input: choice([...LAST_LOOKED, UNSURE_ANSWER]),
    attribute: MONEY_ATTRIBUTES.lastLooked,
    category: 'money',
    privacy: 'money',
  },
  {
    promptId: 'money:resilience',
    text: 'If money stopped coming in, how long could you cover things?',
    kind: 'state',
    answers: [...RESILIENCE_BANDS, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice([...RESILIENCE_BANDS, UNSURE_ANSWER]),
    attribute: MONEY_ATTRIBUTES.resilience,
    category: 'money',
    privacy: 'money',
  },
  {
    promptId: 'money:decision-named',
    text: 'Is there a money decision you are weighing?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'text', maxLength: 200 },
    attribute: MONEY_ATTRIBUTES.decisionNamed,
    category: 'money',
    privacy: 'money',
  },
  {
    promptId: 'money:decision-made',
    text: 'Did you make the call?',
    kind: 'observable',
    answers: [...DECISION_OUTCOMES, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice([...DECISION_OUTCOMES, UNSURE_ANSWER]),
    attribute: MONEY_ATTRIBUTES.decisionMade,
    category: 'money',
    privacy: 'money',
  },
  {
    /**
     * The observable outcome, and the wording matters.
     *
     * It asks whether the pressure moved, not whether the decision worked. The second
     * would be asking him to judge efficacy, which the behaviour-first policy prohibits,
     * and it would invite a causal claim the evidence cannot support.
     */
    promptId: 'money:pressure-since',
    text: 'Since then, is there less on your mind about money, the same, or more?',
    kind: 'observable',
    answers: [...PRESSURE_SINCE, UNSURE_ANSWER],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice([...PRESSURE_SINCE, UNSURE_ANSWER]),
    attribute: MONEY_ATTRIBUTES.pressureSince,
    category: 'money',
    privacy: 'money',
  },
  {
    /** The first of two figures, and unreachable until `money-figures` is switched on. */
    promptId: 'money:goal-target',
    text: 'What number are you working towards?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'count' },
    attribute: MONEY_ATTRIBUTES.goalTarget,
    category: 'money',
    privacy: 'money',
  },
  {
    promptId: 'money:goal-current',
    text: 'Where is it now?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'count' },
    attribute: MONEY_ATTRIBUTES.goalCurrent,
    category: 'money',
    privacy: 'money',
  },
  {
    /** The unexpected route: something happened and he wants it on record. */
    promptId: 'money:event',
    text: 'Anything about money worth noting? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 1000 },
    attribute: MONEY_ATTRIBUTES.event,
    category: 'money',
    privacy: 'money',
  },
];
