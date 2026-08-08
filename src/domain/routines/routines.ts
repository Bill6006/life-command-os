import type { CanonicalRecord, ObservationRecord } from '../records';

/**
 * Recurring boundaries the owner has set, and what actually happened (v3.3 section J7–J10).
 *
 * ## Two different things that look alike
 *
 * A **usual bedtime** is an intention: what the owner is aiming at. An **actual bedtime**
 * is an observation: what happened last night. `AT33-043` requires both, kept apart, and
 * the reason is that collapsing them destroys the only interesting question — whether the
 * intention is being met. A system holding one number cannot tell you that you have missed
 * your bedtime for a fortnight; it can only tell you what your bedtime is, and then be
 * quietly wrong about it.
 *
 * So the intention lives under `routine:*` and the observation stays under `sleep:*`,
 * which already existed. Nothing here overwrites an observation with a target or the other
 * way round.
 *
 * ## Soft, not a cage (`J10`)
 *
 * A routine is a **prior**, never a constraint. A recurring 10:30 bedtime does not make an
 * eleven o'clock action impossible — people have evenings. It shifts what the engine
 * prefers and it can be overridden by the situation, and there is deliberately no function
 * in this file that returns "forbidden". The strongest thing a routine can do is make
 * stopping look better than continuing, which the arbiter is then free to weigh.
 *
 * ## Not a habit tracker
 *
 * Only boundaries that change a decision are here: when the day should end, when it should
 * start, when the phone goes down. There is no streak, no completion rate, and no way to
 * add "water the plants" — J7 is explicit that a routine exists because it changes a
 * decision, and an open-ended list of repeatable things is a chore manager.
 */

/** The recurring boundaries this product will hold. Deliberately a closed list. */
export const ROUTINE_KINDS = ['usual-bedtime', 'usual-wake', 'phone-cutoff'] as const;
export type RoutineKind = (typeof ROUTINE_KINDS)[number];

export const ROUTINE_ATTRIBUTES: Record<RoutineKind, string> = {
  'usual-bedtime': 'routine:usual-bedtime',
  'usual-wake': 'routine:usual-wake',
  'phone-cutoff': 'routine:phone-cutoff',
};

/** What actually happened, as opposed to what was intended. */
export const ACTUAL_BEDTIME_ATTRIBUTE = 'sleep:bedtime';

export interface Routine {
  readonly kind: RoutineKind;
  /** Minutes past local midnight. */
  readonly minutesIntoDay: number;
  readonly setAt: string;
}

function minutesFromLocalIso(value: string): number | undefined {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  const date = new Date(parsed);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function latestObservation(
  records: readonly CanonicalRecord[],
  attribute: string,
): ObservationRecord | undefined {
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesRecordId === undefined ? [] : [record.supersedesRecordId],
    ),
  );

  return records
    .filter(
      (record): record is ObservationRecord =>
        record.recordType === 'observation' && record.attribute === attribute,
    )
    .filter((record) => !superseded.has(record.recordId))
    .reduce<ObservationRecord | undefined>(
      (newest, record) =>
        newest === undefined || record.recordedAt > newest.recordedAt ? record : newest,
      undefined,
    );
}

/** The boundary the owner has set for one kind, if they have set one. */
export function routineFor(
  records: readonly CanonicalRecord[],
  kind: RoutineKind,
): Routine | undefined {
  const found = latestObservation(records, ROUTINE_ATTRIBUTES[kind]);
  if (found === undefined) return undefined;
  if (found.value.kind !== 'state') return undefined;

  const minutes = minutesFromLocalIso(found.value.state);
  if (minutes === undefined) return undefined;

  return { kind, minutesIntoDay: minutes, setAt: found.recordedAt };
}

/**
 * How long until the owner's usual bedtime, in minutes.
 *
 * `undefined` when no bedtime has been set — and that is genuinely unknown, not "plenty of
 * time". An engine that assumed a default bedtime would be inventing a fact about somebody's
 * evening in order to have an opinion about it.
 *
 * Negative means the bedtime has already passed, which is a real and common state rather
 * than an error: it is eleven, the target was half ten, and that is exactly when the
 * question of whether to start something else matters most.
 */
export function minutesToUsualBedtime(
  records: readonly CanonicalRecord[],
  now: Date,
  utcOffsetMinutes: number,
): number | undefined {
  const bedtime = routineFor(records, 'usual-bedtime');
  if (bedtime === undefined) return undefined;

  const local = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  const nowMinutes = local.getUTCHours() * 60 + local.getUTCMinutes();

  const delta = bedtime.minutesIntoDay - nowMinutes;

  /*
   * A bedtime after midnight read from before midnight, or the reverse. Anything more than
   * twelve hours away is the previous or next day's instance, and wrapping is more honest
   * than reporting fourteen hours until bedtime at nine in the morning.
   */
  if (delta > 12 * 60) return delta - 24 * 60;
  if (delta < -12 * 60) return delta + 24 * 60;
  return delta;
}

export interface RoutineComparison {
  readonly kind: RoutineKind;
  readonly intended: number;
  readonly actual: number;
  /** Positive when the actual was later than intended. */
  readonly driftMinutes: number;
}

/**
 * The intention beside what happened, for one night.
 *
 * Returns `undefined` unless *both* exist. A target with no observation is not a missed
 * bedtime, and an observation with no target is not a failure — neither can be reported as
 * drift without inventing the other half.
 */
export function bedtimeDrift(
  records: readonly CanonicalRecord[],
): RoutineComparison | undefined {
  const intended = routineFor(records, 'usual-bedtime');
  if (intended === undefined) return undefined;

  const observed = latestObservation(records, ACTUAL_BEDTIME_ATTRIBUTE);
  if (observed?.value.kind !== 'state') return undefined;

  const actual = minutesFromLocalIso(observed.value.state);
  if (actual === undefined) return undefined;

  let drift = actual - intended.minutesIntoDay;
  if (drift > 12 * 60) drift -= 24 * 60;
  if (drift < -12 * 60) drift += 24 * 60;

  return {
    kind: 'usual-bedtime',
    intended: intended.minutesIntoDay,
    actual,
    driftMinutes: drift,
  };
}
