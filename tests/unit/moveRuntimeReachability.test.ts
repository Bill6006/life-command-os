import { describe, expect, it } from 'vitest';
import { HEALTH_ACTIONS, HEALTH_ACTION_IDS } from '../../src/domain/health/actions';
import { CAREER_ACTIONS, CAREER_ACTION_IDS } from '../../src/domain/career/ladder';
import { EMOTIONAL_ACTIONS, EMOTIONAL_ACTION_IDS } from '../../src/domain/emotional/regulation';
import { FAITH_ACTIONS, FAITH_ACTION_IDS } from '../../src/domain/faith/meaning';
import { FATHERHOOD_ACTIONS, FATHERHOOD_ACTION_IDS } from '../../src/domain/fatherhood/actions';
import { ENVIRONMENT_ACTIONS, ENVIRONMENT_ACTION_IDS } from '../../src/domain/home/environment';
import { MONEY_ACTIONS, MONEY_ACTION_IDS } from '../../src/domain/money/strategy';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import { findPattern, recommendablePatterns } from '../../src/domain/moves/registry';

/**
 * Runtime reachability, counted honestly (`V33-048`, v3.3 section D).
 *
 * ## Why this file is separate from `moveReachability.test.ts`
 *
 * That one asks whether the registry *can* find a pattern. This one asks whether the
 * product can actually offer it, which is a much harder question and currently has a much
 * smaller answer. Keeping them apart stops "102 patterns exist" from being read as "102
 * patterns can be recommended", which was true of the previous commit and is still mostly
 * true of this one.
 *
 * ## The number, stated plainly
 *
 * Only health has been migrated. Its seven actions are now views over catalogue patterns
 * rather than an independent list, so those seven are genuinely reachable through the real
 * generation path. The other six domains still author their own, and the shared core
 * generator still builds three candidates inline.
 *
 * These tests assert that number rather than an aspiration, so it can only go up
 * deliberately — and so nobody has to trust a summary.
 */

/**
 * Every domain's authored list, now that all seven are views over the catalogue.
 *
 * Read through the same objects the generators read, so this cannot drift from what the
 * product can actually produce — if a slice went back to authoring its own move, its
 * entries would stop having a `patternId` and this would stop compiling.
 */
const MIGRATED_DOMAINS: readonly { readonly domain: string; readonly patternIds: string[] }[] =
  [
    {
      domain: 'health-recovery-energy',
      patternIds: HEALTH_ACTION_IDS.map((id) => HEALTH_ACTIONS[id].patternId),
    },
    {
      domain: 'career-and-learning',
      patternIds: CAREER_ACTION_IDS.map((id) => CAREER_ACTIONS[id].patternId),
    },
    {
      domain: 'emotional-and-relationships',
      patternIds: EMOTIONAL_ACTION_IDS.map((id) => EMOTIONAL_ACTIONS[id].patternId),
    },
    {
      domain: 'faith-and-meaning',
      patternIds: FAITH_ACTION_IDS.map((id) => FAITH_ACTIONS[id].patternId),
    },
    {
      domain: 'fatherhood',
      patternIds: FATHERHOOD_ACTION_IDS.map((id) => FATHERHOOD_ACTIONS[id].patternId),
    },
    {
      domain: 'home-and-environment',
      patternIds: ENVIRONMENT_ACTION_IDS.map((id) => ENVIRONMENT_ACTIONS[id].patternId),
    },
    {
      domain: 'money',
      patternIds: MONEY_ACTION_IDS.map((id) => MONEY_ACTIONS[id].patternId),
    },
    {
      /* The shared generator, which builds three candidates from canonical patterns. */
      domain: 'shared-core',
      patternIds: [
        'protect-a-block:deep-block',
        'unblock-by-asking:send-the-message',
        'pause:screen-break',
      ],
    },
  ];

function runtimeReachable(): ReadonlySet<string> {
  return new Set(MIGRATED_DOMAINS.flatMap((entry) => entry.patternIds));
}

/* -------------------------------------------------------------------------- */

