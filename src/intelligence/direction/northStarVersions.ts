import type { CanonicalRecord, NorthStarRecord } from '../../domain/records';
import { currentOfType } from '../support';

/**
 * North Star version history and effective dates (`V33-067`, v3.3 section C, `V33-003`).
 *
 * ## Why versions rather than one current value
 *
 * The North Star is the objective function (`V33-001`). Everything the engine concludes
 * about whether a move served the owner's direction is a statement made *against* a
 * particular North Star — and people revise what their life is for. Once that happens, an
 * evaluation recorded in March is answering a question that no longer exists.
 *
 * The failure this prevents is silent reinterpretation: reading old evidence as though
 * today's North Star had been in force when it was gathered. That is not a rounding error,
 * it is fabricating agreement. So each North Star record is a **version** with a start and
 * an end, and evidence is read against whichever version was live when it was created.
 *
 * ## Append-only, and therefore reconstructible
 *
 * Revising the North Star writes a new record. Nothing is edited and nothing is removed,
 * so the whole history is always derivable from the record set alone — which is what makes
 * "old versions retain their dates and their linked evidence" a property of the storage
 * model rather than a feature someone has to maintain.
 *
 * ## The system never reads the words
 *
 * A version is identified by its record id and its dates. The `statement` is the owner's
 * prose and is carried for display only: nothing here parses it, scores it, or infers
 * structure from it. That boundary is deliberate and is what leaves room for an explicit
 * Natural-Language Capture layer later without the arbiter having quietly grown one.
 */

export interface NorthStarVersion {
  /** The record that introduced this version. Stable identity for evidence to cite. */
  readonly recordId: string;
  /** 1 for the first North Star the owner ever set, rising with each revision. */
  readonly version: number;
  readonly statement: string;
  readonly horizon: string | undefined;
  /** When this version took effect. */
  readonly effectiveFrom: string;
  /** When the next version replaced it, or `undefined` while it is still current. */
  readonly effectiveUntil: string | undefined;
}

/**
 * Every North Star the owner has ever set, oldest first, with the window each was live for.
 *
 * Ordered by `recordedAt` rather than `occurredAt`: a North Star takes effect when it is
 * declared, and back-dating what your life is for is not a thing the model should support.
 */
export function northStarVersions(
  records: readonly CanonicalRecord[],
): readonly NorthStarVersion[] {
  const stars = currentOfType<NorthStarRecord>(records, 'north-star').sort((a, b) =>
    a.recordedAt.localeCompare(b.recordedAt),
  );

  return stars.map((star, index) => {
    const next = stars[index + 1];
    return {
      recordId: star.recordId,
      version: index + 1,
      statement: star.statement,
      horizon: star.horizon,
      effectiveFrom: star.recordedAt,
      effectiveUntil: next?.recordedAt,
    };
  });
}

/** The version live right now, or `undefined` when none has ever been set. */
export function currentNorthStarVersion(
  records: readonly CanonicalRecord[],
): NorthStarVersion | undefined {
  const versions = northStarVersions(records);
  return versions[versions.length - 1];
}

/**
 * Which North Star was in force at a given instant.
 *
 * Returns `undefined` for anything recorded before the owner ever set one — and that is
 * `unknown`, never version zero. Evidence gathered when there was no stated direction is
 * not evidence about the first direction that happened to arrive afterwards.
 */
export function northStarVersionAt(
  records: readonly CanonicalRecord[],
  instant: string,
): NorthStarVersion | undefined {
  const at = Date.parse(instant);
  if (Number.isNaN(at)) return undefined;

  return northStarVersions(records).find((version) => {
    const from = Date.parse(version.effectiveFrom);
    const until =
      version.effectiveUntil === undefined ? Infinity : Date.parse(version.effectiveUntil);
    return at >= from && at < until;
  });
}

/**
 * Whether a piece of evidence may be read against the current direction.
 *
 * The comparability question, and the reason `northStarVersionAt` exists at all. Evidence
 * created under a different North Star is not wrong and is not deleted — it simply cannot
 * be treated as though it spoke to the present objective without saying so.
 *
 * Absent metadata on either side answers `unknown`, which callers must treat as "cannot be
 * compared" rather than as either yes or no.
 */
export type Comparability = 'same-version' | 'different-version' | 'unknown';

export function comparableToCurrent(
  records: readonly CanonicalRecord[],
  evidenceRecordedAt: string,
): Comparability {
  const current = currentNorthStarVersion(records);
  if (current === undefined) return 'unknown';

  const then = northStarVersionAt(records, evidenceRecordedAt);
  if (then === undefined) return 'unknown';

  return then.recordId === current.recordId ? 'same-version' : 'different-version';
}
