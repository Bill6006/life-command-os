import {
  OBSERVED_RECORD_TYPES,
  classificationOf,
  fieldClassificationOf,
  type CanonicalRecord,
  type PrivacyClass,
  type RecordType,
  type SkillClaimRecord,
} from '../../domain/records';
import { mayExport } from '../../domain/emotional/permissions';
import { listAllRecords } from './readRecords';

/**
 * The AI-readable export (`OWN-068`–`OWN-070`, LEG-126, LEG-127).
 *
 * **This is not a backup, and the file says so in its first line.** A backup is an
 * exact recovery package: encrypted, complete, and unreadable by design. This is a
 * readable summary for thinking with — deliberately lossy, deliberately partial, and
 * useless for recovery. Confusing the two is the failure mode that ends with somebody
 * discovering their "backup" was a paragraph of prose.
 *
 * ## What is excluded, and by default
 *
 * Every sensitive class — child, health, money, workplace, relationship, faith,
 * notes, location, private-pattern — is **excluded unless explicitly included**
 * (`OWN-070`). Unclassified records are treated as `private-pattern`, the most
 * protective class, so a record whose sensitivity was never stated is withheld rather
 * than guessed at.
 *
 * Exclusion is counted and reported. An export that quietly dropped half the evidence
 * would produce confident-sounding analysis of a picture the reader cannot see the
 * shape of, so the summary states what is missing and why.
 *
 * ## Facts and inferences stay apart
 *
 * The sections are separated by provenance, not by topic. What the owner reported and
 * what the app concluded are never mixed into one narrative, because a reader — human
 * or model — cannot un-mix them afterwards (`OBS-008`).
 */

export type ExportRange =
  | { readonly kind: '7d' | '30d' | '90d' | 'all' }
  | { readonly kind: 'custom'; readonly fromIso: string; readonly toIso: string };

export const RANGE_LABELS: Record<'7d' | '30d' | '90d' | 'all' | 'custom', string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
  custom: 'Custom range',
};

/** Included unless the owner says otherwise. Everything else is withheld. */
export const DEFAULT_INCLUDED_CLASSES: readonly PrivacyClass[] = ['general'];

export interface ExportOptions {
  readonly range: ExportRange;
  readonly includeClasses: readonly PrivacyClass[];
}

