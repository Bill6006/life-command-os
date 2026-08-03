/**
 * Neutral synthetic fixture conventions (PRIV-002, ADR-0007).
 *
 * Every fixture, test, screenshot, and hosted example uses invented values —
 * permanently, including after Phase 6 makes real private use safe. Phase 6
 * changes what is safe at *runtime*; it changes nothing about this repository,
 * which stays public and permanent.
 *
 * Rules for anything added here:
 *
 *   1. Invented, never anonymised. Anonymised real data requires a judgement call
 *      about what identifies a person, and re-identification is a well-documented
 *      failure mode. Fixtures are constructed from nothing.
 *   2. Obviously synthetic to a reader. A person skimming a test should never have
 *      to wonder whether a value is real.
 *   3. Neutral. No real employers, products, places, conditions, or relationships.
 *   4. Deterministic. Fixtures must not depend on the current clock, random values,
 *      or machine locale — scenario tests have to be reproducible.
 *
 * Phase 2 adds deterministic builders for the canonical record families. This file
 * deliberately holds only the shared vocabulary those builders will draw on.
 */

/** Placeholder identities. Deliberately generic and non-referential. */
export const SYNTHETIC_PERSONS = ['Person A', 'Person B', 'Person C', 'Person D'] as const;

/** Neutral labels for commitments, goals, and activities. */
export const SYNTHETIC_LABELS = [
  'Activity One',
  'Activity Two',
  'Commitment One',
  'Commitment Two',
  'Goal One',
  'Goal Two',
] as const;

/**
 * Fixed reference instant for deterministic time-based fixtures.
 * Chosen arbitrarily; it carries no meaning and refers to nothing.
 */
export const SYNTHETIC_EPOCH = '2026-01-05T09:00:00.000Z';

/** Derives a deterministic instant relative to {@link SYNTHETIC_EPOCH}. */
export function syntheticInstant(offsetMinutes: number): string {
  return new Date(Date.parse(SYNTHETIC_EPOCH) + offsetMinutes * 60_000).toISOString();
}

/** Stable, obviously-synthetic identifier. Never a real ID format. */
export function syntheticId(kind: string, index: number): string {
  return `synthetic-${kind}-${String(index).padStart(4, '0')}`;
}
