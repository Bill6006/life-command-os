# Core Requirements Registry

**Status:** Controlling
**Plan version:** 2.6 Lean Execution
**Current phase:** Phase 5

This registry preserves the approved requirement IDs. It is the lean traceability spine:
every implemented behavior carries an approved requirement ID in its implementation and its
tests.

**Lean traceability rule.** Full `§68` traceability fields are populated when a requirement
becomes **active** — that is, when its owning phase begins. Future unimplemented scope
remains listed without empty implementation fields, and requires no test placeholders. A
full generated repository-wide traceability report is produced in Phase 10, not before.

---

## 1. Requirement families

| Prefix | Domain |
|---|---|
| `PROD` | Product identity and outcomes |
| `PRIV` | Privacy and data exposure |
| `ARCH` | Architecture boundaries |
| `DATA` | Canonical records and provenance |
| `STORE` | Persistence, backup, restore, migration |
| `INTEL` | Intelligence behavior |
| `LEARN` | Evaluation and learning |
| `DOMAIN` | Domain capability |
| `UX` | Experience and visual quality |
| `SAFE` | Safety boundaries |
| `TEST` | Testing and evidence |
| `MIG` | Legacy import |
| `OPS` | Repository, deployment, release |
| `LEAN` | Credit efficiency and anti-speculation |

## 2. Approved requirements

Status values: `ACTIVE` (owning phase in progress or passed and enforced) ·
`PENDING` (owning phase not yet reached) · `SATISFIED-PH0` (fully discharged by Phase 0
documentation).

