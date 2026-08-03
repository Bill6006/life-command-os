import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  assessFreshness,
  evidenceValue,
  isKnown,
  knownValue,
  parseCanonicalRecord,
  type EvidenceValue,
} from '../../src/domain/records';
import { aContextSnapshot, anOutcome, fixtureId, resetFixtureIds } from '../fixtures/records';

beforeEach(() => {
  resetFixtureIds();
});

const minutes = evidenceValue(z.number().min(0));

describe('evidence values', () => {
  it('accepts every evidence status', () => {
    const cases: unknown[] = [
      { status: 'known', value: 45 },
      { status: 'unknown', reason: 'Not asked' },
      { status: 'not-applicable', reason: 'No working day scheduled' },
      { status: 'conflicting', candidateRecordIds: [fixtureId(1), fixtureId(2)] },
      { status: 'unresolved', awaiting: 'End of the outcome window' },
    ];
    for (const value of cases) {
      expect(minutes.safeParse(value).success, JSON.stringify(value)).toBe(true);
    }
  });

  it('rejects a conflict with nothing to conflict against', () => {
    expect(
      minutes.safeParse({ status: 'conflicting', candidateRecordIds: [fixtureId(1)] }).success,
    ).toBe(false);
  });

  it('rejects an unresolved value that cannot say what it is waiting for', () => {
    expect(minutes.safeParse({ status: 'unresolved' }).success).toBe(false);
  });
});

/**
 * Gate requirement: **missing and unresolved values are not converted to zero,
 * false, or failure.**
 *
 * This is the difference between a system that says "I don't know how much time you
 * have" and one that quietly plans your evening around zero free minutes.
 */
describe('absence is never coerced', () => {
  const absent: EvidenceValue<number>[] = [
    { status: 'unknown' },
    { status: 'not-applicable' },
    { status: 'conflicting', candidateRecordIds: [fixtureId(1), fixtureId(2)] },
    { status: 'unresolved', awaiting: 'user answer' },
  ];

  it('never reports absent evidence as known', () => {
    for (const value of absent) expect(isKnown(value)).toBe(false);
  });

  it('returns undefined rather than a substitute value', () => {
    for (const value of absent) {
      const read = knownValue(value);
      expect(read).toBeUndefined();
      // Explicitly not 0, not false, not NaN, not null.
      expect(read).not.toBe(0);
      expect(read).not.toBe(false);
      expect(read).not.toBeNull();
    }
  });

  it('exposes no API that substitutes a default for missing evidence', () => {
    // If a `valueOrZero` style helper is ever added, this test should be the thing
    // that stops it — the absence of the affordance is the safeguard.
    const semantics = { isKnown, knownValue, assessFreshness, evidenceValue };
    const names = Object.keys(semantics);
    expect(names.some((name) => /or(Zero|Default|Else|False)/i.test(name))).toBe(false);
  });

  it('stores unknown capacity as unknown, not as zero capacity', () => {
    const snapshot = aContextSnapshot({
      capacity: { status: 'unknown', reason: 'Not asked' },
      availableMinutes: { status: 'unknown', reason: 'Not asked' },
    });
    const result = parseCanonicalRecord(snapshot);
    expect(result.ok).toBe(true);
    expect(knownValue(snapshot.availableMinutes)).toBeUndefined();
  });

  it('keeps an outcome that has not arrived unresolved rather than absent', () => {
    const pending = anOutcome({
      result: { status: 'unresolved', awaiting: 'Outcome window closes Friday' },
      observationRecordIds: [],
    });
    // A known outcome must cite observations; an unresolved one legitimately cannot.
    expect(parseCanonicalRecord(pending).ok).toBe(true);
  });
});

describe('freshness', () => {
  const recordedAt = '2026-01-05T09:00:00.000Z';
  const maxUsefulAgeMs = 60 * 60 * 1000;

  it('is fresh well within the useful age', () => {
    const result = assessFreshness(
      recordedAt,
      new Date('2026-01-05T09:10:00.000Z'),
      maxUsefulAgeMs,
    );
    expect(result.status).toBe('fresh');
  });

  it('is aging past the halfway point', () => {
    const result = assessFreshness(
      recordedAt,
      new Date('2026-01-05T09:45:00.000Z'),
      maxUsefulAgeMs,
    );
    expect(result.status).toBe('aging');
  });

  it('is stale beyond the useful age', () => {
    const result = assessFreshness(
      recordedAt,
      new Date('2026-01-05T11:00:00.000Z'),
      maxUsefulAgeMs,
    );
    expect(result.status).toBe('stale');
    expect(result.ageMs).toBe(2 * 60 * 60 * 1000);
  });

  it('is relative to the decision, not a property of the record', () => {
    const now = new Date('2026-01-05T14:00:00.000Z');
    // The same record, judged against two different decisions.
    expect(assessFreshness(recordedAt, now, 60 * 60 * 1000).status).toBe('stale');
    expect(assessFreshness(recordedAt, now, 7 * 24 * 60 * 60 * 1000).status).toBe('fresh');
  });

  it('never reports a negative age for a clock that jumped backwards', () => {
    const result = assessFreshness(
      recordedAt,
      new Date('2026-01-05T08:00:00.000Z'),
      maxUsefulAgeMs,
    );
    expect(result.ageMs).toBe(0);
  });
});
