import { describe, expect, it } from 'vitest';
import { MOVE_FAMILIES, MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import {
  MOVE_LIFECYCLE,
  MOVE_SAFETY,
  OBSERVATION_WINDOWS,
} from '../../src/domain/moves/families';
import { ALL_PROMPTS } from '../../src/domain/prompts/definitions';
import { DOMAIN_IDS } from '../../src/domain/domains/definitions';

/**
 * The catalogue inventory (`V33-042`, v3.3 section D2/D3).
 *
 * The breadth target is a hundred or so genuinely distinct patterns, and the only thing
 * standing between that and a hundred rewordings is this file. Every check here exists
 * because it is a way the number could be inflated without the owner gaining a single new
 * option.
 */

const BREADTH_TARGET = 100;

/* -------------------------------------------------------------------------- */

describe('breadth, counted honestly', () => {
  it('reaches the target', () => {
    expect(MOVE_PATTERNS.length).toBeGreaterThanOrEqual(BREADTH_TARGET);
  });

  it('reports the shape of the catalogue by family', () => {
    /*
     * Not an assertion so much as the inventory itself. If one family holds a third of
     * the catalogue, the breadth is narrower than the count suggests.
     */
    const byFamily = new Map<string, number>();
    for (const pattern of MOVE_PATTERNS) {
      byFamily.set(pattern.familyId, (byFamily.get(pattern.familyId) ?? 0) + 1);
    }

    expect(byFamily.size).toBe(MOVE_FAMILIES.length);
    for (const [familyId, count] of byFamily) {
      /* No family may be a third of the catalogue on its own. */
      expect(count / MOVE_PATTERNS.length, familyId).toBeLessThan(0.34);
      /* And a family of one is a pattern that has been given a category. */
      expect(count, familyId).toBeGreaterThan(1);
    }
  });

  it('gives every family at least one pattern', () => {
    const used = new Set(MOVE_PATTERNS.map((pattern) => pattern.familyId));
    for (const family of MOVE_FAMILIES) {
      expect(used.has(family.familyId), family.familyId).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('no padding', () => {
  it('uses every pattern id exactly once', () => {
    const ids = MOVE_PATTERNS.map((pattern) => pattern.patternId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never reuses a statement', () => {
    const statements = MOVE_PATTERNS.map((pattern) => pattern.statement.toLowerCase());
    expect(new Set(statements).size).toBe(statements.length);
  });

  it('makes every pattern say how it differs from its siblings', () => {
    for (const pattern of MOVE_PATTERNS) {
      expect(pattern.distinctBecause.length, pattern.patternId).toBeGreaterThan(20);
      /* And the reason has to be about the pattern, not a restatement of it. */
      expect(pattern.distinctBecause.toLowerCase(), pattern.patternId).not.toBe(
        pattern.statement.toLowerCase(),
      );
    }
  });

  it('never gives two siblings the same reason for existing', () => {
    /*
     * The subtlest form of padding: five variants that each say "the short version".
     * Checked within a family, because the same reason in two families is legitimate.
     */
    for (const family of MOVE_FAMILIES) {
      const reasons = MOVE_PATTERNS.filter(
        (pattern) => pattern.familyId === family.familyId,
      ).map((pattern) => pattern.distinctBecause.toLowerCase());
      expect(new Set(reasons).size, family.familyId).toBe(reasons.length);
    }
  });

  it('never lets two siblings share the same shape, size and effect', () => {
    /*
     * Two patterns in one family that need the same situation, take the same time, are
     * judged over the same window *and* claim the same effect are the same move twice,
     * however differently they read.
     *
     * Effect is part of the signature because it is a real axis of difference, not a
     * loophole: "put the phone in another room" and "stop for tonight" are both a
     * one-minute evening act, and one improves tomorrow while the other protects it.
     */
    for (const family of MOVE_FAMILIES) {
      const shapes = MOVE_PATTERNS.filter(
        (pattern) => pattern.familyId === family.familyId,
      ).map((pattern) =>
        [
          pattern.capacity?.shape ?? 'none',
          String(pattern.durationMinutes),
          String(pattern.minimumMinutes),
          pattern.observationWindow,
          pattern.effects
            .map((effect) => `${effect.channel}:${effect.effect}:${effect.magnitude}`)
            .sort()
            .join(','),
        ].join('|'),
      );
      expect(new Set(shapes).size, family.familyId).toBe(shapes.length);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('every pattern carries what ranking and safety need', () => {
  it('names a family that exists', () => {
    const families = new Set(MOVE_FAMILIES.map((family) => family.familyId));
    for (const pattern of MOVE_PATTERNS) {
      expect(families.has(pattern.familyId), pattern.patternId).toBe(true);
    }
  });

  it('declares a real follow-up prompt and an observation window', () => {
    const prompts = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const pattern of MOVE_PATTERNS) {
      expect(prompts.has(pattern.followUp.promptId), pattern.patternId).toBe(true);
      expect(OBSERVATION_WINDOWS, pattern.patternId).toContain(pattern.observationWindow);
      expect(pattern.followUp.windowHours, pattern.patternId).toBeGreaterThan(0);
    }
  });

  it('declares a safety class and a lifecycle state', () => {
    for (const pattern of MOVE_PATTERNS) {
      expect(MOVE_SAFETY, pattern.patternId).toContain(pattern.safety);
      expect(MOVE_LIFECYCLE, pattern.patternId).toContain(pattern.lifecycle);
    }
  });

  it('can always be cut down to something smaller', () => {
    for (const pattern of MOVE_PATTERNS) {
      expect(pattern.minimumMinutes, pattern.patternId).toBeGreaterThan(0);
      expect(pattern.minimumMinutes, pattern.patternId).toBeLessThanOrEqual(
        pattern.durationMinutes,
      );
      expect(pattern.minimumVersion.length, pattern.patternId).toBeGreaterThan(0);
      expect(pattern.fallback.length, pattern.patternId).toBeGreaterThan(0);
      expect(pattern.stoppingPoint.length, pattern.patternId).toBeGreaterThan(0);
    }
  });

  it('states an observable intended outcome, never a feeling', () => {
    for (const pattern of MOVE_PATTERNS) {
      expect(pattern.intendedOutcome.length, pattern.patternId).toBeGreaterThan(10);
      expect(pattern.intendedOutcome.toLowerCase(), pattern.patternId).not.toMatch(
        /feel better|feel good|be happy/,
      );
    }
  });

  it('carries a rule version so evidence can be told apart later', () => {
    for (const pattern of MOVE_PATTERNS) {
      expect(pattern.version, pattern.patternId).toBeGreaterThanOrEqual(1);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the catalogue contradicts itself only deliberately', () => {
  it('points every declared contradiction at a real pattern', () => {
    const ids = new Set(MOVE_PATTERNS.map((pattern) => pattern.patternId));
    for (const pattern of MOVE_PATTERNS) {
      for (const other of pattern.contradicts ?? []) {
        expect(ids.has(other), `${pattern.patternId} -> ${other}`).toBe(true);
        expect(other, pattern.patternId).not.toBe(pattern.patternId);
      }
    }
  });

  it('points every prerequisite at a real pattern, one hop only', () => {
    const byId = new Map(MOVE_PATTERNS.map((pattern) => [pattern.patternId, pattern]));
    for (const pattern of MOVE_PATTERNS) {
      if (pattern.after === undefined) continue;
      const prerequisite = byId.get(pattern.after);
      expect(prerequisite, `${pattern.patternId} -> ${pattern.after}`).toBeDefined();
      /* One hop. A chain of three is a task list, which this product refuses to be. */
      expect(prerequisite?.after, pattern.patternId).toBeUndefined();
    }
  });

  it('records that going to bed and starting a block cannot both be right', () => {
    const stop = MOVE_PATTERNS.find(
      (pattern) => pattern.patternId === 'wind-down:stop-for-tonight',
    );
    expect(stop?.contradicts).toContain('protect-a-block:deep-block');
  });
});

/* -------------------------------------------------------------------------- */

describe('the vocabulary the catalogue may not contain', () => {
  it('has no calorie, macro, dose, or treatment language anywhere', () => {
    /*
     * Not filtered at render time — absent from the source. The Blueprint forbids workout
     * programming, calorie tracking, treatment claims and diagnosis, and this is what
     * makes that structural rather than a rule someone has to remember.
     */
    const text = JSON.stringify(MOVE_PATTERNS).toLowerCase();
    for (const word of [
      'calorie',
      'macro',
      'protein gram',
      'milligram',
      'dosage',
      'supplement',
      'medication',
      'diagnos',
      'symptom of',
      'treat your',
      'reps',
      'sets of',
    ]) {
      expect(text, word).not.toContain(word);
    }
  });

  it('promises no number it could not support', () => {
    /*
     * There is no numeric effect field, and there must never be one: a range needs a
     * defined metric and comparable observations, and authoring happens before any
     * evidence exists at all.
     */
    const text = JSON.stringify(MOVE_PATTERNS).toLowerCase();
    expect(text).not.toMatch(/\+\d+\s*(points|%)/);
    expect(text).not.toMatch(/\b\d{1,3}% (better|more|improvement)/);
  });

  it('blames nobody, anywhere in the catalogue', () => {
    const text = JSON.stringify(MOVE_PATTERNS).toLowerCase();
    for (const word of ['lazy', 'excuse', 'procrastinat', 'discipline', 'willpower failure']) {
      expect(text, word).not.toContain(word);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('families describe a decision job, not a topic', () => {
  it('gives every family a job and at least one domain', () => {
    for (const family of MOVE_FAMILIES) {
      expect(family.decisionJob.length, family.familyId).toBeGreaterThan(20);
      expect(family.domains.length, family.familyId).toBeGreaterThan(0);
      for (const domain of family.domains) {
        expect(DOMAIN_IDS, family.familyId).toContain(domain);
      }
    }
  });

  it('uses every family id exactly once', () => {
    const ids = MOVE_FAMILIES.map((family) => family.familyId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
