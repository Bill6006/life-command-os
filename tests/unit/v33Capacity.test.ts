import { describe, expect, it } from 'vitest';
import {
  fits,
  timeWouldDiscriminate,
  type CapacityProfile,
  type SituationalCapacity,
} from '../../src/domain/domains/capacity';
import {
  NEAR_DUPLICATE_THRESHOLD,
  firstRealAlternative,
  judgeReplacement,
  statementOverlap,
} from '../../src/command-core/recompute/afterDecline';
import { activeDeclines } from '../../src/command-core/arbitration/declined';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { GUIDE_DEPTHS, type CanonicalRecord } from '../../src/domain/records';
import type { CandidateAction } from '../../src/intelligence/types';

/**
 * The seven properties owner clarification 10 requires proof of.
 *
 * Each block is one of them, asserted against behaviour rather than against the
 * implementation that currently happens to satisfy it.
 */

const NOW = new Date('2026-08-07T13:00:00.000Z');

function move(over: Partial<CandidateAction> = {}): CandidateAction {
  return {
    id: 'test:move',
    statement: 'Take a twenty minute walk outside',
    category: 'health-recovery-energy',
    intendedOutcome: 'Energy recovers enough to work',
    followUp: { promptId: 'state:energy', windowHours: 3 },
    capabilityEffects: [],
    durationMinutes: 20,
    minimumMinutes: 10,
    minimumVersion: 'A ten minute walk',
    fallback: 'Sit outside instead',
    stoppingPoint: 'When you get back',
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: [],
    goalId: undefined,
    reason: 'Energy is low and movement is the cheapest thing that shifts it',
    ...over,
  };
}

/* -------------------------------------------------------------------------- */

describe('1. usable action time does not control question count (clarification 1)', () => {
  it('plans the same questions whatever depth is passed', () => {
    const ids = (depth: (typeof GUIDE_DEPTHS)[number]): readonly string[] =>
      planGuide('morning', depth, [], NOW).steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );

    const baseline = ids('15');
    expect(baseline.length).toBeGreaterThan(0);
    for (const depth of GUIDE_DEPTHS) expect(ids(depth)).toEqual(baseline);
  });

  it('does not read a minutes answer as permission to ask more', () => {
    /*
     * The specific confusion: a large time answer must not lengthen the interrogation.
     * Time buys action, not questions.
     */
    const withPlentyOfTime: CanonicalRecord[] = [];
    const plan = planGuide('morning', 'full', withPlentyOfTime, NOW);
    expect(plan.steps.length).toBeLessThanOrEqual(5);
  });
});

/* -------------------------------------------------------------------------- */

