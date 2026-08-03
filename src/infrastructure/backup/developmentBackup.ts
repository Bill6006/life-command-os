import { z } from 'zod';
import { parseCanonicalRecord, type CanonicalRecord } from '../../domain/records';
import { checkCrossRecordInvariants } from '../../domain/policies/invariants';

/**
 * Development export and restore format (Phase 2 task 9).
 *
 * **This format is not encrypted, and it is not for real personal data.** Encrypted
 * portable backups arrive in Phase 6, and until that gate passes, meaningful private
 * data may not be entered at all. What this provides is the round trip the Phase 2
 * gate needs — canonical data survives a synthetic restore — and the shape that
 * Phase 6 will wrap in Web Crypto rather than replace.
 *
 * The file is deliberately plain JSON: legible, diffable, and inspectable by the
 * owner without the application.
 */

export const BACKUP_FORMAT_VERSION = 1;

export const backupEnvelope = z.strictObject({
  formatVersion: z.int().min(1),
  /** The record schema version these records were written under. */
  schemaVersion: z.int().min(1),
  exportedAt: z.iso.datetime(),
  recordCount: z.int().min(0),
  encrypted: z.literal(false),
  records: z.array(z.unknown()),
});

export type BackupEnvelope = z.infer<typeof backupEnvelope>;

export interface ValidatedBackup {
  readonly envelope: Omit<BackupEnvelope, 'records'>;
  readonly records: readonly CanonicalRecord[];
}

export type BackupProblem =
  | { readonly kind: 'malformed-envelope'; readonly issues: readonly string[] }
  | { readonly kind: 'unsupported-format'; readonly found: number; readonly supported: number }
  | { readonly kind: 'count-mismatch'; readonly declared: number; readonly actual: number }
  | {
      readonly kind: 'invalid-record';
      readonly index: number;
      readonly issues: readonly string[];
    }
  | { readonly kind: 'invariant-violation'; readonly issues: readonly string[] };

export type BackupValidation =
  | { readonly ok: true; readonly backup: ValidatedBackup }
  | { readonly ok: false; readonly problem: BackupProblem };

export function serializeBackup(
  records: readonly CanonicalRecord[],
  schemaVersion: number,
  exportedAt: Date,
): string {
  const envelope: BackupEnvelope = {
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt: exportedAt.toISOString(),
    recordCount: records.length,
    encrypted: false,
    records: records as unknown[],
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Validates a backup completely, before anything is written.
 *
 * Every record is parsed and the whole set is checked for cross-record violations
 * with `expectComplete`, because a backup claims to be a full picture — a
 * supersession link pointing at a record the backup does not contain means the file
 * is damaged, not merely partial.
 *
 * Nothing here touches the database. That separation is the entire safety property:
 * a corrupted backup is rejected while canonical state is still intact.
 */
export function validateBackup(raw: string): BackupValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      problem: {
        kind: 'malformed-envelope',
        issues: [error instanceof Error ? error.message : 'Backup is not valid JSON'],
      },
    };
  }

  const envelopeResult = backupEnvelope.safeParse(parsed);
  if (!envelopeResult.success) {
    return {
      ok: false,
      problem: {
        kind: 'malformed-envelope',
        issues: envelopeResult.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      },
    };
  }

  const envelope = envelopeResult.data;

  if (envelope.formatVersion !== BACKUP_FORMAT_VERSION) {
    return {
      ok: false,
      problem: {
        kind: 'unsupported-format',
        found: envelope.formatVersion,
        supported: BACKUP_FORMAT_VERSION,
      },
    };
  }

  if (envelope.recordCount !== envelope.records.length) {
    return {
      ok: false,
      problem: {
        kind: 'count-mismatch',
        declared: envelope.recordCount,
        actual: envelope.records.length,
      },
    };
  }

  const records: CanonicalRecord[] = [];
  for (const [index, candidate] of envelope.records.entries()) {
    const result = parseCanonicalRecord(candidate);
    if (!result.ok) {
      return { ok: false, problem: { kind: 'invalid-record', index, issues: result.issues } };
    }
    records.push(result.record);
  }

  const violations = checkCrossRecordInvariants(records, { expectComplete: true });
  if (violations.length > 0) {
    return {
      ok: false,
      problem: {
        kind: 'invariant-violation',
        issues: violations.map((v) => `${v.code} on ${v.recordId}: ${v.detail}`),
      },
    };
  }

  // Returns the parsed records rather than the raw ones the envelope carried.
  return {
    ok: true,
    backup: {
      envelope: {
        formatVersion: envelope.formatVersion,
        schemaVersion: envelope.schemaVersion,
        exportedAt: envelope.exportedAt,
        recordCount: envelope.recordCount,
        encrypted: envelope.encrypted,
      },
      records,
    },
  };
}
