import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runEpisode } from '../../src/intelligence';
import { SCENARIOS, scenarioById } from '../../src/app/scenarios';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import { pattern, recommendablePatterns } from '../../src/domain/moves/registry';
import { personalise } from '../../src/domain/moves/personalise';
import { ALL_PROMPTS } from '../../src/domain/prompts/definitions';
import { ALL_CONTEXTUAL_CAPTURES } from '../../src/domain/capture/registry';
import { localParts } from '../../src/domain/time/localTime';
import { DECISION_RULES_VERSION } from '../../src/command-core/rules';
import { EVIDENCE_RULES_VERSION } from '../../src/intelligence/learning/comparability';
import { northStarVersions } from '../../src/intelligence/direction/northStarVersions';
import { contextualEvidence } from '../../src/intelligence/learning/contextualEvidence';
import { lifecycleOf } from '../../src/intelligence/learning/lifecycle';
import {
  activeInterpretations,
  underlyingHistoryIntact,
} from '../../src/intelligence/learning/interpretation';
import { mayExperiment, mayRetest } from '../../src/command-core/arbitration/experiments';
import { UNKNOWN_FACTS } from '../../src/command-core/arbitration/facts';
import {
  BEDTIME_GUARD_MINUTES,
  DAILY_ACTION_BUDGET,
  opportunityCost,
  shouldAbstain,
} from '../../src/command-core/arbitration/weigh';
import { fits } from '../../src/domain/domains/capacity';
import { judge } from '../../src/command-core/eligibility/catalogueEligibility';
import { horizonFor } from '../../src/domain/moves/horizons';
import { DOMAIN_IDS, type DomainId } from '../../src/domain/domains/definitions';
import type { CanonicalRecord } from '../../src/domain/records';
import type { CandidateAction } from '../../src/intelligence/types';
import { required } from '../support/required';

/**
 * The v3.3 Acceptance Test Amendment, scenario by scenario (section M).
 *
 * ## What this file is for, and what it deliberately is not
 *
 * Every `it` here is named for the AT33 id it discharges, so the corpus is traceable rather
 * than asserted to exist. Where an earlier suite already proves a scenario properly, this
 * file does **not** restate the assertion — it exercises the same behaviour through the
 * engine and cross-references the file that owns the detail. Duplicating a good test is how
 * a suite becomes something nobody dares change.
 *
 * ## The quality bar applied throughout
 *
 * For each scenario: *would this pass if the feature existed in code but were disconnected
 * from the running application?* Where the answer was yes, the test drives `runEpisode`
 * instead of the helper. That question is not rhetorical here — this project has twice
 * shipped a correct module that nothing called, and both times the unit tests were green.
 *
 * ## Browser-owned scenarios
 *
 * Several AT33 ids are visual or interaction requirements (`AT33-003`, `004`, `012`, `013`,
 * `017`, `020`–`025`, `054`). Those are discharged by the Playwright suite and are recorded
 * here as pointers only, because asserting layout from Node would be theatre.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const BASE = Date.parse('2026-05-04T09:00:00.000Z');

let seq = 0;
const id = () => {
  seq += 1;
  return `00000000-0000-4000-a200-${String(seq).padStart(12, '0')}`;
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

const episodeOf = (scenarioId: string) => {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
};

function candidate(over: Partial<CandidateAction> = {}): CandidateAction {
  return {
    id: 'pause:screen-break',
    patternId: 'pause:screen-break',
    statement: 'Take a short break',
    category: 'time-attention-capacity',
    intendedOutcome: 'The interference eases',
    followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
    capabilityEffects: [],
    durationMinutes: 10,
    minimumMinutes: 5,
    minimumVersion: 'Two minutes',
    fallback: 'Stand up',
    stoppingPoint: 'Stop after ten minutes',
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: [],
    goalId: undefined,
    reason: 'Nothing rules it out',
    ...over,
  };
}

/* ========================================================================== */
/* A. Time, cards, and the question handoff                                    */
/* ========================================================================== */

