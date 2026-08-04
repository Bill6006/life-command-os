import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkCrossRecordInvariants,
  currentRecords,
  supersessionChain,
} from '../../src/domain/policies/invariants';
import type { CanonicalRecord } from '../../src/domain/records';
import {
  anInferredState,
  anObservation,
  anObservationCorrection,
  fixtureId,
  resetFixtureIds,
} from '../fixtures/records';

beforeEach(() => {
  resetFixtureIds();
});

/**
 * Invariant 7 lives here because a cycle is a property of a *set* of records —
 * no single record's schema can see it.
 */
describe('cross-record invariants', () => {
  it('accepts a well-formed set', () => {
    const observation = anObservation();
    const correction = anObservationCorrection(observation.recordId);
    expect(checkCrossRecordInvariants([observation, correction])).toEqual([]);
  });

  it('detects a duplicate record id', () => {
    const observation = anObservation();
    const violations = checkCrossRecordInvariants([observation, { ...observation }]);
    expect(violations.map((v) => v.code)).toContain('duplicate-record-id');
  });

  it('detects self-supersession', () => {
    const observation = anObservation();
    const selfReferential = {
      ...anObservationCorrection(observation.recordId),
      supersedesRecordId: undefined,
    } as unknown as Record<string, unknown>;
    selfReferential['supersedesRecordId'] = selfReferential['recordId'];

    const violations = checkCrossRecordInvariants([
      selfReferential as unknown as CanonicalRecord,
    ]);
    expect(violations.map((v) => v.code)).toContain('self-supersession');
  });

  it('detects a supersession cycle', () => {
    const a = anObservation();
    const b = anObservation();
    const cyclicA = { ...a, supersedesRecordId: b.recordId } as unknown as CanonicalRecord;
    const cyclicB = { ...b, supersedesRecordId: a.recordId } as unknown as CanonicalRecord;

    const violations = checkCrossRecordInvariants([cyclicA, cyclicB]);
    expect(violations.map((v) => v.code)).toContain('supersession-cycle');
  });

  it('detects a provenance derivation cycle', () => {
    const first = anInferredState();
    const second = anInferredState();
    const cyclicFirst = {
      ...first,
      provenance: { method: 'derived', derivedFromRecordIds: [second.recordId] },
    } as unknown as CanonicalRecord;
    const cyclicSecond = {
      ...second,
      provenance: { method: 'derived', derivedFromRecordIds: [first.recordId] },
    } as unknown as CanonicalRecord;

    const violations = checkCrossRecordInvariants([cyclicFirst, cyclicSecond]);
    expect(violations.map((v) => v.code)).toContain('derivation-cycle');
  });

  it('reports a dangling supersession only when the set claims to be complete', () => {
    const correction = anObservationCorrection(fixtureId(7777));

    // A partial export may legitimately reference records it does not contain.
    expect(checkCrossRecordInvariants([correction])).toEqual([]);

    const strict = checkCrossRecordInvariants([correction], { expectComplete: true });
    expect(strict.map((v) => v.code)).toContain('dangling-supersession');
  });

  it('terminates on a long chain instead of exhausting the stack', () => {
    // A damaged or hostile backup should be rejected, never crash the application.
    //
    // Twenty thousand rather than five: this check runs on every user write from
    // Phase 6 onward, so it has to be linear in the number of records. At the old
    // quadratic cost this length would take minutes, which is what makes the length
    // itself the assertion — no wall-clock threshold to go flaky on slow hardware.
    const records: CanonicalRecord[] = [];
    for (let index = 1; index <= 20_000; index += 1) {
      records.push({
        ...anObservation(),
        recordId: fixtureId(index),
        supersedesRecordId: fixtureId(index + 1),
      });
    }
    expect(() => checkCrossRecordInvariants(records)).not.toThrow();
  });
});

/**
 * Gate requirement: **corrections preserve history.**
 */
describe('supersession resolution', () => {
  it('treats the correction as current and the original as history', () => {
    const observation = anObservation();
    const correction = anObservationCorrection(observation.recordId);
    const all = [observation, correction];

    const current = currentRecords(all);

    expect(current).toHaveLength(1);
    expect(current[0]?.recordId).toBe(correction.recordId);

    // The original is still in the set. It was not deleted, only superseded.
    expect(all).toContain(observation);
  });

  it('keeps the full chain readable, newest first', () => {
    const original = anObservation();
    const firstCorrection = anObservationCorrection(original.recordId);
    const secondCorrection = anObservationCorrection(firstCorrection.recordId, {
      reason: 'Corrected again after checking the calendar',
    });
    const all = [original, firstCorrection, secondCorrection];

    expect(currentRecords(all).map((r) => r.recordId)).toEqual([secondCorrection.recordId]);

    const chain = supersessionChain(all, secondCorrection.recordId);
    expect(chain.map((r) => r.recordId)).toEqual([
      secondCorrection.recordId,
      firstCorrection.recordId,
      original.recordId,
    ]);
  });

  it('does not loop forever on a cyclic chain', () => {
    const a = anObservation();
    const b = anObservation();
    const cyclicA = { ...a, supersedesRecordId: b.recordId } as unknown as CanonicalRecord;
    const cyclicB = { ...b, supersedesRecordId: a.recordId } as unknown as CanonicalRecord;

    const chain = supersessionChain([cyclicA, cyclicB], a.recordId);
    expect(chain).toHaveLength(2);
  });
});
