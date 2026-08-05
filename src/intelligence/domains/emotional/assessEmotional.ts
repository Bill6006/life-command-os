import {
  assessFreshness,
  scaleAttribute,
  type CanonicalRecord,
  type ObservationRecord,
} from '../../../domain/records';
import {
  BOUNDARY_OUTCOMES,
  CONNECTION_KINDS,
  EMOTIONAL_ATTRIBUTES,
  PRACTICE_LABELS,
  REPAIR_OUTCOMES,
  SOCIAL_PRACTICES,
} from '../../../domain/emotional/social';
import { enabledTopics } from '../../../domain/emotional/permissions';
import { currentObservations } from '../../support';
import type { FreshnessStatus } from '../../types';
import type { ProtectedTopic } from '../../../domain/records/permissions';

/**
 * Reading the emotional and social evidence (Prompt 8E).
 *
 * ## What it counts, and what it will not
 *
 * It counts things that happened: days with contact, practices attempted, boundaries
 * that held, conflicts still open, whether anyone went back afterwards. It computes
 * nothing about how the owner is *doing*, produces no wellbeing figure, and never scores
 * a relationship — there is no per-person anything here, because there is no person
 * record to hang it on.
 *
 * ## Interference is the load-bearing reading
 *
 * "Something is getting in the way of what I meant to do" is the one emotional fact that
 * legitimately changes what the app should suggest, because it is about capacity rather
 * than mood. Mood itself is an input to the shared state assessment and stays there; it
 * is not a reason for this domain to act.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const CONNECTION_FRESH_MS = 4 * DAY_MS;
/** How long an unresolved conflict sits before repair is worth offering. */
export const REPAIR_SETTLING_HOURS = 12;
/** How long interference persists before the domain stops having a view. */
export const PERSISTENT_INTERFERENCE_DAYS = 21;

export interface PracticeCount {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

export interface EmotionalEvidence {
  readonly anyEvidence: boolean;
  /** Present-state readings the shared scales already collect. */
  readonly mood: number | undefined;
  readonly stress: number | undefined;
  readonly loneliness: number | undefined;
  readonly lonelinessTrend: readonly {
    readonly label: string;
    readonly value: number | null;
  }[];
  /** `undefined` means not asked, which is different from "nothing in the way". */
  readonly interference: 'none' | 'some' | 'a-lot' | undefined;
  readonly interferenceSince: string | undefined;
  readonly persistentInterference: boolean;
  /** Days in the last fortnight with any recorded contact. Never a target. */
  readonly connectionDays: number;
  readonly lastConnectionAt: string | undefined;
  readonly connectionFreshness: FreshnessStatus;
  readonly practices: readonly PracticeCount[];
  readonly openBoundary: string | undefined;
  readonly boundaryHeldCount: number;
  readonly boundaryAttempts: number;
  readonly conflictOpen: boolean;
  readonly conflictOpenSince: string | undefined;
  readonly repairMade: boolean;
  readonly rejectionStopped: boolean;
  /** Protected topics the owner has switched on. Empty is the shipped default. */
  readonly enabledTopics: readonly ProtectedTopic[];
  readonly observationCount: number;
}

function stateText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'state' ? observation.value.state : undefined;
}

function noteText(observation: ObservationRecord): string | undefined {
  return observation.value.kind === 'note' ? observation.value.text : undefined;
}

function ordinal(observation: ObservationRecord | undefined): number | undefined {
  return observation?.value.kind === 'anchored-scale' ? observation.value.ordinal : undefined;
}

const INTERFERENCE_BY_LABEL: Record<string, 'none' | 'some' | 'a-lot'> = {
  'Not really': 'none',
  'A bit': 'some',
  'A lot': 'a-lot',
};

