/**
 * The Child Development and Learning Map (Prompt 8D.2).
 *
 * ## Why a map rather than the flat list Prompt 8D shipped
 *
 * Six tracked skills was honest and too small. A father asking "how is she getting on"
 * is not asking about six things — he is scanning a territory, and he wants to see all
 * of it at once and touch only what changed. Sections make the territory legible.
 *
 * They never become a report card. Nothing here is scored, summed, averaged, ranked, or
 * compared: a section is a heading, and the only thing under it is what he observed.
 *
 * ## Guidance, not authority
 *
 * The bands are approximate and named "around" on purpose, and the map states its own
 * source and version so that a health visitor's actual list can replace it later without
 * invalidating a single thing already recorded.
 *
 * ## Age without a birth date
 *
 * The owner picks a band. **No date of birth is stored** — it is the most identifying
 * thing this app could hold about a child, it would need protecting forever, and it buys
 * nothing he cannot say directly in one tap.
 */

import type { AgeBand } from './ageBands';

export const LEARNING_SECTIONS = [
  'language-and-early-reading',
  'numbers-and-thinking',
  'motor-skills',
  'social-and-emotional',
  'independence-and-practical-life',
  'creativity-and-play',
] as const;
export type LearningSection = (typeof LEARNING_SECTIONS)[number];

export const SECTION_LABELS: Record<LearningSection, string> = {
  'language-and-early-reading': 'Language and early reading',
  'numbers-and-thinking': 'Numbers and thinking',
  'motor-skills': 'Motor skills',
  'social-and-emotional': 'Social and emotional skills',
  'independence-and-practical-life': 'Independence and practical life',
  'creativity-and-play': 'Creativity and play',
};

export const LEARNING_MAP_SOURCE = 'General guidance (built in)';
export const LEARNING_MAP_VERSION = '2026-08';

export interface LearningSkill {
  readonly id: string;
  readonly label: string;
  readonly section: LearningSection;
  /** Bands in which this is worth showing. Outside them it is history, never failure. */
  readonly ageBands: readonly AgeBand[];
  readonly source: string;
  readonly sourceVersion: string;
}

function entry(
  id: string,
  label: string,
  section: LearningSection,
  ageBands: readonly AgeBand[],
): LearningSkill {
  return {
    id,
    label,
    section,
    ageBands,
    source: LEARNING_MAP_SOURCE,
    sourceVersion: LEARNING_MAP_VERSION,
  };
}

const EARLY: readonly AgeBand[] = ['around-12-18-months', 'around-18-24-months'];
const TODDLER: readonly AgeBand[] = ['around-18-24-months', 'around-2-3-years'];
const MIDDLE: readonly AgeBand[] = ['around-2-3-years', 'around-3-4-years'];
const PRESCHOOL: readonly AgeBand[] = ['around-3-4-years', 'around-4-5-years'];

/**
 * The map.
 *
 * The six ids from Prompt 8D are unchanged, because records already reference them and
 * an id is a promise. Everything else is new territory around them.
 */
