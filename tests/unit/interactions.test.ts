import { beforeEach, describe, expect, it } from 'vitest';
import { listAllRecords, listCurrentRecords } from '../../src/application/queries/readRecords';
import { writeRecords } from '../../src/application/commands/writeRecord';
import {
  DECLINE_REASONS,
  declineRecommendation,
  declineReasonById,
  openEpisodes,
  recordOutcome,
  startRecommendation,
} from '../../src/application/commands/decisionEpisode';
import {
  completeGuideSession,
  quickCapture,
  respondToWeeklyDirection,
} from '../../src/application/commands/guideSession';
import { OUTCOME_PROMPTS, STATE_PROMPTS } from '../../src/domain/prompts/definitions';
import type { GuideDepth } from '../../src/domain/records';
import { planGuide, suggestedGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { outcomeWindows } from '../../src/intelligence/evaluation/outcomeWindows';
import { evaluateEffectiveness } from '../../src/intelligence/evaluation/evaluate';
import { scenarioById, shiftScenario } from '../../src/app/scenarios';
import { resetDatabase } from '../support/database';
import { resetFixtureIds } from '../fixtures/records';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * Phase 6 gate: real interactions write real records, and survive a reload.
 *
 * "Reload" in a unit test means going back to storage rather than to the value the
 * command returned. Every assertion below re-reads from IndexedDB, because the
 * question this phase has to answer is not "did the function build a record" but
 * "is it there afterwards".
 */

const NOW = new Date('2026-03-09T10:00:00.000Z');

/** Seeds a scenario positioned so its records sit just before `NOW`. */
async function seed(scenarioId: string): Promise<readonly CanonicalRecord[]> {
  const scenario = shiftScenario(scenarioById(scenarioId), NOW);
  const results = await writeRecords(scenario.records);
  const failed = results.filter((result) => !result.ok);
  expect(failed.flatMap((f) => f.issues)).toEqual([]);
  return listAllRecords();
}

beforeEach(async () => {
  resetFixtureIds();
  await resetDatabase();
});

describe('the response controls write canonical records', () => {
  it('Start persists the decision and opens an outcome window', async () => {
    const records = await seed('action');
    const episode = runEpisode(records, NOW);
    expect(episode.output.kind).toBe('action');

    const result = await startRecommendation(episode, NOW);
    expect(result.ok, result.ok ? '' : result.issues.join('; ')).toBe(true);

    const stored = await listAllRecords();
    const kinds = stored.map((record) => record.recordType);
    expect(kinds).toContain('candidate-action');
    expect(kinds).toContain('recommendation');
    expect(kinds).toContain('execution');

    // Starting is not executing. At this instant nothing has been observed about
    // whether the action was carried out, and the record says exactly that.
    const execution = stored.find((record) => record.recordType === 'execution');
    expect(execution).toMatchObject({ state: 'unknown-execution' });

    expect(outcomeWindows(stored, NOW)).toHaveLength(1);
  });

  it('links the whole chain to one decision episode', async () => {
    const records = await seed('action');
    await startRecommendation(runEpisode(records, NOW), NOW);

    const stored = await listAllRecords();
    const episodeIds = new Set(
      stored.flatMap((record) =>
        record.decisionEpisodeId === undefined ? [] : [record.decisionEpisodeId],
      ),
    );
    expect(episodeIds.size).toBe(1);
  });

  it('Can’t Now creates a constraint and is never read as ineffectiveness', async () => {
    const records = await seed('action');
    const episode = runEpisode(records, NOW);

    const result = await declineRecommendation(episode, declineReasonById('no-time'), NOW);
    expect(result.ok).toBe(true);

    const stored = await listAllRecords();

    const execution = stored.find((record) => record.recordType === 'execution');
    expect(execution).toMatchObject({ state: 'not-executed' });

    // The constraint is a new context snapshot, and free time became unresolved
    // rather than being guessed downwards.
    const current = await listCurrentRecords();
    const snapshots = current.filter((record) => record.recordType === 'context-snapshot');
    const newest = snapshots.sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    expect(newest).toMatchObject({ availableMinutes: { status: 'unresolved' } });

    // And declining produces no evidence about the recommendation.
    const evaluations = evaluateEffectiveness(stored, new Date(NOW.getTime() + 8 * 86_400_000));
    for (const evaluation of evaluations) {
      expect(evaluation.verdict).toBe('unresolved');
    }
  });

  it('records a protected context when the reason implies one', async () => {
    const records = await seed('action');
    const episode = runEpisode(records, NOW);
    await declineRecommendation(episode, declineReasonById('responsibility'), NOW);

    const current = await listCurrentRecords();
    const newest = current
      .filter((record) => record.recordType === 'context-snapshot')
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
    expect(newest).toMatchObject({ protectedContexts: expect.arrayContaining(['caregiving']) });
  });

  it('offers only circumstances as decline reasons — never a character judgement', () => {
    for (const reason of DECLINE_REASONS) {
      expect(reason.label).not.toMatch(
        /lazy|excuse|procrastinat|discipline|failed|couldn.t be/i,
      );
    }
  });
});

describe('outcomes', () => {
  async function started(): Promise<{
    readonly executionRecordId: string;
    readonly recommendationRecordId: string;
    readonly openedAt: string;
  }> {
    const records = await seed('action');
    const result = await startRecommendation(runEpisode(records, NOW), NOW);
    expect(result.ok).toBe(true);
    const open = openEpisodes(await listAllRecords());
    const target = required(open[0], 'an open episode after Start');
    return {
      executionRecordId: target.executionRecordId,
      recommendationRecordId: target.recommendationRecordId,
      openedAt: target.openedAt,
    };
  }

  it('supersedes the execution rather than mutating it', async () => {
    const target = await started();

    await recordOutcome(
      {
        ...target,
        decisionEpisodeId: undefined,
        category: 'career-work-learning',
        target: 'Goal One',
        answers: [
          { prompt: OUTCOME_PROMPTS.completed, answer: { kind: 'choice', choice: 'Yes' } },
          { prompt: OUTCOME_PROMPTS.duration, answer: { kind: 'minutes', minutes: 30 } },
          {
            prompt: OUTCOME_PROMPTS['still-interfering'],
            answer: { kind: 'choice', choice: 'No' },
          },
        ],
      },
      NOW,
    );

    const stored = await listAllRecords();
    const executions = stored.filter((record) => record.recordType === 'execution');
    expect(executions).toHaveLength(2);

    // The original is still readable — history is appended to, never rewritten.
    expect(executions.some((record) => record.recordId === target.executionRecordId)).toBe(
      true,
    );
    const correction = executions.find(
      (record) => record.supersedesRecordId === target.executionRecordId,
    );
    expect(correction).toMatchObject({ state: 'executed' });
  });

  it('leaves the outcome unresolved when nothing observable was reported', async () => {
    const target = await started();

    // Finishing an action is execution, not evidence that it helped. With no
    // observation of what changed, the outcome must stay unresolved.
    await recordOutcome(
      {
        ...target,
        decisionEpisodeId: undefined,
        category: 'career-work-learning',
        target: 'Goal One',
        answers: [
          { prompt: OUTCOME_PROMPTS.completed, answer: { kind: 'choice', choice: 'Yes' } },
        ],
      },
      NOW,
    );

    const outcome = (await listAllRecords()).find((record) => record.recordType === 'outcome');
    expect(outcome).toMatchObject({ result: { status: 'unresolved' } });
  });

  it('records "I cannot tell" as unknown rather than as no effect', async () => {
    const target = await started();

    await recordOutcome(
      {
        ...target,
        decisionEpisodeId: undefined,
        category: 'career-work-learning',
        target: 'Goal One',
        answers: [
          { prompt: OUTCOME_PROMPTS.completed, answer: { kind: 'choice', choice: 'Yes' } },
          { prompt: OUTCOME_PROMPTS['still-interfering'], answer: { kind: 'unsure' } },
        ],
      },
      NOW,
    );

    const stored = await listAllRecords();
    const outcome = stored.find((record) => record.recordType === 'outcome');
    expect(outcome).toMatchObject({ result: { status: 'unknown' } });

    const unsure = stored.find(
      (record) =>
        record.recordType === 'observation' &&
        (record as { value?: { kind?: string } }).value?.kind === 'unsure',
    );
    expect(unsure).toBeDefined();
  });

  it('stops offering a follow-up once the loop is closed', async () => {
    const target = await started();
    expect(openEpisodes(await listAllRecords())).toHaveLength(1);

    await recordOutcome(
      {
        ...target,
        decisionEpisodeId: undefined,
        category: 'career-work-learning',
        target: 'Goal One',
        answers: [
          {
            prompt: OUTCOME_PROMPTS['still-interfering'],
            answer: { kind: 'choice', choice: 'No' },
          },
        ],
      },
      NOW,
    );

    expect(openEpisodes(await listAllRecords())).toHaveLength(0);
  });
});

describe('guides', () => {
  it('keeps a normal check-in within five responses', async () => {
    const records = await seed('action');
    const plan = planGuide('morning', '30', records, NOW);
    expect(plan.steps.length).toBeLessThanOrEqual(5);
    expect(plan.withinNormalBudget).toBe(true);
  });

  it('plans the same check-in whatever depth a caller passes (V33-024)', async () => {
    /*
     * Depth was an owner-set question count until v3.3. It is now provenance stamped on
     * the record, and the planner does not read it — so these four calls, which used to
     * produce three, five, seven and ten questions, must now be indistinguishable.
     */
    const records = await seed('action');
    const ids = (depth: GuideDepth): string[] =>
      planGuide('morning', depth, records, NOW).steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );

    const brief = ids('15');
    expect(brief.length).toBeGreaterThan(0);
    for (const depth of ['30', '45', 'full'] as const) {
      expect(ids(depth)).toEqual(brief);
    }
  });

  it('catch-up asks only questions that are still worth asking', async () => {
    const records = await seed('action');
    const morning = planGuide('morning', 'full', records, NOW);
    const catchUp = planGuide('morning-catch-up', 'full', records, NOW);

    const ids = (plan: typeof morning): string[] =>
      plan.steps.flatMap((step) => (step.kind === 'prompt' ? [step.prompt.promptId] : []));

    /*
     * Asserted against the drop rule rather than the asked list. Both guides now cut at
     * the response budget, so a question sitting tenth in the morning order is absent
     * from either for a reason that has nothing to do with catching up. What has to
     * hold is that catch-up drops it *by rule* and the morning does not.
     */
    const droppedForCatchUp = (plan: typeof morning): string[] =>
      plan.omitted
        .filter((entry) =>
          entry.because.toLowerCase().includes('the morning it would have shaped has passed'),
        )
        .map((entry) => entry.promptId);

    expect(droppedForCatchUp(catchUp)).toContain('sleep:awakenings');
    expect(droppedForCatchUp(catchUp)).toContain('sleep:onset-minutes');
    expect(droppedForCatchUp(morning)).toEqual([]);
    expect(ids(catchUp)).not.toContain('sleep:awakenings');
    expect(ids(catchUp)).not.toContain('sleep:onset-minutes');

    // Bedtime and wake time survive: they are settled facts, and sleep duration
    // cannot be calculated without them.
    expect(droppedForCatchUp(catchUp)).not.toContain('sleep:bedtime');
    expect(droppedForCatchUp(catchUp)).not.toContain('sleep:wake-time');

    // And every omission says why, rather than silently disappearing.
    for (const omission of catchUp.omitted) expect(omission.because.length).toBeGreaterThan(0);
  });

  it('does not re-ask a question that already has a current answer', async () => {
    await seed('action');
    const energy = STATE_PROMPTS.find((entry) => entry.promptId === 'state:energy');

    await completeGuideSession(
      {
        kind: 'quick-check-in',
        depth: '15',
        outcome: 'completed',
        answers: [
          {
            prompt: required(energy, 'the energy prompt'),
            answer: { kind: 'scale', ordinal: 4 },
          },
        ],
        skippedPromptIds: [],
      },
      NOW,
    );

    const plan = planGuide('afternoon', 'full', await listAllRecords(), NOW);
    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids).not.toContain('state:energy');
    expect(plan.omitted.map((entry) => entry.promptId)).toContain('state:energy');
  });

  it('survives a reload: the session and its observations are both stored', async () => {
    await seed('action');
    const energy = STATE_PROMPTS.find((entry) => entry.promptId === 'state:energy');

    const result = await completeGuideSession(
      {
        kind: 'morning',
        depth: '30',
        outcome: 'completed',
        answers: [
          {
            prompt: required(energy, 'the energy prompt'),
            answer: { kind: 'scale', ordinal: 3 },
          },
        ],
        skippedPromptIds: ['state:readiness'],
      },
      NOW,
    );
    expect(result.ok).toBe(true);

    const stored = await listAllRecords();
    const session = stored.find((record) => record.recordType === 'guide-session');
    expect(session).toMatchObject({
      kind: 'morning',
      depth: '30',
      outcome: 'completed',
      promptIdsAnswered: ['state:energy'],
      promptIdsSkipped: ['state:readiness'],
    });

    const observation = stored.find(
      (record) =>
        record.recordType === 'observation' &&
        (record as { attribute?: string }).attribute === 'state:energy',
    );
    expect(observation).toMatchObject({
      value: { kind: 'anchored-scale', scaleId: 'energy', ordinal: 3, label: 'Functional' },
      privacy: 'general',
    });
  });

  it('writes a session even when nothing was worth asking', async () => {
    await seed('action');
    const result = await completeGuideSession(
      {
        kind: 'afternoon',
        depth: '15',
        outcome: 'completed',
        answers: [],
        skippedPromptIds: [],
      },
      NOW,
    );
    expect(result.ok).toBe(true);
    expect(result.ok ? result.writtenRecordIds : []).toEqual([]);

    const session = (await listAllRecords()).find(
      (record) => record.recordType === 'guide-session',
    );
    expect(session).toMatchObject({ promptIdsAnswered: [], producedRecordIds: [] });
  });

  it('stores nothing at all for a skipped prompt', async () => {
    await seed('action');
    const before = (await listAllRecords()).length;
    const energy = STATE_PROMPTS.find((entry) => entry.promptId === 'state:energy');

    await completeGuideSession(
      {
        kind: 'quick-check-in',
        depth: '15',
        outcome: 'stopped',
        answers: [
          { prompt: required(energy, 'the energy prompt'), answer: { kind: 'not-answered' } },
        ],
        skippedPromptIds: ['state:energy'],
      },
      NOW,
    );

    const stored = await listAllRecords();
    // Exactly one new record: the session. No placeholder observation exists.
    expect(stored.length).toBe(before + 1);
    expect(
      stored.some(
        (record) =>
          record.recordType === 'observation' &&
          (record as { attribute?: string }).attribute === 'state:energy',
      ),
    ).toBe(false);
  });

  it('has no failure state to record — stopping, snoozing, and skipping are outcomes', async () => {
    await seed('action');

    for (const outcome of ['stopped', 'skipped'] as const) {
      const result = await completeGuideSession(
        { kind: 'morning', depth: '15', outcome, answers: [], skippedPromptIds: [] },
        NOW,
      );
      expect(result.ok, result.ok ? '' : result.issues.join('; ')).toBe(true);
    }

    // A snooze must say when to come back; a drop dressed as a deferral is rejected.
    const noReturn = await completeGuideSession(
      { kind: 'morning', depth: '15', outcome: 'snoozed', answers: [], skippedPromptIds: [] },
      NOW,
    );
    expect(noReturn.ok).toBe(false);

    const sessions = (await listAllRecords()).filter(
      (record) => record.recordType === 'guide-session',
    );
    for (const session of sessions) {
      expect(JSON.stringify(session)).not.toMatch(/missed|failed|overdue|streak|incomplete/i);
    }
  });

  it('suggests a guide from the owner’s wall clock, without scheduling or owing one', () => {
    // Local time on purpose: "morning" means the owner's morning, not UTC's. These
    // dates are therefore built in local time — asserting against UTC instants would
    // make the test pass or fail on the machine's timezone rather than the rule.
    expect(suggestedGuide(new Date(2026, 2, 9, 8, 0))).toBe('morning');
    expect(suggestedGuide(new Date(2026, 2, 9, 14, 0))).toBe('afternoon');
    expect(suggestedGuide(new Date(2026, 2, 9, 20, 0))).toBe('evening');
    expect(suggestedGuide(new Date(2026, 2, 8, 9, 0))).toBe('weekly');
  });

  it('offers an outcome follow-up in the evening once a loop is open', async () => {
    const records = await seed('action');
    await startRecommendation(runEpisode(records, NOW), NOW);

    const plan = planGuide('evening', 'full', await listAllRecords(), NOW);
    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids).toContain('outcome:completed');
    expect(ids).toContain('outcome:still-interfering');
  });
});

