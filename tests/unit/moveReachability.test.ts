import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import {
  LEGACY_ALIASES,
  canonicalPatternId,
  conflictsWith,
  contradicts,
  findPattern,
  patternsForDomain,
  recommendablePatterns,
} from '../../src/domain/moves/registry';
import {
  PERSONALISATION_SLOTS,
  personalise,
  withPreferredWording,
} from '../../src/domain/moves/personalise';
import { DOMAIN_IDS } from '../../src/domain/domains/definitions';
import { required } from '../support/required';

/**
 * Reachability and the migration boundary (`V33-043`, v3.3 section D).
 *
 * The catalogue is only canonical if nothing routes around it. These tests are the thing
 * that makes that claim checkable rather than aspirational — and, just as importantly,
 * they state honestly how far the migration has actually got, so a partially-migrated
 * engine cannot be mistaken for a finished one.
 */

/* -------------------------------------------------------------------------- */

describe('the registry is the only door into the catalogue', () => {
  it('resolves every legacy candidate id to a pattern that exists', () => {
    /*
     * Evidence has been attaching to ids like `health:pause` since Phase 7. An alias that
     * points nowhere would silently detach all of it.
     */
    for (const [legacy, canonical] of Object.entries(LEGACY_ALIASES)) {
      expect(findPattern(legacy), legacy).toBeDefined();
      expect(canonicalPatternId(legacy), legacy).toBe(canonical);
      expect(findPattern(canonical), canonical).toBeDefined();
    }
  });

  it('leaves a canonical id alone', () => {
    expect(canonicalPatternId('pause:screen-break')).toBe('pause:screen-break');
    expect(findPattern('pause:screen-break')?.familyId).toBe('pause');
  });

  it('returns nothing for an id that is neither', () => {
    expect(findPattern('nonsense:not-a-move')).toBeUndefined();
  });

  it('never aliases two legacy ids onto a pattern that does not exist', () => {
    const ids = new Set(MOVE_PATTERNS.map((entry) => entry.patternId));
    for (const canonical of Object.values(LEGACY_ALIASES)) {
      expect(ids.has(canonical), canonical).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('what is reachable, stated honestly', () => {
  it('offers every non-retired pattern for recommendation', () => {
    const recommendable = recommendablePatterns();
    const retired = MOVE_PATTERNS.filter((entry) => entry.lifecycle === 'retired');

    expect(recommendable.length + retired.length).toBe(MOVE_PATTERNS.length);
    for (const entry of recommendable) {
      expect(entry.lifecycle, entry.patternId).not.toBe('retired');
    }
  });

  it('gives every domain a set of patterns to draw on', () => {
    for (const domainId of DOMAIN_IDS) {
      const available = patternsForDomain(domainId);
      expect(available.length, domainId).toBeGreaterThan(0);
    }
  });

  it('reaches every pattern from at least one domain', () => {
    /*
     * A pattern in a family no domain claims is unreachable by construction — authored,
     * counted, and impossible to ever suggest.
     */
    const reachable = new Set(
      DOMAIN_IDS.flatMap((domainId) =>
        patternsForDomain(domainId).map((entry) => entry.patternId),
      ),
    );
    const orphans = MOVE_PATTERNS.filter((entry) => !reachable.has(entry.patternId));
    expect(orphans.map((entry) => entry.patternId)).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('no second move library survives the migration', () => {
  /** Every source file under `src`, so a new library cannot hide in a new folder. */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return sourceFiles(full);
      return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : [];
    });
  }

  it('keeps every legacy authored list inside its own domain', () => {
    /*
     * The migration is deliberately partial and this test says so rather than hiding it.
     * The per-domain action files still exist and their own slices, commands and area
     * views still read them — which is fine, because a domain owning its own vocabulary
     * was never the problem. The problem would be one of them reaching shared decision
     * code, where it would become a second engine-wide move source competing with the
     * catalogue.
     *
     * So the property is containment: an importer must belong to the same domain.
     */
    /*
     * Scoped to the exported **move list**, not the file. Those modules also export
     * enums and attribute names that shared code legitimately reads — the prompt
     * catalogue imports `MEDITATION_PURPOSES` from `health/actions`, and that is a
     * vocabulary, not a second library of moves.
     */
    const legacyLists: readonly { readonly symbol: string; readonly area: string }[] = [
      { symbol: 'HEALTH_ACTIONS', area: 'health' },
      { symbol: 'FATHERHOOD_ACTIONS', area: 'fatherhood' },
      { symbol: 'ENVIRONMENT_ACTIONS', area: 'home' },
      { symbol: 'MONEY_ACTIONS', area: 'money' },
      { symbol: 'FAITH_ACTIONS', area: 'faith' },
      { symbol: 'CAREER_ACTIONS', area: 'career' },
      { symbol: 'EMOTIONAL_ACTIONS', area: 'emotional' },
    ];

    for (const list of legacyLists) {
      const importers = sourceFiles('src').filter((file) => {
        const text = readFileSync(file, 'utf8');
        /* Its own declaration is not an import of it. */
        if (text.includes(`export const ${list.symbol}`)) return false;
        /*
         * An actual import, not a mention. The catalogue's own header explains what it
         * replaced and names `HEALTH_ACTIONS` in prose; naming a thing is not using it.
         */
        return new RegExp(`import[^;]*\\b${list.symbol}\\b[^;]*from`, 's').test(text);
      });

      for (const file of importers) {
        expect(
          file.toLowerCase().includes(list.area),
          `${file} reads ${list.symbol} but does not belong to ${list.area}`,
        ).toBe(true);
      }
    }
  });

  it('lets no domain author a move of its own any more', () => {
    /*
     * The structural guard (`V33-047`). Every slice's action list is now a set of
     * `adapt` / `adaptFlat` calls over the catalogue. A future move written directly into
     * one of these files would need the fields the catalogue owns — a duration, a set of
     * capability effects — and declaring either here is what a second authored library
     * looks like on its first day.
     */
    const lists = [
      'src/domain/health/actions.ts',
      'src/domain/fatherhood/actions.ts',
      'src/domain/home/environment.ts',
      'src/domain/money/strategy.ts',
      'src/domain/faith/meaning.ts',
      'src/domain/career/ladder.ts',
      'src/domain/emotional/regulation.ts',
    ];

    for (const file of lists) {
      const text = readFileSync(file, 'utf8');
      const inActions = text.slice(text.indexOf('_ACTIONS: Record'));

      expect(inActions, file).not.toMatch(/^\s+durationMinutes:\s*\d/m);
      expect(inActions, file).not.toMatch(/^\s+minimumMinutes:\s*\d/m);
      expect(inActions, file).not.toMatch(/^\s+capabilityEffects:/m);
      /* And every entry comes through the adapter. */
      expect(inActions, file).toMatch(/adapt(Flat)?\(/);
    }
  });

  it('never lets shared decision code import a per-domain action list', () => {
    const shared = sourceFiles('src').filter(
      (file) =>
        file.includes('command-core') ||
        file.includes(join('intelligence', 'decision')) ||
        file.includes(join('intelligence', 'intervention')),
    );

    for (const file of shared) {
      const text = readFileSync(file, 'utf8');
      for (const forbidden of [
        'domain/health/actions',
        'domain/fatherhood/actions',
        'domain/home/environment',
        'domain/money/strategy',
        'domain/faith/meaning',
        'domain/career/ladder',
        'domain/emotional/regulation',
      ]) {
        expect(text.includes(forbidden), `${file} imports ${forbidden}`).toBe(false);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('contradictions are symmetric and contextual (D4)', () => {
  it('holds in both directions however it was declared', () => {
    /* `stop-for-tonight` declares the conflict; the block does not have to. */
    expect(contradicts('wind-down:stop-for-tonight', 'protect-a-block:deep-block')).toBe(true);
    expect(contradicts('protect-a-block:deep-block', 'wind-down:stop-for-tonight')).toBe(true);
  });

  it('does not make a move contradict itself', () => {
    expect(contradicts('wind-down:stop-for-tonight', 'wind-down:stop-for-tonight')).toBe(false);
  });

  it('finds nothing between two unrelated moves', () => {
    expect(contradicts('hydrate-eat:water', 'reach-out:message-someone')).toBe(false);
  });

  it('resolves legacy ids on both sides', () => {
    /* `health:prepare-for-sleep` is `wind-down:start-now`, which a deep block contradicts. */
    expect(contradicts('health:prepare-for-sleep', 'protect-a-block:deep-block')).toBe(true);
  });

  it('lists every conflict with a chosen move', () => {
    const clashes = conflictsWith('wind-down:stop-for-tonight', [
      'protect-a-block:deep-block',
      'hydrate-eat:water',
      'move-body:longer-walk',
    ]);
    expect(clashes).toContain('protect-a-block:deep-block');
    expect(clashes).toContain('move-body:longer-walk');
    expect(clashes).not.toContain('hydrate-eat:water');
  });

  it('writes nothing, so a conflict tonight is not a ban tomorrow', () => {
    const source = readFileSync('src/domain/moves/registry.ts', 'utf8');
    expect(source).not.toMatch(/writeRecord|appendRecord|db\./);
  });
});

/* -------------------------------------------------------------------------- */

describe('personalisation changes words, never identity (D5)', () => {
  const base = required(
    MOVE_PATTERNS.find((entry) => entry.patternId === 'protect-a-block:deep-block'),
    'the deep-block pattern',
  );

  it('keeps the pattern id through substitution', () => {
    const result = personalise(
      { ...base, statement: 'Take twenty minutes on {goal}' },
      { goal: 'the migration write-up' },
    );

    expect(result.patternId).toBe('protect-a-block:deep-block');
    expect(result.statement).toBe('Take twenty minutes on the migration write-up');
    expect(result.personalised).toBe(true);
  });

  it('leaves a sentence that still reads when the fact is missing', () => {
    /* Braces on screen would be the failure mode of every template system. */
    const result = personalise({ ...base, statement: 'Take twenty minutes on {goal}' }, {});

    expect(result.statement).toBe('Take twenty minutes');
    expect(result.statement).not.toContain('{');
    expect(result.personalised).toBe(false);
  });

  it('changes nothing when the pattern has no slots', () => {
    const result = personalise(base, { goal: 'anything at all' });
    expect(result.statement).toBe(base.statement);
    expect(result.personalised).toBe(false);
  });

  it('lets a better domain wording win without minting a new move', () => {
    const result = withPreferredWording(personalise(base, {}), 'Pick up where you stopped');
    expect(result.statement).toBe('Pick up where you stopped');
    expect(result.patternId).toBe('protect-a-block:deep-block');
  });

  it('uses only slots the catalogue is allowed to contain', () => {
    const slots = new Set<string>(PERSONALISATION_SLOTS);
    for (const entry of MOVE_PATTERNS) {
      for (const text of [entry.statement, entry.minimumVersion]) {
        for (const match of text.matchAll(/\{(\w+)\}/g)) {
          expect(slots.has(match[1] ?? ''), `${entry.patternId}: {${match[1] ?? ''}}`).toBe(
            true,
          );
        }
      }
    }
  });

  it('never copies an owner fact into the catalogue', () => {
    const source = readFileSync('src/domain/moves/personalise.ts', 'utf8');
    expect(source).not.toMatch(/MOVE_PATTERNS\s*\.\s*push|MOVE_PATTERNS\[/);
  });
});
