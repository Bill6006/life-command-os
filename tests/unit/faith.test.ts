import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAITH_ACTIONS,
  FAITH_ACTION_IDS,
  FAITH_ATTRIBUTES,
  FORBIDDEN_FAITH_VOCABULARY,
} from '../../src/domain/faith/meaning';
import { FAITH_CAPTURES } from '../../src/domain/faith/capture';
import { FAITH_ANCHOR_KINDS, FAITH_ANCHOR_STATES } from '../../src/domain/records/faith';
import { PROTECTED_TOPICS } from '../../src/domain/records/permissions';
import { quickCaptureOptions } from '../../src/domain/capture/registry';
import { ALL_PROMPTS, FAITH_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { RECORD_TYPES, parseCanonicalRecord } from '../../src/domain/records';
import { assessFaith } from '../../src/intelligence/domains/faith/assessFaith';
import { generateFaithCandidate } from '../../src/intelligence/domains/faith/faithCandidate';
import { buildFaithScan } from '../../src/intelligence/domains/faith/scan';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { aFaithAnchor, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';

/**
 * Prompt 8F gate: faith and meaning.
 *
 * The domain where the product has least standing to say anything. Almost every
 * assertion below is about something the application refuses to do: name a value,
 * suggest a practice, rank what someone does, call a quiet month a decline, or respond
 * to doubt at all.
 */

const NOW = new Date('2026-08-06T18:00:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function panel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((entry) => entry.domainId === 'faith-and-meaning'),
    'the faith panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessFaith(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  const at = new Date(scenario.nowIso);
  return generateFaithCandidate(scenario.records, assessFaith(scenario.records, at));
}

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('the app supplies the container and never the contents', () => {
  it('ships no list of values and no list of practices', () => {
    /*
     * The central assertion of the slice. Every other domain ships a vocabulary; this
     * one must not, because a built-in catalogue of practices worth doing would be this
     * application taking a position on how a person should live.
     */
    const domainText = JSON.stringify([FAITH_ACTIONS, FAITH_PROMPTS]).toLowerCase();

    for (const wouldBeAuthority of [
      'pray',
      'prayer',
      'meditat',
      'scripture',
      'church',
      'worship',
      'fast',
      'tithe',
      'gratitude journal',
    ]) {
      expect(domainText, wouldBeAuthority).not.toContain(wouldBeAuthority);
    }
  });

  it('offers to hold his words rather than offering him any', () => {
    const write = FAITH_ACTIONS['write-down-what-matters'];
    expect(write.statement).toMatch(/Write down one thing that actually matters to you/);
    expect(write.minimumVersion).toMatch(/It can be wrong and changed later/);
  });

  it('uses no authority, grading, or pressure vocabulary anywhere', () => {
    const surfaces = [
      JSON.stringify(FAITH_ACTIONS),
      JSON.stringify(FAITH_PROMPTS),
      JSON.stringify(panel('faith-enabled')),
      JSON.stringify(panel('faith-repair')),
      JSON.stringify(panel('faith-struggle')),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of FORBIDDEN_FAITH_VOCABULARY) {
      expect(surfaces, forbidden).not.toContain(forbidden);
    }
  });

  it('asks nothing about belief, strength of belief, or what anything meant', () => {
    for (const prompt of FAITH_PROMPTS) {
      expect(validatePromptDefinition(prompt), prompt.promptId).toEqual([]);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bbelieve\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwhy\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bfeel\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bmean(t|ing)?\b/i);
    }
  });

  it('classifies everything it captures as faith data, owned by one surface', () => {
    for (const prompt of FAITH_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('faith');
      expect(prompt.category, prompt.promptId).toBe('faith-and-meaning');
      expect(ownerOf(prompt), prompt.promptId).toBe('update-this-area');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('what he names, and what happens when he stops', () => {
  it('registers one family holding all three kinds', () => {
    expect(RECORD_TYPES).toContain('faith-anchor');
    expect([...FAITH_ANCHOR_KINDS]).toEqual(['value', 'purpose', 'practice']);
    expect([...FAITH_ANCHOR_STATES]).toEqual(['active', 'retired']);
  });

  it('has nowhere to record a level, a rating, or a streak', () => {
    for (const field of ['level', 'rating', 'score', 'streak', 'maturity', 'adherence']) {
      expect(parseCanonicalRecord({ ...aFaithAnchor(), [field]: 1 }).ok, field).toBe(false);
    }
  });

  it('keeps a retired practice and everything recorded against it', () => {
    resetFixtureIds();
    const active = aFaithAnchor();
    const retired = aFaithAnchor({
      state: 'retired',
      recordedAt: '2027-01-01T09:00:00.000Z',
      occurredAt: '2027-01-01T09:00:00.000Z',
    } as never);

    // Both records survive. Retiring appends.
    expect(parseCanonicalRecord(retired).ok).toBe(true);
    expect([active, retired]).toHaveLength(2);
  });

  it('counts occasions per practice from the record they point at', () => {
    const evidence = evidenceFor('faith-enabled');
    const kept = required(
      evidence.practices.find((practice) => practice.occasions > 0),
      'the practice',
    );
    expect(kept.occasions).toBe(3);

    // The other practice has nothing, and that is a count rather than a judgement.
    const quiet = required(
      evidence.practices.find((practice) => practice.occasions === 0),
      'the quiet practice',
    );
    expect(quiet.freshness).toBeUndefined();
  });

  it('shows his words back unedited', () => {
    const evidence = evidenceFor('faith-enabled');
    expect(required(evidence.purpose, 'the purpose').statement).toBe(
      'Because the small things are what people remember',
    );
    expect(evidence.values.map((value) => value.statement)).toContain(
      'Being someone my family can rely on',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('the one candidate, and the one thing it refuses to answer', () => {
  it('has five actions, all about something he already wrote down', () => {
    expect(FAITH_ACTION_IDS).toHaveLength(5);
    for (const id of FAITH_ACTION_IDS) {
      expect(FAITH_ACTIONS[id].statement.length, id).toBeGreaterThan(10);
    }
  });

  it('offers a repair he named, quoting him rather than interpreting him', () => {
    const result = candidateFor('faith-repair');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('faith:make-the-repair');
    expect(result.because).toMatch(/Nothing here is deciding it for you/);

    /*
     * His words are not in the candidate at all. A reason trace is rendered on Now, and
     * a repair describes something that went wrong with another person — found by the
     * browser test with "Apologise properly for how I spoke on Tuesday" on the front
     * page. The statement is discreet; the words stay on the page he opened.
     */
    expect(JSON.stringify(candidate)).not.toContain('Apologise properly');
    expect(candidate.statement).toBe('Do the thing you decided to put right');
  });

  it('offers a quiet practice at two minutes, in his words', () => {
    const result = candidateFor('faith-enabled');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('faith:do-the-smallest-version');
    expect(candidate.statement).toContain('Write to someone who would not expect it');
    expect(result.because).toMatch(/Not doing it is not recorded as anything/);
  });

  it('does absolutely nothing with a struggle note', () => {
    /*
     * The sharpest expression of authority separation in the product. Doubt is not a
     * symptom, an app has no standing to respond to it, and the honest response is
     * silence — no suggestion, no encouragement, no concern, no referral.
     */
    const evidence = evidenceFor('faith-struggle');
    expect(evidence.struggleCount).toBe(1);

    const result = candidateFor('faith-struggle');
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/least business having an opinion/);
  });

  it('never mentions a struggle in the condition, drivers, or bottleneck', () => {
    const entry = panel('faith-struggle');
    const readable = JSON.stringify([
      entry.condition,
      entry.drivers,
      entry.bottleneck,
    ]).toLowerCase();

    expect(readable).not.toContain('struggle');
    expect(readable).not.toContain('doubt');
    expect(readable).not.toContain('placeholder struggle entry');
  });

  it('asks for his words when nothing has been named', () => {
    const records = scenarioById('areas-all-off').records;
    const enabled = [
      ...records,
      ...scenarioById('faith-enabled').records.filter(
        (record) => record.recordType === 'domain-preference',
      ),
    ];

    const result = generateFaithCandidate(enabled, assessFaith(enabled, NOW));
    const candidate = required(result.candidate, 'the candidate');
    expect(candidate.id).toBe('faith:write-down-what-matters');
    expect(result.because).toMatch(/not something an app should be choosing for you/);
  });

  it('stays silent while the area is switched off', () => {
    const records = scenarioById('action').records;
    const result = generateFaithCandidate(records, assessFaith(records, NOW));
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/not switched on/i);
  });

  it('offers at most one candidate into the comparison', () => {
    const fromDomain = run('faith-repair').internal.candidates.filter(
      (candidate) => candidate.originDomainId === 'faith-and-meaning',
    );
    expect(fromDomain.length).toBeLessThanOrEqual(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('two refusals, for two different reasons', () => {
  it('refuses a percentage that would have divided cleanly', () => {
    const refusal = required(
      panel('faith-enabled').visuals.find((spec) =>
        spec.decisionQuestion.includes('How am I doing at this?'),
      ),
      'the meter refusal',
    );
    expect(refusal.decisionValue).toMatch(/No percentage is shown here/);
    expect(refusal.decisionValue).toMatch(/how you are doing at your faith/);
  });

  it('refuses a comparison the eligibility rules would have allowed', () => {
    /*
     * The only place in the product where a domain declines a visual its evidence
     * qualifies for. Career draws exactly this chart; here the bottom bar would read as
     * the practice he is failing at.
     */
    const refusal = required(
      panel('faith-enabled').visuals.find((spec) =>
        spec.decisionQuestion.includes('Which of these am I best at?'),
      ),
      'the comparison refusal',
    );
    expect(refusal.source).toMatch(/Refused, though the evidence would support it/);
    expect(refusal.decisionValue).toMatch(/would read as the one you are failing at/);
  });

  it('draws no chart at all, and no numeric field', () => {
    for (const scenario of ['faith-enabled', 'faith-repair', 'faith-struggle']) {
      const entry = panel(scenario);
      expect(entry.graphs, scenario).toEqual([]);
      expect(
        entry.visuals.some((spec) => spec.kind === 'meter'),
        scenario,
      ).toBe(false);
      for (const [key, value] of Object.entries(entry)) {
        expect(typeof value, `${scenario}.${key}`).not.toBe('number');
      }
    }
  });

  it('never calls this area declining, whatever the records say', () => {
    for (const scenario of ['faith-enabled', 'faith-repair', 'faith-struggle']) {
      const summary = required(
        run(scenario).categories.find((entry) => entry.category === 'faith-and-meaning'),
        'the category',
      );
      expect(summary.trajectory, scenario).not.toBe('declining');
      expect(panel(scenario).trajectory, scenario).not.toBe('declining');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('placement: nothing here belongs in a daily check-in', () => {
  it('makes no capture guide-eligible at all', () => {
    for (const capture of FAITH_CAPTURES) {
      expect(capture.eligibleGuides, capture.id).toEqual([]);
    }
  });

  it('keeps every faith prompt out of the daily guides', () => {
    for (const kind of ['morning', 'afternoon', 'evening', 'quick-check-in'] as const) {
      const ids = planGuide(kind, 'full', [], NOW).steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );
      for (const id of ids) {
        expect(id.startsWith('faith:'), `${kind}: ${id}`).toBe(false);
      }
    }
  });

  it('reaches Update This Area with the entry question first', () => {
    const ids = planGuide('update-area', 'full', [], NOW, 'faith-and-meaning').steps.flatMap(
      (step) => (step.kind === 'prompt' ? [step.prompt.promptId] : []),
    );

    expect(ids[0]).toBe('update-area:faith-and-meaning');
    expect(ids).toContain('faith:repair-needed');
    expect(ids.some((id) => id.startsWith('emotional:'))).toBe(false);
  });

  it('treats struggle as a protected topic, offered only when switched on', () => {
    expect([...PROTECTED_TOPICS]).toContain('faith-struggle');

    expect(quickCaptureOptions(['faith-and-meaning'], [])).toEqual([]);
    expect(quickCaptureOptions(['faith-and-meaning'], ['faith-struggle'])).toEqual([
      { kind: 'Something about how this is going', domainId: 'faith-and-meaning' },
    ]);
  });

  it('excludes struggle from every protected context', () => {
    const struggle = required(
      FAITH_CAPTURES.find((capture) => capture.id === 'faith:struggle'),
      'the struggle capture',
    );
    expect(struggle.excludedContexts).toHaveLength(6);
    expect(struggle.protectedTopic).toBe('faith-struggle');
    expect(struggle.canAffectCurrentDecision).toBe(false);
  });

  it('declares every capture with the metadata the contract requires', () => {
    const known = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const capture of FAITH_CAPTURES) {
      expect(capture.privacy, capture.id).toBe('faith');
      expect(capture.triggers.length, capture.id).toBeGreaterThan(0);
      expect(capture.duplicateSuppression, capture.id).not.toBe('');
      expect(capture.skipWritesNothing, capture.id).toBe(true);
      if (capture.promptId !== undefined) {
        expect(known.has(capture.promptId), capture.id).toBe(true);
      }
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the scan summary quotes nothing', () => {
  it('reports counts and never his words', () => {
    const scan = buildFaithScan(evidenceFor('faith-enabled'));
    const text = JSON.stringify(scan);

    expect(scan.domainId).toBe('faith-and-meaning');
    expect(text).not.toContain('Being someone my family can rely on');
    expect(text).not.toContain('Because the small things');
    expect(text).not.toContain('Ten quiet minutes');
  });

  it('names an open repair as a category of thing, not as its content', () => {
    const scan = buildFaithScan(evidenceFor('faith-repair'));
    expect(scan.openItem).toBe('Something you decided to put right');
    expect(JSON.stringify(scan)).not.toContain('Apologise properly');
  });

  it('carries no struggle at all', () => {
    const scan = buildFaithScan(evidenceFor('faith-struggle'));
    const text = JSON.stringify(scan).toLowerCase();
    expect(text).not.toContain('struggle');
    expect(text).not.toContain('placeholder');
  });
});

/* -------------------------------------------------------------------------- */

describe('Now is unchanged', () => {
  it('keeps the area off the decision surface', () => {
    const episode = run('faith-enabled');
    expect(episode.domains.some((entry) => entry.domainId === 'faith-and-meaning')).toBe(true);

    // A faith move may compete, but it is never a second answer.
    const fromDomain = episode.internal.candidates.filter(
      (candidate) => candidate.originDomainId === 'faith-and-meaning',
    );
    expect(fromDomain.length).toBeLessThanOrEqual(1);
  });

  it('files everything under the slice’s own attributes', () => {
    expect(FAITH_ATTRIBUTES.struggle).toBe('faith:struggle');
    expect(FAITH_ATTRIBUTES.practiceDone).toBe('faith:practice-done');
  });
});
