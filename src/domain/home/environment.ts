import { adaptFlat, type FlatDomainMoveView } from '../moves/adapt';

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

/**
 * A environment action, as a view over a canonical catalogue pattern ().
 *
 * The shape every existing reader expects, with the canonical  carried
 * alongside this slice's own local id so evidence recorded against either resolves to
 * one move.
 */
export type EnvironmentAction = FlatDomainMoveView<EnvironmentActionId>;

/**
 * Every home action, as a view over the canonical catalogue (`V33-047`).
 *
 * No move is authored here any more. Each entry names the catalogue pattern it offers and
 * keeps this domain's own wording where that wording says more than the generic line.
 *
 * What the catalogue supplies is the half that ranking reads: duration, minimum, friction,
 * capacity shape, safety class, lifecycle, observation window, and identity. A domain
 * cannot disagree with it about those, which is the point of having one.
 */
export const ENVIRONMENT_ACTIONS: Record<EnvironmentActionId, EnvironmentAction> = {
  'name-one-change': adaptFlat('name-one-change', 'decide-and-close:make-the-call', {
    statement: 'Decide on one thing to change about the setup',
    intendedOutcome: 'One change is written down, in your words',
    minimumVersion: 'One line. It can be small, and it can be wrong',
    stoppingPoint: 'One thing. A list of jobs is a different app',
    followUpPromptId: 'home:change-named',
  }),
  'make-the-change': adaptFlat(
    'make-the-change',
    'reduce-friction-at-home:fix-the-repeat-offender',
    {
      statement: 'Make the change you decided on',
      intendedOutcome: 'The setup is different from how it was',
      minimumVersion: 'The first part of it',
      stoppingPoint:
        'Stop when the change is made. Nothing else needs doing while you are there',
      followUpPromptId: 'home:change-made',
    },
  ),
  'try-a-different-change': adaptFlat(
    'try-a-different-change',
    'reduce-friction-at-home:try-a-different-change',
    {
      intendedOutcome: 'A second thing is different from how it was',
      minimumVersion: 'Decide what it is. Doing it can wait',
      stoppingPoint: 'One attempt. If this one does not hold either, that is worth knowing too',
      followUpPromptId: 'home:change-made',
    },
  ),
  'set-it-up-before': adaptFlat('set-it-up-before', 'prepare-the-ground:lay-it-out-tonight', {
    statement: 'Set the space up before you need it, not when you get there',
    intendedOutcome: 'It was ready when you sat down',
    minimumVersion: 'The one thing that takes longest to get out',
    followUpPromptId: 'home:friction-again',
  }),
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
