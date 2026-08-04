import { describe, expect, it } from 'vitest';
import {
  buildAiExport,
  DEFAULT_INCLUDED_CLASSES,
} from '../../src/application/queries/aiExport';
import { PRIVACY_CLASSES, fieldClassificationOf } from '../../src/domain/records';
import {
  anObservation,
  anOutcome,
  anInferredState,
  resetFixtureIds,
} from '../fixtures/records';
import type { CanonicalRecord } from '../../src/domain/records';

/**
 * Phase 6 Prompt 7B gate: the AI export is not a backup, and it withholds by default.
 *
 * The failure this file exists to prevent is quiet leakage — an export that includes
 * something the owner assumed was private, or one that omits half the evidence
 * without saying so and produces confident nonsense downstream.
 */

const NOW = new Date('2026-08-04T09:00:00.000Z');

function exportOf(records: readonly CanonicalRecord[], include = DEFAULT_INCLUDED_CLASSES) {
  return buildAiExport(records, { range: { kind: 'all' }, includeClasses: include }, NOW);
}

describe('the export says what it is not', () => {
  it('states in its opening lines that it cannot restore anything', () => {
    const result = exportOf([]);
    expect(result.markdown).toContain('**This is not a backup.**');
    expect(result.markdown).toMatch(/cannot\s+restore anything/);
    expect(result.markdown).toMatch(/recovery package is a separate, encrypted file/);
  });

  it('is readable markdown, not a serialised database', () => {
    const result = exportOf([anObservation({ privacy: 'general' })]);
    expect(result.markdown).toContain('# Life Command OS — readable export');
    expect(result.markdown).toContain('## What was observed');
    expect(result.markdown).toContain('## What the app inferred');
  });
});

describe('sensitive classes are excluded until explicitly included', () => {
  it('includes only general content by default', () => {
    expect([...DEFAULT_INCLUDED_CLASSES]).toEqual(['general']);
  });

  const sensitive = PRIVACY_CLASSES.filter((privacy) => privacy !== 'general');

  for (const privacy of sensitive) {
    it(`withholds ${privacy} content by default`, () => {
      resetFixtureIds();
      const record = anObservation({ privacy });
      const result = exportOf([record]);

      expect(result.includedCount).toBe(0);
      expect(result.withheldCount).toBe(1);
      expect(result.markdown).not.toContain(record.recordId);
    });
  }

  it('withholds an unclassified record, treating it as the most private class', () => {
    resetFixtureIds();
    // Nothing said how sensitive this is, so it is withheld rather than guessed at.
    const record = anObservation();
    delete (record as unknown as Record<string, unknown>)['privacy'];

    const result = exportOf([record]);
    expect(result.withheldCount).toBe(1);
    expect(result.withheldByClass.map((entry) => entry.privacy)).toContain('private-pattern');
  });

  it('includes a class once the owner asks for it', () => {
    resetFixtureIds();
    const result = exportOf([anObservation({ privacy: 'health' })], ['general', 'health']);
    expect(result.includedCount).toBe(1);
    expect(result.withheldCount).toBe(0);
  });

  it('says what was withheld rather than silently shrinking the picture', () => {
    resetFixtureIds();
    const result = exportOf([
      anObservation({ privacy: 'general' }),
      anObservation({ privacy: 'health' }),
      anObservation({ privacy: 'child' }),
    ]);

    expect(result.markdown).toMatch(/2 records were withheld/);
    expect(result.markdown).toMatch(/partial picture/);
  });
});

