import { SKILL_LABELS, type TrackedSkillId } from './development';
import { adaptFlat, type FlatDomainMoveView } from '../moves/adapt';

/**
 * The closed set of fatherhood actions, and the Tiny Lessons they can carry.
 *
 * Same device as the health slice, for a related reason. Health could hurt someone by
 * composing advice about a symptom; this domain could hurt someone by composing advice
 * about their child. A generated parenting suggestion is one plausible-looking template
 * away from telling a father his daughter should be doing something by now.
 *
 * So there is no template. Every action is written out below and reviewed as text.
 *
 * ## What a Dad action is, and is not
 *
 * It is something **the father does**, recorded against him. It is never a change to
 * her status: those are `milestone-observation` records and `father:skill:*`
 * observations, and nothing in this file can write either. Practising a skill with her
 * is evidence that he practised it — what she can now do is a separate observation,
 * made separately, because a parent who has just spent twenty minutes teaching
 * something is the least reliable judge of whether she has learned it.
 *
 * ## What is absent
 *
 * No sleep training method, no discipline technique, no feeding advice, no screen-time
 * rule, no developmental interpretation. Not filtered — absent.
 */

export const FATHERHOOD_ACTION_IDS = [
  'tiny-lesson',
  'follow-her-lead',
  'protect-the-wind-down',
  'repair-after-a-hard-moment',
  'raise-it-with-someone-qualified',
] as const;
export type FatherhoodActionId = (typeof FATHERHOOD_ACTION_IDS)[number];

/**
 * A fatherhood action: a catalogue pattern plus this slice's own reasoning.
 *
 * `whyItMatters` is not part of the move. It is the domain explaining itself to the owner
 * so a decline can be a reason rather than a shrug, and no other slice has an equivalent.
 */
export type FatherhoodAction = FlatDomainMoveView<FatherhoodActionId> & {
  readonly whyItMatters: string;
};

/**
 * Every fatherhood action, as a view over the canonical catalogue (`V33-047`).
 *
 * No move is authored here any more. Each entry names the catalogue pattern it offers and
 * keeps this domain's own wording, which is nearly all of it — these sentences are about a
 * specific child and a specific evening, and the generic catalogue line cannot be.
 *
 * `whyItMatters` stays local. It is not part of the move; it is this slice explaining its
 * own reasoning to the owner, and no other domain has an equivalent.
 */
export const FATHERHOOD_ACTIONS: Record<FatherhoodActionId, FatherhoodAction> = {
  'tiny-lesson': {
    ...adaptFlat('tiny-lesson', 'attend-to-child:one-tiny-lesson', {
      statement: 'Do one tiny lesson together',
      intendedOutcome: 'The activity happened and you saw how much help she needed',
      minimumVersion: 'Two minutes, one attempt, whatever she gives you',
      stoppingPoint:
        'Stop the moment she loses interest — a stopped lesson is not a failed one',
      followUpPromptId: 'father:lesson-happened',
    }),
    whyItMatters:
      'One small thing practised on purpose gives her a chance to try it, and gives you something you actually watched rather than something you assume.',
  },
  'follow-her-lead': {
    ...adaptFlat('follow-her-lead', 'attend-to-child:follow-their-lead', {
      statement: 'Join whatever she is already doing, without redirecting it',
      intendedOutcome: 'You spent time in her activity rather than starting your own',
      minimumVersion: 'Sit down next to her for five minutes',
      stoppingPoint: 'Stop when you need to — leaving early does not undo it',
      followUpPromptId: 'father:together-happened',
    }),
    whyItMatters:
      'Joining what already has her attention costs nothing to set up and needs no cooperation from her, which is why it survives a bad evening when a planned activity does not.',
  },
  'protect-the-wind-down': {
    ...adaptFlat('protect-the-wind-down', 'attend-to-child:protect-the-wind-down', {
      intendedOutcome: 'The wind-down ran in its usual order',
      minimumVersion: 'Keep the last step the same even if the rest slipped',
      stoppingPoint:
        'If it has already gone sideways, let it go — tomorrow is a separate evening',
      followUpPromptId: 'father:wind-down-happened',
    }),
    whyItMatters:
      'The last half hour is the part of the day most easily lost to everything else, and it is the part she can most predict.',
  },
  'repair-after-a-hard-moment': {
    ...adaptFlat('repair-after-a-hard-moment', 'repair:ask-what-they-need', {
      statement: 'Go back to her once things are calm',
      intendedOutcome: 'You went back to her after it had settled',
      minimumVersion: 'Sit near her for a minute without raising it',
      stoppingPoint: 'One attempt. If she is not ready, that is information, not a rejection',
      followUpPromptId: 'father:together-happened',
    }),
    whyItMatters:
      'Coming back afterwards is a separate act from what happened, and it is the one that is still available to you.',
  },
  'raise-it-with-someone-qualified': {
    ...adaptFlat(
      'raise-it-with-someone-qualified',
      'defer-to-a-person:mention-at-the-next-appointment',
      {
        statement: 'Worth mentioning to your health visitor or GP at the next opportunity',
        intendedOutcome: 'You raised it with someone qualified',
        minimumVersion: 'Write it down somewhere you will have it with you',
        stoppingPoint: 'Nothing else is being asked of you here',
        followUpPromptId: 'father:concern-still-present',
      },
    ),
    whyItMatters:
      'You have recorded this more than once over several weeks. That is exactly the kind of thing a person who examines children for a living should hear about, and exactly the kind this app should not interpret.',
  },
};

