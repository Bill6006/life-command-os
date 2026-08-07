import { describe, expect, it } from 'vitest';
import { SCENARIOS, scenarioById } from '../../src/app/scenarios';
import { ENABLED_CATEGORIES, parseCanonicalRecord } from '../../src/domain/records';
import { runEpisode, INTELLIGENCE_CONTRACTS } from '../../src/intelligence';

/**
 * The deterministic scenario harness (Prompt 5 task 18).
 *
 * Every scenario is a set of canonical records. The engine computes everything
 * else, so these assert the engine's behaviour rather than a hand-written script —
 * which is exactly the difference between this and the Phase 3 prototype.
 */

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

describe('scenario records are valid canonical records', () => {
  it('every record in every scenario parses', () => {
    for (const scenario of SCENARIOS) {
      for (const record of scenario.records) {
        const result = parseCanonicalRecord(record);
        expect(result.ok, `${scenario.id}: ${result.ok ? '' : result.issues.join('; ')}`).toBe(
          true,
        );
      }
    }
  });

  it('covers every scenario the phase requires', () => {
    const ids = SCENARIOS.map((scenario) => scenario.id);
    for (const required of [
      'cold-start',
      'weekly-direction',
      'quiet-week',
      'material-change',
      'stable-state',
      'sparse-evidence',
      'stale-evidence',
      'contradictory-evidence',
      'overload',
      'protected-time',
      'competing-commitments',
      'mixed-effects',
      'one-question',
      'silence',
      'changed-context',
    ]) {
      expect(ids, `missing scenario: ${required}`).toContain(required);
    }
  });
});

describe('determinism', () => {
  it('produces identical results for identical inputs', () => {
    for (const scenario of SCENARIOS) {
      const first = runEpisode(scenario.records, new Date(scenario.nowIso));
      const second = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(JSON.stringify(second), scenario.id).toEqual(JSON.stringify(first));
    }
  } /*
   * Two full episodes for every scenario in the corpus, which is over a hundred runs of
   * the whole engine. The default five seconds is not a statement about determinism and
   * this test failing on it says nothing — it timed out once under load and the
   * assertion itself has never disagreed.
   */, 30_000);
});

describe('exactly one output, always', () => {
  it('every scenario emits one of four kinds and nothing else', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(['action', 'question', 'silence', 'insufficient-evidence'], scenario.id).toContain(
        episode.output.kind,
      );
    }
  });

  it('never exposes rejected candidates outside the internal audit trail', () => {
    const episode = run('competing-commitments');

    // Candidates were genuinely compared...
    expect(episode.internal.candidates.length).toBeGreaterThan(1);
    expect(episode.internal.rejected.length).toBeGreaterThan(0);

    // ...and the output names exactly one thing, with no list anywhere in it.
    const serialised = JSON.stringify(episode.output);
    expect(serialised).not.toContain('rejected');
    expect(serialised).not.toContain('alternatives');
    if (episode.output.kind === 'action') {
      const others = episode.internal.candidates.filter(
        (candidate) => candidate.id !== episode.output.kind,
      );
      expect(others.length).toBeGreaterThan(0);
    }
  });
});

describe('cold start', () => {
  it('abstains honestly and asks nothing', () => {
    const episode = run('cold-start');

    expect(episode.output.kind).toBe('insufficient-evidence');
    if (episode.output.kind === 'insufficient-evidence') {
      expect(episode.output.missing.length).toBeGreaterThan(0);
      expect(episode.output.wouldHelp).toMatch(/one observation/i);
    }
  });

  it('never asks the user to rank domains or declare a priority', () => {
    const episode = run('cold-start');
    const serialised = JSON.stringify(episode).toLowerCase();

    expect(serialised).not.toMatch(/what matters most/);
    expect(serialised).not.toMatch(/rank .*(domain|area)/);
    expect(serialised).not.toMatch(/most important (area|domain)/);
  });

  it('proposes a quiet week rather than inventing a focus', () => {
    const episode = run('cold-start');
    expect(episode.weeklyDirection.kind).toBe('deliberately-quiet');
  });
});

