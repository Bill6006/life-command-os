# Core Requirements Registry

**Status:** Controlling
**Plan version:** 3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment
**Current phase:** Phase 7 — **complete**. Prompts 8A–8H and the 8D.2 bridge are GREEN; Phase 8 is next

**Controlling artifacts from v3.0.** The Final Product Blueprint, Updated Requirements
Register v2, Final Acceptance Test Matrix, and Final Legacy Decisions map now supply the
requirement IDs used from Phase 6 onward (`OWN-*`, `OBS-*`, `CI-*`, `XDS-*`, `LEG-*`,
`AT-*`). The `PROD`/`PRIV`/`ARCH`/… families below remain in force for everything they
already govern; the two sets are complementary rather than competing, and Phase 6 records
cite whichever is the nearer authority.

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

## 3d. Active requirement records — Phase 6, Prompt 7A

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `OBS-001` `OBS-002` `OBS-003` | `domain/prompts/policy.ts` — `validatePromptDefinition` rejects cause, feeling, efficacy-judgement, and self-diagnosis questions | `prompts.test.ts` → `prohibited questions are rejected` (18) | The catalogue validates itself on import, so a prohibited prompt breaks the build |
| `OBS-004` | `domain/prompts/definitions.ts` — nine observable outcome patterns | `covers every observable outcome pattern the phase requires` | Started, completed, duration, stopped early, returned, still interfering, symptom, interaction, decision |
| `OBS-005` | `domain/records/scales.ts` — seven anchored scales | `the approved anchored scales` (3) | Present-state labels; nothing asks why |
| `OBS-006` | `unsure` observed value; `UNSURE` answer; `PromptControl` "I cannot tell" | `writes something for a deliberate "I cannot tell"` (2); `records "I cannot tell" as unknown rather than as no effect` | Its own value kind, so nothing can read it as no, zero, or unchanged |
| `OBS-011` | `optional-note` prompt kind, exempt from the question checks | `accepts an optional note that invites the owner's own explanation` | Volunteered interpretation is permitted; requiring it is not |
| `OBS-012` | `assertPromptCatalogue(ALL_PROMPTS)` at module load | `the shipped catalogue` (4) | CI, the build, and the page load all fail together on a violation |
| `OWN-016`–`OWN-021` | `intelligence/guides/planGuide.ts`; `domain/records/guides.ts`; `ui/features/guides/` | `guides` (9 unit, 5 browser) | Morning, catch-up, afternoon, evening, weekly, quick check-in; 15/30/45/Full |
| `OWN-019` | `respondToWeeklyDirection`; `weeklyDirectionResponse` gains `snoozed` and `skipped` | `the weekly direction` (1 unit, 1 browser) | Snooze and Skip are their own branches, never flavours of rejection |
| `OWN-020` | `CATCH_UP_DROPS` in `planGuide.ts` | `catch-up asks only questions that are still worth asking` | Bedtime and wake time survive; fine-grained night recall does not |
| `OWN-023` | `MAX_STEPS`, `NORMAL_RESPONSE_BUDGET`, `DEFAULT_DEPTH` | `keeps a normal check-in within five responses`; `ask one question at a time and stay within the budget` | Only `45` and `full`, chosen deliberately, exceed five |
| `OWN-024` | `observedValueFor` returns `undefined` for `not-answered`; no control is preselected | `writes nothing at all for an untouched control`; `nothing is preselected, and a skipped question stores nothing` | Absence of a record is the only safe representation of "not reported" |
| `OWN-026`–`OWN-032` | `SCALES` with ordinal, label, scale id, and version stored together | `what an answer becomes` (5); `an answered scale survives a reload` | `AT-050`: the stress direction is data, not an assumption |
| `OWN-033` | `declineRecommendation` + `DECLINE_REASONS` | `Can't Now creates a constraint and is never read as ineffectiveness` (3 unit, 1 browser) | Time-unclear makes free time unresolved rather than guessing it downwards |
| `OWN-043` | `SLEEP_PROMPTS`; `sleepSpan` calculates time in bed | `prompts.test.ts` catalogue assertions | Duration is calculated and labelled an estimate; the app never claims measured sleep |
| `OWN-044` | `FOOD_PROMPTS` — time, broad tags, energy after, digestive response | catalogue assertions | Five prompts, no checkbox wall, no macros |
| `OWN-061` | `application/commands/{capture,decisionEpisode,guideSession}.ts`; UI cannot import storage | ESLint boundary rule; `interactions.test.ts` (22) | Every write is validated and atomic |
| `OWN-063` | `quickCapture` writes exactly one observation | `writes exactly one canonical event`; browser `writes one canonical event that survives a reload` | The shell only — domain forms reuse it in Phase 7 |
| `OWN-070` | `PRIVACY_CLASSES` on the envelope; `classificationOf` fails closed | `an answered scale survives a reload` (`privacy: 'general'`); `quick capture` (`privacy: 'note'`) | Unclassified resolves to the most private class |
| `LEG-020` `LEG-021` | `guideSessionRecord` — completed, stopped, snoozed, skipped | `has no failure state to record` | There is no representable failure state, so none can start being counted |
| `CI-006` | `startRecommendation` writes `unknown-execution`; `recordOutcome` supersedes it | `supersedes the execution rather than mutating it`; `leaves the outcome unresolved when nothing observable was reported` | Starting is not executing; completing is not an outcome |

### Two separations Prompt 7A had to hold

**Starting is not executing.** Pressing Start writes an execution in the
`unknown-execution` state. That opens the outcome window so the evening guide can follow up,
and claims nothing about what happened. The real state arrives later as a superseding record.

**Completing is not an outcome.** "Did you finish it?" describes the execution. Whether
anything changed is a separate observable question, and without an answer to one the outcome
stays `unresolved`. Finishing an action is never promoted into evidence that it helped.

### Resolved conflict: stored freshness

Prompt 7A task 6 and Blueprint §4.4 list *freshness* among the fields an observation stores.
Phase 2 established that freshness is **computed, never stored**, because a stored freshness
label is wrong the moment time passes and correcting it would mean mutating history.

Resolution: what is stored is everything freshness is computed **from** — `occurredAt` and
`recordedAt` — and `assessFreshness` derives it against the decision at hand. Freshness is
shown wherever a reading is shown, so the owner-visible requirement is met without a field
that goes stale in storage.

---

