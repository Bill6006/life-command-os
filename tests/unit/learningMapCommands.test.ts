import { beforeEach, describe, expect, it } from 'vitest';
import { listAllRecords } from '../../src/application/queries/readRecords';
import {
  recordSkillEvidence,
  respondToProgression,
  setAgeBand,
  setSkillLevel,
} from '../../src/application/commands/fatherhood';
import { setDomainState } from '../../src/application/commands/domainPreference';
import { AGE_BAND_ATTRIBUTE, skillAttribute } from '../../src/domain/fatherhood/development';
import {
  allMapSkills,
  buildLearningMap,
  mapSkill,
} from '../../src/intelligence/domains/fatherhood/learningMap';
import { runEpisode } from '../../src/intelligence';
import { resetDatabase } from '../support/database';
import { required } from '../support/required';
import type { CanonicalRecord } from '../../src/domain/records';

/**
 * The learning map through real storage.
 *
 * Everything here goes back to IndexedDB rather than trusting a return value, because
 * the questions are about durability: did approving actually move it, did declining
 * actually write nothing, did changing the age band actually keep the history.
 */

const NOW = new Date('2026-08-04T18:00:00.000Z');
const EARLIER = new Date('2026-07-20T17:00:00.000Z');
const MIDDLE = new Date('2026-07-24T17:00:00.000Z');
const LATER = new Date('2026-07-29T17:00:00.000Z');

async function stored(): Promise<readonly CanonicalRecord[]> {
  return listAllRecords();
}

function attributesOf(records: readonly CanonicalRecord[]): string[] {
  return records.flatMap((record) => ('attribute' in record ? [record.attribute] : []));
}

/** Three qualifying occasions across three days, the minimum a suggestion needs. */
async function threeOccasions(skillId: string): Promise<void> {
  for (const at of [EARLIER, MIDDLE, LATER]) {
    await recordSkillEvidence({ skillId, level: 'doing-sometimes' }, at);
  }
}

beforeEach(async () => {
  await resetDatabase();
});

describe('updating one skill', () => {
  it('writes one level record and touches nothing else', async () => {
    await setSkillLevel({ skillId: 'taking-turns', level: 'needs-support' }, NOW);

    const records = await stored();
    expect(records).toHaveLength(1);

    const record = required(records[0], 'the record');
    expect('attribute' in record ? record.attribute : '').toBe(skillAttribute('taking-turns'));
    expect(record.privacy).toBe('child');
  });

  it('lets the owner update one item without answering for any other', async () => {
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-often' }, NOW);

    const map = buildLearningMap(await stored(), NOW);
    const touched = allMapSkills(map).filter((skill) => skill.level !== undefined);

    expect(touched).toHaveLength(1);
    expect(required(touched[0], 'the skill').skillId).toBe('taking-turns');
    // Every other relevant skill is still there, still blank, and not a failure.
    expect(map.visibleSkillCount).toBeGreaterThan(1);
  });

  it('keeps an optional note beside the level, and writes none when it is blank', async () => {
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-often', note: '   ' }, NOW);
    expect(await stored()).toHaveLength(1);

    await setSkillLevel(
      { skillId: 'naming-feelings', level: 'needs-support', note: 'Said it before I did' },
      NOW,
    );
    const attributes = attributesOf(await stored());
    expect(attributes).toContain('father:skill-note:naming-feelings');
  });

  it('appends rather than replacing, so progress keeps its shape', async () => {
    await setSkillLevel({ skillId: 'taking-turns', level: 'needs-support' }, EARLIER);
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-sometimes' }, NOW);

    const records = await stored();
    expect(records).toHaveLength(2);
    for (const record of records) expect(record.supersedesRecordId).toBeUndefined();

    const skill = required(mapSkill(buildLearningMap(records, NOW), 'taking-turns'), 'skill');
    expect(skill.level).toBe('doing-sometimes');
  });
});

