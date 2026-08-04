# ADR-0009 — Backup encryption: standard primitives, no invented cryptography

**Status:** Accepted
**Date:** 2026-08-04
**Phase:** 6, Prompt 7B
**Requirements:** `OWN-066`, `OWN-067`, LEG-128, LEG-139

## Context

Phase 6 makes meaningful private use safe enough to begin. That requires a portable
backup, and a portable backup of somebody's entire recorded life is the single most
sensitive artifact this product will ever create. It gets copied to cloud storage, to a
USB stick, to a second laptop — precisely to the places the owner does not fully
control.

The prompt is explicit: *use established Web Crypto primitives, do not invent
cryptography.* This ADR records what was chosen and, more usefully, what was rejected.

## Decision

**AES-256-GCM for encryption, PBKDF2-HMAC-SHA-256 at 600,000 iterations for key
derivation, both from Web Crypto.** No dependency, no custom construction.

Specifically:

- A fresh 16-byte salt and 12-byte IV from `crypto.getRandomValues` on **every** export.
- The key is derived from the passphrase and salt alone. Nothing else is stored that
  could be used to recover it.
- **The crypto metadata is authenticated, not merely recorded.** It is passed to
  AES-GCM as additional authenticated data, so a file edited to claim 1,000 iterations
  instead of 600,000 fails to decrypt rather than yielding a weaker key.
- The file carries two version numbers: `formatVersion` for the envelope shape and
  `cryptoVersion` for the parameters. A reader that recognises neither says so plainly
  instead of failing with an error that looks like a wrong password.
- A SHA-256 digest over the canonical serialisation lives **inside** the ciphertext, so
  logical corruption is caught even when the file is cryptographically intact.

## Alternatives considered

**Argon2id.** Stronger against GPU attack, and the modern default for password
hashing. Rejected because it is not in Web Crypto: adopting it means shipping a WASM
cryptographic dependency to protect a local file. Adding a third-party cryptography
implementation to the supply chain of an app whose whole claim is "nothing leaves your
device" is a worse trade than a correctly parameterised standard primitive. The
iteration count is in the file, so this can be revisited without orphaning old backups.

**A lower iteration count for speed.** 600,000 is the OWASP 2023 guidance for
PBKDF2-HMAC-SHA-256, and it costs about 200ms on a laptop. Backups are not taken in a
loop. Spending a fifth of a second once is not a user-experience problem worth trading
key strength for.

**Encrypting the local IndexedDB as well.** Rejected as dishonest rather than
undesirable. A browser page cannot encrypt its own storage at rest and still open
without a passphrase on every load — the key would have to live somewhere the page can
read, which means somewhere an attacker with the device can read. Implementing it would
produce the *appearance* of encryption at rest and none of the substance. The limit is
documented in `docs/PRIVATE_ALPHA.md` in the plainest words available instead.

**Storing a passphrase hint, or any recovery mechanism.** Rejected. Any recovery path
is a second way into the file, and the value of the encryption is that there is exactly
one. The interface says "nobody can recover this passphrase — not you, not me, not
Anthropic, not GitHub" for that reason.

**Distinguishing "wrong passphrase" from "damaged file".** Rejected. They are reported
as one failure. Separating them tells an attacker holding the file when a guess was
structurally close, and tells the owner nothing they would act on differently.

## Consequences

- A lost passphrase means a permanently unreadable backup. This is stated to the owner
  before they type one, not after.
- Old backups stay readable across parameter changes, because the parameters travel
  with the file.
- The crypto surface is small enough to review in one sitting: one file, two primitives,
  no branching on anything an attacker controls except to reject it.
- **The local database remains unencrypted**, and every surface that touches the subject
  says so rather than implying otherwise.
