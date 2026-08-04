import { newRecordId, RECORD_SCHEMA_VERSION, type CanonicalRecord } from '../../domain/records';
import {
  AGE_BAND_ATTRIBUTE,
  AGE_BAND_LABELS,
  SKILL_LEVEL_LABELS,
  skillAttribute,
  skillEvidenceAttribute,
  type AgeBand,
  type SkillLevel,
} from '../../domain/fatherhood/development';
import {
  appliesProgression,
  type ProgressionResponse,
} from '../../domain/fatherhood/progression';
import { localTimeContextFor } from './capture';
import { writeRecord, writeRecords, type WriteResult } from './writeRecord';

/**
 * Writes from the learning map (Prompt 8D.2).
 *
 * Four operations, and the interesting thing is how few of them exist. There is no
 * "recalculate levels", no "apply suggestions", no bulk anything. Every level the app
 * holds was put there by the owner, in one of exactly two ways: he set it, or he
 * approved a suggestion. That is the whole surface.
 */

function envelopeFor(now: Date) {
  const instant = now.toISOString();
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    privacy: 'child' as const,
    category: 'fatherhood-and-child' as const,
    recordType: 'observation' as const,
  };
}

/**
 * The owner sets where she is on one skill.
 *
 * Appends. An earlier level is never overwritten, because "she needed help in March and
 * does it alone now" is the only shape progress has, and superseding would erase it.
 */
export async function setSkillLevel(
  input: {
    readonly skillId: string;
    readonly level: SkillLevel;
    readonly note?: string;
    /** Records that justify it, when this came from approving a suggestion. */
    readonly becauseOf?: readonly string[];
  },
  now: Date,
): Promise<WriteResult> {
  const drafts: unknown[] = [
    {
      ...envelopeFor(now),
      recordId: newRecordId(),
      provenance: {
        method: 'direct-report' as const,
        ...(input.becauseOf === undefined || input.becauseOf.length === 0
          ? {}
          : { derivedFromRecordIds: [...input.becauseOf] }),
      },
      attribute: skillAttribute(input.skillId),
      value: { kind: 'state', state: SKILL_LEVEL_LABELS[input.level] },
    },
  ];

  const note = input.note?.trim() ?? '';
  if (note !== '') {
    drafts.push({
      ...envelopeFor(now),
      recordId: newRecordId(),
      provenance: { method: 'direct-report' as const },
      attribute: `father:skill-note:${input.skillId}`,
      value: { kind: 'note', text: note },
    });
  }

  // The level and its note commit together or not at all: a note explaining a level that
  // was never stored would be a small permanent lie about what happened.
  const results = await writeRecords(drafts);
  const failure = results.find((result) => !result.ok);
  if (failure !== undefined) return failure;

  return (
    results[0] ?? {
      ok: false,
      reason: 'transaction-failed',
      issues: ['Nothing was written, and nothing has been changed.'],
    }
  );
}

/**
 * One occasion, recorded as evidence rather than as a level.
 *
 * This is what a Tiny Lesson follow-up and a quick "what I saw today" both produce. It
 * never moves anything by itself — several of them across separate days may *suggest*
 * a move, and the owner decides.
 */
export async function recordSkillEvidence(
  input: { readonly skillId: string; readonly level: SkillLevel },
  now: Date,
): Promise<WriteResult> {
  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    provenance: { method: 'direct-report' as const },
    attribute: skillEvidenceAttribute(input.skillId),
    value: { kind: 'state', state: SKILL_LEVEL_LABELS[input.level] },
  });
}

/**
 * The owner changes which part of the map is currently relevant.
 *
 * Appends, like everything else. The previous band stays on record, so "we moved her on
 * in August" remains readable, and **no skill or observation is removed** — the band
 * decides what is newly worth looking at, never what is true.
 */
export async function setAgeBand(band: AgeBand, now: Date): Promise<WriteResult> {
  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    provenance: { method: 'direct-report' as const },
    attribute: AGE_BAND_ATTRIBUTE,
    value: { kind: 'state', state: AGE_BAND_LABELS[band] },
  });
}

/**
 * What the owner did with a suggestion.
 *
 * Only `approve` writes. The other three are deliberately silent: declining a suggestion
 * says something about her father's judgement, not about the child, and storing it as
 * evidence would let a hesitation become a fact about a two-year-old.
 */
export async function respondToProgression(
  input: {
    readonly skillId: string;
    readonly response: ProgressionResponse;
    readonly to: SkillLevel;
    readonly supportingRecordIds: readonly string[];
  },
  now: Date,
): Promise<WriteResult | undefined> {
  if (!appliesProgression(input.response)) return undefined;

  return setSkillLevel(
    { skillId: input.skillId, level: input.to, becauseOf: input.supportingRecordIds },
    now,
  );
}

/** Every fatherhood record, for the tests that assert nothing was lost. */
export function fatherhoodRecords(
  records: readonly CanonicalRecord[],
): readonly CanonicalRecord[] {
  return records.filter(
    (record) =>
      record.recordType === 'milestone-observation' ||
      ('category' in record && record.category === 'fatherhood-and-child'),
  );
}
