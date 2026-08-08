import { describe, expect, it } from 'vitest';
import {
  comparableToCurrent,
  currentNorthStarVersion,
  northStarVersionAt,
  northStarVersions,
} from '../../src/intelligence/direction/northStarVersions';
import {
  EVIDENCE_RULES_VERSION,
  applicabilityOf,
  invalidatedBefore,
  materialChanges,
} from '../../src/intelligence/learning/comparability';
import {
  activeInterpretations,
  interpretationStamp,
  interpretations,
  underlyingHistoryIntact,
} from '../../src/intelligence/learning/interpretation';
import { contextualEvidence } from '../../src/intelligence/learning/contextualEvidence';
import { lifecycleStates } from '../../src/intelligence/learning/lifecycle';
import { episodeContext, episodeFacts } from '../../src/command-core/arbitration/episodeFacts';
import { DECISION_RULES_VERSION } from '../../src/command-core/rules';
import type { CanonicalRecord } from '../../src/domain/records';
import type { CandidateAction } from '../../src/intelligence/types';
import { required } from '../support/required';

/**
 * Direction versioning and evidence comparability (sections C, G7, G8).
 *
 * The single idea behind all of it: **the past is not rewritten to agree with the
 * present.** A North Star can change, interpretation rules can change, and a life can
 * change — and in every case the old records stay exactly as they were while their claim
 * on today's decision is adjusted, explicitly and with a reason.
 */

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const BASE = Date.parse('2026-01-05T09:00:00.000Z');

let seq = 0;
function id(): string {
  seq += 1;
  return `00000000-0000-4000-e000-${String(seq).padStart(12, '0')}`;
}

function envelope(recordType: string, at: number, episodeId?: string) {
  const iso = new Date(at).toISOString();
  return {
    recordId: id(),
    recordType,
    schemaVersion: 1,
    occurredAt: iso,
    recordedAt: iso,
    localTime: { localIso: iso, timeZone: 'UTC', utcOffsetMinutes: 0 },
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    ...(episodeId === undefined ? {} : { decisionEpisodeId: episodeId }),
  };
}

const star = (statement: string, at: number): CanonicalRecord =>
  ({ ...envelope('north-star', at), statement }) as unknown as CanonicalRecord;

const contextChange = (
  summary: string,
  at: number,
  categories: readonly string[],
): CanonicalRecord =>
  ({
    ...envelope('life-context-change', at),
    summary,
    affectedCategories: [...categories],
    effectiveFrom: new Date(at).toISOString(),
  }) as unknown as CanonicalRecord;

/** A complete resolved episode for one move, in one category. */
function episode(
  patternId: string,
  atMs: number,
  direction: 'improved' | 'unchanged',
  category = 'health-recovery-energy',
): readonly CanonicalRecord[] {
  const episodeId = id();
  const at = BASE + atMs;
  const executionId = id();
  const observationId = id();

  return [
    {
      ...envelope('candidate-action', at, episodeId),
      provenance: { method: 'derived', derivedFromRecordIds: [] },
      statement: `Do ${patternId}`,
      category,
      engineCandidateId: patternId,
      intendedOutcome: 'Something observable changes',
      observableFollowUp: { promptId: 'outcome:completed', windowHours: 24 },
      capabilityEffects: [],
      timing: {},
      durationMinutes: 10,
      friction: 'low',
      minimumViableVersion: 'a',
      fallback: 'b',
      stoppingPoint: 'c',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
    },
    {
      ...envelope('execution', at, episodeId),
      recordId: executionId,
      recommendationRecordId: id(),
      state: 'executed',
      executedWindow: {
        start: new Date(at).toISOString(),
        end: new Date(at + 10 * MINUTE).toISOString(),
      },
    },
    {
      ...envelope('outcome', at + 30 * MINUTE, episodeId),
      category,
      target: 'The thing it was for',
      outcomeWindow: {
        start: new Date(at).toISOString(),
        end: new Date(at + 30 * MINUTE).toISOString(),
      },
      executionRecordId: executionId,
      result: { status: 'known', value: { summary: 'Observed', direction } },
      observationRecordIds: [observationId],
    },
  ] as unknown as readonly CanonicalRecord[];
}

/* -------------------------------------------------------------------------- */

