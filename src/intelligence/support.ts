import type {
  CanonicalRecord,
  CommitmentRecord,
  ContextSnapshotRecord,
  GoalRecord,
  NorthStarRecord,
  ObservationRecord,
  RecordType,
} from '../domain/records';
import { currentRecords } from '../domain/policies/invariants';
import { MAX_CONFIDENCE_THIS_PHASE } from './contracts';
import type { ConfidenceAssessment, FreshnessStatus } from './types';

/**
 * Shared engine helpers.
 *
 * Everything here is a pure function of records plus an explicit `now`. Nothing
 * reads the clock, so every result is reproducible — which is what makes the
 * scenario harness evidence rather than decoration.
 */

/** The observation attributes this baseline understands. */
export const ATTRIBUTES = {
  focusedBlockMinutes: 'focused-block-minutes',
  availableMinutes: 'available-minutes',
  learningSession: 'learning-session',
  interruption: 'interruption',
} as const;

export function ofType<T extends CanonicalRecord>(
  records: readonly CanonicalRecord[],
  type: RecordType,
): T[] {
  return records.filter((record) => record.recordType === type) as T[];
}

/** Current records of one family — supersession resolved, history retained in storage. */
export function currentOfType<T extends CanonicalRecord>(
  records: readonly CanonicalRecord[],
  type: RecordType,
): T[] {
  return ofType<T>(currentRecords(records), type);
}

/**
 * Observations and their corrections read the same way.
 *
 * A correction carries the same category, attribute, and value shape as the record
 * it supersedes, so once supersession is resolved the engine should not care which
 * it is looking at — and must not, or corrected values would be silently ignored.
 */
export function currentObservations(records: readonly CanonicalRecord[]): ObservationRecord[] {
  return currentRecords(records).filter(
    (record) =>
      record.recordType === 'observation' || record.recordType === 'observation-correction',
  ) as ObservationRecord[];
}

export function latestContext(
  records: readonly CanonicalRecord[],
): ContextSnapshotRecord | undefined {
  const snapshots = currentOfType<ContextSnapshotRecord>(records, 'context-snapshot');
  return snapshots.reduce<ContextSnapshotRecord | undefined>(
    (latest, snapshot) =>
      latest === undefined || snapshot.recordedAt > latest.recordedAt ? snapshot : latest,
    undefined,
  );
}

export function activeGoals(records: readonly CanonicalRecord[]): GoalRecord[] {
  return currentOfType<GoalRecord>(records, 'goal').filter((goal) => goal.state === 'active');
}

export function northStar(records: readonly CanonicalRecord[]): NorthStarRecord | undefined {
  const stars = currentOfType<NorthStarRecord>(records, 'north-star');
  return stars.reduce<NorthStarRecord | undefined>(
    (latest, star) =>
      latest === undefined || star.recordedAt > latest.recordedAt ? star : latest,
    undefined,
  );
}

const OPEN_COMMITMENT_STATES = new Set([
  'active',
  'scheduled',
  'waiting',
  'blocked',
  'postponed',
  'delegated',
  'unclear',
]);

export function openCommitments(records: readonly CanonicalRecord[]): CommitmentRecord[] {
  return currentOfType<CommitmentRecord>(records, 'commitment').filter((commitment) =>
    OPEN_COMMITMENT_STATES.has(commitment.state),
  );
}

