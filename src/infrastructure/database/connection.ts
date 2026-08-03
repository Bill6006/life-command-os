import Dexie from 'dexie';

/**
 * IndexedDB connection and transaction foundation (STORE-001, ADR-0004).
 *
 * Phase 1 scope: prove that the application can open a versioned IndexedDB
 * database and run an atomic transaction. No canonical life-record stores are
 * declared here — those arrive in Phase 2 with the core record families, and
 * inventing them now would be speculative (LEAN-001).
 *
 * Boundaries this module exists to protect:
 *   - IndexedDB is the sole canonical authority for life data.
 *   - The UI never reaches storage directly; it goes through the application layer.
 *     ESLint enforces the import direction (see eslint.config.js).
 *   - Nothing reports success before the authoritative transaction commits.
 */

export const DATABASE_NAME = 'life-command-os';

/** Bumped only when a schema migration is added. Phase 2 registers real stores. */
export const SCHEMA_VERSION = 1;

/**
 * Infrastructure bookkeeping only. This is not a domain table and must never hold
 * life data — it records how the local database itself was created and upgraded.
 */
export interface MetaEntry {
  key: string;
  value: string;
}

export class LifeCommandDatabase extends Dexie {
  readonly meta!: Dexie.Table<MetaEntry, string>;

  constructor(name: string = DATABASE_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      _meta: '&key',
    });
    this.meta = this.table('_meta');
  }
}

let instance: LifeCommandDatabase | undefined;

/** Opens (or returns) the singleton connection. Safe to call repeatedly. */
export async function openDatabase(): Promise<LifeCommandDatabase> {
  instance ??= new LifeCommandDatabase();
  if (!instance.isOpen()) {
    await instance.open();
  }
  return instance;
}

/** Closes and clears the singleton. Primarily used by tests and recovery paths. */
export function closeDatabase(): void {
  instance?.close();
  instance = undefined;
}

/**
 * Runs `work` inside a single readwrite transaction over the named tables.
 *
 * Callers must treat a rejected promise as "nothing was written". Dexie aborts the
 * transaction on throw, which is what lets the application honour the rule that it
 * never displays "saved" before the authoritative transaction commits.
 */
export async function withTransaction<T>(
  database: LifeCommandDatabase,
  tables: readonly string[],
  work: () => Promise<T>,
): Promise<T> {
  return database.transaction('rw', tables as string[], work);
}

/** Reports whether the browser exposes IndexedDB at all. */
export function isIndexedDbAvailable(): boolean {
  return typeof globalThis.indexedDB !== 'undefined';
}
