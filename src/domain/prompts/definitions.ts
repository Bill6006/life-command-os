import type { LifeCategory } from '../records/categories';
import type { PrivacyClass } from '../records/envelope';
import { SCALE_LIST, scaleAttribute, type ScaleId } from '../records/scales';
import { assertPromptCatalogue, type PromptDefinition } from './policy';

/**
 * Every question this product asks in a normal flow.
 *
 * One catalogue, validated against the behaviour-first policy at module load. There
 * is no second place a prompt can be defined — a question typed straight into a
 * component would not be a `CapturePrompt`, would carry no attribute to write to, and
 * would therefore have nowhere to store its answer.
 *
 * Read the questions themselves as the specification. Every one of them can be
 * answered by remembering what happened or noticing what is true now. None asks the
 * owner to account for themselves.
 */

/** How the answer is collected. Determines the control and the stored value shape. */
export type PromptInput =
  | { readonly kind: 'scale'; readonly scaleId: ScaleId }
  | { readonly kind: 'choice'; readonly options: readonly string[] }
  | { readonly kind: 'minutes' }
  | { readonly kind: 'clock-time' }
  | { readonly kind: 'count' }
  | { readonly kind: 'text'; readonly maxLength: number };

export interface CapturePrompt extends PromptDefinition {
  readonly input: PromptInput;
  /** The canonical observation attribute this prompt's answer is written under. */
  readonly attribute: string;
  readonly category: LifeCategory;
  /**
   * Sensitivity of the answer, independent of category. Sleep and food are captured
   * under `time-attention-capacity` because that is the decision they inform today,
   * but their content is health data and is classified as such.
   */
  readonly privacy: PrivacyClass;
}

/** The answer that must be available wherever recall or noticing is uncertain (`OBS-006`). */
export const UNSURE = 'Unsure';

function choice(options: readonly string[]): PromptInput {
  return { kind: 'choice', options };
}

/* -------------------------------------------------------------------------- */
/* Anchored present state                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One prompt per approved scale, generated from the scale definitions.
 *
 * Generated rather than hand-written so the prompt text, the anchors, and the stored
 * attribute cannot drift apart, and so adding a scale cannot forget to add its
 * question.
 */
export const STATE_PROMPTS: readonly CapturePrompt[] = SCALE_LIST.map((scale) => ({
  promptId: `state:${scale.scaleId}`,
  text: scale.prompt,
  kind: 'state' as const,
  answers: scale.anchors.map((anchor) => anchor.label),
  allowsUnknown: true,
  whatItCouldChange: ['state-interpretation', 'candidate-eligibility', 'recommendation'],
  input: { kind: 'scale', scaleId: scale.scaleId },
  attribute: scaleAttribute(scale.scaleId),
  category: 'time-attention-capacity',
  privacy: scale.scaleId === 'sleep-recovery' ? 'health' : 'general',
}));

/* -------------------------------------------------------------------------- */
/* Capacity and context                                                        */
/* -------------------------------------------------------------------------- */

export const CONTEXT_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'context:available-minutes',
    text: 'How many minutes are genuinely free before your next commitment?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'minutes' },
    attribute: 'context:available-minutes',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
  {
    promptId: 'context:protected',
    text: 'Is anything protected right now?',
    kind: 'observable',
    answers: [
      'Nothing protected',
      'Sleep',
      'Family',
      'Caregiving',
      'Work focus',
      'Commute',
      'Recovery',
    ],
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'candidate-eligibility'],
    input: choice([
      'Nothing protected',
      'Sleep',
      'Family',
      'Caregiving',
      'Work focus',
      'Commute',
      'Recovery',
    ]),
    attribute: 'context:protected',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
];

/* -------------------------------------------------------------------------- */
/* Observable outcome patterns (task 9)                                        */
/* -------------------------------------------------------------------------- */

/**
 * The observable follow-ups that replace "did it work?".
 *
 * Each one asks about a thing that either happened or did not. The engine decides
 * what the answers mean; the owner only reports them. Which patterns a given action
 * uses is a property of the action (`OBS-009`) — Phase 7 domains declare their own,
 * and Phase 6 wires the general set.
 */
