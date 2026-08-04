/**
 * Forward-only migration registry (Phase 2 task 10).
 *
 * Migrations are data, not scattered calls, so that the full upgrade history is
 * readable in one place and testable without opening a database.
 *
 * **Forward-only is not a limitation to work around.** Canonical records are
 * append-oriented; a "down" migration would have to discard information that a
 * later version legitimately recorded. Recovery from a bad upgrade is a restore
 * from backup (Phase 6), not a reversal.
 *
 * Only migrations for schemas that actually exist are registered. Declaring future
 * versions in advance would be speculative (`LEAN-001`).
 */

export interface MigrationStep {
  readonly version: number;
  /** Dexie store definitions introduced or changed at this version. */
  readonly stores: Readonly<Record<string, string | null>>;
  readonly note: string;
}

export const MIGRATIONS: readonly MigrationStep[] = [
  {
    version: 1,
    stores: {
      // Infrastructure bookkeeping only. Never life data.
      _meta: '&key',
    },
    note: 'Phase 1: connection and transaction foundation. No canonical stores.',
  },
  {
    version: 2,
    stores: {
      /**
       * One store for all canonical records.
       *
       * They share one envelope, so twenty stores would be twenty ways to express
       * the same thing while making cross-family queries — the supersession walk,
       * the decision-episode reconstruction — needlessly hard.
       *
       * Indexes exist for the access patterns the first slice actually has:
       * by family, by time, by supersession target, and by decision episode.
       */
      records:
        '&recordId, recordType, occurredAt, recordedAt, supersedesRecordId, decisionEpisodeId',
      /**
       * Derived views. Non-authoritative and safe to drop at any time — the
       * rebuild path is exercised by tests precisely so that stays true.
       */
      projections: '&name',
    },
    note: 'Phase 2: canonical record store and rebuildable projection store.',
  },
  {
    version: 3,
    stores: {
      /**
       * Pre-restore safety snapshots (`OWN-067`, LEG-134).
       *
       * A restore replaces canonical history. The snapshot taken immediately before
       * it is what makes that reversible — and it lives in the database rather than
       * in memory precisely because the failure it guards against is the tab dying
       * mid-restore. On the next boot the snapshot is still there.
       *
       * Indexed by time so the newest is findable without scanning.
       */
      snapshots: '&snapshotId, createdAt',
    },
    note: 'Phase 6: pre-restore safety snapshots, so a replacement restore is reversible.',
  },
];

/** The version the application currently opens. */
export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 1;

/** Every store name known at the current version. */
export function storeNamesAtCurrentVersion(): string[] {
  const names = new Set<string>();
  for (const migration of MIGRATIONS) {
    for (const [name, definition] of Object.entries(migration.stores)) {
      if (definition === null) names.delete(name);
      else names.add(name);
    }
  }
  return [...names].sort();
}
