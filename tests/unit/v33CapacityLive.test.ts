import { describe, expect, it } from 'vitest';
import { runEpisode } from '../../src/intelligence';
import { generateCandidates } from '../../src/intelligence/intervention/candidateActions';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { selectQuestion } from '../../src/intelligence/questioning/selectQuestion';
import { HEALTH_ACTIONS } from '../../src/domain/health/actions';
import { SCENARIOS, scenarioById } from '../../src/app/scenarios';
import { assessState } from '../../src/intelligence/state/assessState';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * Contextual capacity, end to end.
 *
 * The previous pass proved `fits()` in isolation. That is not the same claim: a rule
 * nothing calls is a rule the product does not have. These assert the whole path —
 * a move declares a shape, the situation is read from records, the shape gate removes it,
 * and the guide asks the question that would have settled it.
 */

const NOW = new Date('2026-08-07T13:00:00.000Z');

function situation(attribute: string, state: string, minutesAgo = 20): CanonicalRecord {
  const at = new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
  return {
    recordType: 'observation',
    recordId: `sit-${attribute}`,
    schemaVersion: 1,
    occurredAt: at,
    recordedAt: at,
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    category: 'time-attention-capacity',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/* -------------------------------------------------------------------------- */

describe('moves declare what the situation has to allow', () => {
  it('gives shapes only to moves whose eligibility genuinely depends on one', () => {
    /*
     * A glass of water is possible in an open-plan office, on a train, and with a child
     * on your hip. Declaring a constraint for it would rule out the one move that is
     * nearly always available — so it declares none, deliberately.
     */
    expect(HEALTH_ACTIONS.hydrate.capacity).toBeUndefined();
    expect(HEALTH_ACTIONS.pause.capacity).toBeUndefined();

    /* Sitting quietly cannot be done at a desk among other people, at any duration. */
    expect(HEALTH_ACTIONS.meditate.capacity?.shape).toBe('protected-focus');
    expect(HEALTH_ACTIONS['prepare-for-sleep'].capacity?.shape).toBe('protected-focus');
    expect(HEALTH_ACTIONS['gentle-movement'].capacity?.shape).toBe('transition');
  });

  it('marks a focus block as exclusive time that an interruption wastes', () => {
    const records = scenarioById('action').records;
    const state = assessState(records, NOW);
    const focus = generateCandidates(records, state, NOW).find((candidate) =>
      candidate.id.startsWith('focus:'),
    );

    expect(required(focus, 'a focus candidate').capacity).toEqual({
      shape: 'exclusive-time',
      interruptionCost: 'total',
    });
  });

  it('leaves the recovery pause shapeless, so a bad situation cannot remove it', () => {
    /*
     * The move of last resort. If "you cannot step away" could rule out the pause, the
     * app would have nothing to say in exactly the situation that most needs an answer.
     */
    const state = assessState([], NOW);
    const pause = generateCandidates(
      [],
      { ...state, capacity: { status: 'known', value: 'depleted' } },
      NOW,
    ).find((candidate) => candidate.id === 'recover:pause');

    expect(required(pause, 'the recovery pause').capacity).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('the situation is read from records and gates eligibility', () => {
  it('reads four separate observations into the assessment', () => {
    const state = assessState(
      [
        situation('context:setting', 'Work'),
        situation('context:engagement', 'Working'),
        situation('context:interruptibility', 'Not right now'),
        situation('context:privacy', 'No — around other people'),
      ],
      NOW,
    );

    expect(state.situation).toMatchObject({
      setting: 'work',
      engagement: 'working',
      interruptibility: 'none',
      privacy: 'public',
    });
  });

  it('leaves every field unknown when nothing has been said', () => {
    const state = assessState([], NOW);
    expect(state.situation.setting).toBeUndefined();
    expect(state.situation.interruptibility).toBeUndefined();
  });

  it('removes an exclusive-time move when the owner cannot step away (AT33)', () => {
    const base = scenarioById('action').records.filter(
      (record) => !String((record as { attribute?: string }).attribute).startsWith('context:'),
    );

    const free = runEpisode(
      [...base, situation('context:interruptibility', 'Yes, freely')],
      NOW,
    );
    const trapped = runEpisode(
      [...base, situation('context:interruptibility', 'Not right now')],
      NOW,
    );

    const focusWon = (episode: typeof free): boolean =>
      episode.output.kind === 'action' && episode.output.candidate.id.startsWith('focus:');

    /* The only difference between these two runs is one answer. */
    expect(focusWon(free)).toBe(true);
    expect(focusWon(trapped)).toBe(false);

    /* And the refusal is recorded in the owner's terms, not as a silent disappearance. */
    const why = trapped.internal.rejected
      .filter((entry) => entry.candidateId.startsWith('focus:'))
      .map((entry) => entry.reason)
      .join(' ');
    expect(why).toMatch(/cannot step away/i);
  });

  it('never removes a move that declared no shape', () => {
    const trapped = runEpisode(
      [
        situation('context:interruptibility', 'Not right now'),
        situation('context:privacy', 'No — around other people'),
        situation('context:setting', 'Work'),
      ],
      NOW,
    );

    const removedForShape = trapped.internal.rejected.filter((entry) =>
      /step away|around other people|at work/i.test(entry.reason),
    );
    for (const entry of removedForShape) {
      expect(entry.candidateId).not.toBe('recover:pause');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the situation question is asked only when it would settle something', () => {
  it('asks nothing about the situation when no move on the table has a shape', () => {
    const state = assessState([], NOW);
    const shapeless = [
      { minimumMinutes: 5, durationMinutes: 10, capacity: undefined },
    ] as unknown as Parameters<typeof selectQuestion>[1];

    const asked = selectQuestion(state, shapeless);
    expect(asked?.promptId).not.toBe('context:setting');
    expect(asked?.promptId).not.toBe('context:interruptibility');
  });

  it('asks about stepping away when an exclusive-time move is on the table', () => {
    const records = scenarioById('action').records.filter(
      (record) => !String((record as { attribute?: string }).attribute).startsWith('context:'),
    );
    const state = assessState(records, NOW);
    const candidates = generateCandidates(records, state, NOW);

    const asked = selectQuestion(state, candidates);
    expect(asked?.promptId).toBe('context:interruptibility');
    /* And it offers an honest way out. */
    expect(asked?.answers).toContain('Not sure');
  });

  it('offers Not sure on every question this surface can raise', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      if (episode.output.kind !== 'question') continue;
      expect(episode.output.answers, scenario.id).toContain('Not sure');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the guide asks the situation before it asks the clock', () => {
  it('orders the morning check-in situation-first', () => {
    const ids = planGuide('morning', '15', [], NOW).steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );

    const setting = ids.indexOf('context:setting');
    const minutes = ids.indexOf('context:available-minutes');

    expect(setting).toBeGreaterThanOrEqual(0);
    /* Either the clock comes later, or the budget cut it — never the other way round. */
    if (minutes >= 0) expect(setting).toBeLessThan(minutes);
  });

  it('still keeps the whole check-in inside the response budget', () => {
    /* Four new questions must not turn a check-in into an intake form. */
    for (const kind of ['morning', 'afternoon', 'evening'] as const) {
      expect(planGuide(kind, '15', [], NOW).steps.length).toBeLessThanOrEqual(5);
    }
  });

  it('every scenario still emits exactly one output', () => {
    for (const scenario of SCENARIOS) {
      const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
      expect(['action', 'question', 'silence', 'insufficient-evidence'], scenario.id).toContain(
        episode.output.kind,
      );
    }
  });
});
