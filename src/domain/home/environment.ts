import type { CapabilityEffect } from '../capabilities';

/**
 * Home and environment: what the app may notice, and what it must never become
 * (Prompt 8G).
 *
 * ## The boundary, made into vocabulary
 *
 * The Blueprint forbids a cleaning app, a chore manager, a calendar, and a task
 * platform. Those are four different products and they share one failure: they generate
 * work the owner never agreed to, on a schedule, and then measure him against it.
 *
 * The defence is not a rule in a document. It is this file's vocabulary. **Every friction
 * below is functional and none is aesthetic** — a thing was somewhere else, a space had
 * to be set up, something was too loud. There is no word here for tidy, messy, clean, or
 * cluttered, and no code path that could compose one, because the app has no view on how
 * a room looks and no business acquiring one.
 *
 * ## Where this domain differs from faith
 *
 * Prompt 8F withheld a view because the application had no standing to hold one. This
 * domain is the opposite: the app has plenty of standing to say "that same thing has got
 * in your way four times", because that is arithmetic over what he recorded. What it
 * withholds is the **task list** — it will never decide what should change, never put a
 * second item on the list while one is open, and never raise anything because time
 * passed. Repetition is the only thing that makes it speak.
 */

/**
 * What the space was being used for.
 *
 * Closed because these are functional categories the app reasons with — they decide
 * which protected contexts apply and which activity a friction interrupted. They are not
 * a statement about how anyone should spend their day.
 */
export const ENVIRONMENT_PURPOSES = [
  { id: 'focused-work', label: 'Focused work' },
  { id: 'learning', label: 'Study' },
  { id: 'family', label: 'Time with family' },
  { id: 'recovery', label: 'Rest and recovery' },
  { id: 'everyday', label: 'Everyday jobs' },
] as const;
export type EnvironmentPurposeId = (typeof ENVIRONMENT_PURPOSES)[number]['id'];

/**
 * What got in the way.
 *
 * Every one is something that happened to an **activity**, observable at the moment it
 * happened. None of them describes a state of a room, and that is the whole distinction
 * between this and a cleaning app: "nowhere to put things" is a fact about trying to
 * work at a desk; "the desk is a mess" is a judgement about a desk.
 */
export const FRICTION_KINDS = [
  { id: 'not-to-hand', label: 'What I needed was somewhere else' },
  { id: 'setup-first', label: 'It had to be set up first' },
  { id: 'too-loud', label: 'Too loud' },
  { id: 'light-wrong', label: 'The light was wrong' },
  { id: 'not-private', label: 'Not private enough' },
  { id: 'no-room', label: 'Nowhere to put things' },
  { id: 'wrong-place', label: 'I was in the wrong place for it' },
  { id: 'not-working', label: 'Something was not working' },
] as const;
export type FrictionKindId = (typeof FRICTION_KINDS)[number]['id'];

/** The honest answer when the environment was fine, and a real one. */
export const NOTHING_IN_THE_WAY = 'Nothing did';

export const FRICTION_LABELS: readonly string[] = FRICTION_KINDS.map((kind) => kind.label);

export function frictionKindByLabel(label: string) {
  return FRICTION_KINDS.find((kind) => kind.label === label);
}

/* -------------------------------------------------------------------------- */

/** How long before he could start. Bands, because exact minutes is a memory test. */
export const SETUP_TIMES = [
  'Straight away',
  'A couple of minutes',
  'Ten minutes or so',
  'Long enough that I did something else',
] as const;

/** Whether what he needed was where he was. */
export const ACCESS_ANSWERS = ['Yes', 'Had to go and get it', 'Could not find it'] as const;

/** Noise, light, and privacy, as an anchored present state. */
export const CONDITION_ANSWERS = [
  'Fine',
  'Too loud',
  'The light was wrong',
  'Not private enough',
] as const;

/** Switching one space from one use to another. */
export const TRANSITION_ANSWERS = [
  'Nothing had to move',
  'A couple of things',
  'A lot',
  'I did not switch',
] as const;

/** Whether the same thing came back after a change. The only measure of success here. */
export const FRICTION_OUTCOMES = ['No', 'Once', 'Still happening'] as const;

/* -------------------------------------------------------------------------- */

export const ENVIRONMENT_ACTION_IDS = [
  'name-one-change',
  'make-the-change',
  'try-a-different-change',
  'set-it-up-before',
] as const;
export type EnvironmentActionId = (typeof ENVIRONMENT_ACTION_IDS)[number];

export interface EnvironmentAction {
  readonly id: EnvironmentActionId;
  readonly statement: string;
  readonly intendedOutcome: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly followUpPromptId: string;
  readonly capabilityEffects: readonly CapabilityEffect[];
}

const EASE: CapabilityEffect = {
  channel: 'environmental-ease',
  effect: 'improves',
  magnitude: 'meaningful',
  basis: 'app-inference',
  crossDomain: false,
};

const CLARITY: CapabilityEffect = {
  channel: 'focus-and-clarity',
  effect: 'improves',
  magnitude: 'small',
  basis: 'app-inference',
  crossDomain: true,
};

