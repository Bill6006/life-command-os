# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 2 — Core canonical model and working storage
- Current prompt: PROMPT 3 (complete)

## Gate status
- Status: **GREEN**
- Gate evidence:
  - *Every active core record validates independently* — all twenty families parse from a well-formed fixture; `RECORD_SCHEMAS` is typed as `Record<RecordType, …>` so an unregistered family fails to compile rather than silently bypassing validation.
  - *Invalid cross-concept substitutions fail* — 13 tests covering the four substitution invariants. An inferred state relabelled as an observation, an observation carrying confidence, an observation claiming inferred provenance, a forecast relabelled as an outcome, a recommendation relabelled as an execution, and an outcome claiming a cause are all rejected.
  - *Corrections preserve history* — the superseded record remains readable after correction and after a real browser reload; the storage layer uses Dexie `add`, never `put`, so an existing record **cannot** be overwritten at all.
  - *Missing and unresolved values are not converted to zero, false, or failure* — `EvidenceValue` has five explicit statuses; `knownValue` returns `undefined` for every non-known status and there is deliberately no `valueOrZero`-style helper. A category with no evidence reports `unknown` with a reason, asserted to contain no `1970` and no `observationCount`.
  - *Canonical data survives reload and synthetic restore* — proven in a real browser: records survive a full page reload, and export → clear → restore → reload preserves all records including superseded history.
  - *Projections can be deleted and rebuilt* — dropping every projection and reading again produces byte-identical output, in both Node and a real browser.
  - *IndexedDB is the only canonical authority* — one `records` store; `localStorage` is unreachable from `src/` by lint rule; UI→storage imports are blocked and the rule is verified to fire.
  - *No unused domain schema library exists* — only the three alpha categories are accepted; a fourth category and a domain-specific field on a context snapshot are both rejected. `LearnedBeliefRecord` is absent, asserted by test.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: the current head of `main`. The About surface always reports the exact commit it was built from, so the live build is self-identifying and this field cannot go stale.
- Last phone-and-desktop verification: 2026-08-03, at 375×812 and desktop, against the Phase 2 gate commit.
- Hosted build contains synthetic content only: **YES** — the hosted build contains no data. Fixtures live in `tests/` and are not part of the bundle.

> This preview authorises inspecting synthetic UI progress. It does **not** authorise
> meaningful private use, which requires the Phase 6 gate.

## Work completed
- Implemented **twenty core record families** with runtime-validated schemas and inferred TypeScript types. `LearnedBeliefRecord` is deliberately absent until Phase 5.
- Built the canonical envelope: stable ID, record type, schema version, `occurredAt`/`recordedAt` split, local time context, source type, provenance, supersession link, decision-episode link — and **confidence only where semantically valid**.
- Made supersession **backwards-pointing only**: a correction names what it replaces and never mutates the record it supersedes.
- Defined evidence semantics — known, unknown, not-applicable, conflicting, unresolved — plus computed (never stored) freshness relative to the decision at hand.
- Enforced six of the seven invariants inside the schemas and the seventh (circular references) across record sets in `domain/policies/invariants.ts`.
- Implemented IndexedDB schema v2 with a forward-only migration registry, the canonical record store, and the projection store.
- Implemented the validated write path (`application/commands/writeRecord.ts`), the read path with supersession resolution, and two rebuildable projections.
- Implemented the unencrypted synthetic development export/restore, with **complete validation before any mutation**.
- Created deterministic neutral fixture builders for all twenty families.
- Added browser-backed persistence tests and mapped implemented requirements to tests.

### Notable design decisions
- **A competing-recommendation menu is unrepresentable.** `RecommendationRecord.output` is a three-branch discriminated union — one action, one question, or deliberate silence. `PROD-005` and `INTEL-006` cannot be violated by accident because a ranked list has no valid shape.
- **`strong-personal-evidence` requires prospective validation** at the schema level, so a pattern found by looking backwards through history cannot reach the top confidence label (`LEARN-003`).
- **Non-execution cannot be judged.** If the recorded execution state is `not-executed` or `unknown-execution`, a recommendation-effect evaluation must be `unresolved` (`LEARN-002`). The execution state is duplicated onto the evaluation record deliberately — an invariant that must load another record to check itself is not an invariant.
- **A confounded episode cannot be called `supported`**, which is precisely how a coincidence would otherwise be promoted into a causal belief.
- **A question that could change nothing cannot be recorded**, so an onboarding questionnaire has no representable form (`UX-007`).

