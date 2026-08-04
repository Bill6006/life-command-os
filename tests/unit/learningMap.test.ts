import { beforeEach, describe, expect, it } from 'vitest';
import {
  AGE_BANDS,
  AGE_BAND_ATTRIBUTE,
  AGE_BAND_LABELS,
  DEFAULT_AGE_BAND,
  LEARNING_SECTIONS,
  SECTION_LABELS,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TRACKED_SKILLS,
  skillAttribute,
  skillEvidenceAttribute,
  skillsForBand,
  type AgeBand,
  type SkillLevel,
} from '../../src/domain/fatherhood/development';
import {
  MINIMUM_OBSERVATIONS,
  MINIMUM_OCCASIONS,
  PROGRESSION_RESPONSES,
  appliesProgression,
  nextRung,
  suggestProgression,
  type ProgressionEvidence,
} from '../../src/domain/fatherhood/progression';
import {
  allMapSkills,
  buildLearningMap,
  currentAgeBand,
  mapSkill,
} from '../../src/intelligence/domains/fatherhood/learningMap';
import { routeFatherhoodAnswers } from '../../src/domain/fatherhood/routing';
import { FATHERHOOD_CAPTURES } from '../../src/domain/fatherhood/capture';
import { FATHERHOOD_PROMPTS } from '../../src/domain/prompts/definitions';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';
import type { CanonicalRecord } from '../../src/domain/records';

/**
 * Prompt 8D.2 gate: the Child Development and Learning Map.
 *
 * The bridge that turns Update This Area into something a father can scan in a minute.
 * The assertions that matter most are the ones about restraint: nothing moves without
 * him, nothing is ever removed, and no number describes his daughter.
 */

const NOW = new Date('2026-08-04T18:00:00.000Z');

function skillReading(skillId: string, level: SkillLevel, occurredAt: string): CanonicalRecord {
  return anObservation({
    attribute: skillAttribute(skillId),
    category: 'fatherhood-and-child',
    privacy: 'child',
    value: { kind: 'state', state: SKILL_LEVEL_LABELS[level] },
    occurredAt,
    recordedAt: occurredAt,
  } as never);
}

function evidence(skillId: string, level: SkillLevel, occurredAt: string): CanonicalRecord {
  return anObservation({
    attribute: skillEvidenceAttribute(skillId),
    category: 'fatherhood-and-child',
    privacy: 'child',
    value: { kind: 'state', state: SKILL_LEVEL_LABELS[level] },
    occurredAt,
    recordedAt: occurredAt,
  } as never);
}

function bandRecord(band: AgeBand, occurredAt = '2026-08-01T09:00:00.000Z'): CanonicalRecord {
  return anObservation({
    attribute: AGE_BAND_ATTRIBUTE,
    category: 'fatherhood-and-child',
    privacy: 'child',
    value: { kind: 'state', state: AGE_BAND_LABELS[band] },
    occurredAt,
    recordedAt: occurredAt,
  } as never);
}

