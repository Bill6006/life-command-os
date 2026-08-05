import type { CapabilityEffect } from '../capabilities';

/**
 * The closed set of emotional and social actions (Prompt 8E).
 *
 * Third domain to use this device, and the reason is the same each time: a generator
 * eventually generates something it should not. Health could compose advice about a
 * symptom; fatherhood could compose advice about a child; this one could compose advice
 * about a person's inner life, which is where the distance between "take ten minutes"
 * and "you're avoiding this because…" is a single plausible template.
 *
 * ## What is absent, not filtered
 *
 * No therapy, no technique with a trademark, no reframing script, no interpretation of a
 * mood, no diagnosis, no attachment style, no advice about what another person meant.
 * `EMOTIONAL_ACTIONS` is the entire vocabulary and none of that appears in it.
 *
 * ## Regulation options, not regulation instructions
 *
 * Each option is a thing the owner can *do* for a stated number of minutes and then
 * stop. None of them claims an effect on how he will feel afterwards, because the
 * follow-up asks what happened rather than whether it worked (`OBS-003`).
 */

export const EMOTIONAL_ACTION_IDS = [
  'step-outside',
  'name-it-and-park-it',
  'move-the-body',
  'reach-out-to-one-person',
  'send-the-message-you-drafted',
  'repair-after-a-conflict',
  'hold-the-boundary-you-decided',
  'speak-to-someone-qualified',
] as const;
export type EmotionalActionId = (typeof EMOTIONAL_ACTION_IDS)[number];

export interface EmotionalAction {
  readonly id: EmotionalActionId;
  readonly statement: string;
  /** What it is for, observably. Never "feel better". */
  readonly intendedOutcome: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly followUpPromptId: string;
  readonly capabilityEffects: readonly CapabilityEffect[];
}

const REGULATION: CapabilityEffect = {
  channel: 'emotional-regulation',
  effect: 'improves',
  magnitude: 'meaningful',
  basis: 'external-research',
  crossDomain: false,
};

const CONNECTION: CapabilityEffect = {
  channel: 'connection-and-relationships',
  effect: 'improves',
  magnitude: 'meaningful',
  basis: 'external-research',
  crossDomain: false,
};

const COURAGE: CapabilityEffect = {
  channel: 'confidence-and-courage',
  effect: 'improves',
  magnitude: 'small',
  basis: 'app-inference',
  crossDomain: true,
};

export const EMOTIONAL_ACTIONS: Record<EmotionalActionId, EmotionalAction> = {
  'step-outside': {
    id: 'step-outside',
    statement: 'Step outside for ten minutes, without your phone',
    intendedOutcome: 'You left the room and came back',
    minimumVersion: 'To the door and back',
    stoppingPoint: 'Ten minutes. Longer is fine; it is not required',
    durationMinutes: 10,
    minimumMinutes: 2,
    followUpPromptId: 'outcome:completed',
    capabilityEffects: [REGULATION],
  },
  'name-it-and-park-it': {
    id: 'name-it-and-park-it',
    statement: 'Write down the thing that is taking up room, and close the notebook',
    intendedOutcome: 'It is written down somewhere other than your head',
    minimumVersion: 'One line',
    stoppingPoint: 'Do not solve it now. Writing it down is the whole task',
    durationMinutes: 5,
    minimumMinutes: 1,
    followUpPromptId: 'outcome:completed',
    capabilityEffects: [REGULATION],
  },
  'move-the-body': {
    id: 'move-the-body',
    statement: 'Move for fifteen minutes — walk, stairs, anything',
    intendedOutcome: 'You moved for a while',
    minimumVersion: 'Five minutes of walking',
    stoppingPoint: 'Stop when you want to',
    durationMinutes: 15,
    minimumMinutes: 5,
    followUpPromptId: 'outcome:duration',
    capabilityEffects: [REGULATION],
  },
  'reach-out-to-one-person': {
    id: 'reach-out-to-one-person',
    statement: 'Message one person you have not spoken to in a while',
    intendedOutcome: 'The message was sent',
    minimumVersion: 'One line to one person',
    stoppingPoint: 'Sending it is the task. A reply is not part of it',
    durationMinutes: 5,
    minimumMinutes: 1,
    followUpPromptId: 'emotional:reached-out',
    capabilityEffects: [CONNECTION, COURAGE],
  },
  'send-the-message-you-drafted': {
    id: 'send-the-message-you-drafted',
    statement: 'Send the message you already decided to send',
    intendedOutcome: 'The message was sent',
    minimumVersion: 'Send it as it is',
    stoppingPoint: 'No rewriting. It was already good enough when you wrote it',
    durationMinutes: 3,
    minimumMinutes: 1,
    followUpPromptId: 'emotional:reached-out',
    capabilityEffects: [COURAGE],
  },
  'repair-after-a-conflict': {
    id: 'repair-after-a-conflict',
    statement: 'Go back to the person once things are calm',
    intendedOutcome: 'You made contact after it had settled',
    minimumVersion: 'One sentence, in person or in writing',
    stoppingPoint: 'One attempt. What they do next is theirs',
    durationMinutes: 15,
    minimumMinutes: 2,
    followUpPromptId: 'emotional:repair-happened',
    capabilityEffects: [CONNECTION],
  },
  'hold-the-boundary-you-decided': {
    id: 'hold-the-boundary-you-decided',
    statement: 'Hold the boundary you already decided on',
    intendedOutcome: 'The thing you decided to do, or not do, is what happened',
    minimumVersion: 'Say the shortest true version of it',
    stoppingPoint: 'Say it once. Repeating it is a different decision',
    durationMinutes: 5,
    minimumMinutes: 1,
    followUpPromptId: 'emotional:boundary-held',
    capabilityEffects: [COURAGE],
  },
  'speak-to-someone-qualified': {
    /*
     * The action this domain reaches for when it should stop having a view.
     *
     * Not advice, and not an interpretation of anything the owner recorded. It is the
     * app declining to have an opinion about a person's inner life and naming who might
     * — the same branch health and fatherhood both have, for the same reason.
     */
    id: 'speak-to-someone-qualified',
    statement: 'Worth talking to your GP or a counsellor about',
    intendedOutcome: 'You raised it with someone qualified',
    minimumVersion: 'Book the appointment; the conversation is later',
    stoppingPoint: 'Nothing else is being asked of you here',
    durationMinutes: 15,
    minimumMinutes: 5,
    followUpPromptId: 'outcome:completed',
    capabilityEffects: [REGULATION],
  },
};

/**
 * Asserted against the actions, the prompts, and the rendered panel.
 *
 * Two groups again. The first is clinical language this product has no standing to use;
 * the second is the vocabulary of blame, which turns a record of a hard week into an
 * accusation.
 */
export const FORBIDDEN_EMOTIONAL_VOCABULARY = [
  // Clinical.
  'depress',
  'anxiety disorder',
  'diagnos',
  'therapy session',
  'attachment style',
  'trauma response',
  'cognitive distortion',
  'reframe',
  'toxic',
  'narcissis',
  'gaslighting',
  'love language',
  // Blame.
  'you always',
  'you never',
  'should have',
  'failed to',
  'self-sabotage',
  'avoidant',
  'needy',
  'overreacting',
] as const;
