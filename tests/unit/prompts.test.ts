import { describe, expect, it } from 'vitest';
import {
  assertPromptCatalogue,
  validatePromptDefinition,
  type PromptDefinition,
} from '../../src/domain/prompts/policy';
import {
  ALL_PROMPTS,
  OUTCOME_PATTERN_IDS,
  OUTCOME_PROMPTS,
  STATE_PROMPTS,
  UNSURE,
} from '../../src/domain/prompts/definitions';
import { SCALES, SCALE_IDS, anchorLabel } from '../../src/domain/records/scales';
import { observedValueFor } from '../../src/application/commands/capture';
import { required } from '../support/required';

/**
 * Phase 6 gate: the behaviour-first question boundary (`OBS-001`–`OBS-012`).
 *
 * The prohibited-question tests below are the ones that matter most in this file.
 * Everything else in the product can be corrected later; a question that makes the
 * owner account for their own psychology damages the relationship the moment it is
 * asked, and it produces evidence that is a guess.
 */

function prompt(text: string, overrides: Partial<PromptDefinition> = {}): PromptDefinition {
  return {
    promptId: 'test',
    text,
    kind: 'observable',
    answers: ['Yes', 'No'],
    allowsUnknown: true,
    whatItCouldChange: ['recommendation'],
    ...overrides,
  };
}

describe('prohibited questions are rejected', () => {
  const causal = [
    'Why do you think your energy dropped?',
    'Why did you skip it?',
    'Why was today harder?',
    'What caused the interruption?',
    'What made you stop?',
    'Why is this happening again?',
    'What is the reason for the change?',
  ];

  for (const text of causal) {
    it(`rejects a required cause question: ${text}`, () => {
      const violations = validatePromptDefinition(prompt(text));
      expect(violations.map((v) => v.code)).toContain('requires-cause');
    });
  }

  const feeling = [
    'How did this make you feel?',
    'How did you feel about the session?',
    'How are you feeling about your progress?',
  ];

  for (const text of feeling) {
    it(`rejects a feeling question: ${text}`, () => {
      const violations = validatePromptDefinition(prompt(text));
      expect(violations.map((v) => v.code)).toContain('requires-feeling');
    });
  }

  const efficacy = [
    'Did this work for you?',
    'Did it help?',
    'Was that helpful?',
    'Was it worth it?',
    'Rate how effective the break was',
  ];

  for (const text of efficacy) {
    it(`rejects an efficacy judgement: ${text}`, () => {
      const violations = validatePromptDefinition(prompt(text));
      expect(violations.map((v) => v.code)).toContain('requires-efficacy-judgement');
    });
  }

  const selfDiagnosis = [
    'What strategy would help you focus?',
    "What's holding you back?",
    'Are you avoiding this?',
  ];

  for (const text of selfDiagnosis) {
    it(`rejects self-diagnosis: ${text}`, () => {
      const violations = validatePromptDefinition(prompt(text));
      expect(violations.map((v) => v.code)).toContain('requires-self-diagnosis');
    });
  }

  it('refuses a whole catalogue containing one prohibited question', () => {
    expect(() => {
      assertPromptCatalogue([prompt('Did you start it?'), prompt('Why did you stop?')]);
    }).toThrow(/behaviour-first policy/);
  });
});

describe('approved observable questions are accepted', () => {
  const approved = [
    'Did you start?',
    'Did you finish?',
    'About how long did you continue?',
    'Did you stop earlier than intended?',
    'Did you return to the intended task?',
    'Is the original problem still interfering?',
    'Did a symptom occur?',
    'Did the conversation happen?',
    'Did you send the message?',
    'What time did you go to bed?',
    'Was the decision completed, delayed, or still blocked?',
  ];

  for (const text of approved) {
    it(`accepts: ${text}`, () => {
      expect(validatePromptDefinition(prompt(text))).toEqual([]);
    });
  }

  it('accepts an optional note that invites the owner’s own explanation', () => {
    // Owner interpretation, volunteered. Permitted (`OBS-011`) precisely because it
    // is never required and is stored as interpretation, not verified cause.
    const note = prompt('Why do you think that happened? (optional)', {
      kind: 'optional-note',
      answers: [],
    });
    expect(validatePromptDefinition(note)).toEqual([]);
  });

  it('rejects an optional note that cannot be left unanswered', () => {
    const note = prompt('Anything to add?', {
      kind: 'optional-note',
      answers: [],
      allowsUnknown: false,
    });
    expect(validatePromptDefinition(note).map((v) => v.code)).toContain(
      'missing-unknown-option',
    );
  });

  it('rejects a question whose answer could not change anything', () => {
    expect(
      validatePromptDefinition(prompt('Did you start?', { whatItCouldChange: [] })).map(
        (v) => v.code,
      ),
    ).toContain('not-a-question');
  });
});

