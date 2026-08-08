import { newRecordId, RECORD_SCHEMA_VERSION, type CanonicalRecord } from '../../domain/records';
import type {
  CommitmentRecord,
  CommitmentState,
  GOAL_STATES,
  GoalRecord,
} from '../../domain/records/direction';

type GoalState = (typeof GOAL_STATES)[number];
import type { LifeCategory } from '../../domain/records/categories';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Setting a direction: North Star, goals, commitments (`V33-003`–`V33-005`, section C).
 *
 * ## Why these did not exist until now
 *
 * The engine has read North Star, goals and commitments since Phase 4, and the owner had
 * no way to write any of them. Direction rendered "No North Star recorded yet." beside no
 * control that could change that, so the single most load-bearing input to arbitration —
 * the objective function itself — was reachable only by seeding a scenario.
 *
 * ## Revising is not editing
 *
 * The North Star has version history (`V33-003`), and history is only real if revision is
 * append-only. So `reviseNorthStar` writes a **new record and supersedes nothing**: every
 * North Star the owner has ever set stays current and readable, and
 * `northStarVersions` derives the effective dates from the chain.
 *
 * That is the opposite of how goals and commitments behave, and the difference is
 * deliberate. A goal moving from active to achieved is one thing whose state changed —
 * there should be exactly one current answer, so those supersede. A North Star being
 * revised is a *new objective*, and the old one still explains every decision made while
 * it was in force. Collapsing that to one current value would make old evidence
 * unreadable, which is precisely what `G8` forbids.
 *
 * ## No wizard
 *
 * Section C is explicit that the owner must not be walked through a long setup. Each of
 * these takes the smallest thing that could be true — a sentence — and nothing else is
 * required. Category is the one exception for a goal, because arbitration reads it and a
 * goal filed nowhere cannot influence anything.
 */

function envelope(now: Date) {
  const instant = now.toISOString();
  return {
    recordId: newRecordId(),
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    provenance: { method: 'direct-report' as const },
  };
}

/* -------------------------------------------------------------------------- */
/* North Star                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Records a North Star, or a revision of one.
 *
 * Never supersedes. Each call adds a version, and the newest is the one in force —
 * see `northStarVersions` for how the effective dates fall out of the chain.
 */
export async function setNorthStar(
  input: { readonly statement: string; readonly horizon?: string | undefined },
  now: Date,
): Promise<WriteResult> {
  const statement = input.statement.trim();
  if (statement.length === 0) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: ['A North Star needs a sentence. Nothing has been saved.'],
    };
  }

  const horizon = input.horizon?.trim();

  return writeRecord({
    ...envelope(now),
    recordType: 'north-star',
    privacy: 'general',
    statement,
    ...(horizon === undefined || horizon.length === 0 ? {} : { horizon }),
  });
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

/** The current record for a goal, following the supersession chain. */
export function currentGoal(
  records: readonly CanonicalRecord[],
  goalRecordId: string,
): GoalRecord | undefined {
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesRecordId === undefined ? [] : [record.supersedesRecordId],
    ),
  );

  /* Walk forward from the original through whatever replaced it. */
  let current = records.find(
    (record): record is GoalRecord =>
      record.recordType === 'goal' && record.recordId === goalRecordId,
  );

  while (current !== undefined && superseded.has(current.recordId)) {
    const next = records.find(
      (record): record is GoalRecord =>
        record.recordType === 'goal' && record.supersedesRecordId === current?.recordId,
    );
    if (next === undefined) break;
    current = next;
  }

  return current;
}

export async function addGoal(
  input: {
    readonly statement: string;
    readonly category: LifeCategory;
    readonly northStarRecordId?: string | undefined;
  },
  now: Date,
): Promise<WriteResult> {
  const statement = input.statement.trim();
  if (statement.length === 0) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: ['A goal needs a sentence. Nothing has been saved.'],
    };
  }

  return writeRecord({
    ...envelope(now),
    recordType: 'goal',
    privacy: 'general',
    statement,
    category: input.category,
    state: 'active',
    /*
     * Linked to the North Star in force when it was set, where there is one. This is what
     * lets a later reader tell which objective a goal was serving without assuming the
     * current one applied retroactively.
     */
    ...(input.northStarRecordId === undefined
      ? {}
      : { northStarRecordId: input.northStarRecordId }),
  });
}

