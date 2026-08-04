import {
  assessFreshness,
  type CanonicalRecord,
  type MilestoneObservationRecord,
  type ObservationRecord,
  type ReportableMilestoneStatus,
} from '../../../domain/records';
import {
  SKILL_LABELS,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TRACKED_SKILLS,
  skillsForBand,
  milestoneText,
  skillAttribute,
  type SkillLevel,
} from '../../../domain/fatherhood/development';
import { currentObservations, currentOfType } from '../../support';
import { currentAgeBand } from './learningMap';
import { captureDomain, isCapture } from '../captureRouting';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the fatherhood evidence (Prompt 8D tasks 1–5, 11).
 *
 * A read over the shared canonical records. Two things it is careful about:
 *
 * **The two ladders never meet.** Official milestone answers and personal skill
 * readings are returned as separate lists and are never combined, averaged, counted
 * against each other, or reduced to a figure. There is no function here that takes
 * both.
 *
 * **Nothing is concluded about the child.** This module reports what was recorded and
 * when. It does not decide whether anything is on time, typical, or worth worrying
 * about — the one thing it does notice is that the owner recorded a concern and that
 * it is still there weeks later, which is an observation about the record, not about
 * the child.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const TOGETHER_FRESH_MS = 3 * DAY_MS;

/** How long a concern has to persist before the domain suggests raising it. */
export const CONCERN_PERSISTENCE_DAYS = 21;

export interface SkillReading {
  readonly skillId: string;
  readonly label: string;
  readonly level: SkillLevel;
  readonly levelLabel: string;
  readonly at: string;
  /** The previous reading, when there is one. Movement, never a rate. */
  readonly previous: SkillLevel | undefined;
}

export interface MilestoneReading {
  readonly milestoneId: string;
  readonly text: string;
  readonly status: ReportableMilestoneStatus;
  readonly checklistSource: string;
  readonly checklistVersion: string;
  readonly at: string;
  readonly ageDays: number;
}