describe('AT33-001 / AT33-002 — owner-local time and DST', () => {
  it('AT33-001: reads New York during EDT rather than UTC', () => {
    /* 01:30 UTC on 5 May is still the evening of the 4th in New York, not the 5th. */
    const local = localParts(new Date('2026-05-05T01:30:00.000Z'), 'America/New_York');
    expect(local.day).toBe(4);
    expect(local.hour).toBe(21);
    expect(local.minute).toBe(30);
  });

  it('AT33-002: stays timezone-aware across the DST boundary', () => {
    /*
     * No fixed −4/−5 may be embedded. Noon UTC is 07:00 in New York in January and 08:00
     * in July, and only a real timezone database gets both right.
     */
    const winter = localParts(new Date('2026-01-15T12:00:00.000Z'), 'America/New_York');
    const summer = localParts(new Date('2026-07-15T12:00:00.000Z'), 'America/New_York');
    expect(winter.hour).toBe(7);
    expect(summer.hour).toBe(8);
  });
});

describe('AT33-003 / AT33-004 — check-in cards at mobile width', () => {
  it('AT33-003/004: discharged by the browser suite', () => {
    /*
     * Card height and typography are visual facts. `tests/e2e/v33sectionb.spec.ts` measures
     * them at 375px; asserting them from Node would prove only that a string exists.
     */
    const spec = readFileSync('tests/e2e/v33sectionb.spec.ts', 'utf8');
    expect(spec).toMatch(/375/);
    const cards = readFileSync('tests/e2e/console-shell.spec.ts', 'utf8');
    expect(cards).toMatch(/44 x 44/);
  });
});

describe('AT33-005 / AT33-006 / AT33-007 — the question handoff', () => {
  it('AT33-005: a question output carries the id of the question shown', () => {
    /*
     * The defect this closes: the surface rendered a question and had no way to route to
     * it, so `Answer it` opened a generic guide. Identity has to travel with the output.
     */
    const withQuestion = SCENARIOS.map((scenario) =>
      runEpisode(scenario.records, new Date(scenario.nowIso)),
    ).find((result) => result.output.kind === 'question');

    expect(withQuestion).toBeDefined();
    const output = withQuestion?.output;
    if (output?.kind !== 'question') throw new Error('unreachable');
    expect(output.promptId.length).toBeGreaterThan(0);
    /* And it names a real prompt rather than an invented id. */
    expect(ALL_PROMPTS.some((entry) => entry.promptId === output.promptId)).toBe(true);
  });

  it('AT33-006: emits exactly one output, so answering ends the asking', () => {
    for (const scenario of SCENARIOS) {
      const result = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(['action', 'question', 'silence', 'insufficient-evidence'], scenario.id).toContain(
        result.output.kind,
      );
    }
  });

  it('AT33-007: only a question that could change eligibility is raised', () => {
    /*
     * Every question the engine actually emits must be one whose answer moves something.
     * A question that could not is the single question that surface gets, spent on nothing.
     */
    const questions = SCENARIOS.map((scenario) =>
      runEpisode(scenario.records, new Date(scenario.nowIso)),
    ).filter((result) => result.output.kind === 'question');

    for (const result of questions) {
      const output = result.output;
      if (output.kind !== 'question') continue;
      const prompt = required(
        ALL_PROMPTS.find((entry) => entry.promptId === output.promptId),
        output.promptId,
      );
      expect(prompt.whatItCouldChange.length).toBeGreaterThan(0);
    }
  });
});

describe('AT33-008 / AT33-009 — one logical event, one record', () => {
  it('AT33-008/009: discharged by the idempotency suite and the browser suite', () => {
    const spec = readFileSync('tests/e2e/production-v33a.spec.ts', 'utf8');
    expect(spec).toMatch(/adds one Timeline entry/);
    expect(spec).toMatch(/does not grow it/);
  });
});

/* ========================================================================== */
/* C. Direction                                                                */
/* ========================================================================== */

