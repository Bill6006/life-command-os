import {
  ENABLED_CATEGORIES,
  type CanonicalRecord,
  type LifeCategory,
} from '../../domain/records';
import { currentRecords } from '../../domain/policies/invariants';
import { openDatabase } from '../../infrastructure/database/connection';
import { getAllRecords } from '../../infrastructure/database/recordRepository';
import {
  clearProjections,
  readProjection,
  saveProjection,
} from '../../infrastructure/database/projectionStore';

/**
 * Rebuildable projections (`STORE-002`).
 *
 * Only two exist, because only two have a current need. Master plan §25 lists many
 * more; creating them now would be building views for behaviour that does not exist
 * yet (`LEAN-001`). They arrive with the surfaces that consume them.
 *
 * Every projection is a pure function of the canonical records. That is what makes
 * "delete and rebuild" safe, and it is why the rebuild path is tested rather than
 * assumed — a projection that cannot be reconstructed has quietly become a second
 * source of truth.
 */

export interface ProjectionDefinition<T> {
  readonly name: string;
  /** The question this view answers. A projection without one should not exist. */
  readonly question: string;
  readonly build: (records: readonly CanonicalRecord[]) => T;
}

/* -------------------------------------------------------------------------- */

/** Commitment states that still represent an open loop. */
const OPEN_COMMITMENT_STATES = [
  'active',
  'scheduled',
  'waiting',
  'blocked',
  'postponed',
  'delegated',
  'unclear',
] as const;

export interface OpenCommitment {
  readonly recordId: string;
  readonly statement: string;
  readonly category: LifeCategory;
  readonly state: string;
  readonly nonNegotiable: boolean;
  readonly dueAt?: string;
}

export const openCommitmentsProjection: ProjectionDefinition<OpenCommitment[]> = {
  name: 'open-commitments',
  question: 'Which commitments are still open, and which of them are non-negotiable?',
  build: (records) =>
    currentRecords(records)
      .filter((record) => record.recordType === 'commitment')
      .filter((record) =>
        (OPEN_COMMITMENT_STATES as readonly string[]).includes(
          (record as { state: string }).state,
        ),
      )
      .map((record) => {
        const commitment = record as unknown as {
          recordId: string;
          statement: string;
          category: LifeCategory;
          state: string;
          nonNegotiable: boolean;
          dueAt?: string;
        };
        return {
          recordId: commitment.recordId,
          statement: commitment.statement,
          category: commitment.category,
          state: commitment.state,
          nonNegotiable: commitment.nonNegotiable,
          ...(commitment.dueAt === undefined ? {} : { dueAt: commitment.dueAt }),
        };
      }),
};

/* -------------------------------------------------------------------------- */

export type CategoryEvidence =
  | {
      readonly status: 'known';
      readonly lastRecordedAt: string;
      readonly observationCount: number;
    }
  | { readonly status: 'unknown'; readonly reason: string };

export interface CategoryFreshness {
  readonly category: LifeCategory;
  readonly evidence: CategoryEvidence;
}

/**
 * When each enabled category last had evidence.
 *
 * A category with no observations reports `unknown` with a reason — **never a zero
 * count and never an epoch date**. A caller that renders "last updated: 1 Jan 1970"
 * has been lied to by its data source, and this projection refuses to be that
 * source.
 */
export const categoryFreshnessProjection: ProjectionDefinition<CategoryFreshness[]> = {
  name: 'category-freshness',
  question: 'When did each enabled category last have evidence, and how much of it?',
  build: (records) => {
    const observations = records.filter(
      (record) =>
        record.recordType === 'observation' || record.recordType === 'observation-correction',
    ) as unknown as { category: LifeCategory; recordedAt: string }[];

    return ENABLED_CATEGORIES.map((category) => {
      const forCategory = observations.filter((record) => record.category === category);

      if (forCategory.length === 0) {
        return {
          category,
          evidence: { status: 'unknown', reason: 'No observations recorded for this category' },
        } satisfies CategoryFreshness;
      }

      const lastRecordedAt = forCategory.reduce(
        (latest, record) => (record.recordedAt > latest ? record.recordedAt : latest),
        forCategory[0]?.recordedAt ?? '',
      );

      return {
        category,
        evidence: { status: 'known', lastRecordedAt, observationCount: forCategory.length },
      } satisfies CategoryFreshness;
    });
  },
};

/* -------------------------------------------------------------------------- */

export const PROJECTIONS = [openCommitmentsProjection, categoryFreshnessProjection] as const;

export type ProjectionName = (typeof PROJECTIONS)[number]['name'];

function definitionFor(name: ProjectionName): ProjectionDefinition<unknown> {
  const found = PROJECTIONS.find((projection) => projection.name === name);
  if (found === undefined) throw new Error(`Unknown projection: ${name}`);
  return found;
}

/** Rebuilds one projection from canonical records and stores the result. */
export async function rebuildProjection(name: ProjectionName, now: Date): Promise<unknown> {
  const database = await openDatabase();
  const records = await getAllRecords(database);
  const value = definitionFor(name).build(records);
  await saveProjection(database, name, value, records.length, now.toISOString());
  return value;
}

export async function rebuildAllProjections(now: Date): Promise<void> {
  for (const projection of PROJECTIONS) {
    await rebuildProjection(projection.name, now);
  }
}

/**
 * Reads a projection, rebuilding it if it is missing.
 *
 * Absence is not an error. Projections are dropped whenever canonical state
 * changes, so "not there" is the normal case immediately after a write.
 */
export async function getProjection(name: ProjectionName, now: Date): Promise<unknown> {
  const database = await openDatabase();
  const stored = await readProjection(database, name);
  if (stored !== undefined) return stored.value;
  return rebuildProjection(name, now);
}

/** Drops every projection. Canonical records are untouched — that is the point. */
export async function dropAllProjections(): Promise<void> {
  await clearProjections(await openDatabase());
}