## 3e. Active requirement records — Phase 6, Prompt 7B

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `OWN-066` | `infrastructure/crypto/backupCrypto.ts` — AES-256-GCM, PBKDF2-SHA-256 at 600,000 iterations; `portableBackup.ts` | `recovery.test.ts` → `the cryptography is standard and used as intended` (6); `the backup file` (5) | ADR-0009. No invented cryptography; crypto metadata is authenticated, not merely stored |
| `OWN-067` | `application/commands/recoveryCommands.ts` — dry run, snapshot, apply, verify, rollback | `restore, verification, and rollback` (6); `corruption stops before mutation` (6) | Verification re-reads from storage rather than trusting what was written |
| `OWN-067` (fresh profile) | Data & Privacy restore flow | `production-recovery.spec.ts` → `a backup made here restores exactly onto a profile that has never seen it` | Proved on the **production build**, through the real interface, in a browser context with no shared storage |
| `OWN-068` `OWN-069` | `application/queries/aiExport.ts` — 7 / 30 / 90 / all / custom | `export.test.ts` → `ranges` (3); `the export says what it is not` (2) | The export states in its opening lines that it cannot restore anything |
| `OWN-070` | Default include set is `['general']`; `classificationOf` fails closed | `sensitive classes are excluded until explicitly included` (12) | Unclassified resolves to `private-pattern`, the most protective class |
| `AT-113` | `fieldClassificationOf` + `fieldPrivacy` on the envelope | `field-level privacy` (3) | A field override may narrow the record's class, never widen it |
| `OWN-071` `OWN-072` | No network code anywhere in `src/` | `privacy-audit.spec.ts` → `every request during a full session is same-origin` (5) | Verified at runtime on the production build, not by grep |
| `OWN-073` | **Deferred with reasons** — `docs/PRIVATE_ALPHA.md` §6 | `offers no notification permission prompt, because none is implemented` | Push needs a server; local notifications need the page open. Neither is honest here |
| `LEG-139` | `MINIMUM_PASSPHRASE_LENGTH`, honest guidance copy | `refuses a passphrase too short to be worth encrypting with` | "Nobody can recover this passphrase" appears before the owner types one |
| `LEG-152` | `unknownFields` on the envelope; `parseWithUnknownFieldQuarantine` | `unknown fields and privacy metadata survive` (3) | Top-level quarantine only; a nested unknown is still a rejection, deliberately |
| `LEG-134` `LEG-135` | `snapshots` store (schema v3); digest verification after apply | `takes a restore point before replacing anything`; `refuses to roll back to a damaged restore point` | The snapshot is durable, so it survives the tab dying mid-restore |
| `LEG-137` `LEG-141` | `application/queries/storageHealth.ts` | `Data & Privacy tells the truth about the owner's own records` | Quiet when healthy; there is no "all systems operational" counterpart |
| App lock | `application/commands/appLock.ts`; `LockScreen` | `states the lock does not encrypt, and that the passphrase is unrecoverable` | Verifier only, never the passphrase; limits stated on the surface itself |
| Storage failures | `classifyStorageError` in `writeRecord.ts` | Typed `storage-full` / `transaction-failed` results | Quota and transaction failures are distinguishable from invalid data |
| Stale tab | `onDatabaseSuperseded` in `connection.ts` | Rendered as an alert banner in `AppShell` | This tab yields the connection rather than blocking another tab's upgrade |
| Migration | `MIGRATIONS` v3 | `migrations.test.ts` → `upgrades a version 2 database without touching the canonical records` | The test that would catch a drop-and-rebuild migration |
| Task 18 | `__TEST_BRIDGE__` compile-time constant | `the production build carries no test bridge` (2) | Removal, not concealment: the bundle contains no trace of it |

### Why success is only reported after reading storage back

`applyRestore` writes, then re-reads from IndexedDB and hashes what came back. Comparing
the values just written would prove only that the code can remember what it did a moment
ago. The question worth answering is whether the *database* holds them, and the only way
to answer it is to ask the database.

That ordering is also what makes "an interrupted restore cannot report success" true
rather than hoped for: an interruption at any point means the verification step never
runs, so nothing reports success — and the safety snapshot, written before the
replacement began, survives the interruption because it is in the database rather than
in memory.

---

## 3f. Active requirement records — Phase 7, Prompt 8A

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| Domain metadata | `domain/domains/definitions.ts` — seven approved domains | `domains.test.ts` → `domain metadata describes without implementing` (5) | Metadata only. No candidate generator, no panel content, no record family |
| `XDS-073` | `domain-preference` is the only domain family; every fact comes from shared records | `creates no domain-specific record family` | Seven domains, one store. No parallel database |
| `OWN-013` | `intelligence/domains/domainPanel.ts` — the twelve-field contract | `the panel contract is the same for every domain` (5); `domains.spec.ts` → `shows the full panel contract` | One component renders every domain, so an area cannot acquire its own standard of evidence |
| `XDS-015` `AT-016` | `enforceOneCandidatePerDomain`, applied before comparison in `runEpisode` | `a domain may offer one candidate, and no more` (4) | A second candidate is rejected **and reported**, never silently dropped |
| `XDS-016` `AT-017` | `intendedOutcome` and `observableFollowUp` required on `candidateActionRecord` | `rejects a candidate record with no intended outcome or follow-up` | A candidate that cannot say what it is for has nothing to be evaluated against |
| `OWN-014` `CI-015` | `domain/capabilities.ts` — ten channels, six words, no numeric field | `capability channels cannot become a score` (4) | A numeric field is a parse error. There is no function anywhere that totals them |
| `XDS-014` | `domain/prompts/ownership.ts` | `exactly one surface owns each question` (5) | Ownership is derived from the prompt id, so two lists cannot drift apart |
| `OWN-004` `XDS-033` | `intelligence/domains/manualFocus.ts`; `ManualFocusView` | `manual focus is the owner's constraint, labelled as such` (3); browser (1) | `chosenByOwner` is on the result and rendered — the label is the feature |
| `OWN-003` `XDS-032` | `DomainMove.subordinate` is `true` with no way to unset it | `marks every domain move subordinate` | A domain move is never the answer to "what now" |
| `OWN-063` `AT-065` | `intelligence/domains/captureRouting.ts` | `one capture, one canonical event` (4) | Routing returns *surfaces*, never records, so duplication is unrepresentable |
| `OWN-051` `AT-081` | `intelligence/visuals/eligibility.ts` — `meterEligibility` | `a visual has to earn its place` (8) | Refuses a percentage over a construct with no denominator |
| `OWN-052`–`OWN-054` | Line, bar, stage, timeline, and evidence-summary eligibility | same | The evidence summary never refuses, so there is always something honest to render |
| `UX-003` (task 10) | `VisualSpec` — eight required declarations | `visuals.tsx` renders all eight | A visual that cannot state its decision question cannot be constructed |
| `XDS-009` `AT-118` | `legacyProvenance` on the envelope | Schema; written from Phase 9 | `evidenceClass` is the literal `legacy-heuristic`. There is no branch that promotes a legacy rule to research |
| `OWN-070` (domain level) | `DomainDefinition.privacy`; captures inherit it | `classifies sensitive areas as sensitive by default` | A fatherhood capture is `child` data whatever else it is |
| Gate: framework removable | `originDomainId` optional everywhere; domains default to `disabled` | `the framework can be removed without breaking core records` (2) | The global decision is byte-identical with a domain switched on |

### Why every domain ships switched off

A definition is not an implementation. Enabling a domain before its slice exists would
put an empty panel in front of the owner and call it a feature — and it would make the
compactness and score-wall gates pass on a screen nobody had really built.

