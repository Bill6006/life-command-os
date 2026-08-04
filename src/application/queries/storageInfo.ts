import {
  SCHEMA_VERSION,
  isDatabaseSuperseded,
  onDatabaseSuperseded as subscribe,
} from '../../infrastructure/database/connection';

/**
 * Storage facts the interface is allowed to see.
 *
 * The UI may not import from `src/infrastructure/` — ESLint blocks it, per ADR-0004 —
 * so anything it legitimately needs to know about storage comes through here.
 */
export const CANONICAL_SCHEMA_VERSION = SCHEMA_VERSION;

/**
 * Subscribes to "another tab upgraded the database".
 *
 * IndexedDB cannot upgrade a schema while an older connection is open, so this tab
 * yields and closes its connection. Every subsequent write here would fail, so the
 * interface has to say so rather than let the owner type into a page that can no
 * longer save (Prompt 7B task 7).
 */
export const onDatabaseSuperseded = subscribe;
export const databaseSuperseded = isDatabaseSuperseded;
