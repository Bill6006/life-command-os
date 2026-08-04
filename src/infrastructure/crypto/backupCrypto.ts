/**
 * Backup encryption (Prompt 7B tasks 1–2, `OWN-066`, LEG-139).
 *
 * **Nothing here is invented.** Every primitive is a Web Crypto standard used in its
 * intended way: PBKDF2-HMAC-SHA-256 to turn a passphrase into a key, AES-256-GCM to
 * encrypt and authenticate. There is no custom cipher, no hand-rolled MAC, no
 * home-made key schedule. Cryptography that a competent reviewer cannot recognise on
 * sight is cryptography nobody should trust, least of all with the only copy of
 * someone's life.
 *
 * ## Decisions and why
 *
 * **PBKDF2 at 600,000 iterations.** The OWASP 2023 guidance for PBKDF2-HMAC-SHA-256.
 * Argon2id would be stronger against GPU attack, but it is not in Web Crypto, and
 * importing a WASM implementation would mean shipping a cryptographic dependency to
 * protect a local file — a worse trade than a well-parameterised standard primitive.
 * The iteration count is stored in the file, so it can be raised later without
 * orphaning existing backups.
 *
 * **The crypto metadata is authenticated, not merely stored.** It is passed to
 * AES-GCM as additional authenticated data. An attacker who edits the file to claim
 * 1,000 iterations instead of 600,000 does not get a weaker key — they get a
 * decryption failure, because the metadata they altered is covered by the auth tag.
 *
 * **A random salt and a random IV per backup, never reused.** GCM fails
 * catastrophically on IV reuse under the same key, so both come from
 * `crypto.getRandomValues` on every export.
 *
 * ## What this does not do
 *
 * It does not protect a passphrase that is guessable, and there is no recovery if the
 * passphrase is lost — none is possible, which is the point of the design and is
 * stated to the owner in those words. It does not encrypt the local database; it
 * encrypts the portable file.
 */

/** Bumped when the on-disk shape changes in a way older readers cannot parse. */
export const BACKUP_FORMAT_VERSION = 2;

/** Bumped when the cryptographic parameters change. Read before deriving anything. */
export const CRYPTO_VERSION = 1;

export const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const KEY_BITS = 256;

/**
 * The parameters as they appear in the file.
 *
 * The algorithm names are `string`, not literals, on purpose: this describes bytes
 * that came off disk and may say anything at all. `decryptPayload` is where a file
 * claiming something unsupported is rejected, with a message about parameters rather
 * than a parse error that would read like a wrong passphrase.
 */
export interface CryptoMetadata {
  readonly cryptoVersion: number;
  readonly kdf: string;
  readonly kdfHash: string;
  readonly iterations: number;
  readonly cipher: string;
  readonly keyBits: number;
  readonly saltBase64: string;
  readonly ivBase64: string;
}

export interface EncryptedPayload {
  readonly crypto: CryptoMetadata;
  readonly ciphertextBase64: string;
}

export type DecryptFailure =
  | { readonly kind: 'unsupported-crypto-version'; readonly found: number }
  | { readonly kind: 'malformed-crypto-metadata'; readonly detail: string }
  | { readonly kind: 'wrong-passphrase-or-damaged' };

export type DecryptResult =
  | { readonly ok: true; readonly plaintext: string }
  | { readonly ok: false; readonly failure: DecryptFailure };

/* -------------------------------------------------------------------------- */

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * The exact bytes fed to AES-GCM as additional authenticated data.
 *
 * Field order is fixed here rather than taken from `JSON.stringify` of the object,
 * because key order is not part of the JSON data model and a reordering would make
 * every previous backup undecryptable.
 */
function authenticatedMetadata(meta: CryptoMetadata): ArrayBuffer {
  const canonical = [
    String(meta.cryptoVersion),
    meta.kdf,
    meta.kdfHash,
    String(meta.iterations),
    meta.cipher,
    String(meta.keyBits),
    meta.saltBase64,
    meta.ivBase64,
  ].join('|');
  // Copied into a fresh buffer so the type is an owned ArrayBuffer, which is what
  // `additionalData` requires.
  return new Uint8Array(new TextEncoder().encode(canonical)).buffer;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt'],
  );
}