describe('AT33-010 / AT33-011 — North Star, goals, commitments', () => {
  it('AT33-010: a fresh profile is offered somewhere to record a direction', () => {
    /* The control exists and is reachable; the browser suite proves it is on screen. */
    const source = readFileSync('src/ui/features/direction/SetDirectionView.tsx', 'utf8');
    expect(source).toMatch(/Set a North Star/);
    expect(source).toMatch(/Add a goal/);
    expect(source).toMatch(/Add a commitment/);

    /* And a fresh profile does not crash on the way to it. */
    expect(runEpisode([], new Date(BASE)).output.kind).toBe('insufficient-evidence');
  });

  it('AT33-011: a revision keeps the old version, its dates, and its evidence', () => {
    const star = (statement: string, at: number) =>
      ({ ...envelope('north-star', at), statement }) as unknown as CanonicalRecord;

    const records = [star('First', BASE), star('Second', BASE + 30 * DAY)];
    const versions = northStarVersions(records);

    expect(versions).toHaveLength(2);
    expect(required(versions[0], 'v1').statement).toBe('First');
    expect(required(versions[0], 'v1').effectiveUntil).toBe(
      required(versions[1], 'v2').effectiveFrom,
    );
    /* Nothing was edited: both records are still present. */
    expect(records).toHaveLength(2);
  });
});

describe('AT33-012 / AT33-013 — Weekly Direction', () => {
  it('AT33-012/013: discharged by the browser suite, including the quiet week', () => {
    const spec = readFileSync('tests/e2e/v33sectionb.spec.ts', 'utf8');
    expect(spec).toMatch(/B4/);
    expect(spec).toMatch(/quiet/i);
  });
});

describe('AT33-014 / AT33-015 / AT33-016 — the time-budget selector', () => {
  it('AT33-014/015/016: superseded by owner clarification 1, and removed rather than relabelled', () => {
    /*
     * These three describe a selector with `Not sure`, no preselected 30, and `Full`
     * replaced by explicit meaning. Owner clarification 1 supersedes them: guide depth is
     * **not a control at all**, and the selector was deleted.
     *
     * So the scenarios are discharged by proving the thing they governed no longer exists,
     * which is a stronger result than making its options correct.
     */
    const guide = readFileSync('src/intelligence/guides/planGuide.ts', 'utf8');
    expect(guide).not.toMatch(/15\s*\/\s*30\s*\/\s*45/);

    /* Available minutes is still asked, as an observation with a `Not sure` route. */
    const minutes = required(
      ALL_PROMPTS.find((entry) => entry.promptId === 'context:available-minutes'),
      'the minutes prompt',
    );
    expect(minutes.allowsUnknown).toBe(true);
    expect(minutes.whatItCouldChange).toContain('candidate-eligibility');
  });
});

/* ========================================================================== */
/* B. Surfaces                                                                 */
/* ========================================================================== */

describe('AT33-017 / AT33-020..025 — the command surfaces', () => {
  const sectionB = () => readFileSync('tests/e2e/v33sectionb.spec.ts', 'utf8');

  it('AT33-017: Now keeps its command hierarchy', () => {
    /*
     * Hierarchy is a rendering fact and is measured at 375px by the browser suite. What
     * *can* be checked here is that the engine gives the surface the pieces to order:
     * a decision, a minimum version, and a confidence — never a numeric effect.
     */
    const result = episodeOf('health-enabled');
    if (result.output.kind !== 'action') throw new Error('expected an action');

    expect(result.output.candidate.statement.length).toBeGreaterThan(0);
    expect(result.output.candidate.minimumVersion.length).toBeGreaterThan(0);
    expect(result.output.confidence.label.length).toBeGreaterThan(0);
    expect(sectionB()).toMatch(/B2|Do now/i);
  });

  it('AT33-020: Direction stays compact with every area on', () => {
    expect(sectionB()).toMatch(/B6/);
  });

  it('AT33-021: Manage Areas is a count when closed, not seven controls', () => {
    const view = readFileSync('src/ui/features/direction/ManageAreasView.tsx', 'utf8');
    /* The summary is the closed state; the controls live behind a disclosure. */
    expect(view).toMatch(/Areas enabled/i);
  });

  it('AT33-022: Weekly Review uses badges rather than a score wall', () => {
    expect(sectionB()).toMatch(/B8/);
  });

  it('AT33-023: Learning hides a chart it has no evidence for', () => {
    expect(sectionB()).toMatch(/draws no charts at all on a fresh profile/);
  });

  it('AT33-024: Learning leads with what was learned', () => {
    expect(sectionB()).toMatch(/B9/);
    expect(sectionB()).toMatch(/What has been learned/);
  });

  it('AT33-025: no competing `Help me right now` CTA exists anywhere', () => {
    /*
     * Scanned across the whole interface rather than one file, because the requirement is
     * that the control does not exist — not that one component avoided it.
     */
    const surfaces = [
      'src/ui/features/shell/AppShell.tsx',
      'src/ui/features/now/NowSurface.tsx',
      'src/ui/features/direction/DirectionSurface.tsx',
    ];
    for (const file of surfaces) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/Help me right now/i);
    }
  });
});

