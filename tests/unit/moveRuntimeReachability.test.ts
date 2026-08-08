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
import type { MovePattern } from '../../src/domain/moves/families';
import { catalogueCandidates } from '../../src/intelligence/intervention/catalogueCandidates';
import {
  judge,
  type EligibilityContext,
} from '../../src/command-core/eligibility/catalogueEligibility';
import { DOMAIN_IDS, type DomainId } from '../../src/domain/domains/definitions';
import type { CanonicalRecord } from '../../src/domain/records';
import type { StateAssessment } from '../../src/intelligence/types';
import { required } from '../support/required';

/**
 * Runtime reachability, counted honestly (`V33-048`, v3.3 section D).
 *
 * ## Why this file is separate from `moveReachability.test.ts`
 *
 * That one asks whether the registry *can* find a pattern. This one asks whether the
 * product can actually offer it — a much harder question, and the one that was answered
 * dishonestly for two commits. Keeping them apart stops "113 patterns exist" from being
 * read as "113 patterns can be recommended".
 *
 * ## The numbers, stated plainly
 *
 * There are two, and conflating them is what made the old answer misleading:
 *
 *   - **35** are nominated by a slice's own decision tree, with a reason drawn from the
 *     owner's records. That number has not moved and is not supposed to.
 *   - **112 of 113** are produced by the shared generator from one ordinary owner state,
 *     because eligibility now reads what a pattern declares instead of consulting a list
 *     of ids. The 113th declares a prerequisite and appears once that prerequisite is met.
 *
 * Nothing is intentionally unreachable, and — asserted below rather than claimed here —
 * nothing is accidentally unreachable either.
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

const NOW = new Date('2026-08-08T14:00:00.000Z');
let seq = 0;

function envelope(recordType: string) {
  seq += 1;
  return {
    recordId: `00000000-0000-4000-b000-${String(seq).padStart(12, '0')}`,
    recordType,
    schemaVersion: 1,
    occurredAt: '2026-08-08T09:00:00.000Z',
    recordedAt: '2026-08-08T09:00:00.000Z',
    localTime: { timeZone: 'Europe/London', offsetMinutes: 0 },
    source: 'user-entry',
    provenance: { method: 'direct-report' },
  };
}

/**
 * An owner for whom nothing is ruled out, and nothing is invented either.
 *
 * Every area on, a direction recorded, something open. This is an ordinary state a real
 * person can be in on an ordinary evening — not a bypass, and not a test double. The
 * production builder reads exactly these records.
 */
const PERMISSIVE_RECORDS = [
  ...DOMAIN_IDS.map((domainId) => ({
    ...envelope('domain-preference'),
    domainId,
    state: 'enabled',
  })),
  { ...envelope('north-star'), statement: 'Be steady, and present' },
  {
    ...envelope('commitment'),
    statement: 'Something still open',
    category: 'career-work-learning',
    state: 'blocked',
    nonNegotiable: false,
  },
] as unknown as readonly CanonicalRecord[];

const PERMISSIVE_STATE = {
  situation: {
    setting: 'home',
    engagement: 'free',
    interruptibility: 'free',
    privacy: 'private',
  },
} as unknown as StateAssessment;

/** The same state as an eligibility context, with any declared prerequisite satisfied. */
function permissiveContext(entry: MovePattern): EligibilityContext {
  return {
    now: NOW,
    enabledDomains: new Set<DomainId>(DOMAIN_IDS),
    situation: PERMISSIVE_STATE.situation,
    suppressed: new Map(),
    recentlyCompleted:
      entry.after === undefined
        ? []
        : [{ patternId: entry.after, at: '2026-08-08T10:00:00.000Z' }],
    hasNorthStar: true,
    hasOpenCommitment: true,
  };
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

  it('still gives every slice its own hand-picked selection', () => {
    /*
     * Thirty-five, across all seven slices and the shared generator — unchanged, and no
     * longer the whole story. These are the patterns a domain's own decision tree will
     * nominate *with a reason*, which is a different and stronger thing than being
     * possible. They keep their privileged route to Now.
     *
     * What changed is that this is no longer the ceiling. See the block below.
     */
    expect(runtimeReachable().size).toBe(35);
  });

  it('reaches the rest of the catalogue through eligibility, not through arrays', () => {
    /*
     * The number this pass existed to move (`V33-056`).
     *
     * Every pattern here is produced by `catalogueCandidates` — the same function the
     * shared generator calls — from one permissive but entirely legitimate owner state:
     * every area switched on, at home, free, alone, with a direction recorded and
     * something open. No pattern id appears anywhere in that path.
     *
     * Asserted as "all but the prerequisite-gated one" rather than as a bare number, so
     * that adding a pattern to the catalogue cannot quietly leave it stranded: a new
     * unreachable move fails this immediately, and the failure names it.
     */
    const produced = new Set(
      catalogueCandidates(PERMISSIVE_RECORDS, PERMISSIVE_STATE, NOW, new Set()).map(
        (candidate) => candidate.id,
      ),
    );

    const missing = MOVE_PATTERNS.filter(
      (entry) => entry.lifecycle !== 'retired' && !produced.has(entry.patternId),
    );

    /*
     * The single legitimate exception, named rather than counted. It declares a
     * prerequisite and is held back until that prerequisite has actually been done —
     * which is a move waiting its turn, not a move nobody can reach. The test below
     * releases it.
     */
    expect(missing.map((entry) => entry.patternId)).toEqual([
      'money-guard:move-toward-the-purpose',
    ]);
    for (const entry of missing) {
      expect(entry.after, entry.patternId).toBeDefined();
    }
  });

  it('leaves no active pattern accidentally unreachable', () => {
    /*
     * The target, stated as a property: zero. A pattern counts as reachable when a
     * realistic state makes the real generation path produce it — including, for the
     * prerequisite-gated ones, a state in which the prerequisite has been done.
     */
    const stranded = MOVE_PATTERNS.filter((entry) => {
      if (entry.lifecycle === 'retired') return false;
      return !judge(entry, permissiveContext(entry)).eligible;
    });

    expect(stranded.map((entry) => entry.patternId)).toEqual([]);
  });

  it('lets a prerequisite-gated move through once its prerequisite is done', () => {
    const gated = required(
      MOVE_PATTERNS.find((entry) => entry.patternId === 'money-guard:move-toward-the-purpose'),
      'the gated money move',
    );

    expect(judge(gated, { ...permissiveContext(gated), recentlyCompleted: [] }).eligible).toBe(
      false,
    );
    expect(judge(gated, permissiveContext(gated)).eligible).toBe(true);
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