/** Three qualifying occasions across three separate days. */
function threeGoodOccasions(skillId: string, level: SkillLevel): CanonicalRecord[] {
  return [
    evidence(skillId, level, '2026-07-20T17:00:00.000Z'),
    evidence(skillId, level, '2026-07-24T17:00:00.000Z'),
    evidence(skillId, level, '2026-07-29T17:00:00.000Z'),
  ];
}

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('the map is complete and scannable', () => {
  it('renders all six sections, always', () => {
    expect([...LEARNING_SECTIONS]).toEqual([
      'language-and-early-reading',
      'numbers-and-thinking',
      'motor-skills',
      'social-and-emotional',
      'independence-and-practical-life',
      'creativity-and-play',
    ]);

    const map = buildLearningMap([], NOW);
    expect(map.sections).toHaveLength(6);
    for (const section of map.sections) {
      expect(section.label, section.section).toBe(SECTION_LABELS[section.section]);
    }
  });

  it('shows every currently relevant skill together, on one page', () => {
    const map = buildLearningMap([bandRecord('around-2-3-years')], NOW);
    const shown = new Set(allMapSkills(map).map((skill) => skill.skillId));

    for (const skill of skillsForBand('around-2-3-years')) {
      expect(shown.has(skill.id), skill.id).toBe(true);
    }
    expect(map.visibleSkillCount).toBe(skillsForBand('around-2-3-years').length);
  });

  it('spreads the map across every section and band', () => {
    for (const section of LEARNING_SECTIONS) {
      expect(
        TRACKED_SKILLS.filter((skill) => skill.section === section).length,
        section,
      ).toBeGreaterThan(0);
    }
    for (const band of AGE_BANDS) {
      expect(skillsForBand(band).length, band).toBeGreaterThan(0);
    }
  });

  it('gives every skill a source and a version', () => {
    for (const skill of TRACKED_SKILLS) {
      expect(skill.source, skill.id).toBe('General guidance (built in)');
      expect(skill.sourceVersion, skill.id).toBe('2026-08');
      expect(skill.ageBands.length, skill.id).toBeGreaterThan(0);
    }
  });

  it('keeps the six original skill ids, because records already reference them', () => {
    const ids = new Set(TRACKED_SKILLS.map((skill) => skill.id));
    for (const original of [
      'asking-for-help',
      'putting-things-away',
      'taking-turns',
      'getting-dressed',
      'naming-feelings',
      'waiting-a-moment',
    ]) {
      expect(ids.has(original), original).toBe(true);
    }
  });

  it('stays quiet unless something actually needs attention', () => {
    // A fresh map highlights only what is newly relevant — never every row.
    const busy = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        skillReading('taking-turns', 'doing-sometimes', '2026-08-03T17:00:00.000Z'),
      ],
      NOW,
    );

    const settled = required(mapSkill(busy, 'taking-turns'), 'the skill');
    expect(settled.highlights).toEqual([]);
    expect(busy.highlightedCount).toBeLessThan(busy.visibleSkillCount);
  });

  it('marks stale and recently changed distinctly', () => {
    const map = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        // Recorded long ago: stale.
        skillReading('naming-feelings', 'needs-support', '2026-01-05T17:00:00.000Z'),
        // Two readings, the newer one recent: recently changed.
        skillReading('taking-turns', 'needs-support', '2026-06-01T17:00:00.000Z'),
        skillReading('taking-turns', 'doing-sometimes', '2026-08-01T17:00:00.000Z'),
      ],
      NOW,
    );

    expect(required(mapSkill(map, 'naming-feelings'), 'stale').highlights).toContain('stale');
    expect(required(mapSkill(map, 'taking-turns'), 'changed').highlights).toContain(
      'recently-changed',
    );
  });

  it('marks nothing as new on a first visit', () => {
    /*
     * Found on the deployed build: every relevant skill starts with nothing recorded, so
     * treating "untouched" as "new" lit up fifteen of sixteen rows. A page where
     * everything is emphasised is a page where nothing is.
     */
    const first = buildLearningMap([bandRecord('around-2-3-years')], NOW);
    expect(first.highlightedCount).toBe(0);
    for (const skill of allMapSkills(first)) {
      expect(skill.highlights, skill.skillId).toEqual([]);
    }
  });

  it('marks a skill new only when a band change brought it in', () => {
    const moved = buildLearningMap(
      [
        bandRecord('around-2-3-years', '2026-01-01T09:00:00.000Z'),
        bandRecord('around-4-5-years', '2026-08-01T09:00:00.000Z'),
      ],
      NOW,
    );

    // Arrived with the new band.
    expect(required(mapSkill(moved, 'recognises-own-name'), 'new').highlights).toContain(
      'newly-relevant',
    );
    // Was already relevant before the change, so it is not news.
    expect(mapSkill(moved, 'counting-objects')?.highlights ?? []).not.toContain(
      'newly-relevant',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('age bands add without removing', () => {
  it('needs no birth date, and defaults until the owner chooses', () => {
    const untouched = currentAgeBand([]);
    expect(untouched.band).toBe(DEFAULT_AGE_BAND);
    expect(untouched.chosen).toBe(false);

    const chosen = currentAgeBand([bandRecord('around-3-4-years')]);
    expect(chosen.band).toBe('around-3-4-years');
    expect(chosen.chosen).toBe(true);

    // Nothing anywhere stores a date of birth.
    expect(JSON.stringify(TRACKED_SKILLS)).not.toMatch(/birth|dob|born/i);
  });

  it('brings new skills into view when the band moves on', () => {
    const before = buildLearningMap([bandRecord('around-18-24-months')], NOW);
    const after = buildLearningMap(
      [
        bandRecord('around-18-24-months', '2026-06-01T09:00:00.000Z'),
        bandRecord('around-3-4-years', '2026-08-01T09:00:00.000Z'),
      ],
      NOW,
    );

    const beforeIds = new Set(allMapSkills(before).map((skill) => skill.skillId));
    const afterIds = new Set(allMapSkills(after).map((skill) => skill.skillId));

    const introduced = [...afterIds].filter((id) => !beforeIds.has(id));
    expect(introduced.length).toBeGreaterThan(0);
  });

  it('keeps every earlier observation, and marks the skill historical rather than gone', () => {
    const records = [
      bandRecord('around-12-18-months', '2026-01-01T09:00:00.000Z'),
      skillReading('using-a-spoon', 'doing-often', '2026-02-01T17:00:00.000Z'),
      ...threeGoodOccasions('using-a-spoon', 'doing-often'),
      bandRecord('around-4-5-years', '2026-08-01T09:00:00.000Z'),
    ];

    const map = buildLearningMap(records, NOW);
    const kept = required(mapSkill(map, 'using-a-spoon'), 'the retained skill');

    // Out of band, still on the map, still carrying everything.
    expect(kept.currentlyRelevant).toBe(false);
    expect(kept.historical).toBe(true);
    expect(kept.level).toBe('doing-often');
    expect(kept.evidenceCount).toBe(3);
  });

  it('never marks an out-of-band skill as failed or missing', () => {
    const map = buildLearningMap(
      [
        bandRecord('around-4-5-years'),
        skillReading('stacking', 'uses-on-her-own', '2026-02-01T17:00:00.000Z'),
      ],
      NOW,
    );
    const kept = required(mapSkill(map, 'stacking'), 'the retained skill');

    expect(kept.highlights).not.toContain('stale');
    expect(JSON.stringify(kept).toLowerCase()).not.toMatch(/fail|missing|behind|lost/);
  });
});

/* -------------------------------------------------------------------------- */

describe('a progression is suggested, never applied', () => {
  const evidenceAt = (level: SkillLevel, occurredAt: string): ProgressionEvidence => ({
    recordId: `id-${occurredAt}`,
    level,
    occurredAt,
    note: undefined,
  });

  it('needs three qualifying observations across two occasions', () => {
    expect(MINIMUM_OBSERVATIONS).toBe(3);
    expect(MINIMUM_OCCASIONS).toBe(2);

    const outcome = suggestProgression('needs-support', [
      evidenceAt('doing-sometimes', '2026-07-20T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-24T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-29T10:00:00.000Z'),
    ]);

    expect(outcome.kind).toBe('suggested');
    if (outcome.kind === 'suggested') {
      expect(outcome.from).toBe('needs-support');
      expect(outcome.to).toBe('doing-sometimes');
      expect(outcome.supporting).toHaveLength(3);
      expect(outcome.occasions).toBe(3);
      expect(outcome.because).toMatch(/nothing changes unless you say so/i);
    }
  });

  it('refuses on two observations', () => {
    const outcome = suggestProgression('needs-support', [
      evidenceAt('doing-sometimes', '2026-07-20T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-24T10:00:00.000Z'),
    ]);
    expect(outcome.kind).toBe('none');
  });

  it('refuses three observations from a single day', () => {
    // One bath-time described three times is one occasion, and the easiest way to fool
    // yourself into thinking something changed.
    const outcome = suggestProgression('needs-support', [
      evidenceAt('doing-sometimes', '2026-07-20T09:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-20T12:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-20T18:00:00.000Z'),
    ]);
    expect(outcome.kind).toBe('none');
    if (outcome.kind === 'none') expect(outcome.because).toMatch(/1 occasion/);
  });

  it('advances at most one rung, however strong the evidence', () => {
    const outcome = suggestProgression('exposed-through-play', [
      evidenceAt('uses-on-her-own', '2026-07-20T10:00:00.000Z'),
      evidenceAt('uses-on-her-own', '2026-07-24T10:00:00.000Z'),
      evidenceAt('uses-on-her-own', '2026-07-29T10:00:00.000Z'),
    ]);

    expect(outcome.kind).toBe('suggested');
    if (outcome.kind === 'suggested') expect(outcome.to).toBe('practising-with-daddy');
  });

  it('withholds the suggestion when the newest occasion disagrees', () => {
    const outcome = suggestProgression('needs-support', [
      evidenceAt('doing-sometimes', '2026-07-20T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-24T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-29T10:00:00.000Z'),
      evidenceAt('practising-with-daddy', '2026-08-02T10:00:00.000Z'),
    ]);

    expect(outcome.kind).toBe('conflicting');
    if (outcome.kind === 'conflicting') {
      expect(outcome.because).toMatch(/Worth a look rather than a change/);
      // And it names what disagreed rather than hiding it.
      expect(outcome.contradicting.level).toBe('practising-with-daddy');
    }
  });

  it('cites the records it rests on', () => {
    const outcome = suggestProgression('needs-support', [
      evidenceAt('doing-sometimes', '2026-07-20T10:00:00.000Z'),
      evidenceAt('doing-often', '2026-07-24T10:00:00.000Z'),
      evidenceAt('doing-sometimes', '2026-07-29T10:00:00.000Z'),
    ]);
    if (outcome.kind !== 'suggested') throw new Error('expected a suggestion');
    expect(outcome.supporting.map((item) => item.recordId)).toHaveLength(3);
  });

  it('has nothing to offer at the top of the ladder', () => {
    expect(nextRung('uses-on-her-own')).toBeUndefined();
    const outcome = suggestProgression(
      'uses-on-her-own',
      [1, 2, 3].map((day) =>
        evidenceAt('uses-on-her-own', `2026-07-2${String(day)}T10:00:00.000Z`),
      ),
    );
    expect(outcome.kind).toBe('none');
  });

  it('offers four responses, exactly one of which changes anything', () => {
    expect([...PROGRESSION_RESPONSES]).toEqual([
      'approve',
      'keep-current-level',
      'review-evidence',
      'not-now',
    ]);
    expect(PROGRESSION_RESPONSES.filter(appliesProgression)).toEqual(['approve']);
  });

  it('never suggests going down, whatever is recorded', () => {
    // A lower observation is real evidence and is kept. It is never a downgrade.
    const outcome = suggestProgression('doing-often', [
      evidenceAt('needs-support', '2026-07-20T10:00:00.000Z'),
      evidenceAt('needs-support', '2026-07-24T10:00:00.000Z'),
      evidenceAt('needs-support', '2026-07-29T10:00:00.000Z'),
    ]);

    expect(outcome.kind).toBe('none');
    expect(JSON.stringify(outcome)).not.toMatch(/downgrade|lower|regress/i);
  });

  it('surfaces on the map only when the rule is met', () => {
    const withEnough = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        skillReading('taking-turns', 'needs-support', '2026-07-01T17:00:00.000Z'),
        ...threeGoodOccasions('taking-turns', 'doing-sometimes'),
      ],
      NOW,
    );
    const suggested = required(mapSkill(withEnough, 'taking-turns'), 'the skill');
    expect(suggested.progression.kind).toBe('suggested');
    expect(suggested.highlights).toContain('possible-progression');

    const withOne = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        skillReading('taking-turns', 'needs-support', '2026-07-01T17:00:00.000Z'),
        evidence('taking-turns', 'doing-sometimes', '2026-07-20T17:00:00.000Z'),
      ],
      NOW,
    );
    expect(required(mapSkill(withOne, 'taking-turns'), 'the skill').progression.kind).toBe(
      'none',
    );
  });

  it('leaves the stored level untouched until approval', () => {
    const records = [
      bandRecord('around-2-3-years'),
      skillReading('taking-turns', 'needs-support', '2026-07-01T17:00:00.000Z'),
      ...threeGoodOccasions('taking-turns', 'doing-sometimes'),
    ];
    const skill = required(mapSkill(buildLearningMap(records, NOW), 'taking-turns'), 'skill');

    // The suggestion exists; the level has not moved.
    expect(skill.progression.kind).toBe('suggested');
    expect(skill.level).toBe('needs-support');
  });
});

