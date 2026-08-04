import { beforeEach, describe, expect, it } from 'vitest';
import { writeRecords } from '../../src/application/commands/writeRecord';
import { listAllRecords } from '../../src/application/queries/readRecords';
import {
  applyRestore,
  createEncryptedBackup,
  dryRunRestore,
  inspectBackup,
  listRestorePoints,
  rollbackToSnapshot,
  MINIMUM_PASSPHRASE_LENGTH,
} from '../../src/application/commands/recoveryCommands';
import {
  createVerifier,
  decryptPayload,
  encryptPayload,
  verifyPassphrase,
  PBKDF2_ITERATIONS,
} from '../../src/infrastructure/crypto/backupCrypto';
import { openBackup, previewBackup } from '../../src/infrastructure/backup/portableBackup';
import {
  parseWithUnknownFieldQuarantine,
  withUnknownFieldsRestored,
} from '../../src/domain/records';
import { openDatabase } from '../../src/infrastructure/database/connection';
import { resetDatabase } from '../support/database';
import { required } from '../support/required';
import {
  aCommitment,
  anObservation,
  anObservationCorrection,
  resetFixtureIds,
} from '../fixtures/records';

/**
 * Phase 6 Prompt 7B gate: encryption, recovery, and rollback.
 *
 * The property every test here defends is the same one: **canonical state is never
 * left in a condition nobody chose.** Either the restore happened and verified, or
 * nothing changed, or it was put back. There is no fourth outcome, and the tests are
 * written to try to produce one.
 */

const NOW = new Date('2026-08-04T09:00:00.000Z');
const PASSPHRASE = 'correct horse battery staple';

/** Flips one byte of a base64 payload, the way a damaged file would be damaged. */
function flipByte(base64: string, index: number): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  bytes[index] = (bytes[index] ?? 0) ^ 0xff;
  let out = '';
  for (const byte of bytes) out += String.fromCharCode(byte);
  return btoa(out);
}

async function seedRecords(): Promise<void> {
  const observation = anObservation();
  const results = await writeRecords([
    observation,
    anObservationCorrection(observation.recordId),
    aCommitment(),
  ]);
  expect(results.filter((result) => !result.ok)).toEqual([]);
}

beforeEach(async () => {
  resetFixtureIds();
  await resetDatabase();
});

/* -------------------------------------------------------------------------- */

