import { describe, expect, it } from 'vitest';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import {
  FOOD_CARBS,
  FOOD_FLAGS,
  FOOD_PATTERN,
  FOOD_PRODUCE,
  FOOD_PROTEIN,
  FOOD_TAGS,
  ALL_PROMPTS,
  promptById,
} from '../../src/domain/prompts/definitions';
import { HEALTH_CAPTURES } from '../../src/domain/health/capture';
import { CAREER_CAPTURES } from '../../src/domain/career/capture';
import { ALL_CONTEXTUAL_CAPTURES, capturesForDomain } from '../../src/domain/capture/registry';
import {
  ACTUAL_BEDTIME_ATTRIBUTE,
  ROUTINE_ATTRIBUTES,
  bedtimeDrift,
  minutesToUsualBedtime,
  routineFor,
} from '../../src/domain/routines/routines';
import { BEDTIME_GUARD_MINUTES, shouldAbstain } from '../../src/command-core/arbitration/weigh';
import { fits } from '../../src/domain/domains/capacity';
import { horizonFor } from '../../src/domain/moves/horizons';
import { pattern } from '../../src/domain/moves/registry';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * Qualitative food, routines, and the health/career context gap (sections J and K).
 *
 * The organising rule for all of it is `V33-045`: **no capture without a decision
 * purpose.** Everything below is either a question that can change an answer, or a test
 * that a question which cannot change an answer is never asked.
 */

const MINUTE = 60 * 1000;
let seq = 0;
const id = () => {
  seq += 1;
  return `00000000-0000-4000-f000-${String(seq).padStart(12, '0')}`;
};