describe('the shipped catalogue', () => {
  it('passes the policy — it is validated on import, so this asserts it stays that way', () => {
    expect(() => {
      assertPromptCatalogue(ALL_PROMPTS);
    }).not.toThrow();
  });

  it('offers Unknown or Unsure on every prompt that depends on recall or noticing', () => {
    // `OBS-006` scopes this to questions the app puts to the owner. Quick Capture is
    // the owner writing something down unprompted — "unsure what kind of thing this
    // was" is not a state they can be in while doing it.
    for (const entry of ALL_PROMPTS) {
      if (entry.kind === 'preference' || entry.promptId.startsWith('capture:')) continue;
      const offersUnsure = entry.answers.includes(UNSURE) || entry.allowsUnknown;
      expect(offersUnsure, entry.promptId).toBe(true);
    }
  });

  it('asks nothing about why, cause, feelings, or whether something worked', () => {
    for (const entry of ALL_PROMPTS) {
      expect(entry.text, entry.promptId).not.toMatch(/\bwhy\b/i);
      expect(entry.text, entry.promptId).not.toMatch(/\bcaused?\b/i);
      expect(entry.text, entry.promptId).not.toMatch(/\bfeel\b/i);
      expect(entry.text, entry.promptId).not.toMatch(/\bwork(ed)? for you\b/i);
    }
  });

  it('covers every observable outcome pattern the phase requires', () => {
    expect([...OUTCOME_PATTERN_IDS]).toEqual([
      'started',
      'completed',
      'duration',
      'stopped-early',
      'returned-to-task',
      'still-interfering',
      'symptom-occurred',
      'interaction-happened',
      'decision-completed',
    ]);
  });
});

describe('the approved anchored scales', () => {
  it('defines the seven Blueprint scales, plus the three the Health slice added', () => {
    expect([...SCALE_IDS]).toEqual([
      // Blueprint §4.4, unchanged.
      'energy',
      'mood',
      'stress',
      'confidence',
      'overwhelm',
      'sleep-recovery',
      'readiness',
      // Prompt 8B. The energy split is asked from Update This Area, not the morning,
      // and pain is measured as interference rather than as a clinical intensity.
      'physical-energy',
      'mental-energy',
      'pain-interference',
      // Prompt 8C. What came back without looking — a trend, so it needs ordinals.
      'retrieval-strength',
    ]);
    expect(SCALES.energy.anchors.map((a) => a.label)).toEqual([
      'Drained',
      'Low',
      'Functional',
      'Good',
      'Strong',
    ]);
    expect(SCALES.readiness.anchors.map((a) => a.label)).toEqual([
      'Need recovery',
      'Two minutes possible',
      'Ten minutes possible',
      'Can lift',
    ]);
  });

  it('keeps the stress direction fixed: a higher ordinal always means more stress', () => {
    // `AT-050`. The direction is stored on the definition, so an inversion is a
    // changed value a test can catch rather than a silent reordering of labels.
    expect(SCALES.stress.higherMeans).toBe('more stress');
    expect(anchorLabel('stress', 1)).toBe('Calm');
    expect(anchorLabel('stress', 5)).toBe('Overloaded');
  });

  it('has one prompt per scale, all of which allow Unknown', () => {
    expect(STATE_PROMPTS).toHaveLength(SCALE_IDS.length);
    for (const entry of STATE_PROMPTS) expect(entry.allowsUnknown).toBe(true);
  });
});

describe('what an answer becomes', () => {
  const energy = required(STATE_PROMPTS[0], 'the energy prompt');

  it('stores ordinal, label, scale id, and scale version together', () => {
    const value = observedValueFor(energy, { kind: 'scale', ordinal: 2 });
    expect(value).toEqual({
      kind: 'anchored-scale',
      scaleId: 'energy',
      scaleVersion: 1,
      ordinal: 2,
      label: 'Low',
    });
  });

  it('writes nothing at all for an untouched control', () => {
    // `OWN-024`. Not a zero, not a null, not a placeholder — nothing. Absence of a
    // record is the only representation of "not reported" that cannot be misread.
    expect(observedValueFor(energy, { kind: 'not-answered' })).toBeUndefined();
  });

  it('writes something for a deliberate "I cannot tell"', () => {
    // `OBS-006`. Reporting that you cannot tell is information, and it is stored as
    // its own kind so nothing can read it as no, zero, or unchanged.
    const value = observedValueFor(OUTCOME_PROMPTS['symptom-occurred'], { kind: 'unsure' });
    expect(value).toMatchObject({ kind: 'unsure' });
  });

  it('treats Unsure chosen from a list the same as the dedicated control', () => {
    const value = observedValueFor(OUTCOME_PROMPTS.completed, {
      kind: 'choice',
      choice: UNSURE,
    });
    expect(value).toMatchObject({ kind: 'unsure' });
  });

  it('writes nothing for an empty optional note', () => {
    const note = ALL_PROMPTS.find((entry) => entry.kind === 'optional-note');
    expect(
      observedValueFor(required(note, 'an optional-note prompt'), {
        kind: 'text',
        text: '   ',
      }),
    ).toBeUndefined();
  });
});
