# ADR-0004: IndexedDB is the sole canonical authority for life data

## Status

Accepted — 2026-08-03, Phase 0

## Context

A local-first application has several places it could put data: `localStorage`,
`sessionStorage`, IndexedDB, the Cache API, in-memory state, and files the user exports.
Without an explicit rule, data leaks across these stores — a preference here, a cached list
there — and within a year no one can say which copy is true.

This product cannot tolerate that ambiguity. Its records carry provenance, supersession
links, and decision-episode links; a second source of truth would silently break the audit
chain that the honesty guarantees depend on.

There is also a specific failure mode worth naming: `localStorage` is synchronous, trivially
convenient, and therefore the natural place a "quick fix" lands under deadline pressure. It
is also size-limited, string-only, and offers no transactions — making it the worst possible
place for canonical life data.

Requirements: `STORE-001`, `STORE-002`, `DATA-001`, `DATA-002`, `ARCH-001`.

## Decision

**IndexedDB is the only authoritative store for canonical life data.**

- `localStorage` may contain **only** disposable, non-authoritative boot preferences —
  values the application can lose without consequence, such as a last-viewed tab. It may
  never hold life data, and it may never become a fallback when IndexedDB fails.
- Derived views are **projections**: rebuildable, deletable, and never canonical truth
  (`STORE-002`).
- All canonical writes are **atomic and validated**, and pass through the application
  command layer.
- **The UI never writes directly to IndexedDB.** Storage access is confined to
  `src/infrastructure/database/`.
- **Intelligence reads validated projections and never writes to storage directly.**
- The application **may not display "saved" until the authoritative transaction commits.**
- Canonical data must survive reloads, browser restarts, offline operation, upgrades,
  backups, restores, and fresh-profile recovery.

Storage progression:

- **Phases 1–2:** IndexedDB authority, atomic validated writes, deterministic projection
  rebuild, basic unencrypted **synthetic** development export and restore, migration
  registration, honest errors.
- **Phase 6, before any real private data:** encrypted portable backups using established
  Web Crypto primitives — **never custom cryptography** — plus dry-run restore, integrity
  validation, fresh-profile recovery, and application lock where technically meaningful with
  honest limitations.

## Rationale

IndexedDB is the only browser store that provides what canonical life data requires:
transactional writes, structured values without manual serialization, indexes for
time-ranged and provenance-based queries, an explicit versioned migration mechanism, and
capacity measured in hundreds of megabytes rather than a few.

The transactional guarantee is what makes "never display saved before commit" implementable.
That rule matters more than it sounds: an application that claims to preserve the owner's
life history and then silently loses a correction has broken its central promise.

Confining storage access to one module is what makes the rule enforceable at review time
rather than by memory. `localStorage` misuse is a stop condition precisely because it is the
convenient mistake.

## Alternatives considered

**`localStorage` for everything.** Rejected. No transactions, string-only, roughly 5–10 MB,
synchronous and therefore main-thread-blocking, and no migration mechanism. Adequate for a
theme preference; unacceptable for life history.

**IndexedDB plus a `localStorage` cache for speed.** Rejected. This is the exact mechanism
by which a second source of truth appears. Projections cover the performance need and are
explicitly non-authoritative.

**The Origin Private File System (OPFS).** Rejected for canonical records. Excellent for
large opaque blobs, but the product needs queryable structured records with indexes, and
OPFS would mean building an indexing layer by hand. It remains a reasonable option for
backup blobs if Phase 6 finds a need.

**A WASM SQLite build.** Rejected as premature. It offers a better query language, at the
cost of a substantial bundle against a 3-second startup budget, plus its own persistence
layer and migration story. `LEAN-005` applies: no current requirement justifies it over
IndexedDB with a typed wrapper. Reconsider only if querying becomes a demonstrated
bottleneck.

**Raw IndexedDB with no wrapper.** Rejected. The native API's verbosity reliably produces
inconsistent transaction handling. A thin typed wrapper such as Dexie is the smaller, safer
implementation — its purpose is transaction and typing ergonomics, not an abstraction layer
over storage engines.

## Consequences

### Positive

