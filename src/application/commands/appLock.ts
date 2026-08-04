import { openDatabase } from '../../infrastructure/database/connection';
import {
  createVerifier,
  verifyPassphrase,
  type PassphraseVerifier,
} from '../../infrastructure/crypto/backupCrypto';

/**
 * The application lock (Prompt 7B task 16).
 *
 * ## What it does
 *
 * It keeps the contents off the screen until a passphrase is entered. That is the
 * whole of it, and it is genuinely useful for exactly one situation: a phone handed
 * to someone, left on a desk, or glanced at over a shoulder.
 *
 * ## What it does not do, stated plainly because the temptation is to imply otherwise
 *
 * **It does not encrypt anything.** The records sit in IndexedDB in the clear. Anyone
 * with the unlocked device and thirty seconds of developer tools can read every one
 * of them without going near this lock. A browser page cannot encrypt its own local
 * database at rest and still be able to read it without a passphrase on every load;
 * claiming otherwise would be the single most dishonest thing this product could do.
 *
 * **It does not protect a compromised device.** Malware, a forensic extraction, or
 * another logged-in profile on the same machine all bypass it completely.
 *
 * **It is not a backup, and losing the passphrase does not lose your data.** The lock
 * verifier can be cleared from Data & Privacy. It is a curtain, not a vault, and it
 * is deliberately built so that forgetting the passphrase is an inconvenience rather
 * than a catastrophe — unlike the backup passphrase, which nobody can recover.
 *
 * Only the verifier is stored: a salted PBKDF2 digest, never the passphrase. It lives
 * in the `_meta` table, which is infrastructure bookkeeping and holds no life data.
 */

const LOCK_KEY = 'app-lock-verifier';

export const MINIMUM_LOCK_LENGTH = 6;

export async function isLockEnabled(): Promise<boolean> {
  const database = await openDatabase();
  return (await database.meta.get(LOCK_KEY)) !== undefined;
}

export type LockChange =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export async function enableLock(passphrase: string): Promise<LockChange> {
  if (passphrase.length < MINIMUM_LOCK_LENGTH) {
    return {
      ok: false,
      message: `Use at least ${String(MINIMUM_LOCK_LENGTH)} characters.`,
    };
  }
  const database = await openDatabase();
  const verifier = await createVerifier(passphrase);
  await database.meta.put({ key: LOCK_KEY, value: JSON.stringify(verifier) });
  return { ok: true };
}

/**
 * Turns the lock off.
 *
 * Deliberately does **not** require the current passphrase. The lock protects the
 * screen, not the data — anyone able to reach this setting has already unlocked the
 * app or has full access to the device, in which case demanding the passphrase would
 * only strand an owner who forgot it while stopping nobody.
 */
export async function disableLock(): Promise<void> {
  const database = await openDatabase();
  await database.meta.delete(LOCK_KEY);
}

export async function unlock(passphrase: string): Promise<boolean> {
  const database = await openDatabase();
  const stored = await database.meta.get(LOCK_KEY);
  if (stored === undefined) return true;

  let verifier: PassphraseVerifier;
  try {
    verifier = JSON.parse(stored.value) as PassphraseVerifier;
  } catch {
    return false;
  }

  return verifyPassphrase(verifier, passphrase);
}
