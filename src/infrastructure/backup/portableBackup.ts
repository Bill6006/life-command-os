import { z } from 'zod';
import {
  parseWithUnknownFieldQuarantine,
  withUnknownFieldsRestored,
  type CanonicalRecord,
} from '../../domain/records';
import { checkCrossRecordInvariants } from '../../domain/policies/invariants';
import {
  BACKUP_FORMAT_VERSION,
  decryptPayload,
  digestOf,
  encryptPayload,
  type DecryptFailure,
} from '../crypto/backupCrypto';

/**
 * The portable backup file (`OWN-066`, `OWN-067`, LEG-128, LEG-133).
 *
 * An **exact recovery package**: every canonical record, its provenance, its privacy
 * classification, its corrections, and any fields a newer version wrote that this one
 * does not understand. It is not readable, not summarised, and not for analysis —
 * that is the AI export, which is a different product and says so on its face.
 *
 * ## The shape, and why it is split
 *
 * The envelope is **plaintext**: format version, when it was made, and the crypto
 * parameters. That is deliberate. It lets the app tell the owner what a file is —
 * "made on the 4th of August, 41 records" — before asking for a passphrase, and it
 * lets a future version recognise a format it cannot read and say so plainly instead
 * of failing with a decryption error that looks like a wrong password.
 *
 * Everything with content in it is **inside the ciphertext**. The record count is
 * carried in both places on purpose: the outer one is a hint for the preview, the
 * inner one is the authority, and a mismatch between them is a damaged file.
 */

/* -------------------------------------------------------------------------- */
/* The file                                                                    */
/* -------------------------------------------------------------------------- */

const cryptoMetadata = z.strictObject({
  cryptoVersion: z.int().min(1),
  kdf: z.string().min(1),
  kdfHash: z.string().min(1),
  iterations: z.int().min(1),
  cipher: z.string().min(1),
  keyBits: z.int().min(1),
  saltBase64: z.string().min(1),
  ivBase64: z.string().min(1),
});

export const backupFile = z.strictObject({
  /** A self-describing marker, so a stray file is recognisable without guessing. */
  format: z.literal('life-command-os.backup'),
  formatVersion: z.int().min(1),
  createdAt: z.iso.datetime(),
  /** Encrypted, always. There is no unencrypted branch of this format. */
  encrypted: z.literal(true),
  /** A hint for the preview only. The count inside the ciphertext is the authority. */
  approximateRecordCount: z.int().min(0),
  crypto: cryptoMetadata,
  ciphertextBase64: z.string().min(1),
});
export type BackupFile = z.infer<typeof backupFile>;

/** What is inside the ciphertext. */
export const backupPayload = z.strictObject({
  payloadVersion: z.int().min(1),
  storageSchemaVersion: z.int().min(1),
  recordCount: z.int().min(0),
  integrity: z.strictObject({
    algorithm: z.literal('SHA-256'),
    digest: z.string().min(1),
  }),
  records: z.array(z.unknown()),
});

export const PAYLOAD_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Failures                                                                    */
/* -------------------------------------------------------------------------- */

export type BackupProblem =
  | { readonly kind: 'not-json'; readonly detail: string }
  | { readonly kind: 'not-a-backup'; readonly issues: readonly string[] }
  | {
      readonly kind: 'unsupported-format';
      readonly found: number;
      readonly supported: number;
    }
  | { readonly kind: 'decryption-failed'; readonly failure: DecryptFailure }
  | { readonly kind: 'malformed-payload'; readonly issues: readonly string[] }
  | { readonly kind: 'integrity-mismatch'; readonly expected: string; readonly actual: string }
  | { readonly kind: 'count-mismatch'; readonly declared: number; readonly actual: number }
  | {
      readonly kind: 'invalid-record';
      readonly index: number;
      readonly issues: readonly string[];
    }
  | { readonly kind: 'invariant-violation'; readonly issues: readonly string[] };

/**
 * A sentence the owner can act on. Never a stack trace, never a raw payload.
 *
 * **Every message ends by saying nothing has been changed**, because on a screen about
 * a destructive operation that is the sentence the reader is looking for. Two of them
 * originally omitted it — the ones for a file that is not a backup at all — which is
 * exactly the case where someone has picked the wrong file and is most likely to
 * panic. A browser test now holds the whole set to it.
 */