describe('the counts, separately', () => {
  it('reports the total authored catalogue', () => {
    expect(MOVE_PATTERNS.length).toBeGreaterThanOrEqual(100);
  });

  it('reports how many are active rather than retired', () => {
    /* Nothing is retired yet — the lifecycle exists, evidence has not moved anything. */
    expect(recommendablePatterns().length).toBe(MOVE_PATTERNS.length);
  });

  it('reports how many are reachable through real generation', () => {
    const reachable = runtimeReachable();

    /*
     * Thirty-five, across all seven slices and the shared generator. Asserted exactly so
     * the number cannot drift in either direction without somebody meaning it: a slice
     * that stopped offering a pattern would drop it, and a slice that started authoring
     * its own would not raise it.
     *
     * It is a long way short of the catalogue, and that is the honest state. Each slice
     * still selects the handful of patterns it always had; what changed is that those
     * selections are now views over one authored source instead of eight. Widening the
     * selections is the next piece of work and is a separate decision from the migration.
     */
    expect(reachable.size).toBe(35);
    expect(reachable.size).toBeLessThan(MOVE_PATTERNS.length);
  });

  it('names what is not yet reachable, and why', () => {
    const reachable = runtimeReachable();
    const unreachable = MOVE_PATTERNS.filter((entry) => !reachable.has(entry.patternId));

    /*
     * Not "intentionally unreachable" — *not yet* reachable. Every one of these is
     * authored, valid, and waiting on its domain's generator to be migrated. There are
     * no patterns in this catalogue that are meant never to be offered.
     */
    expect(unreachable.length).toBe(MOVE_PATTERNS.length - reachable.size);
    for (const entry of unreachable) {
      expect(entry.lifecycle, entry.patternId).not.toBe('retired');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('health is genuinely a view over the catalogue', () => {
  it('gives every action a canonical pattern that exists', () => {
    for (const id of HEALTH_ACTION_IDS) {
      const action = HEALTH_ACTIONS[id];
      expect(action.patternId, id).toBeDefined();
      expect(findPattern(action.patternId), id).toBeDefined();
    }
  });

  it('keeps the local ids the generator and its evidence already use', () => {
    /* Candidate ids are `health:${id}`; changing them would detach recorded outcomes. */
    expect([...HEALTH_ACTION_IDS].sort()).toEqual(
      [
        'eat-something',
        'gentle-movement',
        'hydrate',
        'meditate',
        'pause',
        'prepare-for-sleep',
        'seek-human-support',
      ].sort(),
    );
  });

  it('never maps two actions onto the same pattern', () => {
    const patternIds = HEALTH_ACTION_IDS.map((id) => HEALTH_ACTIONS[id].patternId);
    expect(new Set(patternIds).size).toBe(patternIds.length);
  });

  it('takes duration, minimum and shape from the catalogue, not from itself', () => {
    /*
     * The fields ranking reads must come from one place. A domain quietly disagreeing
     * with the catalogue about how long a move takes is the fragmentation this replaced.
     */
    for (const id of HEALTH_ACTION_IDS) {
      const action = HEALTH_ACTIONS[id];
      const source = findPattern(action.patternId);
      expect(action.durationMinutes, id).toBe(source?.durationMinutes);
      expect(action.minimumMinutes, id).toBe(source?.minimumMinutes);
      expect(action.friction, id).toBe(source?.friction);
      expect(action.capacity?.shape, id).toBe(source?.capacity?.shape);
    }
  });

  it('keeps the wording health had where it was better', () => {
    /*
     * The migration must not cost the owner a sentence. Health said more than the generic
     * catalogue line about what happens after eating — that nothing is being counted —
     * and that reassurance is the point of the sentence.
     */
    const eat = HEALTH_ACTIONS['eat-something'];
    expect(eat.stoppingPoint).toBe('When you have eaten. Nothing here is counted or scored.');
    expect(eat.followUp.promptId).toBe('food:energy-after');
  });

  it('overrides wording without touching identity', () => {
    /* A different sentence from the catalogue's, and the same pattern behind it. */
    const eat = HEALTH_ACTIONS['eat-something'];
    const source = findPattern(eat.patternId);

    expect(eat.stoppingPoint).not.toBe(source?.stoppingPoint);
    expect(eat.followUp.promptId).not.toBe(source?.followUp.promptId);
    expect(eat.patternId).toBe('hydrate-eat:eat-something');
  });

  it('authors nothing of its own any more', async () => {
    /*
     * The structural claim. `actions.ts` used to hold seven hand-written moves; it now
     * holds seven `adapt` calls and no move literals at all. A new `statement:` at the
     * top level of a move object would be a move authored outside the catalogue.
     */
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/domain/health/actions.ts', 'utf8'),
    );

    /* Every move in the file comes through the adapter. */
    const adaptCalls = source.match(/adapt\(/g) ?? [];
    expect(adaptCalls.length).toBe(HEALTH_ACTION_IDS.length);

    /* And nothing declares the fields that only the catalogue may set. */
    expect(source).not.toMatch(/^\s+durationMinutes:\s*\d/m);
    expect(source).not.toMatch(/^\s+capabilityEffects:\s*\[/m);
  });
});
