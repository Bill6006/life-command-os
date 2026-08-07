/**
 * Local time (v3.3 `V33-031`).
 *
 * ## The bug this exists to end
 *
 * Owner testing showed the app four hours ahead of the phone. The cause was
 * `toLocaleString(..., { timeZone: 'UTC' })` formatting the clock on Now: canonical
 * instants are stored in UTC, correctly, and the display was showing them *as* UTC rather
 * than converting them to where the owner actually is. During EDT that is exactly four
 * hours, which is why the number looked like an offset bug rather than a formatting one.
 *
 * ## The rule
 *
 * **Canonical stays UTC. Everything a person reads, and every decision keyed to the hour,
 * goes through this module.** Those are different jobs and conflating them is what produced
 * the defect.
 *
 * ## Why `Intl` rather than arithmetic
 *
 * Every function here formats through `Intl.DateTimeFormat` with an explicit IANA zone.
 * That is DST-safe by construction: the runtime holds the tz database and knows that
 * America/New_York was −4 in July and −5 in January. Any implementation that adds or
 * subtracts a fixed offset is wrong twice a year, and a hardcoded −4 or −5 is wrong for
 * half of it — which is why neither appears anywhere in this file.
 *
 * ## Where the zone comes from
 *
 * The device, via `Intl.DateTimeFormat().resolvedOptions().timeZone`. Every function takes
 * an optional explicit zone so the tests can assert America/New_York in both standard and
 * daylight time without touching `process.env.TZ` and without depending on where the
 * machine running them happens to be.
 */

/** The device's IANA zone, or UTC when the runtime cannot say. */
export function deviceTimeZone(): string {
  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return resolved === '' ? 'UTC' : resolved;
}

export interface LocalParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  /** Long weekday in the owner's locale-independent English form. */
  readonly weekday: string;
  /** Minutes from midnight, for hour-keyed decisions. */
  readonly minutesFromMidnight: number;
}

const PARTS_FORMAT = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  const cached = PARTS_FORMAT.get(timeZone);
  if (cached !== undefined) return cached;
  const created = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  PARTS_FORMAT.set(timeZone, created);
  return created;
}

/**
 * One instant, as the owner's wall clock reads it.
 *
 * `formatToParts` rather than string parsing, because the shape of a formatted date is a
 * locale detail and reading it back with a regular expression is how a formatter change
 * becomes a silent date bug.
 */
export function localParts(instant: Date, timeZone: string = deviceTimeZone()): LocalParts {
  const parts = new Map<string, string>(
    partsFormatter(timeZone)
      .formatToParts(instant)
      .map((part) => [part.type as string, part.value]),
  );

  const number = (type: string): number => Number(parts.get(type) ?? '0');
  /* `24` appears at midnight in some runtimes; it means hour zero of the same day. */
  const rawHour = number('hour');
  const hour = rawHour === 24 ? 0 : rawHour;
  const minute = number('minute');

  return {
    year: number('year'),
    month: number('month'),
    day: number('day'),
    hour,
    minute,
    weekday: parts.get('weekday') ?? '',
    minutesFromMidnight: hour * 60 + minute,
  };
}

/** The clock line on Now: `Friday 07:17`, in the owner's own time. */
export function formatLocalClock(instant: Date, timeZone: string = deviceTimeZone()): string {
  const parts = localParts(instant, timeZone);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${parts.weekday} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** A short date for evidence lines: `9 Aug`. Local, never UTC. */
export function formatLocalShortDate(
  instant: Date,
  timeZone: string = deviceTimeZone(),
): string {
  const parts = localParts(instant, timeZone);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short' }).format(instant);
  return `${String(parts.day)} ${month}`;
}

/** The calendar day in the owner's zone, as `YYYY-MM-DD`. Used to group by day. */
export function localDayKey(instant: Date, timeZone: string = deviceTimeZone()): string {
  const parts = localParts(instant, timeZone);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(parts.year)}-${pad(parts.month)}-${pad(parts.day)}`;
}

/* -------------------------------------------------------------------------- */
/* Time blocks                                                                 */
/* -------------------------------------------------------------------------- */

export const TIME_BLOCKS = ['morning', 'afternoon', 'evening'] as const;
export type TimeBlock = (typeof TIME_BLOCKS)[number];

/** Boundaries in local wall-clock hours. Morning ends at 11, afternoon at 17. */
const AFTERNOON_FROM = 11;
const EVENING_FROM = 17;

/**
 * Which part of the owner's day it is.
 *
 * Previously derived from `Date#getHours`, which is the *runtime's* zone. In a browser that
 * is the device and was right by accident; in Node it is whatever the machine is set to,
 * which made the behaviour untestable and would have been wrong for anyone whose device
 * zone differs from the process zone.
 */
export function timeBlockAt(instant: Date, timeZone: string = deviceTimeZone()): TimeBlock {
  const { hour } = localParts(instant, timeZone);
  if (hour < AFTERNOON_FROM) return 'morning';
  if (hour < EVENING_FROM) return 'afternoon';
  return 'evening';
}

/** True when the morning guide is being opened after the morning has passed. */
export function isAfterMorning(instant: Date, timeZone: string = deviceTimeZone()): boolean {
  return localParts(instant, timeZone).hour >= AFTERNOON_FROM;
}

/** Sunday, in the owner's zone rather than the runtime's. */
export function isSunday(instant: Date, timeZone: string = deviceTimeZone()): boolean {
  return localParts(instant, timeZone).weekday === 'Sunday';
}

/* -------------------------------------------------------------------------- */
/* Bedtime proximity                                                           */
/* -------------------------------------------------------------------------- */

/** Parses `HH:MM` into minutes from midnight, or `undefined` if it is not a time. */
export function parseClockTime(value: string): number | undefined {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match === null) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return undefined;
  return hour * 60 + minute;
}

/**
 * Minutes until the owner's usual bedtime, in their own zone.
 *
 * Wraps past midnight: a bedtime of 23:00 seen at 00:30 is twenty-two and a half hours
 * away, not minus ninety minutes. Getting that wrong would make the small hours look like
 * the safest time to suggest something, which is precisely backwards.
 */
export function minutesUntilBedtime(
  instant: Date,
  bedtime: string,
  timeZone: string = deviceTimeZone(),
): number | undefined {
  const target = parseClockTime(bedtime);
  if (target === undefined) return undefined;
  const nowMinutes = localParts(instant, timeZone).minutesFromMidnight;
  const difference = target - nowMinutes;
  return difference >= 0 ? difference : difference + 24 * 60;
}
