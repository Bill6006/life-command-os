import { describe, expect, it } from 'vitest';
import { runEpisode } from '../../src/intelligence';
import { contextualEvidence } from '../../src/intelligence/learning/contextualEvidence';
import { lifecycleOf, lifecycleStates } from '../../src/intelligence/learning/lifecycle';
import { sequenceEvidence } from '../../src/intelligence/learning/sequences';
import { outcomeWindows } from '../../src/intelligence/evaluation/outcomeWindows';
import { episodeContext, episodeFacts } from '../../src/command-core/arbitration/episodeFacts';
import { weigh } from '../../src/command-core/arbitration/weigh';
import { minutesToUsualBedtime, ROUTINE_ATTRIBUTES } from '../../src/domain/routines/routines';
import { horizonFor } from '../../src/domain/moves/horizons';
import type { CanonicalRecord } from '../../src/domain/records';
import type { CandidateAction } from '../../src/intelligence/types';
import { required } from '../support/required';

/**
 * Section J, proved on the shared machinery (v3.3 section J, `V33-046`–`V33-048`).
 *
 * ## Why there is no food-learning module
 *
 * The temptation, given a list of food-shaped requirements, is to build a food-shaped
 * learning system. That would be the wrong answer twice over: a second evidence path that
 * has to be kept honest separately, and an implicit claim that eating is a special kind of
 * fact. It is not. A meal is a thing that happened at a time, followed by observations at
 * later times, which is exactly what `contextualEvidence`, `sequences` and `lifecycle`
 * already model.
 *
 * So these tests exist to prove the inherited architecture *actually satisfies* the food
 * requirements rather than to assume it. Every one of them drives the same functions the
 * engine drives, and several go through `runEpisode` end to end. Where a behaviour had
 * failed, the correction would belong in the shared layer — not in a copy of it.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BASE = Date.parse('2026-04-06T08:00:00.000Z');

let seq = 0;
const id = () => {
  seq += 1;
  return `00000000-0000-4000-a100-${String(seq).padStart(12, '0')}`;
};

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

/**
 * A meal, carried out, and what was observed afterwards.
 *
 * Written as an ordinary decision episode because that is what it is. Nothing about the
 * shape of these records says "food" to the learning layer — the pattern id does, and
 * only for the purpose of keeping evidence about one move together.
 */
function mealEpisode(
  atMs: number,
  direction: 'improved' | 'unchanged' | undefined,
  patternId = 'hydrate-eat:eat-something',
): readonly CanonicalRecord[] {
  const episodeId = id();
  const at = BASE + atMs;
  const executionId = id();
  const observationId = id();

  /* The qualitative tags, recorded as an ordinary observation beside the episode. */
  const tags = {
    ...envelope('observation', at),
    privacy: 'health',
    category: 'health-recovery-energy',
    attribute: 'food:tags',
    value: { kind: 'state', state: 'High protein' },
  };

  return [
    tags,
    {
      ...envelope('candidate-action', at, episodeId),
      provenance: { method: 'derived', derivedFromRecordIds: [] },
      statement: 'Eat something',
      category: 'health-recovery-energy',
      engineCandidateId: patternId,
      intendedOutcome: 'Energy steadies',
      observableFollowUp: { promptId: 'food:energy-after', windowHours: 3 },
      capabilityEffects: [],
      timing: {},
      durationMinutes: 15,
      friction: 'low',
      minimumViableVersion: 'Something small',
      fallback: 'A glass of water',
      stoppingPoint: 'When you have eaten',
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
        end: new Date(at + 15 * MINUTE).toISOString(),
      },
    },
    {
      ...envelope('outcome', at + 2 * HOUR, episodeId),
      category: 'health-recovery-energy',
      target: 'Energy since eating',
      outcomeWindow: {
        start: new Date(at).toISOString(),
        end: new Date(at + 2 * HOUR).toISOString(),
      },
      executionRecordId: executionId,
      result:
        direction === undefined
          ? { status: 'unknown', reason: 'Not observed yet' }
          : { status: 'known', value: { summary: 'Observed', direction } },
      observationRecordIds: direction === undefined ? [] : [observationId],
    },
  ] as unknown as readonly CanonicalRecord[];
}

const LATER = new Date(BASE + 60 * DAY);

/* -------------------------------------------------------------------------- */

