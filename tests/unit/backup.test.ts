import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, restoreBackup } from '../../src/application/commands/backupCommands';
import { writeRecord } from '../../src/application/commands/writeRecord';
import { listAllRecords, listCurrentRecords } from '../../src/application/queries/readRecords';
import { validateBackup } from '../../src/infrastructure/backup/developmentBackup';
import { resetDatabase } from '../support/database';
import {
  aCommitment,
  anObservation,
  anObservationCorrection,
  fixtureId,
  resetFixtureIds,
} from '../fixtures/records';

const NOW = new Date('2026-01-05T12:00:00.000Z');

beforeEach(async () => {
  resetFixtureIds();
  await resetDatabase();
});

/** Gate requirement: canonical data survives synthetic restore. */
describe('development backup round trip', () => {
  it('restores every record, including superseded history', async () => {
    const original = anObservation();
    const correction = anObservationCorrection(original.recordId);
    await writeRecord(original);
    await writeRecord(correction);
    await writeRecord(aCommitment());

    const backup = await exportBackup(NOW);
    await resetDatabase();
    await expect(listAllRecords()).resolves.toEqual([]);

    const result = await restoreBackup(backup);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.restoredCount).toBe(3);

    const restored = await listAllRecords();
    expect(restored).toHaveLength(3);

    // History survived, not just the current view.
    expect(restored.map((r) => r.recordId)).toContain(original.recordId);
    const current = await listCurrentRecords();
    expect(current.map((r) => r.recordId)).toContain(correction.recordId);
    expect(current.map((r) => r.recordId)).not.toContain(original.recordId);
  });

  it('declares itself unencrypted, so it cannot be mistaken for a Phase 6 backup', async () => {
    await writeRecord(anObservation());
    const parsed = JSON.parse(await exportBackup(NOW)) as { encrypted: boolean };
    expect(parsed.encrypted).toBe(false);
  });
});

/**
 * Validation happens **entirely before** any mutation. A restore that clears the
 * store and then discovers a bad record has destroyed history to learn something it
 * could have learned for free.
 */
describe('a damaged backup is rejected before anything is written', () => {
  async function seedAndAttempt(raw: string): Promise<void> {
    const existing = anObservation();
    await writeRecord(existing);

    const result = await restoreBackup(raw);
    expect(result.ok).toBe(false);

    // The decisive assertion: canonical state is exactly as it was.
    const after = await listAllRecords();
    expect(after).toHaveLength(1);
    expect(after[0]?.recordId).toBe(existing.recordId);
  }

  it('rejects malformed JSON without mutating', async () => {
    await seedAndAttempt('{ not json');
  });

  it('rejects an unsupported format version without mutating', async () => {
    await seedAndAttempt(
      JSON.stringify({
        formatVersion: 99,
        schemaVersion: 2,
        exportedAt: NOW.toISOString(),
        recordCount: 0,
        encrypted: false,
        records: [],
      }),
    );
  });

  it('rejects a count mismatch without mutating', async () => {
    await seedAndAttempt(
      JSON.stringify({
        formatVersion: 1,
        schemaVersion: 2,
        exportedAt: NOW.toISOString(),
        recordCount: 5,
        encrypted: false,
        records: [anObservation()],
      }),
    );
  });

  it('rejects an invalid record without mutating, naming which one', async () => {
    const raw = JSON.stringify({
      formatVersion: 1,
      schemaVersion: 2,
      exportedAt: NOW.toISOString(),
      recordCount: 2,
      encrypted: false,
      records: [anObservation(), { ...anObservation(), category: 'not-a-category' }],
    });

    const validation = validateBackup(raw);
    expect(validation.ok).toBe(false);
    if (!validation.ok && validation.problem.kind === 'invalid-record') {
      expect(validation.problem.index).toBe(1);
    }

    await seedAndAttempt(raw);
  });

  it('rejects a backup whose supersession links point at missing records', async () => {
    // A backup claims to be a complete picture, so a dangling link means damage.
    const raw = JSON.stringify({
      formatVersion: 1,
      schemaVersion: 2,
      exportedAt: NOW.toISOString(),
      recordCount: 1,
      encrypted: false,
      records: [anObservationCorrection(fixtureId(8888))],
    });

    const validation = validateBackup(raw);
    expect(validation.ok).toBe(false);
    if (!validation.ok) expect(validation.problem.kind).toBe('invariant-violation');

    await seedAndAttempt(raw);
  });

  it('rejects a backup containing a duplicate record id', async () => {
    const duplicate = anObservation();
    const raw = JSON.stringify({
      formatVersion: 1,
      schemaVersion: 2,
      exportedAt: NOW.toISOString(),
      recordCount: 2,
      encrypted: false,
      records: [duplicate, duplicate],
    });

    await seedAndAttempt(raw);
  });
});
