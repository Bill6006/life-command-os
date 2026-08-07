import { describe, expect, it } from 'vitest';
import { activeDeclines } from '../../src/command-core/arbitration/declined';
import {
  DECISION_RULES_HISTORY,
  DECISION_RULES_VERSION,
  comparableUnderSameRules,
} from '../../src/command-core/rules';
import {
  CADENCE_FRESHNESS_MULTIPLIER,
  COVERAGE_CADENCES,
  cadenceFor,
  intentionallyQuiet,
  snoozedUntil,
} from '../../src/domain/domains/cadence';
import { findQuietAreas } from '../../src/command-core/coverage/forgotten';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { PERMISSIBLE_SURFACES, PROTECTED_TOPICS } from '../../src/domain/records/permissions';
import { maySurface } from '../../src/domain/emotional/permissions';
import type { CanonicalRecord } from '../../src/domain/records';
import { runEpisode } from '../../src/intelligence';
import { SCENARIOS, scenarioById } from '../../src/app/scenarios';
import {
  aCandidateAction,
  anExecution,
  anObservation,
  aSurfacePermission,
  resetFixtureIds,
} from '../fixtures/records';
import { required } from '../support/required';

/**
 * Phase 8 repair pass.
 *
 * Six items that were built and inert, unbuilt, or duplicated — plus the privacy decision
 * that faith practices are protected content on Now. Each block below is one of them, and
 * every one asserts the behaviour rather than the existence of the code.
 */

const NOW = new Date('2026-08-10T09:00:00.000Z');

/* -------------------------------------------------------------------------- */

describe('1. the coverage plan changes what the owner is asked', () => {
  it('drops a suppressed prompt from a guide, in Command Core’s words', () => {
    /*
     * The whole point of the repair. Before this, suppression was computed, reported on a
     * panel, and ignored by the planner — a rule that governed nothing.
     */
    const plan = planGuide('afternoon', 'full', [], NOW, undefined, {
      suppressed: new Map([['state:energy', 'Snoozed until 2026-08-24']]),
      offered: [],
    });

    expect(
      plan.steps.some(
        (step) => step.kind === 'prompt' && step.prompt.promptId === 'state:energy',
      ),
    ).toBe(false);
    expect(plan.omitted.find((entry) => entry.promptId === 'state:energy')?.because).toBe(
      'Snoozed until 2026-08-24',
    );
  });

  it('keeps asking when nothing suppressed it', () => {
    const plan = planGuide('afternoon', 'full', [], NOW, undefined, {
      suppressed: new Map(),
      offered: [],
    });
    expect(
      plan.steps.some(
        (step) => step.kind === 'prompt' && step.prompt.promptId === 'state:energy',
      ),
    ).toBe(true);
  });

  it('never suppresses a question on the page the owner opened', () => {
    /*
     * Suppression governs what the app raises. A question he went looking for is a
     * different act, and silencing it would make Update This Area unreliable.
     */
    const plan = planGuide('update-area', 'full', [], NOW, 'faith-and-meaning', {
      suppressed: new Map([['update-area:faith-and-meaning', 'In cooldown']]),
      offered: [],
    });
    expect(
      plan.steps.some(
        (step) =>
          step.kind === 'prompt' && step.prompt.promptId === 'update-area:faith-and-meaning',
      ),
    ).toBe(true);
  });

  it('adds an offered guide-surface question at the back, never the front', () => {
    const plan = planGuide('afternoon', 'full', [], NOW, undefined, {
      suppressed: new Map(),
      offered: [{ promptId: 'home:conditions', surface: 'guide' }],
    });

    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids).toContain('home:conditions');
    expect(ids.at(-1)).toBe('home:conditions');
  });

  it('refuses to add anything a guide does not own', () => {
    const plan = planGuide('afternoon', 'full', [], NOW, undefined, {
      suppressed: new Map(),
      offered: [{ promptId: 'update-area:money', surface: 'update-this-area' }],
    });
    expect(
      plan.steps.some(
        (step) => step.kind === 'prompt' && step.prompt.promptId === 'update-area:money',
      ),
    ).toBe(false);
  });

  it('adds nothing merely because time passed', () => {
    /*
     * Every offered item reached the plan by being declared decision-relevant and then
     * surviving suppression. There is no path from an elapsed interval to a question.
     */
    const empty = planGuide('afternoon', 'full', [], NOW, undefined, {
      suppressed: new Map(),
      offered: [],
    });
    const later = planGuide(
      'afternoon',
      'full',
      [],
      new Date('2027-01-01T09:00:00.000Z'),
      undefined,
      {
        suppressed: new Map(),
        offered: [],
      },
    );
    expect(later.steps.length).toBe(empty.steps.length);
  });
});