So Prompt 8A ships the framework silent. `Direction` shows exactly what it showed
before, `Now` is untouched, and the browser suite proves both. Each slice from Prompt
8B enables its own domain when it has something to say.

### Prompt ownership

Exactly one surface owns each question, checked rather than assumed:

| Owner | Asks about |
|---|---|
| `guide` | Present state and available capacity |
| `update-this-area` | One domain's own state, on demand |
| `decision-episode` | What happened after a specific action |
| `review` | Strategic conflicts, weekly and seasonal |
| `data-privacy` | Storage, backup, export, and consent |

Seven domains, five guides, and a weekly review all have a legitimate interest in "how
is your energy". Without an ownership rule each adds it, and the owner is asked four
times in a morning by four features that each believe they asked once. That is how the
legacy app became a wall of checkboxes — not by decision, but by nobody owning the
question.

---

## 3g. Active requirement records — Phase 7, Prompt 8B (Health, recovery, energy)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| Category activation | `health-recovery-energy` added to `ENABLED_CATEGORIES` | `health.test.ts` → `activates a category rather than a store` | Through the slice's own contract, as `categories.ts` requires |
| `AT-008` (task 1) | `physical-energy` and `mental-energy` scales; the split changes which action fits | `physical and mental energy stay apart` (3) | No combined figure exists on the reading. Asked from Update This Area, never the morning |
| `OWN-043` (task 2) | Sleep, recovery, sleepiness, readiness — existing captures, refiled to health | `reads sleep recorded before the category existed` | The domain reads both categories, so nothing recorded before 8B is stranded |
| Task 3 | `pain-interference` scale + `health:persistence` | `the safety boundary is structural` (5) | Interference, not intensity. Duration, not severity |
| Task 4 | `health:hydration`, `health:food-need` | candidate ordering tests | The cheapest ordinary explanations, ruled out before anything elaborate |
| `OWN-044` (task 5) | `food:*` captures refiled to health; digestive response in the drivers | `classifies everything it captures as health data` | Broad tags only — no macros, no calories |
| Task 6 | `health:movement`, `health:movement-after` | catalogue assertions | Broad kinds. No sets, reps, distance, or plan |
| Task 7 | `timeOfDayPattern` + `health-time-of-day` bar comparison | `visuals are earned or refused` | Parts of day with no readings are absent, never shown as low |
| `XDS-015` (tasks 8–9) | `generateHealthCandidate` — zero or one, by strict order | `silence is the normal case` (3) | An order, not a score: no benefit can outrank a safety concern |
| `OWN-013` `XDS-034` (task 10) | `update-area` guide kind; `planGuide(..., domainId)`; the panel's own button | `Update This Area` (3 unit, 2 browser) | Switching an area on never lengthens the morning — asserted both ways |
| `OWN-051` `AT-081` (task 11) | `healthVisuals` records the meter **refusal** with its reason | `refuses a meter, and records why` | "Health 72%" is what the eligibility rules exist to prevent |
| `OWN-042` (task 12) | `MEDITATION_PURPOSES`; captured by purpose | `meditation is a shared action, not a practice` (3) | No page, no streak, no daily target — asserted against the rendered surface |
| `OBS-001`–`OBS-003` (task 13) | Every health prompt is observable or anchored | `asks nothing clinical either` | And no 1-to-10 pain scale, the instrument this is most tempted to copy |
| `SAFE-001` | `HEALTH_ACTIONS` closed set; `FORBIDDEN_HEALTH_VOCABULARY` | `uses no clinical or programming vocabulary` | Not filtered — **absent**. There is no code path that composes a sentence about a symptom |

### The safety decision, stated plainly

This is the first domain that can hurt someone by being helpful. A health engine that
composes its own advice will eventually compose advice about a symptom, and the distance
between "try a short walk" and "that sounds like it might be…" is one plausible-looking
template.

So there is no template. Every action the domain can produce is written out in full in
`domain/health/actions.ts` and reviewed as text. If an action is not in that list the
domain cannot propose it — not because a filter catches it, but because no code path
constructs one.

**And the domain knows when to stop having an opinion.** Something significantly in the
way for weeks produces `seek-human-support`, which is not advice about a symptom: it is
the app declining to have a view and saying who might. That branch exists because the
honest answer to a persistent problem is not a self-care tip.

### Prohibited by the Blueprint, and absent rather than filtered

No diagnosis, treatment claim, medication, dose, supplement, workout programme, rep
count, calorie, or macro. `FORBIDDEN_HEALTH_VOCABULARY` is asserted against the action
set, the prompt catalogue, and the rendered panel.

---

## 3h. Active requirement records — Phase 7, Prompt 8C (Career, Azure, and learning)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `LEG-059` (task 1) | `career:next-step` — the exact next step, in the owner's words | `asks career questions only`; browser `leads with the decision question` | Stored verbatim and shown back unedited, course vocabulary and all |
| `LEG-060` (task 2) | `STUDY_BARRIERS` — ten obstacles, recorded as what happened | `barriers are recorded behaviourally` (4) | The Blueprint's psychological taxonomy survives as ids; no visible label asks the owner to accept a label about themselves |
| `LEG-061` (task 3) | `LADDER_RUNGS` + `rungFor(evidence)` | `the ladder is climbed by evidence, never by assertion` (5) | Takes counts, never a self-report. Nine study sessions cannot reach the rung one lab does |
| `LEG-062` (task 4) | `SkillClaimRecord` — the 24th family, and the first domain **content** family | `a claim carries no assertion that it is true` (3); `an unsupported claim cannot be exported as true` (3) | The family has **no truth field**. `proven`, `level`, and `confidence` are parse failures, so "exported as true" has no representation |
| `LEG-063` (task 5) | `retrieval-strength` scale; `career-retrieval` trend over eight weeks | `treats a week with no recall check as a gap` | A week you did not test is not a week you failed — `null`, never `0` |
| `LEG-064` `AT-063` (task 6) | `isWorkWin`; `'proof'` added to `CAPTURE_SURFACES` | `one Work Win, one canonical event` (3); browser `reaches Timeline, Learning, and the career panel` | One record, six projections, zero copies |
| Task 7 | `career:re-entry`, `openInterruption`, `career:return-to-it` | `offers resumption over restarting` | Resumption is cheaper than restarting, and only while it is still cheap |
| `XDS-015` (tasks 8–9) | `generateCareerCandidate` — zero or one, five branches in strict order | `the candidate is one, ordered, and never a task board` (7) | Same shape as health: an order, not a score |
| `OWN-013` (task 10) | `update-area:career-and-learning`; `captureNamespace: 'career'` | `Update This Area, for career` (4 unit, 2 browser) | Asserted both ways — career's questions appear there and the morning is unchanged |
| `OWN-051` `AT-081` (task 11) | `careerVisuals` — a meter **earned**, with `meterEligibility` given a real denominator | `visuals: the same rules, the opposite answer to health` (5) | Health refused a meter on these same rules. The difference is a property of the evidence, not of who wrote the slice |
| `OWN-053` (task 12) | A `stage-path` over the proof ladder | browser `walks the ladder to the top` | Deliberately no percentage: the rungs are not evenly spaced |
| `PROD-005` | `CAREER_ACTIONS` — four, closed; `FORBIDDEN_CAREER_VOCABULARY` | `has four actions, none of which is progress through material` | Not filtered — absent. No code path composes an action |

