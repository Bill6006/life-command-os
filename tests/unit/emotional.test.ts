import { beforeEach, describe, expect, it } from 'vitest';
import {
  EMOTIONAL_ACTIONS,
  EMOTIONAL_ACTION_IDS,
  FORBIDDEN_EMOTIONAL_VOCABULARY,
} from '../../src/domain/emotional/regulation';
import {
  CONNECTION_KINDS,
  EMOTIONAL_ATTRIBUTES,
  SOCIAL_PRACTICES,
} from '../../src/domain/emotional/social';
import {
  TOPIC_ENABLED_ATTRIBUTE,
  enabledTopics,
  grantedSurfaces,
  maySurface,
  topicEnabled,
} from '../../src/domain/emotional/permissions';
import { PERMISSIBLE_SURFACES, PROTECTED_TOPICS } from '../../src/domain/records/permissions';
import { EMOTIONAL_CAPTURES } from '../../src/domain/emotional/capture';
import { quickCaptureOptions } from '../../src/domain/capture/registry';
import { EMOTIONAL_PROMPTS, ALL_PROMPTS } from '../../src/domain/prompts/definitions';
import { ownerOf } from '../../src/domain/prompts/ownership';
import { validatePromptDefinition } from '../../src/domain/prompts/policy';
import { RECORD_TYPES, parseCanonicalRecord } from '../../src/domain/records';
import { buildAiExport } from '../../src/application/queries/aiExport';
import { assessEmotional } from '../../src/intelligence/domains/emotional/assessEmotional';
import { generateEmotionalCandidate } from '../../src/intelligence/domains/emotional/emotionalCandidate';
import { buildEmotionalScan } from '../../src/intelligence/domains/emotional/scan';
import { planGuide } from '../../src/intelligence/guides/planGuide';
import { runEpisode } from '../../src/intelligence';
import { scenarioById } from '../../src/app/scenarios';
import { aSurfacePermission, anObservation, resetFixtureIds } from '../fixtures/records';
import { required } from '../support/required';
import type { CanonicalRecord } from '../../src/domain/records';

/**
 * Prompt 8E gate: emotional state, social, and relationships.
 *
 * The domain with the most ways to do harm and the fewest ways to be caught doing it.
 * Most of these assertions are about absences — no person, no rating, no interpretation,
 * and nothing sensitive on a surface the owner did not open.
 */

const NOW = new Date('2026-08-05T18:00:00.000Z');

function run(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return runEpisode(scenario.records, new Date(scenario.nowIso));
}

function panel(scenarioId: string) {
  return required(
    run(scenarioId).domains.find((entry) => entry.domainId === 'emotional-and-relationships'),
    'the emotional panel',
  );
}

function evidenceFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  return assessEmotional(scenario.records, new Date(scenario.nowIso));
}

function candidateFor(scenarioId: string) {
  const scenario = scenarioById(scenarioId);
  const at = new Date(scenario.nowIso);
  return generateEmotionalCandidate(
    scenario.records,
    assessEmotional(scenario.records, at),
    at,
  );
}

beforeEach(() => {
  resetFixtureIds();
});

/* -------------------------------------------------------------------------- */

