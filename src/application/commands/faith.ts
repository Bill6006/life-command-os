import { newRecordId, RECORD_SCHEMA_VERSION } from '../../domain/records';
import type { FaithAnchorKind } from '../../domain/records/faith';
import { FAITH_ATTRIBUTES } from '../../domain/faith/meaning';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Writes from the faith and meaning area (Prompt 8F).
 *
 * Every statement stored here arrives as a parameter from a control the owner typed
 * into. **Nothing in this file contains a value, a purpose, or a practice**, and there is
 * no default, no suggestion, and no example that could become one. That is what
 * "authority separation" means at the write path: the application supplies the container
 * and never the contents.
 */

function envelopeFor(now: Date) {
  const instant = now.toISOString();
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    privacy: 'faith' as const,
  };
}

/** Names something: what matters, why, or what he does about it. */
export async function nameFaithAnchor(
  input: {
    readonly kind: FaithAnchorKind;
    readonly statement: string;
    readonly servesRecordId?: string;
  },
  now: Date,
): Promise<WriteResult> {
  const statement = input.statement.trim();
  if (statement === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }

  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'faith-anchor',
    provenance: { method: 'direct-report' as const },
    kind: input.kind,
    statement,
    state: 'active',
    ...(input.servesRecordId === undefined ? {} : { servesRecordId: input.servesRecordId }),
  });
}

/**
 * Retiring something.
 *
 * Appends a retired record rather than deleting, so every observation made against it
 * stays readable. People stop doing things, and stopping is not a failure to record —
 * an app that erased what someone used to care about would be losing the more
 * interesting half of the history.
 */
export async function retireFaithAnchor(
  input: { readonly kind: FaithAnchorKind; readonly statement: string },
  now: Date,
): Promise<WriteResult> {
  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'faith-anchor',
    provenance: { method: 'direct-report' as const },
    kind: input.kind,
    statement: input.statement,
    state: 'retired',
  });
}

/**
 * One occasion, recorded against one practice.
 *
 * The practice's record id travels in `derivedFromRecordIds`, which is what lets the
 * reading count occasions per practice without a second store and without matching on
 * free text that he may reword tomorrow.
 */
export async function recordPracticeOccasion(
  input: { readonly practiceRecordId: string; readonly outcome: string },
  now: Date,
): Promise<WriteResult> {
  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'observation',
    provenance: {
      method: 'direct-report' as const,
      derivedFromRecordIds: [input.practiceRecordId],
    },
    category: 'faith-and-meaning',
    attribute: FAITH_ATTRIBUTES.practiceDone,
    value: { kind: 'state', state: input.outcome },
  });
}

/** Something done for someone else, or a repair named or done. */
export async function recordFaithObservation(
  input: {
    readonly attribute: string;
    readonly state?: string | undefined;
    readonly text?: string | undefined;
  },
  now: Date,
): Promise<WriteResult> {
  const text = input.text?.trim() ?? '';
  if (input.state === undefined && text === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was recorded'] };
  }

  return writeRecord({
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'observation',
    provenance: { method: 'direct-report' as const },
    category: 'faith-and-meaning',
    attribute: input.attribute,
    value:
      input.state === undefined
        ? { kind: 'note', text }
        : { kind: 'state', state: input.state },
  });
}

/**
 * Something he wrote about how it is going.
 *
 * Stored, and read by nothing. No branch of the candidate generator consults it, no
 * confidence calculation weighs it, and no condition sentence mentions it — recording it
 * is the entire feature.
 */
export async function recordFaithStruggle(text: string, now: Date): Promise<WriteResult> {
  return recordFaithObservation({ attribute: FAITH_ATTRIBUTES.struggle, text }, now);
}
