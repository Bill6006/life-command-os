import { describe, expect, it } from 'vitest';
import { SCENARIOS, scenarioById } from '../../src/app/scenarios';
import { runEpisode } from '../../src/intelligence';

/**
 * Phase 5 gate evidence — the learning loop.
 *
 * The rules under test are the ones that decide whether this product tells the
 * truth about itself: that declining is not failure, that absence is not evidence,
 * that a coincidence is not a cause, and that confidence has to be earned.
 */

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

describe('forecast accuracy and effectiveness stay separate (LEARN-001)', () => {
  it('are computed independently and never combined', () => {
    const episode = run('forecast-accuracy');

    expect(episode.learning.forecastEvaluations.length).toBeGreaterThan(0);
    expect(episode.learning.effectiveness.length).toBeGreaterThan(0);

    // No field anywhere merges them into one figure.
    const serialised = JSON.stringify(episode.learning);
    expect(serialised).not.toMatch(/overallAccuracy|combinedScore|successRate/i);
  });

  it('a wrong forecast does not condemn the recommendation, and vice versa', () => {
    const episode = run('forecast-accuracy');

    const forecastVerdicts = episode.learning.forecastEvaluations.map((e) => e.verdict);
    const effectVerdicts = episode.learning.effectiveness.map((e) => e.verdict);

    // They are drawn from the same vocabulary but produced by different evidence.
    expect(forecastVerdicts.length).toBeGreaterThan(0);
    expect(effectVerdicts.length).toBeGreaterThan(0);
    expect(episode.learning.forecastEvaluations[0]).not.toHaveProperty('confounding');
    expect(episode.learning.effectiveness[0]).toHaveProperty('confounding');
  });

  it('an abstained forecast is unresolved rather than wrong', () => {
    const episode = run('sparse-evidence');
    for (const evaluation of episode.learning.forecastEvaluations) {
      expect(evaluation.verdict).toBe('unresolved');
    }
  });
});

describe('non-execution is never judged (LEARN-002)', () => {
  it('a declined recommendation is unresolved, not ineffective', () => {
    const episode = run('declined');

    const evaluation = episode.learning.effectiveness[0];
    expect(evaluation?.executionState).toBe('not-executed');
    expect(evaluation?.verdict).toBe('unresolved');
    expect(evaluation?.why).toMatch(/not evidence about the recommendation/i);
  });

  it('declining contributes nothing to any belief', () => {
    const episode = run('declined');
    expect(episode.learning.beliefs).toEqual([]);
  });

  it('the follow-through graph says plainly that declining is not a failure', () => {
    const episode = run('declined');
    const graph = episode.learning.graphs.find((g) => g.id === 'follow-through');

    expect(graph?.uncertainty).toMatch(/not a failure/i);
    const declined =
      graph?.kind === 'comparison'
        ? graph.bars.find((bar) => bar.label === 'Declined')
        : undefined;
    expect(declined?.tone).toBe('neutral');
  });
});

describe('missing outcomes remain unresolved', () => {
  it('a closed window with no outcome is unresolved, not contradicted', () => {
    const episode = run('missing-outcome');

    const evaluation = episode.learning.effectiveness[0];
    expect(evaluation?.executionState).toBe('executed');
    expect(evaluation?.verdict).toBe('unresolved');
    expect(evaluation?.why).toMatch(/unresolved rather than being counted against/i);
  });

  it('unresolved episodes are shown in the graphs, not dropped', () => {
    const episode = run('missing-outcome');
    const graph = episode.learning.graphs.find((g) => g.id === 'actions-and-outcomes');

    const unresolved =
      graph?.kind === 'comparison'
        ? graph.bars.find((bar) => bar.tone === 'unresolved')
        : undefined;
    expect(unresolved?.value).toBeGreaterThan(0);
  });
});

describe('a positive outcome does not prove causation', () => {
  it('a confounded episode cannot be called supported', () => {
    const episode = run('misleading-correlation');

    const resolved = episode.learning.effectiveness.filter((e) => e.verdict !== 'unresolved');
    expect(resolved.length).toBeGreaterThan(0);

    for (const evaluation of resolved) {
      if (evaluation.confounding.risk === 'high') {
        expect(evaluation.verdict).not.toBe('supported');
        expect(evaluation.why).toMatch(/too much else was going on/i);
      }
    }
  });

  it('confounded evidence cannot build a strong belief', () => {
    const episode = run('misleading-correlation');
    for (const belief of episode.learning.beliefs) {
      expect(belief.confidence.label).not.toBe('strong-personal-evidence');
    }
  });

  it('partial execution counts as a confounder rather than being ignored', () => {
    const episode = run('partial-execution');
    const evaluation = episode.learning.effectiveness[0];

    expect(evaluation?.confounding.factors.join(' ')).toMatch(/only partly carried out/i);
    expect(evaluation?.confounding.risk).not.toBe('low');
  });

  it('states association rather than causation below the top label', () => {
    const episode = run('partial-execution');
    const belief = episode.learning.beliefs[0];
    if (belief !== undefined && belief.confidence.label !== 'strong-personal-evidence') {
      expect(belief.statement).toMatch(/associated with/i);
      expect(belief.statement).not.toMatch(/\bcauses\b|\bmakes you\b/i);
    }
  });
});

