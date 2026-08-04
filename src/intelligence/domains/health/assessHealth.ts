import {
  anchorLabel,
  scaleAttribute,
  type CanonicalRecord,
  type ObservationRecord,
} from '../../../domain/records';
import { assessFreshness } from '../../../domain/records';
import { currentObservations } from '../../support';
import type { FreshnessStatus } from '../../types';

/**
 * Reading the health evidence (Prompt 8B tasks 1–7).
 *
 * Everything here is a **read** over the shared canonical records. There is no health
 * store, no health cache, and no health-only write path — the same observations the
 * guides collect, filtered by attribute.
 *
 * ## What it refuses to compute
 *
 * No health score, no readiness index, no recovery percentage. The output is a set of
 * separately readable facts, each of which can be `undefined`, because "we do not know
 * how you slept" is a different input to a decision than "you slept badly" and the
 * difference is exactly what a composite number destroys.
 *
 * ## Physical and mental energy stay apart
 *
 * `AT-008`: they may differ, and candidate fit may differ with them, without being
 * collapsed into one number. A body that can lift and a mind that cannot concentrate
 * need different actions. Where only the general `energy` scale was answered, that is
 * reported as `general` and neither split value is invented.
 */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** How long a health reading stays worth acting on. */
const FRESH_WINDOWS: Record<string, number> = {
  'state:physical-energy': 4 * HOUR_MS,
  'state:mental-energy': 4 * HOUR_MS,
  'state:energy': 4 * HOUR_MS,
  'state:readiness': 3 * HOUR_MS,
  'state:sleep-recovery': 20 * HOUR_MS,
  'state:pain-interference': 6 * HOUR_MS,
  'health:hydration': 8 * HOUR_MS,
  'health:food-need': 3 * HOUR_MS,
  'health:persistence': 7 * DAY_MS,
  'health:movement': 20 * HOUR_MS,
};

const DEFAULT_WINDOW = 12 * HOUR_MS;

export type PainInterference =
  'not-at-all' | 'slightly' | 'noticeably' | 'a-lot' | 'cannot-work-around-it';

export type Persistence = 'today' | 'days' | 'weeks' | 'over-a-month' | 'unknown';

export interface Reading<T> {
  readonly value: T;
  readonly at: string;
  readonly freshness: FreshnessStatus;
}

export interface HealthEvidence {
  /** Ordinal 1–5 on the shared anchors. Absent means not reported, never "average". */
  readonly physicalEnergy: Reading<number> | undefined;
  readonly mentalEnergy: Reading<number> | undefined;
  /** The undifferentiated scale, used when the split was not asked. */
  readonly generalEnergy: Reading<number> | undefined;
  readonly recovery: Reading<number> | undefined;
  readonly readiness: Reading<number> | undefined;
  readonly sleepiness: Reading<string> | undefined;
  readonly painInterference: Reading<PainInterference> | undefined;
  readonly persistence: Reading<Persistence> | undefined;
  readonly hydration: Reading<string> | undefined;
  readonly foodNeed: Reading<string> | undefined;
  readonly movement: Reading<string> | undefined;
  readonly digestiveResponse: Reading<string> | undefined;
  /** Energy by part of day, from every energy reading on record. */
  readonly timeOfDay: readonly TimeOfDayBucket[];
  readonly observationCount: number;
  readonly anyEvidence: boolean;
  /** Attributes where two credible records disagree. Surfaced, never resolved. */
  readonly contradictions: readonly string[];
}

export interface TimeOfDayBucket {
  readonly label: string;
  /** Mean ordinal, or `null` when nothing was recorded in that part of the day. */
  readonly value: number | null;
  readonly count: number;
}

/* -------------------------------------------------------------------------- */