/* -------------------------------------------------------------------------- */
/* Today's Tiny Lesson                                                          */
/* -------------------------------------------------------------------------- */

/**
 * One lesson per tracked skill. Each is an activity, not an instruction to her.
 *
 * `whyItMatters` exists so the owner can decline for a reason rather than out of
 * vagueness, and `minimumVersion` exists because the version that survives a difficult
 * evening is the one that gets done at all.
 */
export interface TinyLesson {
  readonly skillId: TrackedSkillId;
  readonly statement: string;
  readonly whyItMatters: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
}

export const TINY_LESSONS: readonly TinyLesson[] = [
  {
    skillId: 'asking-for-help',
    statement: 'Put something she wants slightly out of reach and wait before helping',
    whyItMatters:
      'Waiting a beat leaves room for her to ask, which she cannot do if you are already helping.',
    minimumVersion: 'Wait three seconds once, then help',
    stoppingPoint: 'Help her as soon as she gets frustrated',
  },
  {
    skillId: 'putting-things-away',
    statement: 'Put one thing away together at the end of the game',
    whyItMatters: 'One object is small enough to finish, which is what makes it repeatable.',
    minimumVersion: 'You hold the box, she drops one thing in',
    stoppingPoint: 'One object. Do not turn it into tidying up',
  },
  {
    skillId: 'taking-turns',
    statement: 'Play one thing where you swap after each go',
    whyItMatters: 'Turn-taking is easier to practise in a game than in a moment that matters.',
    minimumVersion: 'Three swaps',
    stoppingPoint: 'Stop while she is still enjoying it',
  },
  {
    skillId: 'getting-dressed',
    statement: 'Let her do one part of getting dressed herself',
    whyItMatters: 'One part is slow; all of it is a battle. The part is the practice.',
    minimumVersion: 'One arm, one sock — whichever is closest to done',
    stoppingPoint: 'Take over the moment it stops being a game',
  },
  {
    skillId: 'naming-feelings',
    statement: 'Say what you notice about how she seems, and leave it there',
    whyItMatters:
      'Hearing the word attached to the moment is what makes it available to her later.',
    minimumVersion: 'One sentence, once',
    stoppingPoint: 'Do not ask her to agree with you',
  },
  {
    skillId: 'waiting-a-moment',
    statement: 'Count to three together before handing something over',
    whyItMatters: 'A short, predictable wait is practice; an unexplained one is just a delay.',
    minimumVersion: 'Count to three, once',
    stoppingPoint: 'Hand it over on three, every time',
  },
];

export function lessonFor(skillId: string): TinyLesson | undefined {
  return TINY_LESSONS.find((lesson) => lesson.skillId === skillId);
}

/** The lesson statement with the skill it practises, for display. */
export function lessonLabel(lesson: TinyLesson): string {
  return `${lesson.statement} — practising ${(SKILL_LABELS[lesson.skillId] ?? lesson.skillId).toLowerCase()}`;
}
