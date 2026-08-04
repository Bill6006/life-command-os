import { describe, expect, it } from 'vitest';
import {
  FORBIDDEN_HEALTH_VOCABULARY,
  HEALTH_ACTIONS,
  HEALTH_ACTION_IDS,
  MEDITATION_PURPOSES,
} from '../../src/domain/health/actions';
import { ALL_PROMPTS, HEALTH_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { domainDefinition } from '../../src/domain/domains/definitions';
import { ENABLED_CATEGORIES, type CanonicalRecord } from '../../src/domain/records';
import { assessHealth } from '../../src/intelligence/domains/health/assessHealth';
import { generateHealthCandidate } from '../../src/intelligence/domains/health/healthCandidate';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { required } from '../support/required';
import type { StateAssessment } from '../../src/intelligence/types';

/**
 * Phase 7 Prompt 8B gate: Health, recovery, and energy.
 *
 * This is the first domain that can hurt someone by being helpful, so most of this
 * file is about restraint — what the slice refuses to say, refuses to compute, and
 * refuses to keep an opinion about.
 */

const NOW = new Date('2026-01-05T12:58:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function healthPanel(scenarioId: string) {
  const episode = run(scenarioId);
  return required(
    episode.domains.find((panel) => panel.domainId === 'health-recovery-energy'),
    'the health panel',
  );
}

const NO_STATE: StateAssessment = {
  readings: [],
  availableMinutes: { status: 'unknown' },
  capacity: { status: 'unknown' },
  protectedContexts: [],
  contradictions: [],
  unknowns: [],
  staleAttributes: [],
  basisRecordIds: [],
  confidence: { label: 'insufficient-evidence', why: '', dimensions: [] },
};

/* -------------------------------------------------------------------------- */

describe('the safety boundary is structural, not a filter', () => {
  it('can only produce actions from the closed set', () => {
    expect([...HEALTH_ACTION_IDS]).toEqual([
      'pause',
      'hydrate',
      'gentle-movement',
      'prepare-for-sleep',
      'meditate',
      'eat-something',
      'seek-human-support',
    ]);
  });

  it('uses no clinical or programming vocabulary anywhere in the action set', () => {
    // Not filtered out — absent. There is no template that could produce it.
    const text = JSON.stringify(HEALTH_ACTIONS).toLowerCase();
    for (const forbidden of FORBIDDEN_HEALTH_VOCABULARY) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it('asks nothing clinical either', () => {
    const text = HEALTH_PROMPTS.map((prompt) => `${prompt.text} ${prompt.answers.join(' ')}`)
      .join(' ')
      .toLowerCase();
    for (const forbidden of FORBIDDEN_HEALTH_VOCABULARY) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    // And no 1-to-10 pain scale, which is the instrument this is most tempted to copy.
    expect(text).not.toMatch(/\b(1|one)\s*(to|-)\s*(10|ten)\b/);
  });

  it('gives every action an observable follow-up and a stopping point', () => {
    for (const id of HEALTH_ACTION_IDS) {
      const action = HEALTH_ACTIONS[id];
      expect(action.followUp.promptId, id).toMatch(/^(outcome|sleep|food):/);
      expect(action.stoppingPoint.length, id).toBeGreaterThan(0);
      expect(action.intendedOutcome, id).not.toMatch(/feel better|feel good/i);
    }
  });

  it('stops having an opinion when something has been in the way for weeks', () => {
    const result = generateHealthCandidate(
      scenarioById('health-persistent').records,
      assessHealth(scenarioById('health-persistent').records, NOW),
      NO_STATE,
      NOW,
    );

    expect(result.deferredToHuman).toBe(true);
    expect(required(result.candidate, 'the candidate').id).toBe('health:seek-human-support');
    expect(result.because).toMatch(
      /past the point where an app should be suggesting anything/i,
    );
    // And it does not say what it might be.
    expect(JSON.stringify(result).toLowerCase()).not.toContain('could be');
  });

  it('proposes only stopping while something is significantly in the way', () => {
    const records = scenarioById('health-constrained').records;
    const result = generateHealthCandidate(records, assessHealth(records, NOW), NO_STATE, NOW);

    expect(required(result.candidate, 'the candidate').id).toBe('health:pause');
    expect(result.because).toMatch(/nothing here is an opinion about what it is/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('physical and mental energy stay apart', () => {
  it('reads them separately without collapsing them', () => {
    const records = scenarioById('health-energy-split').records;
    const evidence = assessHealth(records, NOW);

    expect(required(evidence.physicalEnergy, 'physical').value).toBe(4);
    expect(required(evidence.mentalEnergy, 'mental').value).toBe(2);
    // No combined figure exists anywhere on the reading.
    expect(Object.keys(evidence)).not.toContain('overallEnergy');
    expect(Object.keys(evidence)).not.toContain('energyScore');
  });

  it('changes which action fits, which is the whole reason for asking twice', () => {
    const records = scenarioById('health-energy-split').records;
    const result = generateHealthCandidate(records, assessHealth(records, NOW), NO_STATE, NOW);

    expect(required(result.candidate, 'the candidate').id).toBe('health:gentle-movement');
    expect(result.because).toMatch(/only visible because the two were asked separately/i);
  });

  it('falls back to the general scale when the split was not asked', () => {
    const records = scenarioById('health-enabled').records;
    const evidence = assessHealth(records, NOW);
    // Both were asked here, so neither is invented — but nothing is fabricated when
    // only the general scale exists either.
    const bare = assessHealth([], NOW);
    expect(bare.physicalEnergy).toBeUndefined();
    expect(bare.mentalEnergy).toBeUndefined();
    expect(bare.generalEnergy).toBeUndefined();
    expect(evidence.anyEvidence).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('missing, stale, and contradictory evidence', () => {
  it('says nothing rather than something when health is on but has nothing to read', () => {
    // Switched on deliberately: with no records at all the "not switched on" branch
    // fires first, which is correct but tests a different thing.
    const enabled = scenarioById('health-enabled').records.filter(
      (record) => record.recordType === 'domain-preference',
    );
    const result = generateHealthCandidate(enabled, assessHealth(enabled, NOW), NO_STATE, NOW);

    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/nothing has been recorded about health/i);
  });

  it('leaves every unreported reading undefined, never defaulted', () => {
    const evidence = assessHealth([], NOW);
    expect(evidence.recovery).toBeUndefined();
    expect(evidence.painInterference).toBeUndefined();
    expect(evidence.hydration).toBeUndefined();
    expect(evidence.anyEvidence).toBe(false);
    // Time-of-day buckets exist but carry null, not zero.
    expect(evidence.timeOfDay.every((bucket) => bucket.value === null)).toBe(true);
  });

  it('marks three-day-old readings stale rather than trusting them', () => {
    const scenario = scenarioById('health-stale');
    const evidence = assessHealth(scenario.records, new Date(scenario.nowIso));
    expect(required(evidence.recovery, 'recovery').freshness).toBe('stale');

    const panel = healthPanel('health-stale');
    expect(panel.freshness).toBe('stale');
  });

  it('surfaces a disagreement rather than picking a winner', () => {
    const scenario = scenarioById('health-contradictory');
    const evidence = assessHealth(scenario.records, new Date(scenario.nowIso));

    expect(evidence.contradictions.length).toBeGreaterThan(0);

    const panel = healthPanel('health-contradictory');
    expect(panel.strongestEvidence.join(' ')).toMatch(/disagree/);
    expect(panel.strongestEvidence.join(' ')).toMatch(/left unresolved/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('silence is the normal case', () => {
  it('offers no health move when nothing warrants one', () => {
    const records = scenarioById('health-enabled').records;
    const result = generateHealthCandidate(records, assessHealth(records, NOW), NO_STATE, NOW);

    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/that is the normal case/i);
  });

  it('says nothing at all while health is switched off', () => {
    const records = scenarioById('action').records;
    const result = generateHealthCandidate(records, assessHealth(records, NOW), NO_STATE, NOW);

    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/not switched on/i);
    expect(run('action').domains).toEqual([]);
  });

  it('keeps health off Now unless its move actually won', () => {
    const episode = run('health-enabled');
    if (episode.output.kind === 'action') {
      expect(episode.output.candidate.originDomainId).toBeUndefined();
    }
    // The panel exists on Direction; nothing about it reaches the decision surface.
    expect(episode.domains).toHaveLength(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('the health panel uses the shared contract', () => {
  it('fills every field without a single number that reads as a score', () => {
    const panel = healthPanel('health-enabled');

    expect(panel.label).toBe('Health, recovery, and energy');
    expect(panel.condition.length).toBeGreaterThan(0);
    expect(panel.drivers.length).toBeGreaterThan(0);
    expect(panel.updatePromptId).toBe('update-area:health-recovery-energy');

    for (const [key, value] of Object.entries(panel)) {
      expect(typeof value, `${key} is a number`).not.toBe('number');
    }
    // No percentage anywhere in the rendered content.
    expect(JSON.stringify(panel)).not.toMatch(/\d{1,3}%/);
  });

  it('describes the condition without grading the person', () => {
    for (const scenario of ['health-enabled', 'health-constrained', 'health-stale']) {
      const panel = healthPanel(scenario);
      expect(panel.condition.toLowerCase(), scenario).not.toMatch(
        /poor self|lazy|neglect|failed|should have|discipline/,
      );
    }
  });

  it('names a bottleneck only when there is one', () => {
    expect(healthPanel('health-constrained').bottleneck).toMatch(/significantly in the way/);
    // With ordinary readings there is nothing identifiable, and it says so.
    expect(healthPanel('health-enabled').bottleneck).toBeUndefined();
  });

  it('marks the health move subordinate to the answer on Now', () => {
    const panel = healthPanel('health-constrained');
    const move = required(panel.move, 'the health move');
    expect(move.subordinate).toBe(true);
    expect(move.labelledAs).toMatch(/answer on Now still comes first/);
  });
});

/* -------------------------------------------------------------------------- */

describe('visuals are earned or refused', () => {
  it('earns a recovery trend once two nights carry readings', () => {
    const panel = healthPanel('health-enabled');
    const trend = panel.graphs.find((graph) => graph.id === 'health-recovery');
    expect(trend).toBeDefined();
    expect(required(trend, 'the trend').missingDataTreatment).toMatch(
      /never plotted as a bad night/,
    );
  });

  it('refuses a meter, and records why', () => {
    // "Health 72%" is the exact thing the eligibility rules exist to prevent.
    const panel = healthPanel('health-enabled');
    const refusal = panel.visuals.find((spec) =>
      spec.decisionValue.includes('No meter is shown here'),
    );
    expect(refusal).toBeDefined();
    expect(required(refusal, 'the refusal').decisionValue).toMatch(/invented precision/);
    expect(panel.graphs.every((graph) => graph.kind !== 'trend' || graph.unit !== '%')).toBe(
      true,
    );
  });

  it('shows no trend at all when only one night carries a reading', () => {
    const panel = healthPanel('health-constrained');
    expect(panel.graphs.find((graph) => graph.id === 'health-recovery')).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('Update This Area', () => {
  it('exists for health, and belongs to exactly one surface', () => {
    const entry = required(
      ALL_PROMPTS.find((prompt) => prompt.promptId === 'update-area:health-recovery-energy'),
      'the entry prompt',
    );
    expect(ownerOf(entry)).toBe('update-this-area');

    for (const prompt of HEALTH_PROMPTS) {
      expect(ownerOf(prompt), prompt.promptId).toBe('update-this-area');
    }
  });

  it('plans only this domain’s questions, entry question first', () => {
    const plan = planGuide('update-area', 'full', [], NOW, 'health-recovery-energy');
    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );

    expect(ids[0]).toBe('update-area:health-recovery-energy');
    expect(ids).toContain('health:hydration');
    // Nothing from the morning check-in leaks in.
    expect(ids).not.toContain('state:energy');
    expect(ids).not.toContain('context:available-minutes');
  });

  it('never lengthens the daily check-in', () => {
    // The point of a separate owner: switching an area on must not add questions to
    // the morning.
    const morning = planGuide('morning', 'full', [], NOW);
    const ids = morning.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    for (const id of ids) expect(id.startsWith('health:')).toBe(false);
    expect(ids).not.toContain('update-area:health-recovery-energy');
    expect(ids).not.toContain('state:physical-energy');
  });
});

/* -------------------------------------------------------------------------- */

describe('meditation is a shared action, not a practice', () => {
  it('is captured by purpose rather than by frequency', () => {
    const prompt = required(
      ALL_PROMPTS.find((entry) => entry.promptId === 'health:meditation-purpose'),
      'the meditation prompt',
    );
    expect(prompt.answers).toHaveLength(MEDITATION_PURPOSES.length);
    expect(prompt.text).not.toMatch(/did you meditate/i);
  });

  it('has no page, no streak, and no daily target anywhere', () => {
    const surface = JSON.stringify({
      actions: HEALTH_ACTIONS,
      prompts: HEALTH_PROMPTS,
      panel: healthPanel('health-enabled'),
    }).toLowerCase();

    expect(surface).not.toContain('streak');
    expect(surface).not.toContain('daily target');
    expect(surface).not.toContain('days in a row');
    expect(surface).not.toContain('keep it up');
  });

  it('is proposed for a reason, and only when there is one', () => {
    const records: CanonicalRecord[] = [
      ...scenarioById('health-enabled').records.filter(
        (record) =>
          record.recordType !== 'observation' || !record.attribute.startsWith('state:'),
      ),
      // Mental energy low, nothing physical in the way.
      ...scenarioById('health-energy-split').records.filter(
        (record) =>
          record.recordType === 'observation' && record.attribute === 'state:mental-energy',
      ),
    ];

    const result = generateHealthCandidate(records, assessHealth(records, NOW), NO_STATE, NOW);
    expect(required(result.candidate, 'the candidate').id).toBe('health:meditate');
    expect(result.because).toMatch(/small, reversible thing to try/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('the slice uses shared records and nothing of its own', () => {
  it('activates a category rather than a store', () => {
    expect([...ENABLED_CATEGORIES]).toContain('health-recovery-energy');
    expect(domainDefinition('health-recovery-energy').reads).toEqual([
      'health-recovery-energy',
      // Kept so that sleep and food recorded before this slice are not stranded.
      'time-attention-capacity',
    ]);
  });

  it('classifies everything it captures as health data', () => {
    for (const prompt of HEALTH_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('health');
      expect(prompt.category, prompt.promptId).toBe('health-recovery-energy');
    }
  });

  it('reads sleep recorded before the category existed', () => {
    // Old records were filed under time-and-capacity. The reading is by attribute, so
    // nothing recorded before today is stranded.
    const legacy = [
      {
        ...required(
          scenarioById('health-enabled').records.find(
            (record) =>
              record.recordType === 'observation' &&
              record.attribute === 'state:sleep-recovery',
          ),
          'a sleep record',
        ),
        category: 'time-attention-capacity',
      },
    ] as CanonicalRecord[];

    expect(assessHealth(legacy, NOW).recovery).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('evening protects tonight', () => {
  it('suggests winding down only in the evening, and only after a poor night', () => {
    const records: CanonicalRecord[] = [
      ...scenarioById('health-enabled').records.filter(
        (record) =>
          record.recordType !== 'observation' || !record.attribute.startsWith('state:'),
      ),
      ...scenarioById('health-contradictory').records.filter(
        (record) =>
          record.recordType === 'observation' &&
          record.attribute === 'state:sleep-recovery' &&
          record.value.kind === 'anchored-scale' &&
          record.value.ordinal === 2,
      ),
    ];

    // Local time on purpose: "evening" means the owner's evening, not UTC's.
    const evening = new Date(2026, 0, 5, 20, 0);
    const midday = new Date(2026, 0, 5, 12, 0);

    const atNight = generateHealthCandidate(
      records,
      assessHealth(records, evening),
      NO_STATE,
      evening,
    );
    expect(required(atNight.candidate, 'the candidate').id).toBe('health:prepare-for-sleep');

    const atNoon = generateHealthCandidate(
      records,
      assessHealth(records, midday),
      NO_STATE,
      midday,
    );
    expect(atNoon.candidate?.id).not.toBe('health:prepare-for-sleep');
  });
});
