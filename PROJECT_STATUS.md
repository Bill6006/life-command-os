# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 3.0 Final
- Current phase: **Phase 6 — complete.** Prompts 7A and 7B both delivered.
- Current prompt: PROMPT 7B (complete)

## Gate status

- Status: **GREEN.** Every Prompt 7B gate requirement is met.
- **Private local use: READY.**
- Gate evidence:
  - *Encrypted backup round-trip passes* — AES-256-GCM with a PBKDF2-SHA-256 key at
    600,000 iterations. Standard Web Crypto primitives, no dependency, no invention.
  - *Fresh-profile restore reproduces exact canonical history* — proved on the
    **production build**, through the real interface, in a browser context with no
    shared storage. No test bridge exists in that build to help it.
  - *Corruption stops before mutation* — six damage cases, each leaving canonical state
    byte-identical and taking no snapshot, because nothing was about to be replaced.
  - *Rollback is tested* — including the refusal to roll back to a snapshot that fails
    its own checksum.
  - *Unknown fields and privacy metadata survive* — a field written by a newer version
    is quarantined, stored, and put back on the next export.
  - *AI export is not confused with backup* — it says it cannot restore anything in its
    own opening lines, and withholds every sensitive class by default.
  - *No private payload appears in repository evidence* — scanned clean; and a browser
    test records every network request during a full session on the production build.
  - *Accessibility, offline, reload, update, and recovery checks pass.*

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — in fact it now contains no
  data at all. The app starts empty and the scenario corpus is not in the bundle.

> **Service-worker note.** A returning visitor may see the previous build once; reload again.

## What Phase 6 changed, in one paragraph

Through Phase 5 this was a demonstration: a scenario picker, synthetic records, and an
engine reasoning over them. Prompt 7A replaced that with real local interactions — the
controls write canonical records and the app reads what is stored. Prompt 7B made it
safe to actually use: encrypted portable backup, verified restore with a dry run and an
automatic safety snapshot, tested rollback, a real Data & Privacy surface, readable
exports that withhold by default, and an application lock that is honest about being a
curtain rather than a vault.

## Work completed — Prompt 7B

- **Encrypted portable backup** — `infrastructure/crypto/backupCrypto.ts`. AES-256-GCM,
  PBKDF2-HMAC-SHA-256 at 600,000 iterations, fresh salt and IV per export, and the
  crypto metadata passed as additional authenticated data so editing it breaks
  decryption rather than weakening the key. ADR-0009 records what was rejected.
- **Versioned format** — `formatVersion` for the envelope and `cryptoVersion` for the
  parameters, both plaintext, so a file from a newer version is *identified* rather
  than misreported as a wrong password.
- **The full recovery sequence** — validate everything, dry run, durable safety
  snapshot, replace, verify against storage, roll back automatically on mismatch.
- **Schema v3** — a `snapshots` store, so the way back is in the database rather than
  in memory and survives the tab dying mid-restore.
- **Unknown-field quarantine** — `unknownFields` on the envelope. A backup from a newer
  build restores here without losing what this build cannot read.
- **Field-level privacy** — `fieldPrivacy`, where an override may narrow a record's
  class but never widen it.
- **Real Data & Privacy** — health, backup, restore with preview and dry run, restore
  points, application lock, readable export, storage, and build.
- **Readable AI exports** — 7 / 30 / 90 days, all time, and custom, with every
  sensitive class excluded until explicitly included, and withheld fields shown as
  `[withheld: health]` rather than silently dropped.
- **Storage failure handling** — quota and transaction failures typed separately from
  invalid data; a stale tab yields its connection and says so instead of writing
  through an old schema.
- **The test bridge is gone from production** — compile-time stripped, and a test reads
  the built artifact off disk to prove no trace of it survives.
- **`docs/PRIVATE_ALPHA.md`** — what to do on day one, and every limit stated plainly.

### Decisions worth naming

- **Verification asks the database, not the code.** After a restore, records are re-read
  from IndexedDB and hashed. Comparing what was just written would prove only that the
  code remembers what it did a moment ago. This ordering is also what makes "an
  interrupted restore cannot report success" structural: an interruption means the
  verification step never runs, so nothing reports success — and the snapshot taken
  before the replacement survives, because it is durable.
