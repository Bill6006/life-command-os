/**
 * The evidence ladder, the barrier taxonomy, and the closed career action set
 * (Prompt 8C, LEG-061, LEG-065, Blueprint §9.3).
 *
 * ## The ladder is defined by evidence, not by self-assessment
 *
 * Every rung names something that either happened or did not. "Did it without a guide"
 * is checkable; "intermediate level" is a feeling. The legacy app had a proof ladder
 * whose rungs were self-declared, which meant it measured confidence and reported it
 * as capability — and the two diverge in exactly the situation where the difference
 * matters, sitting in an interview.
 *
 * So the owner does not choose their rung. They record what they did, and the rung
 * follows.
 */

export const LADDER_RUNGS = [
  'not-started',
  'read-about-it',
  'followed-a-guide',
  'did-it-with-help',
  'did-it-alone',
  'used-it-for-real',
] as const;
export type LadderRung = (typeof LADDER_RUNGS)[number];

export const LADDER_LABELS: Record<LadderRung, string> = {
  'not-started': 'Not started',
  'read-about-it': 'Read about it',
  'followed-a-guide': 'Followed a guide',
  'did-it-with-help': 'Did it with help',
  'did-it-alone': 'Did it alone',
  'used-it-for-real': 'Used it for real',
};

/** What each rung requires. Read these as the definition of the ladder. */
export const LADDER_EVIDENCE: Record<LadderRung, string> = {
  'not-started': 'Nothing recorded yet',
  'read-about-it': 'A study session on this topic',
  'followed-a-guide': 'A lab or exercise completed by following instructions',
  'did-it-with-help': 'Completed with documentation or help to hand',
  'did-it-alone': 'Completed without following a guide',
  'used-it-for-real': 'Used in real work, with a Work Win recording it',
};

/**
 * The rung a claim has *earned*, given its evidence.
 *
 * Deliberately takes counts rather than a self-report. A claim cannot climb by being
 * asserted more confidently.
 */
export function rungFor(evidence: {
  readonly studySessions: number;
  readonly guidedLabs: number;
  readonly assistedLabs: number;
  readonly independentLabs: number;
  readonly realWorkWins: number;
}): LadderRung {
  if (evidence.realWorkWins > 0) return 'used-it-for-real';
  if (evidence.independentLabs > 0) return 'did-it-alone';
  if (evidence.assistedLabs > 0) return 'did-it-with-help';
  if (evidence.guidedLabs > 0) return 'followed-a-guide';
  if (evidence.studySessions > 0) return 'read-about-it';
  return 'not-started';
}

export function rungIndex(rung: LadderRung): number {
  return LADDER_RUNGS.indexOf(rung);
}

/* -------------------------------------------------------------------------- */

/**
 * What was in the way (LEG-065).
 *
 * The Blueprint's list includes "fear" and "perfectionism". Those are stored here as
 * taxonomy ids so Phase 8 can learn from them — but they are **never the words on
 * screen**, because offering "fear" as a button asks the owner to accept a
 * psychological label about themselves, which `OBS-002` forbids and which produces a
 * worse answer than the behavioural question does.
 *
 * The visible wording describes what happened. The meaning is preserved; the
 * self-diagnosis is not.
 */
export const STUDY_BARRIERS = [
  { id: 'unclear-next-step', label: 'I was not sure what to do next' },
  { id: 'low-energy', label: 'I did not have the energy' },
  { id: 'setup-cost', label: 'Getting set up takes too long' },
  { id: 'interrupted', label: 'I was interrupted' },
  { id: 'felt-too-big', label: 'It looked like more than I had in me' },
  { id: 'kept-preparing', label: 'I kept wanting to prepare more first' },
  { id: 'lost-interest', label: 'I could not stay with it' },
  { id: 'overloaded', label: 'Too much else was going on' },
  { id: 'something-else', label: 'Something else came up' },
  { id: 'no-barrier', label: 'Nothing in particular — I did not start' },
] as const;
export type StudyBarrierId = (typeof STUDY_BARRIERS)[number]['id'];

export const BARRIER_LABELS: Record<string, string> = Object.fromEntries(
  STUDY_BARRIERS.map((barrier) => [barrier.id, barrier.label]),
);