function latest(
  observations: readonly ObservationRecord[],
  attribute: string,
): ObservationRecord | undefined {
  return observations
    .filter((observation) => observation.attribute === attribute)
    .reduce<ObservationRecord | undefined>(
      (newest, observation) =>
        newest === undefined || observation.occurredAt > newest.occurredAt
          ? observation
          : newest,
      undefined,
    );
}

function freshnessOf(observation: ObservationRecord, now: Date): FreshnessStatus {
  const window = FRESH_WINDOWS[observation.attribute] ?? DEFAULT_WINDOW;
  return assessFreshness(observation.recordedAt, now, window).status;
}

function ordinalReading(
  observations: readonly ObservationRecord[],
  attribute: string,
  now: Date,
): Reading<number> | undefined {
  const observation = latest(observations, attribute);
  if (observation === undefined) return undefined;
  if (observation.value.kind !== 'anchored-scale') return undefined;
  return {
    value: observation.value.ordinal,
    at: observation.occurredAt,
    freshness: freshnessOf(observation, now),
  };
}

function stateReading(
  observations: readonly ObservationRecord[],
  attribute: string,
  now: Date,
): Reading<string> | undefined {
  const observation = latest(observations, attribute);
  if (observation === undefined) return undefined;
  if (observation.value.kind === 'state') {
    return {
      value: observation.value.state,
      at: observation.occurredAt,
      freshness: freshnessOf(observation, now),
    };
  }
  // "I cannot tell" is a real report, and it is not the same as no report.
  if (observation.value.kind === 'unsure') {
    return {
      value: 'Unsure',
      at: observation.occurredAt,
      freshness: freshnessOf(observation, now),
    };
  }
  return undefined;
}

const PAIN_BY_ORDINAL: Record<number, PainInterference> = {
  1: 'not-at-all',
  2: 'slightly',
  3: 'noticeably',
  4: 'a-lot',
  5: 'cannot-work-around-it',
};

const PERSISTENCE_BY_LABEL: Record<string, Persistence> = {
  'Today only': 'today',
  'A few days': 'days',
  'A couple of weeks': 'weeks',
  'Longer than a month': 'over-a-month',
  Unsure: 'unknown',
};

/* -------------------------------------------------------------------------- */

const BUCKETS: readonly {
  readonly label: string;
  readonly from: number;
  readonly to: number;
}[] = [
  { label: 'Early', from: 0, to: 9 },
  { label: 'Late morning', from: 9, to: 12 },
  { label: 'Afternoon', from: 12, to: 17 },
  { label: 'Evening', from: 17, to: 24 },
];

/**
 * Energy by part of day (task 7).
 *
 * Buckets with no evidence return `null` rather than being dropped. A chart that
 * silently omitted the mornings the owner never recorded would suggest their mornings
 * are fine, which is a claim nobody made.
 */
function timeOfDayPattern(
  observations: readonly ObservationRecord[],
): readonly TimeOfDayBucket[] {
  const energyAttributes = [
    scaleAttribute('energy'),
    scaleAttribute('physical-energy'),
    scaleAttribute('mental-energy'),
  ];

  const relevant = observations.filter(
    (observation) =>
      energyAttributes.includes(observation.attribute) &&
      observation.value.kind === 'anchored-scale',
  );

  return BUCKETS.map((bucket) => {
    const inBucket = relevant.filter((observation) => {
      const hour = new Date(observation.occurredAt).getHours();
      return hour >= bucket.from && hour < bucket.to;
    });

    if (inBucket.length === 0) return { label: bucket.label, value: null, count: 0 };

    const total = inBucket.reduce(
      (sum, observation) =>
        sum + (observation.value.kind === 'anchored-scale' ? observation.value.ordinal : 0),
      0,
    );
    return {
      label: bucket.label,
      value: Math.round((total / inBucket.length) * 10) / 10,
      count: inBucket.length,
    };
  });
}

/**
 * Two credible records that disagree about the same thing at the same time.
 *
 * Reported, never resolved. Phase 2 established that a conflict lowers confidence
 * rather than being decided for the owner, and health is the last place to start
 * picking a winner.
 */