### Two things this domain is forbidden to become

The Blueprint rules out **course-content hosting** and **a second task board**, recorded on
the domain definition as `notBuilt`. Both are absent rather than suppressed: there is no
lesson, module, or completion model anywhere in the slice, and no per-item tick control on
the panel. `FORBIDDEN_CAREER_VOCABULARY` is asserted against the action set, the prompt
catalogue, and the rendered panel.

### The one place that vocabulary rule does not reach

**What the owner types is theirs.** Someone studying for a certification will write "finish
the identity module" as their next step, and the app shows it back unaltered — paraphrasing
it would make the record wrong. The rule governs the product's voice; the test collects the
owner's own strings out of the records before scanning, so app copy that drifts into course
vocabulary still fails while the owner's words are left alone.

### Why the Blueprint's barrier names are not on screen

The Blueprint names fear and perfectionism among the reasons a session does not start. Those
survive as taxonomy **ids**, because merging them into "something else" would lose the
pattern. Not one of them is visible wording: `OBS-002` forbids asking someone to diagnose
themselves, and "Were you afraid?" is exactly that. The visible labels say what happened —
"It looked like more than I had in me", "I kept wanting to prepare more first" — which is
observable, answerable, and produces evidence rather than a guess.

### 3h.1 Manage Areas — the control that made the slices reachable

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `OWN-008` | `ManageAreasView` on Direction, and nowhere else | production `offers exactly the two that exist` | The only route to a domain preference |
| `ARCH-001` | `application/commands/domainPreference.ts` → `writeRecord` | `switching an area on` (4) | No UI path to storage; the record is validated like every other |
| `STORE-001` | The decision is a `DomainPreferenceRecord`, not a setting | `writes a canonical record that is there after a reload` | It belongs in a backup. A settings blob would be dropped by the recovery path Phase 6 proved |
| `DATA-002` | Each change carries `supersedesRecordId` | `one preference per area` (4) | Exactly one current preference per area, however many times it changes; every earlier decision is still readable |
| Phase 7 gate | Switching off appends; nothing is deleted | `hides the panel and deletes nothing`; production `switches one off without losing anything` | Record count rises by exactly one, and the same reading returns when it is switched back on |
| `LEAN-001` | `domain/domains/availability.ts` — availability derived from the prompt catalogue | `only areas with a slice behind them can be switched on` (4) | Enforced in the command *and* the registry, so a preference restored from a later build cannot produce an empty panel |

**Availability is derived, never declared.** A domain is switchable exactly when the prompt
that owns updating it exists. A slice's first obligation is to define what its area asks,
so this is not a proxy for "implemented" — it is the same fact. The alternative, a boolean
on each definition, is a second list that must agree with the first, and its failure mode
is silent: a flag left behind after a revert offers the owner a switch onto an empty room.

**The `updateAvailable` flag was removed.** 8A could enable a domain with no questions
behind it, so the panel carried a flag saying it could be read but not updated. With this
control a panel exists only for an area the owner was allowed to switch on, which requires
the prompt — so the flag can no longer be false, and a flag that can no longer be false is
worse than no flag. The guarantee is now structural and is asserted directly.

### A claim is recorded, never adjudicated

`SkillClaimRecord` stores what the owner would say about themselves. It does not store
whether that is true, and there is no field in which it could. Support is **computed** from
the records the claim cites, which is why an unsupported claim is a normal state rather than
a problem, and why the AI export can only ever say "claimed, with *n* supporting records" or
"claimed, nothing behind it yet". A gap between the two is the most useful thing the domain
can show, and it is shown without a verdict about the person.

---

## 3i. Active requirement records — Phase 7, Prompt 8D (Fatherhood and child development)

Controlling document: **Final Lean Master Plan v3.1**, which adds contextual-capture
metadata to the Phase 7 shared rules (14–19) for Prompts 8D–8H. It does not reopen 7A–8C.

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| Task 1–2 | `MilestoneObservationRecord` — the 25th family, with `checklistSource` and `checklistVersion` | `the two ladders stay apart` (6) | The list and its revision travel with every answer. Renamed from `source` because the envelope already has one |
| Task 2 | `REPORTABLE_MILESTONE_STATUSES` — five writable, `not-assessed` derived from absence | `never stores "not assessed"` | Resolved conflict, below |
| Task 3 | `SKILL_LEVELS` — seven positions on a **support** ladder | `the ladder, and what absence means` (4) | Ordinal and reported, never computed and never a rating |
| Task 4 | `FATHERHOOD_ACTIONS` — closed set, all about the father | `a Dad action cannot move her status` (3) | No action carries a milestone id, a status, or a level |
| Task 5 | `capture:fatherhood:*` through the shared Quick Capture path | `one moment, one canonical record` (3) | Offered only while the area is on |
| Task 6 | `TINY_LESSONS` — why it matters, minimum version, observable follow-up, stopping point | `carries a lesson with a reason` | One per tracked skill |
| `XDS-015` (tasks 7–8) | `generateFatherhoodCandidate` — zero or one, four branches ending in silence | `the one candidate, and when it stays silent` (7) | Not blocked by `family` or `caregiving`: those are when it belongs |
| `OWN-013` (task 9) | `update-area:fatherhood`, `captureNamespace: 'father'` | `Update This Area, for fatherhood` (2 browser, 3 unit) | The morning is unchanged, asserted both ways |
| `OWN-051` (task 10) | The meter **refused** with `hasValidDenominator: false` | `no score for a child, anywhere` (5) | A denominator exists; the number would be a child's score |
| `OWN-053` (task 10) | A `stage-path` for one skill, and a timeline of moments | `earns a stage path for one skill` | One skill at a time, never averaged |
| Task 11 | Observable participation, support, completion, and interference prompts | `questions are observable` (4) | Nothing about cause, feeling, or efficacy |
| Task 12 | Enable and disable through Manage Areas | production `disables without losing anything` | Availability derived from the prompt catalogue — fatherhood became switchable by having its questions, with no list edited |
| v3.1 §9 | `domain/capture/contextualCapture.ts` + `fatherhood/capture.ts` | `the contextual-capture metadata` (8) | Nine declarations, validated at import |
| v3.1 §9 | `planGuide` filters Update This Area by declared `owningSurface` | `leaves action follow-ups to the action that started them` | The metadata decides placement rather than describing it |
| Task 1, 3 | `fatherhood/routing.ts` — two answers, one canonical record | `an answered question becomes a record the domain can read` (4) | A level with no skill, or a status with no milestone, is not a readable fact |