/**
 * Four actions, and not one of them says what to change.
 *
 * The app knows *that* something keeps getting in the way, because he recorded it. It
 * does not know what to do about his house, and a suggestion invented from a friction
 * label would be a guess wearing the clothes of advice. So three of these ask for his
 * change, and the fourth is about **when** rather than what — setting up before you need
 * the space is the one piece of environment design that holds regardless of what the
 * space contains.
 *
 * There is deliberately no action for maintaining anything, no action that recurs, and
 * no action a passing week can trigger.
 */
export const ENVIRONMENT_ACTIONS: Record<EnvironmentActionId, EnvironmentAction> = {
  'name-one-change': {
    id: 'name-one-change',
    statement: 'Decide on one thing to change about the setup',
    intendedOutcome: 'One change is written down, in your words',
    minimumVersion: 'One line. It can be small, and it can be wrong',
    stoppingPoint: 'One thing. A list of jobs is a different app',
    durationMinutes: 5,
    minimumMinutes: 1,
    followUpPromptId: 'home:change-named',
    capabilityEffects: [EASE],
  },
  'make-the-change': {
    id: 'make-the-change',
    statement: 'Make the change you decided on',
    intendedOutcome: 'The setup is different from how it was',
    minimumVersion: 'The first part of it',
    stoppingPoint: 'Stop when the change is made. Nothing else needs doing while you are there',
    durationMinutes: 20,
    minimumMinutes: 5,
    followUpPromptId: 'home:change-made',
    capabilityEffects: [EASE, CLARITY],
  },
  'try-a-different-change': {
    id: 'try-a-different-change',
    statement: 'Try a different change — the first one did not hold',
    intendedOutcome: 'A second thing is different from how it was',
    minimumVersion: 'Decide what it is. Doing it can wait',
    stoppingPoint: 'One attempt. If this one does not hold either, that is worth knowing too',
    durationMinutes: 20,
    minimumMinutes: 5,
    followUpPromptId: 'home:change-made',
    capabilityEffects: [EASE],
  },
  'set-it-up-before': {
    /*
     * The only action that names its own content, and it names a *time* rather than a
     * thing: set the space up before you need it. That holds whatever the space is, so
     * it prescribes nothing about his house.
     */
    id: 'set-it-up-before',
    statement: 'Set the space up before you need it, not when you get there',
    intendedOutcome: 'It was ready when you sat down',
    minimumVersion: 'The one thing that takes longest to get out',
    /*
     * Worded without the word. Saying "not tidy" would put the cleaning app's vocabulary
     * into the shipped copy in order to disown it, and a disavowal is still a mention —
     * the same trap the career slice hit with "study more".
     */
    stoppingPoint:
      'Ready is the stopping point — not finished, and nothing else while you are there',
    durationMinutes: 10,
    minimumMinutes: 2,
    followUpPromptId: 'home:friction-again',
    capabilityEffects: [EASE, CLARITY],
  },
};

export const HOME_ATTRIBUTES = {
  friction: 'home:friction',
  frictionNote: 'home:friction-note',
  frictionOutcome: 'home:friction-outcome',
  changeNamed: 'home:change-named',
  changeMade: 'home:change-made',
  conditions: 'home:conditions',
  access: 'home:access',
  setupTime: 'home:setup-time',
  transition: 'home:transition',
} as const;

/**
 * The friction attribute for a known purpose.
 *
 * A friction recorded from the area page knows what he was trying to do; one recorded
 * from a guide does not, and writes the bare attribute rather than guessing a default.
 * Unknown stays unknown — the same rule the whole product holds, applied to a field that
 * would have been very easy to fill in with "focused work" and be wrong about.
 *
 * The per-item attribute is the device `father:skill:<id>` already uses.
 */
export function frictionAttribute(purpose: EnvironmentPurposeId | undefined): string {
  return purpose === undefined
    ? HOME_ATTRIBUTES.friction
    : `${HOME_ATTRIBUTES.friction}:${purpose}`;
}

export function purposeOfAttribute(attribute: string): EnvironmentPurposeId | undefined {
  const suffix = attribute.slice(`${HOME_ATTRIBUTES.friction}:`.length);
  return attribute.startsWith(`${HOME_ATTRIBUTES.friction}:`)
    ? ENVIRONMENT_PURPOSES.find((purpose) => purpose.id === suffix)?.id
    : undefined;
}

/**
 * Words this domain may never use.
 *
 * The first group is the cleaning app. The second is the score wall. The third is the
 * chore manager's voice — the language of work assigned on a schedule, which is what
 * turns a useful observation into a nagging one.
 */
export const FORBIDDEN_HOME_VOCABULARY = [
  // The cleaning app.
  'tidy',
  'messy',
  'clutter',
  'declutter',
  'housework',
  'chore',
  'dirty',
  'spotless',
  'deep clean',
  // The score wall.
  'cleanliness score',
  'home score',
  'organisation score',
  'environment score',
  'tidiness',
  // The chore manager.
  'overdue',
  'every week',
  'you should clean',
  'keep on top of',
  'let it slip',
] as const;
