import type { CanonicalRecord } from '../../domain/records';
import { canonicalPatternId } from '../../domain/moves/registry';
import { EVIDENCE_RULES_VERSION } from './comparability';

/**
 * Reversing an interpretation without erasing what happened (`V33-024`, section G8).
 *
 * ## The distinction the whole file rests on
 *
 * There are two different things in the record set and they must never share a fate:
 *
 *   - **The observation.** He went for a walk at nine and slept badly. That happened. It is
 *     immutable, and no later realisation about what it meant may edit or remove it.
 *   - **The interpretation.** That the walk is associated with the bad night. That is the
 *     engine's reading, it can be wrong, and it must be reversible.
 *
 * An engine that corrects itself by deleting observations destroys the only thing it
 * actually knows. One that cannot correct itself at all accumulates mistakes for ever. So
 * a correction here **supersedes an interpretation** and leaves the underlying events
 * exactly where they were.
 *
 * ## Why this needs no new record family
 *
 * `observation-correction` already exists for correcting what was observed, and this is
 * deliberately not that. An interpretation correction is recorded as a `learned-belief`
 * whose `supersedesRecordId` points at the belief it replaces — the same append-only
 * supersession the rest of the model uses, so `currentRecords` resolves it for free and
 * the superseded reading stays readable in the audit trail.
 *
 * ## Deterministic restoration
 *
 * `V33-024` requires rollback to restore the prior learned state *deterministically*.
 * That falls out of deriving rather than storing: beliefs about effectiveness are
 * recomputed from raw records on every episode, so withdrawing an interpretation changes
 * the next computation and nothing has to be un-applied. There is no cached state to drift.
 */

export type InterpretationStatus = 'active' | 'withdrawn' | 'superseded';

export interface Interpretation {
  readonly recordId: string;
  /** The move this reading is about, canonical. */
  readonly patternId: string;
  readonly statement: string;
  readonly status: InterpretationStatus;
  /** The interpretation rules in force when it was derived. Absent means unknown. */
  readonly evidenceRulesVersion: string | undefined;
  /** The North Star live when it was derived, where one was set. Absent means unknown. */
  readonly northStarRecordId: string | undefined;
  /** Observations behind it. Never modified by a correction. */
  readonly basisRecordIds: readonly string[];
  readonly recordedAt: string;
  /** Set when a later record replaced or withdrew this one. */
  readonly replacedBy: string | undefined;
  readonly because: string | undefined;
}

interface BeliefLike {
  readonly recordId: string;
  readonly recordType: 'learned-belief';
  readonly recordedAt: string;
  readonly supersedesRecordId?: string | undefined;
  readonly statement: string;
  readonly basisRecordIds?: readonly string[] | undefined;
  readonly withdrawn?: boolean | undefined;
  readonly engineCandidateId?: string | undefined;
  readonly evidenceRulesVersion?: string | undefined;
  readonly northStarRecordId?: string | undefined;
  readonly because?: string | undefined;
}

function isBelief(record: CanonicalRecord): record is CanonicalRecord & BeliefLike {
  return record.recordType === 'learned-belief';
}

/**
 * Every interpretation ever recorded, with what became of it.
 *
 * Returned in full rather than filtered to the live ones, because the audit trail is the
 * point: reconstructing why confidence changed needs the readings that were withdrawn as
 * much as the ones that survived.
 */
export function interpretations(
  records: readonly CanonicalRecord[],
): readonly Interpretation[] {
  const beliefs = records.filter(isBelief);
  const supersededBy = new Map<string, string>();

  for (const belief of beliefs) {
    if (belief.supersedesRecordId !== undefined) {
      supersededBy.set(belief.supersedesRecordId, belief.recordId);
    }
  }

  return beliefs
    .map((belief) => {
      const replacedBy = supersededBy.get(belief.recordId);
      const status: InterpretationStatus =
        belief.withdrawn === true
          ? 'withdrawn'
          : replacedBy === undefined
            ? 'active'
            : 'superseded';

      return {
        recordId: belief.recordId,
        patternId:
          belief.engineCandidateId === undefined
            ? ''
            : canonicalPatternId(belief.engineCandidateId),
        statement: belief.statement,
        status,
        evidenceRulesVersion: belief.evidenceRulesVersion,
        northStarRecordId: belief.northStarRecordId,
        basisRecordIds: belief.basisRecordIds ?? [],
        recordedAt: belief.recordedAt,
        replacedBy,
        because: belief.because,
      };
    })
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

/** The readings the engine may currently act on. */
export function activeInterpretations(
  records: readonly CanonicalRecord[],
): readonly Interpretation[] {
  return interpretations(records).filter((entry) => entry.status === 'active');
}

/**
 * Whether a withdrawal or correction destroyed anything.
 *
 * Exists to be asserted rather than trusted. Every observation cited by any interpretation
 * — live, superseded or withdrawn — must still be present in the record set. If a
 * correction ever starts removing evidence, this is what fails.
 */
export function underlyingHistoryIntact(records: readonly CanonicalRecord[]): boolean {
  const present = new Set(records.map((record) => record.recordId));
  return interpretations(records).every((entry) =>
    entry.basisRecordIds.every((id) => present.has(id)),
  );
}

/**
 * The metadata every new interpretation must carry (`V33-023`).
 *
 * Assembled here so no caller can write a belief that cannot later be placed in time:
 * which interpretation rules produced it, and which North Star was live. Both are
 * recorded rather than inferred at read time, because inferring them later would mean
 * re-deriving old readings under today's assumptions — the exact silent reinterpretation
 * G8 forbids.
 */
export function interpretationStamp(northStarRecordId: string | undefined): {
  readonly evidenceRulesVersion: string;
  readonly northStarRecordId: string | undefined;
} {
  return { evidenceRulesVersion: EVIDENCE_RULES_VERSION, northStarRecordId };
}