| ID | Requirement | Owning phase | Status |
|---|---|---:|---|
| PROD-001 | The product is a private local-first decision-intelligence system, not primarily a tracker. | 0 | ACTIVE |
| PROD-002 | The system may intentionally determine that no action is warranted. | 4–10 | ACTIVE |
| PROD-003 | The opening surface communicates state, evidence status, trajectory, untreated path, action or silence, effects, reason, and confidence in about ten seconds. | 3–10 | ACTIVE |
| PROD-004 | Useful projections, category effects, North Star relevance, and graphs remain visible while technical machinery stays internal. | 3–10 | ACTIVE |
| PROD-005 | The interface exposes only one best recommendation, one high-value question, or deliberate silence, never a ranked or comparative recommendation menu. | 3–10 | ACTIVE |
| LEAN-001 | No speculative code or empty framework may be created without an active requirement. | every phase | ACTIVE |
| LEAN-002 | Research, privacy, traceability, and model infrastructure activate only when their owning behavior exists. | every phase | ACTIVE |
| LEAN-003 | UI variants are limited to the primary surface until one design is selected. | 3 | ACTIVE |
| LEAN-004 | Domains are implemented one at a time after the first vertical slice. | 7 | PENDING |
| LEAN-005 | Every new abstraction, registry, dependency, service, or infrastructure system must identify its current approved requirement and why a smaller direct implementation is insufficient. | every phase | ACTIVE |
| PRIV-001 | Real personal data may not enter tracked repository content or Git history. | every phase | ACTIVE |
| PRIV-002 | Development and automated tests use neutral synthetic data. | every phase | ACTIVE |
| PRIV-003 | Private runtime data stays local unless the user explicitly exports or shares it. | 1–10 | ACTIVE |
| ARCH-001 | UI, domain, application, intelligence, storage, and legacy boundaries remain explicit. | 1–10 | ACTIVE |
| DATA-001 | Observations, inferences, forecasts, effects, recommendations, executions, outcomes, evaluations, and beliefs remain separate. | 2–10 | ACTIVE |
| DATA-002 | Corrections preserve history through append and supersession. | 2–10 | ACTIVE |
| STORE-001 | IndexedDB is the sole canonical life-data authority. | 1–10 | ACTIVE |
| STORE-002 | Projections are rebuildable and non-authoritative. | 2–10 | ACTIVE |
| STORE-003 | Encrypted backup and fresh-profile recovery pass before private alpha. | 6 | PENDING |
| STORE-004 | A synthetic development export and restore round trip preserves canonical records, and a damaged backup is rejected before any mutation. | 2–10 | ACTIVE |
| INTEL-001 | Local deterministic structured logic is authoritative. | 4–10 | ACTIVE |
| INTEL-002 | Every forecast has an explicit target, horizon, assumptions, uncertainty, and reason trace. | 4–10 | ACTIVE |
| INTEL-003 | Predicted intervention effects remain separate from untreated forecasts. | 4–10 | ACTIVE |
| INTEL-004 | Decisions consider capacity, commitments, safety, timing, North Star, friction, and cross-domain costs. | 4–10 | ACTIVE |
| INTEL-005 | Unsupported conclusions abstain. | 4–10 | ACTIVE |
| INTEL-006 | Candidate actions are compared internally, but only one selected recommendation is presented to the user. | 4–10 | ACTIVE |
| INTEL-007 | The system proposes one weekly direction or a deliberately quiet week from all enabled evidence without requiring the user to identify the priority from a blank slate. | 4–10 | ACTIVE |
| INTEL-008 | The system explains material changes that altered state, recommendation, or confidence. | 4–10 | ACTIVE |
| LEARN-001 | Forecast accuracy and recommendation effectiveness are evaluated separately. | 5–10 | ACTIVE |
| LEARN-002 | Missing outcomes remain unresolved and non-execution is not judged ineffective. | 5–10 | ACTIVE |
| LEARN-003 | Strong personal claims require prospective evidence. | 5–10 | ACTIVE |
| UX-001 | The approved Luminous Dark Command Surface remains controlling. | 3–10 | ACTIVE |
| UX-002 | Facts and inferences are distinguishable without color alone. | 3–10 | ACTIVE |
| UX-003 | Graphs answer named questions and include accessible summaries. | 5–10 | ACTIVE |
| UX-004 | The Now surface visibly explains what materially changed and why. | 3–10 | ACTIVE |
| UX-005 | The selected design meets approved numerical budgets for viewport depth, check-in burden, taps, touch targets, zoom, and local startup. | 3–10 | ACTIVE |
| UX-006 | Notifications default to off, require user opt-in, respect protected contexts, and never use streak, guilt, or inactivity bait. | 6–10 | PENDING |
| UX-007 | Cold start does not require the user to rank domains or declare what matters most before the system can help. | 3–10 | ACTIVE |
| UX-008 | Every enabled category has an understandable overview using condition, trajectory, confidence, freshness, drivers, and meaningful domain metrics where available. | 3–10 | ACTIVE |
| UX-009 | No overall Life Score exists; a numerical category score is optional and may appear only after the numerical-score gate passes. | 3–10 | ACTIVE |
| UX-010 | Mobile persistent navigation contains no more than five destinations; less frequent areas remain under More. | 3–10 | ACTIVE |
| UX-011 | The primary experience excludes habit-streak grids, decorative AI imagery, crowded widget walls, and normal-state operational-status panels. | 3–10 | ACTIVE |
| SAFE-001 | Unsafe actions are filtered before recommendation ranking. | 4–10 | ACTIVE |
| DOMAIN-001 | Every activated domain uses shared architecture and exposes cross-domain effects. | 7–10 | PENDING |
| TEST-001 | Critical paths have behavioral evidence; coverage percentage alone is insufficient. | every phase | ACTIVE |
| MIG-001 | Legacy import is one-way, optional, quarantined, and canonicalizing. | 9 | PENDING |
| OPS-001 | Release requires tested rollback and exact build evidence. | 10 | PENDING |
| OPS-002 | A stable synthetic-only GitHub Pages owner-preview URL exists from Phase 1 and is updated from each later application-changing gate-approved commit, with deployed-commit evidence recorded. | 1–10 | ACTIVE |

## 3. Active requirement records — Phase 0

Full traceability fields for the seven requirements active in Phase 0.

---

### PROD-001

| Field | Value |
|---|---|
| **Statement** | The product is a private local-first decision-intelligence system, not primarily a tracker. |
| **Source section** | Master plan §1, §67 |
| **Owning phase** | 0 |
| **Implementation artifact** | `docs/PRODUCT_CONSTITUTION.md` §1; `README.md` |
| **Test IDs** | None. Phase 0 is documentation; verification is owner review of the Constitution. |
| **UI surface** | Not applicable in Phase 0 |
| **Privacy / safety classification** | Not sensitive |
| **Evidence artifact** | `PROJECT_STATUS.md` gate evidence, Phase 0 |
| **Status** | ACTIVE — documented and controlling |
| **Deferred or open decisions** | None |

