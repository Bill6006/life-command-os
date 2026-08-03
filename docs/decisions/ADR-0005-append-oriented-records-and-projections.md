# ADR-0005: Append-oriented canonical records and rebuildable projections

## Status

Accepted — 2026-08-03, Phase 0

## Context

The product evaluates its own forecasts and recommendations against what actually happened.
That is only honest if the record of what the system believed *at the time* survives intact.

If a record can be edited in place, the history required for evaluation quietly disappears.
A forecast that was wrong can be silently corrected into one that was right. A
recommendation made under stale evidence becomes indistinguishable from one made under
fresh evidence. Nothing in the interface would look wrong — and every calibration claim the
product makes would be worthless.

There is a second, subtler pressure. Users legitimately need to fix mistakes: a mistyped
value, a misremembered time. The naive implementation of "let the user fix it" is an in-place
update, which is exactly the operation that destroys the audit chain.

Requirements: `DATA-001`, `DATA-002`, `STORE-002`, `LEARN-001`, `LEARN-002`, `LEARN-003`.

## Decision

**Canonical records are append-oriented. Corrections append and supersede. Historical truth
is never silently rewritten.**

Every canonical record carries the envelope, where applicable:

- stable ID;
- record type;
- schema version;
- occurred-at instant;
- recorded-at instant;
- local time and time-zone context;
- source type;
- provenance;
- superseded-record link;
- decision-episode link;
- confidence or uncertainty **only where semantically valid**.

The **occurred-at / recorded-at** split is mandatory: when something happened and when the
system learned of it are different facts, and evaluation requires both. This is also what
prevents future-data leakage in Phase 8 time-respecting replay.

**Confidence appears only where it is semantically valid.** An observation does not carry
confidence — it carries provenance. Attaching confidence to a recorded fact is a category
error the schema must make impossible.

**Projections are rebuildable and non-authoritative** (`STORE-002`). They may be deleted at
any time and deterministically rebuilt from canonical records. A projection is never truth.

**Phase 2 enforces invariants that make invalid substitutions fail**, not warn:

- inference masquerading as observation;
- forecast masquerading as outcome;
- recommendation masquerading as execution;
- outcome masquerading as causal effect;
- confidence without evidence dimensions;
- invalid time windows;
- forbidden circular references.

## Rationale

Append-and-supersede is the smallest mechanism that satisfies both needs at once: the user
can correct anything, and the system still knows what it believed before the correction.
The corrected value becomes current through a supersession link; the original remains
readable for evaluation.

This is deliberately *not* full event sourcing. There is no event log separate from state,
no command/event distinction, no replay-to-derive-state requirement for the whole
application. Canonical records **are** the durable truth, and projections are a
performance and convenience layer over them. That is a materially smaller commitment, and
`LEAN-005` favors the smaller implementation that still meets the requirement.

Making projections explicitly disposable has a practical benefit beyond purity: projection
shape can change freely across phases without migration, because a projection can always be
dropped and rebuilt. Only canonical schemas need migration discipline.

The invariants matter as much as the append rule. The Constitution's honesty guarantees are
mostly statements about not confusing one concept for another. Encoding them as schema-level
failures converts constitutional prose into something a test can prove.

## Alternatives considered

**Mutable records with an audit log.** Rejected. Two sources of truth about the same fact —
current state and audit history — which drift. When they disagree, neither is trustworthy,
and the failure is silent.

**Full event sourcing with an event store and derived state.** Rejected as
disproportionate. It would deliver stronger replay guarantees at the cost of a command/event
architecture, event versioning, and a rebuild path for all state — significant machinery for
a single-user local application. Append-oriented canonical records with rebuildable
projections capture the needed guarantee at a fraction of the complexity. `LEAN-001` and
`LEAN-005` apply.

**Soft deletes with a `deleted` flag only.** Rejected as insufficient. It handles deletion
but not correction, and correction is the common case.

**Copy-on-write versioning without explicit supersession links.** Rejected. Without an
explicit link, reconstructing "what superseded what" depends on timestamp inference, which
breaks under out-of-order recording — precisely when the occurred-at / recorded-at split
matters most.

## Consequences

### Positive