## Files created or modified
Created — domain (11): `records/{envelope,semantics,categories,evidence,state,direction,decision,execution,evaluation,questions,index}.ts`, `policies/invariants.ts`

Created — application (4): `commands/writeRecord.ts`, `commands/backupCommands.ts`, `queries/readRecords.ts`, `projections/index.ts`

Created — infrastructure (4): `database/migrations.ts`, `database/recordRepository.ts`, `database/projectionStore.ts`, `backup/developmentBackup.ts`

Created — app (1): `app/diagnostics.ts`

Created — tests (8): `fixtures/records.ts`, `support/database.ts`, `unit/{records,semantics,invariants,storage,backup,migrations}.test.ts`, `e2e/persistence.spec.ts`

Modified: `database/connection.ts` (schema v2), `main.tsx`, `AppShell.tsx` (honest Phase 2 copy), `vite.config.ts` (phase marker), `package.json`, `docs/REQUIREMENTS.md`, `docs/architecture/ARCHITECTURE_OVERVIEW.md`, `docs/architecture/DEPENDENCIES.md`, `tests/unit/database.test.ts`, `tests/e2e/shell.spec.ts`, `PROJECT_STATUS.md`

## Tests and evidence
- **Unit tests: 84 passed** across 8 files (was 9 at Phase 1).
  - `records.test.ts` (31) — every family validates; all four substitution invariants; confidence rules; time-window rules; one-best-recommendation; scope discipline.
  - `semantics.test.ts` (14) — five evidence statuses; **absence is never coerced**; freshness is relative to the decision, not the record.
  - `invariants.test.ts` (10) — duplicate ids, self-supersession, supersession cycles, derivation cycles, dangling links, and a 5,000-record chain that terminates instead of exhausting the stack.
  - `storage.test.ts` (10) — validate-then-write, overwrite refusal, corrections, projection rebuild and auto-drop.
  - `backup.test.ts` (8) — round trip; six damaged-backup cases each asserting canonical state is **completely untouched** afterwards.
  - `migrations.test.ts` (4) — forward-only and ascending; a real v1 database upgrades in place to v2 with its data preserved.
  - `database.test.ts` (6), `buildInfo.test.ts` (3) — carried forward from Phase 1.
- **Browser tests: 34 passed** across desktop and mobile viewports (was 18), including 8 new persistence tests × 2 viewports covering schema version, validation-before-write, survival across reload, correction across reload, overwrite refusal, export/restore round trip through two reloads, damaged-backup rejection, and projection rebuild.
- **Boundary enforcement** re-verified: a UI file importing `dexie` or the database module produces two lint errors with the ADR-0004 messages.
- **Personal-information scan:** clean.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate. The Phase 2 backup format declares `encrypted: false` in the file itself, so it cannot be mistaken for a Phase 6 backup.

## Architecture decisions
No new ADRs. Phase 2 implements ADR-0004 (IndexedDB authority) and ADR-0005 (append-oriented records and rebuildable projections).

Two documented resolutions applied as directories gained content:

- **`domain/schemas/` is not created.** With a TypeScript-first validator the schema and the type are one artifact; splitting them would duplicate declarations or separate things that must change together. Recorded in `ARCHITECTURE_OVERVIEW.md` §2.1a.
- **`src/intelligence/` still does not exist.** Phase 4 creates it.

## New dependencies
**One:** `zod` ^4.4.3 (runtime validation). Full record in `docs/architecture/DEPENDENCIES.md`.

Beyond validating untrusted data crossing the storage boundary, the schemas are where six of the seven invariants are *enforced* — so this dependency carries constitutional guarantees, not just type checking.

## New abstractions or infrastructure

**1. Canonical record schemas and registry** — `src/domain/records/`
- Active requirement: `DATA-001`, `DATA-002`, Phase 2 tasks 1–5, 11.
- Why smaller was insufficient: plain TypeScript types vanish at runtime, and data arrives from IndexedDB and backup files written under older versions. Six of seven invariants are enforced here; without schemas they would be review conventions.

**2. Cross-record invariant checker** — `src/domain/policies/invariants.ts`
- Active requirement: Phase 2 task 11, invariant 7.
- Why smaller was insufficient: a cycle is a property of a record *set*, invisible to any single record's schema.

**3. Canonical record repository** — `src/infrastructure/database/recordRepository.ts`
- Active requirement: `STORE-001`, Phase 2 task 6.
- Why smaller was insufficient: append-only immutability is enforced here by using Dexie `add` rather than `put`. Direct table access would leave overwriting possible.