/* -------------------------------------------------------------------------- */
/* Time                                                                        */
/* -------------------------------------------------------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/** ISO week key, so weeks group identically regardless of locale. */
export function isoWeekKey(iso: string): string {
  const date = new Date(Date.parse(iso));
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNumber = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / DAY_MS -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${String(target.getUTCFullYear())}-W${String(week).padStart(2, '0')}`;
}

/** Monday 00:00 UTC of the week containing `at`. */
export function weekStart(at: Date): Date {
  const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dayNumber = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNumber);
  return date;
}

export function weekEnd(at: Date): Date {
  const start = weekStart(at);
  return new Date(start.getTime() + 7 * DAY_MS);
}

export function shortLabel(iso: string): string {
  const date = new Date(Date.parse(iso));
  return `${String(date.getUTCDate())} ${date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`;
}

/** Human elapsed time. Deliberately coarse — false precision has no place here. */
export function ago(iso: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - Date.parse(iso));
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${String(minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${String(hours)} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${String(days)} days ago`;
}

export function assessFreshnessStatus(
  recordedAt: string | undefined,
  now: Date,
  maxUsefulAgeMs: number,
): FreshnessStatus {
  if (recordedAt === undefined) return 'none';
  const age = Math.max(0, now.getTime() - Date.parse(recordedAt));
  if (age <= maxUsefulAgeMs * 0.5) return 'fresh';
  if (age <= maxUsefulAgeMs) return 'aging';
  return 'stale';
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                  */
/* -------------------------------------------------------------------------- */

export interface ConfidenceInputs {
  readonly comparableCount: number;
  readonly freshness: FreshnessStatus;
  readonly consistent: boolean;
  readonly complete: boolean;
}

/**
 * Confidence from counted evidence (`CONFIDENCE-LABEL`).
 *
 * The ceiling is `moderate-evidence` in this phase and the function cannot exceed
 * it. `strong-personal-evidence` requires prospective validation, and nothing has
 * been validated prospectively yet — a baseline that could award itself the top
 * label on day one would be exactly the false precision the Constitution forbids.
 */
export function assessConfidence(inputs: ConfidenceInputs): ConfidenceAssessment {
  const dimensions: ConfidenceAssessment['dimensions'] = [
    {
      dimension: 'comparable-evidence-volume',
      assessment:
        inputs.comparableCount >= 3
          ? 'supports'
          : inputs.comparableCount > 0
            ? 'neutral'
            : 'undermines',
      note:
        inputs.comparableCount === 0
          ? 'No comparable evidence'
          : `${String(inputs.comparableCount)} comparable observation${inputs.comparableCount === 1 ? '' : 's'}`,
    },
    {
      dimension: 'recency',
      assessment:
        inputs.freshness === 'fresh'
          ? 'supports'
          : inputs.freshness === 'aging'
            ? 'neutral'
            : 'undermines',
      note:
        inputs.freshness === 'none' ? 'No dated evidence' : `Evidence is ${inputs.freshness}`,
    },
    {
      dimension: 'consistency',
      assessment: inputs.consistent ? 'supports' : 'undermines',
      note: inputs.consistent ? 'No contradictions found' : 'Credible records disagree',
    },
    {
      dimension: 'observation-completeness',
      assessment: inputs.complete ? 'supports' : 'undermines',
      note: inputs.complete ? 'Required fields are present' : 'Required fields are missing',
    },
    {
      dimension: 'prospective-validation',
      assessment: 'undermines',
      note: 'Nothing has been validated against a later outcome yet — Phase 5 changes this',
    },
  ];

  let label: ConfidenceAssessment['label'];
  let why: string;

  if (inputs.comparableCount === 0 || !inputs.complete) {
    label = 'insufficient-evidence';
    why =
      inputs.comparableCount === 0
        ? 'No comparable evidence to reason from.'
        : 'Required evidence is missing, so any conclusion would be a guess.';
  } else if (inputs.comparableCount < 3 || inputs.freshness === 'stale' || !inputs.consistent) {
    label = 'early-signal';
    why = !inputs.consistent
      ? 'Credible records disagree, which narrows what can be claimed.'
      : inputs.freshness === 'stale'
        ? 'The evidence exists but is older than this decision wants.'
        : `Only ${String(inputs.comparableCount)} comparable observation${inputs.comparableCount === 1 ? '' : 's'}, all recent.`;
  } else {
    label = MAX_CONFIDENCE_THIS_PHASE;
    why = `${String(inputs.comparableCount)} comparable observations, recent and consistent. Nothing has been followed through to an outcome yet.`;
  }

  return { label, why, dimensions };
}
