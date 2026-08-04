import { beforeEach, describe, expect, it } from 'vitest';
import { RECORD_SCHEMAS, RECORD_TYPES, parseCanonicalRecord } from '../../src/domain/records';
import {
  aCandidateAction,
  aContextSnapshot,
  anExecution,
  anInferredState,
  anObservation,
  anObservationCorrection,
  anOutcome,
  aQuestion,
  aRecommendation,
  anUntreatedForecast,
  fixtureId,
  oneOfEveryFamily,
  resetFixtureIds,
} from '../fixtures/records';

beforeEach(() => {
  resetFixtureIds();
});

/**
 * Gate requirement: every active core record validates independently.
 */
describe('core record families', () => {
  it('registers twenty-three families, none of them domain content', () => {
    expect(RECORD_TYPES).toHaveLength(23);
    expect(Object.keys(RECORD_SCHEMAS).sort()).toEqual([...RECORD_TYPES].sort());
  });

  it('registers DomainPreferenceRecord, activated in Phase 7 Prompt 8A', () => {
    // A preference, not a truth store. Whether an area is switched on is the owner's
    // decision with a date; every fact a domain shows still comes from the shared
    // records, which is what stops seven domains becoming seven databases.
    expect(RECORD_TYPES).toContain('domain-preference');
  });

  it('registers LearnedBeliefRecord, activated in Phase 5', () => {
    // Absent through Phases 2–4 by design; activated now that there is learning
    // behaviour for it to describe.
    expect(RECORD_TYPES).toContain('learned-belief');
  });

  it('registers GuideSessionRecord, activated in Phase 6', () => {
    // A guide that legitimately asked nothing new leaves no observations behind, so
    // "I checked in and nothing had changed" cannot be reconstructed from anything
    // else. That is why it is canonical rather than derived.
    expect(RECORD_TYPES).toContain('guide-session');
  });

  it('still registers no domain-specific content family', () => {
    // Prompt 8B onwards activates those, one domain at a time. `domain-preference`
    // is not one of them: it holds a preference, never domain content.
    for (const domainish of [
      'sleep',
      'mood',
      'expense',
      'workout',
      'medication',
      'milestone',
    ]) {
      expect(RECORD_TYPES.some((type) => type.includes(domainish))).toBe(false);
    }
  });

  it('has a fixture for every registered family', () => {
    // Without this, activating a family without a fixture goes silently untested —
    // which is exactly what happened to `learned-belief` through Phase 5.
    expect(Object.keys(oneOfEveryFamily()).sort()).toEqual([...RECORD_TYPES].sort());
  });

  it('validates a well-formed record of every family', () => {
    for (const [recordType, record] of Object.entries(oneOfEveryFamily())) {
      const result = parseCanonicalRecord(record);
      expect(result.ok, `${recordType}: ${result.ok ? '' : result.issues.join('; ')}`).toBe(
        true,
      );
    }
  });

  it('rejects an unknown record type rather than guessing', () => {
    const result = parseCanonicalRecord({ ...anObservation(), recordType: 'sleep-quality' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('unknown-record-type');
  });
});

/**
 * The seven Phase 2 invariants. Each of these is a way the product could start
 * telling its user something untrue, so each must be a parse failure rather than
 * a code-review convention.
 */
describe('invariant 1 — inference must not masquerade as observation', () => {
  it('rejects an inferred state relabelled as an observation', () => {
    const result = parseCanonicalRecord({ ...anInferredState(), recordType: 'observation' });
    expect(result.ok).toBe(false);
  });

  it('rejects an observation that carries confidence', () => {
    const result = parseCanonicalRecord({
      ...anObservation(),
      confidence: {
        label: 'moderate-evidence',
        dimensions: [{ dimension: 'recency', assessment: 'supports' }],
        basisRecordIds: [fixtureId(1)],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an observation claiming inferred provenance', () => {
    const result = parseCanonicalRecord({
      ...anObservation(),
      provenance: { method: 'inferred', derivedFromRecordIds: [fixtureId(1)] },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an inferred state claiming first-hand provenance', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      provenance: { method: 'measured' },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects derived content that cannot say what it was derived from', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      provenance: { method: 'derived' },
    });
    expect(result.ok).toBe(false);
  });
});

describe('invariant 2 — forecast must not masquerade as outcome', () => {
  it('rejects an untreated forecast relabelled as an outcome', () => {
    const result = parseCanonicalRecord({ ...anUntreatedForecast(), recordType: 'outcome' });
    expect(result.ok).toBe(false);
  });

  it('rejects an outcome relabelled as a forecast', () => {
    const result = parseCanonicalRecord({ ...anOutcome(), recordType: 'untreated-forecast' });
    expect(result.ok).toBe(false);
  });

  it('keeps predicted intervention effects separate from untreated forecasts', () => {
    // An untreated forecast has no action attached; a predicted effect requires one.
    const forecast = anUntreatedForecast();
    expect('candidateActionRecordId' in forecast).toBe(false);

    const result = parseCanonicalRecord({
      ...forecast,
      recordType: 'intervention-effect-prediction',
    });
    expect(result.ok).toBe(false);
  });
});

describe('invariant 3 — recommendation must not masquerade as execution', () => {
  it('rejects a recommendation relabelled as an execution', () => {
    const result = parseCanonicalRecord({ ...aRecommendation(), recordType: 'execution' });
    expect(result.ok).toBe(false);
  });

  it('rejects an execution that carries no recommendation link', () => {
    const execution = anExecution(fixtureId(1)) as Record<string, unknown>;
    delete execution['recommendationRecordId'];
    expect(parseCanonicalRecord(execution).ok).toBe(false);
  });

  it('gives a recommendation no execution state to be confused with', () => {
    expect('state' in aRecommendation()).toBe(false);
  });
});

describe('invariant 4 — outcome must not masquerade as causal effect', () => {
  it('rejects an outcome that claims a cause', () => {
    const result = parseCanonicalRecord({
      ...anOutcome(),
      causedBy: fixtureId(1),
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a known outcome that cites no observations', () => {
    const result = parseCanonicalRecord({ ...anOutcome(), observationRecordIds: [] });
    expect(result.ok).toBe(false);
  });
});

describe('invariant 5 — confidence requires evidence dimensions', () => {
  it('rejects confidence with no dimensions', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      confidence: {
        label: 'moderate-evidence',
        dimensions: [],
        basisRecordIds: [fixtureId(1)],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects confidence with no basis records', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      confidence: {
        label: 'moderate-evidence',
        dimensions: [{ dimension: 'recency', assessment: 'supports' }],
        basisRecordIds: [],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('refuses strong personal evidence without prospective validation (LEARN-003)', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      confidence: {
        label: 'strong-personal-evidence',
        dimensions: [{ dimension: 'comparable-evidence-volume', assessment: 'supports' }],
        basisRecordIds: [fixtureId(1)],
      },
    });
    expect(result.ok).toBe(false);
  });

  it('allows strong personal evidence once prospective validation supports it', () => {
    const result = parseCanonicalRecord({
      ...anInferredState(),
      confidence: {
        label: 'strong-personal-evidence',
        dimensions: [{ dimension: 'prospective-validation', assessment: 'supports' }],
        basisRecordIds: [fixtureId(1)],
      },
    });
    expect(result.ok).toBe(true);
  });
});

describe('invariant 6 — time windows must be valid', () => {
  it('rejects a window that ends before it starts', () => {
    const result = parseCanonicalRecord({
      ...aCandidateAction(),
      timing: {
        preferredWindow: { start: '2026-01-05T10:00:00.000Z', end: '2026-01-05T09:00:00.000Z' },
      },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a zero-length window', () => {
    const instant = '2026-01-05T09:00:00.000Z';
    const result = parseCanonicalRecord({
      ...anOutcome(),
      outcomeWindow: { start: instant, end: instant },
    });
    expect(result.ok).toBe(false);
  });

  it('rejects a record that claims to have been recorded before it occurred', () => {
    const result = parseCanonicalRecord({
      ...anObservation(),
      occurredAt: '2026-01-05T12:00:00.000Z',
      recordedAt: '2026-01-05T09:00:00.000Z',
    });
    expect(result.ok).toBe(false);
  });
});

describe('invariant 7 — circular references are forbidden', () => {
  it('rejects a record that supersedes itself', () => {
    const observation = anObservation();
    const result = parseCanonicalRecord({
      ...anObservationCorrection(observation.recordId),
      recordId: observation.recordId,
      supersedesRecordId: observation.recordId,
    });
    expect(result.ok).toBe(false);
  });
});

/**
 * `PROD-005` / `INTEL-006`: the model must make a competing-recommendation menu
 * unrepresentable, not merely discouraged.
 */
describe('one best recommendation', () => {
  it('accepts exactly one of action, question, or deliberate silence', () => {
    for (const output of [
      { kind: 'action', candidateActionRecordId: fixtureId(1) },
      { kind: 'question', questionRecordId: fixtureId(2) },
      { kind: 'deliberate-silence', rationale: 'Nothing warrants interrupting' },
    ]) {
      expect(parseCanonicalRecord({ ...aRecommendation(), output }).ok).toBe(true);
    }
  });

  it('cannot represent a list of recommendations', () => {
    const result = parseCanonicalRecord({
      ...aRecommendation(),
      output: [
        { kind: 'action', candidateActionRecordId: fixtureId(1) },
        { kind: 'action', candidateActionRecordId: fixtureId(2) },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('requires deliberate silence to explain itself', () => {
    const result = parseCanonicalRecord({
      ...aRecommendation(),
      output: { kind: 'deliberate-silence' },
    });
    expect(result.ok).toBe(false);
  });
});

/** `UX-007`: a question must be able to change something, or it should not be asked. */
describe('questions must be worth asking', () => {
  it('rejects a question that could change nothing', () => {
    const result = parseCanonicalRecord({ ...aQuestion(), couldChange: [] });
    expect(result.ok).toBe(false);
  });
});

/** No unused domain schema library exists (Phase 2 gate). */
describe('scope discipline', () => {
  it('enables only the three alpha categories', () => {
    const result = parseCanonicalRecord({
      ...anObservation(),
      category: 'health-sleep-recovery',
    });
    expect(result.ok).toBe(false);
  });

  it('keeps context snapshots free of domain-specific fields', () => {
    const result = parseCanonicalRecord({ ...aContextSnapshot(), sleepHours: 7 });
    expect(result.ok).toBe(false);
  });
});
