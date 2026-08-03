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
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(storeNamesAtCurrentVersion()).toEqual(['_meta', 'projections', 'records']);
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
describe('upgrading a version 1 database', () => {
  it('preserves existing data and adds the new stores', async () => {
    const v1 = new Dexie(MIGRATION_TEST_DB);
    v1.version(1).stores({ _meta: '&key' });
    await v1.open();
    await v1.table('_meta').put({ key: 'created-under', value: 'phase-1' });
    expect(v1.verno).toBe(1);
    v1.close();

    const upgraded = new LifeCommandDatabase(MIGRATION_TEST_DB);
    await upgraded.open();

    expect(upgraded.verno).toBe(2);
    await expect(upgraded.meta.get('created-under')).resolves.toEqual({
      key: 'created-under',
      value: 'phase-1',
    });
    expect(upgraded.tables.map((table) => table.name).sort()).toEqual([
      '_meta',
      'projections',
      'records',
    ]);

    // The new stores are usable immediately after the upgrade.
    await expect(upgraded.records.count()).resolves.toBe(0);
    upgraded.close();
  });
});
