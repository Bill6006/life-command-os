import {
  assessFreshness,
  type CanonicalRecord,
  type ObservationRecord,
} from '../../../domain/records';
import {
  AGE_BAND_ATTRIBUTE,
  DEFAULT_AGE_BAND,
  LEARNING_SECTIONS,
  SECTION_LABELS,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TRACKED_SKILLS,
  ageBandFromLabel,
  skillAttribute,
  skillEvidenceAttribute,
  skillLevelIndex,
  skillsForBand,
  type AgeBand,
  type LearningSection,
  type LearningSkill,
  type SkillLevel,
} from '../../../domain/fatherhood/development';
import {
  suggestProgression,
  type ProgressionEvidence,
  type ProgressionOutcome,
} from '../../../domain/fatherhood/progression';
import { lessonFor } from '../../../domain/fatherhood/actions';
import { currentObservations } from '../../support';
import type { FreshnessStatus } from '../../types';

/**
 * The scan model behind `Update This Area` (Prompt 8D.2 tasks 1–3).
 *
 * ## What "fast to scan" means here
 *
 * Everything currently relevant is on one page, grouped, and **quiet by default**. Only
 * four things are ever highlighted: newly relevant, stale, recently changed, and enough
 * evidence for a possible progression. Everything else is visible and deliberately dull,
 * because a page where everything is emphasised is a page where nothing is.
 *
 * ## What is visible, and why it is more than the current band
 *
 * A skill appears when it is in the current band, **or** when anything has ever been
 * recorded against it, **or** when she reached the top rung. Changing band therefore
 * adds; it never removes. A skill that has left the band is marked `historical` and
 * keeps every observation it ever had — the band decides what is newly worth looking at,
 * never what is true.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Long enough that re-reading is worth it; short enough that a term is not a gap. */
const SKILL_FRESH_MS = 45 * DAY_MS;
/** A change this recent is worth pointing at when he opens the page. */
const RECENTLY_CHANGED_MS = 14 * DAY_MS;

export type SkillHighlight =
  'newly-relevant' | 'stale' | 'recently-changed' | 'possible-progression';

export interface LearningMapSkill {
  readonly skillId: string;
  readonly label: string;
  readonly section: LearningSection;
  readonly source: string;
  readonly sourceVersion: string;
  /** In the current band. False means it is history, kept and readable. */
  readonly currentlyRelevant: boolean;
  readonly historical: boolean;
  /** What the owner last declared. `undefined` means nothing declared yet. */
  readonly level: SkillLevel | undefined;
  readonly levelLabel: string | undefined;
  readonly levelSetAt: string | undefined;
  /** The most recent thing he saw, whether or not it changed the level. */
  readonly lastObservedAt: string | undefined;
  readonly lastObservationLabel: string | undefined;
  /** Only meaningful once something has been recorded. `undefined` otherwise. */
  readonly freshness: FreshnessStatus | undefined;
  readonly evidenceCount: number;
  readonly hasTinyLesson: boolean;
  readonly lessonStatement: string | undefined;
  readonly progression: ProgressionOutcome;
  readonly highlights: readonly SkillHighlight[];
  readonly note: string | undefined;
}

export interface LearningMapSection {
  readonly section: LearningSection;
  readonly label: string;
  readonly skills: readonly LearningMapSkill[];
}

export interface LearningMap {
  readonly ageBand: AgeBand;
  readonly ageBandChosen: boolean;
  readonly sections: readonly LearningMapSection[];
  readonly visibleSkillCount: number;
  readonly highlightedCount: number;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

function levelFromLabel(label: string | undefined): SkillLevel | undefined {
  return label === undefined
    ? undefined
    : SKILL_LEVELS.find((level) => SKILL_LEVEL_LABELS[level] === label);
}

/** The band the owner chose, the one before it, and whether he has chosen at all. */
export function currentAgeBand(records: readonly CanonicalRecord[]): {
  readonly band: AgeBand;
  readonly previous: AgeBand | undefined;
  readonly chosen: boolean;
} {
  const history = currentObservations(records)
    .filter((observation) => observation.attribute === AGE_BAND_ATTRIBUTE)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const band =
    history[0] === undefined ? undefined : ageBandFromLabel(stateText(history[0]) ?? '');
  const previous =
    history[1] === undefined ? undefined : ageBandFromLabel(stateText(history[1]) ?? '');

  return { band: band ?? DEFAULT_AGE_BAND, previous, chosen: band !== undefined };
}

export function buildLearningMap(records: readonly CanonicalRecord[], now: Date): LearningMap {
  const observations = currentObservations(records);
  const byAttribute = (attribute: string): ObservationRecord[] =>
    observations
      .filter((observation) => observation.attribute === attribute)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const { band, previous, chosen } = currentAgeBand(records);
  const relevant = new Set(skillsForBand(band).map((skill) => skill.id));

  /*
   * "New" means *newly* relevant, not merely untouched.
   *
   * On a first visit every relevant skill has nothing recorded against it, so marking
   * those as new lit up the entire page — the exact opposite of what a highlight is
   * for, and visible on the deployed build as fifteen of sixteen rows emphasised. A
   * skill is new when the band change brought it in; on day one there is no "new",
   * there is just the map.
   */
  const wasRelevant = new Set(
    previous === undefined ? [] : skillsForBand(previous).map((skill) => skill.id),
  );
  const newlyRelevant = new Set(
    previous === undefined ? [] : [...relevant].filter((id) => !wasRelevant.has(id)),
  );

  const built = TRACKED_SKILLS.map((skill) =>
    buildSkill(skill, relevant.has(skill.id), newlyRelevant.has(skill.id), byAttribute, now),
  ).filter(
    (entry) => entry.currentlyRelevant || entry.level !== undefined || entry.evidenceCount > 0,
  );

  const sections = LEARNING_SECTIONS.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    skills: built.filter((entry) => entry.section === section),
  }));

  return {
    ageBand: band,
    ageBandChosen: chosen,
    // Every section is returned, including empty ones: a heading with nothing under it
    // is a true statement about the map, and hiding it would make the page shift shape.
    sections,
    visibleSkillCount: built.length,
    highlightedCount: built.filter((entry) => entry.highlights.length > 0).length,
  };
}

