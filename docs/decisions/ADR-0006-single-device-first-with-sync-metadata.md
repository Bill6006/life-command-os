# ADR-0006: Single-device-first scope, with metadata for future sync readiness

## Status

Accepted — 2026-08-03, Phase 0

## Context

The owner will plausibly want this product on both a phone and a desktop eventually. That
makes multi-device synchronization feel like something to design for now, since retrofitting
sync onto a model that cannot support it is a genuinely expensive mistake.

But sync is also one of the most complex things a local-first application can build:
conflict resolution, causality tracking, encrypted transport, key management, partial-failure
recovery, and a server or peer relay — which reintroduces exactly the network surface the
privacy boundary exists to avoid.

The trap here is symmetrical. Building sync now violates the lean rules and adds enormous
surface before the product has proven it is useful at all. Building a model that *cannot*
support sync creates a rewrite later.

Requirements: `LEAN-001`, `LEAN-005`, `PRIV-003`, `STORE-001`, `DATA-001`.

## Decision

**The initial release is single-device. Synchronization is not implemented.**

Sync readiness is preserved as **metadata only**:

- stable identifiers that do not depend on insertion order or device-local sequence;
- explicit timestamps, including the occurred-at / recorded-at split from
  [ADR-0005](ADR-0005-append-oriented-records-and-projections.md);
- provenance, including source type and originating context;
- conflict metadata sufficient to reason about concurrent edits later.

**Not created:** sync interfaces, adapters, transports, merge engines, conflict resolvers,
replication logs, device registries, vector clocks, or any placeholder implementing any of
these. No `SyncProvider` interface with one local implementation. No "sync-ready"
abstraction layer.

The distinction is exact: **record fields that make sync possible later are in scope.
Machinery that performs sync is not.**

Multi-device use before sync exists is served by the Phase 6 encrypted backup and restore
path — export on one device, restore on another. This is manual and non-concurrent, and it
is honest about being so.

## Rationale

The metadata is nearly free and the machinery is not.

Stable IDs, explicit timestamps, and provenance are already required by
[ADR-0005](ADR-0005-append-oriented-records-and-projections.md) for evaluation and
supersession — sync readiness is a side effect of decisions the product needs anyway. Adding
them costs almost nothing extra.

Sync machinery is the opposite. It requires a transport, therefore a server or relay,
therefore key management, therefore an encryption design, therefore a threat model — and all
of it before the product has demonstrated that it produces a single useful recommendation.
`LEAN-005` asks what current approved requirement uses it. None does.

There is also a design argument against premature sync: conflict resolution is
domain-specific, and the right resolution semantics for a `RecommendationRecord` differ from
those for an `ObservationRecord`. Designing that before the records have stabilized through
Phases 4 and 5 would produce a design built on guesses.

Append-oriented records are also unusually sync-friendly. Records that are never mutated in
place have far fewer conflict cases than mutable rows — much of the hard part is already
mitigated by a decision made for entirely different reasons.

## Alternatives considered

**Implement sync now.** Rejected. Violates `LEAN-001` and `LEAN-005` directly, adds a
network surface contradicting the privacy boundary, and requires conflict semantics for
records that have not stabilized.

**Build a sync abstraction layer with a local-only implementation.** Rejected, and worth
naming explicitly because it is the seductive option. A `SyncProvider` interface with one
implementation is precisely the "empty framework" the Constitution prohibits (§18.2). It
would almost certainly be the *wrong* abstraction, since it would be designed without a real
second implementation to constrain it — and it would then have to be worked around.

**Ignore sync entirely, including metadata.** Rejected. Retrofitting stable identity and
causality onto existing records is genuinely expensive and can require re-deriving history.
The metadata is cheap insurance against a plausible future.

**CRDTs from the start.** Rejected as disproportionate. CRDTs solve concurrent editing
elegantly, at the cost of a substantially more complex data model and larger payloads, to
solve a problem the product does not currently have.

## Consequences

### Positive

- Enormous complexity avoided in the initial build.
- No network surface, no server, no key-exchange design, no relay.
- Records already carry the identity and causality metadata sync would need.
- Append-oriented records mean fewer conflict cases when sync is eventually designed.
- Conflict semantics can be designed against **stabilized** records rather than guesses.

### Cost or limitation

- **The owner cannot use the product on two devices concurrently.** This is a real product
  limitation, not a technicality, and it must be stated plainly in the Phase 6 private-alpha
  guidance.
- Moving between devices means export and restore — manual, and easy to forget.
- Concurrent use across devices would produce **divergent histories with no merge path**.
  The Phase 6 guidance must warn against this explicitly.
- Some sync-relevant metadata will only be validated when sync is actually built; carrying
  the right fields is a reasoned judgment, not a proven one.

## Privacy and security impact

**Positive.** No sync means no network transmission of life data, no server storing it, no
transport encryption to get right, no key exchange, and no relay operator to trust
(`PRIV-003`).

When sync is eventually considered, it must arrive through post-release change control with
an end-to-end encryption design where keys never leave the owner's devices. The Constitution
does not permit a sync design that would give any third party access to plaintext life data.

Conflict metadata itself carries a mild privacy consideration — device identifiers can be
identifying — so any device identifier must be a locally generated opaque value, never a
hardware or account identifier.

## Canonical data and storage impact

The record envelope already carries stable IDs, explicit timestamps, source type, and
provenance. This ADR adds the requirement that **conflict metadata sufficient to reason
about concurrent edits** be present where applicable.

Identifier generation must be collision-resistant without central coordination — a
randomly generated stable ID, not an auto-incrementing sequence. This is the single most
important sync-readiness decision, and it is cheap to honor from Phase 2.

Storage remains IndexedDB on one device
([ADR-0004](ADR-0004-indexeddb-canonical-authority.md)).

## Intelligence impact

Minimal by design. The intelligence layer reads projections and is indifferent to whether
records originated locally or from a future sync.

One consequence is worth noting: because all data is single-device, evidence completeness is
bounded by what the owner records on that device. The confidence model's
"observation completeness" dimension should reflect that honestly rather than assuming full
coverage.

## User-experience impact

- Data & Privacy presents export and restore as the supported way to move between devices.
- Phase 6 private-alpha guidance must state clearly: **one device at a time**, and warn that
  concurrent use on two devices creates divergent histories that cannot be merged.
- No sync status indicators, no account UI, no device management — none of it exists, and
  none of it should be hinted at in the interface.
- The interface must not imply cloud backup. Backup is local and owner-driven.

## Testing required

- **Phase 2:** identifiers are stable and collision-resistant without central coordination;
  timestamps and provenance are present and correct on every canonical record.
- **Phase 6:** export on one profile and restore on a fresh profile reproduces canonical
  state exactly — the manual multi-device path, proven.
- **Every phase:** no sync interface, adapter, transport, or placeholder exists. Verified at
  gate review under `LEAN-001`.

## Deferred future work

- Synchronization itself — post-release change control only, never during the initial build.
- Conflict-resolution semantics per record family — designed only when sync is actually
  approved, against stabilized records.
- Device registry and key exchange — only as part of an approved sync design.
- Any evaluation of CRDTs — only if concurrent editing becomes a real requirement.

## Reversal strategy

Adding sync later is **additive** and does not invalidate this decision. The canonical
records already carry the identity, timestamp, provenance, and conflict metadata a sync
layer would consume, and append-oriented records limit the conflict surface.

The work sync would require — transport, encryption, key management, per-family conflict
semantics — is work this decision defers, not work it forecloses.

Reversing in the other direction (removing the sync-readiness metadata) is possible but
pointless: the fields are required for evaluation and supersession regardless.