### The contextual-capture metadata, and what its validator refuses

Every fatherhood capture declares its record family, class, owning surface, timing,
triggers, privacy, excluded contexts, freshness, duplicate suppression, cooldown,
repeated-skip behaviour, Skip and Unsure behaviour, linked action, follow-up window,
expiry, and whether the answer can change the current decision.

The validator runs at module load and refuses:

- a **milestone capture on any guide** — it must be owned by Update This Area or a
  deliberate review, so the most tempting question in the domain cannot become a daily
  one;
- a **triggered question whose answer changes nothing** — interrupting is only justified
  by decision value, otherwise it is a nag with a rule attached;
- an **action follow-up** with no linked action, window, or expiry;
- a **child-classified capture that allows `work-focus`** — a question about the owner's
  daughter must not arrive on a shared screen mid-meeting;
- a capture naming a prompt that does not exist, so wording can never bypass the
  behaviour-first policy.

**No scheduler was built.** Phase 8 owns cross-domain orchestration and will read these
declarations; Prompt 8D defines and tests them.

### Why a question is asked in two parts

"How much help did she need" and "have you seen her do this" are both *about* something.
The guide's model — one question, one observation, filed under that question's attribute —
cannot express which skill or which milestone, so the first build of this slice stored
both answers where nothing could read them. The panel said "nothing recorded here yet"
straight after the owner had recorded something, and only the deployed build showed it:
every unit test wrote the per-skill attribute directly.

Each now has a "which one" step before it. `routeFatherhoodAnswers` combines the pair into
one canonical record and **consumes the selection**, because which question was asked is
not a fact about anyone. One event, one record, whichever entry path was used.

### Resolved conflict: "Not Assessed" as a status

The prompt lists six milestone statuses including *Not Assessed*. Phase 2's `OWN-024`
says an untouched control writes nothing, and absence is the only representation of "not
reported" that cannot be misread.

**Resolution: all six are visible; five are writable.** `not-assessed` is what the owner
sees when no record exists and is rejected by the schema. Storing it would create a
second representation of absence, and the two would disagree the first time a real answer
was written without the placeholder being cleared.

### The one thing this domain must never produce

A percentage. A denominator genuinely exists — eight milestones, six skills, a countable
number of yeses — so the refusal cannot rest on missing data. `fatherhoodVisuals` passes
`hasValidDenominator: false` deliberately and renders the refusal with its reason: the
number would be real, and it would be a score for a child.

`FORBIDDEN_FATHERHOOD_VOCABULARY` covers assessment language (percentile, developmental
age, on track, delayed, diagnosis) and blame language (bad parent, should have, neglect),
asserted against the actions, the prompts, the lessons, and the rendered panel on both the
test build and the production build.

### Privacy: the child's name

The repository-facing name is **Fatherhood and child development**. A private display name
is supported as ordinary `child`-classified canonical data on the owner's device, read by
`childReference()`, which falls back to "your daughter". No real name appears in source,
fixtures, tests, scenarios, documentation, commits, or build evidence — the fixture uses
the literal string `Placeholder`, and a repository scan is part of the gate.

---

## 3j. Active requirement records — Phase 7, Prompt 8D.2 (Fatherhood learning map)

A **bounded Phase 7 bridge**, not a numbered phase. Controlling document: Final Lean
Master Plan v3.2. It amends Prompt 8D without reopening it.

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| v3.2 §10 (task 1) | `domain/fatherhood/learningMap.ts` — six sections, twenty-seven skills | `the map is complete and scannable` (6); browser `shows all six sections at once` | Every section renders, including empty ones |
| Task 2 | `domain/fatherhood/ageBands.ts`; `AGE_BAND_ATTRIBUTE` | `age bands add without removing` (4); `changing the age band` (2) | **No birth date is stored anywhere** |
| Task 3 | `intelligence/domains/fatherhood/learningMap.ts` — level, last observation, freshness, lesson, highlights | `highlights only what needs attention` | Four highlights only; everything else deliberately quiet |
| Task 4 | The seven-rung ladder, unchanged from Prompt 8D | `keeps the six original skill ids` | Ids are a promise — records already reference them |
| Task 5 | `domain/fatherhood/progression.ts` | `a progression is suggested, never applied` (10); `a progression only moves when the owner approves it` (6) | Three observations, two occasions, one rung, cited, owner-approved |
| Task 6 | `father:skill-evidence:<id>` written by the map **and** the guided flow | `one canonical record, whichever surface it came from` (4) | A completed lesson is one occasion, never mastery |
| Task 7 | Milestones keep their own family and section | `keeps official milestones out of the personal map`; `keeps sensitive milestone statuses out of the ordinary guides` | Concern and possible-loss stay in deliberate review |
| Task 8 | `LearningMapView` — buttons throughout, one optional note | browser `needs no typing at all` | Structured controls before free text |
| Task 9 | `__BUILD_PLAN_VERSION__` → `3.2 Coverage and Learning Map` | production `reports plan version 3.2` | Category-label duplication left to Phase 8, as instructed |

### The progression rule, and why each clause is in it

Three qualifying observations, across two separate days, supporting the next rung, with
no newer contradictory occasion, advancing at most one rung, citing the records behind
it, and applied only when the owner presses Approve.

- **One good evening is not a change in what she can do.** Hence three.
- **Three notes from one bath-time is one occasion described three times**, which is the
  easiest way to fool yourself. Hence two separate days.
- **A ladder that can be climbed three rungs at once is a ladder nobody trusts.** Hence
  one.
- **A newer occasion below the current level makes "she has moved up" misleading**, so
  the suggestion is withheld and the disagreement is named instead — `conflicting`, never
  a downgrade.

**There is no automatic downgrade and no code path from evidence to a stored level.** A
lower observation is real evidence, is kept, and is shown. Changing a level is a
judgement about a child, and only her father makes it.

### Declining costs nothing

`Keep current level`, `Review evidence`, and `Not now` write **nothing at all**.
Declining says something about the father's judgement, not about the child, and storing
it as evidence would let a hesitation become a fact about a two-year-old.

### Why a level and an occasion are separate attributes

`father:skill:<id>` is what the owner declares is true now. `father:skill-evidence:<id>`
is what he saw once. Keeping them apart is what allows several occasions to add up to a
suggestion without the app having quietly changed anything — and it is why a Tiny Lesson
can contribute to a progression while a completed lesson never means mastery.

Both the learning map and the guided flow write the same evidence attribute, which is
what makes "one observation through different surfaces creates one canonical record" true
rather than aspirational.

### Scan page and guided flow are both preserved

`Update This Area` opens the map: everything relevant at once, updated item by item. The
one-question-at-a-time guided update is reached from it and is unchanged. Neither
replaced the other, because they answer different needs — the app deciding what is worth
asking, and the owner deciding what he wants to look at.

### Verification never touches the owner's profile