describe('abstention', () => {
  it('refuses to forecast without enough comparable weeks', () => {
    const episode = run('sparse-evidence');

    expect(episode.trajectory.direction).toBe('insufficient-evidence');
    expect(episode.forecast.projection.status).toBe('unknown');
    expect(episode.forecast.assumptions).toEqual([]);
    expect(episode.forecast.confidence.label).toBe('insufficient-evidence');
  });

  it('carries a week with no evidence as a gap, never as zero', () => {
    const episode = run('action');
    const gaps = episode.trajectory.periods.filter((period) => period.value === null);

    expect(gaps.length).toBeGreaterThan(0);
    expect(episode.trajectory.periods.some((period) => period.value === 0)).toBe(false);
  });

  it('marks stale evidence as stale rather than trusting it', () => {
    const episode = run('stale-evidence');
    expect(episode.state.readings[0]?.freshness).toBe('stale');
    expect(episode.state.staleAttributes.length).toBeGreaterThan(0);
  });

  it('surfaces contradictions instead of resolving them', () => {
    const episode = run('contradictory-evidence');

    expect(episode.state.contradictions.length).toBeGreaterThan(0);
    expect(episode.state.confidence.label).not.toBe('moderate-evidence');
    expect(
      episode.state.confidence.dimensions.find((d) => d.dimension === 'consistency')
        ?.assessment,
    ).toBe('undermines');
  });
});

describe('constraint-first selection', () => {
  it('removes protected-context clashes before ranking, not by penalty', () => {
    const episode = run('protected-time');

    expect(episode.output.kind).toBe('silence');
    const removedForContext = episode.internal.rejected.filter(
      (entry) => entry.stage === 'protected-context',
    );
    expect(removedForContext.length).toBeGreaterThan(0);
  });

  it('removes actions whose minimum version does not fit the window', () => {
    const episode = run('silence');
    expect(episode.output.kind).toBe('silence');
    if (episode.output.kind === 'silence') {
      expect(episode.output.rationale.length).toBeGreaterThan(0);
      expect(episode.output.reasonTrace.length).toBeGreaterThan(0);
    }
  });

  it('never pushes for more when capacity is depleted', () => {
    const episode = run('overload');

    if (episode.output.kind === 'action') {
      // The only thing acceptable here is doing less.
      expect(episode.output.candidate.category).toBe('time-attention-capacity');
      expect(episode.output.candidate.durationMinutes).toBeLessThanOrEqual(12);
    } else {
      expect(episode.output.kind).toBe('silence');
    }
  });
});

describe('one high-value question', () => {
  it('asks only when the answer changes which actions are eligible', () => {
    const episode = run('one-question');

    expect(episode.output.kind).toBe('question');
    if (episode.output.kind === 'question') {
      expect(episode.output.couldChange).toContain('Candidate eligibility');
      expect(episode.output.answers.length).toBeGreaterThan(1);
    }
  });

  it('does not ask when the answer would only refine a ranking', () => {
    const episode = run('action');
    expect(episode.output.kind).not.toBe('question');
  });
});

describe('predicted effects stay separate from the untreated forecast', () => {
  it('the forecast carries no action, and effects require one', () => {
    const episode = run('action');

    expect(episode.forecast).not.toHaveProperty('candidateId');
    for (const prediction of episode.internal.effects) {
      expect(prediction.candidateId).toBeTruthy();
    }
  });

  it('shows a benefit and a cost together, never netted', () => {
    const episode = run('mixed-effects');
    expect(episode.output.kind).toBe('action');
    if (episode.output.kind !== 'action') return;

    const directions = episode.output.effects.map((effect) => effect.direction);
    expect(directions).toContain('positive');
    expect(directions).toContain('negative');

    // Cross-domain cost is visible, not folded into the benefit.
    expect(episode.output.effects.some((effect) => effect.crossDomain)).toBe(true);
  });

  it('marks uncertain effects as uncertain rather than dropping them', () => {
    const episode = run('mixed-effects');
    if (episode.output.kind !== 'action') return;
    expect(episode.output.effects.some((effect) => effect.uncertain)).toBe(true);
  });
});

describe('material change', () => {
  it('explains what changed and why the answer moved', () => {
    const episode = run('material-change');

    expect(episode.whatChanged.changes.length).toBeGreaterThan(0);
    expect(episode.whatChanged.why.length).toBeGreaterThan(0);
    expect(
      episode.whatChanged.changes.some((change) => change.altered === 'recommendation'),
    ).toBe(true);
  });

  it('says so plainly when this is the first assessment', () => {
    const episode = run('action');
    expect(episode.whatChanged.why.length).toBeGreaterThan(0);
  });
});

