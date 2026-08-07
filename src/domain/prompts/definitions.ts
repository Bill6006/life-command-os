import type { LifeCategory } from '../records/categories';
import type { PrivacyClass } from '../records/envelope';
import { STUDY_BARRIERS } from '../career/ladder';
import {
  MILESTONE_CATALOGUE,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TRACKED_SKILLS,
} from '../fatherhood/development';
import { MILESTONE_STATUS_LABELS, REPORTABLE_MILESTONE_STATUSES } from '../records/fatherhood';
import { MEDITATION_PURPOSE_LABELS, MEDITATION_PURPOSES } from '../health/actions';
import { SCALE_LIST, scaleAttribute, type ScaleId } from '../records/scales';
import { assertPromptCatalogue, type PromptDefinition } from './policy';
import { EMOTIONAL_PROMPTS } from './emotional';
import { FAITH_PROMPTS } from './faith';
import { HOME_PROMPTS } from './home';
import { MONEY_PROMPTS } from './money';

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
   * Sensitivity of the answer, decided independently of category.
   *
   * The two answer different questions: privacy is *how sensitive is this*, category
   * is *which area of life owns it*. A capacity question about free time is `general`
   * data owned by time-and-capacity; a pain question is `health` data owned by health.
   * Collapsing them would mean either over-classifying ordinary facts or leaking
   * sensitive ones.
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
/**
 * One prompt per scale, classified by the scale itself.
 *
 * This used to consult a `HEALTH_SCALES` set and a ternary, which could answer only "is
 * this health data". Prompt 8H needed a third answer — a money reading is neither general
 * capacity nor health — and a set that must grow a branch per classification is a lookup
 * table pretending to be a rule. The classification now travels with the scale, so a new
 * scale cannot be filed under the wrong area by omission.
 *
 * The **prompt id** follows the scale's namespace, which is what decides the owning
 * surface. The **stored attribute** does not: it stays `state:<id>` for every scale, so
 * one reading has exactly one canonical home whichever surface collected it.
 */
export const STATE_PROMPTS: readonly CapturePrompt[] = SCALE_LIST.map((scale) => ({
  promptId: `${scale.promptNamespace}:${scale.scaleId}`,
  text: scale.prompt,
  kind: 'state' as const,
  answers: scale.anchors.map((anchor) => anchor.label),
  allowsUnknown: true,
  whatItCouldChange: ['state-interpretation', 'candidate-eligibility', 'recommendation'],
  input: { kind: 'scale', scaleId: scale.scaleId },
  attribute: scaleAttribute(scale.scaleId),
  category: scale.category,
  privacy: scale.privacy,
}));

/* -------------------------------------------------------------------------- */
/* Capacity and context                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Contextual action capacity (`V33-023`, owner clarification 2).
 *
 * ## Why the clock question was the wrong first question
 *
 * The app used to open by asking how many minutes were free. It is a reasonable-sounding
 * question that almost never earns its place, because minutes are the *last* thing that
 * decides whether a move is possible. Forty free minutes at a desk in an open-plan office
 * with a call in the calendar rules out most of what forty minutes at home would allow.
 * Asking for a number first collects the one input that cannot be acted on alone, and
 * spends the owner's attention doing it.
 *
 * These prompts model the situation instead: where the owner is, what they are in the
 * middle of, whether they can be interrupted or overheard, and what is to hand. Each is a
 * plain observation with a `Not sure` route, and each changes which moves are *eligible* —
 * not merely how they rank.
 *
 * The minutes question survives, further down, for the narrow case it is genuinely good
 * at: two moves are both eligible and the only thing separating them is length. It is
 * asked then and not before.
 */
export const CONTEXT_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'context:setting',
    text: 'Where are you right now?',
    kind: 'observable',
    answers: ['Home', 'Work', 'Out and about', 'Travelling', 'Somewhere else'],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice(['Home', 'Work', 'Out and about', 'Travelling', 'Somewhere else']),
    attribute: 'context:setting',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
  {
    promptId: 'context:engagement',
    text: 'What are you in the middle of?',
    kind: 'observable',
    answers: [
      'Nothing in particular',
      'Working',
      'With family',
      'Eating',
      'Travelling',
      'Winding down',
    ],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice([
      'Nothing in particular',
      'Working',
      'With family',
      'Eating',
      'Travelling',
      'Winding down',
    ]),
    attribute: 'context:engagement',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
  {
    promptId: 'context:interruptibility',
    text: 'Could you step away and focus without being interrupted?',
    kind: 'observable',
    answers: ['Yes, freely', 'Briefly', 'Not right now'],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: choice(['Yes, freely', 'Briefly', 'Not right now']),
    attribute: 'context:interruptibility',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
  {
    promptId: 'context:privacy',
    text: 'Are you somewhere you could speak or move freely?',
    kind: 'observable',
    answers: ['Yes', 'Only quietly', 'No — around other people'],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility'],
    input: choice(['Yes', 'Only quietly', 'No — around other people']),
    attribute: 'context:privacy',
    category: 'time-attention-capacity',
    privacy: 'general',
  },
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
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
    category: 'health-recovery-energy',
    privacy: 'health',
  },
];

