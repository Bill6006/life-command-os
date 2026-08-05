import { beforeEach, describe, expect, it } from 'vitest';
import {
  DOMAIN_IDS,
  DOMAIN_LIST,
  domainDefinition,
} from '../../src/domain/domains/definitions';
import {
  CAPABILITY_CHANNELS,
  capabilityEffect,
  partitionEffects,
} from '../../src/domain/capabilities';
import {
  checkPromptOwnership,
  domainsMissingUpdatePrompt,
  ownerOf,
} from '../../src/domain/prompts/ownership';
import { ALL_PROMPTS } from '../../src/domain/prompts/definitions';
import {
  ENABLED_CATEGORIES,
  RECORD_TYPES,
  parseCanonicalRecord,
  type CanonicalRecord,
} from '../../src/domain/records';
import {
  DEFAULT_DOMAIN_STATE,
  domainState,
  enabledDomains,
  mayGenerateCandidate,
  resolveDomains,
  visibleDomains,
} from '../../src/intelligence/domains/registry';
import {
  implementedDomains,
  isImplemented,
  unimplementedDomains,
} from '../../src/domain/domains/availability';
import {
  buildDomainPanels,
  defaultContribution,
} from '../../src/intelligence/domains/domainPanel';
import {
  enforceOneCandidatePerDomain,
  violatesOneCandidateLimit,
} from '../../src/intelligence/domains/candidateLimit';
import { focusOnDomain } from '../../src/intelligence/domains/manualFocus';
import {
  captureAttribute,
  captureDomain,
  capturedEvents,
  duplicateCaptures,
  projectionsFor,
} from '../../src/intelligence/domains/captureRouting';
import {
  barComparisonEligibility,
  chooseRepresentation,
  evidenceSummaryEligibility,
  lineGraphEligibility,
  meterEligibility,
  meterPercent,
  stagePathEligibility,
  timelineEligibility,
} from '../../src/intelligence/visuals/eligibility';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { aDomainPreference, anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';
import type { CandidateAction } from '../../src/intelligence/types';

/**
 * Phase 7 Prompt 8A gate: the shared domain framework.
 *
 * The framework's job is to make seven areas of life share one architecture. Most of
 * these tests are therefore about what it **refuses** — a second candidate, a score, a
 * duplicated capture, a percentage over a construct with no denominator. A framework
 * that only enabled things would not need to exist; the domains could each do their
 * own thing, which is precisely what went wrong last time.
 */

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('domain metadata describes without implementing', () => {
  it('registers the seven approved domains and no others', () => {
    expect([...DOMAIN_IDS]).toEqual([
      'health-recovery-energy',
      'career-and-learning',
      'fatherhood',
      'emotional-and-relationships',
      'faith-and-meaning',
      'home-and-environment',
      'money',
    ]);
  });

  it('creates no domain-specific record family', () => {
    // The whole point: seven domains, one store. `domain-preference` holds a
    // preference and no content.
    for (const id of DOMAIN_IDS) {
      expect(RECORD_TYPES.some((type) => type.includes(id))).toBe(false);
    }
    expect(RECORD_TYPES.filter((type) => type.startsWith('domain-'))).toEqual([
      'domain-preference',
    ]);
  });

  it('gives every domain a question, a privacy class, and a boundary it must not cross', () => {
    for (const definition of DOMAIN_LIST) {
      expect(definition.question.length, definition.id).toBeGreaterThan(10);
      expect(definition.privacy, definition.id).toBeTruthy();
      expect(definition.notBuilt.length, definition.id).toBeGreaterThan(0);
      expect(definition.activatedBy, definition.id).toMatch(/^Prompt 8[B-H]$/);
    }
  });

  it('classifies sensitive areas as sensitive by default', () => {
    expect(domainDefinition('fatherhood').privacy).toBe('child');
    expect(domainDefinition('health-recovery-energy').privacy).toBe('health');
    expect(domainDefinition('money').privacy).toBe('money');
    expect(domainDefinition('faith-and-meaning').privacy).toBe('faith');
  });

  it('reads only categories that actually exist', () => {
    // Against the constant, so activating a category cannot silently orphan this.
    const active: readonly string[] = ENABLED_CATEGORIES;
    for (const definition of DOMAIN_LIST) {
      for (const category of definition.reads) {
        expect(active, definition.id).toContain(category);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('enablement is the owner’s, and disabling never deletes', () => {
  it('starts every domain switched off', () => {
    expect(DEFAULT_DOMAIN_STATE).toBe('disabled');
    expect(resolveDomains([]).every((domain) => domain.state === 'disabled')).toBe(true);
    expect(enabledDomains([])).toEqual([]);
    expect(visibleDomains([])).toEqual([]);
  });

  it('turns one on without touching the others', () => {
    const records = [aDomainPreference({ domainId: 'career-and-learning', state: 'enabled' })];
    const enabled = enabledDomains(records);

    expect(enabled).toHaveLength(1);
    expect(required(enabled[0], 'the enabled domain').definition.id).toBe(
      'career-and-learning',
    );
    expect(mayGenerateCandidate(records as CanonicalRecord[], 'career-and-learning')).toBe(
      true,
    );
    expect(mayGenerateCandidate(records as CanonicalRecord[], 'health-recovery-energy')).toBe(
      false,
    );
  });

  it('lets a newer preference supersede an older one, keeping both records', () => {
    const first = aDomainPreference({ domainId: 'career-and-learning', state: 'enabled' });
    const second = aDomainPreference({
      domainId: 'career-and-learning',
      state: 'disabled',
      supersedesRecordId: first.recordId,
      reason: 'Not this season',
    });
    const records = [first, second] as CanonicalRecord[];

    expect(mayGenerateCandidate(records, 'career-and-learning')).toBe(false);
    // Nothing was removed. History of it having been on survives.
    expect(records).toHaveLength(2);
  });

  it('has no destructive state at all', () => {
    // There is no `deleted`, `purged`, or `reset` branch, so no future feature can
    // start using one without this test failing first.
    const bad = aDomainPreference({ state: 'deleted' as never });
    expect(parseCanonicalRecord(bad).ok).toBe(false);
  });

  it('makes deprioritised readable and silent', () => {
    const records = [
      aDomainPreference({ domainId: 'career-and-learning', state: 'deprioritised' }),
    ] as CanonicalRecord[];

    expect(enabledDomains(records)).toEqual([]);
    expect(visibleDomains(records)).toHaveLength(1);
    expect(mayGenerateCandidate(records, 'career-and-learning')).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('only areas with a slice behind them can be switched on', () => {
  it('counts an area as available exactly when its update prompt exists', () => {
    // Derived, not listed. A slice makes its area available by writing its questions,
    // and there is no other way to make one available.
    for (const definition of DOMAIN_LIST) {
      const hasPrompt = ALL_PROMPTS.some(
        (prompt) => prompt.promptId === definition.updatePromptId,
      );
      expect(isImplemented(definition), definition.id).toBe(hasPrompt);
    }
  });

  it('offers exactly the built areas today', () => {
    expect(implementedDomains().map((definition) => definition.id)).toEqual([
      'health-recovery-energy',
      'career-and-learning',
      'fatherhood',
      'emotional-and-relationships',
      'faith-and-meaning',
    ]);
    expect(unimplementedDomains().map((definition) => definition.id)).toEqual([
      'home-and-environment',
      'money',
    ]);
  });

  it('ignores a preference that says an unbuilt area is on', () => {
    // The record is not rewritten and not rejected — it stays exactly as the owner (or
    // an older build, or a restored backup) wrote it. It is simply not acted on, which
    // is what stops a frame with nothing behind it reaching the screen.
    const records = [
      aDomainPreference({ domainId: 'money', state: 'enabled' }),
    ] as CanonicalRecord[];

    expect(domainState(records, 'money')).toBe('enabled');
    expect(enabledDomains(records)).toEqual([]);
    expect(visibleDomains(records)).toEqual([]);
    expect(mayGenerateCandidate(records, 'money')).toBe(false);
    expect(buildDomainPanels(records, [], [])).toEqual([]);
  });

  it('gives every panel a working way to update the area', () => {
    // The old `updateAvailable` flag is gone because it can no longer be false: a panel
    // exists only for an area the owner could switch on, and that requires the prompt.
    for (const definition of implementedDomains()) {
      const panels = buildDomainPanels(
        [aDomainPreference({ domainId: definition.id, state: 'enabled' })] as CanonicalRecord[],
        [],
        [],
      );
      const panel = required(panels[0], `${definition.id} panel`);
      expect(
        ALL_PROMPTS.some((prompt) => prompt.promptId === panel.updatePromptId),
        panel.updatePromptId,
      ).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('a domain may offer one candidate, and no more', () => {
  const candidate = (id: string, originDomainId?: string): CandidateAction =>
    ({
      id,
      statement: `Move ${id}`,
      category: 'career-work-learning',
      intendedOutcome: 'Something observable happens',
      followUp: { promptId: 'outcome:completed', windowHours: 24 },
      capabilityEffects: [],
      originDomainId,
      durationMinutes: 20,
      minimumMinutes: 5,
      minimumVersion: 'A smaller version',
      fallback: 'Write down the next step',
      stoppingPoint: 'Stop after twenty minutes',
      friction: 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
      goalId: undefined,
      reason: 'test',
    }) as unknown as CandidateAction;

  it('keeps the first and reports the rest', () => {
    const result = enforceOneCandidatePerDomain([
      candidate('a', 'money'),
      candidate('b', 'money'),
      candidate('c', 'fatherhood'),
    ]);

    expect(result.accepted.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(result.rejected).toHaveLength(1);
    // Reported, not silently dropped — a domain losing half its output quietly would
    // look like a domain with nothing to say.
    expect(required(result.rejected[0], 'a rejection').because).toMatch(/one candidate/);
  });

  it('leaves the core engine’s own candidates alone', () => {
    const result = enforceOneCandidatePerDomain([
      candidate('a'),
      candidate('b'),
      candidate('c'),
    ]);
    expect(result.accepted).toHaveLength(3);
    expect(result.rejected).toEqual([]);
  });

  it('detects a violation for a slice under development', () => {
    expect(
      violatesOneCandidateLimit([{ originDomainId: 'money' }, { originDomainId: 'money' }]),
    ).toBe(true);
    expect(
      violatesOneCandidateLimit([{ originDomainId: 'money' }, { originDomainId: undefined }]),
    ).toBe(false);
  });

  it('rejects a candidate record with no intended outcome or follow-up', () => {
    // `AT-017`. A candidate that cannot say what it is for has nothing to be
    // evaluated against later.
    const withoutOutcome = {
      recordId: '00000000-0000-4000-8000-000000000900',
      recordType: 'candidate-action',
      schemaVersion: 1,
      occurredAt: '2026-01-05T09:00:00.000Z',
      recordedAt: '2026-01-05T09:00:00.000Z',
      localTime: { localIso: '2026-01-05T09:00:00', timeZone: 'UTC', utcOffsetMinutes: 0 },
      source: 'system-derived',
      provenance: {
        method: 'derived',
        derivedFromRecordIds: ['00000000-0000-4000-8000-000000000901'],
      },
      statement: 'Do the thing',
      category: 'career-work-learning',
      timing: {},
      friction: 'low',
      minimumViableVersion: 'A smaller thing',
      stoppingPoint: 'Stop',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
    };

    expect(parseCanonicalRecord(withoutOutcome).ok).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('capability channels cannot become a score', () => {
  it('defines the ten channels', () => {
    expect(CAPABILITY_CHANNELS).toHaveLength(10);
  });

  it('has nowhere to put a number', () => {
    const withScore = {
      channel: 'focus-and-clarity',
      effect: 'improves',
      magnitude: 'small',
      basis: 'app-inference',
      crossDomain: false,
      value: 0.7,
    };
    // Strict object: a numeric field is a parse error, not a design drift.
    expect(capabilityEffect.safeParse(withScore).success).toBe(false);
  });

  it('requires every effect to say where it came from', () => {
    const withoutBasis = {
      channel: 'focus-and-clarity',
      effect: 'improves',
      magnitude: 'small',
      crossDomain: false,
    };
    expect(capabilityEffect.safeParse(withoutBasis).success).toBe(false);
  });

  it('groups benefits and costs without netting them', () => {
    const effects = [
      {
        channel: 'focus-and-clarity',
        effect: 'improves',
        magnitude: 'meaningful',
        basis: 'app-inference',
        crossDomain: false,
      },
      {
        channel: 'energy-and-recovery',
        effect: 'costs',
        magnitude: 'small',
        basis: 'app-inference',
        crossDomain: true,
      },
      {
        channel: 'follow-through',
        effect: 'uncertain',
        magnitude: 'unknown',
        basis: 'app-inference',
        crossDomain: false,
      },
    ] as const;

    const parts = partitionEffects([...effects]);
    expect(parts.benefits).toHaveLength(1);
    expect(parts.costs).toHaveLength(1);
    expect(parts.uncertain).toHaveLength(1);
    // There is deliberately no `net`, `total`, or `score` on the result.
    expect(Object.keys(parts).sort()).toEqual(['benefits', 'costs', 'uncertain']);
  });
});

/* -------------------------------------------------------------------------- */

describe('the panel contract is the same for every domain', () => {
  const records = [aDomainPreference({ domainId: 'career-and-learning', state: 'enabled' })];

  it('renders nothing at all while every domain is off', () => {
    const episode = runEpisode(
      scenarioById('action').records,
      new Date('2026-01-05T17:58:00Z'),
    );
    expect(episode.domains).toEqual([]);
  });

  it('builds a full panel from shared evidence once a domain is on', () => {
    const scenario = scenarioById('action');
    const episode = runEpisode(
      [...scenario.records, ...(records as CanonicalRecord[])],
      new Date(scenario.nowIso),
    );

    expect(episode.domains).toHaveLength(1);
    const panel = required(episode.domains[0], 'the domain panel');

    // All twelve contract fields are present, and none of them is a score.
    expect(panel.domainId).toBe('career-and-learning');
    expect(panel.question.length).toBeGreaterThan(10);
    expect(panel.northStarContribution.length).toBeGreaterThan(10);
    expect(panel.condition.length).toBeGreaterThan(0);
    expect(panel.trajectory).toBeTruthy();
    expect(panel.confidence.label).toBeTruthy();
    expect(panel.freshness).toBeTruthy();
    expect(Array.isArray(panel.drivers)).toBe(true);
    expect(Array.isArray(panel.whatChanged)).toBe(true);
    expect(Array.isArray(panel.strongestEvidence)).toBe(true);
    expect(panel.updatePromptId).toBe('update-area:career-and-learning');
    expect(Array.isArray(panel.visuals)).toBe(true);

    // No numeric field anywhere that could be read as a rating.
    for (const [key, value] of Object.entries(panel)) {
      expect(typeof value, `${key} is a number`).not.toBe('number');
    }
  });

  it('abstains rather than inventing a condition when a domain reads nothing', () => {
    const contribution = defaultContribution(
      {
        definition: domainDefinition('fatherhood'),
        state: 'enabled',
        setBy: undefined,
        reason: undefined,
        available: false,
      },
      [],
    );
    expect(contribution.trajectory).toBe('insufficient-evidence');
    expect(contribution.condition).toMatch(/Nothing is recorded for this area yet/);
  });

  it('never offers a move from a deprioritised domain', () => {
    const panels = buildDomainPanels(
      [
        aDomainPreference({ domainId: 'career-and-learning', state: 'deprioritised' }),
      ] as CanonicalRecord[],
      [],
      [{ change: 'something', detail: '', when: 'today', altered: 'state', recordIds: [] }],
    );

    expect(panels).toHaveLength(1);
    const panel = required(panels[0], 'the panel');
    expect(panel.state).toBe('deprioritised');
    expect(panel.move).toBeUndefined();
    // Silent about what changed, too.
    expect(panel.whatChanged).toEqual([]);
  });

  it('marks every domain move subordinate, with no way to unset it', () => {
    const panels = buildDomainPanels(
      [
        aDomainPreference({ domainId: 'career-and-learning', state: 'enabled' }),
      ] as CanonicalRecord[],
      [],
      [],
      new Map([
        [
          'career-and-learning',
          {
            condition: 'Steady',
            trajectory: 'stable' as const,
            confidence: { label: 'early-signal' as const, why: 'test', dimensions: [] },
            freshness: 'fresh' as const,
            drivers: [],
            move: { statement: 'A money move' } as unknown as CandidateAction,
          },
        ],
      ]),
    );

    const move = required(required(panels[0], 'the panel').move, 'the move');
    expect(move.subordinate).toBe(true);
    expect(move.labelledAs).toMatch(/answer on Now still comes first/);
  });
});

/* -------------------------------------------------------------------------- */

describe('manual focus is the owner’s constraint, labelled as such', () => {
  it('refuses a domain that is not enabled', () => {
    expect(focusOnDomain([], 'money', []).kind).toBe('domain-not-enabled');
  });

  it('says so plainly when nothing is eligible', () => {
    const result = focusOnDomain(
      [aDomainPreference({ domainId: 'money', state: 'enabled' })] as CanonicalRecord[],
      'money',
      [],
    );
    expect(result.kind).toBe('no-move-available');
  });

  it('labels a move as the owner’s choice rather than the engine’s conclusion', () => {
    const result = focusOnDomain(
      [aDomainPreference({ domainId: 'money', state: 'enabled' })] as CanonicalRecord[],
      'money',
      [{ statement: 'A money move' } as unknown as CandidateAction],
    );

    expect(result.kind).toBe('move');
    if (result.kind !== 'move') return;
    expect(result.chosenByOwner).toBe(true);
    expect(result.note).toMatch(/the answer on Now is still the answer/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('one capture, one canonical event', () => {
  it('routes a single record to every surface without copying it', () => {
    const record = anObservation({
      attribute: captureAttribute('A win', 'career-and-learning'),
    });
    const surfaces = projectionsFor(record);

    expect(surfaces).toContain('timeline');
    expect(surfaces).toContain('domain-detail');
    expect(surfaces).toContain('weekly-review');
    expect(surfaces).toContain('learning');
    expect(surfaces).toContain('export');
    // Five surfaces, one record.
    expect(capturedEvents([record])).toHaveLength(1);
  });

  it('carries the domain in the attribute, so a capture outlives the framework', () => {
    const withDomain = anObservation({ attribute: captureAttribute('A win', 'fatherhood') });
    const without = anObservation({ attribute: captureAttribute('A win') });

    expect(captureDomain(withDomain)).toBe('fatherhood');
    expect(captureDomain(without)).toBeUndefined();
    // A capture with no domain is still routed, just not to a domain detail.
    expect(projectionsFor(without)).not.toContain('domain-detail');
  });

  it('detects the same event captured twice', () => {
    const first = anObservation({ attribute: captureAttribute('A win') });
    const second = anObservation({
      ...first,
      recordId: '00000000-0000-4000-8000-000000000777',
    });

    expect(duplicateCaptures([first, second])).toHaveLength(1);
    expect(duplicateCaptures([first])).toEqual([]);
  });

  it('does not call two different captures a duplicate', () => {
    const first = anObservation({ attribute: captureAttribute('A win') });
    const second = anObservation({
      recordId: '00000000-0000-4000-8000-000000000778',
      attribute: captureAttribute('A friction'),
    });
    expect(duplicateCaptures([first, second])).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('a visual has to earn its place', () => {
  it('refuses a meter over a construct with no denominator', () => {
    // The failure this exists to prevent: "Fatherhood 68%".
    const result = meterEligibility({
      current: 68,
      target: 100,
      baseline: 0,
      unit: 'points',
      hasValidDenominator: false,
    });
    expect(result.eligible).toBe(false);
    expect(result.eligible ? '' : result.because).toMatch(/not the kind of thing/);
    expect(
      meterPercent({
        current: 68,
        target: 100,
        baseline: 0,
        unit: 'points',
        hasValidDenominator: false,
      }),
    ).toBeUndefined();
  });

  it('allows a meter where a real target and current value exist', () => {
    const input = {
      current: 4200,
      target: 12000,
      baseline: 0,
      unit: 'GBP',
      hasValidDenominator: true,
    };
    expect(meterEligibility(input).eligible).toBe(true);
    expect(meterPercent(input)).toBe(35);
  });

  it('refuses a meter with no target, no current value, or no unit', () => {
    const base = { current: 1, target: 10, baseline: 0, unit: 'x', hasValidDenominator: true };
    expect(meterEligibility({ ...base, target: undefined }).eligible).toBe(false);
    expect(meterEligibility({ ...base, current: undefined }).eligible).toBe(false);
    expect(meterEligibility({ ...base, unit: '  ' }).eligible).toBe(false);
  });

  it('needs two observed periods before it will draw a trend', () => {
    expect(
      lineGraphEligibility({ points: [{ label: 'w1', value: 3 }], ordered: true }).eligible,
    ).toBe(false);
    expect(
      lineGraphEligibility({
        points: [
          { label: 'w1', value: 3 },
          { label: 'w2', value: null },
          { label: 'w3', value: 5 },
        ],
        ordered: true,
      }).eligible,
    ).toBe(true);
  });

  it('refuses a bar chart over a split continuum', () => {
    const bars = [
      { label: 'low', value: 1 },
      { label: 'high', value: 2 },
    ];
    expect(barComparisonEligibility({ bars, discrete: false }).eligible).toBe(false);
    expect(barComparisonEligibility({ bars, discrete: true }).eligible).toBe(true);
  });

  it('uses a stage path for ordinal development, and treats not-assessed as a position', () => {
    const stages = ['Not introduced', 'Practising', 'Doing often'];
    expect(stagePathEligibility({ stages, currentIndex: 1, ordinal: true }).eligible).toBe(
      true,
    );
    expect(
      stagePathEligibility({ stages, currentIndex: undefined, ordinal: true }).eligible,
    ).toBe(true);
    expect(stagePathEligibility({ stages, currentIndex: 1, ordinal: false }).eligible).toBe(
      false,
    );
    expect(stagePathEligibility({ stages, currentIndex: 9, ordinal: true }).eligible).toBe(
      false,
    );
  });

  it('always allows an evidence summary, so there is never nothing to render', () => {
    expect(evidenceSummaryEligibility().eligible).toBe(true);
    expect(timelineEligibility([]).eligible).toBe(false);
  });

  it('falls back to an evidence summary and says what it rejected', () => {
    const chosen = chooseRepresentation({
      meter: {
        current: 1,
        target: undefined,
        baseline: 0,
        unit: 'x',
        hasValidDenominator: true,
      },
      series: { points: [{ label: 'w1', value: 1 }], ordered: true },
    });

    expect(chosen.kind).toBe('evidence-summary');
    expect(chosen.rejected.join(' ')).toMatch(/meter:/);
    expect(chosen.rejected.join(' ')).toMatch(/line-graph:/);
  });

  it('prefers the most informative representation the evidence supports', () => {
    expect(
      chooseRepresentation({
        meter: { current: 5, target: 10, baseline: 0, unit: 'x', hasValidDenominator: true },
      }).kind,
    ).toBe('meter');

    expect(
      chooseRepresentation({
        stages: { stages: ['a', 'b'], currentIndex: 0, ordinal: true },
      }).kind,
    ).toBe('stage-path');
  });
});

/* -------------------------------------------------------------------------- */

describe('exactly one surface owns each question', () => {
  it('finds no violation in the shipped catalogue', () => {
    expect(checkPromptOwnership()).toEqual([]);
  });

  it('assigns every prompt to exactly one owner', () => {
    for (const prompt of ALL_PROMPTS) {
      expect(ownerOf(prompt), prompt.promptId).toBeDefined();
    }
  });

  it('routes each family of question to the surface that should ask it', () => {
    const owner = (id: string): string | undefined => {
      const prompt = ALL_PROMPTS.find((entry) => entry.promptId === id);
      return prompt === undefined ? undefined : ownerOf(prompt);
    };

    expect(owner('state:energy')).toBe('guide');
    expect(owner('sleep:bedtime')).toBe('guide');
    expect(owner('outcome:completed')).toBe('decision-episode');
  });

  it('reports a prompt claimed twice', () => {
    const duplicated = required(ALL_PROMPTS[0], 'a prompt');
    const violations = checkPromptOwnership([duplicated, duplicated]);
    expect(violations.map((entry) => entry.detail).join(' ')).toMatch(/more than once/);
  });

  it('will not let a slice enable a domain with no way to update it', () => {
    // No update prompt exists yet, so enabling any domain is reported.
    expect(domainsMissingUpdatePrompt(['money'])).toEqual(['money']);
    // And nothing is missing while nothing is enabled, which is today.
    expect(domainsMissingUpdatePrompt([])).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('the framework can be removed without breaking core records', () => {
  it('leaves every canonical record valid with no domain involved', () => {
    // No record type requires a domain; `originDomainId` is optional throughout.
    const scenario = scenarioById('learning-loop');
    for (const record of scenario.records) {
      expect(parseCanonicalRecord(record).ok, record.recordType).toBe(true);
      expect(JSON.stringify(record)).not.toContain('originDomainId');
    }
  });

  it('runs a full episode identically whether or not domains are considered', () => {
    const scenario = scenarioById('action');
    const now = new Date(scenario.nowIso);

    const withoutDomains = runEpisode(scenario.records, now);
    const withDomain = runEpisode(
      [
        ...scenario.records,
        ...([aDomainPreference({ domainId: 'money', state: 'enabled' })] as CanonicalRecord[]),
      ],
      now,
    );

    // The global decision is untouched by a domain being switched on.
    expect(withDomain.output.kind).toBe(withoutDomains.output.kind);
    if (withDomain.output.kind === 'action' && withoutDomains.output.kind === 'action') {
      expect(withDomain.output.candidate.statement).toBe(
        withoutDomains.output.candidate.statement,
      );
    }
  });
});
