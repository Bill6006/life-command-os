# Core Requirements Registry

**Status:** Controlling
**Plan version:** 2.6 Lean Execution
**Current phase:** Phase 2

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
| PROD-002 | The system may intentionally determine that no action is warranted. | 4–10 | PENDING |
| PROD-003 | The opening surface communicates state, evidence status, trajectory, untreated path, action or silence, effects, reason, and confidence in about ten seconds. | 3–10 | PENDING |
| PROD-004 | Useful projections, category effects, North Star relevance, and graphs remain visible while technical machinery stays internal. | 3–10 | PENDING |
| PROD-005 | The interface exposes only one best recommendation, one high-value question, or deliberate silence, never a ranked or comparative recommendation menu. | 3–10 | PENDING |
| LEAN-001 | No speculative code or empty framework may be created without an active requirement. | every phase | ACTIVE |
| LEAN-002 | Research, privacy, traceability, and model infrastructure activate only when their owning behavior exists. | every phase | ACTIVE |
| LEAN-003 | UI variants are limited to the primary surface until one design is selected. | 3 | PENDING |
| LEAN-004 | Domains are implemented one at a time after the first vertical slice. | 7 | PENDING |
| LEAN-005 | Every new abstraction, registry, dependency, service, or infrastructure system must identify its current approved requirement and why a smaller direct implementation is insufficient. | every phase | ACTIVE |
| PRIV-001 | Real personal data may not enter tracked repository content or Git history. | every phase | ACTIVE |
| PRIV-002 | Development and automated tests use neutral synthetic data. | every phase | ACTIVE |
| PRIV-003 | Private runtime data stays local unless the user explicitly exports or shares it. | 1–10 | PENDING |
| ARCH-001 | UI, domain, application, intelligence, storage, and legacy boundaries remain explicit. | 1–10 | ACTIVE |
| DATA-001 | Observations, inferences, forecasts, effects, recommendations, executions, outcomes, evaluations, and beliefs remain separate. | 2–10 | ACTIVE |
| DATA-002 | Corrections preserve history through append and supersession. | 2–10 | ACTIVE |
| STORE-001 | IndexedDB is the sole canonical life-data authority. | 1–10 | ACTIVE |
| STORE-002 | Projections are rebuildable and non-authoritative. | 2–10 | ACTIVE |
| STORE-003 | Encrypted backup and fresh-profile recovery pass before private alpha. | 6 | PENDING |
| INTEL-001 | Local deterministic structured logic is authoritative. | 4–10 | PENDING |
| INTEL-002 | Every forecast has an explicit target, horizon, assumptions, uncertainty, and reason trace. | 4–10 | PENDING |
| INTEL-003 | Predicted intervention effects remain separate from untreated forecasts. | 4–10 | PENDING |
| INTEL-004 | Decisions consider capacity, commitments, safety, timing, North Star, friction, and cross-domain costs. | 4–10 | PENDING |
| INTEL-005 | Unsupported conclusions abstain. | 4–10 | PENDING |
| INTEL-006 | Candidate actions are compared internally, but only one selected recommendation is presented to the user. | 4–10 | PENDING |
| INTEL-007 | The system proposes one weekly direction or a deliberately quiet week from all enabled evidence without requiring the user to identify the priority from a blank slate. | 4–10 | PENDING |
| INTEL-008 | The system explains material changes that altered state, recommendation, or confidence. | 4–10 | PENDING |
| LEARN-001 | Forecast accuracy and recommendation effectiveness are evaluated separately. | 5–10 | PENDING |
| LEARN-002 | Missing outcomes remain unresolved and non-execution is not judged ineffective. | 5–10 | PENDING |
| LEARN-003 | Strong personal claims require prospective evidence. | 5–10 | PENDING |
| UX-001 | The approved Luminous Dark Command Surface remains controlling. | 3–10 | PENDING |
| UX-002 | Facts and inferences are distinguishable without color alone. | 3–10 | PENDING |
| UX-003 | Graphs answer named questions and include accessible summaries. | 5–10 | PENDING |
| UX-004 | The Now surface visibly explains what materially changed and why. | 3–10 | PENDING |
| UX-005 | The selected design meets approved numerical budgets for viewport depth, check-in burden, taps, touch targets, zoom, and local startup. | 3–10 | PENDING |
| UX-006 | Notifications default to off, require user opt-in, respect protected contexts, and never use streak, guilt, or inactivity bait. | 6–10 | PENDING |
| UX-007 | Cold start does not require the user to rank domains or declare what matters most before the system can help. | 3–10 | PENDING |
| UX-008 | Every enabled category has an understandable overview using condition, trajectory, confidence, freshness, drivers, and meaningful domain metrics where available. | 3–10 | PENDING |
| UX-009 | No overall Life Score exists; a numerical category score is optional and may appear only after the numerical-score gate passes. | 3–10 | PENDING |
| UX-010 | Mobile persistent navigation contains no more than five destinations; less frequent areas remain under More. | 3–10 | PENDING |
| UX-011 | The primary experience excludes habit-streak grids, decorative AI imagery, crowded widget walls, and normal-state operational-status panels. | 3–10 | PENDING |
| SAFE-001 | Unsafe actions are filtered before recommendation ranking. | 4–10 | PENDING |
| DOMAIN-001 | Every activated domain uses shared architecture and exposes cross-domain effects. | 7–10 | PENDING |
| TEST-001 | Critical paths have behavioral evidence; coverage percentage alone is insufficient. | every phase | ACTIVE |
| MIG-001 | Legacy import is one-way, optional, quarantined, and canonicalizing. | 9 | PENDING |
| OPS-001 | Release requires tested rollback and exact build evidence. | 10 | PENDING |
| OPS-002 | A stable synthetic-only GitHub Pages owner-preview URL exists from Phase 1 and is updated from each later application-changing gate-approved commit, with deployed-commit evidence recorded. | 1–10 | PENDING |

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

---

## 4. Traceability fields used when a requirement becomes active

Per master plan §68, each active requirement record includes: ID · statement · source
section · owning phase · implementation artifact · test IDs · UI surface where applicable ·
privacy and safety classification · evidence artifact · status · deferred or open decisions.

## 5. Open requirement gaps

Proposals identified during Phase 0. **Not approved and not in force.** Each requires
explicit owner approval before its owning phase begins.

| Proposed ID | Gap | Needed by | Rationale |
|---|---|---:|---|
| `STORE-004` *(proposed — implemented, ID unapproved)* | No approved requirement covers the **unencrypted synthetic development export and restore** format. `STORE-003` covers only Phase 6 encrypted backup. | Phase 2 | Prompt pack Phase 2 task 9 and master plan §29 both mandate the development export/restore, and the Phase 2 gate requires that canonical data survive synthetic restore — but no ID exists to carry the traceability. |

**Status of `STORE-004`.** The *behaviour* is implemented, because Prompt 3 task 9 mandates
it directly and the Phase 2 gate depends on it. The *requirement ID* remains unapproved, so
the work is traced here rather than in Section 2. Implementation:
`src/infrastructure/backup/developmentBackup.ts`, `src/application/commands/backupCommands.ts`.
Tests: `backup.test.ts` → `development backup round trip` (2) and
`a damaged backup is rejected before anything is written` (6); `persistence.spec.ts` →
`exports and restores through a real reload`, `a damaged backup is rejected without touching
canonical state`. Awaiting owner approval to move into Section 2.

New requirement IDs are **not** minted silently. Anything implemented under a proposed ID
must first be approved by the owner and moved into Section 2.
