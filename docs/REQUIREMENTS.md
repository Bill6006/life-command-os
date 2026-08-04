# Core Requirements Registry

**Status:** Controlling
**Plan version:** 3.0 Final
**Current phase:** Phase 7 — Prompts 8A and 8B complete; slices 8C–8H outstanding

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

### A claim is recorded, never adjudicated

`SkillClaimRecord` stores what the owner would say about themselves. It does not store
whether that is true, and there is no field in which it could. Support is **computed** from
the records the claim cites, which is why an unsupported claim is a normal state rather than
a problem, and why the AI export can only ever say "claimed, with *n* supporting records" or
"claimed, nothing behind it yet". A gap between the two is the most useful thing the domain
can show, and it is shown without a verdict about the person.

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
