import { describe, expect, it } from 'vitest';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import { personalise } from '../../src/domain/moves/personalise';
import { pattern } from '../../src/domain/moves/registry';
import { UNKNOWN_FACTS } from '../../src/command-core/arbitration/facts';
import { episodeFacts } from '../../src/command-core/arbitration/episodeFacts';
import { weigh } from '../../src/command-core/arbitration/weigh';
import type { CanonicalRecord, LifeCategory } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * Arbitration, proved through the production engine (`V33-061`, v3.3 sections D–F).
 *
 * ## Why this file is separate from `v33Arbitration.test.ts`
 *
 * That one tests the pieces: `judge`, `weigh`, `shouldAbstain`, `opportunityCost`. Useful,
 * and not sufficient — a contract can be perfect and unreachable, which is exactly what was
 * true of it for most of this pass. Every test here goes through `runEpisode`, so it fails
 * if any downstream stage drops, reorders, or ignores what the contract decided.
 *
 * The distinction is not academic. Two real dead zones were found by writing these and not
 * by writing the unit tests: the North Star gate silently removed every move whose benefit
 * lands tomorrow on a non-foundation channel, and the interruption threshold turned a
 * correctly-chosen quiet move into silence.
 */

/** An episode built from a named scenario plus extra records. */
function episode(scenarioId: string, extra: readonly CanonicalRecord[] = []) {
  const scenario = scenarioById(scenarioId);
  return runEpisode([...scenario.records, ...extra], new Date(scenario.nowIso));
}

const winnerOf = (result: ReturnType<typeof runEpisode>): string | undefined =>
  result.output.kind === 'action' ? result.output.candidate.id : undefined;

/** Candidates the catalogue produced, as opposed to a slice or the core generator. */
const fromCatalogue = (result: ReturnType<typeof runEpisode>) =>
  result.internal.candidates.filter((entry) => entry.id === entry.patternId);

/* -------------------------------------------------------------------------- */