function observation(attribute: string, state: string, at: string): CanonicalRecord {
  return {
    recordId: id(),
    recordType: 'observation',
    schemaVersion: 1,
    occurredAt: at,
    recordedAt: at,
    localTime: { localIso: at, timeZone: 'UTC', utcOffsetMinutes: 0 },
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    category: 'health-recovery-energy',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/* -------------------------------------------------------------------------- */

describe('J2. the food vocabulary is qualitative, and closed', () => {
  it('offers exactly the governing categories', () => {
    expect([...FOOD_PROTEIN]).toEqual(['No protein', 'Some protein', 'High protein']);
    expect([...FOOD_CARBS]).toEqual(['Refined carbs', 'Whole-grain carbs', 'Starchy carbs']);
    expect([...FOOD_PRODUCE]).toEqual(['Little produce', 'Some produce', 'Plenty of produce']);
    expect([...FOOD_PATTERN]).toEqual(['Skipped a meal', 'Balanced meal']);
    for (const flag of ['Dairy', 'Greasy', 'Spicy', 'Heavy']) {
      expect(FOOD_FLAGS).toContain(flag);
    }
  });

  it('has no route to a calorie, a macro, or a quantity (c)', () => {
    /*
     * Checked on the vocabulary rather than on the UI, because a number cannot reach the
     * screen if there is no word for it in the model.
     */
    for (const tag of FOOD_TAGS) {
      expect(tag).not.toMatch(/calorie|kcal|macro|gram|\bg\b|protein target|portion|serving/i);
      expect(tag).not.toMatch(/\d/);
    }

    const foodPrompts = ALL_PROMPTS.filter((prompt) => prompt.promptId.startsWith('food:'));
    expect(foodPrompts.length).toBeGreaterThan(0);
    for (const prompt of foodPrompts) {
      expect(prompt.text).not.toMatch(/calorie|macro|how many|how much did you eat|grams/i);
      /* And nothing numeric can be entered. */
      expect(prompt.input.kind).not.toBe('count');
    }
  });

  it('never asks the owner to explain a cause (J3)', () => {
    for (const prompt of ALL_PROMPTS.filter((entry) => entry.promptId.startsWith('food:'))) {
      expect(prompt.text).not.toMatch(/\bwhy\b/i);
      expect(prompt.text).not.toMatch(/what caused|cause of|because/i);
      expect(prompt.text).not.toMatch(/how did .* make you feel/i);
      expect(prompt.text).not.toMatch(/did the (food|meal) /i);
    }
  });

  it('keeps every food question classified as health data', () => {
    for (const prompt of ALL_PROMPTS.filter((entry) => entry.promptId.startsWith('food:'))) {
      expect(prompt.privacy, prompt.promptId).toBe('health');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('J5. food outcomes are not asked before they could be known (g)', () => {
  it('gives an overnight effect a longer horizon than an immediate one', () => {
    /*
     * `wind-down:*` lands next morning; a glass of water lands in the same sitting. Asking
     * both at the same moment is what teaches an owner the questions are meaningless.
     */
    const overnight = horizonFor('wind-down:start-now');
    const immediate = horizonFor('hydrate-eat:water');
    expect(overnight.closesAfterMs).toBeGreaterThan(immediate.closesAfterMs);
  });

  it('declares a follow-up window on the eating move rather than asking at once', () => {
    const eat = pattern('hydrate-eat:eat-something');
    expect(eat.followUp.windowHours).toBeGreaterThan(0);
    /* And the prompt it points at exists and is observable rather than interpretive. */
    expect(promptById(eat.followUp.promptId).kind).not.toBe('optional-note');
  });
});

/* -------------------------------------------------------------------------- */

describe('J7–J9. routines are intentions, and separate from what happened (i, j)', () => {
  const AT = '2026-06-01T20:00:00.000Z';

  const usualBedtime = (localIso: string) =>
    observation(ROUTINE_ATTRIBUTES['usual-bedtime'], localIso, AT);

  it('records a usual bedtime the owner set', () => {
    const records = [usualBedtime('2026-06-01T22:30:00.000Z')];
    const routine = required(routineFor(records, 'usual-bedtime'), 'the routine');
    expect(routine.minutesIntoDay).toBe(22 * 60 + 30);
  });

  it('keeps the actual bedtime as a separate observation (j)', () => {
    /*
     * `AT33-043`. Two attributes, two meanings: one is what he is aiming at, the other is
     * what happened. Neither overwrites the other, and the drift between them is the only
     * interesting number here.
     */
    const records = [
      usualBedtime('2026-06-01T22:30:00.000Z'),
      observation(ACTUAL_BEDTIME_ATTRIBUTE, '2026-06-01T23:45:00.000Z', AT),
    ];

    const drift = required(bedtimeDrift(records), 'the drift');
    expect(drift.intended).toBe(22 * 60 + 30);
    expect(drift.actual).toBe(23 * 60 + 45);
    expect(drift.driftMinutes).toBe(75);

    /* The intention is untouched by the observation. */
    expect(required(routineFor(records, 'usual-bedtime'), 'routine').minutesIntoDay).toBe(
      22 * 60 + 30,
    );
  });

  it('reports nothing rather than half a comparison', () => {
    /* A target with no observation is not a missed bedtime. */
    expect(bedtimeDrift([usualBedtime('2026-06-01T22:30:00.000Z')])).toBeUndefined();
    /* And an observation with no target is not a failure. */
    expect(
      bedtimeDrift([observation(ACTUAL_BEDTIME_ATTRIBUTE, '2026-06-01T23:45:00.000Z', AT)]),
    ).toBeUndefined();
  });

  it('says unknown when no bedtime has been set, rather than assuming one', () => {
    expect(minutesToUsualBedtime([], new Date(AT), 0)).toBeUndefined();
  });

  it('counts down to the owner’s own bedtime in their own local time (i)', () => {
    const records = [usualBedtime('2026-06-01T22:30:00.000Z')];

    /* 21:45 UTC with a zero offset: forty-five minutes to go. */
    const soon = minutesToUsualBedtime(records, new Date('2026-06-01T21:45:00.000Z'), 0);
    expect(soon).toBe(45);

    /* The same instant in New York during EDT is the afternoon — hours to go. */
    const inNewYork = minutesToUsualBedtime(
      records,
      new Date('2026-06-01T21:45:00.000Z'),
      -4 * 60,
    );
    expect(required(inNewYork, 'minutes')).toBeGreaterThan(soon ?? 0);
  });
});

/* -------------------------------------------------------------------------- */

describe('J9. near bedtime, stopping can beat another valid move (k)', () => {
  it('prefers stopping over acting inside the guard', () => {
    const verdict = shouldAbstain({
      actionsToday: 0,
      capacity: 'high',
      minutesToBedtime: BEDTIME_GUARD_MINUTES - 1,
      somethingInProgress: false,
    });

    expect(verdict.kind).toBe('stop-for-tonight');
    if (verdict.kind === 'act') throw new Error('unreachable');
    expect(verdict.because).toMatch(/sleep/i);
  });

  it('does not stop merely because the evening is late', () => {
    const verdict = shouldAbstain({
      actionsToday: 0,
      capacity: 'high',
      minutesToBedtime: BEDTIME_GUARD_MINUTES + 120,
      somethingInProgress: false,
    });
    expect(verdict.kind).toBe('act');
  });

  it('cannot see how many candidates exist, so abundance never forces activity', () => {
    /* The signature is the guarantee: one argument, and no candidate list in it. */
    expect(shouldAbstain.length).toBe(1);
  });

  it('produces a stop through the real engine when bedtime is close', () => {
    /*
     * The production path, not the utility. A scenario that normally recommends something
     * is given a bedtime twenty minutes away, and the engine declines to start anything.
     */
    const scenario = scenarioById('health-enabled');
    const now = new Date(scenario.nowIso);
    const bedtimeSoon = new Date(now.getTime() + 20 * MINUTE).toISOString();

    const before = runEpisode(scenario.records, now);
    const after = runEpisode(
      [
        ...scenario.records,
        observation(ROUTINE_ATTRIBUTES['usual-bedtime'], bedtimeSoon, now.toISOString()),
      ],
      now,
    );

    expect(before.output.kind).toBe('action');
    expect(after.output.kind).toBe('silence');
    if (after.output.kind !== 'silence') throw new Error('unreachable');
    expect(after.output.statement).toMatch(/stop for tonight/i);

    /* And it says how many things it turned down, so silence is visibly a decision. */
    expect(after.output.reasonTrace.join(' ')).toMatch(/none of them beat stopping/i);
  });

  it('leaves the decision alone when no bedtime has been recorded (J10)', () => {
    /* A routine nobody set must not behave like one set to a default. */
    const scenario = scenarioById('health-enabled');
    const episode = runEpisode(scenario.records, new Date(scenario.nowIso));
    expect(episode.output.kind).toBe('action');
  });
});

/* -------------------------------------------------------------------------- */

describe('K. health and career declare contextual capture, and it is operational', () => {
  it('registers both areas, which were previously absent (K1)', () => {
    expect(HEALTH_CAPTURES.length).toBeGreaterThan(0);
    expect(CAREER_CAPTURES.length).toBeGreaterThan(0);

    expect(capturesForDomain('health-recovery-energy').length).toBe(HEALTH_CAPTURES.length);
    expect(capturesForDomain('career-and-learning').length).toBe(CAREER_CAPTURES.length);

    /* And the shared registry the orchestrator walks now contains them. */
    const ids = new Set(ALL_CONTEXTUAL_CAPTURES.map((capture) => capture.id));
    expect(ids.has('health:hydration-prerequisite')).toBe(true);
    expect(ids.has('career:name-the-next-step')).toBe(true);
  });

  it('declares nothing that could not change a decision (K1)', () => {
    /*
     * The anti-padding rule. Every triggered question must be able to move an answer, and
     * every declaration must name the situation that makes it relevant.
     */
    for (const capture of [...HEALTH_CAPTURES, ...CAREER_CAPTURES]) {
      expect(capture.triggers.length, capture.id).toBeGreaterThan(0);
      if (capture.captureClass === 'triggered-domain-question') {
        expect(capture.canAffectCurrentDecision, capture.id).toBe(true);
      }
    }
  });

  it('asks no health or career question during sleep', () => {
    for (const capture of [...HEALTH_CAPTURES, ...CAREER_CAPTURES]) {
      expect(capture.excludedContexts, capture.id).toContain('sleep');
    }
  });

  it('keeps career questions out of family and caregiving time (K3)', () => {
    for (const capture of CAREER_CAPTURES) {
      if (capture.captureClass === 'update-this-area') continue;
      expect(capture.excludedContexts, capture.id).toContain('family');
      expect(capture.excludedContexts, capture.id).toContain('caregiving');
    }
  });

  it('expires a stale contextual answer rather than trusting it forever (q)', () => {
    /*
     * Every question that can change a decision has to go stale, or a fact about this
     * afternoon becomes a fact about the owner.
     */
    const deciding = [...HEALTH_CAPTURES, ...CAREER_CAPTURES].filter(
      (capture) => capture.captureClass === 'triggered-domain-question',
    );
    expect(deciding.length).toBeGreaterThan(0);
    for (const capture of deciding) {
      expect(capture.freshnessHours, capture.id).toBeGreaterThan(0);
    }
  });

  it('classifies career data as workplace and health data as health', () => {
    for (const capture of HEALTH_CAPTURES) expect(capture.privacy, capture.id).toBe('health');
    for (const capture of CAREER_CAPTURES) {
      expect(capture.privacy, capture.id).toBe('workplace');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('K4. context changes a real candidate decision (n, o, p)', () => {
  const exclusive = pattern('protect-a-block:deep-block');

  it('removes a career focus block when the owner cannot step away (o)', () => {
    const trapped = fits(required(exclusive.capacity, 'a capacity shape'), {
      interruptibility: 'none',
    });
    expect(trapped.eligible).toBe(false);
    expect(trapped.because.length).toBeGreaterThan(0);
  });

  it('admits the same move once they can (o)', () => {
    const free = fits(required(exclusive.capacity, 'a capacity shape'), {
      interruptibility: 'free',
    });
    expect(free.eligible).toBe(true);
  });

  it('removes a private health move in a public place, and admits it alone (n)', () => {
    const quiet = pattern('settle-attention:sit-quietly');
    const shape = required(quiet.capacity, 'a capacity shape');

    expect(fits(shape, { privacy: 'public' }).eligible).toBe(false);
    expect(fits(shape, { privacy: 'private' }).eligible).toBe(true);
  });

  it('never excludes a move because the context is unknown (p)', () => {
    /*
     * The single most important rule in the whole capacity model. An unanswered question
     * must not quietly behave like a "no" — that is how an app that asks nothing ends up
     * recommending nothing.
     */
    expect(fits(required(exclusive.capacity, 'a shape'), {}).eligible).toBe(true);

    const quiet = required(pattern('settle-attention:sit-quietly').capacity, 'a shape');
    expect(fits(quiet, {}).eligible).toBe(true);

    /*
     * A *partly* known situation is still not a reason to refuse on the unknown parts.
     * Knowing the owner is at home says nothing about privacy, and the move stays eligible.
     */
    expect(fits(quiet, { setting: 'home' }).eligible).toBe(true);
    expect(fits(quiet, { interruptibility: 'free' }).eligible).toBe(true);

    /*
     * `setting: 'work'` is deliberately *not* an unknown — it is an explicit incompatible
     * fact the owner stated, and refusing on it is the rule working rather than failing.
     */
    expect(fits(quiet, { setting: 'work' }).eligible).toBe(false);
  });
});