describe('the confidence ceiling lifts, but only on prospective evidence (LEARN-003)', () => {
  it('four clean prospective episodes reach strong personal evidence', () => {
    const episode = run('learning-loop');
    const belief = episode.learning.beliefs[0];

    expect(belief).toBeDefined();
    expect(belief?.prospectivelyValidated).toBe(true);
    expect(belief?.contradicting).toEqual([]);
    expect(belief?.confidence.label).toBe('strong-personal-evidence');
    expect(belief?.statement).toMatch(/reliably/i);
  });

  it('two episodes are not enough', () => {
    const episode = run('partial-execution');
    const belief = episode.learning.beliefs[0];
    if (belief !== undefined) {
      expect(belief.confidence.label).not.toBe('strong-personal-evidence');
    }
  });

  it('state, forecast, and decision confidence can never reach it', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      for (const assessment of [
        episode.state.confidence,
        episode.trajectory.confidence,
        episode.forecast.confidence,
        episode.output.confidence,
      ]) {
        expect(assessment.label, scenario.id).not.toBe('strong-personal-evidence');
      }
    }
  });
});

describe('beliefs update conservatively and keep their reasons', () => {
  it('every belief cites the evidence behind it and explains each change', () => {
    const episode = run('learning-loop');
    const belief = episode.learning.beliefs[0];

    expect(belief?.supporting.length).toBeGreaterThan(0);
    expect(belief?.history.length).toBeGreaterThan(0);
    for (const entry of belief?.history ?? []) {
      expect(entry.because.length).toBeGreaterThan(0);
    }
  });

  it('a context change suspends a belief rather than deleting it', () => {
    const episode = run('context-change-learning');
    const belief = episode.learning.beliefs[0];

    expect(belief?.status).toBe('suspended');
    expect(belief?.suspendedBy).toBeTruthy();
    // Still present, with its evidence intact.
    expect(belief?.supporting.length).toBeGreaterThan(0);
    expect(belief?.history.some((entry) => entry.change === 'suspended')).toBe(true);
    expect(belief?.history.find((entry) => entry.change === 'suspended')?.because).toMatch(
      /no longer comparable/i,
    );
  });
});

describe('weekly-direction continuity', () => {
  it('compares last week and carries forward without scoring it', () => {
    const episode = run('weekly-continuity');
    const continuity = episode.learning.continuity;

    expect(continuity.decision).toBe('carry-forward');
    expect(continuity.previousProposal).toBeTruthy();
    expect(continuity.whyItChanged.length).toBeGreaterThan(0);

    // No moral vocabulary anywhere.
    const serialised = JSON.stringify(continuity).toLowerCase();
    expect(serialised).not.toMatch(/failed|missed|slipped|behind|streak|compliance/);
  });

  it('reports no previous week honestly rather than inventing one', () => {
    const episode = run('action');
    expect(episode.learning.continuity.decision).toBe('first-week');
  });
});

describe('graceful return after absence', () => {
  it('reports the gap without a backlog or any guilt language', () => {
    const episode = run('return-after-absence');
    const absence = episode.learning.absence;

    expect(absence.returning).toBe(true);
    expect(absence.awayDays).toBeGreaterThanOrEqual(7);
    expect(absence.summary).toMatch(/not a problem to fix/i);

    const serialised = JSON.stringify(absence).toLowerCase();
    expect(serialised).not.toMatch(/missed|failed|behind|catch up|streak|overdue/);
  });

  it('expires stale predictions rather than judging them', () => {
    const episode = run('return-after-absence');
    expect(episode.learning.absence.expiredPredictions.length).toBeGreaterThan(0);
  });

  it('summarises open loops and asks at most one question', () => {
    const episode = run('return-after-absence');

    expect(episode.learning.absence.openLoops.length).toBeLessThanOrEqual(3);
    // The surface still emits exactly one output, question or not.
    expect(['action', 'question', 'silence', 'insufficient-evidence']).toContain(
      episode.output.kind,
    );
  });

  it('rebuilds the baseline gradually rather than resuming at full confidence', () => {
    const episode = run('return-after-absence');
    expect(episode.learning.absence.rebuildingNote).toMatch(/confidence stays low/i);
    expect(episode.state.confidence.label).not.toBe('moderate-evidence');
  });
});

describe('every graph answers a named question (UX-003)', () => {
  it('all eight carry their full obligations', () => {
    const episode = run('learning-loop');
    expect(episode.learning.graphs.length).toBeGreaterThanOrEqual(8);

    for (const graph of episode.learning.graphs) {
      expect(graph.question.length, graph.id).toBeGreaterThan(0);
      expect(graph.metric.length, graph.id).toBeGreaterThan(0);
      expect(graph.window.length, graph.id).toBeGreaterThan(0);
      expect(graph.missingDataTreatment.length, graph.id).toBeGreaterThan(0);
      expect(graph.uncertainty.length, graph.id).toBeGreaterThan(0);
      expect(graph.textSummary.length, graph.id).toBeGreaterThan(0);
      expect(['observed', 'inferred', 'mixed'], graph.id).toContain(graph.evidence);
    }
  });

  it('covers every view the phase requires', () => {
    const ids = run('learning-loop').learning.graphs.map((graph) => graph.id);
    for (const required of [
      'focused-hours',
      'capacity',
      'forecast-accuracy',
      'follow-through',
      'actions-and-outcomes',
      'expected-vs-actual',
      'north-star',
      'confidence',
    ]) {
      expect(ids, `missing graph: ${required}`).toContain(required);
    }
  });

  it('never plots a missing period as zero', () => {
    const episode = run('learning-loop');
    for (const graph of episode.learning.graphs) {
      if (graph.kind !== 'trend') continue;
      expect(graph.missingDataTreatment, graph.id).toMatch(
        /gap|never counted as zero|not read as/i,
      );
    }
  });
});

describe('the whole loop runs on every scenario', () => {
  it('produces learning output without throwing, deterministically', () => {
    for (const scenario of SCENARIOS) {
      const first = runEpisode(scenario.records, new Date(scenario.nowIso));
      const second = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(JSON.stringify(second), scenario.id).toEqual(JSON.stringify(first));
      expect(first.learning.graphs.length, scenario.id).toBeGreaterThan(0);
    }
  });
});