/* -------------------------------------------------------------------------- */

describe('one canonical record, whichever surface it came from', () => {
  it('writes skill evidence to the same attribute from the guided flow', () => {
    const routed = routeFatherhoodAnswers([
      { promptId: 'father:skill', text: 'Taking turns in a game' },
      { promptId: 'father:skill-evidence', text: 'Doing sometimes' },
    ]);

    expect(routed.skillEvidence).toEqual({
      attribute: skillEvidenceAttribute('taking-turns'),
      state: 'Doing sometimes',
    });
    expect(routed.consumedPromptIds).toContain('father:skill-evidence');
  });

  it('keeps a declared level and an occasion apart', () => {
    const routed = routeFatherhoodAnswers([
      { promptId: 'father:skill', text: 'Taking turns in a game' },
      { promptId: 'father:skill-level', text: 'Doing often' },
      { promptId: 'father:skill-evidence', text: 'Doing sometimes' },
    ]);

    expect(required(routed.skillReading, 'level').attribute).toBe(
      skillAttribute('taking-turns'),
    );
    expect(required(routed.skillEvidence, 'evidence').attribute).toBe(
      skillEvidenceAttribute('taking-turns'),
    );
    expect(routed.skillReading?.attribute).not.toBe(routed.skillEvidence?.attribute);
  });

  it('lets a Tiny Lesson contribute evidence without declaring mastery', () => {
    // One lesson is one occasion. Three across separate days is what a suggestion needs,
    // and even then it is a suggestion.
    const oneLesson = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        skillReading('taking-turns', 'needs-support', '2026-07-01T17:00:00.000Z'),
        evidence('taking-turns', 'uses-on-her-own', '2026-07-20T17:00:00.000Z'),
      ],
      NOW,
    );

    const skill = required(mapSkill(oneLesson, 'taking-turns'), 'the skill');
    expect(skill.level).toBe('needs-support');
    expect(skill.progression.kind).toBe('none');
  });

  it('declares the evidence capture in the contextual-capture metadata', () => {
    const declared = required(
      FATHERHOOD_CAPTURES.find((capture) => capture.id === 'father:skill-evidence'),
      'the declaration',
    );
    expect(declared.recordFamily).toBe('observation');
    expect(declared.privacy).toBe('child');
    expect(declared.excludedContexts).toContain('work-focus');
    expect(declared.promptId).toBe('father:skill-evidence');
  });
});

