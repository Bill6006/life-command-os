import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  formatLocalClock,
  formatLocalShortDate,
  isAfterMorning,
  isSunday,
  localDayKey,
  localParts,
  minutesUntilBedtime,
  parseClockTime,
  timeBlockAt,
} from '../../src/domain/time/localTime';
import {
  IDEMPOTENCY_WINDOW_MS,
  existingWithKey,
  logicalEventKey,
} from '../../src/domain/policies/idempotency';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * v3.3 section A: the owner-observed integrity and time bugs.
 *
 * Each block is one reported defect, asserted against the behaviour rather than the copy.
 */

const NY = 'America/New_York';

/* -------------------------------------------------------------------------- */

describe('A1. local time is the owner’s, not the canonical instant’s (V33-031)', () => {
  it('shows EDT rather than UTC — the exact four-hour error the owner saw', () => {
    /*
     * 2026-08-07T15:17Z is 11:17 in New York during daylight time. The clock read
     * `15:17` because it formatted the stored instant as UTC, which is four hours ahead —
     * the number the owner photographed.
     */
    const instant = new Date('2026-08-07T15:17:00.000Z');
    expect(formatLocalClock(instant, NY)).toBe('Friday 11:17');
    expect(formatLocalClock(instant, 'UTC')).toBe('Friday 15:17');
  });

  it('handles EST, where the same conversion is five hours', () => {
    const instant = new Date('2026-01-09T15:17:00.000Z');
    expect(formatLocalClock(instant, NY)).toBe('Friday 10:17');
  });

  it('crosses the DST boundary without a fixed offset (AT33-002)', () => {
    /*
     * The spring-forward Sunday. 05:59Z is 00:59 EST; 07:01Z is 03:01 EDT. Any
     * implementation adding a constant −4 or −5 gets one of these wrong.
     */
    const before = new Date('2026-03-08T05:59:00.000Z');
    const after = new Date('2026-03-08T07:01:00.000Z');

    expect(localParts(before, NY).hour).toBe(0);
    expect(localParts(after, NY).hour).toBe(3);
    expect(
      localParts(after, NY).minutesFromMidnight - localParts(before, NY).minutesFromMidnight,
    ).toBe(122);
  });

  it('names the local calendar day, not the UTC one', () => {
    // 01:30Z on the 9th is still the evening of the 8th in New York.
    const instant = new Date('2026-08-09T01:30:00.000Z');
    expect(localDayKey(instant, NY)).toBe('2026-08-08');
    expect(formatLocalShortDate(instant, NY)).toBe('8 Aug');
  });

  it('decides the time block from local hours (AT33-001)', () => {
    const morning = new Date('2026-08-07T13:00:00.000Z'); // 09:00 EDT
    const afternoon = new Date('2026-08-07T18:00:00.000Z'); // 14:00 EDT
    const evening = new Date('2026-08-07T23:00:00.000Z'); // 19:00 EDT

    expect(timeBlockAt(morning, NY)).toBe('morning');
    expect(timeBlockAt(afternoon, NY)).toBe('afternoon');
    expect(timeBlockAt(evening, NY)).toBe('evening');

    /* The same instants read as afternoon/evening/evening in UTC — the old behaviour. */
    expect(timeBlockAt(morning, 'UTC')).toBe('afternoon');

    expect(isAfterMorning(morning, NY)).toBe(false);
    expect(isAfterMorning(afternoon, NY)).toBe(true);
  });

  it('reads the weekday locally too', () => {
    // 02:00Z Monday is still Sunday evening in New York.
    const instant = new Date('2026-08-10T02:00:00.000Z');
    expect(isSunday(instant, NY)).toBe(true);
    expect(isSunday(instant, 'UTC')).toBe(false);
  });

  it('measures bedtime proximity in local time and wraps past midnight', () => {
    const evening = new Date('2026-08-07T23:30:00.000Z'); // 19:30 EDT
    expect(minutesUntilBedtime(evening, '22:30', NY)).toBe(180);

    const afterMidnight = new Date('2026-08-08T04:30:00.000Z'); // 00:30 EDT
    expect(minutesUntilBedtime(afterMidnight, '22:30', NY)).toBe(22 * 60);

    expect(parseClockTime('7:05')).toBe(425);
    expect(parseClockTime('25:00')).toBeUndefined();
    expect(minutesUntilBedtime(evening, 'nonsense', NY)).toBeUndefined();
  });

  it('embeds no fixed offset anywhere in the time service', () => {
    /*
     * The failure mode this replaced. A constant is right for half the year and produces
     * exactly the bug that was reported for the other half.
     */
    const source = readTimeServiceSource();

    // No fixed offset arithmetic anywhere.
    expect(source).not.toMatch(/[-+]\s*4\s*\*\s*60/);
    expect(source).not.toMatch(/[-+]\s*5\s*\*\s*60/);
    expect(source).not.toMatch(/getTimezoneOffset/);

    /*
     * And nothing pins a formatter to UTC, which was the actual defect. The single
     * remaining mention is the fallback used when the runtime cannot name a zone at all —
     * a correct default, and the only honest one.
     */
    expect(source).not.toMatch(/timeZone:\s*'UTC'/);
    expect(source.match(/UTC/g) ?? []).toHaveLength(1);
  });
});