describe('the weekly direction', () => {
  it('records Confirm, Adjust, Snooze, and Skip without any of them becoming failure', async () => {
    const records = await seed('weekly-direction');
    const episode = runEpisode(records, NOW);
    expect(episode.weeklyDirection.responses).toEqual(
      expect.arrayContaining(['Confirm', 'Snooze', 'Skip']),
    );

    for (const response of [
      { response: 'confirmed' } as const,
      { response: 'snoozed', remindAt: NOW.toISOString() } as const,
      { response: 'skipped' } as const,
    ]) {
      const result = await respondToWeeklyDirection(episode, response, NOW);
      expect(result.ok, result.ok ? '' : result.issues.join('; ')).toBe(true);
    }

    const stored = (await listAllRecords()).filter(
      (record) => record.recordType === 'weekly-direction',
    );
    expect(stored).toHaveLength(3);
    for (const record of stored) {
      expect(JSON.stringify(record)).not.toMatch(/missed|failed|overdue|streak/i);
    }
  });
});

describe('quick capture', () => {
  it('writes exactly one canonical event, classified as a private note', async () => {
    await seed('action');
    const before = (await listAllRecords()).length;

    const result = await quickCapture({ kind: 'A win', what: 'Shipped the migration' }, NOW);
    expect(result.ok).toBe(true);

    const stored = await listAllRecords();
    expect(stored.length).toBe(before + 1);

    const captured = stored.find(
      (record) =>
        record.recordType === 'observation' &&
        (record as { attribute?: string }).attribute?.startsWith('capture:') === true,
    );
    expect(captured).toMatchObject({
      privacy: 'note',
      value: { kind: 'note', text: 'Shipped the migration' },
    });
  });

  it('refuses to write an empty capture', async () => {
    const result = await quickCapture({ kind: 'A win', what: '   ' }, NOW);
    expect(result.ok).toBe(false);
  });
});