function contradictionsIn(observations: readonly ObservationRecord[]): readonly string[] {
  const attributes = [
    scaleAttribute('physical-energy'),
    scaleAttribute('mental-energy'),
    scaleAttribute('pain-interference'),
    scaleAttribute('sleep-recovery'),
  ];

  return attributes.filter((attribute) => {
    const sameDay = observations.filter(
      (observation) =>
        observation.attribute === attribute &&
        observation.value.kind === 'anchored-scale' &&
        Math.abs(
          Date.parse(observation.occurredAt) - Date.parse(observations[0]?.occurredAt ?? ''),
        ) < DAY_MS,
    );
    if (sameDay.length < 2) return false;

    const ordinals = sameDay.flatMap((observation) =>
      observation.value.kind === 'anchored-scale' ? [observation.value.ordinal] : [],
    );
    const spread = Math.max(...ordinals) - Math.min(...ordinals);
    // Two steps apart within a day, recorded within an hour of each other, is a
    // disagreement rather than a change.
    const times = sameDay.map((observation) => Date.parse(observation.occurredAt));
    const close = Math.max(...times) - Math.min(...times) < HOUR_MS;
    return spread >= 2 && close;
  });
}

/* -------------------------------------------------------------------------- */

export function assessHealth(records: readonly CanonicalRecord[], now: Date): HealthEvidence {
  const observations = currentObservations(records).filter(
    (observation) =>
      observation.attribute.startsWith('health:') ||
      observation.attribute.startsWith('sleep:') ||
      observation.attribute.startsWith('food:') ||
      observation.attribute === scaleAttribute('energy') ||
      observation.attribute === scaleAttribute('physical-energy') ||
      observation.attribute === scaleAttribute('mental-energy') ||
      observation.attribute === scaleAttribute('sleep-recovery') ||
      observation.attribute === scaleAttribute('readiness') ||
      observation.attribute === scaleAttribute('pain-interference'),
  );

  const pain = ordinalReading(observations, scaleAttribute('pain-interference'), now);
  const persistenceRaw = stateReading(observations, 'health:persistence', now);

  const evidence: HealthEvidence = {
    physicalEnergy: ordinalReading(observations, scaleAttribute('physical-energy'), now),
    mentalEnergy: ordinalReading(observations, scaleAttribute('mental-energy'), now),
    generalEnergy: ordinalReading(observations, scaleAttribute('energy'), now),
    recovery: ordinalReading(observations, scaleAttribute('sleep-recovery'), now),
    readiness: ordinalReading(observations, scaleAttribute('readiness'), now),
    sleepiness: stateReading(observations, 'sleep:sleepiness', now),
    painInterference:
      pain === undefined
        ? undefined
        : {
            value: PAIN_BY_ORDINAL[pain.value] ?? 'not-at-all',
            at: pain.at,
            freshness: pain.freshness,
          },
    persistence:
      persistenceRaw === undefined
        ? undefined
        : {
            value: PERSISTENCE_BY_LABEL[persistenceRaw.value] ?? 'unknown',
            at: persistenceRaw.at,
            freshness: persistenceRaw.freshness,
          },
    hydration: stateReading(observations, 'health:hydration', now),
    foodNeed: stateReading(observations, 'health:food-need', now),
    movement: stateReading(observations, 'health:movement', now),
    digestiveResponse: stateReading(observations, 'food:digestive-response', now),
    timeOfDay: timeOfDayPattern(observations),
    observationCount: observations.length,
    anyEvidence: observations.length > 0,
    contradictions: contradictionsIn(observations),
  };

  return evidence;
}

/** The visible label for an ordinal reading, for display and for reason traces. */
export function labelFor(
  scaleId: Parameters<typeof scaleAttribute>[0],
  ordinal: number,
): string {
  return anchorLabel(scaleId, ordinal) ?? 'Unknown';
}
