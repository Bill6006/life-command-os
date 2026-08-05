import { beforeEach, describe, expect, it } from 'vitest';
import { listAllRecords, listCurrentRecords } from '../../src/application/queries/readRecords';
import { writeRecords } from '../../src/application/commands/writeRecord';
import {
  currentPreference,
  setDomainState,
} from '../../src/application/commands/domainPreference';
import { runEpisode } from '../../src/intelligence';
import { resolveDomains } from '../../src/intelligence/domains/registry';
import { scenarioById, shiftScenario } from '../../src/app/scenarios';
import { resetDatabase } from '../support/database';
import { required } from '../support/required';
import type { CanonicalRecord, DomainPreferenceRecord } from '../../src/domain/records';

/**
 * Manage Areas: the control that made two finished slices reachable.
 *
 * Everything here goes back to storage rather than trusting what a command returned.
 * The question is not "did it build a record" — it is "is the area still on after a
 * reload, and is there exactly one record saying so".
 */

const NOW = new Date('2026-03-09T10:00:00.000Z');

async function seed(scenarioId: string): Promise<readonly CanonicalRecord[]> {
  const scenario = shiftScenario(scenarioById(scenarioId), NOW);
  const results = await writeRecords(scenario.records);
  expect(results.filter((result) => !result.ok).flatMap((f) => f.issues)).toEqual([]);
  return listAllRecords();
}

function preferences(records: readonly CanonicalRecord[]): DomainPreferenceRecord[] {
  return records.filter(
    (record): record is DomainPreferenceRecord => record.recordType === 'domain-preference',
  );
}

beforeEach(async () => {
  await resetDatabase();
});

describe('switching an area on', () => {
  it('writes a canonical record that is there after a reload', async () => {
    const records = await seed('areas-all-off');
    const result = await setDomainState(
      records,
      { domainId: 'career-and-learning', state: 'enabled' },
      NOW,
    );
    expect(result.ok).toBe(true);

    // Re-read from storage — not from the value the command returned.
    const stored = preferences(await listAllRecords());
    expect(stored).toHaveLength(1);
    const preference = required(stored[0], 'the preference');
    expect(preference.domainId).toBe('career-and-learning');
    expect(preference.state).toBe('enabled');
    expect(preference.source).toBe('user-entry');
    expect(preference.provenance.method).toBe('direct-report');
  });

  it('puts the panel on Direction, built from records that were already there', async () => {
    const before = await seed('areas-all-off');
    expect(runEpisode(before, NOW).domains).toEqual([]);

    await setDomainState(before, { domainId: 'career-and-learning', state: 'enabled' }, NOW);

    const after = await listAllRecords();
    const panels = runEpisode(after, NOW).domains;
    expect(panels).toHaveLength(1);
    expect(required(panels[0], 'the panel').domainId).toBe('career-and-learning');
  });

  it('refuses an area that has not been built, and writes nothing', async () => {
    const records = await seed('areas-all-off');
    const result = await setDomainState(records, { domainId: 'money', state: 'enabled' }, NOW);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.join(' ')).toMatch(/has not been built yet/);
      expect(result.issues.join(' ')).toMatch(/Nothing has been changed/);
    }
    expect(preferences(await listAllRecords())).toEqual([]);
  });

  it('refuses every unbuilt area, not just the one that was tried', async () => {
    const records = await seed('areas-all-off');
    for (const domainId of ['faith-and-meaning', 'home-and-environment', 'money'] as const) {
      expect((await setDomainState(records, { domainId, state: 'enabled' }, NOW)).ok).toBe(
        false,
      );
    }
    expect(preferences(await listAllRecords())).toEqual([]);
  });
});

describe('switching an area off', () => {
  it('hides the panel and deletes nothing', async () => {
    const seeded = await seed('career-proven-claim');
    const before = runEpisode(seeded, NOW);
    expect(before.domains.map((panel) => panel.domainId)).toContain('career-and-learning');
    const recordCountBefore = seeded.length;

    const result = await setDomainState(
      seeded,
      { domainId: 'career-and-learning', state: 'disabled' },
      NOW,
    );
    expect(result.ok).toBe(true);

    const after = await listAllRecords();
    expect(runEpisode(after, NOW).domains).toEqual([]);

    // Every record the area was reading is still there. Switching off appended one.
    expect(after).toHaveLength(recordCountBefore + 1);
    expect(after.filter((record) => record.recordType === 'skill-claim')).toHaveLength(1);
  });

  it('shows the same panel again when it is switched back on', async () => {
    const seeded = await seed('career-proven-claim');
    const evidenceBefore = required(
      runEpisode(seeded, NOW).domains[0],
      'the panel',
    ).strongestEvidence;

    await setDomainState(seeded, { domainId: 'career-and-learning', state: 'disabled' }, NOW);
    const off = await listAllRecords();
    await setDomainState(off, { domainId: 'career-and-learning', state: 'enabled' }, NOW);

    const back = required(runEpisode(await listAllRecords(), NOW).domains[0], 'the panel');
    expect(back.strongestEvidence).toEqual(evidenceBefore);
  });
});

