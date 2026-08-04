import { beforeEach, describe, expect, it } from 'vitest';
import {
  FORBIDDEN_FATHERHOOD_VOCABULARY,
  MILESTONE_CATALOGUE,
  SKILL_LEVELS,
  movedForward,
  skillAttribute,
  skillLevelIndex,
} from '../../src/domain/fatherhood/development';
import {
  FATHERHOOD_ACTIONS,
  FATHERHOOD_ACTION_IDS,
  TINY_LESSONS,
  lessonFor,
} from '../../src/domain/fatherhood/actions';
import { FATHERHOOD_CAPTURES } from '../../src/domain/fatherhood/capture';
import {
  CAPTURE_CLASSES,
  assertContextualCaptures,
  validateContextualCapture,
  type ContextualCapture,
} from '../../src/domain/capture/contextualCapture';
import { quickCaptureOptions } from '../../src/domain/capture/registry';
import {
  MILESTONE_STATUSES,
  REPORTABLE_MILESTONE_STATUSES,
} from '../../src/domain/records/fatherhood';
import { ALL_PROMPTS, FATHERHOOD_PROMPTS, UNSURE } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { RECORD_TYPES, parseCanonicalRecord } from '../../src/domain/records';
import { observedValueFor } from '../../src/application/commands/capture';
import { assessFatherhood } from '../../src/intelligence/domains/fatherhood/assessFatherhood';
import { generateFatherhoodCandidate } from '../../src/intelligence/domains/fatherhood/fatherhoodCandidate';
import { projectionsFor } from '../../src/intelligence/domains/captureRouting';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { aMilestoneObservation, anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';

/**
 * Phase 7 Prompt 8D gate: Fatherhood and child development.
 *
 * The domain where the wrong feature would do the most harm. Most of these tests are
 * about things that must **not** exist: a score for a child, a Dad action that moves her
 * status, a milestone question in a morning flow, a name in a fixture.
 */

const NOW = new Date('2026-01-05T17:58:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function panel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((entry) => entry.domainId === 'fatherhood'),
    'the fatherhood panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessFatherhood(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  const at = new Date(scenario.nowIso);
  return generateFatherhoodCandidate(
    scenario.records,
    assessFatherhood(scenario.records, at),
    at,
  );
}

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('the two ladders stay apart', () => {
  it('registers one new family, for the checklist answer only', () => {
    expect(RECORD_TYPES).toContain('milestone-observation');
    // The personal ladder needed no family: it is an ordinary observation.
    expect(RECORD_TYPES.some((type) => type.includes('skill-level'))).toBe(false);
  });

  it('stores the list and its revision with every answer', () => {
    const record = aMilestoneObservation();
    expect(parseCanonicalRecord(record).ok).toBe(true);

    const { checklistSource, ...noSource } = aMilestoneObservation();
    expect(checklistSource).toBeTruthy();
    expect(parseCanonicalRecord(noSource).ok, 'checklistSource').toBe(false);

    const { checklistVersion, ...noVersion } = aMilestoneObservation();
    expect(checklistVersion).toBeTruthy();
    expect(parseCanonicalRecord(noVersion).ok, 'checklistVersion').toBe(false);
  });

  it('has nowhere to put a score, a level, or a conclusion', () => {
    for (const field of ['score', 'percentile', 'ageEquivalent', 'level', 'assessment']) {
      const withExtra = { ...aMilestoneObservation(), [field]: 1 };
      expect(parseCanonicalRecord(withExtra).ok, field).toBe(false);
    }
  });

  it('never stores "not assessed" — that is the absence of a record', () => {
    expect([...MILESTONE_STATUSES]).toContain('not-assessed');
    expect([...REPORTABLE_MILESTONE_STATUSES]).not.toContain('not-assessed');
    expect(
      parseCanonicalRecord({ ...aMilestoneObservation(), status: 'not-assessed' }).ok,
    ).toBe(false);
  });

  it('keeps a milestone answer and a skill reading in different places entirely', () => {
    const evidence = evidenceFor('fatherhood-enabled');
    expect(evidence.milestones.length).toBeGreaterThan(0);
    expect(evidence.skills.length).toBeGreaterThan(0);

    const milestoneIds = new Set(evidence.milestones.map((entry) => entry.milestoneId));
    for (const skill of evidence.skills) {
      expect(milestoneIds.has(skill.skillId), skill.skillId).toBe(false);
    }
  });

  it('keeps both answers when a milestone changes, rather than superseding', () => {
    // "Not yet" in March and "yes" in June are both true. The change between them is
    // the only developmental information in the pair.
    const first = aMilestoneObservation({
      status: 'not-yet',
      occurredAt: '2026-03-01T09:00:00.000Z',
      recordedAt: '2026-03-01T09:00:00.000Z',
    });
    const second = aMilestoneObservation({
      status: 'yes',
      occurredAt: '2026-06-01T09:00:00.000Z',
      recordedAt: '2026-06-01T09:00:00.000Z',
    });
    expect(second.supersedesRecordId).toBeUndefined();

    const evidence = assessFatherhood([first, second], NOW);
    expect(evidence.milestones).toHaveLength(1);
    expect(required(evidence.milestones[0], 'the reading').status).toBe('yes');
  });
});

/* -------------------------------------------------------------------------- */

describe('a Dad action cannot move her status', () => {
  it('writes nothing about the child, structurally', () => {
    // Every action is about the father. None carries a milestone id, a status, or a
    // skill level, so there is no code path from "I did this" to "she can do this".
    const text = JSON.stringify(FATHERHOOD_ACTIONS);
    for (const forbidden of ['milestoneId', 'status', 'skillLevel', 'checklistSource']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it('records a practised skill and her level as separate observations', () => {
    const evidence = evidenceFor('fatherhood-enabled');
    const practising = required(
      evidence.skills.find((skill) => skill.skillId === 'putting-things-away'),
      'the skill',
    );
    // The reading is the owner's observation of her, filed under her skill. The action
    // he took is a separate execution record entirely.
    expect(skillAttribute(practising.skillId)).toBe('father:skill:putting-things-away');
  });

  it('proposes a lesson without asserting anything about what she can do', () => {
    const result = candidateFor('fatherhood-enabled');
    const candidate = required(result.candidate, 'the candidate');
    expect(candidate.id).toBe('fatherhood:tiny-lesson');
    expect(candidate.statement.toLowerCase()).not.toMatch(/she (can|cannot|should)/);
  });
});

/* -------------------------------------------------------------------------- */

describe('no score for a child, anywhere', () => {
  it('refuses a percentage even though one could be calculated', () => {
    const refusal = required(
      panel('fatherhood-enabled').visuals.find((spec) =>
        spec.decisionQuestion.includes('How far along'),
      ),
      'the refusal',
    );
    expect(refusal.decisionValue).toMatch(/No percentage is shown here/);
    expect(refusal.decisionValue).toMatch(/would be a score for a child/);
  });

  it('draws no meter, in any state', () => {
    for (const scenario of ['fatherhood-enabled', 'fatherhood-concern', 'fatherhood-quiet']) {
      const specs = panel(scenario).visuals;
      expect(
        specs.some((spec) => spec.kind === 'meter'),
        scenario,
      ).toBe(false);
      expect(
        specs.some((spec) => spec.data?.kind === 'meter'),
        scenario,
      ).toBe(false);
    }
  });

  it('has no numeric field on the panel at all', () => {
    for (const [key, value] of Object.entries(panel('fatherhood-enabled'))) {
      expect(typeof value, `${key} is a number`).not.toBe('number');
    }
  });

  it('uses no assessment or blame vocabulary, anywhere in the domain', () => {
    const surfaces = [
      JSON.stringify(FATHERHOOD_ACTIONS),
      JSON.stringify(FATHERHOOD_PROMPTS),
      JSON.stringify(TINY_LESSONS),
      JSON.stringify(panel('fatherhood-enabled')),
      JSON.stringify(panel('fatherhood-concern')),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of FORBIDDEN_FATHERHOOD_VOCABULARY) {
      expect(surfaces, forbidden).not.toContain(forbidden);
    }
  });

  it('earns a stage path for one skill, not a rating across all of them', () => {
    const stage = required(
      panel('fatherhood-enabled').visuals.find((spec) => spec.kind === 'stage-path'),
      'the stage path',
    );
    expect(stage.data).toMatchObject({ kind: 'stage-path' });
    expect(stage.decisionQuestion).toMatch(/How much help does/);
    expect(stage.units).toMatch(/never a percentage/);
  });
});

/* -------------------------------------------------------------------------- */

describe('one moment, one canonical record', () => {
  it('reaches every projection from a single Quick Capture write', () => {
    const scenario = scenarioById('fatherhood-enabled');
    const moments = scenario.records.filter(
      (record) =>
        record.recordType === 'observation' &&
        record.attribute.startsWith('capture:fatherhood:'),
    );
    expect(moments).toHaveLength(1);

    const moment = required(moments[0], 'the moment');
    if (moment.recordType !== 'observation') throw new Error('not an observation');

    const surfaces = projectionsFor(moment);
    expect(surfaces).toContain('timeline');
    expect(surfaces).toContain('domain-detail');
    expect(surfaces).toContain('weekly-review');
    expect(surfaces).toContain('export');
    // And it is not a Work Win, so it does not get career's proof projection.
    expect(surfaces).not.toContain('proof');
  });

  it('is offered only while the area is switched on', () => {
    expect(quickCaptureOptions([])).toEqual([]);
    expect(quickCaptureOptions(['career-and-learning'])).toEqual([]);
    expect(quickCaptureOptions(['fatherhood'])).toEqual([
      { kind: 'A moment with my daughter', domainId: 'fatherhood' },
    ]);
  });

  it('counts one event once however many surfaces show it', () => {
    const evidence = evidenceFor('fatherhood-enabled');
    expect(evidence.momentsCaptured).toHaveLength(1);
    expect(panel('fatherhood-enabled').metrics).toContainEqual({
      label: 'Moments kept',
      value: '1',
    });
  });
});

/* -------------------------------------------------------------------------- */

describe('the contextual-capture metadata', () => {
  const knownPrompts = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));

  it('declares every required field for every capture', () => {
    expect(FATHERHOOD_CAPTURES.length).toBeGreaterThan(0);

    for (const capture of FATHERHOOD_CAPTURES) {
      expect([...CAPTURE_CLASSES], capture.id).toContain(capture.captureClass);
      expect(capture.recordFamily, capture.id).toBeTruthy();
      expect(capture.owningSurface, capture.id).toBeTruthy();
      expect(capture.triggers.length, capture.id).toBeGreaterThan(0);
      expect(capture.privacy, capture.id).toBe('child');
      expect(capture.excludedContexts.length, capture.id).toBeGreaterThan(0);
      expect(capture.duplicateSuppression, capture.id).not.toBe('');
      expect(capture.skipWritesNothing, capture.id).toBe(true);
      expect(typeof capture.canAffectCurrentDecision, capture.id).toBe('boolean');
      expect(capture.parentingContext, capture.id).toBeTruthy();
    }
  });

  it('passes its own validator, which runs at import', () => {
    expect(() => {
      assertContextualCaptures(FATHERHOOD_CAPTURES, knownPrompts);
    }).not.toThrow();
  });

  it('keeps every child question out of a work context', () => {
    for (const capture of FATHERHOOD_CAPTURES) {
      expect(capture.excludedContexts, capture.id).toContain('work-focus');
    }
  });

  it('gives every action follow-up a linked action, a window, and an expiry', () => {
    const followUps = FATHERHOOD_CAPTURES.filter(
      (capture) => capture.captureClass === 'action-follow-up',
    );
    expect(followUps.length).toBeGreaterThan(0);

    for (const capture of followUps) {
      expect(capture.linkedAction, capture.id).toBeTruthy();
      expect(capture.followUpWindowHours, capture.id).toBeGreaterThan(0);
      // It expires rather than being chased: recall is worse evidence than nothing.
      expect(required(capture.expiresAfterHours, capture.id)).toBeLessThanOrEqual(48);
    }
  });

  it('rejects a triggered question whose answer changes nothing', () => {
    const nagging: ContextualCapture = {
      ...required(FATHERHOOD_CAPTURES[0], 'a capture'),
      id: 'test:nagging',
      captureClass: 'triggered-domain-question',
      canAffectCurrentDecision: false,
    };
    expect(
      validateContextualCapture(nagging, knownPrompts).map((violation) => violation.code),
    ).toContain('trigger-without-decision-value');
  });

  it('rejects milestone review being put on a guide', () => {
    const onAGuide: ContextualCapture = {
      ...required(FATHERHOOD_CAPTURES[0], 'a capture'),
      id: 'test:milestone-on-guide',
      recordFamily: 'milestone-observation',
      captureClass: 'guide-recurring',
      owningSurface: 'guide',
      eligibleGuides: ['morning'],
    };
    expect(
      validateContextualCapture(onAGuide, knownPrompts).map((violation) => violation.code),
    ).toContain('milestone-in-daily-guide');
  });

  it('rejects a capture naming a prompt that does not exist', () => {
    const ghost: ContextualCapture = {
      ...required(FATHERHOOD_CAPTURES[0], 'a capture'),
      id: 'test:ghost',
      promptId: 'father:how-did-that-feel',
    };
    expect(
      validateContextualCapture(ghost, knownPrompts).map((violation) => violation.code),
    ).toContain('unknown-prompt');
  });

  it('routes each entry path to exactly one canonical family', () => {
    // Milestones to their own family, everything else to a shared observation. No
    // capture writes two, and no two captures write the same event.
    const milestoneCaptures = FATHERHOOD_CAPTURES.filter(
      (capture) => capture.recordFamily === 'milestone-observation',
    );
    expect(milestoneCaptures).toHaveLength(1);

    const promptIds = FATHERHOOD_CAPTURES.flatMap((capture) =>
      capture.promptId === undefined ? [] : [capture.promptId],
    );
    expect(new Set(promptIds).size).toBe(promptIds.length);
  });
});

/* -------------------------------------------------------------------------- */

describe('milestone review never reaches a daily guide', () => {
  it('is absent from morning, afternoon, and evening', () => {
    for (const kind of ['morning', 'afternoon', 'evening', 'quick-check-in'] as const) {
      const plan = planGuide(kind, 'full', [], NOW);
      const ids = plan.steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );
      for (const id of ids) {
        expect(id.startsWith('father:'), `${kind}: ${id}`).toBe(false);
      }
    }
  });

  it('is reachable from Update This Area, with the entry question first', () => {
    const plan = planGuide('update-area', 'full', [], NOW, 'fatherhood');
    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );

    expect(ids[0]).toBe('update-area:fatherhood');
    expect(ids).toContain('father:milestone-status');
    expect(ids).toContain('father:skill-level');
    expect(ids.some((id) => id.startsWith('career:'))).toBe(false);
    expect(ids.some((id) => id.startsWith('health:'))).toBe(false);
  });

  it('does not lengthen the morning check-in', () => {
    const morning = planGuide('morning', 'full', [], NOW);
    expect(morning.steps.length).toBeLessThanOrEqual(10);
    const ids = morning.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    expect(ids).not.toContain('father:milestone-status');
  });
});

