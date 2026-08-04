# Architecture Overview

**Status:** Controlling (subordinate to the [Product Constitution](../PRODUCT_CONSTITUTION.md))
**Plan version:** 2.6 Lean Execution
**Scope:** the approved technical shape of Life Command OS

This document records decisions that are expensive to reverse. It is deliberately concise.
Detailed decision rationale lives in [ADRs](../decisions/). Concept definitions live in the
[Glossary](../GLOSSARY.md).

> **Directories and modules described here are a target map, not a Phase 1 checklist.**
> Each directory is created when its first justified artifact exists. Empty scaffolding is
> a stop condition (`LEAN-001`).

---

## 1. Implementation baseline

Exact versions are selected and locked during Phase 1 bootstrap after compatibility review,
not chosen here.

| Concern | Approved choice |
|---|---|
| Language | TypeScript, strict mode |
| UI | React |
| Build and dev server | Vite |
| Canonical storage | IndexedDB through a typed transaction wrapper such as Dexie |
| Runtime validation | A TypeScript-first validator such as Zod |
| Installability and offline | Standards-based web app manifest and service worker |
| Unit and integration tests | Vitest |
| Component tests | DOM-focused component testing |
| Browser, offline, recovery, E2E tests | Playwright |
| Hosting | GitHub Pages, one lean Actions workflow (Phase 1) |

**Not implemented for future readiness:** synchronization, native packaging, analytics,
external AI, plugin systems, event buses, dependency injection, Web Workers. No Web Worker
until profiling shows a current intelligence operation blocks the interface.

See [ADR-0002](../decisions/ADR-0002-responsive-pwa-platform.md).

## 2. Modular-monolith boundaries

One repository, one application, explicit boundaries.

```text
life-command-os/
  docs/
    architecture/
    decisions/
    research/          # created when Phase 4 begins
    privacy/           # expanded when Phase 6 begins
    release/           # created when Phase 10 begins
  public/
  scripts/
  src/
    app/
    domain/
      records/
      schemas/
      policies/
      prompts/          # Phase 6 — the behaviour-first question boundary
    application/
      commands/
      queries/
      projections/
    intelligence/
      state/
      forecast/
      intervention/
      decision/
      evaluation/
      learning/
      guides/           # Phase 6 — deterministic guide planning
      change-detection/
      questioning/
    infrastructure/
      database/
      backup/
      crypto/          # Phase 6 — Web Crypto only, see ADR-0009
      logging/
    importers/
      legacy/          # activated only if Phase 9 is authorized
    ui/
      components/
      features/
      design-system/
  tests/
    fixtures/
    scenarios/
    e2e/
```

### 2.1 Data-flow rules

These are enforced boundaries, not conventions:

- **The UI never writes directly to IndexedDB.**
- **Commands** validate and write canonical records.
- **Queries and projections** produce views.
- **Intelligence** consumes validated projections and emits structured results.
  **Intelligence does not write directly to storage.**
- The application may not display "saved" until the authoritative transaction commits.

Module-boundary enforcement is added only to the degree the current repository structure
requires (`ARCH-001`).

### 2.1a Resolutions applied as directories gained content

- **`domain/schemas/` is not created.** With a TypeScript-first validator, the schema and
  the type are one artifact — the type is inferred from the schema. Splitting them across
  two directories would mean either duplicating declarations or separating things that must
  change together. Record families live in `domain/records/`, each exporting its schema and
  its inferred type.
- **`src/intelligence/` does not exist yet.** Phase 4 creates it. Its boundary rules are
  documented here and activate with its code. *(Created in Phase 4; `evaluation/` and
  `learning/` added in Phase 5, `guides/` in Phase 6.)*
- **`domain/prompts/` is domain, not UI.** What the app may ask the owner is a rule about
  the product, not a rendering concern — so the policy and the catalogue sit beside the
  record schemas, and the catalogue validates itself on import. A component cannot define a
  question: a string typed into JSX is not a `CapturePrompt`, carries no attribute to write
  to, and therefore has nowhere to store an answer.
- **`intelligence/guides/` plans, it does not capture.** `planGuide` decides what is worth
  asking from the records and returns a plan. The answers are written by
  `application/commands/`, preserving the rule that intelligence never touches storage.
- **`infrastructure/crypto/` contains one file and no dependency.** Web Crypto
  primitives used as intended — AES-256-GCM and PBKDF2-HMAC-SHA-256 — and nothing else.
  The reasoning, including what was rejected, is in ADR-0009.
- **`logging/` is still empty, and that is the design.** There is no payload logging
  anywhere; a browser test drives a full session on the production build and fails if
  anything reaches the console at all.

### 2.2 The importer boundary is a rule, not a directory

`src/importers/legacy/` is **not created in Phase 1**. Phase 1 records the importer
boundary as an architectural rule and, where cheap, as lint configuration. The directory,
its types, and its code exist only if Phase 9A is explicitly authorized.

Legacy types must never enter normal domain or intelligence logic (`MIG-001`).

## 3. Canonical record envelope

Every canonical record includes, where applicable:

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

