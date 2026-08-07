import { newRecordId, RECORD_SCHEMA_VERSION, type CanonicalRecord } from '../../domain/records';
import type { DomainPreferenceRecord, DomainState } from '../../domain/records/domains';
import type { DomainId } from '../../domain/domains/definitions';
import { isImplementedId } from '../../domain/domains/availability';
import {
  CADENCE_ATTRIBUTE,
  SNOOZE_ATTRIBUTE,
  type CoverageCadence,
} from '../../domain/domains/cadence';
import { localTimeContextFor } from './capture';
import { writeRecord, type WriteResult } from './writeRecord';

/**
 * Switching an area of life on and off (Prompt 8C follow-up).
 *
 * Three rules, all of which exist because the alternative is a settings blob:
 *
 *   1. **It is a canonical record.** The decision has a date, survives a backup and
 *      restore, and appears in history. A preference kept in `localStorage` would be
 *      silently lost by the recovery path this product spent Phase 6 proving.
 *   2. **It supersedes rather than accumulates.** Each change points at the preference
 *      it replaces, so exactly one is current per domain no matter how many times the
 *      owner changes their mind, and every earlier one is still readable.
 *   3. **Switching off deletes nothing.** There is no destructive branch here or in the
 *      schema. The observations the area was reading stay where they are, and switching
 *      it back on shows them again — which is the only thing that makes switching an
 *      area off a safe thing to try.
 */

/** The preference currently in force for one domain, if the owner has set one. */
export function currentPreference(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
): DomainPreferenceRecord | undefined {
  const superseded = new Set(
    records.flatMap((record) =>
      record.supersedesRecordId === undefined ? [] : [record.supersedesRecordId],
    ),
  );

  return records
    .filter(
      (record): record is DomainPreferenceRecord =>
        record.recordType === 'domain-preference' && record.domainId === domainId,
    )
    .filter((record) => !superseded.has(record.recordId))
    .reduce<DomainPreferenceRecord | undefined>(
      (newest, record) =>
        newest === undefined || record.recordedAt > newest.recordedAt ? record : newest,
      undefined,
    );
}

/**
 * Records the owner's decision about one area.
 *
 * Refuses an area this build has not implemented. That refusal is here as well as in
 * the interface because a control is a convention and a command is a rule: nothing else
 * writes this record type, so there is no path by which an area with no slice behind it
 * can end up switched on.
 */
export async function setDomainState(
  records: readonly CanonicalRecord[],
  input: { readonly domainId: DomainId; readonly state: DomainState; readonly reason?: string },
  now: Date,
): Promise<WriteResult> {
  if (!isImplementedId(input.domainId)) {
    return {
      ok: false,
      reason: 'invariant-violation',
      issues: [
        `This area has not been built yet, so it cannot be switched on. Nothing has been changed.`,
      ],
    };
  }

  const existing = currentPreference(records, input.domainId);
  const instant = now.toISOString();

  return writeRecord({
    recordId: newRecordId(),
    recordType: 'domain-preference',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    ...(existing === undefined ? {} : { supersedesRecordId: existing.recordId }),
    domainId: input.domainId,
    state: input.state,
    ...(input.reason === undefined ? {} : { reason: input.reason }),
  });
}

/**
 * Coverage cadence, and snooze (Phase 8 deliverable 19).
 *
 * Both are preferences about **how often the app may raise an area**, not about the area's
 * content, so they are ordinary observations rather than a new record family — there is no
 * fact about the owner's life here to make canonical.
 *
 * Neither can widen eligibility. `cadenceFor` and `snoozedUntil` are read only by the
 * suppression pass, which removes questions and never adds one; there is no code path by
 * which either setting promotes anything.
 */
export async function setCoverageCadence(
  input: { readonly domainId: DomainId; readonly cadence: CoverageCadence },
  now: Date,
): Promise<WriteResult> {
  const instant = now.toISOString();
  return writeRecord({
    recordId: newRecordId(),
    recordType: 'observation',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    category: 'direction-and-commitments',
    attribute: `${CADENCE_ATTRIBUTE}:${input.domainId}`,
    value: { kind: 'state', state: input.cadence },
  });
}

/**
 * Snooze one area until a date.
 *
 * Nothing accumulates while it runs and nothing is owed when it lapses. There is
 * deliberately nowhere to record that an area was snoozed repeatedly — a count like that
 * only ever becomes a way of making somebody feel watched.
 */
export async function snoozeArea(
  input: { readonly domainId: DomainId; readonly untilIso: string },
  now: Date,
): Promise<WriteResult> {
  const until = Date.parse(input.untilIso);
  if (Number.isNaN(until)) {
    return { ok: false, reason: 'schema-violation', issues: ['That is not a date'] };
  }

  const instant = now.toISOString();
  return writeRecord({
    recordId: newRecordId(),
    recordType: 'observation',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    category: 'direction-and-commitments',
    attribute: `${SNOOZE_ATTRIBUTE}:${input.domainId}`,
    value: { kind: 'state', state: new Date(until).toISOString() },
  });
}