/** The id behind a visible label, for storing the taxonomy rather than the wording. */
export function barrierIdFor(label: string): StudyBarrierId | undefined {
  return STUDY_BARRIERS.find((barrier) => barrier.label === label)?.id;
}

/* -------------------------------------------------------------------------- */

/**
 * The closed set of career actions (task 9).
 *
 * The same device as the health slice, for a different reason. Health needed a closed
 * set because composed advice about a symptom is dangerous. Career needs one because
 * composed advice about work is *limitless* — there is always another thing that could
 * be studied, and a generator would produce an infinite backlog, which is the task
 * board the Blueprint forbids.
 *
 * Four actions. None of them is "do the next module".
 */
export const CAREER_ACTION_IDS = [
  'name-the-next-step',
  'return-to-it',
  'prove-a-claim',
  'practise-retrieval',
] as const;
export type CareerActionId = (typeof CAREER_ACTION_IDS)[number];

export interface CareerAction {
  readonly id: CareerActionId;
  readonly statement: string;
  readonly intendedOutcome: string;
  readonly followUp: { readonly promptId: string; readonly windowHours: number };
  readonly durationMinutes: number;
  readonly minimumMinutes: number;
  readonly minimumVersion: string;
  readonly fallback: string;
  readonly stoppingPoint: string;
  readonly friction: 'low' | 'moderate' | 'high';
}

export const CAREER_ACTIONS: Record<CareerActionId, CareerAction> = {
  'name-the-next-step': {
    id: 'name-the-next-step',
    statement: 'Write down the exact next step, in one sentence',
    intendedOutcome: 'The next study session starts without deciding what to do first',
    followUp: { promptId: 'career:next-step', windowHours: 24 },
    durationMinutes: 5,
    minimumMinutes: 2,
    minimumVersion: 'One line. It does not have to be the right one.',
    fallback: 'Write down the question you would need answered to know the next step',
    stoppingPoint: 'One sentence. This is not planning.',
    friction: 'low',
  },
  'return-to-it': {
    id: 'return-to-it',
    statement: 'Pick up where you stopped',
    intendedOutcome: 'The interrupted session is resumed rather than restarted',
    followUp: { promptId: 'career:re-entry', windowHours: 24 },
    durationMinutes: 20,
    minimumMinutes: 5,
    minimumVersion: 'Five minutes re-reading what you had open',
    fallback: 'Write down where you got to, so the next attempt starts there',
    stoppingPoint: 'Stop after twenty minutes regardless of progress',
    friction: 'moderate',
  },
  'prove-a-claim': {
    id: 'prove-a-claim',
    statement: 'Do the smallest thing that would prove it',
    intendedOutcome: 'A claim with nothing behind it gains its first piece of evidence',
    followUp: { promptId: 'career:lab-independence', windowHours: 48 },
    durationMinutes: 30,
    minimumMinutes: 10,
    minimumVersion: 'Ten minutes: get as far as the first thing that actually runs',
    fallback: 'Write down what proof would look like, so it can be done later',
    stoppingPoint: 'Stop when something works, or after thirty minutes',
    friction: 'moderate',
  },
  'practise-retrieval': {
    id: 'practise-retrieval',
    statement: 'Try to recall it before looking anything up',
    intendedOutcome: 'What comes back without notes is observed rather than assumed',
    followUp: { promptId: 'career:retrieval', windowHours: 24 },
    durationMinutes: 15,
    minimumMinutes: 5,
    minimumVersion: 'Five minutes, notes closed',
    fallback: 'Write down the three things you would need to remember',
    stoppingPoint: 'Fifteen minutes. Checking afterwards is part of it.',
    friction: 'low',
  },
};

/**
 * Words this slice must never produce.
 *
 * The Blueprint forbids hosting course content and building a second task board. These
 * are the words that would appear first if either started happening, and they are
 * asserted against the action set, the prompts, and the rendered panel.
 */
export const FORBIDDEN_CAREER_VOCABULARY = [
  'module',
  'lesson',
  'curriculum',
  'syllabus',
  'chapter',
  'course content',
  'watch the video',
  'due date',
  'due by',
  'task list',
  'to-do',
  'todo',
  'checklist',
  'assignment',
  'quiz score',
  'exam score',
  'percent complete on',
] as const;