/**
 * Moves a goal to a new state.
 *
 * Supersedes rather than edits, so "achieved on the 14th" stays visible after the goal is
 * later reopened — completion is a fact about a date, not a flag.
 */
export async function setGoalState(
  records: readonly CanonicalRecord[],
  input: { readonly goalRecordId: string; readonly state: GoalState },
  now: Date,
): Promise<WriteResult> {
  const goal = currentGoal(records, input.goalRecordId);
  if (goal === undefined) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: ['That goal is not in the record. Nothing has been changed.'],
    };
  }

  return writeRecord({
    ...envelope(now),
    recordType: 'goal',
    privacy: 'general',
    supersedesRecordId: goal.recordId,
    statement: goal.statement,
    category: goal.category,
    state: input.state,
    ...(goal.targetWindow === undefined ? {} : { targetWindow: goal.targetWindow }),
    ...(goal.progressEvidenceIntent === undefined
      ? {}
      : { progressEvidenceIntent: goal.progressEvidenceIntent }),
    ...(goal.northStarRecordId === undefined
      ? {}
      : { northStarRecordId: goal.northStarRecordId }),
  });
}

/* -------------------------------------------------------------------------- */
/* Commitments                                                                 */
/* -------------------------------------------------------------------------- */

export function currentCommitment(
  records: readonly CanonicalRecord[],
  commitmentRecordId: string,
): CommitmentRecord | undefined {
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesRecordId === undefined ? [] : [record.supersedesRecordId],
    ),
  );

  let current = records.find(
    (record): record is CommitmentRecord =>
      record.recordType === 'commitment' && record.recordId === commitmentRecordId,
  );

  while (current !== undefined && superseded.has(current.recordId)) {
    const next = records.find(
      (record): record is CommitmentRecord =>
        record.recordType === 'commitment' && record.supersedesRecordId === current?.recordId,
    );
    if (next === undefined) break;
    current = next;
  }

  return current;
}

export async function addCommitment(
  input: {
    readonly statement: string;
    readonly category: LifeCategory;
    readonly nonNegotiable?: boolean;
  },
  now: Date,
): Promise<WriteResult> {
  const statement = input.statement.trim();
  if (statement.length === 0) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: ['A commitment needs a sentence. Nothing has been saved.'],
    };
  }

  return writeRecord({
    ...envelope(now),
    recordType: 'commitment',
    privacy: 'general',
    statement,
    category: input.category,
    state: 'active',
    nonNegotiable: input.nonNegotiable ?? false,
  });
}

export async function setCommitmentState(
  records: readonly CanonicalRecord[],
  input: { readonly commitmentRecordId: string; readonly state: CommitmentState },
  now: Date,
): Promise<WriteResult> {
  const commitment = currentCommitment(records, input.commitmentRecordId);
  if (commitment === undefined) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: ['That commitment is not in the record. Nothing has been changed.'],
    };
  }

  return writeRecord({
    ...envelope(now),
    recordType: 'commitment',
    privacy: 'general',
    supersedesRecordId: commitment.recordId,
    statement: commitment.statement,
    category: commitment.category,
    state: input.state,
    nonNegotiable: commitment.nonNegotiable,
    ...(commitment.dueAt === undefined ? {} : { dueAt: commitment.dueAt }),
    ...(commitment.goalRecordId === undefined ? {} : { goalRecordId: commitment.goalRecordId }),
    ...(commitment.requiresProtectedContext === undefined
      ? {}
      : { requiresProtectedContext: commitment.requiresProtectedContext }),
  });
}