Corrections **append and supersede**. Historical truth is never silently rewritten.

See [ADR-0005](../decisions/ADR-0005-append-oriented-records-and-projections.md).

## 4. Core record families

The first vertical slice requires **twenty** families. All are implemented in Phase 2.

| # | Record family |
|---:|---|
| 1 | `ObservationRecord` |
| 2 | `ObservationCorrectionRecord` |
| 3 | `ContextSnapshotRecord` |
| 4 | `InferredStateRecord` |
| 5 | `TrajectoryRecord` |
| 6 | `NorthStarRecord` |
| 7 | `GoalRecord` |
| 8 | `WeeklyDirectionRecord` |
| 9 | `CommitmentRecord` |
| 10 | `CandidateActionRecord` |
| 11 | `UntreatedForecastRecord` |
| 12 | `InterventionEffectPredictionRecord` |
| 13 | `RecommendationRecord` |
| 14 | `ExecutionRecord` |
| 15 | `OutcomeRecord` |
| 16 | `ForecastEvaluationRecord` |
| 17 | `RecommendationEffectEvaluationRecord` |
| 18 | `LifeContextChangeRecord` |
| 19 | `QuestionRecord` |
| 20 | `QuestionAnswerRecord` |

**Activated later:**

- `LearnedBeliefRecord` — Phase 5, when learning behavior exists.
- Domain-specific schemas — only when that domain enters Phase 7.

### 4.1 Resolved discrepancy: `WeeklyDirectionRecord`

The controlling documents disagreed. The prompt pack's Phase 2 task list includes
`WeeklyDirectionRecord`; the master plan's Section 24 record list omits it.

**Resolution — owner-confirmed 2026-08-03: `WeeklyDirectionRecord` is a Phase 2 core
record.**