describe('field-level privacy', () => {
  it('withholds a sensitive field inside an otherwise included record', () => {
    resetFixtureIds();
    const record = anObservation({
      privacy: 'general',
      fieldPrivacy: { value: 'health' },
    });

    const result = exportOf([record]);
    expect(result.includedCount).toBe(1);
    expect(result.redactedFieldCount).toBe(1);
    expect(result.markdown).toContain('value=[withheld: health]');
    // The reader is told a value existed. An invisible omission would read as an
    // absence of evidence, which is a different and misleading claim.
    expect(result.markdown).not.toContain('"kind":"duration"');
  });

  it('never lets a field override loosen the record’s own classification', () => {
    const record = { privacy: 'health' as const, fieldPrivacy: { note: 'general' as const } };
    // The record is health; a field claiming to be general does not escape that.
    expect(fieldClassificationOf(record, 'note')).toBe('health');
    expect(fieldClassificationOf(record, 'anything-else')).toBe('health');
  });

  it('lets a field narrow further than the record', () => {
    const record = { privacy: 'general' as const, fieldPrivacy: { value: 'child' as const } };
    expect(fieldClassificationOf(record, 'value')).toBe('child');
    expect(fieldClassificationOf(record, 'other')).toBe('general');
  });
});

describe('facts and inferences stay apart', () => {
  it('files an observation and an inferred state in different sections', () => {
    resetFixtureIds();
    const observation = anObservation({ privacy: 'general' });
    const inferred = anInferredState({ privacy: 'general' } as never);

    const result = exportOf([observation, inferred]);

    // Slice the document by heading and check each record landed in its own section.
    const between = (from: string, to: string): string =>
      result.markdown.slice(
        result.markdown.indexOf(from),
        to === '' ? undefined : result.markdown.indexOf(to),
      );

    const observedSection = between('## What was observed', '## What the app inferred');
    const inferredSection = between(
      '## What the app inferred',
      '## Decisions and what followed',
    );

    expect(observedSection).toContain('observation');
    expect(observedSection).not.toContain('inferred-state');
    expect(inferredSection).toContain('inferred-state');
    expect(inferredSection).not.toMatch(/^- .*· observation ·/m);

    expect(result.markdown).toMatch(/\*\*Inference, not observation\.\*\*/);
  });

  it('warns that an outcome after an action does not establish cause', () => {
    const result = exportOf([]);
    expect(result.markdown).toMatch(/does not establish that the action caused it/);
  });
});

describe('unresolved information stays visible', () => {
  it('counts unresolved values and refuses to let them read as zero', () => {
    resetFixtureIds();
    const unresolved = anOutcome({
      privacy: 'general',
      result: { status: 'unresolved', awaiting: 'an observation' },
    } as never);

    const result = exportOf([unresolved]);
    expect(result.markdown).toMatch(/1 record carr(y|ies) unresolved values/);
    expect(result.markdown).toMatch(/must not be read as a zero or a failure/);
  });
});

describe('ranges', () => {
  const inWindow = (daysAgo: number): CanonicalRecord => {
    const at = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return anObservation({ privacy: 'general', occurredAt: at, recordedAt: at });
  };

  it('supports 7, 30, 90 days and all time', () => {
    resetFixtureIds();
    const records = [inWindow(1), inWindow(20), inWindow(60), inWindow(200)];

    const counts = (['7d', '30d', '90d', 'all'] as const).map(
      (kind) =>
        buildAiExport(records, { range: { kind }, includeClasses: ['general'] }, NOW)
          .includedCount,
    );
    expect(counts).toEqual([1, 2, 3, 4]);
  });

  it('supports a custom range', () => {
    resetFixtureIds();
    const records = [inWindow(1), inWindow(20), inWindow(60)];
    const result = buildAiExport(
      records,
      {
        range: {
          kind: 'custom',
          fromIso: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          toIso: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        includeClasses: ['general'],
      },
      NOW,
    );
    expect(result.includedCount).toBe(1);
  });

  it('states its coverage so a short window is not mistaken for a full history', () => {
    const result = buildAiExport(
      [],
      { range: { kind: '7d' }, includeClasses: ['general'] },
      NOW,
    );
    expect(result.markdown).toContain('Range: Last 7 days');
    expect(result.markdown).toContain('Coverage: 2026-07-28 to 2026-08-04');
  });
});

describe('nothing leaves the device', () => {
  it('is generated locally and says so', () => {
    const result = exportOf([]);
    expect(result.markdown).toMatch(/Generated on this device/);
    expect(result.markdown).toMatch(
      /No part of this was produced by, or sent to, any\s*external service/,
    );
  });
});