describe('the cryptography is standard and used as intended', () => {
  it('round-trips through AES-GCM with a PBKDF2-derived key', async () => {
    const payload = await encryptPayload('the quick brown fox', PASSPHRASE);

    expect(payload.crypto.kdf).toBe('PBKDF2');
    expect(payload.crypto.kdfHash).toBe('SHA-256');
    expect(payload.crypto.cipher).toBe('AES-GCM');
    expect(payload.crypto.keyBits).toBe(256);
    expect(payload.crypto.iterations).toBe(PBKDF2_ITERATIONS);

    const opened = await decryptPayload(payload, PASSPHRASE);
    expect(opened.ok && opened.plaintext).toBe('the quick brown fox');
  });

  it('never reuses a salt or an initialisation vector', async () => {
    // GCM fails catastrophically on IV reuse under one key, so this is not a nicety.
    const first = await encryptPayload('same input', PASSPHRASE);
    const second = await encryptPayload('same input', PASSPHRASE);

    expect(first.crypto.saltBase64).not.toBe(second.crypto.saltBase64);
    expect(first.crypto.ivBase64).not.toBe(second.crypto.ivBase64);
    expect(first.ciphertextBase64).not.toBe(second.ciphertextBase64);
  });

  it('refuses the wrong passphrase without saying which half was wrong', async () => {
    const payload = await encryptPayload('secret', PASSPHRASE);
    const result = await decryptPayload(payload, 'not the passphrase');

    expect(result.ok).toBe(false);
    // One failure for a wrong passphrase and a damaged file, deliberately.
    expect(result.ok ? '' : result.failure.kind).toBe('wrong-passphrase-or-damaged');
  });

  it('rejects a file whose crypto parameters were edited', async () => {
    // The metadata is authenticated, so downgrading the iteration count does not
    // weaken the key — it breaks decryption.
    const payload = await encryptPayload('secret', PASSPHRASE);
    const tampered = { ...payload, crypto: { ...payload.crypto, iterations: 1000 } };

    const result = await decryptPayload(tampered, PASSPHRASE);
    expect(result.ok).toBe(false);
  });

  it('rejects a file whose ciphertext was edited', async () => {
    const payload = await encryptPayload('secret', PASSPHRASE);
    const tampered = {
      ...payload,
      ciphertextBase64: flipByte(payload.ciphertextBase64, 0),
    };

    const result = await decryptPayload(tampered, PASSPHRASE);
    expect(result.ok).toBe(false);
  });

  it('verifies a lock passphrase without storing it', async () => {
    const verifier = await createVerifier('open sesame');
    expect(JSON.stringify(verifier)).not.toContain('open sesame');
    await expect(verifyPassphrase(verifier, 'open sesame')).resolves.toBe(true);
    await expect(verifyPassphrase(verifier, 'open sesamf')).resolves.toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('the backup file', () => {
  it('round-trips every record exactly', async () => {
    await seedRecords();
    const before = await listAllRecords();

    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;

    const opened = await openBackup(backup.file, PASSPHRASE);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    expect(
      [...opened.backup.records].sort((a, b) => a.recordId.localeCompare(b.recordId)),
    ).toEqual([...before].sort((a, b) => a.recordId.localeCompare(b.recordId)));
  });

  it('contains no readable record content on disk', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    // The envelope is plaintext by design; nothing with content in it may be.
    expect(backup.file).not.toContain('observation');
    expect(backup.file).not.toContain('direct-report');
    expect(backup.file).not.toContain('recordId');
  });

  it('describes itself without the passphrase', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    const inspected = inspectBackup(backup.file);
    expect(inspected.ok).toBe(true);
    if (!inspected.ok) return;

    expect(inspected.preview.approximateRecordCount).toBe(3);
    expect(inspected.preview.cipher).toBe('AES-GCM-256');
    expect(inspected.preview.readable).toBe(true);
  });

  it('refuses a passphrase too short to be worth encrypting with', async () => {
    const result = await createEncryptedBackup('short', NOW);
    expect(result.ok).toBe(false);
    expect(result.ok ? '' : result.reason).toContain(String(MINIMUM_PASSPHRASE_LENGTH));
    // And it says plainly that nobody can recover it.
    expect(result.ok ? '' : result.reason).toMatch(/nobody can recover this/i);
  });

  it('identifies a file from a newer format rather than blaming the passphrase', () => {
    const future = JSON.stringify({
      format: 'life-command-os.backup',
      formatVersion: 99,
      createdAt: NOW.toISOString(),
      encrypted: true,
      approximateRecordCount: 1,
      crypto: {
        cryptoVersion: 1,
        kdf: 'PBKDF2',
        kdfHash: 'SHA-256',
        iterations: 600000,
        cipher: 'AES-GCM',
        keyBits: 256,
        saltBase64: 'AAAA',
        ivBase64: 'AAAA',
      },
      ciphertextBase64: 'AAAA',
    });

    const preview = previewBackup(future);
    expect(preview.ok && preview.preview.readable).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('corruption stops before mutation', () => {
  const cases: readonly { name: string; damage: (file: string) => string }[] = [
    { name: 'not JSON at all', damage: () => '{ not json' },
    { name: 'not a backup', damage: () => JSON.stringify({ hello: 'world' }) },
    {
      name: 'ciphertext flipped',
      damage: (file) => {
        const parsed = JSON.parse(file) as { ciphertextBase64: string };
        return JSON.stringify({
          ...parsed,
          ciphertextBase64: flipByte(parsed.ciphertextBase64, 5),
        });
      },
    },
    {
      name: 'truncated',
      damage: (file) => {
        const parsed = JSON.parse(file) as { ciphertextBase64: string };
        return JSON.stringify({
          ...parsed,
          ciphertextBase64: parsed.ciphertextBase64.slice(0, 40),
        });
      },
    },
  ];

  for (const { name, damage } of cases) {
    it(`rejects a backup that is ${name}, leaving canonical state untouched`, async () => {
      await seedRecords();
      const before = await listAllRecords();

      const backup = await createEncryptedBackup(PASSPHRASE, NOW);
      if (!backup.ok) throw new Error('backup failed');

      const result = await applyRestore(damage(backup.file), PASSPHRASE, NOW);

      expect(result.ok).toBe(false);
      // Nothing was opened, so nothing was rolled back either — the distinction
      // matters: a rollback means state *was* changed and put back.
      expect(result.ok ? true : result.rolledBack).toBe(false);
      await expect(listAllRecords()).resolves.toEqual(before);
      // And no snapshot was taken, because nothing was about to be replaced.
      await expect(listRestorePoints()).resolves.toEqual([]);
    });
  }

  it('rejects a backup whose contents no longer match its own checksum', async () => {
    // Reaches inside the encryption to corrupt the payload consistently, which is the
    // one way to defeat the auth tag: re-encrypt a payload with a wrong digest.
    await seedRecords();
    const records = await listAllRecords();

    const payload = {
      payloadVersion: 1,
      storageSchemaVersion: 3,
      recordCount: records.length,
      integrity: { algorithm: 'SHA-256' as const, digest: 'not-the-real-digest' },
      records,
    };
    const encrypted = await encryptPayload(JSON.stringify(payload), PASSPHRASE);
    const file = JSON.stringify({
      format: 'life-command-os.backup',
      formatVersion: 2,
      createdAt: NOW.toISOString(),
      encrypted: true,
      approximateRecordCount: records.length,
      crypto: encrypted.crypto,
      ciphertextBase64: encrypted.ciphertextBase64,
    });

    const opened = await openBackup(file, PASSPHRASE);
    expect(opened.ok).toBe(false);
    expect(opened.ok ? '' : opened.problem.kind).toBe('integrity-mismatch');
  });

  it('rejects a backup containing an invalid record', async () => {
    await seedRecords();
    const records = await listAllRecords();
    const broken = [...records, { recordType: 'observation', recordId: 'not-a-uuid' }];

    const serialised = JSON.stringify(broken);
    const { digestOf } = await import('../../src/infrastructure/crypto/backupCrypto');
    const payload = {
      payloadVersion: 1,
      storageSchemaVersion: 3,
      recordCount: broken.length,
      integrity: { algorithm: 'SHA-256' as const, digest: await digestOf(serialised) },
      records: broken,
    };
    const encrypted = await encryptPayload(JSON.stringify(payload), PASSPHRASE);
    const file = JSON.stringify({
      format: 'life-command-os.backup',
      formatVersion: 2,
      createdAt: NOW.toISOString(),
      encrypted: true,
      approximateRecordCount: broken.length,
      crypto: encrypted.crypto,
      ciphertextBase64: encrypted.ciphertextBase64,
    });

    const before = await listAllRecords();
    const result = await applyRestore(file, PASSPHRASE, NOW);
    expect(result.ok).toBe(false);
    await expect(listAllRecords()).resolves.toEqual(before);
  });
});

/* -------------------------------------------------------------------------- */

describe('the dry run describes without doing', () => {
  it('reports what would be added, replaced, and removed — and writes nothing', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    // Diverge: add a record that is not in the backup.
    await writeRecords([aCommitment()]);
    const before = await listAllRecords();

    const dry = await dryRunRestore(backup.file, PASSPHRASE);
    expect(dry.ok).toBe(true);
    if (!dry.ok) return;

    expect(dry.plan.incomingCount).toBe(3);
    expect(dry.plan.currentCount).toBe(4);
    expect(dry.plan.retained).toBe(3);
    expect(dry.plan.added).toBe(0);
    // The consequential number: one record here now would be removed.
    expect(dry.plan.removed).toBe(1);
    expect(dry.plan.rollbackAvailable).toBe(true);

    await expect(listAllRecords()).resolves.toEqual(before);
    await expect(listRestorePoints()).resolves.toEqual([]);
  });

  it('reports the privacy classes a backup contains', async () => {
    await writeRecords([anObservation({ privacy: 'health' })]);
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    const dry = await dryRunRestore(backup.file, PASSPHRASE);
    expect(dry.ok && dry.plan.privacyClasses).toContain('health');
  });

  it('refuses the wrong passphrase without touching anything', async () => {
    await seedRecords();
    const before = await listAllRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    const dry = await dryRunRestore(backup.file, 'wrong passphrase entirely');
    expect(dry.ok).toBe(false);
    expect(dry.ok ? '' : dry.message).toMatch(/Nothing has been changed/);
    await expect(listAllRecords()).resolves.toEqual(before);
  });
});

/* -------------------------------------------------------------------------- */

describe('restore, verification, and rollback', () => {
  it('replaces, verifies against storage, and reports the verified digest', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');
    const original = await listAllRecords();

    // Diverge, then restore.
    await writeRecords([aCommitment(), aCommitment()]);
    expect((await listAllRecords()).length).toBe(5);

    const result = await applyRestore(backup.file, PASSPHRASE, NOW);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);
    if (!result.ok) return;

    expect(result.restoredCount).toBe(3);
    expect(result.verifiedDigest).toHaveLength(64);
    await expect(listAllRecords()).resolves.toEqual(original);
  });

  it('takes a restore point before replacing anything', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    await writeRecords([aCommitment()]);
    const beforeRestore = await listAllRecords();

    await applyRestore(backup.file, PASSPHRASE, NOW);

    const points = await listRestorePoints();
    expect(points).toHaveLength(1);
    expect(required(points[0], 'a restore point').recordCount).toBe(beforeRestore.length);
  });

  it('rolls back to exactly what was there before', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    await writeRecords([aCommitment()]);
    const beforeRestore = await listAllRecords();

    await applyRestore(backup.file, PASSPHRASE, NOW);
    expect((await listAllRecords()).length).toBe(3);

    const point = required((await listRestorePoints())[0], 'a restore point');
    const rolled = await rollbackToSnapshot(point.snapshotId);

    expect(rolled.ok).toBe(true);
    const after = await listAllRecords();
    expect([...after].sort((a, b) => a.recordId.localeCompare(b.recordId))).toEqual(
      [...beforeRestore].sort((a, b) => a.recordId.localeCompare(b.recordId)),
    );
  });

  it('refuses to roll back to a damaged restore point', async () => {
    await seedRecords();
    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');
    await applyRestore(backup.file, PASSPHRASE, NOW);

    const point = required((await listRestorePoints())[0], 'a restore point');

    // Corrupt the stored snapshot behind the command's back.
    const database = await openDatabase();
    const stored = required(await database.snapshots.get(point.snapshotId), 'the snapshot');
    await database.snapshots.put({ ...stored, digest: 'not-the-real-digest' });

    const before = await listAllRecords();
    const rolled = await rollbackToSnapshot(point.snapshotId);

    expect(rolled.ok).toBe(false);
    expect(rolled.ok ? '' : rolled.message).toMatch(/Nothing has been changed/);
    await expect(listAllRecords()).resolves.toEqual(before);
  });

  it('never reports success without reading back from storage', async () => {
    // The verification digest is computed from what `listAllRecords` returns, so a
    // restore that wrote nothing cannot pass. Proven by restoring an empty backup
    // into a populated store and checking the store actually emptied.
    await resetDatabase();
    const empty = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!empty.ok) throw new Error('backup failed');

    await seedRecords();
    expect((await listAllRecords()).length).toBe(3);

    const result = await applyRestore(empty.file, PASSPHRASE, NOW);
    expect(result.ok).toBe(true);
    await expect(listAllRecords()).resolves.toEqual([]);
  });

  it('keeps history from silently shrinking: superseded records survive a round trip', async () => {
    await seedRecords();
    const before = await listAllRecords();
    // Three records, one of which supersedes another. A restore that kept only
    // "current" records would quietly discard the original observation.
    expect(before.some((record) => record.supersedesRecordId !== undefined)).toBe(true);

    const backup = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!backup.ok) throw new Error('backup failed');

    await resetDatabase();
    const result = await applyRestore(backup.file, PASSPHRASE, NOW);

    expect(result.ok).toBe(true);
    const after = await listAllRecords();
    expect(after).toHaveLength(before.length);
    expect(after.some((record) => record.supersedesRecordId !== undefined)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe('unknown fields and privacy metadata survive', () => {
  it('quarantines a field a newer version wrote, and puts it back on export', () => {
    const future = { ...anObservation(), somethingFromTheFuture: { nested: true } };

    const parsed = parseWithUnknownFieldQuarantine(future);
    expect(parsed.ok, parsed.ok ? '' : parsed.issues.join('; ')).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.record).toMatchObject({
      unknownFields: { somethingFromTheFuture: { nested: true } },
    });

    const restored = withUnknownFieldsRestored(parsed.record) as Record<string, unknown>;
    expect(restored['somethingFromTheFuture']).toEqual({ nested: true });
    expect(restored['unknownFields']).toBeUndefined();
  });

  it('still rejects an unknown field nested inside a value it does understand', () => {
    // Moving it would change the meaning of a field this version claims to read.
    const bad = { ...anObservation(), value: { kind: 'count', count: 1, extra: 'no' } };
    expect(parseWithUnknownFieldQuarantine(bad).ok).toBe(false);
  });

  it('carries unknown fields and privacy through a full backup round trip', async () => {
    await writeRecords([
      anObservation({ privacy: 'health', fieldPrivacy: { value: 'private-pattern' } }),
    ]);

    // Simulate a file written by a newer version.
    const stored = await listAllRecords();
    const withFuture = [{ ...required(stored[0], 'a record'), futureField: 'kept' }];
    const { digestOf } = await import('../../src/infrastructure/crypto/backupCrypto');
    const serialised = JSON.stringify(withFuture);
    const encrypted = await encryptPayload(
      JSON.stringify({
        payloadVersion: 1,
        storageSchemaVersion: 3,
        recordCount: 1,
        integrity: { algorithm: 'SHA-256' as const, digest: await digestOf(serialised) },
        records: withFuture,
      }),
      PASSPHRASE,
    );
    const file = JSON.stringify({
      format: 'life-command-os.backup',
      formatVersion: 2,
      createdAt: NOW.toISOString(),
      encrypted: true,
      approximateRecordCount: 1,
      crypto: encrypted.crypto,
      ciphertextBase64: encrypted.ciphertextBase64,
    });

    await resetDatabase();
    const result = await applyRestore(file, PASSPHRASE, NOW);
    expect(result.ok, result.ok ? '' : result.message).toBe(true);

    const restored = required((await listAllRecords())[0], 'the restored record');
    expect(restored).toMatchObject({
      privacy: 'health',
      fieldPrivacy: { value: 'private-pattern' },
      unknownFields: { futureField: 'kept' },
    });

    // And it comes back out again in a fresh backup.
    const roundTrip = await createEncryptedBackup(PASSPHRASE, NOW);
    if (!roundTrip.ok) throw new Error('backup failed');
    const reopened = await openBackup(roundTrip.file, PASSPHRASE);
    expect(reopened.ok && reopened.backup.quarantinedFieldCount).toBe(1);
  });
});