export const TRACKED_SKILLS: readonly LearningSkill[] = [
  /* --- Language and early reading ---------------------------------------- */
  entry(
    'points-to-name',
    'Pointing at something you name in a book',
    'language-and-early-reading',
    EARLY,
  ),
  entry(
    'asking-for-help',
    'Asking for help with words or signs',
    'language-and-early-reading',
    TODDLER,
  ),
  entry(
    'joins-in-stories',
    'Joining in with a familiar story',
    'language-and-early-reading',
    MIDDLE,
  ),
  entry(
    'two-step-instruction',
    'Following an instruction with two parts',
    'language-and-early-reading',
    MIDDLE,
  ),
  entry(
    'recognises-own-name',
    'Recognising her own name written down',
    'language-and-early-reading',
    PRESCHOOL,
  ),

  /* --- Numbers and thinking ----------------------------------------------- */
  entry('matching-shapes', 'Matching shapes or fitting them in', 'numbers-and-thinking', EARLY),
  entry('sorting-by-kind', 'Sorting things into two groups', 'numbers-and-thinking', TODDLER),
  entry('counting-objects', 'Counting a few objects out loud', 'numbers-and-thinking', MIDDLE),
  entry(
    'what-comes-next',
    'Working out what comes next in a routine',
    'numbers-and-thinking',
    PRESCHOOL,
  ),

  /* --- Motor skills -------------------------------------------------------- */
  entry('using-a-spoon', 'Getting food to her mouth with a spoon', 'motor-skills', EARLY),
  entry('stacking', 'Stacking things without them falling', 'motor-skills', EARLY),
  entry('climbing-steps', 'Going up and down steps', 'motor-skills', TODDLER),
  entry('holding-a-pencil', 'Holding a pencil or crayon her own way', 'motor-skills', TODDLER),
  entry(
    'cutting-and-threading',
    'Cutting or threading with her hands',
    'motor-skills',
    PRESCHOOL,
  ),

  /* --- Social and emotional ----------------------------------------------- */
  entry(
    'waiting-a-moment',
    'Waiting a moment before getting something',
    'social-and-emotional',
    TODDLER,
  ),
  entry('playing-near-others', 'Playing near other children', 'social-and-emotional', TODDLER),
  entry('taking-turns', 'Taking turns in a game', 'social-and-emotional', MIDDLE),
  entry('naming-feelings', 'Naming what she is feeling', 'social-and-emotional', MIDDLE),
  entry(
    'comforting-someone',
    'Noticing when someone else is upset',
    'social-and-emotional',
    PRESCHOOL,
  ),

  /* --- Independence and practical life ------------------------------------ */
  entry(
    'putting-things-away',
    'Putting something back where it lives',
    'independence-and-practical-life',
    TODDLER,
  ),
  entry(
    'getting-dressed',
    'Getting dressed, or part of it',
    'independence-and-practical-life',
    MIDDLE,
  ),
  entry('washing-hands', 'Washing her own hands', 'independence-and-practical-life', MIDDLE),
  entry(
    'pouring-and-carrying',
    'Pouring or carrying something without help',
    'independence-and-practical-life',
    PRESCHOOL,
  ),

  /* --- Creativity and play ------------------------------------------------- */
  entry('music-and-moving', 'Moving or singing along to music', 'creativity-and-play', EARLY),
  entry(
    'making-marks',
    'Making marks and telling you what they are',
    'creativity-and-play',
    TODDLER,
  ),
  entry('pretend-play', 'Pretending one thing is another', 'creativity-and-play', MIDDLE),
  entry(
    'building-something',
    'Building something she had in mind',
    'creativity-and-play',
    PRESCHOOL,
  ),
];

export const SKILL_LABELS: Record<string, string> = Object.fromEntries(
  TRACKED_SKILLS.map((skill) => [skill.id, skill.label]),
);

export function skillById(skillId: string): LearningSkill | undefined {
  return TRACKED_SKILLS.find((skill) => skill.id === skillId);
}

export function skillsInSection(section: LearningSection): readonly LearningSkill[] {
  return TRACKED_SKILLS.filter((skill) => skill.section === section);
}

/** Skills the chosen band makes currently relevant. */
export function skillsForBand(band: AgeBand): readonly LearningSkill[] {
  return TRACKED_SKILLS.filter((skill) => skill.ageBands.includes(band));
}

/** The attribute one skill's **declared level** is filed under. */
export function skillAttribute(skillId: string): string {
  return `father:skill:${skillId}`;
}

/**
 * The attribute one occasion's **evidence** is filed under.
 *
 * Deliberately separate from the declared level. A level is what the father says is true
 * now; evidence is what he saw once. Keeping them apart is what lets several occasions
 * add up to a suggestion without the app having quietly changed anything — and it is why
 * a Tiny Lesson can contribute to a progression without a completed lesson ever meaning
 * mastery on its own.
 */
export function skillEvidenceAttribute(skillId: string): string {
  return `father:skill-evidence:${skillId}`;
}

const EVIDENCE_PREFIX = 'father:skill-evidence:';
const LEVEL_PREFIX = 'father:skill:';

export function skillIdFromEvidenceAttribute(attribute: string): string | undefined {
  return attribute.startsWith(EVIDENCE_PREFIX)
    ? attribute.slice(EVIDENCE_PREFIX.length)
    : undefined;
}

export function skillIdFromLevelAttribute(attribute: string): string | undefined {
  return attribute.startsWith(LEVEL_PREFIX) && !attribute.startsWith(EVIDENCE_PREFIX)
    ? attribute.slice(LEVEL_PREFIX.length)
    : undefined;
}