**4. Migration registry** — `src/infrastructure/database/migrations.ts`
- Active requirement: Phase 2 task 10.
- Why smaller was insufficient: migrations scattered across the connection class cannot be inspected or tested without opening a database.

**5. Projection store and definitions** — `projectionStore.ts`, `application/projections/`
- Active requirement: `STORE-002`, Phase 2 task 8.
- Why smaller was insufficient: the gate requires proving delete-and-rebuild, which needs projections to be materialised and named.

**6. Development backup module** — `src/infrastructure/backup/developmentBackup.ts`
- Active requirement: Phase 2 task 9, proposed `STORE-004`.
- Why smaller was insufficient: validation must complete entirely before mutation, which requires the format to be parseable independently of the database.

**7. Diagnostics bridge — TEMPORARY** — `src/app/diagnostics.ts`
- Active requirement: Phase 2 gate ("canonical data survives reload and synthetic restore"), which demands browser evidence.
- Why smaller was insufficient: Phase 2 has no user interface, so there is no other way to drive the application layer inside a page. Manipulating IndexedDB directly from the test would prove the browser works, not that this codebase does. A narrower hook could not demonstrate the restore round trip or supersession resolution, both explicit gate criteria.
- **Removal trigger: Phase 3.** When the Data & Privacy surface exists, browser tests drive the real interface and this module is deleted.

## Known limitations
- **The diagnostics bridge ships to the public preview.** It adds no capability a script on that origin does not already have — there is no server, no account, and no secret — but it is API surface with no product requirement, and it is scheduled for deletion in Phase 3.
- **Bundle size grew substantially**: ~62 kB → ~116 kB gzipped, from zod and the canonical model. Well within tolerance for a cached local start, but this is the first real pressure on the 3-second startup budget, and the budget is still untestable until the representative device is named in Phase 3.
- **Deletion semantics remain unimplemented and undecided.** Append-oriented storage preserves corrected values, so correction is not redaction. Nothing in Phase 2 deletes a canonical record except `replaceAllRecords` during restore.
- **`freshness` is computed, not stored**, so callers must supply a max useful age. There is no default, deliberately — staleness is a property of the decision, not the record.
- **A returning visitor sees the previous build once after a deploy.** Observed during Phase 2 verification: the first load served the cached Phase 1 shell, and the Phase 2 build appeared only after the service worker update took control. This is ordinary `autoUpdate` service-worker behaviour, not a defect — but it directly affects the `OPS-002` "deployed commit matches" check at every later gate, so verification must either reload twice or clear the service worker. There is deliberately no update-available affordance yet: the interface that would host one is designed in Phase 3, and Phase 6 owns update handling. Service-worker update **and rollback** are already Phase 10 release requirements.
- Carried forward from Phase 1: `frame-ancestors` unenforceable on Pages; Chromium-only browser matrix; no router; representative test device unnamed; `glob@11.1.0` transitive deprecation.

## Deferred work
| Deferred system | Activates |
|---|---|
| Command surface, semantic design tokens, router, component-test library | Phase 3 |
| `src/intelligence/`, research cards, evidence-source registry | Phase 4 |
| `LearnedBeliefRecord` and learning governor | Phase 5 |
| Encrypted backup, app lock, `src/infrastructure/crypto/`, notifications | Phase 6 |
| Domain-specific schemas | Phase 7, one domain per run |
| Model-candidate registry, retired-rule ledger | Phase 8 |
| Legacy importer, `src/importers/legacy/` | Phase 9A, only if authorised |
| Full traceability generator, full browser matrix, release artifacts | Phase 10 |
| Sync, native packaging, analytics, external AI, Web Workers | Not planned |

## Blockers
**None blocking Prompt 4.**

Open decisions:

1. **Deletion semantics distinct from correction** (ADR-0005). Not needed by Phase 2 and therefore not invented — no deletion operation was added. It must be decided before any surface offers the user a delete control, which is Phase 3 at the earliest (Data & Privacy).
2. **Approval of proposed `STORE-004`.** The development export/restore behaviour is implemented because Prompt 3 task 9 mandates it and the gate depends on it; the requirement ID remains unapproved and is traced in `docs/REQUIREMENTS.md` §5 rather than §2.
3. **Name the representative test device** in the Phase 3 design ADR, so `UX-005` budgets become testable.

## Next permitted prompt
**PROMPT 4 — Phase 3: Command-surface selection and UX foundation.**

Note that Prompt 4 stops mid-phase for an explicit owner design selection: three primary
command-surface variants are published to the Pages URL, and work pauses until one is chosen.
