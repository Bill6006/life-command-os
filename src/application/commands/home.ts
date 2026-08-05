import { newRecordId, RECORD_SCHEMA_VERSION } from '../../domain/records';
import {
  HOME_ATTRIBUTES,
  frictionAttribute,
  type EnvironmentPurposeId,
} from '../../domain/home/environment';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Writes from the home and environment area (Prompt 8G).
 *
 * ## One open change, enforced here as well as in the reading
 *
 * `nameEnvironmentChange` refuses while a change is already open. The candidate generator
 * also refuses to offer a second one, but a rule that lives only in the generator is a
 * rule the interface can walk around — and a second open item is the first step to a
 * list of jobs, which is the product this slice must not become. Two enforcement points
 * for one invariant is the right number when the invariant is the boundary.
 */

function envelopeFor(now: Date) {
  const instant = now.toISOString();
  return {
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry' as const,
    privacy: 'general' as const,
  };
}

function observation(
  attribute: string,
  value: { kind: 'state'; state: string } | { kind: 'note'; text: string },
  now: Date,
) {
  return {
    ...envelopeFor(now),
    recordId: newRecordId(),
    recordType: 'observation' as const,
    provenance: { method: 'direct-report' as const },
    category: 'home-and-environment' as const,
    attribute,
    value,
  };
}

/**
 * One thing that got in the way, recorded against what he was trying to do.
 *
 * The purpose is optional and is **not** defaulted when absent: a friction recorded from
 * a guide genuinely does not know what he was doing, and filling that in with a guess
 * would put made-up context into the one chart this domain draws.
 */
export async function recordFriction(
  input: {
    readonly kindLabel: string;
    readonly purpose?: EnvironmentPurposeId | undefined;
  },
  now: Date,
): Promise<WriteResult> {
  return writeRecord(
    observation(
      frictionAttribute(input.purpose),
      { kind: 'state', state: input.kindLabel },
      now,
    ),
  );
}

/** Access, setup time, conditions, transitions, and whether a change was made. */
export async function recordHomeState(
  input: { readonly attribute: string; readonly state: string },
  now: Date,
): Promise<WriteResult> {
  return writeRecord(observation(input.attribute, { kind: 'state', state: input.state }, now));
}

/**
 * The one change, in his words.
 *
 * `openChange` is passed in by the caller from the current reading rather than re-derived
 * here, so the refusal below cannot disagree with what the owner is looking at.
 */
export async function nameEnvironmentChange(
  input: { readonly statement: string; readonly openChange: string | undefined },
  now: Date,
): Promise<WriteResult> {
  const statement = input.statement.trim();
  if (statement === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }
  if (input.openChange !== undefined) {
    return {
      ok: false,
      reason: 'schema-violation',
      issues: [
        'One change at a time. Make the one you decided on, or drop it, before naming another.',
      ],
    };
  }

  return writeRecord(
    observation(HOME_ATTRIBUTES.changeNamed, { kind: 'note', text: statement }, now),
  );
}

/**
 * Something unexpected, through Quick Capture.
 *
 * Free text, and deliberately never quoted on Now — not because a jammed drawer is
 * sensitive, but because the rule that no note reaches the front page is general and a
 * per-domain exemption is how the general rule stops being one.
 */
export async function recordEnvironmentNote(text: string, now: Date): Promise<WriteResult> {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { ok: false, reason: 'schema-violation', issues: ['Nothing was written down'] };
  }
  return writeRecord(
    observation(HOME_ATTRIBUTES.frictionNote, { kind: 'note', text: trimmed }, now),
  );
}
