/**
 * What this domain can say about a child, and what it structurally cannot.
 *
 * ## Two ladders that must never merge
 *
 * An **official milestone** is an answer against someone else's checklist: standard
 * wording, a named source, a version, and a status. A **personal skill** is what this
 * father has actually seen at home, on a ladder about support rather than achievement.
 *
 * They are kept apart deliberately. A checklist says what is typical; a father's
 * observation says what happened in his kitchen on Tuesday. Merging them produces the
 * thing this product refuses to build — a number that looks like an assessment — and
 * loses the only two facts that are genuinely useful: what she can do with help, and
 * what a standard list would call it.
 *
 * ## What is absent, not filtered
 *
 * No score, no percentage, no percentile, no age-equivalent, no "on track", no
 * developmental interpretation. There is no code path that produces one, because
 * nothing here computes across milestones at all.
 */

/* -------------------------------------------------------------------------- */
/* The personal skill ladder                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Seven positions, ordered by how much of the doing is hers.
 *
 * This is a support ladder, not an achievement ladder, which is why "needs support"
 * sits *above* "practising with daddy" rather than below it: attempting something and
 * needing help is further along than being shown it. The wording is deliberately
 * ordinary — a father's description of an evening, not a clinical rating.
 */
export const SKILL_LEVELS = [
  'not-introduced',
  'exposed-through-play',
  'practising-with-daddy',
  'needs-support',
  'doing-sometimes',
  'doing-often',
  'uses-on-her-own',
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  'not-introduced': 'Not introduced',
  'exposed-through-play': 'Exposed through play',
  'practising-with-daddy': 'Practising with daddy',
  'needs-support': 'Needs support',
  'doing-sometimes': 'Doing sometimes',
  'doing-often': 'Doing often',
  'uses-on-her-own': 'Uses on her own',
};

export function skillLevelIndex(level: SkillLevel): number {
  return SKILL_LEVELS.indexOf(level);
}

/** True when the second reading is further along the ladder than the first. */
export function movedForward(from: SkillLevel, to: SkillLevel): boolean {
  return skillLevelIndex(to) > skillLevelIndex(from);
}

/**
 * The skills this slice tracks.
 *
 * A short list on purpose. A hundred trackable skills is a checklist, and a checklist
 * is the thing the owner already abandoned once.
 */
export const TRACKED_SKILLS = [
  { id: 'asking-for-help', label: 'Asking for help with words or signs' },
  { id: 'putting-things-away', label: 'Putting something back where it lives' },
  { id: 'taking-turns', label: 'Taking turns in a game' },
  { id: 'getting-dressed', label: 'Getting dressed, or part of it' },
  { id: 'naming-feelings', label: 'Naming what she is feeling' },
  { id: 'waiting-a-moment', label: 'Waiting a moment before getting something' },
] as const;
export type TrackedSkillId = (typeof TRACKED_SKILLS)[number]['id'];

export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  TRACKED_SKILLS.map((skill) => [skill.id, skill.label]),
);

/** The attribute one skill's readings are filed under. */
export function skillAttribute(skillId: string): string {
  return `father:skill:${skillId}`;
}

/* -------------------------------------------------------------------------- */
/* The official checklist                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The built-in list, and why it is written the way it is.
 *
 * These are plainly-worded, widely-agreed developmental observations, written here
 * rather than copied from any organisation's published checklist — the repository
 * reproduces nobody's material. The point of the feature is not this list: it is that
 * **every answer stores the source and version it was given against**, so an owner who
 * configures their health visitor's actual list keeps every earlier answer meaningful.
 *
 * The default source is named as what it is. It is not an authority, and the domain
 * never presents it as one.
 */
export const DEFAULT_MILESTONE_SOURCE = 'General guidance (built in)';
export const DEFAULT_MILESTONE_SOURCE_VERSION = '2026-08';

export const MILESTONE_CATALOGUE = [
  { id: 'walks-unaided', ageBand: 'around 18 months', text: 'Walks without holding on' },
  { id: 'two-word-phrases', ageBand: 'around 2 years', text: 'Puts two words together' },
  {
    id: 'points-to-show',
    ageBand: 'around 18 months',
    text: 'Points at something to show you',
  },
  { id: 'follows-simple-ask', ageBand: 'around 2 years', text: 'Follows a simple request' },
  { id: 'plays-alongside', ageBand: 'around 2 years', text: 'Plays alongside other children' },
  { id: 'stacks-objects', ageBand: 'around 18 months', text: 'Stacks a few objects' },
  { id: 'responds-to-name', ageBand: 'around 12 months', text: 'Looks up when called by name' },
  {
    id: 'copies-what-you-do',
    ageBand: 'around 18 months',
    text: 'Copies something you just did',
  },
] as const;
export type MilestoneId = (typeof MILESTONE_CATALOGUE)[number]['id'];

export function milestoneText(milestoneId: string): string | undefined {
  return MILESTONE_CATALOGUE.find((entry) => entry.id === milestoneId)?.text;
}

/* -------------------------------------------------------------------------- */
/* Vocabulary this domain may never use                                         */
/* -------------------------------------------------------------------------- */

/**
 * Asserted against the actions, the prompts, and the rendered panel.
 *
 * Two groups. The first would turn a father's notes into an assessment he is not
 * qualified to make and did not ask for. The second is the language of blame, which
 * has no place in a record of a two-year-old or of the man raising her.
 */
export const FORBIDDEN_FATHERHOOD_VOCABULARY = [
  // Assessment.
  'percentile',
  'developmental age',
  'age equivalent',
  'on track',
  'behind for her age',
  'ahead for her age',
  'delayed',
  'disorder',
  'diagnos',
  'assessment score',
  'child score',
  'development score',
  'normal range',
  // Blame.
  'bad parent',
  'good parent',
  'should have',
  'failed to',
  'neglect',
  'lazy',
  'you never',
] as const;