export function describeProblem(problem: BackupProblem): string {
  switch (problem.kind) {
    case 'not-json':
      return 'That file is not a Life Command OS backup — it is not readable as JSON. Nothing has been changed.';
    case 'not-a-backup':
      return 'That file is not a Life Command OS backup. Nothing has been changed.';
    case 'unsupported-format':
      return `That backup was written in format ${String(problem.found)}; this version reads format ${String(problem.supported)}. Use a newer version of the app to open it. Nothing has been changed.`;
    case 'decryption-failed':
      return problem.failure.kind === 'wrong-passphrase-or-damaged'
        ? 'That passphrase did not work, or the file has been altered since it was made. Nothing has been changed.'
        : 'That backup declares encryption settings this version cannot use. Nothing has been changed.';
    case 'malformed-payload':
      return 'The backup decrypted, but its contents are not in the expected shape. Nothing has been changed.';
    case 'integrity-mismatch':
      return 'The backup decrypted, but its contents do not match its own checksum. It is damaged. Nothing has been changed.';
    case 'count-mismatch':
      return `The backup says it holds ${String(problem.declared)} records but contains ${String(problem.actual)}. It is damaged. Nothing has been changed.`;
    case 'invalid-record':
      return `Record ${String(problem.index + 1)} in the backup is not valid. Nothing has been changed.`;
    case 'invariant-violation':
      return 'The backup is internally inconsistent — records reference each other in a way that cannot be true. Nothing has been changed.';
  }
}

/* -------------------------------------------------------------------------- */
/* Writing                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Canonical serialisation of the record set.
 *
 * The integrity digest is taken over exactly this string, and so is the verification
 * digest after a restore. Both sides must produce byte-identical output for equal
 * data, which is why the records are sorted by id rather than left in storage order —
 * IndexedDB makes no ordering promise across profiles.
 */
export function serialiseRecords(records: readonly CanonicalRecord[]): string {
  const restored = [...records]
    .sort((a, b) => a.recordId.localeCompare(b.recordId))
    .map(withUnknownFieldsRestored);
  return JSON.stringify(restored);
}

export async function createBackupFile(
  records: readonly CanonicalRecord[],
  storageSchemaVersion: number,
  passphrase: string,
  now: Date,
): Promise<string> {
  const serialised = serialiseRecords(records);

  const payload = {
    payloadVersion: PAYLOAD_VERSION,
    storageSchemaVersion,
    recordCount: records.length,
    integrity: { algorithm: 'SHA-256' as const, digest: await digestOf(serialised) },
    records: JSON.parse(serialised) as unknown[],
  };

  const encrypted = await encryptPayload(JSON.stringify(payload), passphrase);

  const file: BackupFile = {
    format: 'life-command-os.backup',
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: now.toISOString(),
    encrypted: true,
    approximateRecordCount: records.length,
    crypto: encrypted.crypto,
    ciphertextBase64: encrypted.ciphertextBase64,
  };

  return JSON.stringify(file, null, 2);
}

/* -------------------------------------------------------------------------- */
/* Reading                                                                     */
/* -------------------------------------------------------------------------- */

export interface BackupPreview {
  readonly formatVersion: number;
  readonly createdAt: string;
  readonly approximateRecordCount: number;
  readonly kdf: string;
  readonly iterations: number;
  readonly cipher: string;
  readonly readable: boolean;
}

/**
 * Describes a file **without the passphrase**.
 *
 * Everything here comes from the plaintext envelope. It exists so the owner can see
 * what they picked before typing a passphrase into it, and so a file from a newer
 * version is identified as such rather than misreported as a wrong password.
 */
export function previewBackup(
  raw: string,
): { ok: true; preview: BackupPreview } | { ok: false; problem: BackupProblem } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      problem: {
        kind: 'not-json',
        detail: error instanceof Error ? error.message : 'Unreadable',
      },
    };
  }

  const result = backupFile.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      problem: {
        kind: 'not-a-backup',
        issues: result.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      },
    };
  }

  const file = result.data;
  return {
    ok: true,
    preview: {
      formatVersion: file.formatVersion,
      createdAt: file.createdAt,
      approximateRecordCount: file.approximateRecordCount,
      kdf: `${file.crypto.kdf}-${file.crypto.kdfHash}`,
      iterations: file.crypto.iterations,
      cipher: `${file.crypto.cipher}-${String(file.crypto.keyBits)}`,
      readable: file.formatVersion === BACKUP_FORMAT_VERSION,
    },
  };
}