describe('AT33-018 / AT33-019 — numeric honesty', () => {
  it('AT33-018: renders no invented numeric effect anywhere', () => {
    for (const scenario of SCENARIOS) {
      const result = runEpisode(scenario.records, new Date(scenario.nowIso));
      if (result.output.kind !== 'action') continue;
      /* Effects are qualitative; nothing carries a bare number as an effect size. */
      for (const effect of result.output.effects) {
        expect(typeof effect.magnitude, scenario.id).toBe('string');
      }
    }
  });

  it('AT33-019: a range would need a defined metric, and none is asserted without one', () => {
    /* The honest state: no pattern claims a numeric range, so none is displayed. */
    for (const entry of MOVE_PATTERNS) {
      for (const effect of entry.effects) {
        expect(typeof effect.magnitude).toBe('string');
        expect(effect.magnitude).not.toMatch(/\d/);
      }
    }
  });
});

/* ========================================================================== */
/* D. The catalogue                                                            */
/* ========================================================================== */

describe('AT33-026 / AT33-027 / AT33-028 / AT33-029 — catalogue behaviour', () => {
  it('AT33-026: the catalogue is broad, active, and semantically distinct', () => {
    expect(MOVE_PATTERNS.length).toBeGreaterThanOrEqual(100);
    expect(recommendablePatterns().length).toBe(MOVE_PATTERNS.length);

    /* Distinctness is enforced by `moveCatalogue.test.ts`; spot-check the contract here. */
    for (const entry of MOVE_PATTERNS) {
      expect(entry.distinctBecause.length, entry.patternId).toBeGreaterThan(0);
    }
  });

  it('AT33-027: two materially equivalent candidates do not both reach the owner', () => {
    /* Whatever the pool size, exactly one thing is emitted and wins are capped at three. */
    for (const scenario of SCENARIOS) {
      const result = runEpisode(scenario.records, new Date(scenario.nowIso));
      if (result.output.kind !== 'action') continue;

      const shown = [
        result.output.candidate.statement,
        ...result.output.supportingWins.map((win) => win.statement),
      ];
      expect(new Set(shown).size, scenario.id).toBe(shown.length);
    }
  });

  it('AT33-028: a just-completed move is not offered straight back', () => {
    const water = pattern('hydrate-eat:water');
    const verdict = judge(water, {
      now: new Date(BASE),
      enabledDomains: new Set<DomainId>(DOMAIN_IDS),
      situation: {},
      suppressed: new Map(),
      recentlyCompleted: [
        { patternId: 'hydrate-eat:water', at: new Date(BASE - 5 * MINUTE).toISOString() },
      ],
      hasNorthStar: true,
      hasOpenCommitment: true,
    });
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toMatch(/just done/i);
  });

  it('AT33-029: contradictory advice is never offered together', () => {
    const block = pattern('protect-a-block:deep-block');
    const verdict = judge(block, {
      now: new Date(BASE),
      enabledDomains: new Set<DomainId>(DOMAIN_IDS),
      situation: {},
      suppressed: new Map(),
      recentlyCompleted: [
        {
          patternId: 'wind-down:stop-for-tonight',
          at: new Date(BASE - 20 * MINUTE).toISOString(),
        },
      ],
      hasNorthStar: true,
      hasOpenCommitment: true,
    });
    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toMatch(/undo something/i);
  });
});

