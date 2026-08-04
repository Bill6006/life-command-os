import { describe, expect, it } from 'vitest';
import {
  CAREER_ACTIONS,
  CAREER_ACTION_IDS,
  FORBIDDEN_CAREER_VOCABULARY,
  LADDER_RUNGS,
  STUDY_BARRIERS,
  barrierIdFor,
  rungFor,
} from '../../src/domain/career/ladder';
import { ALL_PROMPTS, CAREER_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { RECORD_TYPES, parseCanonicalRecord } from '../../src/domain/records';
import { assessCareer, assessClaim } from '../../src/intelligence/domains/career/assessCareer';
import { generateCareerCandidate } from '../../src/intelligence/domains/career/careerCandidate';
import {
  captureAttribute,
  isWorkWin,
  projectionsFor,
} from '../../src/intelligence/domains/captureRouting';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { buildAiExport } from '../../src/application/queries/aiExport';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { aSkillClaim, anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';

/**
 * Phase 7 Prompt 8C gate: Career, Azure, and learning.
 *
 * The theme is the gap between what you would say about yourself and what the records
 * would back up. Most of these tests are about keeping those two things apart.
 */

const NOW = new Date('2026-01-05T17:58:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function careerPanel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((panel) => panel.domainId === 'career-and-learning'),
    'the career panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessCareer(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return generateCareerCandidate(scenario.records, evidenceFor(scenarioId));
}

/**
 * The panel with everything the owner typed removed, leaving only the app's own words.
 *
 * The forbidden-vocabulary rule constrains what the product says, not what the owner
 * says. Someone studying for a certification may well write "finish the identity module"
 * as their next step, and the app must show that back unaltered — see the verbatim test
 * below. Collecting the owner's strings from the records keeps the two apart without
 * exempting whole fields, so app copy that drifts into course vocabulary still fails.
 */
function appAuthoredText(scenarioId: string): string {
  const scenario = scenarioById(scenarioId);
  const ownerWords: string[] = [];

  for (const record of scenario.records as readonly Record<string, unknown>[]) {
    const value = record['value'];
    if (typeof value === 'object' && value !== null && 'text' in value) {
      const { text } = value;
      if (typeof text === 'string') ownerWords.push(text);
    }
    for (const field of ['statement', 'topic']) {
      const text = record[field];
      if (typeof text === 'string') ownerWords.push(text);
    }
  }

  let text = JSON.stringify(careerPanel(scenarioId));
  for (const words of ownerWords) text = text.split(words).join('«owner»');
  return text.toLowerCase();
}

/* -------------------------------------------------------------------------- */

describe('a claim carries no assertion that it is true', () => {
  it('has no field for one, so none can be written', () => {
    resetFixtureIds();
    const withAssertion = { ...aSkillClaim(), proven: true };
    expect(parseCanonicalRecord(withAssertion).ok).toBe(false);

    const withLevel = { ...aSkillClaim(), level: 'advanced' };
    expect(parseCanonicalRecord(withLevel).ok).toBe(false);
  });

  it('is the only domain content family so far', () => {
    expect(RECORD_TYPES.filter((type) => type === 'skill-claim')).toHaveLength(1);
  });

  it('starts unsupported, which is a normal state rather than a problem', () => {
    resetFixtureIds();
    const claim = aSkillClaim();
    const assessment = assessClaim(claim, [claim], NOW);

    expect(assessment.unsupported).toBe(true);
    expect(assessment.earnedRung).toBe('not-started');
    expect(assessment.nextProof).toMatch(/One study session/);
  });
});

/* -------------------------------------------------------------------------- */

describe('the ladder is climbed by evidence, never by assertion', () => {
  it('defines rungs in the order the evidence gets stronger', () => {
    expect([...LADDER_RUNGS]).toEqual([
      'not-started',
      'read-about-it',
      'followed-a-guide',
      'did-it-with-help',
      'did-it-alone',
      'used-it-for-real',
    ]);
  });

  it('returns the rung the evidence supports and no higher', () => {
    const none = {
      studySessions: 0,
      guidedLabs: 0,
      assistedLabs: 0,
      independentLabs: 0,
      realWorkWins: 0,
    };
    expect(rungFor(none)).toBe('not-started');
    expect(rungFor({ ...none, studySessions: 9 })).toBe('read-about-it');
    expect(rungFor({ ...none, studySessions: 9, guidedLabs: 1 })).toBe('followed-a-guide');
    expect(rungFor({ ...none, assistedLabs: 1 })).toBe('did-it-with-help');
    expect(rungFor({ ...none, independentLabs: 1 })).toBe('did-it-alone');
    expect(rungFor({ ...none, realWorkWins: 1 })).toBe('used-it-for-real');
  });

  it('nine study sessions never reach the rung a single lab does', () => {
    // The failure this prevents: hours read counting as capability.
    const readALot = rungFor({
      studySessions: 9,
      guidedLabs: 0,
      assistedLabs: 0,
      independentLabs: 0,
      realWorkWins: 0,
    });
    expect(readALot).toBe('read-about-it');
  });

  it('only counts evidence the claim actually cites', () => {
    resetFixtureIds();
    // A study session on a different topic, not cited by the claim.
    const elsewhere = anObservation({ attribute: 'career:studied' });
    const claim = aSkillClaim();

    expect(assessClaim(claim, [claim, elsewhere], NOW).earnedRung).toBe('not-started');
  });

  it('reaches the top rung from a Work Win the claim cites', () => {
    const panel = careerPanel('career-proven-claim');
    expect(panel.strongestEvidence.join(' ')).toMatch(/evidence supports: Used it for real/);
  });
});

/* -------------------------------------------------------------------------- */

describe('one Work Win, one canonical event', () => {
  it('reaches six surfaces from a single record', () => {
    resetFixtureIds();
    const win = anObservation({
      attribute: captureAttribute('work win', 'career-and-learning'),
      value: { kind: 'note', text: 'Shipped the migration' },
    });

    expect(isWorkWin(win)).toBe(true);
    const surfaces = projectionsFor(win);

    // AT-063: Career, Learning, Timeline, Weekly, and proof projections, one event.
    expect(surfaces).toContain('timeline');
    expect(surfaces).toContain('domain-detail');
    expect(surfaces).toContain('learning');
    expect(surfaces).toContain('weekly-review');
    expect(surfaces).toContain('proof');
    expect(surfaces).toContain('export');
  });

  it('does not give a non-Work-Win capture the proof projection', () => {
    resetFixtureIds();
    const note = anObservation({ attribute: captureAttribute('a friction') });
    expect(isWorkWin(note)).toBe(false);
    expect(projectionsFor(note)).not.toContain('proof');
  });

  it('stores exactly one record for a Work Win used as claim evidence', () => {
    const scenario = scenarioById('career-proven-claim');
    const wins = scenario.records.filter(
      (record) =>
        record.recordType === 'observation' &&
        record.attribute === 'capture:career-and-learning:work-win',
    );
    expect(wins).toHaveLength(1);

    // And the claim cites it rather than copying it.
    const claims = scenario.records.filter((record) => record.recordType === 'skill-claim');
    expect(JSON.stringify(claims)).toContain(required(wins[0], 'the win').recordId);
  });
});

/* -------------------------------------------------------------------------- */

describe('the candidate is one, ordered, and never a task board', () => {
  it('asks for the next step when there is none', () => {
    const result = candidateFor('career-no-next-step');
    expect(required(result.candidate, 'the candidate').id).toBe('career:name-the-next-step');
    expect(result.because).toMatch(/most common reason a session does not start/);
  });

  it('offers resumption over restarting after an interruption', () => {
    const result = candidateFor('career-interrupted');
    expect(required(result.candidate, 'the candidate').id).toBe('career:return-to-it');
    expect(required(result.candidate, 'the candidate').statement).toMatch(
      /Pick up where you stopped/,
    );
  });

  it('names the unsupported claim, and calls the gap useful rather than a failing', () => {
    const result = candidateFor('career-unsupported-claim');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('career:prove-a-claim');
    expect(candidate.statement).toMatch(/hub-and-spoke network/);
    expect(result.because).toMatch(/not a failing/);
  });

  it('says nothing when a next step exists and every claim has evidence', () => {
    const result = candidateFor('career-proven-claim');
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/nothing this area needs to interrupt for/i);
  });

  it('stays silent while the domain is switched off', () => {
    const records = scenarioById('action').records;
    const result = generateCareerCandidate(records, assessCareer(records, NOW));
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/not switched on/i);
  });

  it('has four actions, none of which is progress through material', () => {
    expect([...CAREER_ACTION_IDS]).toEqual([
      'name-the-next-step',
      'return-to-it',
      'prove-a-claim',
      'practise-retrieval',
    ]);

    const text = JSON.stringify(CAREER_ACTIONS).toLowerCase();
    for (const forbidden of FORBIDDEN_CAREER_VOCABULARY) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  it('hosts no course content and builds no second task board, anywhere on the panel', () => {
    for (const scenario of [
      'career-no-next-step',
      'career-unsupported-claim',
      'career-proven-claim',
      'career-interrupted',
    ]) {
      const text = appAuthoredText(scenario);
      for (const forbidden of FORBIDDEN_CAREER_VOCABULARY) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  it('shows the owner’s own wording back unaltered, course vocabulary and all', () => {
    // `career-interrupted` records the next step as "Finish the identity module
    // walkthrough". The app does not host modules, but it does not edit the owner
    // either: their words are evidence, and paraphrasing them would make the record
    // wrong. The rule above governs the product's voice, not theirs.
    const panel = careerPanel('career-interrupted');
    const shown = [...panel.drivers, panel.move?.candidate.statement ?? ''].join(' ');
    expect(shown).toContain('Finish the identity module walkthrough');
  });

  it('offers at most one career candidate into the comparison', () => {
    const episode = run('career-no-next-step');
    const fromCareer = episode.internal.candidates.filter(
      (candidate) => candidate.originDomainId === 'career-and-learning',
    );
    expect(fromCareer.length).toBeLessThanOrEqual(1);
  });
});

/* -------------------------------------------------------------------------- */

describe('barriers are recorded behaviourally, never as a self-diagnosis', () => {
  it('keeps the Blueprint taxonomy while wording it as what happened', () => {
    const ids = STUDY_BARRIERS.map((barrier) => barrier.id);
    // The taxonomy survives, including the two the Blueprint names psychologically.
    expect(ids).toContain('felt-too-big');
    expect(ids).toContain('kept-preparing');

    // The visible words never ask the owner to accept a label about themselves.
    const labels = STUDY_BARRIERS.map((barrier) => barrier.label.toLowerCase()).join(' ');
    expect(labels).not.toContain('fear');
    expect(labels).not.toContain('afraid');
    expect(labels).not.toContain('perfectionis');
    expect(labels).not.toContain('procrastinat');
    expect(labels).not.toContain('lazy');
    expect(labels).not.toContain('avoidance');
  });

  it('maps a visible label back to its taxonomy id for later learning', () => {
    expect(barrierIdFor('Getting set up takes too long')).toBe('setup-cost');
    expect(barrierIdFor('not a real label')).toBeUndefined();
  });

  it('asks what was in the way, never why', () => {
    const prompt = required(
      CAREER_PROMPTS.find((entry) => entry.promptId === 'career:barrier'),
      'the barrier prompt',
    );
    expect(prompt.text).toBe('What was in the way?');
    expect(validatePromptDefinition(prompt)).toEqual([]);
  });

  it('names a recurring obstacle without inferring a cause', () => {
    const panel = careerPanel('career-recurring-barrier');
    expect(panel.bottleneck).toMatch(/recurring obstacle/i);

    const barriers = panel.graphs.find((graph) => graph.id === 'career-barriers');
    expect(required(barriers, 'the barrier chart').uncertainty).toMatch(
      /says what recurs, not why/,
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('visuals: the same rules, the opposite answer to health', () => {
  it('earns a meter, because claims have a real denominator', () => {
    const panel = careerPanel('career-unsupported-claim');
    const meter = panel.visuals.find((spec) => spec.kind === 'meter');

    expect(meter).toBeDefined();
    expect(required(meter, 'the meter').decisionQuestion).toMatch(
      /How much of what I would say could I show/,
    );
    // Health refused a meter on the same rules. The difference is the evidence.
    expect(required(meter, 'the meter').units).toMatch(/out of claims made/);
  });

  it('carries what the meter draws with, not only the declaration', () => {
    // An earned meter with no data renders as an evidence summary labelled "Not shown
    // here" — the refusal wording — which is the opposite of what it means. Health
    // refused both of these, so career is the first slice where the difference shows.
    const meter = required(
      careerPanel('career-unsupported-claim').visuals.find((spec) => spec.kind === 'meter'),
      'the meter',
    );
    expect(meter.data).toMatchObject({ kind: 'meter', percent: 0 });

    const stage = required(
      careerPanel('career-proven-claim').visuals.find((spec) => spec.kind === 'stage-path'),
      'the stage path',
    );
    expect(stage.data).toMatchObject({ kind: 'stage-path', currentIndex: 5 });
  });

  it('earns a stage path, which health could not', () => {
    const panel = careerPanel('career-proven-claim');
    const stage = panel.visuals.find((spec) => spec.kind === 'stage-path');
    expect(stage).toBeDefined();
    expect(required(stage, 'the stage path').decisionValue).toMatch(/rather than "study more"/);
  });

  it('shows no meter at all when no claim has been made', () => {
    const panel = careerPanel('career-no-next-step');
    expect(panel.visuals.find((spec) => spec.kind === 'meter')).toBeUndefined();
  });

  it('treats a week with no recall check as a gap, not a failure', () => {
    const panel = careerPanel('career-proven-claim');
    const trend = required(
      panel.graphs.find((graph) => graph.id === 'career-retrieval'),
      'the retrieval trend',
    );
    expect(trend.missingDataTreatment).toMatch(/not a week you failed/);
    if (trend.kind === 'trend') {
      expect(trend.points.some((point) => point.value === null)).toBe(true);
      expect(trend.points.some((point) => point.value === 0)).toBe(false);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('an unsupported claim cannot be exported as true', () => {
  it('is exported as claimed and undemonstrated', () => {
    resetFixtureIds();
    const claim = aSkillClaim({ privacy: 'general' } as never);
    const result = buildAiExport(
      [claim],
      { range: { kind: 'all' }, includeClasses: ['general'] },
      NOW,
    );

    expect(result.markdown).toMatch(/Claimed, nothing behind it yet/);
    expect(result.markdown).toMatch(/This has not been demonstrated/);
    expect(result.markdown).toMatch(/A claim is never exported as true/);
  });

  it('reports how much supports a claim rather than whether it is true', () => {
    resetFixtureIds();
    const claim = aSkillClaim({
      privacy: 'general',
      supportingRecordIds: ['00000000-0000-4000-8000-000000009100'],
    } as never);

    const result = buildAiExport(
      [claim],
      { range: { kind: 'all' }, includeClasses: ['general'] },
      NOW,
    );

    expect(result.markdown).toMatch(/with 1 supporting record/);
    expect(result.markdown).not.toMatch(/\bproven\b/i);
    expect(result.markdown).not.toMatch(/\bverified\b/i);
  });

  it('withholds claims entirely by default, because they are workplace data', () => {
    resetFixtureIds();
    const claim = aSkillClaim({ privacy: 'workplace' } as never);
    const result = buildAiExport(
      [claim],
      { range: { kind: 'all' }, includeClasses: ['general'] },
      NOW,
    );

    expect(result.withheldCount).toBe(1);
    expect(result.markdown).not.toContain('Activity One end to end');
  });
});

/* -------------------------------------------------------------------------- */

describe('Update This Area, for career', () => {
  it('exists and is owned by exactly one surface', () => {
    const entry = required(
      ALL_PROMPTS.find((prompt) => prompt.promptId === 'update-area:career-and-learning'),
      'the entry prompt',
    );
    expect(ownerOf(entry)).toBe('update-this-area');
    for (const prompt of CAREER_PROMPTS) {
      expect(ownerOf(prompt), prompt.promptId).toBe('update-this-area');
    }
  });

  it('asks only career questions, entry question first', () => {
    const plan = planGuide('update-area', 'full', [], NOW, 'career-and-learning');
    const ids = plan.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );

    expect(ids[0]).toBe('update-area:career-and-learning');
    expect(ids).toContain('career:next-step');
    expect(ids).toContain('career:barrier');
    // Nothing from another area, and nothing from the morning.
    expect(ids.some((id) => id.startsWith('health:'))).toBe(false);
    expect(ids).not.toContain('state:energy');
  });

  it('does not lengthen the morning check-in', () => {
    const morning = planGuide('morning', 'full', [], NOW);
    const ids = morning.steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );
    for (const id of ids) expect(id.startsWith('career:')).toBe(false);
  });

  it('classifies everything it captures as workplace data', () => {
    for (const prompt of CAREER_PROMPTS) {
      expect(prompt.privacy, prompt.promptId).toBe('workplace');
      expect(prompt.category, prompt.promptId).toBe('career-work-learning');
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('the slice adds no second truth', () => {
  it('reads the category that already existed rather than making one', () => {
    const scenario = scenarioById('career-unsupported-claim');
    for (const record of scenario.records) {
      expect(parseCanonicalRecord(record).ok, record.recordType).toBe(true);
    }
    // The category overview still says what it always said about focused work,
    // separately from what the domain says about evidence.
    const episode = run('career-unsupported-claim');
    const category = required(
      episode.categories.find((entry) => entry.category === 'career-work-learning'),
      'the career category',
    );
    expect(category.condition).toMatch(/focused work/i);
    expect(careerPanel('career-unsupported-claim').condition).toMatch(/nothing behind/i);
  });

  it('keeps career off Now unless its move actually won', () => {
    const episode = run('career-proven-claim');
    if (episode.output.kind === 'action') {
      expect(episode.output.candidate.originDomainId).not.toBe('career-and-learning');
    }
  });

  it('leaves the panel with no numeric field that reads as a score', () => {
    const panel = careerPanel('career-proven-claim');
    for (const [key, value] of Object.entries(panel)) {
      expect(typeof value, `${key} is a number`).not.toBe('number');
    }
  });
});
