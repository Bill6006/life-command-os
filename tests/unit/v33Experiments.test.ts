import { describe, expect, it } from 'vitest';
import {
  EXPERIMENT_BUDGET,
  mayExperiment,
  mayRetest,
  modeFor,
} from '../../src/command-core/arbitration/experiments';
import { UNKNOWN_FACTS, type ArbitrationFacts } from '../../src/command-core/arbitration/facts';
import {
  RETIRE_AT,
  SUSTAINABILITY_AT,
  WEAKEN_AT,
  effectiveButUnsustainable,
  lifecycleOf,
  sustainabilityLevel,
  sustainabilityOf,
} from '../../src/intelligence/learning/lifecycle';
import type { ContextualEvidence } from '../../src/intelligence/learning/contextualEvidence';
import type { CandidateAction } from '../../src/intelligence/types';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * Lifecycle, sustainability and the experiment gate (`V33-065`, `V33-066`, sections G5,
 * G6 and H).
 *
 * The through-line: every one of these is a rule about what the engine may *not* conclude.
 * A single bad evening must not delete an option, a single rejection must not brand a move
 * unsustainable, and no amount of curiosity may buy its way past a safety condition.
 */

function evidence(over: Partial<ContextualEvidence> = {}): ContextualEvidence {
  return {
    patternId: 'pause:screen-break',
    facet: { kind: 'time-of-day', value: 'morning' },
    observed: 0,
    favourable: 0,
    unfavourable: 0,
    strength: 'insufficient',
    statement: 'Evidence is still limited',
    ...over,
  };
}

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

function facts(over: Partial<ArbitrationFacts> = {}): ArbitrationFacts {
  return { ...UNKNOWN_FACTS, expectedUpside: 'small', confidence: 'low', ...over };
}

const OPEN = {
  unresolvedExperiments: 0,
  supportedAlternativeExists: false,
  minutesAvailable: 60,
};

/* -------------------------------------------------------------------------- */

describe('G6. lifecycle moves on evidence, and slowly', () => {
  it('starts every unobserved move as experimental, whatever the catalogue claims', () => {
    const verdict = lifecycleOf('pause:screen-break', []);
    expect(verdict.current).toBe('experimental');
    expect(verdict.reason).toBe('never-observed');
  });

  it('does not retire a move on one poor result (AT33-035)', () => {
    const verdict = lifecycleOf('pause:screen-break', [
      evidence({ observed: 1, unfavourable: 1, strength: 'insufficient' }),
    ]);
    expect(verdict.current).not.toBe('retired');
    expect(verdict.current).toBe('experimental');
  });

  it('does not make a move supported on one good result', () => {
    const verdict = lifecycleOf('pause:screen-break', [
      evidence({ observed: 1, favourable: 1, strength: 'insufficient' }),
    ]);
    expect(verdict.current).toBe('experimental');
  });

  it('weakens only after a run of disagreement', () => {
    const verdict = lifecycleOf('pause:screen-break', [
      evidence({ observed: WEAKEN_AT, unfavourable: WEAKEN_AT, strength: 'emerging' }),
    ]);
    expect(verdict.current).toBe('weakened');
    expect(verdict.because).toMatch(/more often been followed by no change/i);
  });

  it('withdraws only when a long run has nothing at all in its favour', () => {
    const withOneGood = lifecycleOf('pause:screen-break', [
      evidence({ observed: RETIRE_AT + 1, favourable: 1, unfavourable: RETIRE_AT }),
    ]);
    expect(withOneGood.current).not.toBe('retired');

    const withNone = lifecycleOf('pause:screen-break', [
      evidence({ observed: RETIRE_AT, unfavourable: RETIRE_AT, strength: 'consistent' }),
    ]);
    expect(withNone.current).toBe('retired');
  });

  it('prefers context-specific to an average when contexts disagree (AT33-030)', () => {
    const verdict = lifecycleOf('pause:screen-break', [
      evidence({
        facet: { kind: 'time-of-day', value: 'morning' },
        observed: 4,
        favourable: 4,
        strength: 'consistent',
      }),
      evidence({
        facet: { kind: 'time-of-day', value: 'night' },
        observed: 3,
        unfavourable: 3,
        strength: 'emerging',
      }),
    ]);

    expect(verdict.current).toBe('context-specific');
    expect(verdict.heldIn).toContain('time-of-day: morning');
  });

  it('never edits the catalogue, only reports beside it', () => {
    const verdict = lifecycleOf('pause:screen-break', [
      evidence({ observed: RETIRE_AT, unfavourable: RETIRE_AT }),
    ]);
    /* The authored value survives the derived one, so history stays readable. */
    expect(verdict.authored).toBeDefined();
    expect(verdict.current).not.toBe(verdict.authored);
  });
});

