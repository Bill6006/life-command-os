import Dexie from 'dexie';
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from './migrations';

/**
 * IndexedDB connection and transaction foundation (STORE-001, ADR-0004).
 *
 * Boundaries this module exists to protect:
 *   - IndexedDB is the sole canonical authority for life data.
 *   - The UI never reaches storage directly; it goes through the application layer.
 *     ESLint enforces the import direction (see eslint.config.js).
 *   - Nothing reports success before the authoritative transaction commits.
 *
 * This module knows how to open, migrate, and transact. It deliberately knows
 * nothing about record shapes — validation belongs to the domain layer, and the
 * repository above it refuses to write anything that has not been validated.
 */

export const DATABASE_NAME = 'life-command-os';
export const SCHEMA_VERSION = CURRENT_SCHEMA_VERSION;

/**
 * Infrastructure bookkeeping only. This is not a domain table and must never hold
 * life data — it records how the local database itself was created and upgraded.
 */
export interface MetaEntry {
  key: string;
  value: string;
}

/** A stored canonical record. Shape is validated at the repository boundary. */
export interface StoredRecord {
  recordId: string;
  recordType: string;
  occurredAt: string;
  recordedAt: string;
  supersedesRecordId?: string;
  decisionEpisodeId?: string;
  [field: string]: unknown;
}

/** A materialised projection. Non-authoritative; safe to delete at any time. */
export interface StoredProjection {
  name: string;
  builtAt: string;
  /** The canonical record count the projection was built from, for staleness checks. */
  sourceRecordCount: number;
  value: unknown;
}

export class LifeCommandDatabase extends Dexie {
  readonly meta!: Dexie.Table<MetaEntry, string>;
  readonly records!: Dexie.Table<StoredRecord, string>;
  readonly projections!: Dexie.Table<StoredProjection, string>;

  constructor(name: string = DATABASE_NAME) {
    super(name);

    // Applied in order, so an existing v1 database upgrades to v2 in place rather
    // than being recreated. Dropping and recreating would destroy canonical history.
    for (const migration of MIGRATIONS) {
      this.version(migration.version).stores(migration.stores);
    }

    this.meta = this.table('_meta');
    this.records = this.table('records');
    this.projections = this.table('projections');
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