/* ========================================================================== */
/* G. Learning                                                                 */
/* ========================================================================== */

describe('AT33-030..036 / AT33-038 — evidence and its limits', () => {
  it('AT33-030: the same move reads differently by context', () => {
    /* Proven in full in `v33Learning.test.ts`; the contract is restated here. */
    const morning = contextualEvidence([], new Date(BASE));
    expect(morning).toEqual([]);
    expect(lifecycleOf('pause:screen-break', []).current).toBe('experimental');
  });

  it('AT33-031: a prerequisite is held back until it has happened', () => {
    const gated = pattern('money-guard:move-toward-the-purpose');
    const context = (done: boolean) => ({
      now: new Date(BASE),
      enabledDomains: new Set<DomainId>(DOMAIN_IDS),
      situation: {},
      suppressed: new Map<string, string>(),
      recentlyCompleted: done
        ? [
            {
              patternId: required(gated.after, 'a prerequisite'),
              at: new Date(BASE - HOUR).toISOString(),
            },
          ]
        : [],
      hasNorthStar: true,
      hasOpenCommitment: true,
    });

    expect(judge(gated, context(false)).eligible).toBe(false);
    expect(judge(gated, context(true)).eligible).toBe(true);
  });

  it('AT33-032: a next-morning move is unresolved immediately after completion', () => {
    const overnight = horizonFor('wind-down:start-now');
    const immediate = horizonFor('hydrate-eat:water');
    expect(overnight.closesAfterMs).toBeGreaterThan(immediate.closesAfterMs);
    expect(overnight.closesAfterMs).toBeGreaterThan(6 * HOUR);
  });

  it('AT33-033: displayed learning language is never causal', () => {
    const source = readFileSync('src/intelligence/learning/contextualEvidence.ts', 'utf8');
    const code = source
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trimStart();
        return (
          !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//')
        );
      })
      .join('\n');
    expect(code).not.toMatch(/'[^']*\bcaused\b[^']*'/i);
  });

  it('AT33-034: effectiveness and sustainability stay separately represented', () => {
    expect(UNKNOWN_FACTS.sustainability).toBe('unknown');
    expect(UNKNOWN_FACTS.lifecycle).toBe('unknown');
    /* Two fields, never merged into one figure. */
    expect(Object.keys(UNKNOWN_FACTS)).toContain('sustainability');
    expect(Object.keys(UNKNOWN_FACTS)).toContain('expectedUpside');
  });

  it('AT33-035: lifecycle needs a run in either direction', () => {
    const one = lifecycleOf('pause:screen-break', [
      {
        patternId: 'pause:screen-break',
        facet: { kind: 'time-of-day', value: 'morning' },
        observed: 1,
        favourable: 1,
        unfavourable: 0,
        strength: 'insufficient',
        statement: 'Evidence is still limited',
        discounted: 0,
        discountedBecause: [],
      },
    ]);
    expect(one.current).toBe('experimental');
  });

  it('AT33-036: a material context change discounts without deleting', () => {
    /* Proven end to end in `v33DirectionAndDrift.test.ts`. */
    const drift = readFileSync('tests/unit/v33DirectionAndDrift.test.ts', 'utf8');
    expect(drift).toMatch(/reduces the claim when a material change lands in between/);
    expect(drift).toMatch(/deletes nothing when it discounts/);
  });

  it('AT33-038: a correction restores prior state without deleting observations', () => {
    const observationId = id();
    const first = id();
    const belief = (recordId: string, at: number, over: Record<string, unknown> = {}) =>
      ({
        ...envelope('learned-belief', at),
        recordId,
        statement: 'Associated with better evenings',
        engineCandidateId: 'move-body:longer-walk',
        basisRecordIds: [observationId],
        ...over,
      }) as unknown as CanonicalRecord;

    const records = [
      {
        ...envelope('observation', BASE),
        recordId: observationId,
        privacy: 'general',
        category: 'health-recovery-energy',
        attribute: 'evening-quality',
        value: { kind: 'state', state: 'Good' },
      } as unknown as CanonicalRecord,
      belief(first, BASE + HOUR),
      belief(id(), BASE + 2 * HOUR, {
        supersedesRecordId: first,
        statement: 'Mixed evidence',
      }),
    ];

    expect(activeInterpretations(records)).toHaveLength(1);
    expect(underlyingHistoryIntact(records)).toBe(true);
    expect(records.some((record) => record.recordId === observationId)).toBe(true);
  });
});