export interface FatherhoodEvidence {
  readonly enabled: boolean;
  readonly anyEvidence: boolean;
  /** Personal skill readings, most recently updated first. */
  readonly skills: readonly SkillReading[];
  /** Official milestone answers, newest first. Never counted or scored. */
  readonly milestones: readonly MilestoneReading[];
  /** Milestone answers of `concern` or `possible-loss` that are still the current one. */
  readonly openConcerns: readonly MilestoneReading[];
  /** A concern first recorded long enough ago that a person should hear about it. */
  readonly persistentConcern: MilestoneReading | undefined;
  /** Whether the owner said the concern is still there. `undefined` means not asked. */
  readonly concernStillPresent: boolean | undefined;
  readonly momentsCaptured: readonly ObservationRecord[];
  readonly lastTogetherAt: string | undefined;
  readonly togetherFreshness: FreshnessStatus;
  readonly lessonsStarted: number;
  readonly lessonsThatHappened: number;
  /** Skills with no reading at all. Absence, never a gap in her. */
  readonly untouchedSkills: readonly string[];
  /** The private display name, if the owner set one. Never in a fixture. */
  readonly displayName: string | undefined;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

function levelFromLabel(label: string): SkillLevel | undefined {
  return SKILL_LEVELS.find((level) => SKILL_LEVEL_LABELS[level] === label);
}

/**
 * The current status of every milestone that has ever been answered.
 *
 * Newest answer per milestone wins, and the earlier ones stay in storage. A milestone
 * answered "concern" in March and "yes" in June is not a contradiction to resolve — it
 * is the point of keeping both.
 */
function currentMilestones(records: readonly CanonicalRecord[]): MilestoneReading[] {
  const newest = new Map<string, MilestoneObservationRecord>();
  for (const record of currentOfType<MilestoneObservationRecord>(
    records,
    'milestone-observation',
  )) {
    const existing = newest.get(record.milestoneId);
    if (existing === undefined || record.occurredAt > existing.occurredAt) {
      newest.set(record.milestoneId, record);
    }
  }

  return [...newest.values()].map((record) => ({
    milestoneId: record.milestoneId,
    text: milestoneText(record.milestoneId) ?? record.milestoneId,
    status: record.status,
    checklistSource: record.checklistSource,
    checklistVersion: record.checklistVersion,
    at: record.occurredAt,
    ageDays: 0,
  }));
}

export function assessFatherhood(
  records: readonly CanonicalRecord[],
  now: Date,
  enabled = true,
): FatherhoodEvidence {
  const observations = currentObservations(records);
  const byAttribute = (attribute: string): ObservationRecord[] =>
    observations
      .filter((observation) => observation.attribute === attribute)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  /* --- personal skills --------------------------------------------------- */

  const skills: SkillReading[] = [];
  for (const skill of TRACKED_SKILLS) {
    const readings = byAttribute(skillAttribute(skill.id));
    const latest = readings[0];
    if (latest === undefined) continue;
    const level = levelFromLabel(stateText(latest) ?? '');
    if (level === undefined) continue;

    const previousReading = readings[1];
    const previous =
      previousReading === undefined
        ? undefined
        : levelFromLabel(stateText(previousReading) ?? '');

    skills.push({
      skillId: skill.id,
      label: skill.label,
      level,
      levelLabel: SKILL_LEVEL_LABELS[level],
      at: latest.occurredAt,
      previous,
    });
  }
  skills.sort((a, b) => b.at.localeCompare(a.at));

  /*
   * Counted against the **current age band**, not the whole map.
   *
   * Prompt 8D.2 grew the map from six skills to twenty-seven. Saying "twenty-four
   * tracked skills have no reading" would be true, useless, and would read like a
   * backlog — which is exactly what a learning map must not become. What is worth
   * saying is how much of what is relevant *now* has nothing recorded.
   */
  const touched = new Set(skills.map((skill) => skill.skillId));
  const { band } = currentAgeBand(records);
  const untouchedSkills = skillsForBand(band)
    .filter((skill) => !touched.has(skill.id))
    .map((skill) => SKILL_LABELS[skill.id] ?? skill.id);

  /* --- official milestones ------------------------------------------------ */

  const milestones = currentMilestones(records)
    .map((reading) => ({
      ...reading,
      ageDays: Math.floor((now.getTime() - Date.parse(reading.at)) / DAY_MS),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));

  const openConcerns = milestones.filter(
    (reading) => reading.status === 'concern' || reading.status === 'possible-loss',
  );
  const persistentConcern = openConcerns.find(
    (reading) => reading.ageDays >= CONCERN_PERSISTENCE_DAYS,
  );

  const concernAnswer = byAttribute('father:concern-still-present')[0];
  const concernState = concernAnswer === undefined ? undefined : stateText(concernAnswer);
  const concernStillPresent =
    concernState === 'Yes' ? true : concernState === 'No' ? false : undefined;

  /* --- what the father did ------------------------------------------------ */

  const together = byAttribute('father:together')[0];
  const togetherFollowUps = byAttribute('father:together-happened');
  const lastTogetherAt = [together, togetherFollowUps[0]]
    .flatMap((record) => (record === undefined ? [] : [record.occurredAt]))
    .sort()
    .at(-1);

  const lessons = byAttribute('father:lesson-happened');
  const lessonsThatHappened = lessons.filter(
    (record) => stateText(record) === 'Yes' || stateText(record) === 'Started but stopped',
  ).length;

  const momentsCaptured = observations
    .filter((record) => isCapture(record) && captureDomain(record) === 'fatherhood')
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  const nameRecord = byAttribute('father:display-name')[0];
  const displayName = nameRecord === undefined ? undefined : noteText(nameRecord);

  return {
    enabled,
    anyEvidence:
      skills.length > 0 ||
      milestones.length > 0 ||
      momentsCaptured.length > 0 ||
      lastTogetherAt !== undefined,
    skills,
    milestones,
    openConcerns,
    persistentConcern,
    concernStillPresent,
    momentsCaptured,
    lastTogetherAt,
    togetherFreshness:
      lastTogetherAt === undefined
        ? 'none'
        : assessFreshness(lastTogetherAt, now, TOGETHER_FRESH_MS).status,
    lessonsStarted: lessons.length,
    lessonsThatHappened,
    untouchedSkills,
    displayName,
  };
}

/**
 * How this domain refers to the child.
 *
 * The owner may set a private display name; without one the domain says "your
 * daughter". No name is ever written into source, fixtures, or tests — the field
 * exists, and only the owner's own device ever holds a value for it.
 */
export function childReference(evidence: FatherhoodEvidence): string {
  return evidence.displayName ?? 'your daughter';
}