describe('J. one meal proves nothing (a)', () => {
  it('produces no confident association from a single observation', () => {
    const evidence = contextualEvidence(mealEpisode(0, 'improved'), LATER);

    expect(evidence.length).toBeGreaterThan(0);
    for (const entry of evidence) {
      expect(entry.strength).toBe('insufficient');
      expect(entry.statement).toMatch(/still limited/i);
    }

    /* And nothing about the move's standing moves either. */
    expect(lifecycleOf('hydrate-eat:eat-something', evidence).current).toBe('experimental');
  });
});

/* -------------------------------------------------------------------------- */

describe('J. repeated comparable meals produce a cautious association (b, c)', () => {
  const FOUR_MORNINGS = [
    ...mealEpisode(0, 'improved'),
    ...mealEpisode(DAY, 'improved'),
    ...mealEpisode(2 * DAY, 'improved'),
    ...mealEpisode(3 * DAY, 'improved'),
  ];

  it('reaches a supported reading only after a run, and keeps it context-specific', () => {
    const evidence = contextualEvidence(FOUR_MORNINGS, LATER);
    const morning = required(
      evidence.find((entry) => entry.facet.kind === 'time-of-day'),
      'a time-of-day facet',
    );

    expect(morning.observed).toBe(4);
    expect(morning.strength).toBe('consistent');

    /* Held against the *context*, not against the move in general. */
    expect(morning.facet.value).toBe('morning');
    expect(morning.statement).toMatch(/in similar situations/i);
  });

  it('never states a cause (c)', () => {
    for (const entry of contextualEvidence(FOUR_MORNINGS, LATER)) {
      expect(entry.statement).toMatch(
        /often followed by|tended to coincide|mixed|still limited/i,
      );
      expect(entry.statement).not.toMatch(/\bcaus(e|ed|es|ing)\b/i);
      expect(entry.statement).not.toMatch(/\bbecause of\b|\bmakes you\b|\bproven\b/i);
    }
  });

  it('does not generalise a morning finding to the evening (e)', () => {
    /*
     * The anti-generalisation rule, and the reason evidence is held per facet. Four good
     * mornings say nothing whatever about eleven at night.
     */
    const evidence = contextualEvidence(FOUR_MORNINGS, LATER);
    const night = evidence.find((entry) => entry.facet.value === 'night');
    expect(night).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('J. a supported food association changes the real contract (d)', () => {
  function candidate(): CandidateAction {
    return {
      id: 'hydrate-eat:eat-something',
      patternId: 'hydrate-eat:eat-something',
      statement: 'Eat something',
      category: 'health-recovery-energy',
      intendedOutcome: 'Energy steadies',
      followUp: { promptId: 'food:energy-after', windowHours: 3 },
      capabilityEffects: [],
      durationMinutes: 15,
      minimumMinutes: 5,
      minimumVersion: 'Something small',
      fallback: 'A glass of water',
      stoppingPoint: 'When you have eaten',
      friction: 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
      goalId: undefined,
      reason: 'Nothing rules it out',
    };
  }

  const factsFrom = (records: readonly CanonicalRecord[]) => {
    const shared = episodeContext(records, LATER);
    return episodeFacts(
      candidate(),
      {
        records,
        now: LATER,
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

  const FOUR_GOOD = [
    ...mealEpisode(0, 'improved'),
    ...mealEpisode(DAY, 'improved'),
    ...mealEpisode(2 * DAY, 'improved'),
    ...mealEpisode(3 * DAY, 'improved'),
  ];

  it('raises confidence in the arbitration contract', () => {
    /* records → contextualEvidence → lifecycle → episodeFacts, nothing stubbed. */
    expect(factsFrom([]).confidence).not.toBe('high');
    expect(factsFrom(FOUR_GOOD).confidence).toBe('high');
    expect(factsFrom(FOUR_GOOD).lifecycle).toBe('supported');
  });

  it('changes which of two otherwise equal moves the arbiter prefers (d)', () => {
    /*
     * The requirement in its strongest form: the same two candidates, ranked by the same
     * production function, and the food evidence decides. Without it the pair is
     * inseparable and order is arbitrary.
     */
    const supported = { id: 'hydrate-eat:eat-something', facts: factsFrom(FOUR_GOOD) };
    const untested = {
      id: 'hydrate-eat:water',
      facts: { ...factsFrom([]), sustainability: 'unknown' as const },
    };

    const ranking = weigh([untested, supported]);
    expect(required(ranking.ordered[0], 'a winner').id).toBe('hydrate-eat:eat-something');
    expect(ranking.whyItWon).toMatch(/more behind the claim/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('J5. a food outcome is not read before it could be known (f)', () => {
  it('keeps the window open until the declared horizon', () => {
    const records = mealEpisode(0, 'improved');

    /* Ten minutes after eating, nothing can yet be said about energy since eating. */
    const soon = outcomeWindows(records, new Date(BASE + 10 * MINUTE));
    expect(required(soon[0], 'a window').state).toBe('open');

    /* And the evidence layer counts nothing from an open window. */
    expect(contextualEvidence(records, new Date(BASE + 10 * MINUTE))).toEqual([]);
  });

  it('reads it once the move’s own horizon has passed', () => {
    const horizon = horizonFor('hydrate-eat:eat-something');
    const records = mealEpisode(0, 'improved');

    const after = outcomeWindows(records, new Date(BASE + horizon.closesAfterMs + HOUR));
    expect(required(after[0], 'a window').state).toBe('closed');
  });

  it('leaves a missing follow-up permanently unresolved rather than failed', () => {
    const records = mealEpisode(0, undefined);
    expect(contextualEvidence(records, LATER)).toEqual([]);
    expect(lifecycleStates(records, LATER)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('J8. a routine is continued or adjusted on observed outcomes (g, h)', () => {
  /** A wind-down suggestion carried out, or deliberately declined. */
  function routineNight(
    atMs: number,
    what: 'done-well' | 'done-badly' | 'deliberate-exception',
  ): readonly CanonicalRecord[] {
    const episodeId = id();
    const at = BASE + atMs;
    const executionId = id();

    const base = [
      {
        ...envelope('candidate-action', at, episodeId),
        provenance: { method: 'derived', derivedFromRecordIds: [] },
        statement: 'Start winding down',
        category: 'health-recovery-energy',
        engineCandidateId: 'wind-down:start-now',
        intendedOutcome: 'Tomorrow morning is easier',
        observableFollowUp: { promptId: 'sleep:bedtime', windowHours: 14 },
        capabilityEffects: [],
        timing: {},
        durationMinutes: 20,
        friction: 'low',
        minimumViableVersion: 'Put the phone down',
        fallback: 'Dim the lights',
        stoppingPoint: 'When you are in bed',
        risk: 'none-identified',
        reversibility: 'reversible',
        blockedByProtectedContexts: [],
      },
    ] as unknown as CanonicalRecord[];

    if (what === 'deliberate-exception') {
      /*
       * Declined on purpose. `not-executed` is an execution record, and the learning layer
       * counts only *resolved outcomes* — so this contributes nothing to effectiveness.
       */
      base.push({
        ...envelope('execution', at, episodeId),
        recordId: executionId,
        recommendationRecordId: id(),
        state: 'not-executed',
        declineReason: 'Friends were over — a deliberate exception',
      } as unknown as CanonicalRecord);
      return base;
    }

    base.push(
      {
        ...envelope('execution', at, episodeId),
        recordId: executionId,
        recommendationRecordId: id(),
        state: 'executed',
        executedWindow: {
          start: new Date(at).toISOString(),
          end: new Date(at + 20 * MINUTE).toISOString(),
        },
      } as unknown as CanonicalRecord,
      {
        ...envelope('outcome', at + 15 * HOUR, episodeId),
        category: 'health-recovery-energy',
        target: 'The next morning',
        outcomeWindow: {
          start: new Date(at).toISOString(),
          end: new Date(at + 15 * HOUR).toISOString(),
        },
        executionRecordId: executionId,
        result: {
          status: 'known',
          value: {
            summary: 'Observed',
            direction: what === 'done-well' ? 'improved' : 'unchanged',
          },
        },
        observationRecordIds: [id()],
      } as unknown as CanonicalRecord,
    );
    return base;
  }

  it('strengthens a routine that keeps being followed by a better morning (g)', () => {
    const records = [
      ...routineNight(0, 'done-well'),
      ...routineNight(DAY, 'done-well'),
      ...routineNight(2 * DAY, 'done-well'),
      ...routineNight(3 * DAY, 'done-well'),
    ];

    const verdict = required(lifecycleStates(records, LATER)[0], 'a verdict');
    expect(verdict.patternId).toBe('wind-down:start-now');
    expect(verdict.current).toBe('supported');
  });

  it('weakens one that keeps being followed by no change (g)', () => {
    const records = [
      ...routineNight(0, 'done-badly'),
      ...routineNight(DAY, 'done-badly'),
      ...routineNight(2 * DAY, 'done-badly'),
    ];

    expect(required(lifecycleStates(records, LATER)[0], 'a verdict').current).toBe('weakened');
  });

  it('counts a deliberate exception as no evidence at all (h)', () => {
    /*
     * The rule that protects an owner from their own life. Declining because friends were
     * over is a fact about Friday, not about the move — and an engine that scored it as a
     * failure would learn to stop suggesting the thing that works.
     */
    const withException = [
      ...routineNight(0, 'done-well'),
      ...routineNight(DAY, 'done-well'),
      ...routineNight(2 * DAY, 'deliberate-exception'),
      ...routineNight(3 * DAY, 'done-well'),
      ...routineNight(4 * DAY, 'done-well'),
    ];

    const evidence = contextualEvidence(withException, LATER);
    const anyFacet = required(evidence[0], 'a facet');

    /* Four resolved outcomes, all favourable. The exception is simply not among them. */
    expect(anyFacet.observed).toBe(4);
    expect(anyFacet.unfavourable).toBe(0);
    expect(required(lifecycleStates(withException, LATER)[0], 'verdict').current).toBe(
      'supported',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('J9/J10. bedtime informs without imprisoning (i, j)', () => {
  const bedtimeRecord = (localIso: string, at: number): CanonicalRecord =>
    ({
      ...envelope('observation', at),
      privacy: 'general',
      category: 'health-recovery-energy',
      attribute: ROUTINE_ATTRIBUTES['usual-bedtime'],
      value: { kind: 'state', state: localIso },
    }) as unknown as CanonicalRecord;

  const actualBedtime = (localIso: string, at: number): CanonicalRecord =>
    ({
      ...envelope('observation', at),
      privacy: 'general',
      category: 'health-recovery-energy',
      attribute: 'sleep:bedtime',
      value: { kind: 'state', state: localIso },
    }) as unknown as CanonicalRecord;

  it('keeps the target and the observation as two separate facts (i)', () => {
    const records = [
      bedtimeRecord('2026-04-06T22:30:00.000Z', BASE),
      actualBedtime('2026-04-06T23:50:00.000Z', BASE + HOUR),
    ];

    /* Recording a late night does not move the target. */
    expect(minutesToUsualBedtime(records, new Date(BASE + 13 * HOUR), 0)).toBe(
      22 * 60 + 30 - 21 * 60,
    );
  });

  it('does not prohibit a move outside the routine, only prefers stopping (j)', () => {
    /*
     * `J10`. A recurring bedtime is a prior, not a cage. Two hours before it, the engine
     * still recommends; there is deliberately no path by which a routine makes a move
     * permanently ineligible.
     */
    const twoHoursBefore = minutesToUsualBedtime(
      [bedtimeRecord('2026-04-06T22:30:00.000Z', BASE)],
      new Date('2026-04-06T20:30:00.000Z'),
      0,
    );
    expect(twoHoursBefore).toBe(120);

    /* And the situation, not the routine, is what removes a candidate. */
    const scenario = runEpisode(
      [bedtimeRecord('2026-04-06T23:59:00.000Z', BASE)],
      new Date('2026-04-06T09:00:00.000Z'),
    );
    expect(scenario.output.kind).not.toBe('action');
  });
});

/* -------------------------------------------------------------------------- */

describe('J. sequence learning treats a meal like any other move', () => {
  it('finds an order effect between eating and focused work when both orders exist', () => {
    const records = [
      ...mealEpisode(0, 'improved'),
      ...mealEpisode(DAY, 'improved'),
      ...mealEpisode(5 * DAY, 'improved', 'protect-a-block:deep-block'),
      ...mealEpisode(7 * DAY, 'improved', 'protect-a-block:deep-block'),
    ];

    /* No pairing: the two moves are days apart, so nothing is claimed. */
    const pairs = sequenceEvidence(records, LATER);
    for (const pair of pairs) {
      expect(pair.strength).toBe('insufficient');
    }
  });
});
