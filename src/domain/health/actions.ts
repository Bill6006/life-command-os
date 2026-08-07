import type { CapacityProfile } from '../domains/capacity';
import type { CapabilityEffect } from '../capabilities';

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

export interface HealthAction {
  readonly id: HealthActionId;
  readonly statement: string;
  /** What it is for, observable. Never "feel better". */
  readonly intendedOutcome: string;
  /** The behaviour-first prompt that closes it, and by when. */
  readonly followUp: { readonly promptId: string; readonly windowHours: number };
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly minimumVersion: string;
  readonly fallback: string;
  readonly stoppingPoint: string;
  readonly friction: 'low' | 'moderate' | 'high';
  readonly capabilityEffects: readonly CapabilityEffect[];
  /**
   * What the situation has to allow for this to be possible (`V33-026`, clarification 3).
   *
   * Declared only where it genuinely changes eligibility. Most health moves are deliberately
   * shapeless — a glass of water is possible in an open-plan office, on a train, and with a
   * toddler on your hip, and inventing a constraint for it would rule out the one move that
   * is nearly always available. Omission is the honest default, and `fits` treats it as no
   * constraint rather than as "fits anywhere".
   */
  readonly capacity?: CapacityProfile | undefined;
}

const effect = (
  channel: CapabilityEffect['channel'],
  kind: CapabilityEffect['effect'],
  magnitude: CapabilityEffect['magnitude'],
  crossDomain = false,
): CapabilityEffect => ({
  channel,
  effect: kind,
  magnitude,
  basis: 'external-research',
  crossDomain,
});

/**
 * Every health action, in full.
 *
 * Read the statements as the specification. Each is something a person could do in
 * the next ten minutes without any clinical judgement, and each has an observable
 * question attached that could show it did not help.
 */
export const HEALTH_ACTIONS: Record<HealthActionId, HealthAction> = {
  pause: {
    id: 'pause',
    statement: 'Stop for ten minutes away from a screen',
    intendedOutcome: 'Whatever is interfering eases enough to do something else',
    followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
    durationMinutes: 10,
    minimumMinutes: 2,
    minimumVersion: 'Two minutes standing up, away from the desk',
    fallback: 'Sit back and stop looking at anything for a minute',
    stoppingPoint: 'Stop after ten minutes whether or not it helped',
    friction: 'low',
    capabilityEffects: [
      effect('energy-and-recovery', 'improves', 'small'),
      effect('emotional-regulation', 'improves', 'small'),
      effect('focus-and-clarity', 'improves-later', 'small', true),
    ],
  },
  hydrate: {
    id: 'hydrate',
    statement: 'Have a glass of water',
    intendedOutcome: 'One ordinary explanation for feeling flat is ruled out',
    followUp: { promptId: 'outcome:still-interfering', windowHours: 2 },
    durationMinutes: 2,
    minimumMinutes: 1,
    minimumVersion: 'A few mouthfuls',
    fallback: 'Put a glass within reach for later',
    stoppingPoint: 'One glass. This is not a hydration target.',
    friction: 'low',
    capabilityEffects: [effect('energy-and-recovery', 'improves', 'small')],
  },
  'gentle-movement': {
    id: 'gentle-movement',
    /* Ten minutes of walking needs somewhere to walk and a gap to walk in. */
    capacity: { shape: 'transition' },
    statement: 'Move gently for ten minutes — a walk, or anything that is not sitting',
    intendedOutcome: 'Energy after moving is different from energy before',
    followUp: { promptId: 'outcome:completed', windowHours: 6 },
    durationMinutes: 10,
    minimumMinutes: 3,
    minimumVersion: 'Three minutes on your feet',
    fallback: 'Stand up and stretch where you are',
    stoppingPoint: 'Stop when it stops feeling easy. There is no target here.',
    friction: 'low',
    capabilityEffects: [
      effect('energy-and-recovery', 'improves', 'meaningful'),
      effect('focus-and-clarity', 'improves-later', 'small', true),
    ],
  },
  'prepare-for-sleep': {
    id: 'prepare-for-sleep',
    /* Only possible where you sleep, and an interruption restarts the wind-down. */
    capacity: { shape: 'protected-focus', interruptionCost: 'total' },
    statement: 'Start winding down for sleep now rather than later',
    intendedOutcome: 'Falling asleep takes less time than last night',
    followUp: { promptId: 'sleep:onset-minutes', windowHours: 16 },
    durationMinutes: 20,
    minimumMinutes: 5,
    minimumVersion: 'Screens down and lights lower for five minutes',
    fallback: 'Decide what time you will stop, and set it somewhere you will see',
    stoppingPoint: 'When you go to bed. This is not a routine to complete.',
    friction: 'moderate',
    capabilityEffects: [
      effect('energy-and-recovery', 'improves-later', 'meaningful'),
      effect('focus-and-clarity', 'improves-later', 'meaningful', true),
    ],
  },
  meditate: {
    id: 'meditate',
    /*
     * Sitting quietly needs privacy and room to think. This is the clearest case in the
     * catalogue where an open-plan desk rules the move out at any duration.
     */
    capacity: { shape: 'protected-focus', interruptionCost: 'partial' },
    statement: 'Sit quietly for ten minutes',
    intendedOutcome: 'The thing this was for becomes possible',
    followUp: { promptId: 'outcome:returned-to-task', windowHours: 3 },
    durationMinutes: 10,
    minimumMinutes: 2,
    minimumVersion: 'Two minutes, eyes closed, nothing else',
    fallback: 'Three slow breaths before starting the next thing',
    stoppingPoint: 'Ten minutes. Longer is not better and there is nothing to keep up.',
    friction: 'moderate',
    capabilityEffects: [
      effect('emotional-regulation', 'improves', 'small'),
      effect('focus-and-clarity', 'improves', 'small'),
    ],
  },
  'eat-something': {
    id: 'eat-something',
    statement: 'Eat something before the next block',
    intendedOutcome: 'Hunger stops being one of the things in the way',
    followUp: { promptId: 'food:energy-after', windowHours: 3 },
    durationMinutes: 15,
    minimumMinutes: 5,
    minimumVersion: 'Anything, standing up, in five minutes',
    fallback: 'Put something within reach for when you stop',
    stoppingPoint: 'When you have eaten. Nothing here is counted or scored.',
    friction: 'low',
    capabilityEffects: [effect('energy-and-recovery', 'improves', 'small')],
  },
  'seek-human-support': {
    id: 'seek-human-support',
    /* Raising something with a person needs to be somewhere you can speak freely. */
    capacity: { shape: 'protected-focus' },
    statement: 'Worth raising with someone qualified',
    intendedOutcome: 'A person who can actually assess this has heard about it',
    followUp: { promptId: 'outcome:interaction-happened', windowHours: 24 * 14 },
    durationMinutes: 10,
    minimumMinutes: 5,
    minimumVersion: 'Book the appointment, or write down what you would say',
    fallback: 'Write down when it started and what makes it worse, for whenever you do',
    stoppingPoint: 'Once you have asked. This app has no further opinion on it.',
    friction: 'high',
    capabilityEffects: [effect('energy-and-recovery', 'uncertain', 'unknown')],
  },
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