export interface OpenedBackup {
  readonly records: readonly CanonicalRecord[];
  readonly createdAt: string;
  readonly storageSchemaVersion: number;
  readonly digest: string;
  /** Records that carried fields this version does not understand. */
  readonly quarantinedFieldCount: number;
}

export type OpenResult =
  | { readonly ok: true; readonly backup: OpenedBackup }
  | { readonly ok: false; readonly problem: BackupProblem };

/**
 * Decrypts and validates completely, touching no storage at all.
 *
 * The ordering is the safety property, and it is the same one Phase 2 established:
 * **everything is checked before anything is written.** A backup that fails at the
 * last record is rejected with canonical state exactly as it was, because canonical
 * state was never opened.
 *
 * The checks, in order and each with a distinct failure:
 *   1. it is JSON, and it is a backup file;
 *   2. the format version is one this build reads;
 *   3. it decrypts — which is also the authenticity check, since AES-GCM will not
 *      decrypt a file whose ciphertext *or crypto metadata* has been altered;
 *   4. the payload has the expected shape;
 *   5. the contents match their own checksum;
 *   6. the declared count matches the actual one;
 *   7. every record validates individually;
 *   8. the set is internally consistent as a complete picture.
 */
export async function openBackup(raw: string, passphrase: string): Promise<OpenResult> {
  const preview = previewBackup(raw);
  if (!preview.ok) return { ok: false, problem: preview.problem };

  if (!preview.preview.readable) {
    return {
      ok: false,
      problem: {
        kind: 'unsupported-format',
        found: preview.preview.formatVersion,
        supported: BACKUP_FORMAT_VERSION,
      },
    };
  }

  const file = backupFile.parse(JSON.parse(raw));

  const decrypted = await decryptPayload(
    { crypto: file.crypto, ciphertextBase64: file.ciphertextBase64 },
    passphrase,
  );
  if (!decrypted.ok) {
    return { ok: false, problem: { kind: 'decryption-failed', failure: decrypted.failure } };
  }

  let payloadJson: unknown;
  try {
    payloadJson = JSON.parse(decrypted.plaintext);
  } catch {
    return {
      ok: false,
      problem: { kind: 'malformed-payload', issues: ['Payload is not JSON'] },
    };
  }

  const payloadResult = backupPayload.safeParse(payloadJson);
  if (!payloadResult.success) {
    return {
      ok: false,
      problem: {
        kind: 'malformed-payload',
        issues: payloadResult.error.issues.map(
          (issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`,
        ),
      },
    };
  }

  const payload = payloadResult.data;

  const actualDigest = await digestOf(JSON.stringify(payload.records));
  if (actualDigest !== payload.integrity.digest) {
    return {
      ok: false,
      problem: {
        kind: 'integrity-mismatch',
        expected: payload.integrity.digest,
        actual: actualDigest,
      },
    };
  }

  if (payload.recordCount !== payload.records.length) {
    return {
      ok: false,
      problem: {
        kind: 'count-mismatch',
        declared: payload.recordCount,
        actual: payload.records.length,
      },
    };
  }

  const records: CanonicalRecord[] = [];
  let quarantined = 0;
  for (const [index, candidate] of payload.records.entries()) {
    const result = parseWithUnknownFieldQuarantine(candidate);
    if (!result.ok) {
      return { ok: false, problem: { kind: 'invalid-record', index, issues: result.issues } };
    }
    if ((result.record as { unknownFields?: unknown }).unknownFields !== undefined) {
      quarantined += 1;
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

  return {
    ok: true,
    backup: {
      records,
      createdAt: file.createdAt,
      storageSchemaVersion: payload.storageSchemaVersion,
      digest: payload.integrity.digest,
      quarantinedFieldCount: quarantined,
    },
  };
}