- Evaluation is honest: what the system believed at decision time is recoverable.
- Corrections are safe and never destroy evidence.
- Time-respecting replay in Phase 8 is possible, and future-data leakage is preventable.
- Projections can evolve freely without migrations.
- Constitutional honesty rules become schema-level, test-provable invariants.
- Belief history and "what evidence changed this belief" are naturally supported in Phase 5.

### Cost or limitation

- **Storage grows monotonically.** Corrections add records rather than replacing them. In a
  single-user application with human-scale input this is acceptable, but quota monitoring in
  Phase 6 is not optional.
- Every read of "current truth" must resolve supersession chains, which is more complex than
  reading a row. Projections absorb most of this cost.
- **User deletion needs explicit design.** "The user owns the data and may delete it"
  (Product Constitution §11) coexists uneasily with "never rewrite history." Genuine deletion
  must be a distinct, deliberate operation from correction, with its own evaluation
  consequences. **This is an open design question for Phase 2.**
- Schema migrations must handle every historical record version, not just current ones.

## Privacy and security impact

Mixed, and worth stating plainly.

Append-oriented storage means **a corrected mistake is still stored**. If the owner records
something private and corrects it, the original persists in IndexedDB until explicitly
deleted. The correction mechanism is not a redaction mechanism.

Consequences:

- Phase 2 must distinguish **correction** (append, preserve) from **deletion** (genuine
  removal, with documented evaluation consequences).
- Phase 6 encrypted backups contain full history, including superseded records.
- Data & Privacy must make this behavior visible so the owner is not surprised by it.

## Canonical data and storage impact

This ADR defines the canonical data model's core mechanics: the envelope, the append and
supersession semantics, the occurred-at / recorded-at split, and the canonical/projection
boundary.

Phase 2 must also define the semantics for **freshness, unknown, not-applicable,
conflicting, stale, and unresolved** — and guarantee that none of them is ever converted to
zero, false, or failure.

## Intelligence impact

Enables the entire evaluation and learning layer:

- forecast-accuracy evaluation can compare a forecast against later observations, knowing
  exactly what was known when the forecast was made (`LEARN-001`);
- recommendation-effectiveness evaluation stays separate and is computed only when evidence
  permits;
- missing outcomes remain unresolved rather than being backfilled (`LEARN-002`);
- learned beliefs (Phase 5) carry provenance and history, so "what evidence changed this
  belief" is answerable;
- prospective validation is possible, which is what distinguishes a strong personal claim
  from an association (`LEARN-003`);
- context-invalidated evidence can be discounted without being erased.

Decision-episode links make the full chain — state, forecast, candidates, recommendation,
execution, outcome, evaluation — reconstructable.

## User-experience impact

- Timeline can show observations, actions, outcomes, **corrections**, and decision episodes
  as real history.
- Learning can show belief changes with the evidence that drove them.
- Corrections are non-destructive, so the user can fix things without fear.
- The interface must make superseded records legible without cluttering the current view —
  a real Phase 3 design problem.
- Deletion must be presented as meaningfully different from correction.

## Testing required

- **Phase 2:** every active core record validates independently; each of the seven invalid
  substitutions **fails**; corrections preserve history and resolve to the correct current
  value; missing and unresolved values never become zero, false, or failure; canonical data
  survives reload and synthetic restore; projections delete and rebuild deterministically;
  forward-only migrations for schemas that exist.
- **Phase 5:** forecast evaluation and recommendation-effectiveness evaluation stay
  separate; non-execution is never judged ineffective; belief history retains reason traces.
- **Phase 8:** time-respecting replay does not leak future data.

## Deferred future work

- `LearnedBeliefRecord` and the conservative learning governor — Phase 5.
- Deletion semantics distinct from correction — **must be resolved in Phase 2.**
- Retention, compaction, or archival of very old superseded records — deferred until
  quota evidence justifies it. Do not build speculatively.
- Domain-specific record families — Phase 7, one domain at a time.

## Reversal strategy

Effectively irreversible for existing data: history that was never captured cannot be
reconstructed later. Moving to mutable records would silently invalidate every past
evaluation and every calibration claim.

The forward-compatible direction is open. Because records carry schema versions and
supersession links, the model can be extended — additional envelope fields, new record
families, richer provenance — through forward-only migrations without abandoning this
decision. Moving to full event sourcing later would also remain possible, since
append-oriented records are a subset of what an event store would hold.
