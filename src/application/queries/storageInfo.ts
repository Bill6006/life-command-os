import { SCHEMA_VERSION } from '../../infrastructure/database/connection';

/**
 * Storage facts the interface is allowed to see.
 *
 * The UI may not import from `src/infrastructure/` — ESLint blocks it, per ADR-0004 —
 * so anything it legitimately needs to know about storage comes through here.
 */
export const CANONICAL_SCHEMA_VERSION = SCHEMA_VERSION;