- **A wrong passphrase and a damaged file are one failure.** Separating them would tell
  an attacker holding the file when a guess was structurally close, and tells the owner
  nothing they would act on differently.
- **The local database is not encrypted, and every surface that touches the subject
  says so.** A browser page cannot encrypt its own storage at rest and still open
  without a passphrase every time — the key would have to live where the page can read
  it, which is where an attacker with the device can read it. Implementing it would
  produce the appearance of encryption and none of the substance.
- **No passphrase recovery, deliberately.** Any recovery path is a second way into the
  file. The interface says "nobody can recover this passphrase — not you, not me, not
  Anthropic, not GitHub" before the owner types one.
- **Notifications are deferred with reasons, not half-built.** Push needs a server, in
  an app whose central claim is that there is no server; local notifications need the
  page open, in which case they tell you nothing. There is no honest third option, and
  `docs/PRIVATE_ALPHA.md` §6 says so rather than shipping a stub.
- **Two builds are served in CI, not one.** The regression suite needs to seed a corpus,
  which needs the bridge; the private alpha must not contain one. Rather than weaken
  either requirement, both builds are served and recovery is proved against production.

## Files created or modified — Prompt 7B

Created (10): `src/infrastructure/crypto/backupCrypto.ts`;
`src/infrastructure/backup/portableBackup.ts`;
`src/infrastructure/database/snapshotStore.ts`;
`src/application/commands/{recoveryCommands,appLock}.ts`;
`src/application/queries/{aiExport,storageHealth}.ts`;
`src/ui/features/data-privacy/LockScreen.tsx`; `scripts/build-e2e.mjs`;
`tests/unit/{recovery,export}.test.ts`;
`tests/e2e/{production-recovery,privacy-audit}.spec.ts`;
`docs/PRIVATE_ALPHA.md`; `docs/decisions/ADR-0009-backup-encryption.md`

Deleted (3): `src/infrastructure/backup/developmentBackup.ts`,
`src/application/commands/backupCommands.ts`, `tests/unit/backup.test.ts` — the
unencrypted development format, superseded rather than kept alongside.

Modified: `domain/records/{envelope,index}.ts`;
`infrastructure/database/{connection,migrations}.ts`;
`application/commands/writeRecord.ts`; `application/queries/storageInfo.ts`;
`app/{diagnostics,main}.tsx`; `ui/features/{shell/AppShell,now/NowSurface,data-privacy/DataPrivacySurface}.tsx`;
`ui/design-system/console.css`; `vite.config.ts`; `playwright.config.ts`;
`eslint.config.js`; `package.json`; `.gitignore`; three e2e specs; three unit tests;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 259 passed**, up from 212. 54 new across recovery and export.
- **Browser: 284 passed**, up from 268 — including **14 against the production build**
  with no test bridge present.
- Covers: AES-GCM round trip; salt and IV never reused; tampered ciphertext and tampered
  crypto metadata both rejected; six corruption cases each leaving state untouched; the
  dry run writing nothing; snapshot before replacement; rollback to exactly the previous
  state; refusal to roll back a damaged snapshot; superseded records surviving a round
  trip so history cannot silently shrink; unknown fields quarantined and restored;
  every sensitive class withheld by default; field-level withholding; the four export
  ranges; a v2→v3 migration that leaves canonical records alone; every network request
  in a full production session being same-origin; nothing reaching the console;
  `localStorage` holding no life data.
- **Three real defects found by these tests and fixed rather than tested around:**
  1. **Two failure messages did not say that nothing had changed.** The ones for a file
     that is not a backup at all — which is exactly the case where someone picked the
     wrong file and is most likely to panic. Found by a browser test asserting the
     reassurance; the whole message set now carries it.
  2. **`schemaVersion` and the store list were asserted as constants** in two older
     tests, so the v3 migration failed them. Correct failures: the assertions were
     updated, and a new test was added for the upgrade that actually carries risk —
     v2 to v3 with canonical records present, which is what would catch a migration
     written as a drop-and-rebuild.
  3. **The e2e build script failed silently on Windows.** `spawnSync('npx.cmd')` without
     a shell exits non-zero with no output, which surfaced as "webServer was not able to
     start". Resolving the Vite binary through Node removed the shell from the problem.