### LEAN-001

| Field | Value |
|---|---|
| **Statement** | No speculative code or empty framework may be created without an active requirement. |
| **Source section** | Master plan §15, §16, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/PRODUCT_CONSTITUTION.md` §18; `docs/architecture/ARCHITECTURE_OVERVIEW.md` §13 (deferred systems recorded, not created) |
| **Test IDs** | None yet. Enforced by gate review each phase; module-boundary checks arrive in Phase 1. |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | Not sensitive |
| **Evidence artifact** | Phase 0 contains zero application files. Verified by repository file listing in `PROJECT_STATUS.md`. |
| **Status** | ACTIVE |
| **Deferred or open decisions** | None |

### LEAN-002

| Field | Value |
|---|---|
| **Statement** | Research, privacy, traceability, and model infrastructure activate only when their owning behavior exists. |
| **Source section** | Master plan §14, §17, §18, §44, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/architecture/ARCHITECTURE_OVERVIEW.md` §13; `PROJECT_STATUS.md` deferred-work section |
| **Test IDs** | None yet |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | Not sensitive |
| **Evidence artifact** | Phase 0 created no research templates, no registries, no ledgers, no traceability generator. |
| **Status** | ACTIVE |
| **Deferred or open decisions** | None |

### LEAN-005

| Field | Value |
|---|---|
| **Statement** | Every new abstraction, registry, dependency, service, or infrastructure system must identify its current approved requirement and why a smaller direct implementation is insufficient. |
| **Source section** | Master plan §15, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/PRODUCT_CONSTITUTION.md` §18.1; `PROJECT_STATUS.md` "New abstractions or infrastructure" section (three mandatory fields) |
| **Test IDs** | None yet. Enforced by the reporting template at every gate. |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | Not sensitive |
| **Evidence artifact** | Phase 0 created zero abstractions and zero dependencies. |
| **Status** | ACTIVE |
| **Deferred or open decisions** | None |

### PRIV-001

| Field | Value |
|---|---|
| **Statement** | Real personal data may not enter tracked repository content or Git history. |
| **Source section** | Master plan §4, §51, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/PRODUCT_CONSTITUTION.md` §4; `README.md` privacy rule; ADR-0007 |
| **Test IDs** | None yet. `.gitignore` and standard secret scanning are Phase 1 deliverables. |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | **Privacy-critical** |
| **Evidence artifact** | Phase 0 personal-information scan recorded in `PROJECT_STATUS.md`. |
| **Status** | ACTIVE |
| **Deferred or open decisions** | Commit-author email in Git metadata — see `PROJECT_STATUS.md` open decisions. Resolve before the first push in Phase 1. |

### PRIV-002

