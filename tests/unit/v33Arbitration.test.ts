import { describe, expect, it } from 'vitest';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import {
  RECENTLY_DONE_MS,
  eligiblePatterns,
  judge,
  judgeAll,
  type EligibilityContext,
} from '../../src/command-core/eligibility/catalogueEligibility';
import {
  BEDTIME_GUARD_MINUTES,
  DAILY_ACTION_BUDGET,
  opportunityCost,
  shouldAbstain,
  weigh,
} from '../../src/command-core/arbitration/weigh';
import { UNKNOWN_FACTS, deriveFacts } from '../../src/command-core/arbitration/facts';
import { DOMAIN_IDS, type DomainId } from '../../src/domain/domains/definitions';
import { required } from '../support/required';

/**
 * The eligibility and arbitration foundation (`V33-050`–`V33-054`).
 *
 * Every test here is about a decision changing, not a function returning. A contract field
 * that never alters an outcome is decoration, and the point of separating fourteen of them
 * was that each one can be argued with individually.
 */

const NOW = new Date('2026-08-08T14:00:00.000Z');
const ALL_DOMAINS = new Set<DomainId>(DOMAIN_IDS);

function context(over: Partial<EligibilityContext> = {}): EligibilityContext {
  return {
    now: NOW,
    enabledDomains: ALL_DOMAINS,
    situation: {},
    suppressed: new Map(),
    recentlyCompleted: [],
    hasNorthStar: true,
    hasOpenCommitment: true,
    ...over,
  };
}

const patternById = (id: string) =>
  required(
    MOVE_PATTERNS.find((entry) => entry.patternId === id),
    id,
  );

/* -------------------------------------------------------------------------- */

describe('1 & 2. the catalogue competes, within a domain and across them', () => {
  it('admits many patterns at once rather than one per area', () => {
    const eligible = eligiblePatterns(context());

    /* The whole point of the migration: more than a handful is now in play. */
    expect(eligible.length).toBeGreaterThan(35);

    /* And from more than one family, so the competition is real. */
    const families = new Set(eligible.map((entry) => entry.familyId));
    expect(families.size).toBeGreaterThan(10);
  });

  it('admits nothing from an area that is switched off', () => {
    const onlyHealth = eligiblePatterns(
      context({ enabledDomains: new Set<DomainId>(['health-recovery-energy']) }),
    );

    expect(onlyHealth.length).toBeGreaterThan(0);
    expect(onlyHealth.length).toBeLessThan(eligiblePatterns(context()).length);
  });
});

/* -------------------------------------------------------------------------- */