/* -------------------------------------------------------------------------- */
/* Health, recovery, and energy (Prompt 8B)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Update This Area, for health (`OWN-013`, `XDS-034`).
 *
 * The entry question is pain interference rather than a menu, because it is the one
 * health answer that can change what the app is allowed to suggest. Everything else
 * follows from it.
 *
 * Read the wording: not one of these asks the owner to interpret a symptom, rate pain
 * on a clinical scale, or explain why their body is doing something. They ask what is
 * observable — whether it is in the way, how long it has been going on, whether the
 * thing happened.
 */
export const HEALTH_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:health-recovery-energy',
    text: 'Is anything physical getting in the way right now?',
    kind: 'state',
    answers: ['Not at all', 'Slightly', 'Noticeably', 'A lot', 'Cannot work around it'],
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'candidate-eligibility', 'recommendation'],
    input: { kind: 'scale', scaleId: 'pain-interference' },
    attribute: scaleAttribute('pain-interference'),
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    /**
     * The escalation trigger, and it asks about **duration** rather than severity.
     *
     * How long something has been going on is a fact the owner can state. How bad it
     * is on a scale of ten is a clinical judgement, and asking for one would be this
     * product pretending to a role it has explicitly refused.
     */
    promptId: 'health:persistence',
    text: 'How long has it been going on?',
    kind: 'observable',
    answers: ['Today only', 'A few days', 'A couple of weeks', 'Longer than a month', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['safety', 'recommendation'],
    input: choice([
      'Today only',
      'A few days',
      'A couple of weeks',
      'Longer than a month',
      UNSURE,
    ]),
    attribute: 'health:persistence',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    promptId: 'health:hydration',
    text: 'Have you had much to drink today?',
    kind: 'observable',
    answers: ['Barely anything', 'Some', 'Plenty', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(['Barely anything', 'Some', 'Plenty', UNSURE]),
    attribute: 'health:hydration',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    promptId: 'health:food-need',
    text: 'Are you hungry right now?',
    kind: 'state',
    answers: ['Not at all', 'A little', 'Very', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(['Not at all', 'A little', 'Very', UNSURE]),
    attribute: 'health:food-need',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    /**
     * Movement, recorded as what happened.
     *
     * Broad kinds and nothing else — no sets, no reps, no distance, no plan. The
     * Blueprint forbids workout programming, and a capture that asked for a rep count
     * would be the first half of one.
     */
    promptId: 'health:movement',
    text: 'Did you move today, beyond getting about?',
    kind: 'observable',
    answers: ['No', 'A walk', 'Something gentle', 'Something hard', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(['No', 'A walk', 'Something gentle', 'Something hard', UNSURE]),
    attribute: 'health:movement',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    promptId: 'health:movement-after',
    text: 'Energy since moving',
    kind: 'state',
    answers: ['Worse', 'About the same', 'Better', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(['Worse', 'About the same', 'Better', UNSURE]),
    attribute: 'health:movement-after',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
  {
    /**
     * Meditation is captured by **purpose**, never by frequency (Blueprint §9.9).
     *
     * "Did you meditate today" is the question this product refuses to ask, because it
     * turns a tool into a duty and produces a streak nobody asked for. What the app
     * needs is what it was for, so it can ask the right observable question afterwards.
     */
    promptId: 'health:meditation-purpose',
    text: 'What was the quiet time for?',
    kind: 'observable',
    answers: MEDITATION_PURPOSES.map((purpose) => MEDITATION_PURPOSE_LABELS[purpose]),
    allowsUnknown: true,
    whatItCouldChange: ['confidence', 'recommendation'],
    input: choice(MEDITATION_PURPOSES.map((purpose) => MEDITATION_PURPOSE_LABELS[purpose])),
    attribute: 'health:meditation-purpose',
    category: 'health-recovery-energy',
    privacy: 'health',
  },
];

/* -------------------------------------------------------------------------- */
/* Career, Azure, and learning (Prompt 8C)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Update This Area, for career and learning (`OWN-049`, LEG-059, LEG-063).
 *
 * Every question is about something that happened, and every one of them can be
 * answered in a couple of seconds. Note especially what is **not** here: no "how
 * confident do you feel about Kubernetes", no self-rated skill level, no percentage
 * through a course. The ladder is climbed by evidence, so the questions collect
 * evidence.
 */
export const CAREER_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:career-and-learning',
    text: 'Have you studied or practised since last time?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(['Yes', 'No', UNSURE]),
    attribute: 'career:studied',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    /**
     * The single highest-value thing this domain can hold.
     *
     * "I do not know what to do next" is the most common reason a study session does
     * not start, and it is the one the app can actually remove — by having asked for
     * the next step while the context was still fresh.
     */
    promptId: 'career:next-step',
    text: 'What is the exact next step?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation'],
    input: { kind: 'text', maxLength: 200 },
    attribute: 'career:next-step',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    /**
     * What was in the way — behaviourally worded (LEG-065).
     *
     * The Blueprint's taxonomy includes "fear" and "perfectionism". Those ids are kept
     * so Phase 8 can learn from them, but they are never the words on screen: offering
     * "fear" as a button asks the owner to accept a label about themselves, which
     * `OBS-002` forbids and which produces a worse answer than describing what happened.
     */
    promptId: 'career:barrier',
    text: 'What was in the way?',
    kind: 'observable',
    answers: STUDY_BARRIERS.map((barrier) => barrier.label),
    allowsUnknown: true,
    whatItCouldChange: ['candidate-eligibility', 'recommendation', 'confidence'],
    input: choice(STUDY_BARRIERS.map((barrier) => barrier.label)),
    attribute: 'career:barrier',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    promptId: 'career:retrieval',
    text: 'How much came back without looking?',
    kind: 'state',
    answers: ['None of it', 'A little', 'About half', 'Most of it', 'All of it'],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: { kind: 'scale', scaleId: 'retrieval-strength' },
    attribute: scaleAttribute('retrieval-strength'),
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    /**
     * Lab independence — the rung that actually separates knowing from having read.
     *
     * Asked as what happened, not as a competence rating.
     */
    promptId: 'career:lab-independence',
    text: 'Did you get through it without following a guide?',
    kind: 'observable',
    answers: ['Followed a guide', 'Needed help part way', 'Did it on my own', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(['Followed a guide', 'Needed help part way', 'Did it on my own', UNSURE]),
    attribute: 'career:lab-independence',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    promptId: 'career:re-entry',
    text: 'Did you get back to it after stopping?',
    kind: 'observable',
    answers: ['Yes', 'No', 'Did not stop', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'No', 'Did not stop', UNSURE]),
    attribute: 'career:re-entry',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
  {
    promptId: 'career:topic',
    text: 'What was it about?',
    kind: 'observable',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 120 },
    attribute: 'career:topic',
    category: 'career-work-learning',
    privacy: 'workplace',
  },
];

/* -------------------------------------------------------------------------- */
/* Fatherhood and child development (Prompt 8D)                                */
/* -------------------------------------------------------------------------- */

const SUPPORT_LEVELS = SKILL_LEVELS.map((level) => SKILL_LEVEL_LABELS[level]);

/**
 * Every question this domain asks is about **what happened**, never about why.
 *
 * The ones that would be easiest to write and worst to ask are absent: why she reacted
 * that way, why you reacted that way, whether the lesson "worked", how the evening made
 * you feel. A father cannot answer those reliably about himself and certainly cannot
 * answer them about a two-year-old, and an answer that is a guess becomes evidence the
 * moment it is stored.
 */
export const FATHERHOOD_PROMPTS: readonly CapturePrompt[] = [
  {
    promptId: 'update-area:fatherhood',
    text: 'Did you spend time together since last time?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice(['Yes', 'No', UNSURE]),
    attribute: 'father:together',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /**
     * Which skill, before how much help.
     *
     * A level with no skill attached is unreadable — the domain files readings under
     * `father:skill:<id>`, and an answer that cannot say which skill it is about would
     * be stored and never read again. The pair is combined into one record on save.
     */
    promptId: 'father:skill',
    text: 'Which one were you practising?',
    kind: 'observable',
    answers: TRACKED_SKILLS.map((skill) => skill.label),
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: choice(TRACKED_SKILLS.map((skill) => skill.label)),
    attribute: 'father:skill',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /**
     * The skill ladder, asked as support rather than as achievement.
     *
     * "How much help did she need" is something a father watched. "What level is she
     * at" is a rating he would have to invent, about his own child, which is exactly
     * the question this domain refuses to ask.
     */
    promptId: 'father:skill-level',
    text: 'How much help did she need with it?',
    kind: 'observable',
    answers: [...SUPPORT_LEVELS, UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'candidate-eligibility'],
    input: choice([...SUPPORT_LEVELS, UNSURE]),
    attribute: 'father:skill-level',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    promptId: 'father:lesson-happened',
    text: 'Did the activity happen?',
    kind: 'observable',
    answers: ['Yes', 'Started but stopped', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Started but stopped', 'No', UNSURE]),
    attribute: 'father:lesson-happened',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    promptId: 'father:child-tried',
    text: 'Did she try it?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice(['Yes', 'No', UNSURE]),
    attribute: 'father:child-tried',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    promptId: 'father:together-happened',
    text: 'Did it happen?',
    kind: 'observable',
    answers: ['Yes', 'Partly', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Partly', 'No', UNSURE]),
    attribute: 'father:together-happened',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    promptId: 'father:wind-down-happened',
    text: 'Did the wind-down run in its usual order?',
    kind: 'observable',
    answers: ['Yes', 'Partly', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'Partly', 'No', UNSURE]),
    attribute: 'father:wind-down-happened',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /**
     * The only question in this domain that asks about something ongoing.
     *
     * "Is it still present" is observable — the owner either still sees it or does
     * not. It is deliberately not "is it getting worse", which asks for a judgement
     * about severity that belongs to someone qualified.
     */
    promptId: 'father:concern-still-present',
    text: 'Is the thing you noticed still there?',
    kind: 'observable',
    answers: ['Yes', 'No', UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation', 'confidence'],
    input: choice(['Yes', 'No', UNSURE]),
    attribute: 'father:concern-still-present',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /**
     * One occasion, recorded as evidence rather than as a level.
     *
     * The same canonical attribute the learning map writes, so an observation made in
     * the guided flow and one made on the map are the same record type — never two
     * versions of one fact. It moves nothing on its own; several occasions across
     * separate days may suggest a move, and the owner decides.
     */
    promptId: 'father:skill-evidence',
    text: 'How much help did she need this time?',
    kind: 'observable',
    answers: [...SUPPORT_LEVELS, UNSURE],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'confidence'],
    input: choice([...SUPPORT_LEVELS, UNSURE]),
    attribute: 'father:skill-evidence',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /** Which item on the list, before the answer about it. */
    promptId: 'father:milestone',
    text: 'Which one are you looking at?',
    kind: 'observable',
    answers: MILESTONE_CATALOGUE.map((entry) => entry.text),
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: choice(MILESTONE_CATALOGUE.map((entry) => entry.text)),
    attribute: 'father:milestone',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    promptId: 'father:milestone-status',
    text: 'Have you seen her do this?',
    kind: 'observable',
    answers: [
      ...REPORTABLE_MILESTONE_STATUSES.map((status) => MILESTONE_STATUS_LABELS[status]),
      UNSURE,
    ],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation', 'recommendation'],
    input: choice([
      ...REPORTABLE_MILESTONE_STATUSES.map((status) => MILESTONE_STATUS_LABELS[status]),
      UNSURE,
    ]),
    attribute: 'father:milestone-status',
    category: 'fatherhood-and-child',
    privacy: 'child',
  },
  {
    /**
     * The private local display name (`OWN-070`, Prompt 8D privacy rule).
     *
     * Stored as ordinary `child`-classified canonical data on this device. It is never
     * in source, fixtures, tests, or build evidence — the repository knows only that
     * the field exists, and every test uses a placeholder.
     */
    promptId: 'father:display-name',
    text: 'What would you like this area to call her?',
    kind: 'preference',
    answers: [],
    allowsUnknown: true,
    whatItCouldChange: ['state-interpretation'],
    input: { kind: 'text', maxLength: 40 },
    attribute: 'father:display-name',
    category: 'fatherhood-and-child',
    privacy: 'child',
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
export { EMOTIONAL_PROMPTS, FAITH_PROMPTS, HOME_PROMPTS, MONEY_PROMPTS };

export const ALL_PROMPTS: readonly CapturePrompt[] = [
  ...STATE_PROMPTS,
  ...CONTEXT_PROMPTS,
  ...OUTCOME_PATTERN_IDS.map((id) => OUTCOME_PROMPTS[id]),
  ...SLEEP_PROMPTS,
  ...FOOD_PROMPTS,
  ...HEALTH_PROMPTS,
  ...CAREER_PROMPTS,
  ...FATHERHOOD_PROMPTS,
  ...EMOTIONAL_PROMPTS,
  ...FAITH_PROMPTS,
  ...HOME_PROMPTS,
  ...MONEY_PROMPTS,
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
