import { adaptFlat, type FlatDomainMoveView } from '../moves/adapt';

/**
 * Faith and meaning: what the app may hold, and what it may never say (Prompt 8F).
 *
 * ## Authority separation, and why it is structural rather than editorial
 *
 * Every other domain ships a vocabulary: health has its actions, fatherhood its learning
 * map, career its ladder. This one ships **no list of values and no list of practices**,
 * and that absence is the entire design.
 *
 * A built-in catalogue of practices worth doing would be this application taking a
 * position on how a person should live. A list of values worth holding would be worse.
 * So the owner names his own, in his own words, and the domain's whole job is to hold
 * them and show him what he recorded — never to rank them, correct them, complete them,
 * or suggest one he has not thought of.
 *
 * The only closed set here is the set of **actions the app may propose**, and every one
 * of them is about something he already wrote down.
 *
 * ## What is absent, not filtered
 *
 * No scripture, no doctrine, no tradition, no prayer text, no claim about what any
 * practice achieves, no reward, no consequence, and no score. Not one word of this file
 * asserts anything about God, and nothing downstream can, because there is no code path
 * that composes a sentence about belief.
 */

export const FAITH_ACTION_IDS = [
  'return-to-a-practice',
  'do-the-smallest-version',
  'make-the-repair',
  'do-the-thing-for-someone-else',
  'write-down-what-matters',
] as const;
export type FaithActionId = (typeof FAITH_ACTION_IDS)[number];

/**
 * A faith action, as a view over a canonical catalogue pattern ().
 *
 * The shape every existing reader expects, with the canonical  carried
 * alongside this slice's own local id so evidence recorded against either resolves to
 * one move.
 */
export type FaithAction = FlatDomainMoveView<FaithActionId>;

/**
 * Every faith action, as a view over the canonical catalogue (`V33-047`).
 *
 * No move is authored here any more. Each entry names the catalogue pattern it offers and
 * keeps this domain's own wording where that wording says more than the generic line —
 * which, for this slice, is nearly everywhere: these sentences were written in the owner's
 * voice and losing them to a migration would be a real loss.
 *
 * What the catalogue supplies is the half that ranking reads: duration, minimum, friction,
 * capacity shape, safety class, lifecycle, observation window, and identity. A domain
 * cannot disagree with it about those, which is the point.
 */
export const FAITH_ACTIONS: Record<FaithActionId, FaithAction> = {
  'return-to-a-practice': adaptFlat(
    'return-to-a-practice',
    'live-the-value:do-the-small-version',
    {
      statement: 'Pick up something you said you wanted to do',
      intendedOutcome: 'You did it, in whatever version you had time for',
      minimumVersion: 'The shortest version that still counts as having done it',
      stoppingPoint: 'Stop when you want to. Length is not the point',
      followUpPromptId: 'faith:practice-happened',
    },
  ),
  'do-the-smallest-version': adaptFlat(
    'do-the-smallest-version',
    'live-the-value:two-minute-version',
    {
      intendedOutcome: 'It happened at all',
      minimumVersion: 'Two minutes',
      stoppingPoint: 'Two minutes is a complete version, not a failed long one',
      followUpPromptId: 'faith:practice-happened',
    },
  ),
  'make-the-repair': adaptFlat('make-the-repair', 'live-the-value:put-it-right', {
    intendedOutcome: 'You did what you said you would',
    minimumVersion: 'The first step of it',
    stoppingPoint: 'One attempt. What happens next is not yours to control',
    followUpPromptId: 'faith:repair-happened',
  }),
  'do-the-thing-for-someone-else': adaptFlat(
    'do-the-thing-for-someone-else',
    'live-the-value:for-someone-else',
    {
      intendedOutcome: 'It was done',
      minimumVersion: 'The smallest useful part of it',
      stoppingPoint: 'Stop when it is done. Nobody needs to know about it',
      followUpPromptId: 'faith:service-happened',
    },
  ),
  'write-down-what-matters': adaptFlat(
    'write-down-what-matters',
    'live-the-value:notice-the-gap',
    {
      statement: 'Write down one thing that actually matters to you',
      intendedOutcome: 'There is one sentence on record, in your words',
      minimumVersion: 'One line. It can be wrong and changed later',
      stoppingPoint: 'One thing. A list can wait',
      followUpPromptId: 'outcome:completed',
    },
  ),
};

/* -------------------------------------------------------------------------- */

/** How often the owner said he wants a practice to come round. His choice, not a target. */
export const PRACTICE_RHYTHMS = [
  { id: 'daily', label: 'Most days', days: 1 },
  { id: 'weekly', label: 'Weekly', days: 7 },
  { id: 'occasional', label: 'Now and then', days: 30 },
  { id: 'no-rhythm', label: 'No particular rhythm', days: 0 },
] as const;
export type PracticeRhythmId = (typeof PRACTICE_RHYTHMS)[number]['id'];

/** What happened with a practice. Never how well it went. */
export const PRACTICE_OUTCOMES = [
  { id: 'did-it', label: 'Did it' },
  { id: 'shorter', label: 'A shorter version' },
  { id: 'did-not', label: 'Did not this time' },
] as const;

export const FAITH_ATTRIBUTES = {
  practiceDone: 'faith:practice-done',
  practiceHappened: 'faith:practice-happened',
  service: 'faith:service',
  serviceHappened: 'faith:service-happened',
  repairNeeded: 'faith:repair-needed',
  repairHappened: 'faith:repair-happened',
  struggle: 'faith:struggle',
  meaningfulEvent: 'faith:meaningful-event',
} as const;

/**
 * Words this domain may never use.
 *
 * The first group claims authority it does not have. The second grades a person's inner
 * life. The third is the language of religious pressure, which is the specific harm a
 * faith feature can do that no other domain can.
 */
export const FORBIDDEN_FAITH_VOCABULARY = [
  // Authority.
  'god wants',
  'god will',
  'scripture says',
  'the bible says',
  'sinful',
  'righteous',
  'blessed if',
  'punish',
  'salvation',
  'doctrine',
  'heretical',
  // Grading.
  'spiritual maturity',
  'faith score',
  'faithfulness rating',
  'more devout',
  'lukewarm',
  'backslid',
  // Pressure.
  'you should pray',
  'you owe',
  'streak',
  'days in a row',
  'do not break',
] as const;