describe('1 & 2. the catalogue reaches the real arbiter', () => {
  it('puts many catalogue patterns into one real episode', () => {
    const result = episode('health-enabled');

    /*
     * The number that mattered: before this pass a domain's own handful was all that could
     * ever compete. Anything above the old thirty-five proves selection is no longer a
     * hand-written array — and these are candidates in a real episode, not a registry
     * lookup.
     */
    expect(fromCatalogue(result).length).toBeGreaterThan(20);
  });

  it('lets a catalogue pattern actually win, not merely enter', () => {
    /*
     * Surviving into the comparison and always losing is still a dead zone. At least one
     * ordinary episode must end with the engine choosing a move that no slice nominated.
     */
    const winners = [
      'emotional-quiet',
      'fatherhood-quiet',
      'faith-enabled',
      'money-not-looked',
    ].map((id) => {
      const result = episode(id);
      const chosen = winnerOf(result);
      return chosen !== undefined && fromCatalogue(result).some((c) => c.id === chosen);
    });

    expect(winners.filter(Boolean).length).toBeGreaterThan(0);
  });

  it('still emits exactly one thing however wide the pool gets', () => {
    /* The whole risk of a bigger catalogue, stated as a test. */
    for (const id of ['health-enabled', 'emotional-enabled', 'fatherhood-enabled']) {
      const result = episode(id);
      expect(fromCatalogue(result).length).toBeGreaterThan(5);
      expect(['action', 'question', 'silence', 'insufficient-evidence']).toContain(
        result.output.kind,
      );
      if (result.output.kind === 'action') {
        expect(result.output.supportingWins.length).toBeLessThanOrEqual(3);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('3 & 5. what the situation and the owner rule out', () => {
  it('never offers a move a protected context forbids', () => {
    const result = episode('protected-time');
    const chosen = winnerOf(result);
    if (chosen === undefined) return;

    const candidate = required(
      result.internal.candidates.find((entry) => entry.id === chosen),
      chosen,
    );
    for (const context of candidate.blockedByProtectedContexts) {
      expect(result.state.protectedContexts).not.toContain(context);
    }
  });

  it('records a reason for everything it removed', () => {
    /* An audit trail with a blank in it is not an audit trail. */
    const result = episode('health-enabled');
    for (const entry of result.internal.rejected) {
      expect(entry.reason.length, entry.candidateId).toBeGreaterThan(0);
      expect(entry.stage.length, entry.candidateId).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('6. supporting wins stay between zero and three', () => {
  it('holds across every scenario the engine can run', () => {
    for (const id of [
      'health-enabled',
      'emotional-enabled',
      'fatherhood-enabled',
      'money-figures-on',
      'home-repeated-friction',
      'career-no-next-step',
    ]) {
      const result = episode(id);
      if (result.output.kind !== 'action') continue;
      expect(result.output.supportingWins.length, id).toBeGreaterThanOrEqual(0);
      expect(result.output.supportingWins.length, id).toBeLessThanOrEqual(3);

      /* And never a duplicate of the decision itself. */
      for (const win of result.output.supportingWins) {
        expect(win.statement).not.toBe(result.output.candidate.statement);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('11. the North Star changes which move wins', () => {
  /*
   * The requirement in one test: two reasonable moves, one North Star, and a different
   * answer depending on what the owner said their life is for.
   *
   * Relevance is read from the goals the owner keeps active rather than from parsing their
   * sentence — the app never grades that text. So the two worlds differ by which category
   * holds an active goal, which is the owner's direction made operational.
   */
  const AT = '2026-03-01T09:00:00.000Z';

  /**
   * Two real candidates, and the direction deciding between them.
   *
   * Ranked through `episodeFacts` and `weigh` — the same two functions `selectOutput`
   * calls, in the same order, with nothing stubbed. What is *not* built here is a whole
   * synthetic episode, and the reason is worth recording: an active goal always produces a
   * focus block attached to that goal, and an attached candidate is the most
   * North-Star-relevant thing this engine can recognise, so it wins whatever the category
   * is. That is correct behaviour — a goal you are actually pursuing is your direction made
   * concrete — and it means an episode-level flip would be testing the focus block rather
   * than the field.
   */
  /** Two candidates the engine really produced, in two different categories. */
  function twoRivals() {
    const pool = fromCatalogue(episode('domain-enabled'));
    const first = required(pool[0], 'a candidate');
    const second = required(
      pool.find((entry) => entry.category !== first.category),
      'a candidate in another category',
    );
    return [first, second] as const;
  }

  function rankTwo(rivals: ReturnType<typeof twoRivals>, directionCategory: LifeCategory) {
    const inputs = {
      records: [] as readonly CanonicalRecord[],
      now: new Date(AT),
      feasible: new Map<string, boolean>(),
      contradicted: new Set<string>(),
    };

    return weigh(
      rivals.map((candidate) => ({
        id: candidate.id,
        facts: episodeFacts(
          candidate,
          inputs,
          new Set<string>([directionCategory]),
          new Set(),
          0,
        ),
      })),
    );
  }

  it('reverses the order when the direction reverses', () => {
    const rivals = twoRivals();
    const towardsFirst = rankTwo(rivals, rivals[0].category);
    const towardsSecond = rankTwo(rivals, rivals[1].category);

    const winner = (r: ReturnType<typeof weigh>) => required(r.ordered[0], 'a winner').id;

    expect(winner(towardsFirst)).toBe(rivals[0].id);
    expect(winner(towardsSecond)).toBe(rivals[1].id);
    expect(towardsFirst.whyItWon).toMatch(/serves what you said your life is for/);
  });

  it('names the direction as the reason, in a real episode', () => {
    /*
     * The production path, not the helper above: these are the sentences the engine
     * actually recorded while choosing, in scenarios nobody wrote for this test.
     */
    const named = ['career-no-next-step', 'money-figures-on', 'domain-enabled'].filter((id) =>
      episode(id).internal.rejected.some((entry) =>
        entry.reason.includes('serves what you said your life is for'),
      ),
    );
    expect(named.length).toBeGreaterThan(0);
  });

  it('leaves relevance unknown when nothing has been recorded', () => {
    /* Not `low`. Someone who has not said what matters has not ruled anything out. */
    const facts = episodeFacts(
      required(episode('domain-enabled').internal.candidates[0], 'a candidate'),
      {
        records: [],
        now: new Date(AT),
        feasible: new Map(),
        contradicted: new Set(),
      },
      new Set(),
      new Set(),
      0,
    );
    expect(facts.northStarRelevance).toBe('unknown');
  });
});

/* -------------------------------------------------------------------------- */

describe('12. the weekly direction changes arbitration where it applies', () => {
  it('counts only a direction the owner actually confirmed', () => {
    /*
     * A proposal the app made and the owner never answered is not a direction. Letting it
     * count would feed the engine's own suggestion back in as though it were agreement.
     */
    const base = required(episode('domain-enabled').internal.candidates[0], 'a candidate');
    const unanswered = episodeFacts(
      base,
      { records: [], now: new Date(), feasible: new Map(), contradicted: new Set() },
      new Set(),
      new Set(),
      0,
    );
    expect(unanswered.weeklyDirectionRelevance).toBe('unknown');

    const confirmed = episodeFacts(
      base,
      { records: [], now: new Date(), feasible: new Map(), contradicted: new Set() },
      new Set(),
      new Set([base.category]),
      0,
    );
    expect(confirmed.weeklyDirectionRelevance).toBe('high');
  });
});

/* -------------------------------------------------------------------------- */

describe('14. sustainability is not fabricated', () => {
  it('stays unknown for every candidate in a real episode', () => {
    /*
     * Nothing has been observed often enough to say whether a move could be repeated
     * without eroding something. A plausible default here would be an unearned judgement
     * sitting inside a ranking, which is worse than an admitted gap because it is
     * invisible.
     */
    const result = episode('health-enabled');
    for (const candidate of result.internal.candidates.slice(0, 12)) {
      const facts = episodeFacts(
        candidate,
        {
          records: [],
          now: new Date(),
          feasible: new Map(),
          contradicted: new Set(),
        },
        new Set(),
        new Set(),
        0,
      );
      expect(facts.sustainability, candidate.id).toBe('unknown');
    }
  });

  it('starts from a contract that claims nothing at all', () => {
    expect(UNKNOWN_FACTS.sustainability).toBe('unknown');
    expect(UNKNOWN_FACTS.possibleDownside).toBe('unknown');
    expect(UNKNOWN_FACTS.opportunityCost).toBe('unknown');
  });
});

/* -------------------------------------------------------------------------- */

describe('15. action load is visible to the arbiter', () => {
  it('rises with what the day has already asked', () => {
    const base = required(episode('domain-enabled').internal.candidates[0], 'a candidate');
    const inputs = {
      records: [],
      now: new Date(),
      feasible: new Map<string, boolean>(),
      contradicted: new Set<string>(),
    };

    const fresh = episodeFacts(base, inputs, new Set(), new Set(), 0);
    const busy = episodeFacts(base, inputs, new Set(), new Set(), 4);

    expect(fresh.actionLoad).toBe('low');
    expect(busy.actionLoad).toBe('high');
  });
});

/* -------------------------------------------------------------------------- */

describe('9. personalisation preserves identity', () => {
  it('keeps the pattern id through the wording the engine actually uses', () => {
    /*
     * `catalogueCandidates` builds every statement through `personalise`. If that ever
     * returned a new identity, evidence would detach from the move it was about.
     */
    for (const entry of MOVE_PATTERNS.slice(0, 20)) {
      const result = personalise(entry, {});
      expect(result.patternId, entry.patternId).toBe(entry.patternId);
      expect(result.statement).not.toContain('{');
    }
  });

  it('gives every catalogue candidate a resolvable canonical pattern', () => {
    const result = episode('health-enabled');
    for (const candidate of fromCatalogue(result)) {
      expect(pattern(required(candidate.patternId, candidate.id)).patternId).toBe(candidate.id);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('10. abundance does not force activity', () => {
  it('can still say nothing with a full catalogue eligible', () => {
    /*
     * The central claim of the whole widening. `protected-time` and `overload` have every
     * area's patterns available and must still decline to interrupt.
     */
    for (const id of ['protected-time', 'overload']) {
      const result = episode(id);
      expect(result.output.kind, id).not.toBe('action');
    }
  });

  it('offers no move at all when every area is switched off', () => {
    const result = episode('areas-all-off');
    expect(fromCatalogue(result)).toEqual([]);
  });
});
