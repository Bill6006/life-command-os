import { beforeEach, describe, expect, it } from 'vitest';
import { writeRecord, writeRecords } from '../../src/application/commands/writeRecord';
import {
  listAllRecords,
  listCurrentRecords,
  readSupersessionChain,
} from '../../src/application/queries/readRecords';
import {
  dropAllProjections,
  getProjection,
  rebuildAllProjections,
  type CategoryFreshness,
  type OpenCommitment,
} from '../../src/application/projections';
import { ENABLED_CATEGORIES } from '../../src/domain/records';
import { openDatabase } from '../../src/infrastructure/database/connection';
import { listProjectionNames } from '../../src/infrastructure/database/projectionStore';
import { resetDatabase } from '../support/database';
import {
  aCommitment,
  anObservation,
  anObservationCorrection,
  resetFixtureIds,
} from '../fixtures/records';

const NOW = new Date('2026-01-05T12:00:00.000Z');

beforeEach(async () => {
  resetFixtureIds();
  await resetDatabase();
});

describe('the write path', () => {
  it('validates before writing, and writes nothing when validation fails', async () => {
    const result = await writeRecord({ ...anObservation(), category: 'not-a-category' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('schema-violation');
    await expect(listAllRecords()).resolves.toEqual([]);
  });

  it('persists a valid record', async () => {
    const observation = anObservation();
    const result = await writeRecord(observation);

    expect(result.ok).toBe(true);
    const stored = await listAllRecords();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.recordId).toBe(observation.recordId);
  });

  it('refuses to overwrite an existing record', async () => {
    const observation = anObservation();
    await writeRecord(observation);

    // Append-oriented storage means immutability is enforced by the store itself,
    // not by asking writers to remember. A second write of the same id is rejected.
    const second = await writeRecord({ ...observation, attribute: 'tampered' });

    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('duplicate-record');

    const stored = await listAllRecords();
    expect(stored).toHaveLength(1);
    expect((stored[0] as { attribute: string }).attribute).toBe('available-minutes');
  });

  it('rejects a batch that would create a cycle, writing none of it', async () => {
    const first = anObservation();
    const second = anObservation();

    const results = await writeRecords([
      { ...first, supersedesRecordId: second.recordId },
      { ...second, supersedesRecordId: first.recordId },
    ]);

    expect(results.every((result) => !result.ok)).toBe(true);
    await expect(listAllRecords()).resolves.toEqual([]);
  });
});

/** Gate requirement: corrections preserve history. */
describe('corrections', () => {
  it('keeps the original readable and makes the correction current', async () => {
    const original = anObservation();
    await writeRecord(original);

    const correction = anObservationCorrection(original.recordId);
    await writeRecord(correction);

    const all = await listAllRecords();
    expect(all).toHaveLength(2);

    const current = await listCurrentRecords();
    expect(current.map((r) => r.recordId)).toEqual([correction.recordId]);

    const chain = await readSupersessionChain(correction.recordId);
    expect(chain.map((r) => r.recordId)).toEqual([correction.recordId, original.recordId]);

    // The corrected-away value is still inspectable — that is the whole point.
    const originalValue = chain[1] as unknown as { value: { minutes: number } };
    expect(originalValue.value.minutes).toBe(45);
  });
});

/** Gate requirement: projections can be deleted and rebuilt. */
describe('projections', () => {
  it('rebuilds identically after being dropped', async () => {
    await writeRecord(aCommitment());
    await writeRecord(anObservation());

    await rebuildAllProjections(NOW);
    const before = await getProjection('open-commitments', NOW);
    expect(await listProjectionNames(await openDatabase())).toHaveLength(2);

    await dropAllProjections();
    expect(await listProjectionNames(await openDatabase())).toEqual([]);

    const after = await getProjection('open-commitments', NOW);
    expect(after).toEqual(before);
  });

  it('is dropped automatically when canonical state changes', async () => {
    await writeRecord(aCommitment());
    await rebuildAllProjections(NOW);
    expect(await listProjectionNames(await openDatabase())).toHaveLength(2);

    await writeRecord(anObservation());

    // A stale projection is a second source of truth. Dropping is safe because
    // rebuilding is cheap and deterministic.
    expect(await listProjectionNames(await openDatabase())).toEqual([]);
  });

  it('excludes closed commitments and resolves supersession', async () => {
    const commitment = aCommitment();
    await writeRecord(commitment);
    await writeRecord(aCommitment({ statement: 'Commitment Two' }));

    let open = (await getProjection('open-commitments', NOW)) as OpenCommitment[];
    expect(open).toHaveLength(2);

    // Completing a commitment appends a superseding record rather than editing.
    await writeRecord(
      aCommitment({ state: 'completed', supersedesRecordId: commitment.recordId }),
    );

    open = (await getProjection('open-commitments', NOW)) as OpenCommitment[];
    expect(open.map((entry) => entry.statement)).toEqual(['Commitment Two']);
  });

  it('reports a category with no evidence as unknown, never as zero', async () => {
    await writeRecord(anObservation({ category: 'time-attention-capacity' }));

    const freshness = (await getProjection('category-freshness', NOW)) as CategoryFreshness[];
    expect(freshness).toHaveLength(ENABLED_CATEGORIES.length);

    const withEvidence = freshness.find((f) => f.category === 'time-attention-capacity');
    expect(withEvidence?.evidence.status).toBe('known');

    const withoutEvidence = freshness.find((f) => f.category === 'career-work-learning');
    expect(withoutEvidence?.evidence.status).toBe('unknown');
    // Specifically not a count of 0 or an epoch timestamp.
    expect(JSON.stringify(withoutEvidence)).not.toContain('1970');
    expect(withoutEvidence?.evidence).not.toHaveProperty('observationCount');
  });
});
