# Dependency Record

**Status:** Controlling
**Rule:** Product Constitution §18.2 (dependency discipline), `LEAN-005`

Every dependency records the active requirement it supports, why platform capabilities or
existing dependencies are insufficient, its maintenance and privacy impact, and how it would
be removed. **A dependency added for hypothetical future use is a stop condition.**

Versions are the ranges declared in `package.json`; exact resolutions are pinned in
`package-lock.json`.

---

## Runtime dependencies

### `react`, `react-dom` — ^19.2.8

| Field | Value |
|---|---|
| **Active requirement** | `ARCH-001`, Phase 1 task 4 (accessible responsive shell) |
| **Why not native** | The approved architecture (ADR-0002) selects React. Hand-rolled DOM updates would not survive the state complexity arriving in Phases 3–5. |
| **Maintenance impact** | Very large ecosystem, predictable release cadence. The single largest bundle contributor (~62 kB gzipped total build). |
| **Privacy impact** | None. No network access, no telemetry. |
| **Removal** | Confined to `src/ui/` and `src/main.tsx`. The domain, application, and intelligence layers are framework-agnostic TypeScript by design, so replacing React would not touch them. |

### `dexie` — ^4.4.4

| Field | Value |
|---|---|
| **Active requirement** | `STORE-001`, ADR-0004, Phase 1 task 5 (IndexedDB connection and transaction infrastructure) |
| **Why not native** | Raw IndexedDB's callback API reliably produces inconsistent transaction handling — precisely the failure mode that would break "never report saved before commit". Dexie provides typed tables, promise-based transactions, and a versioned migration mechanism that Phase 2 requires immediately. |
| **Maintenance impact** | Mature, focused, actively maintained. |
| **Privacy impact** | None. Local storage only; no network. |
| **Removal** | Confined to `src/infrastructure/database/`, enforced by ESLint. Replacing it means reimplementing that one module against the same exported contract. |

---

## Development dependencies

### Build and language

| Package | Active requirement | Why | Removal |
|---|---|---|---|
| `vite` ^8.2.0 | ADR-0002; Phase 1 tasks 1, 3, 9 | Approved build tool. Provides the base-path handling that the Pages deployment depends on. | Config-level; replacing it means rewriting `vite.config.ts` and the build scripts. |
| `@vitejs/plugin-react` ^6.0.5 | Supports `react` | React fast refresh and JSX transform for Vite. | Removed with React. |
| `typescript` ^6.0.3 | ADR-0002; Phase 1 task 3 (strict TypeScript) | Strict typing is a boundary-protection tool, not a style preference. **Pinned below 7.x deliberately:** `typescript-eslint@8` declares `typescript >=4.8.4 <6.1.0`, so TypeScript 7 would silently disable type-aware linting. Revisit when typescript-eslint supports 7.x. | Not realistically removable; it is the implementation language. |
| `@types/node` ^22.20.1 | Types for `vite.config.ts` build-metadata injection | `vite.config.ts` reads `process.env.GITHUB_SHA` and shells out to `git`. Matches the Node 22 runtime used locally and in CI. | Removed if build metadata moves out of the Vite config. |
| `vite-plugin-pwa` ^1.3.0 | Phase 1 task 4 and the offline/installability gate | A precache manifest must reference the build's content-hashed filenames. Hand-maintaining that list is not a smaller implementation — it is a guaranteed staleness bug. Also generates the web app manifest and handles service-worker update flow, which Phase 10 must test for update and rollback. | Config-level. Removing it means writing and maintaining a service worker plus manifest by hand. |

### Quality gates

| Package | Active requirement | Why | Removal |
|---|---|---|---|
| `eslint` ^10.8.0, `@eslint/js` ^10.0.1, `typescript-eslint` ^8.65.0 | `ARCH-001`, `LEAN-001`, Phase 1 tasks 3 and 11 | Carries the **module-boundary enforcement** that keeps the UI out of storage (ADR-0004) and legacy types out of runtime logic (`MIG-001`). Type-aware rules require `typescript-eslint`. | Delete `eslint.config.js`; boundaries would then rest on review alone, which is weaker. |
| `eslint-plugin-react-hooks` ^7.1.1 | Supports the shell's `useEffect` subscription | Hook dependency and ordering violations are a real bug class that type checking does not catch. | Removed with React. |
| `globals` ^17.9.0 | Supports the ESLint flat config | Supplies browser and Node global sets so `no-undef` is accurate per file group. | Removed with ESLint. |
| `prettier` ^3.9.6 | Phase 1 task 3 (formatting) | Removes formatting from review entirely. Checked in CI so it cannot drift. | Delete config and the `format` scripts. |

### Testing

| Package | Active requirement | Why | Removal |
|---|---|---|---|
| `vitest` ^4.1.10 | `TEST-001`, Phase 1 task 3 (unit-test configuration) | Approved test runner (ADR-0002). Shares Vite's transform pipeline, so tests and build cannot disagree about module resolution. | Delete the `test` block in `vite.config.ts` and the unit tests. |
| `fake-indexeddb` ^6.2.5 | `STORE-001` unit tests | Node has no IndexedDB. Real browser persistence is proved separately by Playwright, because an in-memory shim cannot prove data survives a reload — this only makes the connection module unit-testable. | Removed if storage unit tests move entirely to the browser. |
| `@playwright/test` ^1.62.1 | Phase 1 gate: offline startup, installability, base-path correctness | The offline, service-worker, manifest, and base-path behaviour in the gate **only exists in a real browser**. No amount of unit testing produces this evidence. | Delete `playwright.config.ts` and `tests/e2e/`; the gate would then be unverifiable. |

---

## Deliberately not added

Recorded so the reasoning is not re-litigated, and so the absence reads as a decision
rather than an oversight.

| Not added | Would have supported | Why deferred |
|---|---|---|
| A router (`react-router` or similar) | Navigation between destinations | Phase 1 has two views and a state switch is sufficient. The six real destinations arrive in Phase 3; the SPA fallback and base-path routing questions belong with them (`LEAN-005`). |
| `@testing-library/react` + a DOM environment (`happy-dom`, `jsdom`) | Component tests | Playwright already covers every DOM behaviour in the Phase 1 gate, in a real browser. A second, weaker way to test the same thing is not evidence. Added in Phase 3 with real components and states. |
| `zod` or another runtime validator | Schema validation | Approved by ADR-0002, but **Phase 2 owns it** — there are no canonical records to validate yet. |
| `@vitest/coverage-v8` | Coverage reporting | `TEST-001` states coverage percentage is a signal, not the goal. No gate requires a number. |
| A secret-scanning tool (`gitleaks`, `trufflehog`) | Phase 1 task 8 | GitHub's native secret scanning with push protection is enabled by default on public repositories, which satisfies "standard secret scanning where supported". A second scanner adds CI time without adding protection. |
| A hosting or deployment abstraction | Pages deployment | Explicitly prohibited by `OPS-002` and master plan §20.1. One workflow, one URL. |
| Web Workers tooling | Off-main-thread intelligence | Prohibited until profiling shows a current intelligence operation blocks the interface (ADR-0002). |

---

## Transitive-dependency notes

- `vite-plugin-pwa` pulls in `workbox-build`, which currently warns about a deprecated
  `glob@11.1.0`. It is build-time only, never shipped to the browser, and cannot see life
  data. Tracked as a known limitation; revisit when Workbox updates.
- Total installed tree at Phase 1: 460 packages, of which only `react`, `react-dom`, and
  `dexie` reach the browser.
