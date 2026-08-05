import { beforeEach, describe, expect, it } from 'vitest';
import {
  FORBIDDEN_MONEY_VOCABULARY,
  MONEY_ACTIONS,
  MONEY_ACTION_IDS,
  MONEY_ATTRIBUTES,
  RESILIENCE_BANDS,
} from '../../src/domain/money/strategy';
import { MONEY_CAPTURES } from '../../src/domain/money/capture';
import { topicEnabled } from '../../src/domain/emotional/permissions';
import { quickCaptureOptions } from '../../src/domain/capture/registry';
import { ALL_PROMPTS, MONEY_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { SCALES } from '../../src/domain/records/scales';
import type { CanonicalRecord } from '../../src/domain/records';
import { assessMoney } from '../../src/intelligence/domains/money/assessMoney';
import { generateMoneyCandidate } from '../../src/intelligence/domains/money/moneyCandidate';
import { buildMoneyScan } from '../../src/intelligence/domains/money/scan';
import { summariseMoneyCategory } from '../../src/intelligence/domains/money';
import { assessState } from '../../src/intelligence/state/assessState';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';

/**
 * Prompt 8H gate: money.
 *
 * The last domain, and the one where a wrong word does the most damage. Almost every
 * assertion below is about restraint: no amounts unless he asks for them, no moralising in
 * any state, no question about money in a daily check-in, and nothing suggested to
 * somebody whose cover is thin — because there is nothing worth suggesting.
 */

const GUIDE_AT = new Date('2026-08-08T09:00:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function panel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((entry) => entry.domainId === 'money'),
    'the money panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessMoney(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  const at = new Date(scenario.nowIso);
  return generateMoneyCandidate(scenario.records, assessMoney(scenario.records, at));
}

const SCENARIOS = [
  'money-pressure-no-figures',
  'money-figures-on',
  'money-not-looked',
  'money-thin-cover',
  'money-decision-settled',
];

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('it does not moralise, score, or budget', () => {
  it('uses none of the three forbidden registers on any rendered surface', () => {
    const surfaces = [
      JSON.stringify(MONEY_ACTIONS),
      JSON.stringify(MONEY_PROMPTS),
      ...SCENARIOS.map((scenario) => JSON.stringify(panel(scenario))),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of FORBIDDEN_MONEY_VOCABULARY) {
      expect(surfaces, forbidden).not.toContain(forbidden);
    }
  });

  it('never uses the word avoidance about a person', () => {
    /*
     * It is the plan's name for the deliverable, not a word this app may use. The owner
     * says "I have been putting it off" in his own words; the application never concludes
     * it, and there is no code path that infers it from silence.
     */
    const everything = [
      JSON.stringify(MONEY_ACTIONS),
      JSON.stringify(MONEY_PROMPTS),
      ...SCENARIOS.map((scenario) => JSON.stringify(panel(scenario))),
    ]
      .join(' ')
      .toLowerCase();

    expect(everything).not.toContain('avoid');
    expect(evidenceFor('money-pressure-no-figures').notLookingLately).toBe(false);
    expect(evidenceFor('money-not-looked').notLookingLately).toBe(true);
  });

  it('asks nothing about what anything cost, came in, or is owed', () => {
    for (const prompt of MONEY_PROMPTS) {
      expect(validatePromptDefinition(prompt), prompt.promptId).toEqual([]);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bspen[dt]\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bincome\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bowe[ds]?\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bbalance\b/i);
    }
  });

  it('offers four actions, none of which is financial advice', () => {
    expect(MONEY_ACTION_IDS).toHaveLength(4);
    const statements = Object.values(MONEY_ACTIONS)
      .map((action) => action.statement)
      .join(' ')
      .toLowerCase();

    for (const advice of ['save', 'invest', 'consolidat', 'switch to', 'cut back', 'cancel']) {
      expect(statements, advice).not.toContain(advice);
    }
  });

  it('classifies everything it captures as money data, owned by one surface', () => {
    for (const prompt of MONEY_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('money');
      expect(prompt.category, prompt.promptId).toBe('money');
      expect(ownerOf(prompt), prompt.promptId).toBeDefined();
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the whole domain works without a single figure', () => {
  it('holds no amounts until the topic is separately switched on', () => {
    const off = evidenceFor('money-thin-cover');
    expect(off.figuresEnabled).toBe(false);
    expect(off.goalTarget).toBeUndefined();
    expect(off.goalCurrent).toBeUndefined();

    const on = evidenceFor('money-figures-on');
    expect(on.figuresEnabled).toBe(true);
    expect(on.goalTarget).toBe(7500);
    expect(on.goalCurrent).toBe(4200);
  });

  it('withholds amounts already on record when the topic is switched back off', () => {
    /*
     * Switching off hides and deletes nothing. The records survive; the reading refuses to
     * surface them, which is what makes the switch reversible without losing history.
     */
    const scenario = scenarioById('money-figures-on');
    const withoutSwitch = scenario.records.filter(
      (record) =>
        !('attribute' in record && record.attribute === 'privacy:topic-enabled:money-figures'),
    );

    const evidence = assessMoney(withoutSwitch, new Date(scenario.nowIso));
    expect(evidence.goalTarget).toBeUndefined();
    expect(evidence.goalCurrent).toBeUndefined();
    // The figures are still in the records — they are simply not read.
    expect(
      withoutSwitch.some(
        (record) => 'attribute' in record && record.attribute === MONEY_ATTRIBUTES.goalTarget,
      ),
    ).toBe(true);
  });

  it('suggests exactly the same thing with amounts on and off', () => {
    /*
     * The load-bearing claim of the slice. No branch of the generator reads a figure, so
     * the optional machinery cannot quietly become required.
     */
    const scenario = scenarioById('money-figures-on');
    const at = new Date(scenario.nowIso);
    const withoutFigures = scenario.records.filter(
      (record) =>
        !(
          'attribute' in record &&
          (record.attribute === 'privacy:topic-enabled:money-figures' ||
            record.attribute === MONEY_ATTRIBUTES.goalTarget ||
            record.attribute === MONEY_ATTRIBUTES.goalCurrent)
        ),
    );

    const withFigures = generateMoneyCandidate(
      scenario.records,
      assessMoney(scenario.records, at),
    );
    const without = generateMoneyCandidate(withoutFigures, assessMoney(withoutFigures, at));

    expect(without.candidate?.id).toBe(withFigures.candidate?.id);
    expect(without.because).toBe(withFigures.because);
  });

  it('still reads the switch a profile recorded before the attribute was renamed', () => {
    /*
     * Prompt 8E wrote `emotional:topic-enabled`; Prompt 8H writes `privacy:topic-enabled`
     * because "the emotional slice owns the money switch" stopped being defensible once
     * there were two topics. Both are read, so nobody's existing decision is lost.
     */
    resetFixtureIds();
    const legacy = anObservation({
      attribute: 'emotional:topic-enabled:private-pattern',
      category: 'emotional-and-relationships',
      privacy: 'relationship',
      value: { kind: 'state', state: 'On' },
    } as never) as CanonicalRecord;

    expect(topicEnabled([legacy], 'private-pattern')).toBe(true);
    expect(topicEnabled([legacy], 'money-figures')).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('the first earned percentage in the product', () => {
  it('draws a real meter once the figures exist', () => {
    const view = panel('money-figures-on');
    const meter = required(
      view.visuals.find((visual) => visual.kind === 'meter'),
      'the meter',
    );

    expect(meter.data).toEqual({
      kind: 'meter',
      current: '4200',
      target: '7500',
      percent: 56,
    });
    expect(meter.decisionValue).toMatch(/only percentage in this product/);
  });

  it('refuses the same meter when there are no figures, and says why', () => {
    const view = panel('money-pressure-no-figures');
    expect(view.visuals.some((visual) => visual.kind === 'meter')).toBe(false);

    const refusal = required(
      view.visuals.find(
        (visual) => visual.decisionQuestion === 'How far along is the thing I named?',
      ),
      'the meter refusal',
    );
    expect(refusal.kind).toBe('evidence-summary');
    expect(refusal.decisionValue).toMatch(/no current value is known/i);
    expect(refusal.decisionValue).toMatch(/everything else in this area works without them/);
  });

  it('shows a percentage nowhere else, in any state', () => {
    for (const scenario of SCENARIOS) {
      const view = panel(scenario);
      const withoutMeter = JSON.stringify({
        ...view,
        visuals: view.visuals.filter((visual) => visual.kind !== 'meter'),
      });
      expect(withoutMeter, scenario).not.toMatch(/\b\d{1,3}%/);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('two readings that do not share an axis', () => {
  it('puts cover on a ladder, with no percentage and no destination implied', () => {
    const view = panel('money-thin-cover');
    const stages = required(
      view.visuals.find((visual) => visual.kind === 'stage-path'),
      'the stage path',
    );

    expect(stages.data).toEqual({
      kind: 'stage-path',
      stages: [...RESILIENCE_BANDS],
      currentIndex: 0,
    });
    expect(stages.decisionValue).toMatch(/without implying you should be at the end of it/);
  });

  it('refuses to chart pressure against cover, and says the tension in words', () => {
    const view = panel('money-pressure-no-figures');
    const refusal = required(
      view.visuals.find((visual) =>
        visual.decisionQuestion.startsWith('Which matters more right now'),
      ),
      'the tradeoff refusal',
    );

    expect(refusal.kind).toBe('evidence-summary');
    expect(refusal.decisionValue).toMatch(/points on a scale, not separate things/);
    expect(refusal.decisionValue).toMatch(/bars would claim the heights mean the same thing/);
    // Heavy pressure with months of cover: the two disagree, and it says so.
    expect(refusal.decisionValue).toMatch(/the cover is the more durable fact/);
  });

  it('names the opposite tension too, when pressure is low and cover is thin', () => {
    const view = panel('money-thin-cover');
    const refusal = required(
      view.visuals.find((visual) =>
        visual.decisionQuestion.startsWith('Which matters more right now'),
      ),
      'the tradeoff refusal',
    );
    expect(refusal.decisionValue).toMatch(/this is the direction worth noticing/);
  });

  it('compares two moments around a decision without claiming it caused anything', () => {
    const view = panel('money-decision-settled');
    const graph = required(
      view.graphs.find((entry) => entry.kind === 'comparison'),
      'the comparison graph',
    );

    expect(graph.bars.map((bar) => bar.value)).toEqual([5, 3]);
    expect(graph.uncertainty).toMatch(/what changed, not what the decision caused/);
    expect(graph.uncertainty).toMatch(/none of it is controlled for/);
  });

  it('reads a month of silence as insufficient evidence, never as calm', () => {
    const evidence = evidenceFor('money-not-looked');
    expect(
      evidence.pressureByWeek.filter((week) => week.value === null).length,
    ).toBeGreaterThan(0);
    expect(summariseMoneyCategory(evidence).trajectory).toBe('insufficient-evidence');
  });
});

/* -------------------------------------------------------------------------- */

describe('the one candidate, and who it refuses to help', () => {
  it('offers two minutes and one number when he says he has not looked', () => {
    const result = candidateFor('money-not-looked');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('money:look-at-one-number');
    expect(candidate.minimumMinutes).toBe(2);
    expect(result.because).toMatch(/looking is the whole of it/);
    expect(candidate.stoppingPoint).toMatch(/Nothing has to be decided/);
  });

  it('says nothing at all to somebody whose cover is thin', () => {
    /*
     * Deliberately not a branch. "Build up savings" is not a move anybody can make this
     * afternoon, and offering it to a person who is short of money is the cruellest kind
     * of useless. The reading is shown; the suggestion is withheld, and the app says why.
     */
    const result = candidateFor('money-thin-cover');

    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/no move that fixes that this afternoon/);
    expect(panel('money-thin-cover').move).toBeUndefined();

    // The reading itself is still on the panel. Withholding advice is not hiding facts.
    expect(panel('money-thin-cover').drivers.join(' ')).toContain('under a week');
  });

  it('keeps his decision off Now, unlike the home slice and like the faith slice', () => {
    /*
     * Money is a protected class. "Whether to tell them I cannot make the payment" is not
     * a sentence that belongs on the front page. The classification decides this, not the
     * habit — the home slice quotes its change because a charger on a desk is harmless.
     */
    const scenario = scenarioById('money-decision-settled');
    const at = new Date(scenario.nowIso);
    const open = scenario.records.filter(
      (record) =>
        !('attribute' in record && record.attribute === MONEY_ATTRIBUTES.decisionMade),
    );

    const result = generateMoneyCandidate(open, assessMoney(open, at));
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('money:make-the-call');
    expect(JSON.stringify(candidate)).not.toContain(
      'Placeholder decision written by the owner',
    );
    expect(candidate.statement).toBe('Make the call you were weighing');
  });

  it('is blocked from every protected context, which no other domain claims', () => {
    const candidate = required(candidateFor('money-not-looked').candidate, 'the candidate');
    expect([...candidate.blockedByProtectedContexts].sort()).toEqual([
      'caregiving',
      'commute',
      'family',
      'recovery',
      'sleep',
      'work-focus',
    ]);
  });
});

/* -------------------------------------------------------------------------- */

describe('where the questions are allowed to appear', () => {
  it('lets no money question into any guide, at any depth', () => {
    for (const kind of [
      'morning',
      'afternoon',
      'evening',
      'quick-check-in',
      'weekly',
    ] as const) {
      for (const depth of ['15', '30', '45', 'full'] as const) {
        const ids = planGuide(kind, depth, [], GUIDE_AT).steps.flatMap((step) =>
          step.kind === 'prompt' ? [step.prompt.promptId] : [],
        );
        expect(
          ids.filter((id) => id.startsWith('money:')),
          `${kind}/${depth}`,
        ).toEqual([]);
      }
    }
  });

  it('declares no guide eligibility and excludes every protected context', () => {
    for (const capture of MONEY_CAPTURES) {
      expect(capture.eligibleGuides, capture.id).toEqual([]);
      expect([...capture.excludedContexts].sort(), capture.id).toEqual([
        'caregiving',
        'commute',
        'family',
        'recovery',
        'sleep',
        'work-focus',
      ]);
    }
  });

  it('gates both figure captures behind the protected topic', () => {
    const gated = MONEY_CAPTURES.filter((capture) => capture.protectedTopic !== undefined);
    expect(gated.map((capture) => capture.id)).toEqual([
      'money:goal-target',
      'money:goal-current',
    ]);
    for (const capture of gated) {
      expect(capture.protectedTopic, capture.id).toBe('money-figures');
    }
  });

  it('names its own scale rather than letting a guide own it', () => {
    /*
     * The prompt id decides the owning surface. `money:financial-pressure` belongs to
     * Update This Area; `state:financial-pressure` would have belonged to whichever guide
     * asked first, which is the failure the prefix rule exists to prevent.
     */
    expect(SCALES['financial-pressure'].promptNamespace).toBe('money');
    expect(SCALES['financial-pressure'].category).toBe('money');
    expect(SCALES['financial-pressure'].privacy).toBe('money');
    expect(ALL_PROMPTS.some((prompt) => prompt.promptId === 'money:financial-pressure')).toBe(
      true,
    );
    expect(ALL_PROMPTS.some((prompt) => prompt.promptId === 'state:financial-pressure')).toBe(
      false,
    );
  });

  it('keeps financial pressure out of the shared state assessment', () => {
    /*
     * A hard month with money is not the same as low capacity. Reading it into the state
     * would quietly make the app suggest less of everything, which is it deciding somebody
     * is fragile.
     */
    const scenario = scenarioById('money-pressure-no-figures');
    const state = assessState(scenario.records, new Date(scenario.nowIso));
    expect(JSON.stringify(state)).not.toContain('financial-pressure');
  });

  it('offers the unexpected route through Quick Capture only while the area is on', () => {
    expect(quickCaptureOptions(['money']).map((option) => option.kind)).toContain(
      'Something about money',
    );
    expect(quickCaptureOptions([]).map((option) => option.kind)).not.toContain(
      'Something about money',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('the scan summary withholds twice over', () => {
  it('names the decision as a category of thing, never as its content', () => {
    const scenario = scenarioById('money-decision-settled');
    const at = new Date(scenario.nowIso);
    const open = scenario.records.filter(
      (record) =>
        !('attribute' in record && record.attribute === MONEY_ATTRIBUTES.decisionMade),
    );

    const scan = buildMoneyScan(open, assessMoney(open, at));
    expect(scan.openItem).toBe('A decision you are weighing');
    expect(JSON.stringify(scan)).not.toContain('Placeholder decision written by the owner');
  });

  it('keeps amounts off the weekly scan until that surface is separately granted', () => {
    /*
     * Enabling is not permitting, applied to the one thing in this domain that carries a
     * number. Switching amounts on says he wants to record them; it does not say they may
     * appear on a screen he did not open.
     */
    const scenario = scenarioById('money-figures-on');
    const evidence = evidenceFor('money-figures-on');
    expect(evidence.figuresEnabled).toBe(true);

    const scan = buildMoneyScan(scenario.records, evidence);
    expect(scan.standing).not.toContain('7500');
    expect(scan.standing).toBe('Noticeable on your mind');
  });

  it('offers quick responses that write through the ordinary path', () => {
    const scenario = scenarioById('money-pressure-no-figures');
    const scan = buildMoneyScan(scenario.records, evidenceFor('money-pressure-no-figures'));
    const known = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const response of scan.quickResponses) {
      expect(known.has(response.promptId), response.promptId).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('it stays subordinate, and stays off Now', () => {
  it('keeps a free-text note out of What Changed', () => {
    const scenario = scenarioById('money-pressure-no-figures');
    const withNote = [
      ...scenario.records,
      anObservation({
        category: 'money',
        privacy: 'money',
        attribute: MONEY_ATTRIBUTES.event,
        value: { kind: 'note', text: 'Placeholder free text written by the owner' },
        occurredAt: scenario.nowIso,
        recordedAt: scenario.nowIso,
      } as never),
    ] as CanonicalRecord[];

    const changes = JSON.stringify(runEpisode(withNote, new Date(scenario.nowIso)).whatChanged);
    expect(changes).not.toContain('Placeholder free text written by the owner');
  });

  it('offers at most one candidate, always beneath the global answer', () => {
    for (const scenario of [
      'money-pressure-no-figures',
      'money-figures-on',
      'money-not-looked',
    ]) {
      const view = panel(scenario);
      expect(required(view.move, 'the move').subordinate, scenario).toBe(true);
    }
  });
});