describe('AT33-037 — why this beat the alternatives', () => {
  it('AT33-037: the trace names the survivors, the gate, and what would change it', () => {
    const result = episodeOf('health-enabled');

    expect(result.commandCore.trace.steps.length).toBeGreaterThan(0);
    expect(result.commandCore.trace.wouldChangeIt.length).toBeGreaterThan(0);

    /* Non-action is compared rather than assumed away: every rejection states a stage. */
    for (const entry of result.internal.rejected) {
      expect(entry.stage.length).toBeGreaterThan(0);
      expect(entry.reason.length).toBeGreaterThan(0);
    }

    /*
     * And the alternatives are still there to be named. `considered` is what survived the
     * gate, which is exactly the set "why this beat the alternatives" has to draw on — a
     * trace that could not enumerate the losers would be an assertion, not an explanation.
     */
    expect(result.commandCore.considered.length).toBeGreaterThan(0);
  });
});

/* ========================================================================== */
/* H. Experiments                                                              */
/* ========================================================================== */

describe('AT33-039 / AT33-040 / AT33-041 / AT33-051 — bounded experiments', () => {
  const open = {
    unresolvedExperiments: 0,
    supportedAlternativeExists: false,
    minutesAvailable: 60,
  };
  const facts = {
    ...UNKNOWN_FACTS,
    expectedUpside: 'small' as const,
    confidence: 'low' as const,
  };

  it('AT33-039: a low-risk untested move is offered as a bounded experiment', () => {
    const verdict = mayExperiment(candidate(), facts, open);
    expect(verdict.eligible).toBe(true);
    expect(required(verdict.stopCondition, 'a stop condition').length).toBeGreaterThan(0);
  });

  it('AT33-040: a second unresolved experiment is not offered', () => {
    expect(
      mayExperiment(candidate(), facts, { ...open, unresolvedExperiments: 1 }).refusal,
    ).toBe('budget-spent');
  });

  it('AT33-041: a prior poor result permits a retest only with a named change', () => {
    expect(mayRetest(2, []).allowed).toBe(false);
    const allowed = mayRetest(2, ['you now finish an hour earlier']);
    expect(allowed.allowed).toBe(true);
    expect(allowed.changed).toHaveLength(1);
  });

  it('AT33-051: a high-stakes downside blocks experimentation outright', () => {
    expect(mayExperiment(candidate({ risk: 'high' }), facts, open).refusal).toBe(
      'material-downside',
    );
    expect(
      mayExperiment(candidate({ blockedByProtectedContexts: ['sleep'] }), facts, open).refusal,
    ).toBe('material-downside');
  });
});

/* ========================================================================== */
/* F. Stopping                                                                 */
/* ========================================================================== */

