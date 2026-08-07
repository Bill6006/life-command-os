import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AGREEMENT_THRESHOLD,
  MINIMUM_OCCURRENCES,
  expected,
  inferSituationPrior,
} from '../../src/intelligence/state/recurringContext';
import { assessState } from '../../src/intelligence/state/assessState';
import { runEpisode } from '../../src/intelligence';
import { fits } from '../../src/domain/domains/capacity';
import type { CanonicalRecord } from '../../src/domain/records';

/**
 * Owner clarification 11: a recurring pattern predicts, it does not bind.
 *
 * The failure being designed against is quiet. An app that has learned "Monday morning
 * means the office" and treats that as a fact will, on the one Monday the owner works from
 * home, silently withhold every move it had learned to suppress — and give no sign that it
 * is reasoning from a guess rather than from evidence.
 */

/* A Tuesday morning in New York: 09:00 EDT. */
const NOW = new Date('2026-08-11T13:00:00.000Z');
const ZONE = 'America/New_York';

let counter = 0;
function said(attribute: string, state: string, iso: string): CanonicalRecord {
  counter += 1;
  return {
    recordType: 'observation',
    recordId: `rc-${String(counter)}`,
    schemaVersion: 1,
    occurredAt: iso,
    recordedAt: iso,
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    category: 'time-attention-capacity',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/** The four preceding Tuesday mornings, all at work. */
function fourTuesdaysAtWork(): CanonicalRecord[] {
  return ['2026-08-04', '2026-07-28', '2026-07-21', '2026-07-14'].flatMap((day) => [
    said('context:setting', 'Work', `${day}T13:00:00.000Z`),
    said('context:privacy', 'No — around other people', `${day}T13:00:00.000Z`),
  ]);
}

/* -------------------------------------------------------------------------- */

describe('a pattern has to earn the name', () => {
  it('guesses nothing from a single occurrence', () => {
    const prior = inferSituationPrior(
      [said('context:setting', 'Work', '2026-08-04T13:00:00.000Z')],
      NOW,
      ZONE,
    );
    expect(prior.usually.setting).toBeUndefined();
    expect(MINIMUM_OCCURRENCES).toBeGreaterThan(1);
  });

  it('guesses from four consistent Tuesday mornings', () => {
    const prior = inferSituationPrior(fourTuesdaysAtWork(), NOW, ZONE);
    expect(prior.usually.setting).toBe('work');
    expect(prior.fromDays).toBe(4);
    expect(prior.because.join(' ')).toMatch(/Work on 4 of the last 4/);
  });

  it('refuses to guess when the days disagree', () => {
    const mixed = [
      said('context:setting', 'Work', '2026-08-04T13:00:00.000Z'),
      said('context:setting', 'Home', '2026-07-28T13:00:00.000Z'),
      said('context:setting', 'Work', '2026-07-21T13:00:00.000Z'),
      said('context:setting', 'Home', '2026-07-14T13:00:00.000Z'),
    ];
    expect(inferSituationPrior(mixed, NOW, ZONE).usually.setting).toBeUndefined();
    expect(AGREEMENT_THRESHOLD).toBeGreaterThan(0.5);
  });

  it('does not let one busy day outvote four weeks', () => {
    /*
     * One vote per day. Six reports from a single unusual Monday must not look like six
     * Mondays, which is the shape of every naive frequency count.
     */
    const oneLoudDay = Array.from({ length: 6 }, (_, index) =>
      said('context:setting', 'Home', `2026-08-04T1${String(index)}:00:00.000Z`),
    );
    expect(inferSituationPrior(oneLoudDay, NOW, ZONE).usually.setting).toBeUndefined();
  });

  it('compares like with like: the same weekday and the same part of the day', () => {
    /* Four Tuesday *evenings* say nothing about a Tuesday morning. */
    const evenings = ['2026-08-04', '2026-07-28', '2026-07-21', '2026-07-14'].map((day) =>
      said('context:setting', 'Home', `${day}T23:00:00.000Z`),
    );
    expect(inferSituationPrior(evenings, NOW, ZONE).usually.setting).toBeUndefined();
  });

  it('never counts today, so a prior cannot confirm itself', () => {
    const withToday = [
      ...fourTuesdaysAtWork(),
      said('context:setting', 'Home', '2026-08-11T12:00:00.000Z'),
    ];
    /* Still four days, not five, and still the historic answer. */
    expect(inferSituationPrior(withToday, NOW, ZONE).fromDays).toBe(4);
  });
});

/* -------------------------------------------------------------------------- */

describe('fresh explicit context overrides the pattern immediately', () => {
  it('prefers what the owner said today over four weeks of history', () => {
    /* The Tuesday he works from home. */
    const records = [
      ...fourTuesdaysAtWork(),
      said('context:setting', 'Home', '2026-08-11T12:30:00.000Z'),
    ];
    const state = assessState(records, NOW);

    expect(state.situation.setting).toBe('home');
    expect(state.situationPrior.usually.setting).toBe('work');

    const answer = expected(state.situation, state.situationPrior, 'setting');
    expect(answer).toEqual({ value: 'home', source: 'observed' });
  });

  it('labels a guess as a guess, and an absence as an absence', () => {
    const prior = inferSituationPrior(fourTuesdaysAtWork(), NOW, ZONE);

    expect(expected({}, prior, 'setting')).toEqual({ value: 'work', source: 'assumed' });
    expect(expected({}, prior, 'engagement')).toEqual({ value: undefined, source: 'none' });
  });

  it('releases a move the pattern would have suppressed, the day the context changes', () => {
    /*
     * The exact case in the clarification. A `protected-focus` move is impossible at work.
     * Four Tuesdays at work must not keep it impossible on the Tuesday he is at home.
     */
    const focus = { shape: 'protected-focus' } as const;
    const records = [
      ...fourTuesdaysAtWork(),
      said('context:setting', 'Home', '2026-08-11T12:30:00.000Z'),
      said('context:privacy', 'Yes', '2026-08-11T12:30:00.000Z'),
    ];
    const state = assessState(records, NOW);

    expect(fits(focus, state.situation).eligible).toBe(true);

    /* And it would have been blocked had he actually been at work. */
    expect(fits(focus, { setting: 'work' }).eligible).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('a prior can never make a move ineligible', () => {
  it('leaves everything eligible when only the pattern says otherwise', () => {
    /*
     * Four Tuesdays at work and around people, and nothing said today. A prior that
     * leaked into eligibility would rule out every focus move here.
     */
    const state = assessState(fourTuesdaysAtWork(), NOW);

    expect(state.situationPrior.usually.setting).toBe('work');
    expect(state.situationPrior.usually.privacy).toBe('public');
    expect(state.situation.setting).toBeUndefined();
    expect(state.situation.privacy).toBeUndefined();

    /* `fits` is only ever given the observed situation, which knows nothing. */
    expect(fits({ shape: 'protected-focus' }, state.situation).eligible).toBe(true);
  });

  it('never hands the prior to the filter that removes candidates', () => {
    /*
     * Enforced by reading the source rather than by convention. `selectOutput` is the only
     * place a candidate is removed for its shape, and it must call `fits` with the observed
     * situation — never with anything derived from history.
     */
    const source = readFileSync('src/intelligence/decision/selectOutput.ts', 'utf8');
    expect(source).toContain('fits(candidate.capacity, state.situation)');
    expect(source).not.toContain('situationPrior');
  });

  it('changes no scenario’s output merely by existing', () => {
    /* A prior that altered a recommendation on its own would be binding by another name. */
    const withHistory = runEpisode(fourTuesdaysAtWork(), NOW);
    const withoutHistory = runEpisode([], NOW);
    expect(withHistory.output.kind).toBe(withoutHistory.output.kind);
  });

  it('writes nothing, so a pattern cannot harden into a rule', () => {
    const source = readFileSync('src/intelligence/state/recurringContext.ts', 'utf8');
    expect(source).not.toMatch(/writeRecord|appendRecord|db\./);
  });
});
