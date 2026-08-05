import { newRecordId, RECORD_SCHEMA_VERSION } from '../../domain/records';
import type { PermissibleSurface, ProtectedTopic } from '../../domain/records/permissions';
import type { LifeCategory } from '../../domain/records/categories';
import type { PrivacyClass } from '../../domain/records/envelope';
import { EMOTIONAL_ATTRIBUTES } from '../../domain/emotional/social';
import { TOPIC_ENABLED_ATTRIBUTE } from '../../domain/emotional/permissions';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Writes from the emotional and social area (Prompt 8E).
 *
 * ## Two things this file will not do
 *
 * It cannot write anything about another **person** — there is no person parameter
 * anywhere below, because there is no person record to write one into. And it cannot
 * enable a protected topic as a side effect of anything: switching Private Patterns on
 * is its own command, taking its own explicit argument, called from a control the owner
 * pressed.
 */

function envelopeFor(now: Date, privacy: PrivacyClass) {
  const instant = now.toISOString();
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    provenance: { method: 'direct-report' as const },
    privacy,
  };
}

/** One anchored or chosen answer about what happened. */
export async function recordEmotionalObservation(
  input: {
    readonly attribute: string;
    readonly state?: string;
    readonly text?: string;
    readonly privacy?: 'relationship' | 'private-pattern';
  },
  now: Date,
): Promise<WriteResult> {
  const text = input.text?.trim() ?? '';
  if (input.state === undefined && text === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was recorded'] };
  }

  return writeRecord({
    ...envelopeFor(now, input.privacy ?? 'relationship'),
    recordId: newRecordId(),
    recordType: 'observation',
    category: 'emotional-and-relationships',
    attribute: input.attribute,
    value:
      input.state === undefined
        ? { kind: 'note', text }
        : { kind: 'state', state: input.state },
  });
}

/** The boundary the owner decided on, in his own words. */
export async function recordBoundary(text: string, now: Date): Promise<WriteResult> {
  return recordEmotionalObservation(
    { attribute: EMOTIONAL_ATTRIBUTES.boundaryDecided, text },
    now,
  );
}

/**
 * A private note.
 *
 * Classified `private-pattern` — the most protected class there is — so it is excluded
 * from exports unless the owner separately grants the export surface, and it never
 * appears on any surface he did not open himself.
 */
export async function recordPrivateNote(text: string, now: Date): Promise<WriteResult> {
  return recordEmotionalObservation(
    { attribute: EMOTIONAL_ATTRIBUTES.note, text, privacy: 'private-pattern' },
    now,
  );
}

/**
 * Switching a protected topic on or off.
 *
 * Enablement is **not** permission. Switching Private Patterns on means the owner wants
 * somewhere to record them and will find that place himself; it grants no surface
 * anything. That separation is why turning the topic on cannot, by itself, cause a
 * single word of it to appear anywhere.
 */
export async function setTopicEnabled(
  topic: ProtectedTopic,
  enabled: boolean,
  now: Date,
  /*
   * Where the decision is filed, and how sensitive it is. Defaulted to this slice's own
   * values so Prompt 8E's callers are unchanged; Prompt 8H passes money's, because a
   * decision about amounts is money data and belongs in the money category.
   */
  filing: { readonly category: LifeCategory; readonly privacy: PrivacyClass } = {
    category: 'emotional-and-relationships',
    privacy: 'relationship',
  },
): Promise<WriteResult> {
  return writeRecord({
    ...envelopeFor(now, filing.privacy),
    recordId: newRecordId(),
    recordType: 'observation',
    category: filing.category,
    attribute: `${TOPIC_ENABLED_ATTRIBUTE}:${topic}`,
    value: { kind: 'state', state: enabled ? 'On' : 'Off' },
  });
}

/**
 * Granting or revoking one surface for one topic.
 *
 * One topic, one surface, one decision. There is deliberately no "allow everywhere"
 * argument: a single switch that opened four surfaces at once would be pressed in a
 * hurry and regretted on a shared screen.
 *
 * Revoking appends rather than deletes, so "I turned this off in March" stays readable.
 */
export async function setSurfacePermission(
  input: {
    readonly topic: ProtectedTopic;
    readonly surface: PermissibleSurface;
    readonly granted: boolean;
    readonly reason?: string;
  },
  now: Date,
): Promise<WriteResult> {
  const reason = input.reason?.trim() ?? '';

  return writeRecord({
    ...envelopeFor(now, 'relationship'),
    recordId: newRecordId(),
    recordType: 'surface-permission',
    topic: input.topic,
    surface: input.surface,
    granted: input.granted,
    ...(reason === '' ? {} : { reason }),
  });
}