Production verification runs in an isolated browser context. Prompt 8D's verification
cleared an IndexedDB to obtain a fresh profile and destroyed the records in it; v3.2 Part
V makes that a stop condition, and `tests/e2e/production-learning-map.spec.ts` uses a
throwaway context and Playwright's clock to cross a day boundary instead.

---

## 3k. Active requirement records — Phase 7, Prompt 8E (Emotional state, social, and relationships)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `LEG-111` | `loneliness` scale; mood, stress, confidence, overwhelm unchanged | `the shared scales stay where the engine can read them` (2) | The four existing scales stay in `time-attention-capacity` — the core engine reads them for capacity |
| `LEG-112` | `emotional:interference` — the one guide-eligible question | `lets only the capacity question into a guide` | Interference is about capacity, not mood, which is why it may interrupt |
| `LEG-115` | Connection kinds, counted by day | `counts contact by day without rating any of it` | Never a target, never compared |
| `LEG-116` | `SOCIAL_PRACTICES` — attempts, including dating | `records attempts, never the other person's response` | Sending is the task; a reply is not part of it |
| `LEG-117` | Boundaries, conflict and repair, rejection re-entry | `the one candidate` (6) | Recovery measured by re-entry, never by mood |
| `SAFE-001` | `EMOTIONAL_ACTIONS` — eight, closed, one of which defers to a professional | `has eight actions, one of which is to stop having a view` | Same device as health and fatherhood |
| `OWN-051` | The meter **refused** with an explicitly invalid construct | `refuses a percentage that would have divided cleanly` | Contact days over a fortnight divides neatly, and the result would be a grade for a quiet week |
| v3.2 §11 | `SurfacePermissionRecord` — the 26th family | `sensitive topics never appear unasked` (9) | Topic and surface are enums; absence means denied |
| v3.2 §11 | `mayExport` gate inside `buildAiExport` | `keeps a private note out of the export until the export surface is granted` | Two deliberate decisions before private content leaves in readable form |
| Shared rule 20 | `buildEmotionalScan` | `the scan summary this domain hands to Phase 8` (3) | Domain-owned; quotes nothing |
| Shared rule 21–23 | `EmotionalAreaView` — seven sections, buttons throughout | browser `shows every section at once, with structured controls` | Guided flow still reachable from it |

### It is not a CRM, and the data shape is why

**There is no person record and no field that could hold one.** Every observation is
about what the owner did; the other person appears only as an unnamed participant. The
moment this app holds a list of people with notes attached it becomes a surveillance tool
pointed at the owner's family, and it invites the score-keeping about relationships that
ruins them. The Blueprint forbids a contact CRM; the *absence of a person family* is what
makes that structural rather than a promise. A test walks every structure in the domain
and asserts no key named `name`, `person`, `contact`, or `partner` exists.

### Enabling is not permitting

Two separate decisions, and the distinction is the whole of the sensitive-topic
boundary:

- **Enabling** a protected topic means the owner wants somewhere to record it. It grants
  no surface anything.
- **Permitting** names one topic and one surface. All four surfaces start denied, there is
  no "allow everywhere" control, and revoking appends rather than deletes.

`manual-only` is deliberately not on the surface list, because deliberately opening a
screen is not the app surfacing anything.

### Resolved conflict: which category the mood scales live in

The prompt lists mood, stress, confidence, and overwhelm under this domain. They stay in
`time-attention-capacity`, and the domain **reads both categories** — the precedent health
set in 8B. Moving them would have changed what the core engine reads to decide what anyone
can take on today, for no gain: they are general state, not relationship content. The new
category holds what the slice adds.

### The leak this slice found in existing code

The production test caught What Changed — on Now, the most-seen panel in the product —
printing a private note verbatim: `Recorded emotional:note — text: <the note>`. The change
detector quoted every record's value regardless of classification. It now withholds the
value for `private-pattern`, `child`, and `relationship` content while still reporting that
something was recorded, because "something changed" is true and useful and the contents are
not the app's to broadcast.

---

## 3l. Active requirement records — Phase 7, Prompt 8F (Faith and meaning)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| Prompt 8F, task 1 | `FaithAnchorRecord` — the 27th family, three kinds, no level | `registers one family holding all three kinds`; `has nowhere to record a level, a rating, or a streak` | Retiring appends; everything recorded against a retired practice survives |
| `OWN-013` | `FAITH_PROMPTS` — six, all `privacy: 'faith'`, all owned by Update This Area | `classifies everything it captures as faith data, owned by one surface` | None is guide-eligible; `eligibleGuides: []` on all six captures |
| Prompt 8F, task 3 | Occasions counted per practice via `derivedFromRecordIds` | `counts occasions per practice from the record they point at` | A count, never a rate and never a level |
| `SAFE-001` `XDS-015` | `FAITH_ACTIONS` — five, closed, every one about something he already wrote down | `has five actions, all about something he already wrote down` | No action proposes a value or a practice |
| `OWN-051` | The meter **refused** — no valid denominator exists | `refuses a percentage because there is no total to be a fraction of` | Practices kept over practices chosen would divide cleanly, and the result would be a grade for a faith |
| `OWN-052`–`OWN-054` | The bar comparison **refused although the evidence supports it** | `refuses a comparison the eligibility rules would allow` | The only refusal in the product made against sufficient evidence: the bottom bar would read as the practice he is failing at |
| v3.2 §11 | Struggle text read by nothing — no candidate, no condition, no driver, no bottleneck | `produces no candidate, and appears in no reading` (4) | The domain can read the record and chooses to have no view |
| Shared rule 20 | `buildFaithScan` — quotes nothing, names the open item without its content | `the scan quotes none of his words` | `openItem` is `'Something you decided to put right'` |
| Shared rule 21–23 | `FaithAreaView` — six sections, buttons after naming | browser `offers an empty box and no suggestions` | Free text only where the words must be his |

### Authority separation, made structural

The application ships **the container and never the contents**. There is no catalogue of
values, no list of practices, no suggested starting point, and no example placeholder in
the text fields — because any of those would be this product taking a position on how a
person should live. A test asserts that no faith action or prompt contains `pray`,
`prayer`, `meditat`, `scripture`, `church`, `worship`, `fast`, or `tithe`, and
`FORBIDDEN_FAITH_VOCABULARY` bars three groups of language outright: authority
(`god wants`, `scripture says`, `sinful`, `righteous`, `salvation`, `doctrine`), grading
(`spiritual maturity`, `faith score`, `lukewarm`, `backslid`), and pressure
(`you should pray`, `streak`, `days in a row`).

The category can never summarise as `declining`. A quiet month is a quiet month, and this
is not the area where an app gets to call that a decline.

### Doubt is recorded and left alone

Writing down that this is hard produces **nothing**: no candidate, no encouragement, no
concern, no referral, and no change to any reading. It is behind a control that says
nothing reads it, it is excluded from all six protected contexts, and it does not appear in
Quick Capture until the owner switches it on. Recording it is the entire feature. This is
the sharpest expression of authority separation in the product — the domain can read the
record and declines to have a view.

