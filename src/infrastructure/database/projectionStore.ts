import type { LifeCommandDatabase, StoredProjection } from './connection';

/**
 * Materialised projection storage (`STORE-002`).
 *
 * Projections are **never canonical truth**. Everything here is designed around
 * that: they can be deleted wholesale at any moment, they record what they were
 * built from so staleness is detectable, and nothing in the system reads a
 * projection when it needs an authoritative answer.
 *
 * Unlike canonical records, projections use `put` — overwriting a projection is the
 * normal case, because rebuilding is how they stay correct.
 */

export async function saveProjection(
  database: LifeCommandDatabase,
  name: string,
  value: unknown,
  sourceRecordCount: number,
  builtAt: string,
): Promise<void> {
  await database.projections.put({ name, value, sourceRecordCount, builtAt });
}

export async function readProjection(
  database: LifeCommandDatabase,
  name: string,
): Promise<StoredProjection | undefined> {
  return database.projections.get(name);
}

export async function deleteProjection(
  database: LifeCommandDatabase,
  name: string,
): Promise<void> {
  await database.projections.delete(name);
}

/** Drops every projection. Canonical records are untouched. */
export async function clearProjections(database: LifeCommandDatabase): Promise<void> {
  await database.projections.clear();
}

export async function listProjectionNames(database: LifeCommandDatabase): Promise<string[]> {
  return database.projections.orderBy('name').keys() as Promise<string[]>;
}