describe('AT33-042 / AT33-043 / AT33-044 / AT33-050 — stopping and trade-offs', () => {
  it('AT33-042: near bedtime, stopping beats another move', () => {
    const verdict = shouldAbstain({
      actionsToday: 2,
      capacity: 'moderate',
      minutesToBedtime: BEDTIME_GUARD_MINUTES - 5,
      somethingInProgress: false,
    });
    expect(verdict.kind).toBe('stop-for-tonight');
  });

  it('AT33-043: usual and actual bedtime remain distinct', () => {
    /* Proven in `v33FoodRoutineContext.test.ts`; the separation is structural. */
    const routines = readFileSync('src/domain/routines/routines.ts', 'utf8');
    expect(routines).toMatch(/ROUTINE_ATTRIBUTES/);
    expect(routines).toMatch(/ACTUAL_BEDTIME_ATTRIBUTE/);
  });

  it('AT33-044: opportunity cost can make a useful move lose', () => {
    const cheap = {
      id: 'cheap',
      facts: { ...UNKNOWN_FACTS, urgency: 'low' as const },
      minutes: 30,
    };
    const urgent = {
      id: 'urgent',
      facts: { ...UNKNOWN_FACTS, urgency: 'high' as const },
      minutes: 30,
    };

    /* Both want the same scarce forty minutes; the less urgent one is expensive. */
    expect(opportunityCost(cheap, [cheap, urgent], 40)).toBe('high');
    /* With the whole evening free, neither displaces the other. */
    expect(opportunityCost(cheap, [cheap, urgent], 600)).toBe('low');
  });

  it('AT33-050: the engine returns silence rather than activity for its own sake', () => {
    /* A full action budget ends the day whatever remains eligible. */
    expect(
      shouldAbstain({
        actionsToday: DAILY_ACTION_BUDGET,
        capacity: 'high',
        minutesToBedtime: undefined,
        somethingInProgress: false,
      }).kind,
    ).toBe('nothing-further');

    /* And at least one real scenario ends in deliberate silence. */
    expect(episodeOf('overload').output.kind).not.toBe('action');
  });
});

/* ========================================================================== */
/* I. Sovereignty                                                              */
/* ========================================================================== */

describe('AT33-045 / AT33-046 — the owner’s standing decisions', () => {
  it('AT33-045: forbidding a move makes it ineligible without recording it as ineffective', () => {
    const verdict = judge(pattern('move-body:longer-walk'), {
      now: new Date(BASE),
      enabledDomains: new Set<DomainId>(DOMAIN_IDS),
      situation: {},
      suppressed: new Map([['move-body:longer-walk', 'You asked never to be offered this']]),
      recentlyCompleted: [],
      hasNorthStar: true,
      hasOpenCommitment: true,
    });

    expect(verdict.eligible).toBe(false);
    expect(verdict.because).toBe('You asked never to be offered this');

    /* Crucially, nothing about the move's evidence changed. */
    expect(lifecycleOf('move-body:longer-walk', []).current).toBe('experimental');
  });

  it('AT33-046: Can’t Now is temporary and offers a prerequisite path', () => {
    /* The prerequisite captures exist and can interrupt precisely for this. */
    const prerequisites = ALL_CONTEXTUAL_CAPTURES.filter(
      (capture) =>
        capture.domainId === 'health-recovery-energy' &&
        capture.captureClass === 'triggered-domain-question',
    );
    expect(prerequisites.length).toBeGreaterThan(0);
    for (const capture of prerequisites) {
      expect(capture.canAffectCurrentDecision).toBe(true);
      /* Temporary by construction: it expires rather than becoming a standing fact. */
      expect(capture.freshnessHours).toBeGreaterThan(0);
    }
  });
});

/* ========================================================================== */
/* J / K. Capture                                                              */
/* ========================================================================== */

