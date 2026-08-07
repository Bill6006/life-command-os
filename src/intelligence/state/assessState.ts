import type { CanonicalRecord, EvidenceValue, ProtectedContext } from '../../domain/records';
import { knownValue } from '../../domain/records';
import {
  ATTRIBUTES,
  assessConfidence,
  assessFreshnessStatus,
  currentObservations,
  latestContext,
} from '../support';
import type { Reading, StateAssessment } from '../types';
import type { SituationalCapacity } from '../../domain/domains/capacity';
import { inferSituationPrior } from './recurringContext';

/**
 * Deterministic current-state understanding (`STATE-CAPACITY`).
 *
 * Reads the most recent context snapshot and reports each field with its own
 * evidence status. It does not infer, smooth, or impute — an unknown capacity
 * stays unknown, because the whole point of the evidence wrapper is that "we do
 * not know how much time you have" and "you have no time" are different inputs to
 * a decision.
 *
 * Contradictions are detected, reported, and left unresolved. Picking a winner
 * between two credible records would hide exactly the thing that should reduce
 * confidence.
 */

/** How old a context snapshot may be before it stops answering "right now". */
const CONTEXT_USEFUL_AGE_MS = 4 * 60 * 60 * 1000;

/**
 * How long a situation report describes the present.
 *
 * Shorter than the snapshot window, because these answer "where are you *right now*".
 * Three hours is long enough to cover a working morning and short enough that an
 * afternoon does not inherit it.
 */
const SITUATION_USEFUL_AGE_MS = 3 * 60 * 60 * 1000;

function describeCapacity(value: EvidenceValue<string>): string {
  switch (value.status) {
    case 'known':
      return value.value.charAt(0).toUpperCase() + value.value.slice(1);
    case 'unknown':
      return 'Unknown';
    case 'not-applicable':
      return 'Not applicable';
    case 'conflicting':
      return 'Conflicting';
    case 'unresolved':
      return 'Awaiting';
  }
}

function describeMinutes(value: EvidenceValue<number>): EvidenceValue<string> {
  if (value.status !== 'known') return value;
  return { status: 'known', value: `${String(Math.round(value.value))} min` };
}

/**
 * The situation, read from what the owner has actually said (`V33-023`, clarification 2).
 *
 * Four plain observations — where they are, what they are in the middle of, whether they
 * can step away, whether they can speak freely — plus the minute count when one exists.
 * Together these decide which *shapes* of move are possible, which is the question a
 * duration alone can never answer.
 *
 * Anything unsaid stays `undefined` and blocks nothing. See `capacity.fits`.
 */
function readSituation(
  observations: readonly {
    readonly attribute: string;
    readonly value: unknown;
    readonly occurredAt: string;
  }[],
  availableMinutes: EvidenceValue<number>,
  now: Date,
): SituationalCapacity {
  /*
   * The latest answer, and only if it is still about now.
   *
   * Two things went wrong in the first version of this. It took the *first* matching
   * observation rather than the most recent, so a four-week-old "at work" outranked what
   * the owner said this morning. And it had no recency window at all, which meant a
   * situation report never expired — the app would go on believing you were at the office
   * a month after you said so. Where you were is not where you are.
   */
  const answerTo = (attribute: string): string | undefined => {
    let latest: { at: number; state: string } | undefined;
    for (const observation of observations) {
      if (observation.attribute !== attribute) continue;
      const value = observation.value as { kind?: string; state?: string } | undefined;
      if (value?.kind !== 'state' || value.state === undefined) continue;

      const at = Date.parse(observation.occurredAt);
      if (Number.isNaN(at)) continue;
      if (now.getTime() - at > SITUATION_USEFUL_AGE_MS) continue;
      if (latest === undefined || at > latest.at) latest = { at, state: value.state };
    }
    return latest?.state;
  };

  const minutes = knownValue(availableMinutes);

  return {
    setting: SETTINGS[answerTo('context:setting') ?? ''],
    engagement: ENGAGEMENTS[answerTo('context:engagement') ?? ''],
    interruptibility: INTERRUPTIBILITY[answerTo('context:interruptibility') ?? ''],
    privacy: PRIVACY[answerTo('context:privacy') ?? ''],
    minutesFree: minutes,
  };
}

/*
 * Answer text to model value. Explicit maps rather than string munging, so a reworded
 * answer is a compile-time gap rather than a silent `undefined` that reads as "unknown".
 */
const SETTINGS: Record<string, SituationalCapacity['setting']> = {
  Home: 'home',
  Work: 'work',
  'Out and about': 'out',
  Travelling: 'travelling',
  'Somewhere else': 'other',
};

const ENGAGEMENTS: Record<string, SituationalCapacity['engagement']> = {
  'Nothing in particular': 'free',
  Working: 'working',
  'With family': 'with-family',
  Eating: 'eating',
  Travelling: 'travelling',
  'Winding down': 'winding-down',
};