describe('3. infeasible candidates are removed', () => {
  it('drops a move whose shape the situation forbids', () => {
    const atADesk = context({
      situation: { setting: 'work', privacy: 'public', interruptibility: 'none' },
    });

    const verdict = judge(patternById('settle-attention:sit-quietly'), atADesk);
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toMatch(/privacy|around other people/i);
  });

  it('keeps a shapeless move in exactly that situation', () => {
    const atADesk = context({
      situation: { setting: 'work', privacy: 'public', interruptibility: 'none' },
    });
    expect(judge(patternById('hydrate-eat:water'), atADesk).eligible).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('4 & 7. contradiction and the completed move', () => {
  it('removes what a recently completed move would undo', () => {
    const woundDown = context({
      recentlyCompleted: [
        { patternId: 'wind-down:stop-for-tonight', at: '2026-08-08T13:30:00.000Z' },
      ],
    });

    const verdict = judge(patternById('protect-a-block:deep-block'), woundDown);
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toMatch(/undo something you have just done/i);
  });

  it('does not offer the same move straight back', () => {
    const justDone = context({
      recentlyCompleted: [{ patternId: 'hydrate-eat:water', at: '2026-08-08T13:55:00.000Z' }],
    });
    expect(judge(patternById('hydrate-eat:water'), justDone).eligible).toBe(false);
  });

  it('forgets both once enough time has passed', () => {
    const longAgo = new Date(NOW.getTime() - RECENTLY_DONE_MS - 60_000).toISOString();
    const stale = context({
      recentlyCompleted: [{ patternId: 'wind-down:stop-for-tonight', at: longAgo }],
    });
    expect(judge(patternById('protect-a-block:deep-block'), stale).eligible).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('5. the owner’s standing decisions are obeyed', () => {
  it('removes a move the owner has set aside, in their words', () => {
    const blocked = context({
      suppressed: new Map([['move-body:longer-walk', 'You asked never to be offered this']]),
    });

    const verdict = judge(patternById('move-body:longer-walk'), blocked);
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toBe('You asked never to be offered this');
  });

  it('outranks everything else, including a perfect situational fit', () => {
    /* A stance is checked before shape, so the reason reported is the owner's. */
    const blocked = context({
      suppressed: new Map([['hydrate-eat:water', 'Paused until 2026-09-01']]),
      situation: { setting: 'home', privacy: 'private', interruptibility: 'free' },
    });
    expect(judge(patternById('hydrate-eat:water'), blocked).because).toMatch(/paused/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('8. changed context brings a move back', () => {
  it('re-admits a focus move once the owner can step away again', () => {
    const trapped = context({ situation: { interruptibility: 'none' } });
    const free = context({ situation: { interruptibility: 'free' } });

    expect(judge(patternById('protect-a-block:deep-block'), trapped).eligible).toBe(false);
    expect(judge(patternById('protect-a-block:deep-block'), free).eligible).toBe(true);
  });

  it('re-admits a private move once the owner is somewhere private', () => {
    const inPublic = context({ situation: { privacy: 'public' } });
    const alone = context({ situation: { privacy: 'private' } });

    expect(judge(patternById('settle-attention:sit-quietly'), inPublic).eligible).toBe(false);
    expect(judge(patternById('settle-attention:sit-quietly'), alone).eligible).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('a prerequisite waits its turn rather than being wrong', () => {
  it('holds back a move whose prerequisite has not happened', () => {
    const verdict = judge(patternById('money-guard:move-toward-the-purpose'), context());
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toMatch(/something else has to happen first/i);
  });

  it('releases it once the prerequisite is done', () => {
    const ready = context({
      recentlyCompleted: [
        { patternId: 'money-clarity:name-what-it-is-for', at: '2026-08-08T10:00:00.000Z' },
      ],
    });
    expect(judge(patternById('money-guard:move-toward-the-purpose'), ready).eligible).toBe(
      true,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('4b. North Star changes which move wins', () => {
  const facts = (channels: readonly string[], id: string) =>
    deriveFacts(id, {
      northStarChannels: new Set(channels),
      weeklyChannels: new Set(),
      feasible: true,
      actionsToday: 0,
      contradicted: false,
    });

  it('prefers the move that serves the recorded direction', () => {
    /*
     * Two feasible moves, identical but for what they are *for*. The only thing deciding
     * between them is the owner's stated direction, which is the definition of an
     * objective function rather than decoration.
     */
    const towardsFocus = weigh([
      {
        id: 'protect-a-block:deep-block',
        facts: facts(['focus-and-clarity'], 'protect-a-block:deep-block'),
      },
      {
        id: 'reach-out:message-someone',
        facts: facts(['focus-and-clarity'], 'reach-out:message-someone'),
      },
    ]);
    expect(towardsFocus.ordered[0]?.id).toBe('protect-a-block:deep-block');

    /* Change only the North Star, and the answer changes with it. */
    const towardsPeople = weigh([
      {
        id: 'protect-a-block:deep-block',
        facts: facts(['connection-and-relationships'], 'protect-a-block:deep-block'),
      },
      {
        id: 'reach-out:message-someone',
        facts: facts(['connection-and-relationships'], 'reach-out:message-someone'),
      },
    ]);
    expect(towardsPeople.ordered[0]?.id).toBe('reach-out:message-someone');
  });

  it('says which field decided it', () => {
    const ranked = weigh([
      { id: 'a', facts: { ...UNKNOWN_FACTS, feasibility: 'low' } },
      { id: 'b', facts: { ...UNKNOWN_FACTS, feasibility: 'high' } },
    ]);
    expect(ranked.ordered[0]?.id).toBe('b');
    expect(ranked.whyItWon).toMatch(/situation actually allows it/);
  });

  it('treats unknown as no reason to prefer, in either direction', () => {
    const ranked = weigh([
      { id: 'known', facts: { ...UNKNOWN_FACTS, leverage: 'high' } },
      { id: 'unknown', facts: UNKNOWN_FACTS },
    ]);
    /* A known advantage wins; an absence neither wins nor is punished for existing. */
    expect(ranked.ordered[0]?.id).toBe('known');
  });

  it('leaves genuinely indistinguishable candidates in the order they arrived', () => {
    const ranked = weigh([
      { id: 'first', facts: UNKNOWN_FACTS },
      { id: 'second', facts: UNKNOWN_FACTS },
    ]);
    expect(ranked.ordered.map((entry) => entry.id)).toEqual(['first', 'second']);
    expect(ranked.whyItWon).toMatch(/nothing separated/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('opportunity cost compares real alternatives', () => {
  const cheap = {
    id: 'cheap',
    minutes: 5,
    facts: { ...UNKNOWN_FACTS, urgency: 'low' as const },
  };
  const closing = {
    id: 'closing',
    minutes: 40,
    facts: { ...UNKNOWN_FACTS, urgency: 'high' as const },
  };

  it('charges a move for displacing something more urgent', () => {
    const cost = opportunityCost(
      { id: 'long', minutes: 40, facts: { ...UNKNOWN_FACTS, urgency: 'low' } },
      [closing],
      60,
    );
    expect(cost).toBe('high');
  });

  it('charges nothing when there is room for both', () => {
    expect(opportunityCost(cheap, [closing], 240)).toBe('low');
  });

  it('charges nothing when the alternatives are not urgent', () => {
    expect(opportunityCost(cheap, [{ ...cheap, id: 'other' }], 10)).toBe('low');
  });

  it('is not a standing penalty on long moves', () => {
    /* The same forty-minute move, alone, costs nothing at all. */
    expect(opportunityCost({ id: 'long', minutes: 40, facts: UNKNOWN_FACTS }, [], 60)).toBe(
      'low',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('10. abundance never forces activity', () => {
  const load = (over: Partial<Parameters<typeof shouldAbstain>[0]> = {}) =>
    shouldAbstain({
      actionsToday: 0,
      capacity: 'moderate',
      minutesToBedtime: undefined,
      somethingInProgress: false,
      ...over,
    });

  it('stops for the night when bedtime is close', () => {
    const verdict = load({ minutesToBedtime: BEDTIME_GUARD_MINUTES - 1 });
    expect(verdict.kind).toBe('stop-for-tonight');
  });

  it('recovers when there is nothing left', () => {
    expect(load({ capacity: 'depleted' }).kind).toBe('recover');
  });

  it('continues what is already underway', () => {
    expect(load({ somethingInProgress: true }).kind).toBe('continue');
  });

  it('asks nothing more once the day has asked enough', () => {
    expect(load({ actionsToday: DAILY_ACTION_BUDGET }).kind).toBe('nothing-further');
  });

  it('waits rather than pushing through low capacity', () => {
    expect(load({ capacity: 'low' }).kind).toBe('wait');
  });

  it('acts when there is genuinely room to', () => {
    expect(load().kind).toBe('act');
  });

  it('decides this before looking at how many candidates exist', () => {
    /*
     * The signature is the proof: `shouldAbstain` cannot see the candidate list, so a
     * hundred eligible moves cannot argue it out of stopping.
     */
    expect(shouldAbstain.length).toBe(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('sustainability is contracted but never guessed', () => {
  it('is unknown for every pattern, because nothing has been observed', () => {
    for (const pattern of MOVE_PATTERNS) {
      const facts = deriveFacts(pattern.patternId, {
        northStarChannels: new Set(),
        weeklyChannels: new Set(),
        feasible: true,
        actionsToday: 0,
        contradicted: false,
      });
      expect(facts.sustainability, pattern.patternId).toBe('unknown');
    }
  });

  it('does no arithmetic anywhere in the contract', async () => {
    /*
     * No hidden score: the fields are compared, never combined. Checked against the code
     * with comments stripped, because the file's own header explains at length why one
     * number would be the wrong design, and saying the word is not doing the thing.
     */
    const source = await import('node:fs').then((fs) =>
      fs.readFileSync('src/command-core/arbitration/facts.ts', 'utf8'),
    );
    const code = source
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trimStart();
        return (
          !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//')
        );
      })
      .join('\n');

    expect(code).not.toMatch(/\bscore\b/i);
    /* And no field is added to, multiplied by, or divided against another. */
    expect(code).not.toMatch(/facts\.\w+\s*[+*/]/);
  });
});

/* -------------------------------------------------------------------------- */

describe('9. the catalogue has no accidental dead zones', () => {
  /**
   * Every active pattern must be producible by *some* legitimate state.
   *
   * Exercised through the real eligibility path rather than a registry lookup: for each
   * pattern this builds the situation it would need and asks the actual judge. A pattern
   * that cannot be reached that way is authored, counted, and unofferable — which is worse
   * than not authoring it, because it inflates what the product looks capable of.
   */
  function reachableUnderSomeState(patternId: string): boolean {
    const pattern = patternById(patternId);

    /* The most permissive legitimate situation, plus whatever this pattern needs. */
    const permissive = context({
      situation: {
        setting: 'home',
        engagement: 'free',
        interruptibility: 'free',
        privacy: 'private',
      },
      recentlyCompleted:
        pattern.after === undefined
          ? []
          : [{ patternId: pattern.after, at: '2026-08-08T10:00:00.000Z' }],
    });

    return judge(pattern, permissive).eligible;
  }

  it('reaches every active pattern through real eligibility', () => {
    const unreachable = MOVE_PATTERNS.filter(
      (pattern) =>
        pattern.lifecycle !== 'retired' && !reachableUnderSomeState(pattern.patternId),
    ).map((pattern) => pattern.patternId);

    expect(unreachable).toEqual([]);
  });

  it('records that nothing is intentionally excluded', () => {
    /* No pattern is authored to be unofferable. If one ever is, it needs a stated reason. */
    expect(MOVE_PATTERNS.filter((pattern) => pattern.lifecycle === 'retired')).toEqual([]);
  });

  it('gives a stated reason for every exclusion it does make', () => {
    const constrained = context({
      situation: { setting: 'work', privacy: 'public', interruptibility: 'none' },
      enabledDomains: new Set<DomainId>(['health-recovery-energy']),
    });

    for (const verdict of judgeAll(constrained)) {
      expect(verdict.because.length, verdict.patternId).toBeGreaterThan(5);
    }
  });
});