### Why a repair is not quoted on Now

The repair candidate's statement is `Do the thing you decided to put right`, and his words
stay on the page he opened. A repair is by nature the description of something that went
wrong with another person, which is not a sentence that belongs on the front page of an app
while someone is looking over the owner's shoulder.

### The leak this slice found in existing code, again

Prompt 8F's production test caught What Changed printing free text verbatim on Now a
second time — `Recorded faith:repair needed — kind:note, text: <the repair>` — because the
8E fix was a **list of sensitive classes** and `faith` had not been added to it. A list
that must be edited every time the product grows is a reminder, not a safeguard.

The rule is now general and does not depend on anyone remembering: **no `note` value is
ever quoted on Now, in any domain.** A note is the one value kind whose contents are
unbounded; a scale or a state is something the application itself offered and can safely
echo back. The class list survives alongside it, with `faith` added.

## 3m. Active requirement records — Phase 7, Prompt 8G (Home and environment)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `LEG-121` | `FRICTION_KINDS` — eight, all functional, none aesthetic | `has no word for how a room looks, anywhere in the domain` | The boundary made into vocabulary rather than into a rule |
| `LEG-123` | `home:access`, `home:setup-time`, `home:conditions` | `asks nothing about cause, feeling, or how anything looks` | Access, setup cost, and noise/light/privacy, all observable |
| `LEG-124` | `home:transition` — switching one space between uses | browser `shows every section, all of them buttons` | Measured by what had to move, never by how long it looked wrong |
| `SAFE-001` `XDS-015` | `ENVIRONMENT_ACTIONS` — four, none of which says what to change | `proposes no change of its own, in any action` | Three ask for his change; the fourth names a time, not a thing |
| `XDS-015` | `generateHomeCandidate` — zero or one, four branches ending in silence | `says nothing at all about a friction recorded once` (3) | A single occurrence is deliberately not a branch |
| `OWN-013` | `update-area:home-and-environment`, `captureNamespace: 'home'` | `classifies everything it captures as general data, owned by one surface` | Availability derived from the catalogue; the area became switchable by having its questions |
| `OWN-051` | The meter **refused** with `hasValidDenominator: false` | `refuses a readiness percentage that would divide perfectly well` | Friction removed over friction recorded divides; the result is a Life Score for a house |
| `OWN-052`–`OWN-054` | A bar comparison **earned**, and a line graph earned with two observed weeks | `draws the comparison faith refused, because the bars are rooms and not people` | The deliberate inverse of §3l's refusal |
| `OWN-024` `OBS-006` | A week with no home records is a gap, never a zero | `keeps a week with nothing recorded as a gap rather than a zero` | A quiet fortnight because he stopped recording is not an improvement |
| v3.2 §9 | `domain/home/capture.ts` — nine declarations, validated at import | `is never triggered by time passing` (3) | One triggered question, and it earns the interruption by changing eligibility |
| Shared rule 20 | `buildHomeScan` — quotes the change he named | `quotes the change, because a charger on a desk is not a confession` | The deliberate contrast with `buildFaithScan` |
| Shared rule 21–23 | `HomeAreaView` — six sections, one free-text field | browser `takes one change, and offers no way to add a second` | The field disappears while a change is open |

The three `LEG-*` ids above are the ones `DOMAIN_DEFINITIONS['home-and-environment']`
already declares. **Which row each belongs to is a plausible reading, not a verified one** —
the Final Legacy Decisions map is not in the repository. The same is true of `LEG-084`,
`LEG-086`, `LEG-087`, and `LEG-089` for §3l, which were in the domain definition all along
and should be cited there once the mapping is confirmed. See §5.

### Repetition is the entry condition, and it is the boundary

The Blueprint forbids a cleaning app, a chore manager, a calendar, and a task platform.
Those are four products sharing one failure: they generate work nobody agreed to, on a
schedule, and then measure someone against it. Three things make the refusal structural
rather than editorial:

- **A single friction produces nothing.** No suggestion, no nudge, no "you might want to
  look at this". One bad morning is an event; the same thing twice is a property of the
  setup, and only the second is acted on.
- **One open change, ever.** Enforced in the candidate generator *and* in
  `nameEnvironmentChange`, because a rule living only in the generator is one the interface
  can walk around. While a change is open the text field is not rendered.
- **Nothing is raised because time passed.** No capture trigger names an interval, and a
  test walks every trigger string to prove it. Every offer traces to something the owner
  recorded.

The vocabulary carries the rest: eight friction kinds, all describing what happened to an
*activity*, and no word anywhere for tidy, messy, cluttered, or clean. "Nowhere to put
things" is a fact about trying to work at a desk; "the desk is a mess" is a judgement about
a desk, and the second has no representation in this product.

### The comparison faith refused, earned here

Prompt 8F declined a bar chart its own eligibility rules allowed, because ranking a
person's practices puts one at the bottom and the bottom reads as failure. This slice draws
exactly that chart. The difference is what the bars are **of**: friction kinds are
properties of a house, and nobody reads "nowhere to put things: 4" as a verdict on
themselves. Same rules, opposite answer, and the reason is the subject rather than the
arithmetic.

For the same reason this category **may** read `declining`, which faith may not. More
friction this fortnight than last is a fact about a setup.

### Where discretion is applied, and where it is not

`buildHomeScan` quotes the change the owner named; `buildFaithScan` quotes nothing. The
candidate reason quotes the change on Now; the faith slice's repair reason does not. Both
differences are deliberate — a charger on a desk is not a confession, and blanket
redaction would make the weekly scan useless without making anything safer.

The one place the blunt rule wins anyway is What Changed: the general no-`note`-on-Now rule
introduced in §3l still withholds a home note, even though a jammed drawer is harmless. A
rule that has to be reasoned about per domain is a rule that gets forgotten, which is
exactly how that leak reached production twice.

### Why no new record family

`LEAN-001` allows one domain content family per slice **where irreducible**. It was not.
A friction is one observable fact with one value; the activity it interrupted rides in the
attribute, and the link from a change to what it addresses is what
`provenance.derivedFromRecordIds` is for. `EnvironmentSetupRecord` was designed and
discarded — it would have carried a `state` vocabulary that differed per kind, which is a
discriminated union standing in for two concepts that the existing envelope already
separates.

---

## 3n. Active requirement records — Phase 7, Prompt 8H (Money)