/* -------------------------------------------------------------------------- */

describe('what the map refuses to be', () => {
  it('has no grade, score, percentage, ranking, or comparison anywhere in it', () => {
    const map = buildLearningMap(
      [
        bandRecord('around-2-3-years'),
        skillReading('taking-turns', 'doing-often', '2026-08-01T17:00:00.000Z'),
        ...threeGoodOccasions('taking-turns', 'uses-on-her-own'),
      ],
      NOW,
    );

    const text = JSON.stringify(map).toLowerCase();
    for (const forbidden of [
      'percentile',
      'score',
      'grade',
      'rank',
      'average',
      'compared',
      'ahead of',
      'behind other',
      'out of 100',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    expect(text).not.toMatch(/\d{1,3}%/);
  });

  it('exposes only counts of things, never a rating of her', () => {
    const map = buildLearningMap([bandRecord('around-2-3-years')], NOW);
    // Two numbers, both about the page rather than about the child.
    expect(typeof map.visibleSkillCount).toBe('number');
    expect(typeof map.highlightedCount).toBe('number');

    for (const skill of allMapSkills(map)) {
      for (const [key, value] of Object.entries(skill)) {
        if (key === 'evidenceCount') continue;
        expect(typeof value, `${skill.skillId}.${key}`).not.toBe('number');
      }
    }
  });

  it('keeps official milestones out of the personal map entirely', () => {
    const map = buildLearningMap([bandRecord('around-2-3-years')], NOW);
    const text = JSON.stringify(map).toLowerCase();

    expect(text).not.toContain('milestone');
    expect(text).not.toContain('checklist');
    for (const skill of allMapSkills(map)) {
      expect(SKILL_LEVELS.includes(skill.level ?? 'not-introduced'), skill.skillId).toBe(true);
    }
  });

  it('never asks for a cause, a feeling, or whether something worked', () => {
    for (const prompt of FATHERHOOD_PROMPTS) {
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwhy\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bfeel\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwork(ed)?\b/i);
    }
  });

  it('keeps sensitive milestone statuses out of the ordinary guides', () => {
    for (const kind of ['morning', 'afternoon', 'evening', 'quick-check-in'] as const) {
      const ids = planGuide(kind, 'full', [], NOW).steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );
      expect(ids, kind).not.toContain('father:milestone-status');
      expect(ids, kind).not.toContain('father:concern-still-present');
      for (const id of ids) expect(id.startsWith('father:'), `${kind}: ${id}`).toBe(false);
    }
  });
});