/* -------------------------------------------------------------------------- */

export async function encryptPayload(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedPayload> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);

  const meta: CryptoMetadata = {
    cryptoVersion: CRYPTO_VERSION,
    kdf: 'PBKDF2',
    kdfHash: 'SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-GCM',
    keyBits: KEY_BITS,
    saltBase64: toBase64(salt),
    ivBase64: toBase64(iv),
  };

  const key = await deriveKey(passphrase, salt, meta.iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, additionalData: authenticatedMetadata(meta) },
    key,
    new TextEncoder().encode(plaintext),
  );

  return { crypto: meta, ciphertextBase64: toBase64(new Uint8Array(ciphertext)) };
}

/**
 * Decrypts, or fails without saying which of the two possible reasons applies.
 *
 * A wrong passphrase and a damaged file are deliberately one failure. Distinguishing
 * them would tell an attacker holding the file when they had guessed correctly-ish,
 * and it would tell the owner nothing they can act on differently.
 */
export async function decryptPayload(
  payload: EncryptedPayload,
  passphrase: string,
): Promise<DecryptResult> {
  const meta = payload.crypto;

  if (meta.cryptoVersion !== CRYPTO_VERSION) {
    return {
      ok: false,
      failure: { kind: 'unsupported-crypto-version', found: meta.cryptoVersion },
    };
  }

  if (
    meta.kdf !== 'PBKDF2' ||
    meta.kdfHash !== 'SHA-256' ||
    meta.cipher !== 'AES-GCM' ||
    meta.keyBits !== KEY_BITS ||
    !Number.isInteger(meta.iterations) ||
    meta.iterations < 1
  ) {
    return {
      ok: false,
      failure: {
        kind: 'malformed-crypto-metadata',
        detail: 'The file declares parameters this version cannot use',
      },
    };
  }

  try {
    const salt = fromBase64(meta.saltBase64);
    const iv = fromBase64(meta.ivBase64);
    const key = await deriveKey(passphrase, salt, meta.iterations);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource, additionalData: authenticatedMetadata(meta) },
      key,
      fromBase64(payload.ciphertextBase64) as BufferSource,
    );

    return { ok: true, plaintext: new TextDecoder().decode(plaintext) };
  } catch {
    // AES-GCM authentication failed, or the base64 was not decodable. Either way the
    // file cannot be trusted and nothing has been written.
    return { ok: false, failure: { kind: 'wrong-passphrase-or-damaged' } };
  }
}

/* -------------------------------------------------------------------------- */

/** SHA-256 of a string, hex encoded. Used for integrity, never for secrecy. */
export async function digestOf(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * A passphrase verifier for the application lock.
 *
 * Stores a salted PBKDF2 digest, never the passphrase. Note carefully what this can
 * and cannot do: it lets the app recognise the right passphrase, and that is all.
 * It does not encrypt the local database — see `docs/PRIVATE_ALPHA.md`.
 */
export interface PassphraseVerifier {
  readonly saltBase64: string;
  readonly iterations: number;
  readonly digestBase64: string;
}

export async function createVerifier(passphrase: string): Promise<PassphraseVerifier> {
  const salt = randomBytes(SALT_BYTES);
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    KEY_BITS,
  );
  return {
    saltBase64: toBase64(salt),
    iterations: PBKDF2_ITERATIONS,
    digestBase64: toBase64(new Uint8Array(bits)),
  };
}

export async function verifyPassphrase(
  verifier: PassphraseVerifier,
  passphrase: string,
): Promise<boolean> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: fromBase64(verifier.saltBase64) as BufferSource,
      iterations: verifier.iterations,
      hash: 'SHA-256',
    },
    material,
    KEY_BITS,
  );

  // Constant-time comparison. The timing leak here is small, but writing the
  // short-circuiting version teaches the wrong habit to whoever reads it next.
  const expected = fromBase64(verifier.digestBase64);
  const actual = new Uint8Array(bits);
  if (expected.length !== actual.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= (expected[index] ?? 0) ^ (actual[index] ?? 0);
  }
  return difference === 0;
}
