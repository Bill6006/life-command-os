import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEPTH,
  NORMAL_RESPONSE_BUDGET,
  planGuide,
} from '../../src/intelligence/guides/planGuide';
import {
  HARD_CEILING,
  appraise,
  choose,
  type QuestionAppraisal,
} from '../../src/intelligence/guides/questionValue';
import { GUIDE_DEPTHS, type GuideDepth } from '../../src/domain/records';
import { promptById } from '../../src/domain/prompts/definitions';

/**
 * v3.3 section B5, as amended by owner clarification 1.
 *
 * ## What the control was
 *
 * Guide length, and only ever guide length. `MAX_STEPS` mapped `15 / 30 / 45 / Full` to
 * three, five, seven and ten questions; nothing read the level as a duration. The stored
 * values are minute-shaped strings, so a question-count control presented itself as a time
 * budget — and usable action time is a genuinely separate thing this app captures.
 *
 * ## What the owner then ruled
 *
 * That the control must not decide question count either. Depth follows decision value,
 * coverage and cadence, existing evidence, and whether another answer could still move the
 * recommendation. So the control is gone, and these tests hold the line in both
 * directions: no minutes language anywhere near a guide, and no path by which a caller's
 * `depth` argument changes what gets asked.
 */

const NOW = new Date('2026-08-07T13:00:00.000Z');

/** Source with comments stripped, so prose about the old defect cannot pass for the defect. */
function codeOf(path: string): string {
  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//');
    })
    .join('\n');
}

const GUIDE_SURFACE = 'src/ui/features/guides/GuideSurface.tsx';

/* -------------------------------------------------------------------------- */

describe('B5. the control is gone, not relabelled (V33-024)', () => {
  it('offers no depth chooser at all', () => {
    const code = codeOf(GUIDE_SURFACE);

    expect(code).not.toMatch(/depth-step/);
    expect(code).not.toMatch(/onDepthChange/);
    expect(code).not.toMatch(/DEPTH_LABELS/);
    expect(code).not.toMatch(/MAX_STEPS/);
  });

  it('names no duration where a guide could be mistaken for a time budget', () => {
    /* The exact strings the owner saw: `15 min`, `30 min`, `45 min`, `Full`. */
    const code = codeOf(GUIDE_SURFACE);
    expect(code).not.toMatch(/'\d+ min'/);
    expect(code).not.toMatch(/\bmin\b/);
    expect(code).not.toMatch(/'Full'/);
  });

  it('keeps usable action time as a separate, real observation (V33-022)', () => {
    /*
     * The other half of the conflation. If this prompt vanished, a guide-length control
     * would silently become the only place the app touches time again.
     */
    expect(promptById('context:available-minutes').text).toMatch(/minutes/i);
    expect(codeOf(GUIDE_SURFACE)).not.toContain('context:available-minutes');
  });
});

/* -------------------------------------------------------------------------- */

describe('B5. depth cannot change what is asked (V33-024, clarification 1)', () => {
  const ids = (depth: GuideDepth): readonly string[] =>
    planGuide('morning', depth, [], NOW).steps.flatMap((step) =>
      step.kind === 'prompt' ? [step.prompt.promptId] : [],
    );

  it('plans an identical check-in at every stored depth', () => {
    const brief = ids('15');
    expect(brief.length).toBeGreaterThan(0);
    for (const depth of GUIDE_DEPTHS) {
      expect(ids(depth)).toEqual(brief);
    }
  });

  it('holds the same for afternoon and evening', () => {
    for (const kind of ['afternoon', 'evening'] as const) {
      const at = (depth: GuideDepth): number => planGuide(kind, depth, [], NOW).steps.length;
      expect(new Set(GUIDE_DEPTHS.map(at)).size).toBe(1);
    }
  });

  it('stamps the briefest level on a session nobody chose a depth for', () => {
    expect(DEFAULT_DEPTH).toBe('15');
  });
});

/* -------------------------------------------------------------------------- */

describe('B5. length follows decision value (V33-024)', () => {
  it('treats a question that changes eligibility as decisive', () => {
    const decisive = appraise(promptById('context:setting'), {
      hasCurrentAnswer: false,
      suppressedBecause: undefined,
      askedFor: false,
    });
    expect(decisive.worth).toBe('decisive');
  });

  it('drops a question that already has a current answer, whatever its topic', () => {
    const answered = appraise(promptById('context:setting'), {
      hasCurrentAnswer: true,
      suppressedBecause: undefined,
      askedFor: false,
    });
    expect(answered.worth).toBe('none');
    expect(answered.because).toMatch(/current answer already exists/i);
  });

  it('lets coverage and cadence speak before decision value does', () => {
    const suppressed = appraise(promptById('context:setting'), {
      hasCurrentAnswer: false,
      suppressedBecause: 'In cooldown until Thursday',
      askedFor: false,
    });
    expect(suppressed.worth).toBe('none');
    expect(suppressed.because).toBe('In cooldown until Thursday');
  });

  it('never grades a question the owner opened on purpose', () => {
    const opened = appraise(promptById('sleep:awakenings'), {
      hasCurrentAnswer: true,
      suppressedBecause: 'In cooldown',
      askedFor: true,
    });
    expect(opened.worth).toBe('decisive');
  });
});

/* -------------------------------------------------------------------------- */

describe('B5. selection respects the budget and the planner’s order', () => {
  const at = (promptId: string, worth: QuestionAppraisal['worth']): QuestionAppraisal => ({
    promptId,
    worth,
    because: 'test',
  });

  it('keeps a planner-raised check-in inside the response budget', () => {
    const many = Array.from({ length: 12 }, (_, index) => at(`p${String(index)}`, 'decisive'));
    expect(choose(many).asked).toHaveLength(NORMAL_RESPONSE_BUDGET);
  });

  it('never exceeds the hard ceiling even when the owner opened it', () => {
    const many = Array.from({ length: 20 }, (_, index) => at(`p${String(index)}`, 'decisive'));
    expect(choose(many, 50).asked).toHaveLength(HARD_CEILING);
  });

  it('asks decisive before useful, but returns them in the planner’s order', () => {
    /*
     * Priority is not sequence. A guide that asks "which child?" before "how is that
     * going?" has to keep that order whatever the two questions are individually worth.
     */
    const selection = choose([at('useful-first', 'useful'), at('decisive-second', 'decisive')]);
    expect(selection.asked).toEqual(['useful-first', 'decisive-second']);
  });

  it('drops useful ones once the budget is full, and says why', () => {
    const selection = choose([
      ...Array.from({ length: 5 }, (_, index) => at(`d${String(index)}`, 'decisive')),
      at('spare', 'useful'),
    ]);
    expect(selection.asked).not.toContain('spare');
    const held = selection.held.find((entry) => entry.promptId === 'spare');
    expect(held?.because).toMatch(/already long enough/i);
  });

  it('never raises a marginal question unasked', () => {
    const selection = choose([at('idle', 'marginal')]);
    expect(selection.asked).toEqual([]);
  });

  it('reserves a slot so coverage is never crowded out (V33-025)', () => {
    /*
     * Without the reservation a due area loses to today's decision every single time,
     * which is the same as not having a coverage plan at all.
     */
    const selection = choose([
      ...Array.from({ length: 8 }, (_, index) => at(`d${String(index)}`, 'decisive')),
      at('due-area', 'due'),
    ]);
    expect(selection.asked).toContain('due-area');
    expect(selection.asked).toHaveLength(NORMAL_RESPONSE_BUDGET);
  });
});