const INTERRUPTIBILITY: Record<string, SituationalCapacity['interruptibility']> = {
  'Yes, freely': 'free',
  Briefly: 'brief',
  'Not right now': 'none',
};

const PRIVACY: Record<string, SituationalCapacity['privacy']> = {
  Yes: 'private',
  'Only quietly': 'semi-private',
  'No — around other people': 'public',
};

export function assessState(records: readonly CanonicalRecord[], now: Date): StateAssessment {
  const context = latestContext(records);
  const observations = currentObservations(records);

  const freshness = assessFreshnessStatus(context?.recordedAt, now, CONTEXT_USEFUL_AGE_MS);

  const availableMinutes: EvidenceValue<number> = context?.availableMinutes ?? {
    status: 'unknown',
    reason: 'No context snapshot recorded',
  };
  const capacity: EvidenceValue<'depleted' | 'low' | 'moderate' | 'high'> =
    context?.capacity ?? { status: 'unknown', reason: 'No context snapshot recorded' };
  const protectedContexts: readonly ProtectedContext[] = context?.protectedContexts ?? [];

  /*
   * Contradiction detection: two current observations of the same attribute
   * covering the same day with different values. Corrections are already resolved
   * by supersession, so anything left genuinely disagrees.
   */
  const contradictions: { attribute: string; recordIds: string[] }[] = [];
  const byAttributeDay = new Map<string, { value: string; recordId: string }[]>();
  for (const observation of observations) {
    const day = observation.occurredAt.slice(0, 10);
    const key = `${observation.attribute}::${day}`;
    const value = JSON.stringify(observation.value);
    const bucket = byAttributeDay.get(key) ?? [];
    bucket.push({ value, recordId: observation.recordId });
    byAttributeDay.set(key, bucket);
  }
  for (const [key, entries] of byAttributeDay) {
    const distinct = new Set(entries.map((entry) => entry.value));
    if (entries.length > 1 && distinct.size > 1) {
      contradictions.push({
        attribute: key.split('::')[0] ?? key,
        recordIds: entries.map((entry) => entry.recordId),
      });
    }
  }

  const unknowns: string[] = [];
  if (availableMinutes.status !== 'known') unknowns.push('How much time is genuinely free');
  if (capacity.status !== 'known') unknowns.push('Current capacity');
  if (context === undefined) unknowns.push('Whether any context is protected right now');

  const staleAttributes: string[] = [];
  if (freshness === 'stale') staleAttributes.push('Context snapshot');

  const capacityValue: EvidenceValue<string> =
    capacity.status === 'known' ? { status: 'known', value: capacity.value } : capacity;

  const readings: Reading[] = [
    {
      label: 'Time free',
      value: describeMinutes(availableMinutes),
      evidence: 'observed',
      basis: context === undefined ? 'No context recorded' : 'From the latest context snapshot',
      freshness,
    },
    {
      label: 'Capacity',
      value: {
        ...capacityValue,
        ...(capacityValue.status === 'known' ? { value: describeCapacity(capacityValue) } : {}),
      },
      // Capacity is a judgement over observations, not a reading off an instrument.
      evidence: 'inferred',
      basis:
        observations.length === 0
          ? 'No observations to infer from'
          : `From ${String(observations.length)} observation${observations.length === 1 ? '' : 's'}`,
      freshness,
    },
    {
      label: 'Protected',
      value:
        context === undefined
          ? { status: 'unknown', reason: 'No context snapshot recorded' }
          : protectedContexts.length === 0
            ? { status: 'known', value: 'Nothing protected' }
            : { status: 'known', value: protectedContexts.join(', ') },
      evidence: 'observed',
      basis: context === undefined ? 'No context recorded' : 'Declared in the context snapshot',
      freshness,
    },
  ];

  const focusObservations = observations.filter(
    (observation) => observation.attribute === ATTRIBUTES.focusedBlockMinutes,
  );

  const confidence = assessConfidence({
    comparableCount: observations.length,
    freshness,
    consistent: contradictions.length === 0,
    complete: availableMinutes.status === 'known' || capacity.status === 'known',
  });

  return {
    readings,
    availableMinutes,
    situation: readSituation(observations, availableMinutes, now),
    /*
     * Kept strictly apart from `situation` (`V33-028`, clarification 11). What usually
     * happens on a Tuesday morning is a guess; only what the owner said today decides
     * what is possible. Nothing that filters candidates receives this.
     */
    situationPrior: inferSituationPrior(records, now),
    capacity,
    protectedContexts,
    contradictions,
    unknowns,
    staleAttributes,
    basisRecordIds: [
      ...(context === undefined ? [] : [context.recordId]),
      ...focusObservations.map((observation) => observation.recordId),
    ],
    confidence,
  };
}

/** Reads free minutes only when genuinely known. There is no defaulting variant. */
export function freeMinutes(state: StateAssessment): number | undefined {
  return knownValue(state.availableMinutes);
}
