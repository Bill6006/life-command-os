import type { LifeCommandDatabase, StoredSnapshot } from './connection';

/**
 * Pre-restore safety snapshots (LEG-134).
 *
 * A snapshot is written **before** a restore replaces canonical history, and it lives
 * in IndexedDB rather than in memory because the failure it exists to survive is the
 * tab dying part-way through. On the next boot the snapshot is still there and the
 * owner can go back.
 *
 * Snapshots are capped. Keeping every one would quietly double storage forever, and
 * the useful ones are the recent ones — a restore three months and four restores ago
 * is not something anyone rolls back to.
 */

export const MAX_SNAPSHOTS = 5;

export async function writeSnapshot(
  database: LifeCommandDatabase,
  snapshot: StoredSnapshot,
): Promise<void> {
  await database.transaction('rw', ['snapshots'], async () => {
    await database.snapshots.add(snapshot);

    const all = await database.snapshots.orderBy('createdAt').toArray();
    const excess = all.slice(0, Math.max(0, all.length - MAX_SNAPSHOTS));
    for (const stale of excess) await database.snapshots.delete(stale.snapshotId);
  });
}

export async function listSnapshots(database: LifeCommandDatabase): Promise<StoredSnapshot[]> {
  const all = await database.snapshots.orderBy('createdAt').toArray();
  return all.reverse();
}

export async function readSnapshot(
  database: LifeCommandDatabase,
  snapshotId: string,
): Promise<StoredSnapshot | undefined> {
  return database.snapshots.get(snapshotId);
}
