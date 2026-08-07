import {
  classificationOf,
  type CanonicalRecord,
  type PrivacyClass,
} from '../../domain/records';
import { ago } from '../support';
import type { DecisionOutput, MaterialChange, StateAssessment, WhatChanged } from '../types';

/**
 * Material-change detection (`CHANGE-MATERIAL`, `INTEL-008`).
 *
 * The engine is run twice — once over the records that existed at the previous
 * assessment, once over everything — and the two results are diffed. **What changed
 * is what demonstrably differs**, not a list of new records and not a hand-written
 * changelog, either of which would start drifting from the truth immediately.
 *
 * The distinction the user actually needs is not "what is new" but "why is the
 * answer different", so each change names what it altered: the state, the
 * recommendation, or the confidence.
 */

export interface Snapshot {
  readonly output: DecisionOutput;
  readonly state: StateAssessment;
}

/** Records sharing the newest `recordedAt` — the batch that arrived since last time. */
export function newestCluster(records: readonly CanonicalRecord[]): CanonicalRecord[] {
  if (records.length === 0) return [];
  const newest = records.reduce(
    (latest, record) => (record.recordedAt > latest ? record.recordedAt : latest),
    records[0]?.recordedAt ?? '',
  );
  return records.filter((record) => record.recordedAt === newest);
}

export function recordsBefore(
  records: readonly CanonicalRecord[],
  instant: string,
): CanonicalRecord[] {
  return records.filter((record) => record.recordedAt < instant);
}

/**
 * Content too sensitive to quote on a surface the owner did not open for it.
 *
 * What Changed sits on Now. It is the most-seen panel in the product and the owner does
 * not choose what it shows — which makes it exactly the wrong place for the contents of
 * a private note. Prompt 8E's production test caught this one verbatim on Now: "Recorded
 * emotional:note — text: <the note>".
 *
 * The change itself is still reported, because "something was recorded" is true and
 * useful. Only the value is withheld, and the panel says so rather than looking empty.
 */
const UNQUOTABLE_CLASSES: readonly PrivacyClass[] = [
  'private-pattern',
  'child',
  'relationship',
  'faith',
];

function quotable(record: CanonicalRecord): boolean {
  return !UNQUOTABLE_CLASSES.includes(classificationOf(record));
}

/**
 * The second rule, and the more reliable one.
 *
 * The class list above has now failed twice — once in Prompt 8E and again in Prompt 8F,
 * both times because a new domain arrived and nobody extended it. A list that must be
 * edited every time the product grows is not a safeguard, it is a reminder.
 *
 * So: **free text is never quoted on Now, whatever domain it came from.** A note is the
 * one value kind whose contents are unbounded — it can hold a name, an argument, a
 * diagnosis, or a repair someone owes another person — and the owner typed it into a page
 * they chose to open. A scale or a state is a value the application offered and can
 * safely echo back; a note is not.
 */
function freeText(record: CanonicalRecord & { recordType: 'observation' }): boolean {
  return record.value.kind === 'note';
}

/**
 * An attribute id as something a person would say (`V33-012`).
 *
 * `state:sleep-recovery` became `Recorded state:sleep recovery` on the owner's main
 * surface: half a namespace, a stray colon, and a hyphen half-removed. The namespace is
 * real and useful internally; it is not what the change was.
 */