export interface ExportResult {
  readonly markdown: string;
  readonly includedCount: number;
  readonly withheldCount: number;
  readonly withheldByClass: readonly {
    readonly privacy: PrivacyClass;
    readonly count: number;
  }[];
  readonly redactedFieldCount: number;
  readonly coverage: { readonly fromIso: string | undefined; readonly toIso: string };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function rangeBounds(range: ExportRange, now: Date): { from: Date | undefined; to: Date } {
  if (range.kind === 'custom') {
    return { from: new Date(range.fromIso), to: new Date(range.toIso) };
  }
  if (range.kind === 'all') return { from: undefined, to: now };
  const days = range.kind === '7d' ? 7 : range.kind === '30d' ? 30 : 90;
  return { from: new Date(now.getTime() - days * DAY_MS), to: now };
}

/** Envelope fields that describe the record rather than its content. */
const STRUCTURAL_FIELDS = new Set([
  'recordId',
  'recordType',
  'schemaVersion',
  'occurredAt',
  'recordedAt',
  'localTime',
  'source',
  'provenance',
  'privacy',
  'fieldPrivacy',
  'unknownFields',
  'supersedesRecordId',
  'decisionEpisodeId',
]);

interface Rendered {
  readonly line: string;
  readonly redacted: number;
}

/**
 * One record as a readable line, with any field the owner did not include withheld.
 *
 * A withheld field is shown as `[withheld: health]` rather than dropped. The reader
 * needs to know a value existed and was held back — an omission they cannot see reads
 * as an absence of evidence, which is a different and misleading claim.
 */
function renderRecord(record: CanonicalRecord, included: ReadonlySet<PrivacyClass>): Rendered {
  const source = record as unknown as Record<string, unknown>;
  const parts: string[] = [];
  let redacted = 0;

  for (const [field, value] of Object.entries(source)) {
    if (STRUCTURAL_FIELDS.has(field)) continue;
    const fieldClass = fieldClassificationOf(record, field);
    if (!included.has(fieldClass)) {
      parts.push(`${field}=[withheld: ${fieldClass}]`);
      redacted += 1;
      continue;
    }
    parts.push(`${field}=${JSON.stringify(value)}`);
  }

  const when = record.occurredAt.replace('T', ' ').slice(0, 16);
  return { line: `- ${when} · ${record.recordType} · ${parts.join(' · ')}`, redacted };
}

function isObserved(recordType: RecordType): boolean {
  return (OBSERVED_RECORD_TYPES as readonly RecordType[]).includes(recordType);
}

const DECISION_TYPES: readonly RecordType[] = [
  'recommendation',
  'execution',
  'outcome',
  'weekly-direction',
];

const INFERENCE_TYPES: readonly RecordType[] = [
  'inferred-state',
  'trajectory',
  'untreated-forecast',
  'intervention-effect-prediction',
  'candidate-action',
];

const LEARNING_TYPES: readonly RecordType[] = [
  'forecast-evaluation',
  'recommendation-effect-evaluation',
  'learned-belief',
];

/**
 * Builds the export.
 *
 * Pure: records in, markdown out. Nothing is fetched, nothing is sent anywhere, and
 * no model is consulted. The word "AI" in the name describes what the owner might
 * paste it into, not anything this application does (`OWN-071`).
 */
export function buildAiExport(
  records: readonly CanonicalRecord[],
  options: ExportOptions,
  now: Date,
): ExportResult {
  const { from, to } = rangeBounds(options.range, now);
  const included = new Set(options.includeClasses);

  const inWindow = records.filter((record) => {
    const at = Date.parse(record.occurredAt);
    return (from === undefined || at >= from.getTime()) && at <= to.getTime();
  });

  /*
   * The second gate (Prompt 8E, Master Plan v3.2 §11).
   *
   * Choosing to include a privacy class is not enough for a protected topic. Private
   * Pattern content stays out **even when `private-pattern` was ticked**, unless the
   * owner separately granted the export surface — two deliberate decisions before the
   * most sensitive thing in the product can leave the device in readable form.
   *
   * The gate is applied to the class rather than to individual records, so a future
   * topic cannot be added to the protected list and quietly miss it.
   */
  const permitted = (record: CanonicalRecord): boolean =>
    classificationOf(record) !== 'private-pattern' || mayExport(records, 'private-pattern');

  const withheld = inWindow.filter(
    (record) => !included.has(classificationOf(record)) || !permitted(record),
  );
  const visible = inWindow.filter(
    (record) => included.has(classificationOf(record)) && permitted(record),
  );

  const withheldCounts = new Map<PrivacyClass, number>();
  for (const record of withheld) {
    const cls = classificationOf(record);
    withheldCounts.set(cls, (withheldCounts.get(cls) ?? 0) + 1);
  }

  let redactedFieldCount = 0;
  const section = (types: readonly RecordType[] | 'observed'): string[] =>
    visible
      .filter((record) =>
        types === 'observed'
          ? isObserved(record.recordType)
          : types.includes(record.recordType),
      )
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
      .map((record) => {
        const rendered = renderRecord(record, included);
        redactedFieldCount += rendered.redacted;
        return rendered.line;
      });

  const observed = section('observed');
  const inferred = section(INFERENCE_TYPES);
  const decisions = section(DECISION_TYPES);
  const learning = section(LEARNING_TYPES);

  const unresolved = visible.filter((record) =>
    JSON.stringify(record).includes('"status":"unresolved"'),
  ).length;

  /*
   * Claims are rendered with the evidence behind them and never as facts (LEG-062).
   *
   * The record has no field asserting the claim is true, so there is nothing here that
   * *could* be exported as one. What is exported is the count of supporting records,
   * which for an unsupported claim is zero and says so in words.
   */
  const claims = visible
    .filter((record): record is SkillClaimRecord => record.recordType === 'skill-claim')
    .filter((claim) => claim.state === 'active')
    .map((claim) => {
      const supporting = claim.supportingRecordIds.length;
      return supporting === 0
        ? `- **Claimed, nothing behind it yet:** "${claim.statement}" (${claim.topic}, for ${claim.intendedUse}). No supporting records. This has not been demonstrated.`
        : `- **Claimed, with ${String(supporting)} supporting record${supporting === 1 ? '' : 's'}:** "${claim.statement}" (${claim.topic}, for ${claim.intendedUse}).`;
    });

  const rangeLabel =
    options.range.kind === 'custom'
      ? `${options.range.fromIso.slice(0, 10)} to ${options.range.toIso.slice(0, 10)}`
      : RANGE_LABELS[options.range.kind];

  const withheldSummary =
    withheld.length === 0
      ? 'Nothing was withheld — every record in this window is in an included class.'
      : `${String(withheld.length)} record${withheld.length === 1 ? ' was' : 's were'} withheld: ${[
          ...withheldCounts.entries(),
        ]
          .map(([cls, count]) => `${String(count)} ${cls}`)
          .join(', ')}. Treat any conclusion below as drawn from a partial picture.`;

  const markdown = [
    '# Life Command OS — readable export',
    '',
    '**This is not a backup.** It is a readable summary for thinking with. It cannot',
    'restore anything, it is deliberately incomplete, and it is not encrypted. The',
    'recovery package is a separate, encrypted file made from the Backup section.',
    '',
    `- Range: ${rangeLabel}`,
    `- Coverage: ${from === undefined ? 'from the first record' : from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    `- Records included: ${String(visible.length)}`,
    `- Privacy classes included: ${[...included].sort().join(', ')}`,
    '',
    '## What is missing',
    '',
    withheldSummary,
    unresolved === 0
      ? 'No unresolved values appear in this window.'
      : `${String(unresolved)} record${unresolved === 1 ? '' : 's'} carry unresolved values. Unresolved means an outcome has not been observed — it does not mean nothing happened, and it must not be read as a zero or a failure.`,
    '',
    '## What was observed',
    '',
    'Reported directly by the owner. These are facts, not interpretations.',
    '',
    ...(observed.length === 0 ? ['_Nothing in this window._'] : observed),
    '',
    '## What the app inferred',
    '',
    'Produced by the application from the records above. **Inference, not observation.**',
    'Any of it may be wrong, and none of it was reported by the owner.',
    '',
    ...(inferred.length === 0 ? ['_Nothing in this window._'] : inferred),
    '',
    '## Decisions and what followed',
    '',
    'A recommendation, an execution, and an outcome are separate facts. An outcome',
    'observed after an action does not establish that the action caused it.',
    '',
    ...(decisions.length === 0 ? ['_Nothing in this window._'] : decisions),
    '',
    '## What has been learned',
    '',
    'Forecast accuracy and recommendation effectiveness are separate evaluations and',
    'are never combined. Confidence labels are qualitative on purpose.',
    '',
    ...(learning.length === 0 ? ['_Nothing in this window._'] : learning),
    '',
    '## Claims, and what supports them',
    '',
    'What the owner would say about themselves, beside what the records actually show.',
    '**A claim is never exported as true** — the record carries no such assertion, so the',
    'most that can be stated is the evidence, and for an unsupported claim the evidence is',
    'nothing at all. Treat an unsupported claim as an intention, not a capability.',
    '',
    ...(claims.length === 0 ? ['_No claims recorded._'] : claims),
    '',
    '## Open questions for review',
    '',
    '- Which of the unresolved items above is worth actually closing?',
    '- Where do recent and longer-term patterns disagree?',
    '- What changed in circumstances that would make older evidence less comparable?',
    '',
    '---',
    '',
    'Generated on this device. No part of this was produced by, or sent to, any',
    'external service.',
    '',
  ].join('\n');

  return {
    markdown,
    includedCount: visible.length,
    withheldCount: withheld.length,
    withheldByClass: [...withheldCounts.entries()]
      .map(([privacy, count]) => ({ privacy, count }))
      .sort((a, b) => a.privacy.localeCompare(b.privacy)),
    redactedFieldCount,
    coverage: { fromIso: from?.toISOString(), toIso: to.toISOString() },
  };
}

/** Builds the export from stored records. */
export async function exportForAi(options: ExportOptions, now: Date): Promise<ExportResult> {
  return buildAiExport(await listAllRecords(), options, now);
}