export const OUTCOME_PATTERN_IDS = [
  'started',
  'completed',
  'duration',
  'stopped-early',
  'returned-to-task',
  'still-interfering',
  'symptom-occurred',
  'interaction-happened',
  'decision-completed',
] as const;
export type OutcomePatternId = (typeof OUTCOME_PATTERN_IDS)[number];

const YES_NO: readonly string[] = ['Yes', 'No', UNSURE];

export const OUTCOME_PROMPTS: Record<OutcomePatternId, CapturePrompt> = {
  started: {
    promptId: 'outcome:started',
    text: 'Did you start it?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(YES_NO),
    attribute: 'outcome:started',
    category: 'career-work-learning',
    privacy: 'general',
  },
  completed: {
    promptId: 'outcome:completed',
    text: 'Did you finish it?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(YES_NO),
    attribute: 'outcome:completed',
    category: 'career-work-learning',
    privacy: 'general',
  },
  duration: {
    promptId: 'outcome:duration',
    text: 'About how long did you continue?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['confidence'],
    input: { kind: 'minutes' },
    attribute: 'outcome:duration-minutes',
    category: 'career-work-learning',
    privacy: 'general',
  },
  'stopped-early': {
    promptId: 'outcome:stopped-early',
    text: 'Did you stop earlier than you intended?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['confidence', 'recommendation'],
    input: choice(YES_NO),
    attribute: 'outcome:stopped-early',
    category: 'career-work-learning',
    privacy: 'general',
  },
  'returned-to-task': {
    promptId: 'outcome:returned-to-task',
    text: 'Did you return to the task you meant to do?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['confidence', 'recommendation'],
    input: choice(YES_NO),
    attribute: 'outcome:returned-to-task',
    category: 'career-work-learning',
    privacy: 'general',
  },
  'still-interfering': {
    promptId: 'outcome:still-interfering',
    text: 'Is the original problem still getting in the way?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(YES_NO),
    attribute: 'outcome:still-interfering',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
  'symptom-occurred': {
    promptId: 'outcome:symptom-occurred',
    text: 'Did a symptom occur afterwards?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'state-interpretation'],
    input: choice(YES_NO),
    attribute: 'outcome:symptom-occurred',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  'interaction-happened': {
    promptId: 'outcome:interaction-happened',
    text: 'Did the conversation happen?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(YES_NO),
    attribute: 'outcome:interaction-happened',
    category: 'direction-and-commitments',
    privacy: 'relationship',
  },
  'decision-completed': {
    promptId: 'outcome:decision-completed',
    text: 'Was the decision completed, delayed, or still blocked?',
    kind: 'observable',
    answers: ['Completed', 'Delayed', 'Still blocked', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Completed', 'Delayed', 'Still blocked', UNSURE]),
    attribute: 'outcome:decision-completed',
    category: 'direction-and-commitments',
    privacy: 'general',
  },
};

/* -------------------------------------------------------------------------- */
/* Sleep (task 12)                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight sleep capture (`OWN-043`, LEG-096, LEG-097).
 *
 * Times and counts, plus two anchored scales that already exist. Duration is
 * **calculated** from bedtime and wake time rather than asked for, and the
 * calculation is shown with its assumption — time in bed is not sleep, and the app
 * does not claim otherwise.
 */
export const SLEEP_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'sleep:bedtime',
    text: 'What time did you go to bed?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'clock-time' },
    attribute: 'sleep:bedtime',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'sleep:onset-minutes',
    text: 'About how long did it take to fall asleep?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: { kind: 'minutes' },
    attribute: 'sleep:onset-minutes',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'sleep:wake-time',
    text: 'What time did you wake up?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'clock-time' },
    attribute: 'sleep:wake-time',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'sleep:awakenings',
    text: 'How many times did you wake during the night?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'count' },
    attribute: 'sleep:awakenings',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'sleep:sleepiness',
    text: 'How sleepy are you right now?',
    kind: 'state',
    answers: ['Not sleepy', 'A little sleepy', 'Quite sleepy', 'Fighting sleep'],
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'candidate-eligibility'],
    input: choice(['Not sleepy', 'A little sleepy', 'Quite sleepy', 'Fighting sleep']),
    attribute: 'sleep:sleepiness',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'sleep:disruption',
    text: 'Anything you want to note about the night? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 500 },
    attribute: 'sleep:disruption-note',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
];

/* -------------------------------------------------------------------------- */
/* Food response (task 13)                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Lightweight food-response capture (`OWN-044`, LEG-100, LEG-101).
 *
 * Explicitly **not** a food log: no calories, no macros, no ingredient checklist.
 * Broad tags and what happened afterwards, because the only reason this exists is to
 * connect eating to energy and digestion — and a checkbox wall would be abandoned
 * within a week, producing worse evidence than three taps.
 */
export const FOOD_TAGS: readonly string[] = [
  'Light',
  'Substantial',
  'Heavy',
  'Late',
  'Skipped a meal',
  'Mostly carbohydrate',
  'Mostly protein',
  'Caffeine',
  'Alcohol',
];

export const FOOD_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'food:time',
    text: 'When did you eat?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'clock-time' },
    attribute: 'food:time',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'food:tags',
    text: 'Which of these describes it?',
    kind: 'observable',
    answers: FOOD_TAGS,
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(FOOD_TAGS),
    attribute: 'food:tags',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'food:energy-after',
    text: 'Energy since eating',
    kind: 'state',
    answers: ['Worse', 'About the same', 'Better', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(['Worse', 'About the same', 'Better', UNSURE]),
    attribute: 'food:energy-after',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'food:digestive-response',
    text: 'Did reflux or stomach discomfort occur?',
    kind: 'observable',
    answers: YES_NO,
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'state-interpretation'],
    input: choice(YES_NO),
    attribute: 'food:digestive-response',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
  {
    promptId: 'food:detail',
    text: 'Anything else worth noting? (optional)',
    kind: 'optional-note',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 500 },
    attribute: 'food:detail-note',
    category: 'time-attention-capacity',
    privacy: 'health',
  },
];

