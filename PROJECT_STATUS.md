# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 1 — Repository and local-first application foundation
- Current prompt: PROMPT 2 (complete)

## Gate status
- Status: **GREEN**
- Gate evidence:
  - *A fresh clone installs and builds deterministically* — CI runs `npm ci` against the committed `package-lock.json`, which fails if the lockfile and `package.json` disagree, then `build`. Green on run [30797686308](https://github.com/Bill6006/life-command-os/actions/runs/30797686308) and its successor.
  - *The PWA shell opens and works offline* — Playwright test `starts from the cached build with the network offline` sets the browser context offline, reloads, and asserts the heading, navigation, and precached stylesheet all render. Passes on desktop and mobile viewports.
  - *The stable public GitHub Pages URL loads over HTTPS on phone and desktop* — https://bill6006.github.io/life-command-os/ verified live at 375×812 and desktop. Secure context confirmed (`window.isSecureContext === true`).
  - *The deployed commit and quiet build metadata match the gate-approved commit* — the About surface on the live site reads commit `b60bb5d`, matching `origin/main`.
  - *Repository-base routing, assets, manifest, and service-worker behaviour work from the Pages URL* — live checks returned HTTP 200 for `/life-command-os/`, `manifest.webmanifest`, `sw.js`, and `icons/icon-512.png`; the service worker is `activated` and controlling with scope `https://bill6006.github.io/life-command-os/`; the manifest link resolves to `/life-command-os/manifest.webmanifest`.
  - *The deployment workflow can update the same URL after later phase gates* — proven, not asserted: two successive pushes deployed to the identical URL, the second replacing the first.
  - *The application boundaries are clear* — ESLint boundary rules are enforced and were **verified to fire** against a deliberate violation probe (see Tests and evidence).
  - *The repository and hosted build use synthetic content only* — personal-information scan clean; the hosted build contains no data at all.
  - *No domain feature or intelligence algorithm exists* — asserted by test, not just by inspection: no decision affordance, no meter or progressbar, no Life Score, no streak, no operational-status panel.
  - *Every dependency has a current purpose* — recorded in `docs/architecture/DEPENDENCIES.md`, including seven dependencies deliberately **not** added.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: `b60bb5d` (`Phase 1: make the storage precondition test prove what it claims`)
- Last phone-and-desktop verification: 2026-08-03, at 375×812 and desktop. Shell renders, navigation works, About shows plan version 2.6 Lean Execution / Phase 1 / commit `b60bb5d`, service worker active and controlling.
- Hosted build contains synthetic content only: **YES** — it contains no data of any kind.

> This preview authorises inspecting synthetic UI progress. It does **not** authorise
> meaningful private use, which requires the Phase 6 gate.

## Work completed
- Bootstrapped the approved TypeScript + React + Vite PWA. Versions verified against the registry at implementation time and locked in `package-lock.json`.
- Established the modular-monolith structure with enforced boundaries. **Only layers with real code exist as directories** (`app`, `ui`, `infrastructure`); `domain`, `application`, `intelligence`, and `importers` remain documented architectural rules until they have content, per the Phase 0 resolution.
- Added strict TypeScript, type-aware ESLint, Prettier, a lockfile, build scripts, unit-test configuration, browser-test configuration, and a production build.
- Built the minimum accessible responsive shell: skip link, semantic landmarks, 44×44 touch targets, visible focus, reduced-motion support, no horizontal scrolling, current-nav state signalled by weight and border rather than colour alone.
- Added the IndexedDB connection and transaction foundation via Dexie, declaring **no canonical life-data stores** — those arrive in Phase 2.
- Added neutral synthetic fixture conventions (`tests/fixtures/synthetic.ts`) with the four rules Phase 2's builders will follow.
- Added lightweight privacy protections: `.gitignore` covering exports, backups, local databases, environment files, private screenshots, and owner-only files; a starting Content Security Policy; ESLint rules banning `console` and `localStorage` in `src/`; no analytics, no payload logging, no external AI.
- Configured lean CI: install, format check, lint, typecheck, unit tests, build, browser tests. One workflow; `deploy` depends on `verify`.
- Configured one lean GitHub Pages deployment on the repository's stable URL, with the Vite base path, manifest paths, and service-worker scope correct for a project site.
- Added quiet build metadata (plan version, phase, deployed commit, build time) under About.
- Generated the PWA icons from a committed script rather than committing opaque binaries.
- Recorded every dependency and the active requirement it supports, plus deliberate non-additions.
- Amended the Phase 0 commit to the GitHub noreply identity and purged the superseded object, removing the real email address from history before the first push.

## Files created or modified
Created — configuration:
`package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `playwright.config.ts`, `index.html`, `.github/workflows/ci-and-pages.yml`

Created — application:
`src/main.tsx`, `src/vite-env.d.ts`, `src/app/buildInfo.ts`, `src/ui/features/shell/AppShell.tsx`, `src/ui/styles/base.css`, `src/infrastructure/database/connection.ts`

Created — tests and tooling:
`tests/setup.ts`, `tests/fixtures/synthetic.ts`, `tests/unit/buildInfo.test.ts`, `tests/unit/database.test.ts`, `tests/e2e/shell.spec.ts`, `scripts/generate-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`

Created — documentation:
`docs/architecture/DEPENDENCIES.md`

Modified: `PROJECT_STATUS.md` (this file). No Phase 0 controlling document was changed.

## Tests and evidence
- **Unit tests: 9 passed** (`vitest run`). Storage: database opens at the declared version, returns a stable singleton, **declares only `_meta` and no life-data stores**, commits a transaction, and — the one that matters — **writes nothing when the transaction throws**, which is what makes "never report saved before commit" enforceable. Build metadata: four fields present, commit shortening, and an unknown commit passed through rather than replaced with a plausible-looking value.
- **Browser tests: 18 passed** (`playwright test`, desktop-chromium and mobile-chromium). Shell renders under the base path; navigation marks current; build metadata is absent from the opening surface and present under About; zero console errors, failed requests, or HTTP ≥ 400; no life-domain feature, decision affordance, meter, progressbar, Life Score, streak, or operational-status panel; manifest valid and scoped correctly with **every declared icon fetched and confirmed to exist**; offline cold start from precache including styles; offline status appears only when offline and the status region is otherwise empty; secure context with a real IndexedDB read/write round trip.
- **Boundary enforcement verified to fire, not merely configured.** A probe file importing both `dexie` and `../infrastructure/database/connection` from `src/ui/` produced exactly two `no-restricted-imports` errors with the ADR-0004 messages. Probe removed; lint clean.
- **Deterministic install:** `npm ci` in CI.
- **Personal-information scan:** tracked content scanned for owner identity strings, email addresses, government-ID patterns, and long digit runs. **Zero matches.**
- **Live deployment evidence:** HTTP 200 on index, manifest, service worker, and icon; service worker `activated` and controlling at the correct scope; About reports the deployed commit.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate.
- Git history: the Phase 0 commit was amended to `193191643+Bill6006@users.noreply.github.com` and the superseded object purged (`reflog expire` + `gc --prune=now`) **before the first push**. No real email address exists in any object in this repository. Repo-local `user.email` is set to the noreply address, so future commits inherit it.
- GitHub native secret scanning with push protection applies (public repository), satisfying "standard secret scanning where supported" without a second tool.

## Architecture decisions
No new ADRs. Phase 1 executes decisions already recorded in ADR-0002 and ADR-0004.

Version selections locked under ADR-0002, verified against the registry today:

| Concern | Locked |
|---|---|
| TypeScript | ^6.0.3 |
| React / React DOM | ^19.2.8 |
| Vite | ^8.2.0 |
| Dexie | ^4.4.4 |
| Vitest | ^4.1.10 |
| Playwright | ^1.62.1 |
| ESLint / typescript-eslint | ^10.8.0 / ^8.65.0 |

**TypeScript is pinned below 7.x deliberately.** TypeScript 7.0.2 is current, but `typescript-eslint@8` declares `typescript >=4.8.4 <6.1.0`. Installing 7.x would have silently disabled type-aware linting — losing the boundary enforcement that `ARCH-001` depends on — while appearing to work. Revisit when typescript-eslint supports 7.x.

**Two Phase 0 resolutions were applied and hold:** the importer boundary is an architectural rule and lint constraint, not a directory (`src/importers/` does not exist); and layers without code do not get empty directories.

## New dependencies
Full records in `docs/architecture/DEPENDENCIES.md`. Summary:

- **Runtime (3, all reaching the browser):** `react`, `react-dom`, `dexie`.
- **Development (13):** `vite`, `@vitejs/plugin-react`, `vite-plugin-pwa`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals`, `prettier`, `vitest`, `fake-indexeddb`, `@playwright/test`.
- **Deliberately not added, with reasons recorded:** a router, `@testing-library/react` and a DOM environment, a runtime validator (`zod` — Phase 2 owns it), coverage tooling, a third-party secret scanner, a hosting abstraction, and Web Workers tooling.

## New abstractions or infrastructure

**1. IndexedDB connection module** — `src/infrastructure/database/connection.ts`
- Active requirement: `STORE-001`, ADR-0004, Phase 1 task 5.
- Why a smaller direct implementation was insufficient: the gate requires transaction infrastructure "sufficient for later canonical repositories". Raw IndexedDB's callback API reliably produces inconsistent transaction handling, which is precisely the failure mode that would make "never report saved before commit" unenforceable. The module declares no domain tables.

**2. ESLint module-boundary rules** — `eslint.config.js`
- Active requirement: `ARCH-001`, ADR-0004, `MIG-001`, Phase 1 task 11.
- Why a smaller direct implementation was insufficient: the alternative is review discipline alone. The UI-must-not-touch-storage rule is exactly the kind that erodes under deadline pressure, and it is cheap to make mechanical. Verified to fire.

**3. Build-metadata injection** — `vite.config.ts` `define` + `src/app/buildInfo.ts`
- Active requirement: `OPS-002`, Phase 1 task 10.
- Why a smaller direct implementation was insufficient: a hard-coded string would go stale immediately, defeating the entire purpose — confirming which commit the owner is looking at.

**4. One CI and Pages workflow** — `.github/workflows/ci-and-pages.yml`
- Active requirement: `OPS-002`, Phase 1 tasks 8 and 9.
- Why a smaller direct implementation was insufficient: the gate requires deployment only after checks pass. A single workflow with `deploy` depending on `verify` is the smallest construction that expresses that. No staging, no PR previews, no hosting abstraction.

**5. Icon generation script** — `scripts/generate-icons.mjs`
- Active requirement: installability gate; manifest icons must exist.
- Why a smaller direct implementation was insufficient: the alternative is committing opaque binaries with no way to regenerate or audit them. The script uses only Node's built-in `zlib` — an image-processing dependency would have been the larger answer.

## Known limitations
- **`frame-ancestors` cannot be enforced.** It is ignored when delivered via `<meta>`, and GitHub Pages does not permit custom response headers, so the owner preview has no clickjacking protection. Recorded honestly rather than papered over with a directive that does nothing. Revisit in Phase 6.
- **The connection module is not wired into the shell.** Nothing in Phase 1 has data to store, so opening the database on load would be work without purpose. It is unit-tested; browser-backed canonical persistence is Phase 2 evidence.
- **Browser matrix is Chromium-only.** Sufficient for Phase 1; the full matrix is a Phase 10 release requirement.
- **`glob@11.1.0` deprecation warning** reaches the tree transitively through `vite-plugin-pwa` → `workbox-build`. Build-time only, never shipped to the browser, cannot see life data. Revisit when Workbox updates.
- **No router.** Navigation is a two-view state switch. The SPA fallback and base-path routing questions belong with the six real destinations in Phase 3.
- **The representative test device is still unnamed**, so the 3-second startup budget and phone-viewport budgets in `UX-005` remain untestable. Must be named in the Phase 3 design ADR.
- **Local environment note:** Avast Web/Mail Shield performs TLS interception on this machine, presenting its own root certificate. Git's OpenSSL backend rejected it. Resolved repo-locally with `http.sslBackend=schannel`, which uses the Windows trust store where the Avast root is already trusted. Certificate verification remains **enabled**; `sslVerify` was not disabled. A fresh clone on another machine will not need this.

## Deferred work
Unchanged from Phase 0 except where noted:

| Deferred system | Activates |
|---|---|
| Runtime validator (`zod`) and the 20 core record families | Phase 2 |
| Router, component-test library and DOM environment, semantic design tokens | Phase 3 |
| Research-card library, evidence-source registry | Phase 4 |
| `LearnedBeliefRecord` and learning governor | Phase 5 |
| Encryption, application lock, `src/infrastructure/crypto/` | Phase 6 |
| Notification infrastructure | Phase 6 at the earliest, only with an active requirement |
| Full domain schemas | Phase 7, one domain per run |
| Model-candidate registry, retired-rule ledger | Phase 8 |
| Legacy importer, `src/importers/legacy/` | Phase 9A, only if explicitly authorised |
| Full traceability generator, production security and release artifacts, full browser matrix | Phase 10 |
| Sync, native packaging, analytics, external AI, Web Workers | Not planned; post-release change control only |

## Blockers
**None blocking Prompt 3.**

Open decisions to resolve in Phase 2:

1. **Deletion semantics distinct from correction** (ADR-0005). Append-oriented storage preserves corrected values, so "correct" and "delete" cannot be the same operation, and the plan does not define deletion. Needs a decision before the canonical model is fixed.
2. **Approval of proposed `STORE-004`** covering the synthetic development export/restore format (`docs/REQUIREMENTS.md` §5). No approved requirement currently carries that traceability.

Open decision to resolve in Phase 3:

3. **Name the representative test device** for the startup and viewport budgets, in the design ADR.

## Next permitted prompt
**PROMPT 3 — Phase 2: Core canonical model and working storage.**
