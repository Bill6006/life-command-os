import { afterEach, describe, expect, it } from 'vitest';
import {
  DATABASE_NAME,
  SCHEMA_VERSION,
  closeDatabase,
  isIndexedDbAvailable,
  openDatabase,
  withTransaction,
} from '../../src/infrastructure/database/connection';
import { syntheticId } from '../fixtures/synthetic';

/**
 * STORE-001 / ADR-0004 — Phase 1 scope only.
 *
 * These prove the connection and transaction foundation works. They do not prove
 * canonical persistence semantics; that arrives in Phase 2 with real record
 * families, and is verified in a real browser rather than against an in-memory shim.
 */
describe('IndexedDB connection foundation', () => {
  afterEach(() => {
    closeDatabase();
  });

  it('reports IndexedDB availability in the test environment', () => {
    expect(isIndexedDbAvailable()).toBe(true);
  });

  it('opens a versioned database', async () => {
    const database = await openDatabase();

    expect(database.isOpen()).toBe(true);
    expect(database.name).toBe(DATABASE_NAME);
    expect(database.verno).toBe(SCHEMA_VERSION);
  });

  it('returns the same connection on repeated opens', async () => {
    const first = await openDatabase();
    const second = await openDatabase();

    expect(second).toBe(first);
  });

  it('declares no canonical life-data stores yet (LEAN-001)', async () => {
    const database = await openDatabase();
    const tableNames = database.tables.map((table) => table.name);

    // Phase 2 introduces the twenty core record families. Anything beyond
    // infrastructure bookkeeping appearing here now would be speculative.
    expect(tableNames).toEqual(['_meta']);
  });

  it('commits a transaction and reads the value back', async () => {
    const database = await openDatabase();
    const key = syntheticId('meta', 1);

    await withTransaction(database, ['_meta'], async () => {
      await database.meta.put({ key, value: 'synthetic-value' });
    });

    await expect(database.meta.get(key)).resolves.toEqual({
      key,
      value: 'synthetic-value',
    });
  });

  it('writes nothing when the transaction throws', async () => {
    const database = await openDatabase();
    const key = syntheticId('meta', 2);

    const attempt = withTransaction(database, ['_meta'], async () => {
      await database.meta.put({ key, value: 'should-not-persist' });
      throw new Error('deliberate failure');
    });

    await expect(attempt).rejects.toThrow('deliberate failure');

    // The rule this protects: never report success before the authoritative
    // transaction commits. A partial write here would make that rule unenforceable.
    await expect(database.meta.get(key)).resolves.toBeUndefined();
  });
});
