import { describe, expect, it } from 'vitest';
import { HEALTH_ACTIONS, HEALTH_ACTION_IDS } from '../../src/domain/health/actions';
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

/** Patterns a migrated domain can actually produce today. */
const MIGRATED_DOMAINS: readonly { readonly domain: string; readonly patternIds: string[] }[] =
  [
    {
      domain: 'health-recovery-energy',
      patternIds: HEALTH_ACTION_IDS.map((id) => HEALTH_ACTIONS[id].patternId),
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

  it('reports how many are reachable through real generation, and it is not all of them', () => {
    const reachable = runtimeReachable();

    /*
     * Seven, from health. Asserted exactly, so migrating another domain has to update
     * this number and cannot happen silently — and so this file cannot quietly drift
     * into claiming more than the product does.
     */
    expect(reachable.size).toBe(7);
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