- One unambiguous source of truth. Every canonical record has exactly one home.
- Atomic writes make partial-state corruption preventable and testable.
- Explicit versioned migrations, which browser-resident schemas require.
- Projections can be deleted and rebuilt, making them safe to change freely.
- The single storage module gives backup, restore, and encryption exactly one integration
  point in Phase 6.

### Cost or limitation

- **Browser storage is evictable.** The browser may clear IndexedDB under storage pressure,
  and the user may clear site data. This is the largest data-loss risk in the product and is
  the reason Phase 6 gates real private use on proven encrypted backup and fresh-profile
  recovery.
- Asynchronous throughout, which every calling layer must accommodate.
- Migrations are forward-only in practice and must be tested against real prior-version
  data.
- Multiple open tabs can contend; stale-tab handling is required in Phase 6.
- Storage quota is finite and must be monitored, with quota warnings surfaced as *actionable*
  operational status only.

## Privacy and security impact

Positive: data stays in the browser's origin-scoped storage on the owner's device, with no
server and no network transmission (`PRIV-003`).

Limitations to state honestly rather than paper over:

- IndexedDB is **not encrypted at rest** by the browser. On-disk protection depends on the
  operating system's disk encryption. Phase 6's encrypted backup protects *portable* copies;
  it does not encrypt the live database.
- Any XSS in the application can read the entire database. This makes XSS the primary
  security concern for the product, addressed in Phase 6.
- A browser-based application lock cannot provide OS-level protection. Phase 6 must document
  precisely what it can and cannot protect.

Logging rule: never log full canonical record payloads or free-text private values.

## Canonical data and storage impact

This ADR *is* the storage impact. It establishes the canonical/projection split that
`STORE-002` depends on, and the transactional foundation that append-oriented corrections
([ADR-0005](ADR-0005-append-oriented-records-and-projections.md)) require — corrections are
only safe if the append and the supersession link commit atomically.

Phase 2 must additionally prove: every active core record validates independently; invalid
cross-concept substitutions fail; corrections preserve history; missing and unresolved
values are never converted to zero, false, or failure; canonical data survives reload and
synthetic restore; projections can be deleted and rebuilt.

## Intelligence impact

Intelligence consumes **validated projections**, not raw storage, which keeps it independent
of storage shape and testable against in-memory fixtures with no database at all.

Because intelligence never writes, a decision episode cannot corrupt canonical history — a
structural guarantee rather than a convention.

## User-experience impact

- Save confirmations are honest: the interface shows success only after commit.
- Storage health, quota warnings, and recovery states are real interface states, surfaced
  **only when actionable** (`UX-011`).
- Data & Privacy is a first-class destination, covering storage health, backup, restore,
  lock, export, and deletion.
- Offline is fully functional, since the authoritative store is local.

## Testing required

- **Phase 1:** IndexedDB connection and transaction infrastructure works; no domain tables
  invented yet.
- **Phase 2:** atomic validated writes; canonical data survives reload and synthetic
  restore; projections delete and rebuild deterministically; UI cannot write directly to
  storage; forward-only migrations for schemas that exist.
- **Phase 6:** encrypted backup round-trip; corrupted backups stop before mutation;
  interrupted writes never report success or leave partial canonical state; fresh-profile
  recovery; quota, corruption, and stale-tab handling.
- **Phase 10:** storage corruption, migration, backup, restore, and recovery on the exact
  release build.

## Deferred future work

- Encrypted backup, application lock, and `src/infrastructure/crypto/` — Phase 6.
- Quota, corruption, stale-tab, and interrupted-write handling — Phase 6.
- Synchronization — never implemented in the initial build; see
  [ADR-0006](ADR-0006-single-device-first-with-sync-metadata.md).
- A different storage engine — only if querying or performance becomes a demonstrated
  bottleneck, under change control.

## Reversal strategy

Storage access is confined to `src/infrastructure/database/`, and the canonical record
schemas are storage-agnostic TypeScript. Replacing the engine would mean reimplementing that
one module against the same repository contracts, then migrating data through the existing
export/restore path — the same path used for backup, so it is exercised continuously rather
than theoretically.

Reversing the *authority* rule — allowing a second canonical store — is not reversible in
any meaningful sense and is a universal stop condition.