function attributeLabel(attribute: string): string {
  const withoutNamespace = attribute.slice(attribute.indexOf(':') + 1);
  const spaced = withoutNamespace.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * What was recorded, in the owner's terms (`V33-012`, v3.3 B2).
 *
 * This used to be `JSON.stringify(value)` with the braces stripped, which put
 * `kind:anchored-scale, scaleId:energy, scaleVersion:1, ordinal:1, label:Drained` on Now.
 * Every one of those fields exists for a reason — versioned anchors are how a reading stays
 * comparable after a rewording — but they are provenance, and Now is not an audit log. The
 * full value is still one tap away in Timeline, which is where it belongs.
 */
function valueSummary(value: CanonicalRecord & { recordType: 'observation' }): string {
  const inner = value.value;
  switch (inner.kind) {
    case 'anchored-scale':
      return inner.label;
    case 'state':
      return inner.state;
    case 'quantity':
      return `${String(inner.amount)} ${inner.unit}`;
    case 'duration':
      return `${String(inner.minutes)} minutes`;
    case 'count':
      return String(inner.count);
    case 'unsure':
      return 'Could not tell';
    case 'note':
      /* Never echoed. `freeText` routes here only as a guard. */
      return 'Open the area to read it';
  }
}

function describe(record: CanonicalRecord): { change: string; detail: string } {
  switch (record.recordType) {
    case 'observation':
      return {
        change: attributeLabel(record.attribute),
        detail: !quotable(record)
          ? 'Kept private — open the area to see it'
          : freeText(record)
            ? 'Open the area to read it'
            : valueSummary(record),
      };
    case 'observation-correction':
      return {
        change: `Corrected ${attributeLabel(record.attribute).toLowerCase()}`,
        detail: quotable(record) ? record.reason : 'Kept private — open the area to see it',
      };
    case 'context-snapshot':
      return {
        change: 'Context updated',
        detail:
          record.protectedContexts.length > 0
            ? `Protected: ${record.protectedContexts.join(', ')}`
            : 'Nothing protected',
      };
    case 'commitment':
      return {
        change: `Commitment ${record.state}`,
        detail: quotable(record) ? record.statement : 'Kept private',
      };
    case 'goal':
      return {
        change: `Goal ${record.state}`,
        detail: quotable(record) ? record.statement : 'Kept private',
      };
    case 'life-context-change':
      return {
        change: 'Life context changed',
        detail: quotable(record) ? record.summary : 'Kept private',
      };
    default:
      return { change: `Recorded ${record.recordType.replace(/-/g, ' ')}`, detail: '' };
  }
}

function outputLabel(output: DecisionOutput): string {
  switch (output.kind) {
    case 'action':
      return output.candidate.statement;
    case 'question':
      return 'a question';
    case 'silence':
      return 'deliberate silence';
    case 'insufficient-evidence':
      return 'insufficient evidence';
  }
}

export function detectMaterialChange(
  allRecords: readonly CanonicalRecord[],
  previous: Snapshot | undefined,
  current: Snapshot,
  now: Date,
): WhatChanged {
  const cluster = newestCluster(allRecords);

  if (previous === undefined) {
    return {
      changes:
        cluster.length === 0
          ? []
          : cluster.slice(0, 3).map((record) => {
              const described = describe(record);
              return {
                change: described.change,
                detail: described.detail,
                when: ago(record.recordedAt, now),
                altered: 'state' as const,
                recordIds: [record.recordId],
              };
            }),
      why: 'This is the first assessment, so there is nothing to compare it against yet.',
      since: 'No previous assessment',
      unchanged: [],
    };
  }

  const changes: MaterialChange[] = [];

  const outputChanged =
    previous.output.kind !== current.output.kind ||
    outputLabel(previous.output) !== outputLabel(current.output);
  const confidenceChanged = previous.state.confidence.label !== current.state.confidence.label;

  for (const record of cluster) {
    const described = describe(record);
    changes.push({
      change: described.change,
      detail: described.detail,
      when: ago(record.recordedAt, now),
      altered: outputChanged ? 'recommendation' : confidenceChanged ? 'confidence' : 'state',
      recordIds: [record.recordId],
    });
  }

  const why = outputChanged
    ? `The answer moved from ${outputLabel(previous.output)} to ${outputLabel(current.output)}.`
    : confidenceChanged
      ? `The answer is the same, but confidence moved from ${previous.state.confidence.label.replace(/-/g, ' ')} to ${current.state.confidence.label.replace(/-/g, ' ')}.`
      : 'Nothing material has moved. The picture is the same as it was.';

  const unchanged: string[] = [];
  if (!outputChanged) unchanged.push('The recommendation');
  if (!confidenceChanged) unchanged.push('Confidence in it');
  if (
    previous.state.protectedContexts.join(',') === current.state.protectedContexts.join(',')
  ) {
    unchanged.push('Protected contexts');
  }

  const since = cluster[0]?.recordedAt;

  return {
    changes,
    why,
    since:
      since === undefined
        ? 'No previous assessment'
        : `Last useful assessment: ${ago(since, now)}`,
    unchanged,
  };
}
