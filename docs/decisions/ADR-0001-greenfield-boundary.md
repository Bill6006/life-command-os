# ADR-0001: Greenfield boundary

## Status

Accepted — 2026-08-03, Phase 0

## Context

A prior Life Command OS application exists. The natural instinct is to refactor, wrap,
translate, or port it, because working code feels cheaper than new code.

That instinct is what the rebuild exists to prevent. The prior application's storage shapes,
scoring formulas, navigation, screen layouts, naming, and architecture encode assumptions
this product now rejects — notably aggregate scoring, dashboard-first presentation, and the
absence of a structural separation between observation, inference, forecast, recommendation,
execution, and outcome. Importing that architecture would import those assumptions along
with it, and they would be nearly impossible to remove later.

This decision is irreversible in practice: once legacy code, types, or storage shapes enter
the foundation, extracting them costs more than the rebuild.

Requirements: `PROD-001`, `LEAN-001`, `MIG-001`.

## Decision

This repository is a **true greenfield rebuild**.

The old application and old repository may not be cloned, copied, imported, wrapped,
refactored, translated, or used as the implementation foundation. Legacy source and private
backups are not inspected unless the owner explicitly authorizes Phase 9.

The prior application may later be used **only** to:

- recover product intent;
- identify requirements worth reconsidering;
- identify failure modes that should not recur;
- supply private historical **data** through an optional quarantined one-way importer
  (Phase 9).

**A legacy feature has no automatic right to survive.** No feature is added because it
existed before.

If Phase 9 is authorized, legacy structures are converted into current canonical records at
a quarantined boundary (`src/importers/legacy/`). Legacy types never enter normal domain or
intelligence logic.

## Rationale

This is the smallest sound choice because the alternative — selective reuse — has no
enforceable boundary. "Reuse just the storage layer" or "reuse just the utility functions"
reintroduces the old model's vocabulary, which then propagates into schemas, then into the
intelligence layer, then into the interface. A hard boundary is the only version of this
rule that can actually be checked at a gate.

Data is separable from architecture. Preserving the owner's historical data through a
one-way importer captures the real value of the old system without inheriting its shape.

## Alternatives considered

**Incremental refactor of the existing application.** Rejected. The canonical-concept
separation (`DATA-001`) is a foundational restructuring, not an addition. A refactor of that
scope is a rewrite with worse constraints and a legacy test suite that encodes the old
semantics.

**Port the data layer, rebuild the interface.** Rejected. The data layer is precisely where
the rejected assumptions live — aggregate scores, merged concepts, mutable history.

**Read legacy source for reference while writing new code.** Rejected for the default path.
Reading legacy source reliably produces structural mimicry even when copying is intended to
be avoided. Product intent is recovered from the controlling plan instead. The owner may
authorize inspection at Phase 9 if importer work requires it.

## Consequences

### Positive

- The canonical-concept separation can be enforced from the first schema rather than
  retrofitted.
- No legacy test suite encoding rejected semantics.
- Every surviving feature earns its place against a current requirement.
- Privacy starts clean: an empty repository has no inherited private data.

### Cost or limitation

- Higher upfront cost. Working behavior must be rebuilt rather than adapted.
- Genuinely good solutions in the old application will be rediscovered rather than reused.
- Historical data is unavailable until Phase 9, which may be deferred indefinitely.
- The owner cannot use the new application for real decisions until the Phase 6 gate.

## Privacy and security impact

**Positive and significant.** Starting empty means the repository contains no inherited
private data and no accidental history to scrub. Legacy backups are never inspected without
explicit Phase 9 authorization, and even then private values stay out of Git, fixtures,
logs, screenshots, documentation, and AI conversation (`PRIV-001`).

## Canonical data and storage impact

The canonical record families are designed from the Product Constitution, not derived from
legacy tables. No legacy schema, ID format, or storage shape constrains them.

If Phase 9 runs, imported data becomes canonical through explicit conversion, and unknown or
unmapped legacy information is preserved in a documented quarantine format rather than
guessed at.

## Intelligence impact

The intelligence layer is built against the canonical model directly. No legacy scoring
formula, threshold, or heuristic is inherited. Every consequential rule must earn its place
through the just-in-time research process, starting from the simplest transparent baseline.

## User-experience impact

The interface is designed from the ten-second opening contract, not from old screens. The
old application's navigation and layouts carry no authority. Familiar-but-rejected patterns
— aggregate scores, widget walls, streak grids — do not survive by default.

## Testing required

- Phase 0: repository contains no legacy code, no legacy dependencies, and no legacy data.
  Verified by file listing.
- Phase 1–8: no legacy import path exists in the application.
- Phase 9A (if authorized): importer types are confined to `src/importers/legacy/` and do
  not appear in domain or intelligence logic; the application functions normally with the
  importer disabled or removed.

## Deferred future work

- The legacy importer itself — Phase 9A, only on explicit owner authorization.
- Owner-authorized private legacy validation — Phase 9B.
- Any decision about whether Phase 9 runs at all. A new-data-only release is fully valid.

## Reversal strategy

Effectively irreversible, by design. Reversing would mean abandoning the rebuild and
returning to the prior application — a product decision, not an architectural one.

The narrow, intentional escape hatch is Phase 9: legacy **data** may enter through a
quarantined one-way importer. Legacy **architecture** may not, under any circumstance.