describe('one preference per area, however many times it changes', () => {
  it('supersedes rather than accumulating', async () => {
    let records = await seed('areas-all-off');

    for (const state of ['enabled', 'disabled', 'enabled'] as const) {
      await setDomainState(records, { domainId: 'health-recovery-energy', state }, NOW);
      records = await listAllRecords();
    }

    // Three decisions are all on record.
    expect(preferences(records)).toHaveLength(3);

    // Exactly one of them is current. `listCurrentRecords` resolves supersession the
    // same way the engine does, so this is the number the rest of the app sees.
    const current = preferences(await listCurrentRecords()).filter(
      (record) => record.domainId === 'health-recovery-energy',
    );
    expect(current).toHaveLength(1);
    expect(required(current[0], 'the current preference').state).toBe('enabled');
  });

  it('links each decision to the one it replaced', async () => {
    const records = await seed('areas-all-off');
    const first = await setDomainState(
      records,
      { domainId: 'career-and-learning', state: 'enabled' },
      NOW,
    );
    expect(first.ok).toBe(true);

    const afterFirst = await listAllRecords();
    await setDomainState(
      afterFirst,
      { domainId: 'career-and-learning', state: 'disabled' },
      NOW,
    );

    const all = preferences(await listAllRecords());
    const second = required(
      all.find((record) => record.state === 'disabled'),
      'the second preference',
    );
    expect(second.supersedesRecordId).toBe(
      first.ok ? first.record.recordId : 'the first write failed',
    );
  });

  it('changes one area without disturbing another', async () => {
    let records = await seed('areas-all-off');
    await setDomainState(records, { domainId: 'career-and-learning', state: 'enabled' }, NOW);
    records = await listAllRecords();
    await setDomainState(
      records,
      { domainId: 'health-recovery-energy', state: 'enabled' },
      NOW,
    );
    records = await listAllRecords();
    await setDomainState(records, { domainId: 'career-and-learning', state: 'disabled' }, NOW);
    records = await listAllRecords();

    expect(required(currentPreference(records, 'career-and-learning'), 'career').state).toBe(
      'disabled',
    );
    expect(required(currentPreference(records, 'health-recovery-energy'), 'health').state).toBe(
      'enabled',
    );

    const states = new Map(
      resolveDomains(records).map((domain) => [domain.definition.id, domain.state]),
    );
    expect(states.get('career-and-learning')).toBe('disabled');
    expect(states.get('health-recovery-energy')).toBe('enabled');
  });

  it('reads the current preference through supersession, not by recency alone', async () => {
    const records = await seed('areas-all-off');
    expect(currentPreference(records, 'career-and-learning')).toBeUndefined();

    await setDomainState(records, { domainId: 'career-and-learning', state: 'enabled' }, NOW);
    const after = await listAllRecords();

    expect(
      required(currentPreference(after, 'career-and-learning'), 'the preference').state,
    ).toBe('enabled');
  });
});

describe('both built areas, together', () => {
  it('switches both on and shows two panels, each with its own question', async () => {
    let records = await seed('areas-all-off');
    for (const domainId of ['health-recovery-energy', 'career-and-learning'] as const) {
      await setDomainState(records, { domainId, state: 'enabled' }, NOW);
      records = await listAllRecords();
    }

    const panels = runEpisode(records, NOW).domains;
    expect(panels.map((panel) => panel.domainId)).toEqual([
      'health-recovery-energy',
      'career-and-learning',
    ]);
    expect(new Set(panels.map((panel) => panel.question)).size).toBe(2);
  });

  it('leaves Now alone no matter how many areas are on', async () => {
    let records = await seed('areas-all-off');
    const before = runEpisode(records, NOW);

    for (const domainId of ['health-recovery-energy', 'career-and-learning'] as const) {
      await setDomainState(records, { domainId, state: 'enabled' }, NOW);
      records = await listAllRecords();
    }

    const after = runEpisode(records, NOW);
    expect(after.output.kind).toBe(before.output.kind);
    // Domains offer into the same comparison; they never add a second answer.
    expect(after.categories).toHaveLength(before.categories.length);
  });
});