| ID | Implementation | Test IDs | Notes |
|---|---|---|---|
| `LEG-067` | `financial-pressure` — the eighth scale, owned by the domain rather than a guide | `names its own scale rather than letting a guide own it` | Deliberately not read by the shared state assessment |
| `LEG-068` | `RESILIENCE_BANDS` — five bands, no figure | `puts cover on a ladder, with no percentage and no destination implied` | Real resilience information with zero account data |
| `LEG-069` | `LAST_LOOKED`, and `NOT_LOOKED_RECENTLY` as his words only | `never uses the word avoidance about a person` | The app never concludes it from silence |
| `LEG-070` | `nameMoneyPurpose` — a `GoalRecord` in the money category | `suggests exactly the same thing with amounts on and off` | Reused, not reinvented |
| `SAFE-001` `XDS-015` | `MONEY_ACTIONS` — four, none of them financial advice | `offers four actions, none of which is financial advice` | No action to save, invest, consolidate, switch, or cancel anything |
| `OWN-013` | `update-area:money`, `captureNamespace: 'money'` | `classifies everything it captures as money data, owned by one surface` | The gentlest question opens the area |
| `OWN-051` `AT-081` | The meter **earned**, with `hasValidDenominator: true` | `draws a real meter once the figures exist` | The only percentage in the product |
| `OWN-051` | The same meter **refused** when no figures exist | `refuses the same meter when there are no figures, and says why` | One domain, both answers, decided by the owner |
| `OWN-052`–`OWN-054` | A stage path for cover, a pressure trend, a before-and-after comparison | `compares two moments around a decision without claiming it caused anything` | The tradeoff chart is refused; the tension is a sentence |
| v3.2 §11 | `money-figures` — the second protected topic, gating both figure captures | `gates both figure captures behind the protected topic` (3) | The plan's "unless separately activated", made structural |
| v3.2 §11 | `buildMoneyScan` checks `maySurface(..., 'weekly-scan')` for amounts | `keeps amounts off the weekly scan until that surface is separately granted` | Enabling is not permitting, applied to the one thing carrying a number |
| Shared rule 20 | `buildMoneyScan` — names the decision, never quotes it | `names the decision as a category of thing, never as its content` | Same discretion as faith, for the same reason |
| Shared rule 21–24 | `MoneyAreaView` — six sections, amounts behind a switch | browser `shows every section, with amounts switched off and explained` | Structured controls throughout; three text fields, all optional |

The four `LEG-*` ids are the ones `DOMAIN_DEFINITIONS.money` already declares. As in §3l and
§3m, **which row each belongs to is a plausible reading rather than a verified one** — see
§5.

### The whole domain works without a single figure

The plan defers "detailed account, transaction, bill, debt, credit, and portfolio machinery
unless separately activated". That is not a flag over a budgeting app; it is the shape of
the domain. Pressure is a five-point scale, cover is five bands, avoidance is when he last
looked, freedom is a sentence, and a decision is his words plus what became of it. Every one
is useful to somebody who will never tell this application a balance.

Resilience is the clearest case: "if money stopped coming in, how long could you cover
things?" answered as _a few weeks_ carries the fact that matters and no account data at all.
A budgeting app needs six months of transactions to compute a worse version of the same
answer.

**No branch of the candidate generator reads a figure**, and a test proves the suggestion is
identical with amounts on and off. That is what stops the optional machinery quietly
becoming required.

### Six domains refused a meter; this one earns it, and only on request

Health had no denominator. Fatherhood had one and the number would have been a child's
score. Emotional's would have graded a quiet fortnight. Faith's would have graded a person's
faith. Home's would have been a readiness score for a house. Every refusal was a fact about
the construct rather than about the evidence.

A debt paid down is different: 4,200 of 7,500 is a fraction of a real total, with a real
baseline and a real target. `meterEligibility` says yes, and the module's own documentation
has used exactly this example since Prompt 8A.

It is still refused by default, because the figures do not exist until `money-figures` is
switched on. **The same domain both earns and refuses the meter, and which one he sees
depends on a decision he made about how much to tell it.**

### The tradeoff is a sentence, because the two readings do not share an axis

Pressure and cover move independently and are the useful pair — heavy pressure with months
of cover is a bad week; no pressure with under a week of cover is fragility nobody has
noticed. Drawing them as two bars would put an ordinal about a state of mind beside an
ordinal about a length of time and imply the heights mean the same thing. The comparison is
refused with `discrete: false` and its reason recorded, and the tension is stated in words.

The comparison that **is** drawn is before-and-after: the pressure reading at the time of a
decision beside the reading now. Same scale, same anchors, two moments — labelled as what
changed since, never as what the decision caused.

### Thin cover produces no suggestion, deliberately

Somebody with under a week of cover is told nothing by the generator. There is no action
that would help: "build up savings" is not a move anybody can make this afternoon, and
offering it to a person who is short of money is the cruellest kind of useless. The reading
stays on the panel because it is true and he should be able to see it. Withholding advice is
not hiding facts, and the `because` says so.

### Two defects this slice found in existing code

**An exact accessible-name collision.** Direction renders a category summary beside a domain
panel. For every other area the two names merely resemble each other ("Faith & meaning"
against "Faith and meaning"); for money both were "Money", putting two regions with the same
accessible name on one screen — indistinguishable to anyone navigating by landmark. The
category label is now "Money & pressure". The general duplication remains Phase 8's.

**An empty list with a heading over it.** Manage Areas rendered "Not built yet" above
nothing once the last domain shipped, which reads as a loading failure rather than as
completeness. The block is now omitted when the list is empty.

### Two mechanisms generalised, not duplicated

- **Scale classification.** `STATE_PROMPTS` consulted a `HEALTH_SCALES` set and a ternary,
  which could answer only "is this health data". A money reading is neither general capacity
  nor health, and a set needing a branch per classification is a lookup table pretending to
  be a rule. Category, privacy, and prompt namespace now travel with the scale definition.
- **The protected-topic switch.** The attribute was `emotional:topic-enabled`, written when
  the emotional slice owned the only protected topic. It is now `privacy:topic-enabled`, and
  the old attribute is still read so no existing decision is lost.

---

---

## 4. Traceability fields used when a requirement becomes active

Per master plan §68, each active requirement record includes: ID · statement · source
section · owning phase · implementation artifact · test IDs · UI surface where applicable ·
privacy and safety classification · evidence artifact · status · deferred or open decisions.

## 5. Open requirement gaps

Proposals identified during Phase 0. **Not approved and not in force.** Each requires
explicit owner approval before its owning phase begins.

**Open, Prompts 8F, 8G, and 8H.** The Final Legacy Decisions map is not in the repository, so
the row-level `LEG-*` mapping in §3l, §3m, and §3n is unverified. No ID has been minted: every
one cited is either an approved cross-cutting ID (`OWN-013`, `OWN-051`,
`OWN-052`–`OWN-054`, `SAFE-001`, `XDS-015`) or one the domain definition already declares
(`LEG-084`, `LEG-086`, `LEG-087`, `LEG-089` for faith; `LEG-121`, `LEG-123`, `LEG-124` for
home; `LEG-067`-`LEG-070` for money). What needs confirming is which requirement each row satisfies. Substituting the
correct mapping touches documentation only, and no code.

**No other open requirement gaps.** `STORE-004` was owner-approved on 2026-08-03 and moved into
Section 2; its traceability record is in Section 3a.

New requirement IDs are **not** minted silently. Anything implemented under a proposed ID
must first be approved by the owner and moved into Section 2.