describe('it is not a CRM, structurally', () => {
  it('has no person record, and no family that could become one', () => {
    for (const type of RECORD_TYPES) {
      expect(type, type).not.toMatch(/person|contact|relationship-record|friend/);
    }
  });

  it('has no field anywhere that could hold a person', () => {
    /*
     * Checked as field **keys** rather than as text: the word "name" appears
     * legitimately inside `name-it-and-park-it`, and a substring scan would either miss
     * the real thing or ban ordinary English. What matters is that nothing has a slot to
     * put a person in.
     */
    const keys = new Set<string>();
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
        return;
      }
      if (typeof value !== 'object' || value === null) return;
      for (const [key, child] of Object.entries(value)) {
        keys.add(key.toLowerCase());
        walk(child);
      }
    };
    walk([EMOTIONAL_ACTIONS, SOCIAL_PRACTICES, CONNECTION_KINDS, EMOTIONAL_PROMPTS]);

    for (const forbidden of [
      'name',
      'person',
      'personid',
      'contact',
      'partner',
      'relationshiptype',
      'who',
    ]) {
      expect([...keys], forbidden).not.toContain(forbidden);
    }
  });

  it('counts contact by day without rating any of it', () => {
    const evidence = evidenceFor('emotional-enabled');
    expect(evidence.connectionDays).toBeGreaterThan(0);

    // Nothing anywhere says how any of it went.
    const text = JSON.stringify(evidence).toLowerCase();
    expect(text).not.toContain('quality');
    expect(text).not.toContain('went well');
    expect(text).not.toContain('score');
  });

  it('records attempts, never the other person’s response', () => {
    const evidence = evidenceFor('emotional-enabled');
    expect(evidence.practices.length).toBeGreaterThan(0);
    for (const practice of evidence.practices) {
      expect(typeof practice.count).toBe('number');
      expect(Object.keys(practice).sort()).toEqual(['count', 'id', 'label']);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('questions are observable, and none of them asks for a cause', () => {
  it('passes the behaviour-first policy, every one', () => {
    for (const prompt of EMOTIONAL_PROMPTS) {
      expect(validatePromptDefinition(prompt), prompt.promptId).toEqual([]);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwhy\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bfeel\b/i);
      expect(prompt.text, prompt.promptId).not.toMatch(/\bwork(ed)?\b/i);
    }
  });

  it('classifies ordinary content as relationship data and notes as the most private', () => {
    for (const prompt of EMOTIONAL_PROMPTS) {
      expect(prompt.category, prompt.promptId).toBe('emotional-and-relationships');
      expect(ownerOf(prompt), prompt.promptId).toBe('update-this-area');
      expect(
        prompt.privacy === 'relationship' || prompt.privacy === 'private-pattern',
        prompt.promptId,
      ).toBe(true);
    }

    const note = required(
      EMOTIONAL_PROMPTS.find((prompt) => prompt.promptId === 'emotional:note'),
      'the note prompt',
    );
    expect(note.privacy).toBe('private-pattern');
  });

  it('uses no clinical or blaming vocabulary anywhere in the domain', () => {
    const surfaces = [
      JSON.stringify(EMOTIONAL_ACTIONS),
      JSON.stringify(EMOTIONAL_PROMPTS),
      JSON.stringify(panel('emotional-enabled')),
      JSON.stringify(panel('emotional-unresolved')),
    ]
      .join(' ')
      .toLowerCase();

    for (const forbidden of FORBIDDEN_EMOTIONAL_VOCABULARY) {
      expect(surfaces, forbidden).not.toContain(forbidden);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('sensitive topics never appear unasked', () => {
  it('grants nothing by default, on any surface', () => {
    for (const topic of PROTECTED_TOPICS) {
      for (const surface of PERMISSIBLE_SURFACES) {
        expect(maySurface([], topic, surface), `${topic}/${surface}`).toBe(false);
      }
      expect(grantedSurfaces([], topic)).toEqual([]);
      expect(topicEnabled([], topic), topic).toBe(false);
    }
    expect(enabledTopics([])).toEqual([]);
  });

  it('separates enabling a topic from permitting a surface', () => {
    const records = scenarioById('emotional-private').records;

    // Switched on, so he can record it...
    expect(topicEnabled(records, 'private-pattern')).toBe(true);
    // ...and permitted nowhere at all.
    expect(grantedSurfaces(records, 'private-pattern')).toEqual([]);
    for (const surface of PERMISSIBLE_SURFACES) {
      expect(maySurface(records, 'private-pattern', surface), surface).toBe(false);
    }
  });

  it('grants exactly one surface at a time, and revoking appends', () => {
    resetFixtureIds();
    const grant = aSurfacePermission({ topic: 'private-pattern', surface: 'ai-export' });
    expect(maySurface([grant], 'private-pattern', 'ai-export')).toBe(true);
    // The grant reaches nothing else.
    expect(maySurface([grant], 'private-pattern', 'guide')).toBe(false);
    expect(maySurface([grant], 'relationship-detail', 'ai-export')).toBe(false);

    const revoke = aSurfacePermission({
      topic: 'private-pattern',
      surface: 'ai-export',
      granted: false,
      recordedAt: '2027-01-01T09:00:00.000Z',
      occurredAt: '2027-01-01T09:00:00.000Z',
    } as never);
    const both = [grant, revoke] as CanonicalRecord[];

    expect(maySurface(both, 'private-pattern', 'ai-export')).toBe(false);
    // Both decisions are still on record.
    expect(both).toHaveLength(2);
  });

  it('rejects a permission for a topic or surface that does not exist', () => {
    resetFixtureIds();
    expect(parseCanonicalRecord({ ...aSurfacePermission(), topic: 'everything' }).ok).toBe(
      false,
    );
    expect(parseCanonicalRecord({ ...aSurfacePermission(), surface: 'anywhere' }).ok).toBe(
      false,
    );
  });

  it('keeps a private note out of the export until the export surface is granted', () => {
    const records = scenarioById('emotional-private').records;

    // Even with the class explicitly included, it stays out.
    const withoutPermission = buildAiExport(
      records,
      { range: { kind: 'all' }, includeClasses: ['general', 'private-pattern'] },
      NOW,
    );
    expect(withoutPermission.markdown).not.toContain('Placeholder private note');
    expect(withoutPermission.withheldCount).toBeGreaterThan(0);

    resetFixtureIds();
    const permitted = [
      ...records,
      aSurfacePermission({ topic: 'private-pattern', surface: 'ai-export' }),
    ] as CanonicalRecord[];

    const withPermission = buildAiExport(
      permitted,
      { range: { kind: 'all' }, includeClasses: ['general', 'private-pattern'] },
      NOW,
    );
    expect(withPermission.markdown).toContain('Placeholder private note');
  });

  it('offers the private capture route only once the topic is switched on', () => {
    expect(quickCaptureOptions(['emotional-and-relationships'], [])).toEqual([]);
    expect(quickCaptureOptions(['emotional-and-relationships'], ['private-pattern'])).toEqual([
      { kind: 'A private note', domainId: 'emotional-and-relationships' },
    ]);
    // And never for an area that is switched off.
    expect(quickCaptureOptions([], ['private-pattern'])).toEqual([]);
  });

  it('never quotes a private note in What Changed', () => {
    /*
     * Found by the production test, verbatim on Now: "Recorded emotional:note — text:
     * <the note>". What Changed sits on the most-seen surface in the product and the
     * owner does not choose what it shows, which makes it the worst possible place for
     * the contents of a private note. The change is still reported; the value is not.
     */
    resetFixtureIds();
    const note = anObservation({
      attribute: EMOTIONAL_ATTRIBUTES.note,
      category: 'emotional-and-relationships',
      privacy: 'private-pattern',
      value: { kind: 'note', text: 'Placeholder private entry' },
      occurredAt: '2026-08-05T17:00:00.000Z',
      recordedAt: '2026-08-05T17:00:00.000Z',
    } as never);

    const changes = JSON.stringify(runEpisode([note] as CanonicalRecord[], NOW).whatChanged);

    expect(changes).not.toContain('Placeholder private entry');
    expect(changes).toContain('Kept private');
  });

  it('quotes no free text on Now, whatever domain it came from', () => {
    /*
     * The general form of the rule above, added in Prompt 8F after the class list failed
     * a second time. A note is the one value kind whose contents are unbounded, so no
     * note reaches Now regardless of how it is classified — a domain arriving later
     * cannot leak by being forgotten.
     */
    resetFixtureIds();
    const ordinaryNote = anObservation({
      attribute: 'career:note',
      category: 'career-and-learning',
      privacy: 'standard',
      value: { kind: 'note', text: 'Placeholder free text written by the owner' },
      occurredAt: '2026-08-05T17:00:00.000Z',
      recordedAt: '2026-08-05T17:00:00.000Z',
    } as never);

    const changes = JSON.stringify(
      runEpisode([ordinaryNote] as CanonicalRecord[], NOW).whatChanged,
    );

    expect(changes).not.toContain('Placeholder free text written by the owner');
    expect(changes).toContain('Open the area to read it');
  });

  it('still quotes an ordinary observation, so the panel stays useful', () => {
    resetFixtureIds();
    const ordinary = anObservation({
      attribute: 'context:available-minutes',
      value: { kind: 'duration', minutes: 40 },
      occurredAt: '2026-08-05T17:00:00.000Z',
      recordedAt: '2026-08-05T17:00:00.000Z',
    } as never);

    const changes = JSON.stringify(
      runEpisode([ordinary] as CanonicalRecord[], NOW).whatChanged,
    );
    expect(changes).toContain('40');
  });

  it('keeps everything except interference out of the daily guides', () => {
    for (const kind of ['morning', 'afternoon', 'evening', 'quick-check-in'] as const) {
      const ids = planGuide(kind, 'full', [], NOW).steps.flatMap((step) =>
        step.kind === 'prompt' ? [step.prompt.promptId] : [],
      );
      for (const id of ids) {
        if (!id.startsWith('emotional:')) continue;
        expect(id, `${kind}: ${id}`).toBe('emotional:interference');
      }
      expect(ids, kind).not.toContain('emotional:note');
      expect(ids, kind).not.toContain('emotional:conflict-open');
      expect(ids, kind).not.toContain('emotional:repair-happened');
    }
  });

  it('declares every capture, and marks the private one as protected', () => {
    const knownPrompts = new Set(ALL_PROMPTS.map((prompt) => prompt.promptId));
    for (const capture of EMOTIONAL_CAPTURES) {
      expect(capture.triggers.length, capture.id).toBeGreaterThan(0);
      expect(capture.duplicateSuppression, capture.id).not.toBe('');
      expect(capture.skipWritesNothing, capture.id).toBe(true);
      if (capture.promptId !== undefined) {
        expect(knownPrompts.has(capture.promptId), capture.id).toBe(true);
      }
    }

    const note = required(
      EMOTIONAL_CAPTURES.find((capture) => capture.id === 'emotional:note'),
      'the note capture',
    );
    expect(note.protectedTopic).toBe('private-pattern');
    expect(note.privacy).toBe('private-pattern');
    // Excluded from every protected context there is.
    expect(note.excludedContexts).toHaveLength(6);
  });

  it('lets only the capacity question into a guide', () => {
    const guideEligible = EMOTIONAL_CAPTURES.filter(
      (capture) => capture.eligibleGuides.length > 0,
    );
    expect(guideEligible.map((capture) => capture.id)).toEqual(['emotional:interference']);
  });
});

/* -------------------------------------------------------------------------- */

describe('the one candidate, and when it says nothing', () => {
  it('has eight actions, one of which is to stop having a view', () => {
    expect(EMOTIONAL_ACTION_IDS).toContain('speak-to-someone-qualified');
    expect(EMOTIONAL_ACTION_IDS).toHaveLength(8);
  });

  it('offers repair once a conflict has settled', () => {
    const result = candidateFor('emotional-unresolved');
    const candidate = required(result.candidate, 'the candidate');

    expect(candidate.id).toBe('emotional:repair-after-a-conflict');
    expect(candidate.statement).toMatch(/once things are calm/);
    expect(result.because).toMatch(/What they do with it is theirs/);
  });

  it('says nothing when there is contact, nothing open, and nothing in the way', () => {
    const result = candidateFor('emotional-quiet');
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/without an app suggesting it/);
  });

  it('stays silent while the area is switched off', () => {
    const records = scenarioById('action').records;
    const result = generateEmotionalCandidate(records, assessEmotional(records, NOW), NOW);
    expect(result.candidate).toBeUndefined();
    expect(result.because).toMatch(/not switched on/i);
  });

  it('never blocks itself from the contexts where connection belongs', () => {
    const candidate = required(candidateFor('emotional-unresolved').candidate, 'candidate');
    expect(candidate.blockedByProtectedContexts).not.toContain('family');
    expect(candidate.blockedByProtectedContexts).toContain('work-focus');
  });

  it('offers at most one candidate into the comparison', () => {
    const episode = run('emotional-unresolved');
    const fromDomain = episode.internal.candidates.filter(
      (candidate) => candidate.originDomainId === 'emotional-and-relationships',
    );
    expect(fromDomain.length).toBeLessThanOrEqual(1);
  });

  it('never suggests anything because of a single mood reading', () => {
    resetFixtureIds();
    const records = [
      anObservation({
        attribute: 'state:mood',
        value: {
          kind: 'anchored-scale',
          scaleId: 'mood',
          scaleVersion: 1,
          ordinal: 1,
          label: 'Low',
        },
      }),
    ] as CanonicalRecord[];

    // Not switched on, and even so: nothing in the branch order reads mood at all.
    const evidence = assessEmotional(records, NOW);
    expect(evidence.mood).toBe(1);
    expect(generateEmotionalCandidate(records, evidence, NOW).candidate).toBeUndefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('what the panel refuses to show', () => {
  it('refuses a percentage that would have divided cleanly', () => {
    const refusal = required(
      panel('emotional-enabled').visuals.find((spec) =>
        spec.decisionQuestion.includes('How are my relationships doing?'),
      ),
      'the refusal',
    );
    expect(refusal.decisionValue).toMatch(/No percentage is shown here/);
    expect(refusal.decisionValue).toMatch(/grade for a quiet fortnight/);
  });

  it('has no meter and no numeric field', () => {
    for (const scenario of ['emotional-enabled', 'emotional-unresolved', 'emotional-quiet']) {
      const entry = panel(scenario);
      expect(
        entry.visuals.some((spec) => spec.kind === 'meter'),
        scenario,
      ).toBe(false);
      for (const [key, value] of Object.entries(entry)) {
        expect(typeof value, `${scenario}.${key}`).not.toBe('number');
      }
    }
  });

  it('earns a loneliness trend whose gaps are gaps', () => {
    const trend = panel('emotional-enabled').graphs.find(
      (graph) => graph.id === 'emotional-loneliness',
    );
    if (trend === undefined) return;
    expect(trend.missingDataTreatment).toMatch(/never read as a good week or a bad one/);
    if (trend.kind === 'trend') {
      expect(trend.points.some((point) => point.value === null)).toBe(true);
    }
  });

  it('earns a practice comparison that counts attempts', () => {
    const bars = required(
      panel('emotional-enabled').graphs.find((graph) => graph.id === 'emotional-practice'),
      'the practice chart',
    );
    expect(bars.uncertainty).toMatch(/counts attempts, not how they went/);
  });
});

/* -------------------------------------------------------------------------- */

describe('the scan summary this domain hands to Phase 8', () => {
  it('says where things stand without quoting anything', () => {
    const scan = buildEmotionalScan(evidenceFor('emotional-enabled'));

    expect(scan.domainId).toBe('emotional-and-relationships');
    expect(scan.standing.length).toBeGreaterThan(0);
    expect(scan.quickResponses.length).toBeGreaterThan(0);
    expect(scan.quickResponses.length).toBeLessThanOrEqual(2);
  });

  it('never carries a private note or a name into the scan', () => {
    const scan = buildEmotionalScan(evidenceFor('emotional-private'));
    const text = JSON.stringify(scan);

    expect(text).not.toContain('Placeholder private note');
    expect(text.toLowerCase()).not.toContain('private');
  });

  it('names one open thing when there is one', () => {
    const scan = buildEmotionalScan(evidenceFor('emotional-unresolved'));
    expect(scan.openItem).toMatch(/unresolved/);
    expect(scan.quickResponses.map((entry) => entry.promptId)).toContain(
      'emotional:repair-happened',
    );
  });
});

/* -------------------------------------------------------------------------- */

describe('the shared scales stay where the engine can read them', () => {
  it('leaves mood, stress, confidence, and overwhelm in time and capacity', () => {
    for (const promptId of [
      'state:mood',
      'state:stress',
      'state:confidence',
      'state:overwhelm',
    ]) {
      const prompt = required(
        ALL_PROMPTS.find((entry) => entry.promptId === promptId),
        promptId,
      );
      expect(prompt.category, promptId).toBe('time-attention-capacity');
    }
  });

  it('files loneliness with the slice that added it', () => {
    const evidence = evidenceFor('emotional-enabled');
    expect(evidence.loneliness).toBeDefined();
    expect(EMOTIONAL_ATTRIBUTES.connection).toBe('emotional:connection');
    /*
     * Renamed in Prompt 8H, when `money-figures` became the second protected topic and
     * "the emotional slice owns the money switch" stopped being defensible. The old
     * attribute is still read, so a decision made before the rename survives.
     */
    expect(TOPIC_ENABLED_ATTRIBUTE).toBe('privacy:topic-enabled');
  });
});