/* -------------------------------------------------------------------------- */

describe('G5. sustainability is separate from whether it works', () => {
  let seq = 0;
  const id = () => {
    seq += 1;
    return `00000000-0000-4000-d000-${String(seq).padStart(12, '0')}`;
  };

  /** `offered` attempts of one move, of which `walkedAway` were declined. */
  function attempts(patternId: string, offered: number, walkedAway: number): CanonicalRecord[] {
    const out: CanonicalRecord[] = [];
    for (let index = 0; index < offered; index += 1) {
      const episodeId = id();
      const at = new Date(Date.parse('2026-06-01T09:00:00.000Z') + index * 86_400_000);
      const base = {
        schemaVersion: 1,
        occurredAt: at.toISOString(),
        recordedAt: at.toISOString(),
        localTime: { localIso: at.toISOString(), timeZone: 'UTC', utcOffsetMinutes: 0 },
        decisionEpisodeId: episodeId,
        source: 'user-entry',
      };
      out.push(
        {
          ...base,
          recordId: id(),
          recordType: 'candidate-action',
          provenance: { method: 'derived', derivedFromRecordIds: [] },
          statement: 'x',
          category: 'time-attention-capacity',
          engineCandidateId: patternId,
          intendedOutcome: 'y',
          observableFollowUp: { promptId: 'outcome:completed', windowHours: 24 },
          capabilityEffects: [],
          timing: {},
          durationMinutes: 10,
          friction: 'low',
          minimumViableVersion: 'a',
          fallback: 'b',
          stoppingPoint: 'c',
          risk: 'none-identified',
          reversibility: 'reversible',
          blockedByProtectedContexts: [],
        } as unknown as CanonicalRecord,
        {
          ...base,
          recordId: id(),
          recordType: 'execution',
          provenance: { method: 'direct-report' },
          recommendationRecordId: id(),
          ...(index < walkedAway
            ? { state: 'not-executed', declineReason: 'Not now' }
            : {
                state: 'executed',
                executedWindow: {
                  start: at.toISOString(),
                  end: new Date(at.getTime() + 600_000).toISOString(),
                },
              }),
        } as unknown as CanonicalRecord,
      );
    }
    return out;
  }

  it('says nothing from one rejection (AT33-034)', () => {
    const verdicts = sustainabilityOf(attempts('move-body:longer-walk', 1, 1));
    expect(required(verdicts[0], 'a verdict').verdict).toBe('unknown');
    expect(sustainabilityLevel(verdicts, 'move-body:longer-walk')).toBe('unknown');
  });

  it('needs a pattern of behaviour before it will judge repeatability', () => {
    const verdicts = sustainabilityOf(
      attempts('move-body:longer-walk', SUSTAINABILITY_AT, SUSTAINABILITY_AT),
    );
    expect(required(verdicts[0], 'a verdict').verdict).toBe('unsustainable');
    expect(sustainabilityLevel(verdicts, 'move-body:longer-walk')).toBe('low');
  });

  it('calls a move sustainable when it is actually carried through', () => {
    const verdicts = sustainabilityOf(attempts('hydrate-eat:water', 4, 0));
    expect(required(verdicts[0], 'a verdict').verdict).toBe('sustainable');
    expect(sustainabilityLevel(verdicts, 'hydrate-eat:water')).toBe('high');
  });

  it('keeps "it works" and "he will keep doing it" as two answers', () => {
    /* The case G5 exists for, and the one an averaged score destroys. */
    const lifecycle = [
      lifecycleOf('move-body:longer-walk', [
        evidence({
          patternId: 'move-body:longer-walk',
          observed: 4,
          favourable: 4,
          strength: 'consistent',
        }),
      ]),
    ];
    const sustainability = sustainabilityOf(attempts('move-body:longer-walk', 5, 4));

    expect(required(lifecycle[0], 'a verdict').current).toBe('supported');
    expect(required(sustainability[0], 'a verdict').verdict).toBe('unsustainable');
    expect(effectiveButUnsustainable(lifecycle, sustainability)).toContain(
      'move-body:longer-walk',
    );
  });

  it('reports unknown for a move nobody has offered', () => {
    expect(sustainabilityLevel([], 'pause:screen-break')).toBe('unknown');
  });
});