describe('a progression only moves when the owner approves it', () => {
  async function withSuggestion(): Promise<readonly CanonicalRecord[]> {
    await setSkillLevel({ skillId: 'taking-turns', level: 'needs-support' }, EARLIER);
    await threeOccasions('taking-turns');
    return stored();
  }

  it('offers one, and changes nothing by existing', async () => {
    const records = await withSuggestion();
    const skill = required(mapSkill(buildLearningMap(records, NOW), 'taking-turns'), 'skill');

    expect(skill.progression.kind).toBe('suggested');
    expect(skill.level).toBe('needs-support');
    // Four records: one level, three occasions. Nothing was applied.
    expect(records).toHaveLength(4);
  });

  it('applies exactly one rung on approval, citing what it rests on', async () => {
    const records = await withSuggestion();
    const skill = required(mapSkill(buildLearningMap(records, NOW), 'taking-turns'), 'skill');
    if (skill.progression.kind !== 'suggested') throw new Error('expected a suggestion');

    const result = await respondToProgression(
      {
        skillId: 'taking-turns',
        response: 'approve',
        to: skill.progression.to,
        supportingRecordIds: skill.progression.supporting.map((item) => item.recordId),
      },
      NOW,
    );
    expect(result?.ok).toBe(true);

    const after = required(
      mapSkill(buildLearningMap(await stored(), NOW), 'taking-turns'),
      'skill',
    );
    expect(after.level).toBe('doing-sometimes');

    // The new level says what it rests on.
    const applied = (await stored()).find(
      (record) =>
        'attribute' in record &&
        record.attribute === skillAttribute('taking-turns') &&
        record.provenance.method === 'direct-report' &&
        (record.provenance.derivedFromRecordIds ?? []).length === 3,
    );
    expect(applied).toBeDefined();
  });

  for (const response of ['keep-current-level', 'review-evidence', 'not-now'] as const) {
    it(`writes nothing at all for "${response}"`, async () => {
      const before = await withSuggestion();

      const result = await respondToProgression(
        {
          skillId: 'taking-turns',
          response,
          to: 'doing-sometimes',
          supportingRecordIds: [],
        },
        NOW,
      );

      expect(result).toBeUndefined();
      const after = await stored();
      expect(after).toHaveLength(before.length);

      // And the level is untouched — declining is not evidence about the child.
      const skill = required(mapSkill(buildLearningMap(after, NOW), 'taking-turns'), 'skill');
      expect(skill.level).toBe('needs-support');
    });
  }

  it('has no command that lowers a level on the app’s own initiative', async () => {
    // The only writer of a level takes one from the caller. There is no "recalculate",
    // no "downgrade", and no path from a low observation to a stored level.
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-often' }, EARLIER);
    for (const at of [MIDDLE, LATER, NOW]) {
      await recordSkillEvidence({ skillId: 'taking-turns', level: 'needs-support' }, at);
    }

    const skill = required(
      mapSkill(buildLearningMap(await stored(), NOW), 'taking-turns'),
      'skill',
    );
    expect(skill.level).toBe('doing-often');
    expect(skill.progression.kind).toBe('none');
  });
});

describe('changing the age band', () => {
  it('records the choice and keeps the earlier one', async () => {
    await setAgeBand('around-18-24-months', EARLIER);
    await setAgeBand('around-3-4-years', NOW);

    const bands = (await stored()).filter(
      (record) => 'attribute' in record && record.attribute === AGE_BAND_ATTRIBUTE,
    );
    expect(bands).toHaveLength(2);
    expect(buildLearningMap(await stored(), NOW).ageBand).toBe('around-3-4-years');
  });

  it('introduces new skills while every prior observation survives', async () => {
    await setAgeBand('around-12-18-months', EARLIER);
    await setSkillLevel({ skillId: 'using-a-spoon', level: 'doing-often' }, EARLIER);
    await recordSkillEvidence({ skillId: 'using-a-spoon', level: 'doing-often' }, MIDDLE);

    const before = buildLearningMap(await stored(), NOW);
    const beforeIds = new Set(allMapSkills(before).map((skill) => skill.skillId));
    const countBefore = (await stored()).length;

    await setAgeBand('around-4-5-years', NOW);
    const after = buildLearningMap(await stored(), NOW);

    // Nothing was removed from storage — one record was added, the decision itself.
    expect((await stored()).length).toBe(countBefore + 1);

    // New skills appeared.
    const introduced = allMapSkills(after)
      .map((skill) => skill.skillId)
      .filter((id) => !beforeIds.has(id));
    expect(introduced.length).toBeGreaterThan(0);

    // And the skill that left the band kept everything it had.
    const kept = required(mapSkill(after, 'using-a-spoon'), 'the retained skill');
    expect(kept.historical).toBe(true);
    expect(kept.level).toBe('doing-often');
    expect(kept.evidenceCount).toBe(1);
  });
});

describe('the map survives being switched off', () => {
  it('keeps every record when the area is disabled and shows them again after', async () => {
    await setDomainState([], { domainId: 'fatherhood', state: 'enabled' }, EARLIER);
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-often' }, EARLIER);
    await threeOccasions('taking-turns');

    const before = await stored();
    expect(runEpisode(before, NOW).domains).toHaveLength(1);

    await setDomainState(before, { domainId: 'fatherhood', state: 'disabled' }, NOW);
    const off = await stored();
    expect(runEpisode(off, NOW).domains).toEqual([]);
    // One record more: the decision. Nothing removed.
    expect(off).toHaveLength(before.length + 1);

    await setDomainState(off, { domainId: 'fatherhood', state: 'enabled' }, NOW);
    const back = buildLearningMap(await stored(), NOW);
    const skill = required(mapSkill(back, 'taking-turns'), 'the skill');
    expect(skill.level).toBe('doing-often');
    expect(skill.evidenceCount).toBe(3);
  });

  it('leaves Now exactly as compact as it was', async () => {
    const empty = runEpisode([], NOW);

    await setDomainState([], { domainId: 'fatherhood', state: 'enabled' }, EARLIER);
    await setSkillLevel({ skillId: 'taking-turns', level: 'doing-often' }, EARLIER);
    await threeOccasions('taking-turns');

    const after = runEpisode(await stored(), NOW);
    expect(after.categories.length).toBe(empty.categories.length);
    // A domain move never becomes a second answer on Now.
    expect(after.domains).toHaveLength(1);
  });
});