describe('2. Can’t Now reranks globally rather than within one area (clarification 5)', () => {
  it('refuses a replacement from the area just declined', () => {
    const declined = move({ id: 'home:tidy', originDomainId: 'home-and-environment' });
    const sameArea = move({
      id: 'home:other',
      originDomainId: 'home-and-environment',
      statement: 'Sort the paperwork pile on the desk',
    });

    const verdict = judgeReplacement(declined, sameArea);
    expect(verdict.rejected).toBe(true);
    if (verdict.rejected) expect(verdict.because).toMatch(/stepped away/i);
  });

  it('accepts a genuinely different move from another area', () => {
    const declined = move({ id: 'home:tidy', originDomainId: 'home-and-environment' });
    const elsewhere = move({
      id: 'faith:call',
      originDomainId: 'faith-and-meaning',
      statement: 'Ring your brother before the evening gets away',
    });

    expect(judgeReplacement(declined, elsewhere).rejected).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('3. near-duplicates and shrunk repeats are suppressed (clarification 5)', () => {
  it('recognises the same move with the duration cut down', () => {
    const declined = move({ id: 'a', statement: 'Take a twenty minute walk outside' });
    const shrunk = move({
      id: 'b',
      statement: 'Take a ten minute walk outside',
      durationMinutes: 10,
    });

    const verdict = judgeReplacement(declined, shrunk);
    expect(verdict.rejected).toBe(true);
    if (verdict.rejected) expect(verdict.because).toMatch(/haggle/i);
  });

  it('scores obvious rewordings above the threshold and different moves below it', () => {
    expect(
      statementOverlap('Take a twenty minute walk outside', 'Take a ten minute walk outside'),
    ).toBeGreaterThanOrEqual(NEAR_DUPLICATE_THRESHOLD);

    expect(
      statementOverlap('Take a twenty minute walk outside', 'Ring your brother this evening'),
    ).toBeLessThan(NEAR_DUPLICATE_THRESHOLD);
  });

  it('walks past every disguised repeat to reach a real alternative', () => {
    const declined = move({ id: 'a', originDomainId: 'home-and-environment' });
    const { candidate, rejected } = firstRealAlternative(declined, [
      move({ id: 'b', statement: 'Take a ten minute walk outside', durationMinutes: 10 }),
      move({
        id: 'c',
        originDomainId: 'home-and-environment',
        statement: 'Clear the kitchen counter',
      }),
      move({
        id: 'd',
        originDomainId: 'faith-and-meaning',
        statement: 'Sit quietly for a few moments',
      }),
    ]);

    expect(candidate?.id).toBe('d');
    expect(rejected).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */

describe('4. parallel moves stay possible when the owner is busy (clarification 3)', () => {
  const busy: SituationalCapacity = {
    setting: 'work',
    engagement: 'working',
    interruptibility: 'none',
    privacy: 'public',
  };

  it('keeps a parallel move eligible in exactly the situation that blocks the others', () => {
    const parallel: CapacityProfile = { shape: 'parallel' };
    expect(fits(parallel, busy).eligible).toBe(true);

    for (const shape of ['exclusive-time', 'protected-focus'] as const) {
      expect(fits({ shape }, busy).eligible).toBe(false);
    }
  });

  it('blocks a focus move in public and allows it in private', () => {
    const focus: CapacityProfile = { shape: 'protected-focus' };
    expect(fits(focus, { privacy: 'public' }).eligible).toBe(false);
    expect(fits(focus, { privacy: 'private' }).eligible).toBe(true);
  });

  it('never blocks on an unknown', () => {
    /*
     * A fresh profile knows nothing about the situation. Reading that as "unsafe" would
     * silently delete whole categories of move on day one.
     */
    for (const shape of [
      'exclusive-time',
      'parallel',
      'transition',
      'prerequisite',
      'protected-focus',
    ] as const) {
      expect(fits({ shape }, {}).eligible).toBe(true);
    }
  });

  it('refuses a short exclusive block when an interruption would waste it', () => {
    const costly: CapacityProfile = { shape: 'exclusive-time', interruptionCost: 'total' };
    expect(fits(costly, { interruptibility: 'brief' }).eligible).toBe(false);
    expect(fits({ shape: 'exclusive-time' }, { interruptibility: 'brief' }).eligible).toBe(
      true,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('5. zero capacity can end in abstention (clarifications 7 and 8)', () => {
  it('returns nothing rather than the nearest available filler', () => {
    const declined = move({ id: 'a', originDomainId: 'home-and-environment' });
    const { candidate } = firstRealAlternative(declined, [
      move({ id: 'b', statement: 'Take a ten minute walk outside', durationMinutes: 10 }),
      move({
        id: 'c',
        originDomainId: 'home-and-environment',
        statement: 'Take a five minute walk outside',
      }),
    ]);

    expect(candidate).toBeUndefined();
  });

  it('offers no move at all when every shape is blocked by the situation', () => {
    const trapped: SituationalCapacity = { interruptibility: 'none', privacy: 'public' };
    const blocked = (['exclusive-time', 'protected-focus'] as const).filter(
      (shape) => !fits({ shape }, trapped).eligible,
    );
    expect(blocked).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */

describe('6. a temporary constraint releases on new evidence (clarification 6)', () => {
  /*
   * A decline is three records written together and joined by the episode id: the
   * execution that did not happen, and the candidate it refers to.
   */
  const decline = (at: string): readonly CanonicalRecord[] => [
    {
      recordType: 'execution',
      recordId: `decline-${at}`,
      state: 'not-executed',
      decisionEpisodeId: 'episode-1',
      recordedAt: at,
      occurredAt: at,
    } as unknown as CanonicalRecord,
    {
      recordType: 'candidate-action',
      recordId: `candidate-${at}`,
      decisionEpisodeId: 'episode-1',
      engineCandidateId: 'home:make-the-change',
      recordedAt: at,
      occurredAt: at,
    } as unknown as CanonicalRecord,
  ];

  const observation = (at: string): CanonicalRecord =>
    ({
      recordType: 'observation',
      recordId: `obs-${at}`,
      attribute: 'context:setting',
      recordedAt: at,
      occurredAt: at,
    }) as unknown as CanonicalRecord;

  it('holds the decline while nothing else has been recorded', () => {
    const held = activeDeclines(decline('2026-08-07T13:00:00.000Z'));
    expect(held.has('home:make-the-change')).toBe(true);
  });

  it('releases it the moment the situation is described again', () => {
    /*
     * "No time right now" and "at work" are statements about this hour, not standing
     * preferences. Anything recorded strictly afterwards is a new hour.
     */
    const released = activeDeclines([
      ...decline('2026-08-07T13:00:00.000Z'),
      observation('2026-08-07T17:30:00.000Z'),
    ]);
    expect(released.has('home:make-the-change')).toBe(false);
  });

  it('does not let the decline’s own snapshot release it', () => {
    const sameInstant = activeDeclines([
      ...decline('2026-08-07T13:00:00.000Z'),
      observation('2026-08-07T13:00:00.000Z'),
    ]);
    expect(sameInstant.has('home:make-the-change')).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('7. the app does not pester (clarification 7)', () => {
  it('will not manufacture a trivial move to fill the slot', () => {
    const declined = move({
      id: 'a',
      originDomainId: 'home-and-environment',
      durationMinutes: 30,
    });
    const trivial = move({
      id: 'b',
      originDomainId: 'home-and-environment',
      statement: 'Take a two minute walk outside',
      durationMinutes: 2,
    });

    expect(firstRealAlternative(declined, [trivial]).candidate).toBeUndefined();
  });

  it('asks for a minute count only when the answer would change the answer', () => {
    const twoDifferent = [
      { minimumMinutes: 10, durationMinutes: 10 },
      { minimumMinutes: 40, durationMinutes: 40 },
    ];

    /* Straddles the bands: a short reply leaves one move, a long reply leaves two. */
    expect(timeWouldDiscriminate(twoDifferent, {})).toBe(true);

    /* One move needing more than the shortest band — the reply is one move or none. */
    expect(timeWouldDiscriminate([{ minimumMinutes: 30, durationMinutes: 30 }], {})).toBe(true);

    /*
     * Possible in any band, but only doable in full in the longest. The answer decides
     * whether the owner is offered the move or its cut-down minimum, which is material.
     */
    expect(timeWouldDiscriminate([{ minimumMinutes: 10, durationMinutes: 30 }], {})).toBe(true);

    /* Fits the shortest band whole. No reply can change anything. */
    expect(
      timeWouldDiscriminate(
        [
          { minimumMinutes: 5, durationMinutes: 10 },
          { minimumMinutes: 5, durationMinutes: 12 },
        ],
        {},
      ),
    ).toBe(false);

    /* Nothing on the table. */
    expect(timeWouldDiscriminate([], {})).toBe(false);

    /* Already known: asking again is noise. */
    expect(timeWouldDiscriminate(twoDifferent, { minutesFree: 25 })).toBe(false);
  });
});