Rationale: the master plan independently mandates the behavior the record backs — Section
37.1 (system-proposed weekly direction), Section 40 (*"The initial alpha must include the
compact weekly review behavior"*), Section 59 deliverables, and requirement `INTEL-007`.
The Section 24 omission is an oversight, not a deliberate exclusion. Phase gates outrank
specialized specifications in the controlling order.

### 4.2 The three alpha areas get no schemas of their own

Time/attention/capacity, North Star/goals/commitments/life seasons, and career/work/learning
are served entirely by the shared core records above. No area-specific schema is created in
Phase 2 or Phase 4. The alpha scope is not permission to build three separate engines.

## 5. Projection layer

Projections are rebuildable, deletable, and **never canonical truth** (`STORE-002`). They
are created only as an active need appears.

Anticipated projections: current state; data freshness; open commitments; active goals and
North Star direction; important trajectories; active forecast windows; recommendation
history; expected-versus-actual effects; belief ledger; category progress views; backup and
storage health.

Projections must be deletable and rebuildable deterministically from canonical records.
This is a Phase 2 gate requirement.

**Implemented in Phase 2 (two, because two have a current need):**

| Projection | Question it answers |
|---|---|
| `open-commitments` | Which commitments are still open, and which are non-negotiable? |
| `category-freshness` | When did each enabled category last have evidence, and how much? |

Every projection is a pure function of the canonical records, and all projections are
dropped automatically on any canonical write. A stale projection is a second source of
truth; dropping is safe precisely because rebuilding is deterministic.

## 6. Intelligence lifecycle

A decision episode follows this sequence:

1. Gather current observations, context, history, commitments, and goals.
2. Produce a state assessment with known, inferred, stale, conflicting, and unknown fields.
3. Produce an untreated forecast for explicit targets and horizons.
4. Generate plausible candidate actions.
5. Estimate each candidate's positive, negative, delayed, uncertain, and cross-domain
   effects.
6. Remove actions that violate safety, protected contexts, commitments, available time, or
   capacity.
7. Compare remaining actions through inspectable tradeoffs.
8. Emit **one** recommendation, **one** high-value question, or **deliberate silence**.
9. Record the prediction contract and outcome window.
10. Observe execution and later outcomes.
11. Evaluate forecast accuracy.
12. Evaluate recommendation effectiveness **only when evidence permits**.
13. Update, narrow, suspend, or retire beliefs conservatively.

Steps 4–7 are internal. Only step 8's single output reaches the user (`INTEL-006`).

Local deterministic structured logic is authoritative throughout. See
[ADR-0003](../decisions/ADR-0003-local-deterministic-intelligence-authority.md).

## 7. Confidence model

Confidence is not a decorative percentage. Internal computation may use numerical values,
but the user-facing system explains dimensions such as: amount of comparable evidence;
recency; contextual similarity; observation completeness; consistency; confounding risk;
prospective validation; context drift; execution fidelity; missing-outcome rate.

**Approved user-facing labels:** Insufficient evidence · Early signal · Moderate evidence ·
Strong personal evidence.

**A belief should become narrower before it becomes stronger.**

## 8. Decision model

Constraint-first, multi-criteria:

1. Remove unsafe actions.
2. Respect protected contexts and non-negotiable commitments.
3. Remove actions that exceed time or capacity.
4. Compare expected effects by category.
5. Consider North Star and goal alignment.
6. Consider reversibility, friction, timing, and opportunity cost.
7. Prefer the smallest action capturing most expected benefit.
8. Avoid interruption when expected value is low.
9. Select no action when interruption is not justified.

The reason trace is preserved (`INTEL-004`, `SAFE-001`).

## 9. Storage progression

### Phases 1–2

- IndexedDB authority (`STORE-001`);
- atomic validated writes through the application layer;
- deterministic projection rebuild;
- basic **unencrypted synthetic** development export and restore;
- migration registration and forward-only test migrations for schemas that actually exist;
- honest errors.

### Phase 6 — before any real private data

- encrypted portable backups using established Web Crypto primitives — **never custom
  cryptography**;
- versioned cryptographic metadata; honest passphrase and recovery guidance;
- dry-run restore, integrity validation, replacement restore, safety snapshot, apply,
  verify;
- fresh-profile recovery;
- application lock where technically meaningful for a browser-based local PWA, with honest
  stated limitations;
- storage health, quota warnings, corruption handling, interruption safety, stale-tab
  handling, failed-transaction recovery.

Real private data may not be used until the Phase 6 gate passes (`STORE-003`).

See [ADR-0004](../decisions/ADR-0004-indexeddb-canonical-authority.md).

## 10. Single-device-first and sync readiness

The initial release is single-device. Synchronization is **not implemented**.

Sync readiness is carried as **metadata only** — stable identifiers, explicit timestamps,
provenance, and conflict metadata — so future encrypted synchronization remains possible
without a rewrite. No sync interfaces, adapters, transports, merge engines, or conflict
resolvers are created.

See [ADR-0006](../decisions/ADR-0006-single-device-first-with-sync-metadata.md).

## 11. Deployment

Phase 1 establishes **one stable public GitHub Pages owner-preview URL** using the current
officially supported GitHub Actions approach.

- Deploy only after the phase's required checks pass.
- The identical URL is preserved through Phases 1–10.
- Vite base path, application routing, asset paths, manifest paths, and service-worker scope
  must be configured correctly for the repository Pages URL.
- Before stopping at every later gate that changes the application, publish the
  gate-approved commit to that same URL and perform a brief phone-and-desktop smoke check.
- Record URL, deployed commit, deployment status, and verification evidence in
  `PROJECT_STATUS.md`.
- Quiet build metadata — plan version, phase, deployed commit, build time — appears under
  About or More, never as a primary-screen status panel.
- **Hosted content is synthetic-only, permanently.**
- No custom domain, per-pull-request previews, staging environment, hosting abstraction,
  analytics, or release bureaucracy.

**Three distinct milestones, never conflated:**

| Milestone | Authorizes |
|---|---|
| Phase 1 Pages preview | Inspecting synthetic UI progress from a phone. Nothing more. |
| Phase 6 gate | Meaningful private local use, after proven encrypted backup and fresh-profile recovery. Private data still never reaches Pages. |
| Phase 10 gate | Release approval of the same deployment path, with immutable build evidence, tested rollback, and full traceability. No replacement URL is created. |

*(`OPS-002`)*

## 12. Testing progression

| Stage | Covers |
|---|---|
| Early foundation (1–2) | Schema validation; canonical writes; append-oriented corrections; projection rebuild; offline shell; synthetic export and restore; core boundaries |
| First intelligent slice (4) | Fact versus inference; missing and stale data; forecast targets and horizons; action effects; safety and capacity filtering; deliberate silence; reason traces; deterministic scenarios |
| Learning and graphs (5) | Outcome windows; execution fidelity; forecast evaluation; recommendation-effect evaluation; unresolved outcomes; expected-versus-actual views; belief changes; chart accessibility and missing data |
| Private alpha and release (6, 10) | Encrypted backup and restore; corruption and interruption; fresh-profile recovery; app lock; accessibility; responsive behavior; performance; browser matrix; deployment and rollback; full traceability |

Coverage percentage is a signal, not the goal. Critical behavior must be covered
(`TEST-001`).

## 13. Deferred systems

The following are **recorded, not created**. Their current status is tracked in
[PROJECT_STATUS.md](../../PROJECT_STATUS.md).

| Deferred system | Activates |
|---|---|
| Evidence-source registry | When a consequential rule needs it (Phase 4+) |
| Research-card library | Phase 4, just in time, per implemented rule |
| Model-candidate registry | Phase 8, only for active problems with real candidates |
| Retired-rule ledger | Phase 8, only when a rule is actually retired |
| Full domain schemas | Phase 7, one domain at a time |
| Full traceability generator | Phase 10 |
| Production security and release artifacts | Phase 10 |
| `LearnedBeliefRecord` and learning governor | Phase 5 |
| Encryption and application lock (`infrastructure/crypto/`) | Phase 6 |
| Notification infrastructure | Phase 6 at the earliest, only with an active requirement |
| Legacy importer (`src/importers/legacy/`) | Phase 9A, only if explicitly authorized |
| Synchronization, native packaging, analytics, external AI, Web Workers | Not planned; post-release change control only |
