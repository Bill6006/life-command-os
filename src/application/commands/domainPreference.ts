import { newRecordId, RECORD_SCHEMA_VERSION, type CanonicalRecord } from '../../domain/records';
import type { DomainPreferenceRecord, DomainState } from '../../domain/records/domains';
import type { DomainId } from '../../domain/domains/definitions';
import { isImplementedId } from '../../domain/domains/availability';
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