describe('weekly direction', () => {
  it('proposes a direction the user can confirm, adjust, or reject', () => {
    const episode = run('weekly-direction');

    expect(episode.weeklyDirection.kind).toBe('focus');
    expect(episode.weeklyDirection.basedOn.length).toBeGreaterThan(0);
    expect(episode.weeklyDirection.responses).toContain('Confirm');
    expect(episode.weeklyDirection.responses).toContain('Adjust');
  });

  it('proposes a quiet week on its merits when capacity is depleted', () => {
    const episode = run('quiet-week');

    expect(episode.weeklyDirection.kind).toBe('deliberately-quiet');
    expect(episode.weeklyDirection.basedOn.join(' ')).toMatch(/depleted/i);
  });

  it('never requires the user to invent the priority', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(episode.weeklyDirection.proposal.length, scenario.id).toBeGreaterThan(0);
      expect(episode.weeklyDirection.basedOn.length, scenario.id).toBeGreaterThan(0);
    }
  });
});

describe('categories', () => {
  it('summarises every enabled category with the six required elements', () => {
    const episode = run('action');
    // Every enabled category, whichever they currently are — health joined in 8B.
    expect(episode.categories).toHaveLength(ENABLED_CATEGORIES.length);

    for (const category of episode.categories) {
      expect(category.condition.length).toBeGreaterThan(0);
      expect(category.trajectory.length).toBeGreaterThan(0);
      expect(category.confidence.label.length).toBeGreaterThan(0);
      expect(category.freshness.length).toBeGreaterThan(0);
      expect(category.drivers.length).toBeGreaterThan(0);
      expect(category.metrics.length).toBeGreaterThan(0);
      expect(category.wouldChangeIt.length).toBeGreaterThan(0);
    }
  });

  it('emits no numerical category score anywhere', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      const serialised = JSON.stringify(episode.categories);
      expect(serialised, scenario.id).not.toMatch(/"score"/i);
      expect(serialised, scenario.id).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
      expect(serialised, scenario.id).not.toMatch(/out of 100/i);
    }
  });
});

describe('confidence honesty', () => {
  it('never reaches strong personal evidence outside a prospectively validated belief', () => {
    /*
     * Phase 5 lifts the ceiling — but only for beliefs, and only when every
     * supporting episode was predicted before it was observed. State, trajectory,
     * forecast, and decision confidence can still never reach it, because none of
     * them is validated against a later outcome.
     */
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));

      for (const assessment of [
        episode.state.confidence,
        episode.trajectory.confidence,
        episode.forecast.confidence,
        episode.output.confidence,
        episode.weeklyDirection.confidence,
      ]) {
        expect(assessment.label, scenario.id).not.toBe('strong-personal-evidence');
      }

      for (const belief of episode.learning.beliefs) {
        if (belief.confidence.label === 'strong-personal-evidence') {
          expect(belief.prospectivelyValidated, scenario.id).toBe(true);
          expect(belief.contradicting, scenario.id).toEqual([]);
        }
      }
    }
  });

  it('always explains the label from the dimensions actually used', () => {
    const episode = run('action');
    expect(episode.state.confidence.why.length).toBeGreaterThan(0);
    expect(episode.state.confidence.dimensions.length).toBeGreaterThan(0);
  });
});

describe('intelligence contracts', () => {
  it('every consequential rule declares its full contract', () => {
    expect(INTELLIGENCE_CONTRACTS.length).toBeGreaterThanOrEqual(8);

    for (const contract of INTELLIGENCE_CONTRACTS) {
      expect(contract.decisionTarget.length, contract.id).toBeGreaterThan(0);
      expect(contract.target.length, contract.id).toBeGreaterThan(0);
      expect(contract.horizon.length, contract.id).toBeGreaterThan(0);
      expect(contract.baseline.length, contract.id).toBeGreaterThan(0);
      expect(contract.uncertainty.length, contract.id).toBeGreaterThan(0);
      expect(contract.abstainsWhen.length, contract.id).toBeGreaterThan(0);
      expect(contract.failsWhen.length, contract.id).toBeGreaterThan(0);
      expect(contract.safetyBoundary.length, contract.id).toBeGreaterThan(0);
      expect(contract.privacyBoundary.length, contract.id).toBeGreaterThan(0);
      expect(contract.futureValidation.length, contract.id).toBeGreaterThan(0);
      expect(contract.retireWhen.length, contract.id).toBeGreaterThan(0);
    }
  });

  it('labels every rule as an unproven baseline, because none has been validated', () => {
    for (const contract of INTELLIGENCE_CONTRACTS) {
      expect(contract.evidenceClass, contract.id).toBe('unproven-transparent-baseline');
    }
  });
});