| Field | Value |
|---|---|
| **Statement** | Development and automated tests use neutral synthetic data. |
| **Source section** | Master plan §4, §51, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/PRODUCT_CONSTITUTION.md` §4; `docs/GLOSSARY.md` §9 "Synthetic data"; ADR-0007 |
| **Test IDs** | None yet. Synthetic fixture conventions arrive in Phase 1; deterministic fixture builders in Phase 2. |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | **Privacy-critical** |
| **Evidence artifact** | Phase 0 contains no fixtures, tests, or data of any kind. |
| **Status** | ACTIVE |
| **Deferred or open decisions** | None |

### TEST-001

| Field | Value |
|---|---|
| **Statement** | Critical paths have behavioral evidence; coverage percentage alone is insufficient. |
| **Source section** | Master plan §54, §67 |
| **Owning phase** | every phase |
| **Implementation artifact** | `docs/architecture/ARCHITECTURE_OVERVIEW.md` §12 (testing progression) |
| **Test IDs** | None. Phase 0 produces no executable behavior, so there is nothing to test. Test configuration is a Phase 1 deliverable. |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | Not sensitive |
| **Evidence artifact** | Testing progression documented; first executable tests land in Phase 1. |
| **Status** | ACTIVE — honestly reported as having no executable evidence yet |
| **Deferred or open decisions** | None |

---

## 3a. Active requirement records — Phase 2

Requirements that became active with the canonical model. Test IDs are the `describe`
blocks that carry the evidence.

---

### DATA-001 — canonical concepts remain separate

| Field | Value |
|---|---|
| **Owning phase** | 2–10 |
| **Implementation artifact** | `src/domain/records/*` (twenty families, each a strict object with a literal `recordType` and a constrained provenance basis); `src/domain/policies/invariants.ts` |
| **Test IDs** | `records.test.ts` → `invariant 1 — inference must not masquerade as observation` (5 cases); `invariant 2 — forecast must not masquerade as outcome` (3); `invariant 3 — recommendation must not masquerade as execution` (3); `invariant 4 — outcome must not masquerade as causal effect` (2); `core record families` (4) |
| **UI surface** | None yet. Phase 3. |
| **Privacy / safety classification** | Integrity-critical |
| **Evidence artifact** | 20/20 families validate independently; every attempted substitution is rejected |
| **Status** | ACTIVE |
| **Open decisions** | None |

### DATA-002 — corrections preserve history

| Field | Value |
|---|---|
| **Owning phase** | 2–10 |
| **Implementation artifact** | `observationCorrectionRecord` (required `supersedesRecordId` and `reason`); `recordRepository.appendRecord` uses Dexie `add`, never `put`, so a stored record cannot be overwritten; `invariants.currentRecords` / `supersessionChain` |
| **Test IDs** | `invariants.test.ts` → `supersession resolution` (3); `storage.test.ts` → `corrections` (1), `the write path` → `refuses to overwrite an existing record`; `persistence.spec.ts` → `a correction supersedes without destroying the original, across a reload`, `refuses to overwrite an existing record` |
| **UI surface** | None yet. Phase 3 Timeline. |
| **Privacy / safety classification** | Integrity-critical |
| **Evidence artifact** | Superseded values remain readable after correction and after reload |
| **Status** | ACTIVE |
| **Open decisions** | **Deletion semantics distinct from correction remain undecided.** Append-oriented storage preserves corrected values, so correction is not redaction. Not implemented in Phase 2. |

### STORE-001 — IndexedDB is the sole canonical authority

| Field | Value |
|---|---|
| **Owning phase** | 1–10 |
| **Implementation artifact** | `src/infrastructure/database/connection.ts` (schema v2); `recordRepository.ts`; ESLint `no-restricted-imports` blocking UI→storage and `no-restricted-globals` blocking `localStorage` in `src/` |
| **Test IDs** | `database.test.ts` (6); `storage.test.ts` → `the write path` (4); `migrations.test.ts` → `upgrading a version 1 database`; `persistence.spec.ts` → `canonical records survive a full page reload` |
| **UI surface** | None yet. Phase 3 Data & Privacy. |
| **Privacy / safety classification** | Integrity-critical |
| **Evidence artifact** | One `records` store; no per-domain table; `localStorage` unreachable from `src/`; boundary lint verified to fire |
| **Status** | ACTIVE |
| **Open decisions** | None |

### STORE-002 — projections are rebuildable and non-authoritative

| Field | Value |
|---|---|
| **Owning phase** | 2–10 |
| **Implementation artifact** | `src/application/projections/index.ts` (two projections, each a pure function of canonical records); `projectionStore.ts`; projections are dropped automatically on every canonical write |
| **Test IDs** | `storage.test.ts` → `projections` (4); `persistence.spec.ts` → `projections rebuild identically after being dropped` |
| **UI surface** | None yet. Phase 3 Direction. |
| **Privacy / safety classification** | Not sensitive (derived only) |
| **Evidence artifact** | Dropping every projection and rebuilding produces byte-identical output; a category with no evidence reports `unknown`, never zero or the epoch |
| **Status** | ACTIVE |
| **Open decisions** | None |

### ARCH-001 — boundaries remain explicit

| Field | Value |
|---|---|
| **Owning phase** | 1–10 |
| **Implementation artifact** | `eslint.config.js` boundary rules; `src/application/commands/writeRecord.ts` as the sole validated write path; intelligence layer does not exist yet and therefore cannot violate its boundary |
| **Test IDs** | Boundary probe (manual, reproducible — see `PROJECT_STATUS.md`); `storage.test.ts` → `the write path` |
| **UI surface** | Not applicable |
| **Privacy / safety classification** | Integrity-critical |
| **Evidence artifact** | A UI file importing `dexie` or the database module produces two lint errors with the ADR-0004 messages |
| **Status** | ACTIVE |
| **Open decisions** | `src/importers/` and `src/intelligence/` still do not exist; their boundary rules activate with their code. |

### STORE-004 — synthetic development export and restore

| Field | Value |
|---|---|
| **Owning phase** | 2–10 |
| **Approved** | 2026-08-03 by the owner, covering behaviour already implemented in Phase 2 |
| **Implementation artifact** | `src/infrastructure/backup/developmentBackup.ts` (format, complete validation before any mutation); `src/application/commands/backupCommands.ts` |
| **Test IDs** | `backup.test.ts` → `development backup round trip` (2), `a damaged backup is rejected before anything is written` (6); `persistence.spec.ts` → `exports and restores through a real reload`, `a damaged backup is rejected without touching canonical state` |
| **UI surface** | None yet. Phase 3 Data & Privacy at the earliest. |
| **Privacy / safety classification** | Integrity-critical. **Unencrypted by design** — the file declares `encrypted: false` so it cannot be mistaken for a Phase 6 backup, and `STORE-003` still gates real private data. |
| **Evidence artifact** | Round trip preserves superseded history; six damaged-backup cases each leave canonical state untouched |
| **Status** | ACTIVE |
| **Open decisions** | None. Encrypted portable backup remains `STORE-003`, Phase 6. |

---

## 3b. Active requirement records — Phase 4

The intelligence requirements, mapped to the modules that implement them and the tests that
carry the evidence. Test IDs are `describe` blocks.

**Every rule below is classified `unproven-transparent-baseline`.** None has been validated
against this owner's outcomes, because no outcome has been observed yet. Full contracts —
decision target, horizon, abstention, failure, safety, privacy, validation path, retirement —
are machine-readable in `src/intelligence/contracts.ts` and asserted complete by test.

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `INTEL-001` | Whole of `src/intelligence/`; no network, no external AI, `now` always injected | `engine.test.ts` → `determinism` | Identical inputs produce byte-identical episodes |
| `INTEL-002` | `forecast/untreatedForecast.ts` | `abstention` (4) | Target, horizon, assumptions, uncertainty, and reason trace all required; abstains as `unknown` rather than guessing |
| `INTEL-003` | `intervention/predictedEffects.ts` requires `candidateId`; forecast carries no action | `predicted effects stay separate from the untreated forecast` (3) | The two cannot be confused structurally |
| `INTEL-004` | `decision/selectOutput.ts` — safety, protected contexts, commitments, time, capacity, then comparison | `constraint-first selection` (3) | Filtering happens before ranking and cannot be outscored |
| `INTEL-005` | Abstention paths in trajectory, forecast, and selection | `abstention` (4), `cold start` (3) | Insufficient evidence is a distinct output, not a degraded silence |
| `INTEL-006` | `internal.rejected` audit trail, never rendered | `exactly one output, always` (2); `console-shell.spec.ts` → `one best move, never a menu` (17) | At most one primary action in every scenario, at both viewports |
| `INTEL-007` | `decision/weeklyDirection.ts` | `weekly direction` (3) | System proposes; quiet week is a proposal on its merits |
| `INTEL-008` | `change-detection/materialChange.ts` — diffs two real engine runs | `material change` (2) | What changed is what demonstrably differs |
| `SAFE-001` | Safety filter runs first; the candidate generator has no vocabulary for unsafe actions | `constraint-first selection` | Unsafe actions are removed, never penalised |
| `PROD-002` | `DeliberateSilence` branch | `silence is a conclusion with no action to take` | Silence is a first-class result |
| `PROD-003` | `NowSurface` renders the full payload from `EpisodeResult` | `console-shell.spec.ts` → `the decision always leads` (16) | Decision within the first viewport at 375 × 812 |
| `PROD-005` | `DecisionOutput` is a four-branch union; a list is unrepresentable | `one best move, never a menu` | — |
| `UX-002` | `EvidenceTag` renders the word and differs by border style | `facts and inferences` | Computed `border-style` asserted |
| `UX-004` | What-changed panel plus the expanded view | `explains what changed and why the answer moved` | — |
| `UX-005` | Console layout | `interaction budgets at 375 x 812` (4) | Cached-startup target remains owner-measured |
| `UX-007` | Cold start emits insufficient evidence and asks nothing | `cold start` (3); `cold start asks for nothing and ranks no domains` | No questionnaire is representable |
| `UX-008` | `state/categorySummaries.ts` | `categories` (2) | Six required elements per enabled category |
| `UX-009` | No score is computed anywhere | `emits no numerical category score anywhere` | Asserted across every scenario |
| `UX-003` | `components/TrendChart.tsx`, series typed to carry its obligations | `console-shell.spec.ts` → `the chart states everything the graph policy requires` (2) | Every gap marked; points + gaps = window length |

## 3c. Active requirement records — Phase 5

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `LEARN-001` | `evaluation/evaluate.ts` — `evaluateForecasts` and `evaluateEffectiveness` are separate functions with separate result types; `LearningResult` holds them as separate fields | `learning.test.ts` → `forecast accuracy and effectiveness stay separate` (3); `console-shell.spec.ts` → `forecast accuracy and effectiveness are separate panels` | No code path averages or combines them |
| `LEARN-002` | Execution-state guard in `evaluateEffectiveness`; expired windows in `outcomeWindows.ts` | `non-execution is never judged` (3); `missing outcomes remain unresolved` (2) | Declining and missing outcomes both produce `unresolved`, and contribute nothing to any belief |
| `LEARN-003` | `learning/beliefs.ts` — the top label requires four clean prospective episodes; `learnedBeliefRecord` refuses it without `prospectivelyValidated` | `the confidence ceiling lifts, but only on prospective evidence` (3) | The schema enforces it independently of the governor |
| Confounding | `assessConfounding` — overlapping executions, context changes, partial execution | `a positive outcome does not prove causation` (4) | A high-risk episode cannot reach `supported` |
| Belief governor | `deriveBeliefs` — form, strengthen, narrow, suspend, retire | `beliefs update conservatively and keep their reasons` (2) | Narrowing precedes weakening; suspension preserves evidence |
| Weekly continuity | `decision/weeklyContinuity.ts` | `weekly-direction continuity` (2) | No moral vocabulary anywhere, asserted |
| Graceful return | `state/absence.ts` | `graceful return after absence` (4) | No backlog, no guilt language, predictions expire rather than fail |
| `UX-003` | `learning/insights.ts` (8 graphs) + `components/GraphFigure.tsx` | `every graph answers a named question` (3); `console-shell.spec.ts` → `every graphic is a named chart` | Every graph carries its obligations as data |

---

### Confidence ceiling — lifted in Phase 5, for beliefs only

Through Phase 4 `strong-personal-evidence` was unreachable by construction. Phase 5 lifts that
ceiling **only for beliefs, and only under prospective validation**: four clean episodes, each
predicted before it was observed, none contradicted and none confounded.

State, trajectory, forecast, decision, and weekly-direction confidence still cannot reach it,
and a test asserts that across every scenario. None of them is validated against a later
outcome, so none of them has earned it.

### Superseded Phase 4 note

`assessConfidence` cannot return `strong-personal-evidence` in this phase, and a test asserts
it never appears anywhere in any scenario. The top label requires prospective validation
(`LEARN-003`), which does not exist until Phase 5. A baseline able to award itself the highest
confidence on its first day would be exactly the false precision the Constitution forbids.

---

## 4. Traceability fields used when a requirement becomes active

Per master plan §68, each active requirement record includes: ID · statement · source
section · owning phase · implementation artifact · test IDs · UI surface where applicable ·
privacy and safety classification · evidence artifact · status · deferred or open decisions.

## 5. Open requirement gaps

Proposals identified during Phase 0. **Not approved and not in force.** Each requires
explicit owner approval before its owning phase begins.

**No open requirement gaps.** `STORE-004` was owner-approved on 2026-08-03 and moved into
Section 2; its traceability record is in Section 3a.

New requirement IDs are **not** minted silently. Anything implemented under a proposed ID
must first be approved by the owner and moved into Section 2.