/* -------------------------------------------------------------------------- */

describe('questions are observable, and skipping costs nothing', () => {
  it('asks nothing about cause, feeling, or whether it worked', () => {
    for (const prompt of FATHERHOOD_PROMPTS) {
      expect(validatePromptDefinition(prompt), prompt.promptId).toEqual([]);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwhy\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bfeel\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwork(ed)?\b/i);
    }
  });

  it('offers Unsure everywhere it could be needed', () => {
    for (const prompt of FATHERHOOD_PROMPTS) {
      if (prompt.kind === 'preference') continue;
      expect(prompt.answers.includes(UNSURE) || prompt.allowsUnknown, prompt.promptId).toBe(
        true,
      );
    }
  });

  it('writes nothing for a skipped question and something for a deliberate Unsure', () => {
    const prompt = required(
      FATHERHOOD_PROMPTS.find((entry) => entry.promptId === 'father:child-tried'),
      'the prompt',
    );
    expect(observedValueFor(prompt, { kind: 'not-answered' })).toBeUndefined();
    expect(observedValueFor(prompt, { kind: 'unsure' })).toMatchObject({ kind: 'unsure' });
  });

  it('classifies everything it captures as child data', () => {
    for (const prompt of FATHERHOOD_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('child');
      expect(prompt.category, prompt.promptId).toBe('fatherhood-and-child');
      expect(ownerOf(prompt), prompt.promptId).toBe('update-this-area');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the one candidate, and when it stays silent', () => {
  it('has five actions, one of which is to stop having a view', () => {
    expect([...FATHERHOOD_ACTION_IDS]).toEqual([
      'tiny-lesson',
      'follow-her-lead',
      'protect-the-wind-down',
      'repair-after-a-hard-moment',
      'raise-it-with-someone-qualified',
    ]);
  });

  it('defers to a person when something noticed has not gone away', () => {
    const result = candidateFor('fatherhood-concern');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('fatherhood:raise-it-with-someone-qualified');
    expect(candidate.statement).toMatch(/health visitor or GP/);
    expect(result.because).toMatch(/no view on what it means/);

    // And it interprets nothing on the way there.
    const text = JSON.stringify(candidate).toLowerCase();
    for (const forbidden of ['could be', 'sounds like', 'suggests that', 'may indicate']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it('says nothing when time together is recent and nothing is mid-practice', () => {
    const result = candidateFor('fatherhood-quiet');
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/most likely to be right without the app saying anything/);
  });

  it('stays silent while the area is switched off', () => {
    const records = scenarioById('action').records;
    const result = generateFatherhoodCandidate(records, assessFatherhood(records, NOW), NOW);
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/not switched on/i);
  });

  it('offers at most one candidate into the comparison', () => {
    const episode = run('fatherhood-concern');
    const fromDomain = episode.internal.candidates.filter(
      (candidate) => candidate.originDomainId === 'fatherhood',
    );
    expect(fromDomain.length).toBeLessThanOrEqual(1);
  });

  it('is never blocked by the contexts in which it belongs', () => {
    const candidate = required(candidateFor('fatherhood-enabled').candidate, 'the candidate');
    expect(candidate.blockedByProtectedContexts).not.toContain('family');
    expect(candidate.blockedByProtectedContexts).not.toContain('caregiving');
    expect(candidate.blockedByProtectedContexts).toContain('work-focus');
  });

  it('carries a lesson with a reason, a minimum, and a stopping point', () => {
    const lesson = required(lessonFor('taking-turns'), 'the lesson');
    expect(lesson.whyItMatters.length).toBeGreaterThan(20);
    expect(lesson.minimumVersion.length).toBeGreaterThan(0);
    expect(lesson.stoppingPoint.length).toBeGreaterThan(0);

    const action = FATHERHOOD_ACTIONS['tiny-lesson'];
    expect(action.followUpPromptId).toBe('father:lesson-happened');
    expect(action.minimumMinutes).toBeLessThan(action.durationMinutes);
  });
});

/* -------------------------------------------------------------------------- */

describe('the ladder, and what absence means', () => {
  it('is ordered by how much of the doing is hers', () => {
    expect([...SKILL_LEVELS]).toEqual([
      'not-introduced',
      'exposed-through-play',
      'practising-with-daddy',
      'needs-support',
      'doing-sometimes',
      'doing-often',
      'uses-on-her-own',
    ]);
    expect(skillLevelIndex('uses-on-her-own')).toBeGreaterThan(
      skillLevelIndex('practising-with-daddy'),
    );
    expect(movedForward('needs-support', 'doing-often')).toBe(true);
    expect(movedForward('doing-often', 'needs-support')).toBe(false);
  });

  it('treats a skill with no reading as no reading, never as the first rung', () => {
    const evidence = evidenceFor('fatherhood-enabled');
    expect(evidence.untouchedSkills.length).toBeGreaterThan(0);
    expect(evidence.skills.some((skill) => skill.level === 'not-introduced')).toBe(false);

    const stage = required(
      panel('fatherhood-enabled').visuals.find((spec) => spec.kind === 'stage-path'),
      'the stage path',
    );
    expect(stage.missingData).toMatch(/not the first rung by default/);
  });

  it('reports movement without inventing a rate', () => {
    const reading = required(
      evidenceFor('fatherhood-enabled').skills.find(
        (skill) => skill.skillId === 'taking-turns',
      ),
      'the reading',
    );
    expect(reading.previous).toBe('needs-support');
    expect(reading.level).toBe('doing-sometimes');
    expect(panel('fatherhood-enabled').condition).toMatch(/needing less help than last time/);
  });

  it('ships a checklist without reproducing anybody’s published material', () => {
    expect(MILESTONE_CATALOGUE.length).toBeGreaterThan(0);
    for (const entry of MILESTONE_CATALOGUE) {
      expect(entry.text.length, entry.id).toBeLessThan(60);
      expect(entry.ageBand, entry.id).toMatch(/^around /);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('privacy: no child’s name reaches the repository', () => {
  it('refers to the child generically until the owner sets a name', () => {
    const evidence = evidenceFor('fatherhood-enabled');
    expect(evidence.displayName).toBeUndefined();
    expect(panel('fatherhood-enabled').northStarContribution).toContain('your daughter');
  });

  it('uses a name the owner set, without that name existing anywhere in the repository', () => {
    resetFixtureIds();
    const named = anObservation({
      attribute: 'father:display-name',
      category: 'fatherhood-and-child',
      privacy: 'child',
      value: { kind: 'note', text: 'Placeholder' },
    });
    expect(assessFatherhood([named], NOW).displayName).toBe('Placeholder');
  });

  it('classifies every fatherhood record as child data', () => {
    const scenario = scenarioById('fatherhood-enabled');
    for (const record of scenario.records) {
      if (
        record.recordType === 'milestone-observation' ||
        ('category' in record && record.category === 'fatherhood-and-child')
      ) {
        expect(record.privacy, record.recordId).toBe('child');
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('Now is unchanged by any of it', () => {
  it('keeps the domain off the decision surface', () => {
    const episode = run('fatherhood-concern');
    if (episode.output.kind === 'action') {
      // A fatherhood move may win the comparison, but it is never a second answer.
      expect(episode.internal.candidates.length).toBeGreaterThan(0);
    }
    expect(episode.categories.every((entry) => entry.category !== 'fatherhood-and-child')).toBe(
      false,
    );
  });

  it('adds no domain dashboard', () => {
    const episode = run('fatherhood-enabled');
    expect(episode.domains).toHaveLength(1);
    expect(required(episode.domains[0], 'the panel').domainId).toBe('fatherhood');
  });
});
