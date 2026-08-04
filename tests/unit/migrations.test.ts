import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  storeNamesAtCurrentVersion,
} from '../../src/infrastructure/database/migrations';
import { LifeCommandDatabase } from '../../src/infrastructure/database/connection';

const MIGRATION_TEST_DB = 'life-command-os-migration-test';

afterEach(async () => {
  await Dexie.delete(MIGRATION_TEST_DB);
});

describe('migration registry', () => {
  it('is forward-only and strictly ascending', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
    expect(versions[0]).toBe(1);
  });

  it('registers migrations only for schemas that exist', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
    expect(storeNamesAtCurrentVersion()).toEqual([
      '_meta',
      'projections',
      'records',
      'snapshots',
    ]);
  });

  it('documents why each version exists', () => {
    for (const migration of MIGRATIONS) {
      expect(migration.note.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The upgrade has to happen **in place**. Dropping and recreating the database on
 * version change would destroy canonical history — which is the one thing this
 * product cannot do to its user.
 */
describe('upgrading an older database', () => {
  it('upgrades a version 1 database in place, keeping its data', async () => {
    const v1 = new Dexie(MIGRATION_TEST_DB);
    v1.version(1).stores({ _meta: '&key' });
    await v1.open();
    await v1.table('_meta').put({ key: 'created-under', value: 'phase-1' });
    expect(v1.verno).toBe(1);
    v1.close();

    const upgraded = new LifeCommandDatabase(MIGRATION_TEST_DB);
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    await expect(upgraded.meta.get('created-under')).resolves.toEqual({
      key: 'created-under',
      value: 'phase-1',
    });
    expect(upgraded.tables.map((table) => table.name).sort()).toEqual([
      '_meta',
      'projections',
      'records',
      'snapshots',
    ]);

    // The new stores are usable immediately after the upgrade.
    await expect(upgraded.records.count()).resolves.toBe(0);
    await expect(upgraded.snapshots.count()).resolves.toBe(0);
    upgraded.close();
  });

  /**
   * The upgrade that actually carries risk.
   *
   * A version 2 database holds canonical records. Version 3 adds a store beside them,
   * and the requirement is that it is *added* — not that the database is recreated
   * with the new shape. This is the test that would catch a migration written as a
   * drop-and-rebuild, which reads identically in the source and destroys everything.
   */
  it('upgrades a version 2 database without touching the canonical records', async () => {
    const v2 = new Dexie(MIGRATION_TEST_DB);
    v2.version(1).stores({ _meta: '&key' });
    v2.version(2).stores({
      records:
        '&recordId, recordType, occurredAt, recordedAt, supersedesRecordId, decisionEpisodeId',
      projections: '&name',
    });
    await v2.open();
    await v2.table('records').add({
      recordId: '00000000-0000-4000-8000-000000000001',
      recordType: 'observation',
      occurredAt: '2026-01-05T09:00:00.000Z',
      recordedAt: '2026-01-05T09:00:00.000Z',
    });
    expect(v2.verno).toBe(2);
    v2.close();

    const upgraded = new LifeCommandDatabase(MIGRATION_TEST_DB);
    await upgraded.open();

    expect(upgraded.verno).toBe(CURRENT_SCHEMA_VERSION);
    await expect(upgraded.records.count()).resolves.toBe(1);
    await expect(
      upgraded.records.get('00000000-0000-4000-8000-000000000001'),
    ).resolves.toMatchObject({ recordType: 'observation' });
    await expect(upgraded.snapshots.count()).resolves.toBe(0);
    upgraded.close();
  });
});