function buildSkill(
  skill: LearningSkill,
  currentlyRelevant: boolean,
  newlyRelevant: boolean,
  byAttribute: (attribute: string) => ObservationRecord[],
  now: Date,
): LearningMapSkill {
  const levels = byAttribute(skillAttribute(skill.id));
  const evidence = byAttribute(skillEvidenceAttribute(skill.id));

  const declared = levels[0];
  const level = levelFromLabel(declared === undefined ? undefined : stateText(declared));

  const evidenceItems: ProgressionEvidence[] = evidence.flatMap((record) => {
    const itemLevel = levelFromLabel(stateText(record));
    return itemLevel === undefined
      ? []
      : [
          {
            recordId: record.recordId,
            level: itemLevel,
            occurredAt: record.occurredAt,
            note: undefined,
          },
        ];
  });

  const lastObserved = [declared, evidence[0]]
    .flatMap((record) => (record === undefined ? [] : [record]))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];

  const progression =
    level === undefined
      ? {
          kind: 'none' as const,
          because: 'Nothing has been set for this yet, so there is nothing to move up from.',
        }
      : suggestProgression(level, evidenceItems);

  const highlights: SkillHighlight[] = [];
  const anythingRecorded = level !== undefined || evidenceItems.length > 0;

  if (newlyRelevant && !anythingRecorded) highlights.push('newly-relevant');
  if (progression.kind === 'suggested') highlights.push('possible-progression');

  const freshness =
    lastObserved === undefined
      ? undefined
      : assessFreshness(lastObserved.occurredAt, now, SKILL_FRESH_MS).status;

  if (currentlyRelevant && anythingRecorded && freshness === 'stale') highlights.push('stale');

  if (
    declared !== undefined &&
    levels.length > 1 &&
    now.getTime() - Date.parse(declared.occurredAt) <= RECENTLY_CHANGED_MS
  ) {
    highlights.push('recently-changed');
  }

  const lesson = lessonFor(skill.id);
  const noteRecord = byAttribute(`father:skill-note:${skill.id}`)[0];

  return {
    skillId: skill.id,
    label: skill.label,
    section: skill.section,
    source: skill.source,
    sourceVersion: skill.sourceVersion,
    currentlyRelevant,
    historical: !currentlyRelevant,
    level,
    levelLabel: level === undefined ? undefined : SKILL_LEVEL_LABELS[level],
    levelSetAt: declared?.occurredAt,
    lastObservedAt: lastObserved?.occurredAt,
    lastObservationLabel:
      lastObserved === undefined ? undefined : (stateText(lastObserved) ?? undefined),
    freshness,
    evidenceCount: evidenceItems.length,
    hasTinyLesson: lesson !== undefined,
    lessonStatement: lesson?.statement,
    progression,
    highlights,
    note: noteRecord === undefined ? undefined : noteText(noteRecord),
  };
}

/** Every skill on the map, flattened. Used by tests and by the panel summary. */
export function allMapSkills(map: LearningMap): readonly LearningMapSkill[] {
  return map.sections.flatMap((section) => section.skills);
}

export function mapSkill(map: LearningMap, skillId: string): LearningMapSkill | undefined {
  return allMapSkills(map).find((skill) => skill.skillId === skillId);
}

/** The highest rung reached, used to keep mastered skills visible across band changes. */
export function retainedSkills(map: LearningMap): readonly LearningMapSkill[] {
  return allMapSkills(map).filter(
    (skill) => skill.level !== undefined && skillLevelIndex(skill.level) >= 0,
  );
}