function readTimeServiceSource(): string {
  return readFileSync('src/domain/time/localTime.ts', 'utf8')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//');
    })
    .join('\n');
}

/* -------------------------------------------------------------------------- */

describe('A2. one logical event, one canonical record (V33-061)', () => {
  it('builds the same key for the same act and different keys for different acts', () => {
    const a = logicalEventKey('guide-session', ['morning', '30', 'completed', ['x', 'y'], []]);
    const b = logicalEventKey('guide-session', ['morning', '30', 'completed', ['y', 'x'], []]);
    const c = logicalEventKey('guide-session', ['morning', '30', 'completed', ['x'], []]);

    // Order of a set must not change identity.
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('suppresses a repeat inside the window and allows a genuine one later (AT33-009)', () => {
    const key = logicalEventKey('guide-session', ['morning', '30', 'completed', [], []]);
    const first = {
      recordType: 'guide-session',
      recordedAt: '2026-08-07T15:00:00.000Z',
      idempotencyKey: key,
    } as unknown as CanonicalRecord;

    const secondsLater = new Date('2026-08-07T15:00:03.000Z');
    expect(existingWithKey([first], key, secondsLater)).toBeDefined();

    const tomorrow = new Date('2026-08-08T15:00:00.000Z');
    expect(existingWithKey([first], key, tomorrow)).toBeUndefined();

    expect(IDEMPOTENCY_WINDOW_MS).toBe(2 * 60 * 1000);
  });

  it('never matches a record that carries no key', () => {
    const bare = {
      recordType: 'guide-session',
      recordedAt: '2026-08-07T15:00:00.000Z',
    } as unknown as CanonicalRecord;
    expect(
      existingWithKey([bare], 'anything', new Date('2026-08-07T15:00:01.000Z')),
    ).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('A3. Answer it asks the displayed question (V33-049, V33-050)', () => {
  it('carries the question’s identity on the output, not only its text', () => {
    const scenario = scenarioById('one-question');
    const episode = runEpisode(scenario.records, new Date(scenario.nowIso));

    expect(episode.output.kind).toBe('question');
    if (episode.output.kind === 'question') {
      expect(episode.output.promptId).toBe('context:available-minutes');
      expect(episode.output.prompt.length).toBeGreaterThan(0);
    }
  });

  it('leads the plan with exactly that prompt', () => {
    const plan = planGuide(
      'quick-check-in',
      '15',
      [],
      new Date('2026-08-07T15:00:00.000Z'),
      undefined,
      { suppressed: new Map(), offered: [] },
      'context:available-minutes',
    );

    const first = required(plan.steps[0], 'the first step');
    expect(first.kind).toBe('prompt');
    if (first.kind === 'prompt') {
      expect(first.prompt.promptId).toBe('context:available-minutes');
    }
  });

  it('does not ask the same question twice in one flow', () => {
    const plan = planGuide(
      'quick-check-in',
      'full',
      [],
      new Date('2026-08-07T15:00:00.000Z'),
      undefined,
      { suppressed: new Map(), offered: [] },
      'context:available-minutes',
    );

    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids.filter((id) => id === 'context:available-minutes')).toHaveLength(1);
  });

  it('asks the displayed question even when suppression would have removed it', () => {
    /*
     * The owner tapped `Answer it` on this exact question. Suppression governs what the app
     * raises unasked; it cannot silence the thing the owner just chose to answer.
     */
    const plan = planGuide(
      'quick-check-in',
      '15',
      [],
      new Date('2026-08-07T15:00:00.000Z'),
      undefined,
      {
        suppressed: new Map([['context:available-minutes', 'In cooldown']]),
        offered: [],
      },
      'context:available-minutes',
    );

    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids[0]).toBe('context:available-minutes');
  });
});