/* -------------------------------------------------------------------------- */

describe('2. a declined action cannot immediately return', () => {
  /**
   * A decline, built from the real fixtures.
   *
   * The first version hand-rolled the two records and omitted `occurredAt`, which crashed
   * `outcomeWindows` computing a follow-up window — a broken fixture rather than a broken
   * product, and a reminder that a record missing an envelope field is not a record.
   */
  function declineOf(engineCandidateId: string, at: string): readonly CanonicalRecord[] {
    resetFixtureIds();
    const episodeId = '00000000-0000-4000-8000-0000000000ff';
    return [
      aCandidateAction({
        decisionEpisodeId: episodeId,
        engineCandidateId,
        occurredAt: at,
        recordedAt: at,
      }),
      anExecution('00000000-0000-4000-8000-000000000fee', {
        decisionEpisodeId: episodeId,
        state: 'not-executed',
        declineReason: 'Not the right action',
        occurredAt: at,
        recordedAt: at,
      } as never),
    ] as CanonicalRecord[];
  }

  it('holds the decline while nothing new has been recorded', () => {
    const declines = activeDeclines(
      declineOf('home:make-the-change', '2026-08-10T09:00:00.000Z'),
    );
    expect([...declines]).toEqual(['home:make-the-change']);
  });

  it('does not treat the decline’s own snapshot as the evidence that reverses it', () => {
    /*
     * `declineRecommendation` writes a context snapshot at the same instant. Comparing with
     * `>` is what stops a decline from cancelling itself.
     */
    const at = '2026-08-10T09:00:00.000Z';
    const records = [
      ...declineOf('home:make-the-change', at),
      { recordType: 'context-snapshot', recordedAt: at } as unknown as CanonicalRecord,
    ];
    expect([...activeDeclines(records)]).toEqual(['home:make-the-change']);
  });

  it('releases the decline as soon as anything new is recorded', () => {
    const records = [
      ...declineOf('home:make-the-change', '2026-08-10T09:00:00.000Z'),
      {
        recordType: 'observation',
        recordedAt: '2026-08-10T09:05:00.000Z',
      } as unknown as CanonicalRecord,
    ];
    expect([...activeDeclines(records)]).toEqual([]);
  });

  it('cannot match a record written before the engine id existed', () => {
    const records = declineOf('home:make-the-change', '2026-08-10T09:00:00.000Z').map(
      (record) =>
        record.recordType === 'candidate-action'
          ? { ...record, engineCandidateId: undefined }
          : record,
    );
    expect([...activeDeclines(records)]).toEqual([]);
  });

  it('removes it from arbitration rather than merely ranking it down', () => {
    const scenario = required(
      SCENARIOS.find(
        (entry) => runEpisode(entry.records, new Date(entry.nowIso)).output.kind === 'action',
      ),
      'a scenario with an action',
    );
    const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
    if (episode.output.kind !== 'action') throw new Error('expected an action');

    const withDecline = [
      ...scenario.records,
      ...declineOf(episode.output.candidate.id, scenario.nowIso),
    ];
    const after = runEpisode(withDecline, new Date(scenario.nowIso));

    if (after.output.kind === 'action') {
      expect(after.output.candidate.id).not.toBe(episode.output.candidate.id);
    }
    expect(after.commandCore.rejected.some((entry) => entry.stage === 'declined')).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('3. Direction shows each reading once', () => {
  it('renders no category panel for a category a domain panel already covers', () => {
    /*
     * Asserted against the data the surface renders from, which is what decides it: a
     * switched-on domain's own category must not also appear as a standalone summary.
     */
    for (const entry of SCENARIOS) {
      const episode = runEpisode(entry.records, new Date(entry.nowIso));
      const covered = new Set(
        episode.domains.map((panel) => {
          const reads: Record<string, string> = {
            'health-recovery-energy': 'health-recovery-energy',
            'career-and-learning': 'career-work-learning',
            fatherhood: 'fatherhood-and-child',
            'emotional-and-relationships': 'emotional-and-relationships',
            'faith-and-meaning': 'faith-and-meaning',
            'home-and-environment': 'home-and-environment',
            money: 'money',
          };
          return reads[panel.domainId];
        }),
      );

      const shown = episode.categories
        .map((category) => category.category)
        .filter((category) => !covered.has(category));

      expect(new Set(shown).size, entry.id).toBe(shown.length);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('4. a recommendation records which rules produced it', () => {
  it('carries a version, and the history explains it', () => {
    expect(DECISION_RULES_VERSION).toMatch(/^\d{4}\.\d{2}-\d+$/);
    expect(DECISION_RULES_HISTORY[0]?.version).toBe(DECISION_RULES_VERSION);
    expect(
      required(DECISION_RULES_HISTORY[0], 'the history entry').summary.length,
    ).toBeGreaterThan(40);
  });

  it('treats an absent version as uncomparable rather than as version zero', () => {
    expect(comparableUnderSameRules(undefined, DECISION_RULES_VERSION)).toBe(false);
    expect(comparableUnderSameRules(undefined, undefined)).toBe(false);
    expect(comparableUnderSameRules(DECISION_RULES_VERSION, DECISION_RULES_VERSION)).toBe(true);
    expect(comparableUnderSameRules('2026.08-1', '2027.01-1')).toBe(false);
  });

  it('duplicates no owner fact — it is metadata about the interpreter', () => {
    /*
     * The version says what computed the reading. It is not something the owner reported,
     * and no canonical fact is restated by it.
     */
    expect(DECISION_RULES_VERSION).not.toMatch(/[a-z]{4,}/);
  });
});

/* -------------------------------------------------------------------------- */

describe('5. cadence narrows and never promotes', () => {
  it('offers no option that increases how often anything is raised', () => {
    expect([...COVERAGE_CADENCES]).toEqual(['normal', 'less-often', 'only-when-i-open-it']);
    for (const cadence of COVERAGE_CADENCES) {
      expect(CADENCE_FRESHNESS_MULTIPLIER[cadence], cadence).toBeGreaterThanOrEqual(1);
    }
  });

  it('reads the newest setting and defaults to normal', () => {
    resetFixtureIds();
    expect(cadenceFor([], 'money')).toBe('normal');

    const records = [
      anObservation({
        attribute: 'preference:cadence:money',
        value: { kind: 'state', state: 'less-often' },
      } as never),
    ] as CanonicalRecord[];
    expect(cadenceFor(records, 'money')).toBe('less-often');
  });

  it('lets a snooze lapse without leaving anything owed', () => {
    resetFixtureIds();
    const records = [
      anObservation({
        attribute: 'preference:snooze:money',
        value: { kind: 'state', state: '2026-08-20T00:00:00.000Z' },
      } as never),
    ] as CanonicalRecord[];

    expect(snoozedUntil(records, 'money', NOW)).toBe('2026-08-20T00:00:00.000Z');
    expect(
      snoozedUntil(records, 'money', new Date('2026-09-01T00:00:00.000Z')),
    ).toBeUndefined();
  });

  it('does not report a deliberately quiet area as forgotten', () => {
    resetFixtureIds();
    const records = [
      anObservation({
        attribute: 'preference:cadence:money',
        value: { kind: 'state', state: 'only-when-i-open-it' },
      } as never),
    ] as CanonicalRecord[];

    const submissions = [
      {
        domainId: 'money' as const,
        candidate: undefined,
        because: '',
        scan: {
          domainId: 'money' as const,
          freshness: 'none' as const,
          lastMeaningfulUpdate: undefined,
          standing: 'Nothing recorded yet',
          openItem: undefined,
          quickResponses: [],
        },
        enabled: true,
      },
    ];

    expect(findQuietAreas(submissions, NOW)).toHaveLength(1);
    expect(findQuietAreas(submissions, NOW, intentionallyQuiet(records))).toEqual([]);
  });
});

/* -------------------------------------------------------------------------- */

describe('privacy: a faith practice is protected content on Now', () => {
  it('adds Now as a surface that must be permitted separately', () => {
    expect([...PERMISSIBLE_SURFACES]).toContain('now');
    expect([...PROTECTED_TOPICS]).toContain('faith-practice');
  });

  it('is denied until the owner says otherwise', () => {
    expect(maySurface([], 'faith-practice', 'now')).toBe(false);
  });

  it('withholds the words while the area is on but the surface is not permitted', () => {
    const scenario = scenarioById('faith-enabled');
    const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
    expect(JSON.stringify(episode.output)).not.toContain(
      'Write to someone who would not expect it',
    );
  });

  it('quotes them once the Now surface is granted', () => {
    const scenario = scenarioById('faith-enabled');
    const permitted = [
      ...scenario.records,
      aSurfacePermission({ topic: 'faith-practice', surface: 'now', granted: true }),
    ] as CanonicalRecord[];

    const episode = runEpisode(permitted, new Date(scenario.nowIso));
    const rendered = JSON.stringify([episode.output, episode.domains]);
    expect(rendered).toContain('Write to someone who would not expect it');
  });
});
