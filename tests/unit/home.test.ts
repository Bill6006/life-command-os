import { beforeEach, describe, expect, it } from 'vitest';
import {
  ENVIRONMENT_ACTIONS,
  ENVIRONMENT_ACTION_IDS,
  FORBIDDEN_HOME_VOCABULARY,
  FRICTION_KINDS,
  HOME_ATTRIBUTES,
  frictionAttribute,
  purposeOfAttribute,
} from '../../src/domain/home/environment';
import { HOME_CAPTURES } from '../../src/domain/home/capture';
import { quickCaptureOptions } from '../../src/domain/capture/registry';
import { ALL_PROMPTS, HOME_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { assessHome } from '../../src/intelligence/domains/home/assessHome';
import { generateHomeCandidate } from '../../src/intelligence/domains/home/homeCandidate';
import { buildHomeScan } from '../../src/intelligence/domains/home/scan';
import { summariseHomeCategory } from '../../src/intelligence/domains/home';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import type { CanonicalRecord } from '../../src/domain/records';
import { scenarioById } from '../../src/app/scenarios';
import { anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';

/**
 * Prompt 8G gate: home and environment.
 *
 * The domain most at risk of becoming a different product. Almost every assertion below
 * is about something it refuses to do: name a job, respond to a single bad morning, hold
 * two open items at once, say anything about how a room looks, or raise anything because
 * a week went by.
 */

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function panel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((entry) => entry.domainId === 'home-and-environment'),
    'the home panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessHome(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  const at = new Date(scenario.nowIso);
  return generateHomeCandidate(scenario.records, assessHome(scenario.records, at));
}

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('it is not a cleaning app, and the vocabulary is why', () => {
  it('has no word for how a room looks, anywhere in the domain', () => {
    /*
     * The central assertion of the slice. Every friction is something that happened to an
     * activity; none describes the state of a room. A vocabulary with "messy" in it is
     * one template away from a product that grades somebody's house.
     */
    const domainText = JSON.stringify([
      ENVIRONMENT_ACTIONS,
      HOME_PROMPTS,
      FRICTION_KINDS,
    ]).toLowerCase();

    for (const aesthetic of [
      'tidy',
      'messy',
      'clutter',
      'clean',
      'dirty',
      'housework',
      'chore',
      'wash',
      'hoover',
      'vacuum',
    ]) {
      expect(domainText, aesthetic).not.toContain(aesthetic);
    }
  });

  it('uses no cleaning, scoring, or chore-manager vocabulary on any rendered surface', () => {
    const surfaces = [
      JSON.stringify(ENVIRONMENT_ACTIONS),
      JSON.stringify(HOME_PROMPTS),
      JSON.stringify(panel('home-repeated-friction')),
      JSON.stringify(panel('home-single-friction')),
      JSON.stringify(panel('home-change-open')),
      JSON.stringify(panel('home-change-did-not-hold')),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of FORBIDDEN_HOME_VOCABULARY) {
      expect(surfaces, forbidden).not.toContain(forbidden);
    }
  });

  it('proposes no change of its own, in any action', () => {
    /*
     * Three of the four ask for his change. The fourth names a *time* rather than a
     * thing — set the space up before you need it — which holds whatever the space
     * contains and so prescribes nothing about his house.
     */
    expect(ENVIRONMENT_ACTION_IDS).toHaveLength(4);

    const prescriptive = Object.values(ENVIRONMENT_ACTIONS).filter((action) =>
      /\b(move|buy|throw|put away|install|fit|replace) (the|a|your)\b/i.test(action.statement),
    );
    expect(prescriptive).toEqual([]);

    expect(ENVIRONMENT_ACTIONS['name-one-change'].stoppingPoint).toMatch(
      /A list of jobs is a different app/,
    );
  });

  it('asks nothing about cause, feeling, or how anything looks', () => {
    for (const prompt of HOME_PROMPTS) {
      expect(validatePromptDefinition(prompt), prompt.promptId).toEqual([]);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bfeel\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\blook\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bclean|tidy\b/i);
    }
  });

  it('classifies everything it captures as general data, owned by one surface', () => {
    for (const prompt of HOME_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('general');
      expect(prompt.category, prompt.promptId).toBe('home-and-environment');
      expect(ownerOf(prompt), prompt.promptId).toBeDefined();
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('one occurrence is an event; two is a property of the setup', () => {
  it('needs no new record family to say so', () => {
    /*
     * `LEAN-001`: a domain content family arrives only where it is irreducible. A
     * friction is one observable fact with one value, which the shared observation
     * envelope already carries — and the activity it interrupted rides in the attribute,
     * the device `father:skill:<id>` established.
     */
    expect(frictionAttribute('focused-work')).toBe('home:friction:focused-work');
    expect(frictionAttribute(undefined)).toBe('home:friction');
    expect(purposeOfAttribute('home:friction:learning')).toBe('learning');
    expect(purposeOfAttribute('home:friction')).toBeUndefined();
  });

  it('leaves a purpose unknown rather than guessing one', () => {
    const evidence = evidenceFor('home-repeated-friction');
    const reading = required(
      evidence.frictions.find((entry) => entry.occasions === 4),
      'the repeated friction',
    );

    // Four occasions, three of which named an activity and one of which did not.
    expect(reading.purposes).toEqual(['Focused work', 'Study']);
    expect(reading.purposes).not.toContain('Everyday jobs');
  });

  it('says nothing at all about a friction recorded once', () => {
    const result = candidateFor('home-single-friction');

    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/an event, not a pattern/);

    // And nothing about it reaches any part of the panel that suggests action.
    const view = panel('home-single-friction');
    expect(view.move).toBeUndefined();
    expect(view.bottleneck).toBeUndefined();
  });

  it('offers a change once the same thing has happened twice', () => {
    const result = candidateFor('home-repeated-friction');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('home:name-one-change');
    expect(candidate.reason).toContain('recorded 4 times');
    expect(result.because).toMatch(/A single awkward morning is left alone/);
  });

  it('offers the one action it knows the shape of, when setup cost is what repeats', () => {
    const result = candidateFor('home-change-open');
    // A change is already open here, so the setup action is not what surfaces.
    expect(required(result.candidate, 'the candidate').id).toBe('home:make-the-change');

    // With no change named, repeated setup cost earns the timing action instead.
    const scenario = scenarioById('home-change-open');
    const withoutChange = scenario.records.filter(
      (record) => !('attribute' in record && record.attribute === HOME_ATTRIBUTES.changeNamed),
    );
    const at = new Date(scenario.nowIso);
    const fresh = generateHomeCandidate(withoutChange, assessHome(withoutChange, at));
    expect(required(fresh.candidate, 'the candidate').id).toBe('home:set-it-up-before');
  });
});

/* -------------------------------------------------------------------------- */

describe('one open change, and never a second', () => {
  it('offers the change he named rather than inventing another', () => {
    const candidate = required(candidateFor('home-change-open').candidate, 'the candidate');

    expect(candidate.id).toBe('home:make-the-change');
    expect(candidate.statement).toBe('Make the change you decided on');
    expect(candidate.reason).toContain('Placeholder change written by the owner');
  });

  it('adds nothing while one is open, even with other friction on record', () => {
    const scenario = scenarioById('home-repeated-friction');
    const at = new Date(scenario.nowIso);
    const withChange = [
      ...scenario.records,
      anObservation({
        category: 'home-and-environment',
        privacy: 'general',
        attribute: HOME_ATTRIBUTES.changeNamed,
        value: { kind: 'note', text: 'Placeholder change written by the owner' },
        occurredAt: scenario.nowIso,
        recordedAt: scenario.nowIso,
      } as never),
    ] as CanonicalRecord[];

    const result = generateHomeCandidate(withChange, assessHome(withChange, at));
    expect(required(result.candidate, 'the candidate').id).toBe('home:make-the-change');
    expect(result.because).toMatch(/adding a second job while it is still open/);
  });

  it('says a change did not hold, without reading it as a failure to follow through', () => {
    const result = candidateFor('home-change-did-not-hold');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('home:try-a-different-change');
    expect(result.because).toMatch(/not a verdict on the first attempt/);
    expect(candidate.stoppingPoint).toMatch(/that is worth knowing too/);
  });

  it('measures success by whether the same thing came back, never by completion', () => {
    const evidence = evidenceFor('home-change-did-not-hold');
    expect(evidence.changeMade).toBe(true);
    expect(evidence.frictionSince).toBe('Still happening');

    // Made and unsuccessful are different facts, and the panel keeps them apart.
    const view = panel('home-change-did-not-hold');
    expect(view.metrics).toContainEqual({ label: 'The one change', value: 'Made' });
    expect(view.drivers.join(' ')).toContain('still happening');
  });
});

/* -------------------------------------------------------------------------- */

describe('the visuals, and the one that is still refused', () => {
  it('draws the comparison faith refused, because the bars are rooms and not people', () => {
    const view = panel('home-repeated-friction');

    const bars = required(
      view.visuals.find((visual) => visual.kind === 'bar-comparison'),
      'the comparison',
    );
    expect(bars.decisionValue).toMatch(/fact about the setup rather than about you/);

    const graph = required(
      view.graphs.find((entry) => entry.kind === 'comparison'),
      'the comparison graph',
    );
    expect(graph.bars.map((bar) => bar.value)).toEqual([4, 1]);
  });

  it('refuses a readiness percentage that would divide perfectly well', () => {
    const view = panel('home-repeated-friction');
    const refusal = required(
      view.visuals.find((visual) => visual.decisionQuestion === 'How sorted is my house?'),
      'the meter refusal',
    );

    expect(refusal.kind).toBe('evidence-summary');
    expect(refusal.decisionValue).toMatch(/readiness score for somebody's home/);
    expect(refusal.decisionValue).toMatch(/zero as the implied target/);
  });

  it('never renders a percentage or a meter anywhere in the domain', () => {
    for (const scenario of [
      'home-repeated-friction',
      'home-single-friction',
      'home-change-open',
      'home-change-did-not-hold',
    ]) {
      const view = panel(scenario);
      expect(
        view.visuals.some((visual) => visual.kind === 'meter'),
        scenario,
      ).toBe(false);
      expect(JSON.stringify(view), scenario).not.toMatch(/\b\d{1,3}%/);
    }
  });

  it('keeps a week with nothing recorded as a gap rather than a zero', () => {
    const evidence = evidenceFor('home-change-open');
    const weeks = evidence.weeklyCounts;

    expect(weeks).toHaveLength(6);
    expect(weeks.filter((week) => week.value === null).length).toBeGreaterThan(0);
    expect(weeks.at(-1)?.value).toBe(1);

    /*
     * The distinction that stops the trend flattering him: a fortnight he did not record
     * is not a fortnight without friction, so the trajectory abstains rather than calling
     * it an improvement.
     */
    expect(summariseHomeCategory(evidence).trajectory).toBe('insufficient-evidence');
  });

  it('may say declining, unlike faith, because a setup is not a person', () => {
    expect(summariseHomeCategory(evidenceFor('home-repeated-friction')).trajectory).toBe(
      'declining',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('where the questions are allowed to appear', () => {
  it('lets exactly one question into a guide, and only because it changes eligibility', () => {
    const triggered = HOME_CAPTURES.filter(
      (capture) => capture.captureClass === 'triggered-domain-question',
    );
    expect(triggered.map((capture) => capture.id)).toEqual(['home:conditions']);
    expect(required(triggered[0], 'the triggered capture').canAffectCurrentDecision).toBe(true);
  });

  it('puts no home question into a daily check-in', () => {
    for (const kind of ['morning', 'afternoon', 'evening', 'quick-check-in'] as const) {
      const ids = planGuide(
        kind,
        'full',
        [],
        new Date('2026-08-08T09:00:00.000Z'),
      ).steps.flatMap((step) => (step.kind === 'prompt' ? [step.prompt.promptId] : []));
      expect(
        ids.filter((id) => id.startsWith('home:')),
        kind,
      ).toEqual([]);
    }
  });

  it('is never triggered by time passing', () => {
    /*
     * The chore manager's signature. Every trigger here names something the owner did or
     * recorded; not one names an interval since anything.
     */
    for (const capture of HOME_CAPTURES) {
      for (const trigger of capture.triggers) {
        expect(trigger, capture.id).not.toMatch(/\b(every|each) (day|week|month)\b/i);
        expect(trigger, capture.id).not.toMatch(/\bit has been\b/i);
        expect(trigger, capture.id).not.toMatch(/\boverdue\b/i);
      }
    }
  });

  it('waits a fortnight before asking whether a change held', () => {
    const outcome = required(
      HOME_CAPTURES.find((capture) => capture.id === 'home:friction-again'),
      'the outcome capture',
    );
    expect(outcome.followUpWindowHours).toBe(24 * 14);
    expect(outcome.linkedAction).toBe('home:make-the-change');
  });

  it('offers the unexpected route through Quick Capture only while the area is on', () => {
    expect(
      quickCaptureOptions(['home-and-environment']).map((option) => option.kind),
    ).toContain('Something got in the way');
    expect(quickCaptureOptions([]).map((option) => option.kind)).not.toContain(
      'Something got in the way',
    );
  });

  it('names every prompt it declares, and declares every prompt it names', () => {
    const known = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const capture of HOME_CAPTURES) {
      expect(capture.promptId === undefined || known.has(capture.promptId), capture.id).toBe(
        true,
      );
    }
    const declared = new Set(
      HOME_CAPTURES.flatMap((c) => (c.promptId === undefined ? [] : [c.promptId])),
    );
    for (const prompt of HOME_PROMPTS) {
      expect(declared.has(prompt.promptId), prompt.promptId).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the scan summary, and what it is willing to show', () => {
  it('quotes the change, because a charger on a desk is not a confession', () => {
    /*
     * The deliberate contrast with `buildFaithScan`, which quotes nothing. Withholding is
     * applied where the content warrants it — a blanket rule would make the weekly scan
     * useless without making anything safer.
     */
    const scan = buildHomeScan(evidenceFor('home-change-open'));
    expect(scan.openItem).toBe('Placeholder change written by the owner');
    expect(scan.standing).toBe('1 thing happening more than once');
  });

  it('reports nothing open when there is nothing open', () => {
    const scan = buildHomeScan(evidenceFor('home-single-friction'));
    expect(scan.openItem).toBeUndefined();
    expect(scan.standing).toBe('Recorded, nothing twice');
  });

  it('offers safe quick responses that write through the ordinary path', () => {
    const scan = buildHomeScan(evidenceFor('home-repeated-friction'));
    const known = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const response of scan.quickResponses) {
      expect(known.has(response.promptId), response.promptId).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('it stays subordinate, and stays out of the way', () => {
  it('offers at most one candidate, always beneath the global answer', () => {
    for (const scenario of [
      'home-repeated-friction',
      'home-change-open',
      'home-change-did-not-hold',
    ]) {
      const view = panel(scenario);
      expect(required(view.move, 'the move').subordinate, scenario).toBe(true);
    }
  });

  it('is blocked from a work block and from anyone asleep', () => {
    const candidate = required(candidateFor('home-change-open').candidate, 'the candidate');
    expect([...candidate.blockedByProtectedContexts].sort()).toEqual([
      'commute',
      'sleep',
      'work-focus',
    ]);

    // Not blocked by family or caregiving: setting a space up for the evening is often
    // exactly what belongs in those hours.
    expect(candidate.blockedByProtectedContexts).not.toContain('family');
    expect(candidate.blockedByProtectedContexts).not.toContain('caregiving');
  });

  it('keeps a free-text note out of What Changed on Now', () => {
    const scenario = scenarioById('home-repeated-friction');
    const withNote = [
      ...scenario.records,
      anObservation({
        category: 'home-and-environment',
        privacy: 'general',
        attribute: HOME_ATTRIBUTES.frictionNote,
        value: { kind: 'note', text: 'Placeholder free text written by the owner' },
        occurredAt: scenario.nowIso,
        recordedAt: scenario.nowIso,
      } as never),
    ] as CanonicalRecord[];

    const changes = JSON.stringify(runEpisode(withNote, new Date(scenario.nowIso)).whatChanged);
    expect(changes).not.toContain('Placeholder free text written by the owner');
  });
});