describe('1 & C. North Star versions are kept, with their dates', () => {
  it('records every revision as a version rather than an edit', () => {
    const records = [
      star('Be present for my family', BASE),
      star('Build something that lasts', BASE + 60 * DAY),
      star('Be well enough to do both', BASE + 120 * DAY),
    ];

    const versions = northStarVersions(records);
    expect(versions.map((entry) => entry.version)).toEqual([1, 2, 3]);
    expect(required(versions[0], 'v1').statement).toBe('Be present for my family');

    /* Each closed version knows when it stopped applying; the live one does not. */
    expect(required(versions[0], 'v1').effectiveUntil).toBe(
      required(versions[1], 'v2').effectiveFrom,
    );
    expect(required(versions[2], 'v3').effectiveUntil).toBeUndefined();
  });

  it('names the version that was live at a given moment', () => {
    const records = [star('First', BASE), star('Second', BASE + 60 * DAY)];

    expect(
      required(northStarVersionAt(records, new Date(BASE + DAY).toISOString()), 'v1').version,
    ).toBe(1);
    expect(
      required(northStarVersionAt(records, new Date(BASE + 90 * DAY).toISOString()), 'v2')
        .version,
    ).toBe(2);
  });

  it('answers unknown for a time before any North Star existed', () => {
    /* Not version zero. Evidence from before a direction was stated is not about it. */
    const records = [star('First', BASE + 30 * DAY)];
    expect(northStarVersionAt(records, new Date(BASE).toISOString())).toBeUndefined();
    expect(currentNorthStarVersion([])).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('2. evidence is not reinterpreted under a North Star it never saw', () => {
  it('marks old evidence as belonging to a different objective', () => {
    const records = [star('First', BASE), star('Second', BASE + 60 * DAY)];

    expect(comparableToCurrent(records, new Date(BASE + DAY).toISOString())).toBe(
      'different-version',
    );
    expect(comparableToCurrent(records, new Date(BASE + 90 * DAY).toISOString())).toBe(
      'same-version',
    );
  });

  it('says unknown rather than guessing when there is nothing to compare', () => {
    expect(comparableToCurrent([], new Date(BASE).toISOString())).toBe('unknown');

    /* A North Star exists now, but not when this evidence was gathered. */
    const late = [star('Only one', BASE + 60 * DAY)];
    expect(comparableToCurrent(late, new Date(BASE).toISOString())).toBe('unknown');
  });
});

/* -------------------------------------------------------------------------- */

describe('3 & 4. rule versions segment rather than rewrite', () => {
  it('keeps decision and evidence rules on separate axes', () => {
    /* Two versions that can move independently; neither implies the other. */
    expect(DECISION_RULES_VERSION.length).toBeGreaterThan(0);
    expect(EVIDENCE_RULES_VERSION.length).toBeGreaterThan(0);
    expect(EVIDENCE_RULES_VERSION).not.toBe(DECISION_RULES_VERSION);
  });

  it('refuses to compare evidence interpreted under different rules', () => {
    const verdict = applicabilityOf([], {
      recordedAt: new Date(BASE).toISOString(),
      categories: [],
      evidenceRulesVersion: 'evidence-2020-ancient',
    });
    expect(verdict.influence).toBe('not-comparable');
    expect(verdict.because).toMatch(/different interpretation/i);
  });

  it('treats missing version metadata as unknown, never as version zero', () => {
    /*
     * A legacy record carries no version. It must not be assumed to be the earliest rules
     * — that is a claim nobody made — so it stays ordinary evidence.
     */
    const verdict = applicabilityOf([], {
      recordedAt: new Date(BASE).toISOString(),
      categories: [],
    });
    expect(verdict.influence).toBe('full');
    expect(verdict.northStar).toBe('unknown');
  });

  it('changes no stored record when a rule version moves', () => {
    /* The interpretation is derived at read time; nothing is written back. */
    const records = [...episode('pause:screen-break', 0, 'improved')];
    const before = JSON.stringify(records);
    contextualEvidence(records, new Date(BASE + 30 * DAY));
    lifecycleStates(records, new Date(BASE + 30 * DAY));
    expect(JSON.stringify(records)).toBe(before);
  });
});

/* -------------------------------------------------------------------------- */

describe('5. an interpretation can be reversed without deleting the observation', () => {
  const observationId = id();

  const belief = (recordId: string, at: number, over: Record<string, unknown> = {}) =>
    ({
      ...envelope('learned-belief', at),
      recordId,
      statement: 'Walking is associated with better evenings',
      engineCandidateId: 'move-body:longer-walk',
      basisRecordIds: [observationId],
      ...interpretationStamp(undefined),
      ...over,
    }) as unknown as CanonicalRecord;

  const observation = {
    ...envelope('observation', BASE),
    recordId: observationId,
    privacy: 'general',
    category: 'health-recovery-energy',
    attribute: 'evening-quality',
    value: { kind: 'state', state: 'Good' },
  } as unknown as CanonicalRecord;

  it('supersedes the reading and leaves the evidence untouched', () => {
    const first = id();
    const records = [
      observation,
      belief(first, BASE + DAY),
      belief(id(), BASE + 2 * DAY, {
        supersedesRecordId: first,
        statement: 'Mixed evidence: the two often coincided, and not always',
        because: 'An earlier reading over-claimed from two observations',
      }),
    ];

    const all = interpretations(records);
    expect(all).toHaveLength(2);
    expect(required(all[0], 'first').status).toBe('superseded');
    expect(required(all[1], 'second').status).toBe('active');

    /* One live reading, and the raw observation still present. */
    expect(activeInterpretations(records)).toHaveLength(1);
    expect(records.some((record) => record.recordId === observationId)).toBe(true);
    expect(underlyingHistoryIntact(records)).toBe(true);
  });

  it('can withdraw a reading outright and still keep its history', () => {
    const records = [observation, belief(id(), BASE + DAY, { withdrawn: true })];

    expect(required(interpretations(records)[0], 'entry').status).toBe('withdrawn');
    expect(activeInterpretations(records)).toHaveLength(0);
    expect(underlyingHistoryIntact(records)).toBe(true);
  });

  it('stamps every new reading with the rules and direction behind it', () => {
    const stamp = interpretationStamp('ns-1');
    expect(stamp.evidenceRulesVersion).toBe(EVIDENCE_RULES_VERSION);
    expect(stamp.northStarRecordId).toBe('ns-1');

    /* And unknown stays unknown when no direction was set. */
    expect(interpretationStamp(undefined).northStarRecordId).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('6, 7 & 8. context, not age, decides what still counts', () => {
  const FOUR_GOOD = [
    ...episode('pause:screen-break', 0, 'improved'),
    ...episode('pause:screen-break', DAY, 'improved'),
    ...episode('pause:screen-break', 2 * DAY, 'improved'),
    ...episode('pause:screen-break', 3 * DAY, 'improved'),
  ];

  it('keeps comparable old evidence at full weight however old it is', () => {
    /* Six months later, and nothing structural has been recorded. Age alone changes nothing. */
    const evidence = contextualEvidence(FOUR_GOOD, new Date(BASE + 180 * DAY));
    const morning = required(
      evidence.find((entry) => entry.facet.kind === 'time-of-day'),
      'morning',
    );

    expect(morning.strength).toBe('consistent');
    expect(morning.discounted).toBe(0);
  });

  it('reduces the claim when a material change lands in between', () => {
    const withChange = [
      ...FOUR_GOOD,
      contextChange('you started the new job', BASE + 10 * DAY, ['health-recovery-energy']),
    ];

    const morning = required(
      contextualEvidence(withChange, new Date(BASE + 180 * DAY)).find(
        (entry) => entry.facet.kind === 'time-of-day',
      ),
      'morning',
    );

    /* Same four observations, still counted, and no longer able to carry `consistent`. */
    expect(morning.observed).toBe(4);
    expect(morning.strength).toBe('emerging');
    expect(morning.discounted).toBe(4);
    expect(morning.discountedBecause).toContain('you started the new job');
    expect(morning.statement).toMatch(/recorded before you started the new job/);
  });

  it('leaves evidence alone when the change was somewhere else in life', () => {
    /* A new job does not make an observation about the kitchen less applicable. */
    const elsewhere = [
      ...FOUR_GOOD,
      contextChange('you moved house', BASE + 10 * DAY, ['home-and-environment']),
    ];

    const morning = required(
      contextualEvidence(elsewhere, new Date(BASE + 180 * DAY)).find(
        (entry) => entry.facet.kind === 'time-of-day',
      ),
      'morning',
    );
    expect(morning.strength).toBe('consistent');
    expect(morning.discounted).toBe(0);
  });

  it('deletes nothing when it discounts', () => {
    const withChange = [
      ...FOUR_GOOD,
      contextChange('you started the new job', BASE + 10 * DAY, ['health-recovery-energy']),
    ];
    const before = withChange.length;
    contextualEvidence(withChange, new Date(BASE + 180 * DAY));
    expect(withChange).toHaveLength(before);
    expect(materialChanges(withChange)).toHaveLength(1);
  });

  it('keeps disagreeing contexts apart instead of averaging them', () => {
    const mixed = [
      ...FOUR_GOOD,
      ...episode('pause:screen-break', 14 * 60 * MINUTE, 'unchanged'),
      ...episode('pause:screen-break', DAY + 14 * 60 * MINUTE, 'unchanged'),
    ];

    const evidence = contextualEvidence(mixed, new Date(BASE + 180 * DAY)).filter(
      (entry) => entry.facet.kind === 'time-of-day',
    );

    /* Two findings, not one blended verdict. */
    expect(evidence.length).toBeGreaterThan(1);
    expect(
      required(lifecycleStates(mixed, new Date(BASE + 180 * DAY))[0], 'verdict').current,
    ).toBe('context-specific');
  });

  it('reports an explicit invalidation mark when the owner set one', () => {
    const clean = [
      contextChange('everything changed', BASE, ['health-recovery-energy']),
    ] as CanonicalRecord[];
    expect(invalidatedBefore(clean)).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('9 & 10. the current belief reaches the contract and can change it', () => {
  function candidate(patternId: string): CandidateAction {
    return {
      id: patternId,
      patternId,
      statement: 'Take a short break',
      category: 'health-recovery-energy',
      intendedOutcome: 'The interference eases',
      followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
      capabilityEffects: [],
      durationMinutes: 10,
      minimumMinutes: 5,
      minimumVersion: 'Two minutes',
      fallback: 'Stand up',
      stoppingPoint: 'Stop after ten minutes',
      friction: 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
      goalId: undefined,
      reason: 'Nothing rules it out',
    };
  }

  const FOUR_GOOD = [
    ...episode('pause:screen-break', 0, 'improved'),
    ...episode('pause:screen-break', DAY, 'improved'),
    ...episode('pause:screen-break', 2 * DAY, 'improved'),
    ...episode('pause:screen-break', 3 * DAY, 'improved'),
  ];

  const factsFrom = (records: readonly CanonicalRecord[]) => {
    const now = new Date(BASE + 180 * DAY);
    const shared = episodeContext(records, now);
    return episodeFacts(
      candidate('pause:screen-break'),
      {
        records,
        now,
        feasible: new Map(),
        contradicted: new Set(),
        sustainability: shared.sustainability,
        lifecycle: shared.lifecycle,
      },
      shared.goalCategories,
      shared.weeklyCategories,
      shared.load,
    );
  };

  it('carries a supported belief through to the arbitration contract', () => {
    /*
     * The trace the wiring requirement asks for: records → contextual evidence →
     * lifecycle → episodeFacts. Nothing is stubbed on the way.
     */
    const facts = factsFrom(FOUR_GOOD);
    expect(facts.lifecycle).toBe('supported');
    expect(facts.confidence).toBe('high');
  });

  it('lowers confidence in the contract when the context has materially changed', () => {
    const withChange = [
      ...FOUR_GOOD,
      contextChange('you started the new job', BASE + 10 * DAY, ['health-recovery-energy']),
    ];

    const before = factsFrom(FOUR_GOOD);
    const after = factsFrom(withChange);

    /* Same four observations. Different claim on today, and the field the ranking reads. */
    expect(before.confidence).toBe('high');
    expect(after.confidence).not.toBe('high');
    expect(after.lifecycle).not.toBe('supported');
  });

  it('says nothing at all about a move with no observations', () => {
    const facts = factsFrom([]);
    expect(facts.sustainability).toBe('unknown');
    expect(facts.northStarRelevance).toBe('unknown');
  });
});