export function assessEmotional(
  records: readonly CanonicalRecord[],
  now: Date,
): EmotionalEvidence {
  const observations = currentObservations(records);
  const byAttribute = (attribute: string): ObservationRecord[] =>
    observations
      .filter((observation) => observation.attribute === attribute)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  /* --- shared present state ----------------------------------------------- */

  const mood = ordinal(byAttribute(scaleAttribute('mood'))[0]);
  const stress = ordinal(byAttribute(scaleAttribute('stress'))[0]);
  const lonelinessReadings = byAttribute(scaleAttribute('loneliness'));
  const loneliness = ordinal(lonelinessReadings[0]);

  /* Eight weeks, oldest first. A week with no reading is a gap, never a zero. */
  const lonelinessTrend = Array.from({ length: 8 }, (_, index) => {
    const weeksAgo = 7 - index;
    const start = now.getTime() - (weeksAgo + 1) * 7 * DAY_MS;
    const end = now.getTime() - weeksAgo * 7 * DAY_MS;
    const inWeek = lonelinessReadings.filter((record) => {
      const at = Date.parse(record.occurredAt);
      return at >= start && at < end;
    });
    const values = inWeek.flatMap((record) => {
      const value = ordinal(record);
      return value === undefined ? [] : [value];
    });
    return {
      label: new Date(end - DAY_MS).toISOString().slice(5, 10),
      value:
        values.length === 0
          ? null
          : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) /
            10,
    };
  });

  /* --- interference --------------------------------------------------------- */

  const interferenceRecords = byAttribute(EMOTIONAL_ATTRIBUTES.interference);
  const newestInterference = interferenceRecords[0];
  const interference =
    newestInterference === undefined
      ? undefined
      : INTERFERENCE_BY_LABEL[stateText(newestInterference) ?? ''];

  /*
   * How long it has been in the way, counted from the oldest unbroken run of "a lot".
   * A single hard evening is not the same fact as three weeks, and only the second is
   * something the app should stop having a view about.
   */
  let interferenceSince: string | undefined;
  if (interference === 'a-lot') {
    for (const record of interferenceRecords) {
      if (INTERFERENCE_BY_LABEL[stateText(record) ?? ''] !== 'a-lot') break;
      interferenceSince = record.occurredAt;
    }
  }
  const persistentInterference =
    interferenceSince !== undefined &&
    now.getTime() - Date.parse(interferenceSince) >= PERSISTENT_INTERFERENCE_DAYS * DAY_MS;

  /* --- connection ----------------------------------------------------------- */

  const noContactLabel = CONNECTION_KINDS.find((kind) => kind.id === 'none-today')?.label;
  const connectionRecords = byAttribute(EMOTIONAL_ATTRIBUTES.connection).filter(
    (record) => stateText(record) !== noContactLabel,
  );
  const fortnightAgo = now.getTime() - 14 * DAY_MS;
  const connectionDays = new Set(
    connectionRecords
      .filter((record) => Date.parse(record.occurredAt) >= fortnightAgo)
      .map((record) => record.occurredAt.slice(0, 10)),
  ).size;
  const lastConnectionAt = connectionRecords[0]?.occurredAt;

  /* --- practice, boundaries, conflict --------------------------------------- */

  const practiceRecords = byAttribute(EMOTIONAL_ATTRIBUTES.practice);
  const practices = SOCIAL_PRACTICES.map((practice) => ({
    id: practice.id,
    label: practice.label,
    count: practiceRecords.filter((record) => stateText(record) === practice.label).length,
  }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const boundaryRecord = byAttribute(EMOTIONAL_ATTRIBUTES.boundaryDecided)[0];
  const boundaryOutcomes = byAttribute(EMOTIONAL_ATTRIBUTES.boundaryOutcome);
  const heldLabel = BOUNDARY_OUTCOMES.find((outcome) => outcome.id === 'held')?.label;
  const boundaryHeldCount = boundaryOutcomes.filter(
    (record) => stateText(record) === heldLabel,
  ).length;

  const conflictRecord = byAttribute(EMOTIONAL_ATTRIBUTES.conflictOpen)[0];
  const conflictOpen = conflictRecord !== undefined && stateText(conflictRecord) === 'Yes';
  const repairRecords = byAttribute(EMOTIONAL_ATTRIBUTES.repairOutcome);
  const notYetLabel = REPAIR_OUTCOMES.find((outcome) => outcome.id === 'not-yet')?.label;
  const newestRepair = repairRecords[0];
  const repairMade = newestRepair !== undefined && stateText(newestRepair) !== notYetLabel;

  const rejectionRecord = byAttribute(EMOTIONAL_ATTRIBUTES.rejectionResponse)[0];
  const rejectionStopped =
    rejectionRecord !== undefined && stateText(rejectionRecord) === 'Stopped for now';

  const relevant = observations.filter(
    (observation) =>
      observation.attribute.startsWith('emotional:') ||
      observation.attribute === scaleAttribute('loneliness'),
  );

  return {
    anyEvidence: relevant.length > 0,
    mood,
    stress,
    loneliness,
    lonelinessTrend,
    interference,
    interferenceSince,
    persistentInterference,
    connectionDays,
    lastConnectionAt,
    connectionFreshness:
      lastConnectionAt === undefined
        ? 'none'
        : assessFreshness(lastConnectionAt, now, CONNECTION_FRESH_MS).status,
    practices,
    openBoundary: boundaryRecord === undefined ? undefined : noteText(boundaryRecord),
    boundaryHeldCount,
    boundaryAttempts: boundaryOutcomes.length,
    conflictOpen,
    // `conflictOpen` is only true when the record exists, so this cannot be missing.
    conflictOpenSince: conflictOpen ? conflictRecord.occurredAt : undefined,
    repairMade,
    rejectionStopped,
    enabledTopics: enabledTopics(records),
    observationCount: relevant.length,
  };
}

export { PRACTICE_LABELS };