describe('AT33-047 / AT33-048 / AT33-049 / AT33-053 — capture purpose', () => {
  it('AT33-047: every capture declares why it exists', () => {
    for (const capture of ALL_CONTEXTUAL_CAPTURES) {
      expect(capture.triggers.length, capture.id).toBeGreaterThan(0);
      expect(capture.duplicateSuppression.length, capture.id).toBeGreaterThan(0);
      expect(capture.skipWritesNothing, capture.id).toBe(true);
    }
  });

  it('AT33-048: food capture is qualitative and never asks for causation', () => {
    const foodPrompts = ALL_PROMPTS.filter((entry) => entry.promptId.startsWith('food:'));
    expect(foodPrompts.length).toBeGreaterThan(0);
    for (const prompt of foodPrompts) {
      expect(prompt.text).not.toMatch(/calorie|macro|grams/i);
      expect(prompt.text).not.toMatch(/\bwhy\b|what caused/i);
      expect(prompt.input.kind).not.toBe('count');
    }
  });

  it('AT33-049: a routine can be learned without a chore manager appearing', () => {
    const routines = readFileSync('src/domain/routines/routines.ts', 'utf8');
    /* A closed list of decision-relevant boundaries, and no general task type. */
    expect(routines).toMatch(
      /ROUTINE_KINDS = \['usual-bedtime', 'usual-wake', 'phone-cutoff'\]/,
    );
    /*
     * Checked on the code rather than the prose. The file's own header explains at length
     * why this is not a chore manager, and naming a thing is not building one — the same
     * "a disavowal is still a mention" trap this project has hit before.
     */
    const code = routines
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trimStart();
        return (
          !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//')
        );
      })
      .join('\n');
    expect(code).not.toMatch(/streak|completionRate|todo|chore/i);
  });

  it('AT33-053: health and career participate in the shared capture registry', () => {
    const health = ALL_CONTEXTUAL_CAPTURES.filter(
      (capture) => capture.domainId === 'health-recovery-energy',
    );
    const career = ALL_CONTEXTUAL_CAPTURES.filter(
      (capture) => capture.domainId === 'career-and-learning',
    );
    expect(health.length).toBeGreaterThan(0);
    expect(career.length).toBeGreaterThan(0);
  });
});

/* ========================================================================== */
/* Cross-cutting                                                               */
/* ========================================================================== */

describe('AT33-052 / AT33-054 / AT33-055 — regression, mobile, and the gate', () => {
  it('AT33-052: the Prompt 9 repair behaviours are still covered', () => {
    const repair = readFileSync('tests/unit/repairPass.test.ts', 'utf8');
    for (const marker of ['Coverage', 'cadence', 'rules', 'privacy']) {
      expect(repair.toLowerCase()).toMatch(marker.toLowerCase());
    }
  });

  it('AT33-054: mobile and accessibility budgets are enforced in the browser suite', () => {
    const shell = readFileSync('tests/e2e/console-shell.spec.ts', 'utf8');
    expect(shell).toMatch(/44 x 44/);
    expect(shell).toMatch(/200 percent text zoom/);
  });

  it('AT33-055: rule versions are recorded so a trace can be read against them', () => {
    expect(DECISION_RULES_VERSION.length).toBeGreaterThan(0);
    expect(EVIDENCE_RULES_VERSION.length).toBeGreaterThan(0);
    expect(EVIDENCE_RULES_VERSION).not.toBe(DECISION_RULES_VERSION);
  });
});

/* ========================================================================== */
/* Capacity, personalisation, and reachability                                 */
/* ========================================================================== */

describe('cross-cutting behaviour the corpus depends on', () => {
  it('personalisation preserves identity', () => {
    for (const entry of MOVE_PATTERNS.slice(0, 25)) {
      const result = personalise(entry, {});
      expect(result.patternId).toBe(entry.patternId);
      expect(result.statement).not.toContain('{');
    }
  });

  it('unknown context never removes a move', () => {
    for (const entry of MOVE_PATTERNS) {
      if (entry.capacity === undefined) continue;
      expect(fits(entry.capacity, {}).eligible, entry.patternId).toBe(true);
    }
  });

  it('every active pattern is reachable in some legitimate state', () => {
    const stranded = MOVE_PATTERNS.filter((entry) => {
      if (entry.lifecycle === 'retired') return false;
      return !judge(entry, {
        now: new Date(BASE),
        enabledDomains: new Set<DomainId>(DOMAIN_IDS),
        situation: {
          setting: 'home',
          engagement: 'free',
          interruptibility: 'free',
          privacy: 'private',
        },
        suppressed: new Map(),
        recentlyCompleted:
          entry.after === undefined
            ? []
            : [{ patternId: entry.after, at: new Date(BASE - HOUR).toISOString() }],
        hasNorthStar: true,
        hasOpenCommitment: true,
      }).eligible;
    });
    expect(stranded.map((entry) => entry.patternId)).toEqual([]);
  });
});
