import { adaptFlat, type FlatDomainMoveView } from '../moves/adapt';

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

/**
 * A emotional action, as a view over a canonical catalogue pattern ().
 *
 * The shape every existing reader expects, with the canonical  carried
 * alongside this slice's own local id so evidence recorded against either resolves to
 * one move.
 */
export type EmotionalAction = FlatDomainMoveView<EmotionalActionId>;

/**
 * Every emotional and social action, as a view over the canonical catalogue (`V33-047`).
 *
 * No move is authored here any more. Each entry names the catalogue pattern it offers and
 * keeps this domain's own wording where that wording says more than the generic line.
 *
 * What the catalogue supplies is the half that ranking reads: duration, minimum, friction,
 * capacity shape, safety class, lifecycle, observation window, and identity. A domain
 * cannot disagree with it about those, which is the point of having one.
 */
export const EMOTIONAL_ACTIONS: Record<EmotionalActionId, EmotionalAction> = {
  'step-outside': adaptFlat('step-outside', 'pause:step-outside', {
    statement: 'Step outside for ten minutes, without your phone',
    intendedOutcome: 'You left the room and came back',
    minimumVersion: 'To the door and back',
    stoppingPoint: 'Ten minutes. Longer is fine; it is not required',
    followUpPromptId: 'outcome:completed',
  }),
  'name-it-and-park-it': adaptFlat('name-it-and-park-it', 'settle-attention:name-the-loop', {
    statement: 'Write down the thing that is taking up room, and close the notebook',
    intendedOutcome: 'It is written down somewhere other than your head',
    minimumVersion: 'One line',
    stoppingPoint: 'Do not solve it now. Writing it down is the whole task',
    followUpPromptId: 'outcome:completed',
  }),
  'move-the-body': adaptFlat('move-the-body', 'move-body:gentle-ten', {
    statement: 'Move for fifteen minutes — walk, stairs, anything',
    intendedOutcome: 'You moved for a while',
    minimumVersion: 'Five minutes of walking',
    stoppingPoint: 'Stop when you want to',
    followUpPromptId: 'outcome:duration',
  }),
  'reach-out-to-one-person': adaptFlat('reach-out-to-one-person', 'reach-out:message-someone', {
    statement: 'Message one person you have not spoken to in a while',
    intendedOutcome: 'The message was sent',
    minimumVersion: 'One line to one person',
    stoppingPoint: 'Sending it is the task. A reply is not part of it',
    followUpPromptId: 'emotional:reached-out',
  }),
  'send-the-message-you-drafted': adaptFlat(
    'send-the-message-you-drafted',
    'unblock-by-asking:send-the-message',
    {
      statement: 'Send the message you already decided to send',
      intendedOutcome: 'The message was sent',
      minimumVersion: 'Send it as it is',
      stoppingPoint: 'No rewriting. It was already good enough when you wrote it',
      followUpPromptId: 'emotional:reached-out',
    },
  ),
  'repair-after-a-conflict': adaptFlat('repair-after-a-conflict', 'repair:name-it-to-them', {
    statement: 'Go back to the person once things are calm',
    intendedOutcome: 'You made contact after it had settled',
    minimumVersion: 'One sentence, in person or in writing',
    stoppingPoint: 'One attempt. What they do next is theirs',
    followUpPromptId: 'emotional:repair-happened',
  }),
  'hold-the-boundary-you-decided': adaptFlat(
    'hold-the-boundary-you-decided',
    'boundary:say-no-once',
    {
      statement: 'Hold the boundary you already decided on',
      intendedOutcome: 'The thing you decided to do, or not do, is what happened',
      minimumVersion: 'Say the shortest true version of it',
      stoppingPoint: 'Say it once. Repeating it is a different decision',
      followUpPromptId: 'emotional:boundary-held',
    },
  ),
  'speak-to-someone-qualified': adaptFlat(
    'speak-to-someone-qualified',
    'defer-to-a-person:raise-it',
    {
      statement: 'Worth talking to your GP or a counsellor about',
      intendedOutcome: 'You raised it with someone qualified',
      minimumVersion: 'Book the appointment; the conversation is later',
      stoppingPoint: 'Nothing else is being asked of you here',
      followUpPromptId: 'outcome:completed',
    },
  ),
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