/* -------------------------------------------------------------------------- */

describe('H. the experiment gate is conjunctive and safety-first', () => {
  it('offers a harmless untested move as a bounded experiment with a stop condition', () => {
    const verdict = mayExperiment(candidate(), facts(), OPEN);
    expect(verdict.eligible).toBe(true);
    expect(verdict.stopCondition).toBe('Stop after ten minutes');
  });

  it('refuses anything with a material downside, however useful (AT33-051)', () => {
    const risky = mayExperiment(candidate({ risk: 'moderate' }), facts(), OPEN);
    expect(risky.eligible).toBe(false);
    expect(risky.refusal).toBe('material-downside');

    /* And a large information value does not buy past it. */
    const stillRefused = mayExperiment(
      candidate({ risk: 'high' }),
      facts({ expectedUpside: 'meaningful' }),
      OPEN,
    );
    expect(stillRefused.refusal).toBe('material-downside');
  });

  it('refuses to experiment on sleep, caregiving or family', () => {
    for (const context of ['sleep', 'caregiving', 'family'] as const) {
      const verdict = mayExperiment(
        candidate({ blockedByProtectedContexts: [context] }),
        facts(),
        OPEN,
      );
      expect(verdict.refusal, context).toBe('material-downside');
    }
  });

  it('refuses anything that could not be undone', () => {
    const verdict = mayExperiment(
      candidate({ reversibility: 'partially-reversible' }),
      facts(),
      OPEN,
    );
    expect(verdict.refusal).toBe('not-reversible');
  });

  it('refuses when a supported option is already available', () => {
    const verdict = mayExperiment(candidate(), facts(), {
      ...OPEN,
      supportedAlternativeExists: true,
    });
    expect(verdict.refusal).toBe('a-supported-option-exists');
  });

  it('runs one experiment at a time (AT33-040)', () => {
    const verdict = mayExperiment(candidate(), facts(), {
      ...OPEN,
      unresolvedExperiments: EXPERIMENT_BUDGET,
    });
    expect(verdict.eligible).toBe(false);
    expect(verdict.refusal).toBe('budget-spent');
  });

  it('refuses when there is nothing to find out', () => {
    const verdict = mayExperiment(candidate(), facts({ expectedUpside: 'none' }), OPEN);
    expect(verdict.refusal).toBe('nothing-to-learn');
  });

  it('checks safety before information value, not the other way round', () => {
    /*
     * The ordering is the guarantee. A candidate that fails several conditions must report
     * the most protective one, because that is the one that would still hold if the others
     * were fixed.
     */
    const verdict = mayExperiment(
      candidate({ risk: 'high', reversibility: 'irreversible' }),
      facts({ expectedUpside: 'none' }),
      { ...OPEN, unresolvedExperiments: 5, supportedAlternativeExists: true },
    );
    expect(verdict.refusal).toBe('material-downside');
  });
});

/* -------------------------------------------------------------------------- */

describe('H3. a poor result is not a permanent ban', () => {
  it('allows a move nothing has gone wrong with', () => {
    expect(mayRetest(0, []).allowed).toBe(true);
  });

  it('refuses a repeat when nothing has changed', () => {
    const verdict = mayRetest(2, []);
    expect(verdict.allowed).toBe(false);
    expect(verdict.because).toMatch(/nothing has changed/i);
  });

  it('allows a retest only with a named material change (AT33-041)', () => {
    const verdict = mayRetest(2, ['you now finish work an hour earlier']);
    expect(verdict.allowed).toBe(true);
    expect(verdict.changed).toEqual(['you now finish work an hour earlier']);
    expect(verdict.because).toMatch(/did not help before/i);
  });
});

/* -------------------------------------------------------------------------- */

describe('H1. the mode is always named', () => {
  it('calls an untested move an experiment rather than a recommendation', () => {
    expect(modeFor(facts({ confidence: 'low' }), false)).toBe('experiment');
  });

  it('calls a move with evidence behind it supported', () => {
    expect(modeFor(facts({ confidence: 'moderate' }), false)).toBe('supported');
  });

  it('never silently presents a trial as a finding', () => {
    expect(modeFor(facts({ confidence: 'high' }), true)).toBe('experiment');
  });
});