/* -------------------------------------------------------------------------- */
/* Quick Capture shell (task 15)                                               */
/* -------------------------------------------------------------------------- */

/**
 * The shared Quick Capture shell.
 *
 * One capture writes **one** canonical event (`OWN-063`). Domain-specific forms —
 * Work Win, fatherhood moment, financial decision — arrive with their domains in
 * Phase 7 and reuse this plumbing rather than adding parallel ones.
 */
export const QUICK_CAPTURE_KINDS: readonly string[] = [
  'Something worth remembering',
  'A win',
  'A friction or blocker',
  'A decision made',
];

export const QUICK_CAPTURE_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'capture:kind',
    text: 'What kind of thing was it?',
    kind: 'observable',
    answers: QUICK_CAPTURE_KINDS,
    allowsUnknown: false,
    whatItCouldChange: ['state-interpretation'],
    input: choice(QUICK_CAPTURE_KINDS),
    attribute: 'capture:kind',
    category: 'career-work-learning',
    privacy: 'general',
  },
  {
    promptId: 'capture:what-happened',
    text: 'What happened?',
    kind: 'observable',
    answers: [],
    allowsUnknown: false,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 500 },
    attribute: 'capture:what-happened',
    category: 'career-work-learning',
    privacy: 'note',
  },
];

/* -------------------------------------------------------------------------- */

/** Every prompt in the product, in one list. */
export const ALL_PROMPTS: readonly CapturePrompt[] = [
  ...STATE_PROMPTS,
  ...CONTEXT_PROMPTS,
  ...OUTCOME_PATTERN_IDS.map((id) => OUTCOME_PROMPTS[id]),
  ...SLEEP_PROMPTS,
  ...FOOD_PROMPTS,
  ...QUICK_CAPTURE_PROMPTS,
];

/**
 * The catalogue validates itself the moment it is imported.
 *
 * Nothing can render a prohibited prompt, because nothing can import this module
 * while one exists (`OBS-012`).
 */
assertPromptCatalogue(ALL_PROMPTS);

const BY_ID = new Map(ALL_PROMPTS.map((prompt) => [prompt.promptId, prompt]));

export function promptById(promptId: string): CapturePrompt {
  const found = BY_ID.get(promptId);
  if (found === undefined) throw new Error(`Unknown prompt: ${promptId}`);
  return found;
}
