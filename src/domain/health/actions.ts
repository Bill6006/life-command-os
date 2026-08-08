import { adapt, type DomainMoveView } from '../moves/adapt';

/**
 * The closed set of health actions this product may ever propose (Prompt 8B).
 *
 * ## Why a closed set rather than a generator
 *
 * This is the first domain that can hurt someone by being helpful. A health engine
 * that composes its own advice will eventually compose advice about a symptom, and
 * the distance between "try a short walk" and "that sounds like it might be…" is one
 * plausible-looking template.
 *
 * So there is no template. Every action this domain can produce is listed below,
 * written out in full, and reviewed as text. If an action is not in this list, the
 * health domain cannot propose it — not because a filter would catch it, but because
 * there is no code path that constructs one.
 *
 * ## What is deliberately absent
 *
 * No medication, dose, supplement, treatment, diagnosis, symptom interpretation,
 * exercise prescription, rep count, calorie, or macro. Not filtered out — **absent**.
 * `HEALTH_ACTIONS` is the entire vocabulary, and none of those words appear in it.
 *
 * The Blueprint (§9.2) forbids workout programming, calorie tracking, treatment
 * claims, and diagnosis. This file is what makes that structural.
 *
 * ## The action this domain reaches for when it should not act
 *
 * `seek-human-support` is not a recommendation about a symptom. It is the domain
 * declining to have an opinion, and saying who might. That branch exists because the
 * honest answer to "this has been going on a while and is getting in the way" is not
 * a self-care tip.
 */

export const HEALTH_ACTION_IDS = [
  'pause',
  'hydrate',
  'gentle-movement',
  'prepare-for-sleep',
  'meditate',
  'eat-something',
  'seek-human-support',
] as const;
export type HealthActionId = (typeof HEALTH_ACTION_IDS)[number];

/**
 * Why a meditation is being suggested (Blueprint §9.9, task 12).
 *
 * Meditation is a **shared action with a purpose**, never a practice with a page or a
 * streak. The purpose matters because it decides the follow-up: after meditating for
 * focus the observable question is whether the intended task began, and after
 * meditating for sleep it is how long it took to fall asleep. "Did you meditate today"
 * is the question this product refuses to ask.
 */
export const MEDITATION_PURPOSES = [
  'focused-attention',
  'acute-stress-pause',
  'rumination-interruption',
  'role-transition',
  'sleep-preparation',
] as const;
export type MeditationPurpose = (typeof MEDITATION_PURPOSES)[number];

export const MEDITATION_PURPOSE_LABELS: Record<MeditationPurpose, string> = {
  'focused-attention': 'to settle before focused work',
  'acute-stress-pause': 'to take the edge off right now',
  'rumination-interruption': 'to interrupt a loop of thinking',
  'role-transition': 'to change gear between one thing and the next',
  'sleep-preparation': 'to wind down before sleep',
};

/**
 * A health action, which is now a view over a catalogue pattern (`V33-047`).
 *
 * The shape is unchanged for every existing reader — the generator still gets a statement,
 * a duration, a follow-up. What changed is where those come from, and that the view now
 * carries the canonical `patternId` alongside health's own local `id`, so evidence
 * recorded against `health:pause` and evidence recorded against `pause:screen-break` are
 * known to be about the same move.
 */
export type HealthAction = DomainMoveView<HealthActionId>;

/**
 * Every health action, as a view over the canonical catalogue (`V33-047`).
 *
 * This used to be the authored source. It is now a **selection**: which catalogue patterns
 * health may offer, and where health's own sentence reads better than the generic one.
 * There is no move defined here any more, and there is no way to define one — `adapt`
 * takes a pattern id and cannot mint an identity.
 *
 * The closed-set guarantee that mattered for this domain is unchanged and now stronger:
 * health can propose exactly these seven patterns, and every one of them is a reviewed
 * entry in a single catalogue rather than a list only this file can see.
 */
export const HEALTH_ACTIONS: Record<HealthActionId, HealthAction> = {
  pause: adapt('pause', 'pause:screen-break', {
    intendedOutcome: 'Whatever is interfering eases enough to do something else',
    minimumVersion: 'Two minutes standing up, away from the desk',
    stoppingPoint: 'Stop after ten minutes whether or not it helped',
    followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
  }),

  hydrate: adapt('hydrate', 'hydrate-eat:water', {
    intendedOutcome: 'One ordinary explanation for feeling flat is ruled out',
    stoppingPoint: 'One glass. This is not a hydration target.',
  }),

  'gentle-movement': adapt('gentle-movement', 'move-body:gentle-ten', {
    intendedOutcome: 'Energy after moving is different from energy before',
    stoppingPoint: 'Stop when it stops feeling easy. There is no target here.',
  }),

  'prepare-for-sleep': adapt('prepare-for-sleep', 'wind-down:start-now', {
    intendedOutcome: 'Falling asleep takes less time than last night',
    stoppingPoint: 'When you go to bed. This is not a routine to complete.',
    followUp: { promptId: 'sleep:onset-minutes', windowHours: 16 },
  }),

  /*
   * Health's own wording, kept. The catalogue calls this "sit quietly"; health has always
   * said "sit quietly for ten minutes" with the purpose attached, and the purpose is what
   * decides the follow-up question (Blueprint §9.9).
   */
  meditate: adapt('meditate', 'settle-attention:sit-quietly', {
    /* No statement override: the catalogue already says exactly what health said. */
    intendedOutcome: 'The thing you sat down to do actually begins',
    stoppingPoint: 'Ten minutes. Longer is not better and there is nothing to keep up.',
  }),

  'eat-something': adapt('eat-something', 'hydrate-eat:eat-something', {
    intendedOutcome: 'Hunger stops being one of the things in the way',
    minimumVersion: 'Anything, standing up, in five minutes',
    fallback: 'Put something within reach for when you stop',
    stoppingPoint: 'When you have eaten. Nothing here is counted or scored.',
    followUp: { promptId: 'food:energy-after', windowHours: 3 },
  }),

  /*
   * The action this domain reaches for when it should not act. Its wording is health's
   * own and deliberately vague about who — naming a profession would be the domain
   * having an opinion about the thing it just declined to have an opinion about.
   */
  'seek-human-support': adapt('seek-human-support', 'defer-to-a-person:raise-it', {
    intendedOutcome: 'A person who can actually assess this has heard about it',
    stoppingPoint: 'Once it has been raised. There is nothing here to keep up.',
  }),
};

/**
 * Words this domain must never produce.
 *
 * Asserted against every statement, outcome, and minimum version in the set, and
 * against anything the health domain renders. A closed vocabulary is only closed while
 * something checks that nobody widened it.
 */
export const FORBIDDEN_HEALTH_VOCABULARY = [
  'diagnos',
  'treat',
  'cure',
  'symptom of',
  'medication',
  'dose',
  'supplement',
  'prescri',
  'therapy',
  'condition is',
  'reps',
  'sets of',
  'calorie',
  'macro',
  'protein target',
  'workout plan',
  'training programme',
  'training program',
] as const;