- One of my own assertions was wrong: an export test searched for a rendered timestamp
  in the wrong format. Corrected to slice the document by heading, which tests the thing
  it meant to test — that a record lands in the right section.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- Real personal data detected in tracked content: **NO**
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Secret scan: clean. XSS surface: no `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or
  `new Function` anywhere in `src/`.
- Network: no `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, or `sendBeacon` in
  `src/` — and verified at runtime, on the production build, across a full session.
- **Runtime private-data readiness: READY.** See `docs/PRIVATE_ALPHA.md` before starting.

## Architecture decisions

**ADR-0009 — Backup encryption: standard primitives, no invented cryptography.** Records
the choice of AES-256-GCM and PBKDF2 at 600,000 iterations, and what was rejected:
Argon2id (not in Web Crypto — would mean shipping a cryptographic dependency), a lower
iteration count, encrypting the local database (dishonest rather than undesirable), any
passphrase recovery mechanism, and distinguishing a wrong passphrase from a damaged file.

## New dependencies

**None.** The cryptography is Web Crypto only.

## New abstractions or infrastructure

**1. `infrastructure/crypto/`** — one file, two primitives, no dependency.
- Active requirement: `OWN-066`, LEG-139; tasks 1–2.
- Why smaller was insufficient: the parameters must travel with the file and be
  authenticated, or a future change orphans old backups and an edited file gets a
  weaker key.

**2. `infrastructure/backup/portableBackup.ts`** — replaces the unencrypted format.
- Active requirement: `OWN-066`, `OWN-067`, LEG-128; tasks 4–5.
- Why smaller was insufficient: eight distinct failure modes need eight distinct
  messages, because "that did not work" on a recovery screen is the point at which
  people start doing damage.

**3. `snapshots` store (schema v3)** — durable pre-restore safety snapshots.
- Active requirement: `OWN-067`, LEG-134; task 4.
- Why smaller was insufficient: the failure it guards against is the tab dying mid
  restore, and an in-memory snapshot dies with it.

**4. `application/queries/aiExport.ts`** — readable export, separate product.
- Active requirement: `OWN-068`–`OWN-070`; tasks 9–13.
- Why smaller was insufficient: withholding has to be the default and has to be
  *visible*, because an invisible omission reads as an absence of evidence.

**Removed:** the unencrypted development backup format, and the test bridge from every
production build.

## Known limitations

- **The local database is not encrypted at rest.** Documented at length in
  `docs/PRIVATE_ALPHA.md` §3 and stated on the Data & Privacy surface itself.
- **The application lock hides the screen and nothing more.** It cannot protect a
  compromised device, and it says so where the owner turns it on.
- **Notifications do not exist.** Deferred with reasons rather than stubbed.
- **The end-to-end regression suite runs against a build containing the test bridge.**
  The production build is exercised by 14 tests covering recovery, the privacy audit,
  and the bridge's absence — but the broader suite is not run twice. Phase 10's release
  matrix is the place to widen that if it proves worth the CI time.
- **Only three life areas are active.** Health, fatherhood, relationships, faith, home,
  and money arrive in Phase 7; sleep and food are captured under time-and-capacity and
  classified `health` for privacy until then.
- **Beliefs are still derived, not persisted.**
- **Cached startup is still unmeasured.** Bundle is ~158 kB gzipped, up from ~152 kB.
- Carried forward: `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no
  router; service-worker staleness; deletion semantics undecided.

## Deferred work

| Deferred | Activates |
| --- | --- |
| Shared domain framework, all domain slices, action-specific follow-ups, Manual Domain Focus, Minimum Wins | Phase 7 |
| Cross-domain synthesis, full Can't Now regeneration, strategic review, optional model comparison | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts, notifications if ever justified | Phase 10 |

## Blockers

**None blocking Prompt 8A.**

One non-blocking owner action carried forward: **measure cached startup on the Samsung
phone** and say if it exceeds three seconds.

## Next permitted prompt

**PROMPT 8A — Phase 7: shared domain framework.**

Before that, one thing worth doing yourself: open the deployed app, put something real
in it, take a backup, and **restore it into a fresh browser profile**. The tests prove
that path works. Doing it once yourself is what turns that into trust.
