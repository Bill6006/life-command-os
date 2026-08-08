import { describe, expect, it } from 'vitest';
import {
  RECENTLY_COMPLETED_MS,
  resolveContradictions,
  ruledOutByRecentAction,
} from '../../src/command-core/arbitration/contradictions';
import { supportingWins } from '../../src/intelligence/decision/supportingWins';
import type { CandidateAction, StateAssessment } from '../../src/intelligence/types';

/**
 * Contradiction handling, as behaviour rather than metadata (`V33-044`, `V33-045`).
 *
 * The catalogue declaring that two moves conflict is worth nothing on its own. These test
 * the thing that matters: that the declaration changes what reaches the owner, that it
 * changes it *contextually*, and that it never hardens into a ban.
 */

const NOW = new Date('2026-08-07T21:30:00.000Z');

function move(over: Partial<CandidateAction> = {}): CandidateAction {
  return {
    id: 'pause:screen-break',
    statement: 'Stop for ten minutes away from a screen',
    category: 'health-recovery-energy',
    intendedOutcome: 'Whatever is interfering eases',
    followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
    capabilityEffects: [],
    durationMinutes: 10,
    minimumMinutes: 5,
    minimumVersion: 'Two minutes standing up',
    fallback: 'Sit back for a minute',
    stoppingPoint: 'After ten minutes',
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: [],
    goalId: undefined,
    reason: 'test',
    ...over,
  };
}

const state = (over: Partial<StateAssessment> = {}): StateAssessment =>
  ({
    readings: [],
    availableMinutes: { status: 'unknown' },
    situation: {},
    situationPrior: { usually: {}, fromDays: 0, because: [] },
    capacity: { status: 'known', value: 'moderate' },
    protectedContexts: [],
    contradictions: [],
    unknowns: [],
    staleAttributes: [],
    basisRecordIds: [],
    confidence: { label: 'moderate-evidence', why: 'test', drivers: [] },
    ...over,
  }) as unknown as StateAssessment;

/* -------------------------------------------------------------------------- */

describe('two moves that cannot both be right', () => {
  const stopForTonight = move({
    id: 'wind-down:stop-for-tonight',
    statement: 'Stop for tonight. Protect sleep.',
  });
  const deepBlock = move({
    id: 'protect-a-block:deep-block',
    statement: 'Protect a block for the thing that matters most today',
    category: 'career-work-learning',
  });

  it('keeps the higher-ranked one and removes the other', () => {
    /* Ranking already happened; the first is the arbiter's answer. */
    const result = resolveContradictions([stopForTonight, deepBlock]);

    expect(result.kept.map((entry) => entry.id)).toEqual(['wind-down:stop-for-tonight']);
    expect(result.rejected).toHaveLength(1);
    expect(result.rejected[0]?.candidateId).toBe('protect-a-block:deep-block');
  });

  it('lets the other one win when it ranked higher instead', () => {
    /* The rule has no opinion about which side is right — only that one of them is. */
    const result = resolveContradictions([deepBlock, stopForTonight]);
    expect(result.kept.map((entry) => entry.id)).toEqual(['protect-a-block:deep-block']);
  });

  it('says the loser was beaten by something specific', () => {
    const result = resolveContradictions([stopForTonight, deepBlock]);
    expect(result.rejected[0]?.reason).toContain('Stop for tonight');
  });

  it('leaves unrelated moves alone', () => {
    const water = move({ id: 'hydrate-eat:water', statement: 'Have a glass of water' });
    const result = resolveContradictions([stopForTonight, water]);
    expect(result.kept).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
  });

  it('resolves a conflict declared through a legacy id', () => {
    const legacySleep = move({
      id: 'health:prepare-for-sleep',
      statement: 'Start winding down for sleep now',
    });
    const result = resolveContradictions([legacySleep, deepBlock]);
    expect(result.kept.map((entry) => entry.id)).toEqual(['health:prepare-for-sleep']);
  });
});

/* -------------------------------------------------------------------------- */

describe('a completed move rules out what it would undo', () => {
  it('blocks a focus block after winding down for the night', () => {
    const reason = ruledOutByRecentAction(
      'protect-a-block:deep-block',
      [
        {
          engineCandidateId: 'wind-down:stop-for-tonight',
          at: '2026-08-07T21:00:00.000Z',
        },
      ],
      NOW,
    );
    expect(reason).toMatch(/already done something this would undo/i);
  });

  it('says nothing about an unrelated completed move', () => {
    expect(
      ruledOutByRecentAction(
        'protect-a-block:deep-block',
        [{ engineCandidateId: 'hydrate-eat:water', at: '2026-08-07T21:00:00.000Z' }],
        NOW,
      ),
    ).toBeUndefined();
  });

  it('forgets a move completed long enough ago', () => {
    /*
     * Contextual, not permanent. Having wound down last night says nothing about this
     * afternoon, and a rule with no horizon would be a ban with extra steps.
     */
    const longAgo = new Date(NOW.getTime() - RECENTLY_COMPLETED_MS - 60_000).toISOString();
    expect(
      ruledOutByRecentAction(
        'protect-a-block:deep-block',
        [{ engineCandidateId: 'wind-down:stop-for-tonight', at: longAgo }],
        NOW,
      ),
    ).toBeUndefined();
  });

  it('ignores an unparseable timestamp rather than treating it as now', () => {
    expect(
      ruledOutByRecentAction(
        'protect-a-block:deep-block',
        [{ engineCandidateId: 'wind-down:stop-for-tonight', at: 'not a date' }],
        NOW,
      ),
    ).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('supporting wins never contradict the primary', () => {
  const primary = move({
    id: 'wind-down:stop-for-tonight',
    statement: 'Stop for tonight. Protect sleep.',
    originDomainId: 'health-recovery-energy',
  });

  it('drops a supporting win that fights the main answer', () => {
    const walk = move({
      id: 'move-body:longer-walk',
      statement: 'Take a walk of half an hour or so',
      originDomainId: 'career-and-learning',
      durationMinutes: 30,
      minimumMinutes: 5,
    });

    const wins = supportingWins(primary, [primary, walk], state());
    expect(wins.map((win) => win.id)).not.toContain('move-body:longer-walk');
  });

  it('keeps a supporting win that does not fight it', () => {
    const water = move({
      id: 'hydrate-eat:water',
      statement: 'Have a glass of water',
      originDomainId: 'money',
      durationMinutes: 2,
      minimumMinutes: 1,
    });

    const wins = supportingWins(primary, [primary, water], state());
    expect(wins.map((win) => win.id)).toContain('hydrate-eat:water');
  });

  it('never offers two supporting wins that contradict each other', () => {
    /*
     * The subtler case: neither fights the primary, but they fight one another. Offering
     * both would be the app presenting a disagreement as a menu.
     */
    const quiet = move({
      id: 'wind-down:start-now',
      statement: 'Start winding down for sleep now',
      originDomainId: 'faith-and-meaning',
      durationMinutes: 5,
      minimumMinutes: 2,
    });
    const block = move({
      id: 'protect-a-block:deep-block',
      statement: 'Protect a block',
      originDomainId: 'career-and-learning',
      durationMinutes: 5,
      minimumMinutes: 2,
    });

    const neutralPrimary = move({ id: 'find-out:read-one-thing', originDomainId: 'money' });
    const wins = supportingWins(neutralPrimary, [neutralPrimary, quiet, block], state());

    const ids = wins.map((win) => win.id);
    expect(
      ids.includes('wind-down:start-now') && ids.includes('protect-a-block:deep-block'),
    ).toBe(false);
  });
});
