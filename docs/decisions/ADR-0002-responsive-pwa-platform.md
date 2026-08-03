# ADR-0002: Responsive installable PWA as the production platform

## Status

Accepted — 2026-08-03, Phase 0

## Context

The product must run on the owner's phone and desktop, work without a network connection,
keep all life data on-device, and remain inspectable by the owner from the very first phase.

The platform choice determines the storage model, the offline model, the deployment model,
the testing stack, and the cost of every later phase. It is expensive to reverse after
Phase 2.

The owner also needs to see interface progress from a phone starting in Phase 1, without
waiting for a release, and without installing anything.

Requirements: `PROD-001`, `STORE-001`, `PRIV-003`, `OPS-002`, `ARCH-001`.

## Decision

The first production target is a **responsive, installable Progressive Web App that works
without a network connection**.

Approved stack, with exact versions locked during Phase 1 bootstrap after compatibility
review:

| Concern | Choice |
|---|---|
| Language | TypeScript, strict mode |
| UI | React |
| Build and dev server | Vite |
| Canonical storage | IndexedDB via a typed transaction wrapper such as Dexie |
| Runtime validation | A TypeScript-first validator such as Zod |
| Installability and offline | Standards-based web app manifest and service worker |
| Unit and integration tests | Vitest |
| Component tests | DOM-focused component testing |
| Browser, offline, recovery, E2E | Playwright |
| Hosting | GitHub Pages, one lean Actions workflow |

**Explicitly not implemented:** native packaging, synchronization, analytics, external AI,
plugin systems, event buses, dependency injection, and Web Workers. No Web Worker is added
until profiling shows a current intelligence operation blocks the interface.

## Rationale

A PWA is the smallest platform that satisfies every hard constraint at once: it is
responsive across phone and desktop from one codebase; it installs; it works offline through
a service worker; it stores data locally in IndexedDB with no server; it deploys as static
files to GitHub Pages, which makes the Phase 1 owner-preview requirement nearly free; and it
has no app-store review, signing, or distribution overhead for a single-owner private tool.

Critically, a PWA has **no server component**, which means there is no backend that could
accidentally receive private life data. The privacy boundary is enforced by the platform's
shape rather than by discipline alone.

TypeScript strict mode plus runtime validation covers both directions: compile-time
correctness for code, and runtime correctness for data crossing the storage boundary — where
schema versions, migrations, and restored backups make compile-time types insufficient.

## Alternatives considered

**Native mobile application (iOS/Android).** Rejected. Two codebases or a cross-platform
framework, app-store distribution overhead, signing and provisioning, and no cheap
owner-preview path. It offers better notification support and background execution — neither
is needed before Phase 6, and notifications are off by default regardless.

**Electron or Tauri desktop application.** Rejected for the initial target. It solves
desktop well and phone not at all, and the product's most valuable moments — a quick
check-in, a recommendation in context — are phone moments.

**Server-backed web application.** Rejected outright. A server is a place private life data
can go. That contradicts the privacy boundary at the architectural level and adds hosting,
authentication, and breach surface for a single-user tool.

**Plain SPA with no service worker or manifest.** Rejected. Offline operation is a
constitutional requirement (Product Constitution §7), not an enhancement.

**Alternative frameworks (Svelte, Solid, Vue).** Not rejected on merit. React was selected
by the controlling plan; the decision is recorded rather than relitigated. The architecture
does not depend on React specifics, which keeps the interface layer replaceable.

## Consequences

### Positive

- One codebase serves phone and desktop.
- No server, therefore no server-side privacy surface.
- Offline works by design.
- Static deployment makes the Phase 1 Pages preview cheap and the Phase 10 release path
  identical to it.
- Playwright can exercise real browser behavior — offline, service-worker update, IndexedDB
  persistence, recovery — which is where the risk actually lives.

### Cost or limitation

- **Browser storage is evictable.** IndexedDB can be cleared by the browser under storage
  pressure, or by the user clearing site data. This is the single largest data-loss risk and
  is why Phase 6 encrypted backup gates real private use.
- **Application lock is weak.** A browser PWA cannot offer OS-level protection. Phase 6 must
  state these limits honestly rather than imply security it cannot deliver.
- **Notifications are limited and platform-dependent.** Phase 6 implements them only if the
  platform supports them honestly.
- No background execution. All intelligence runs when the application is open.
- Service-worker update semantics are a known source of subtle staleness bugs, requiring
  explicit update and rollback testing in Phase 10.

## Privacy and security impact

Strongly positive: no server, no accounts, no analytics, no external AI, and no network
dependency for core function. All life data stays in the browser's local storage on the
owner's device (`PRIV-003`).

The residual risks are local, and are handled at their owning phases: browser storage
eviction (Phase 6 encrypted backup), weak app lock (Phase 6, documented honestly), XSS as
the primary attack surface for a client-side app holding sensitive data (Phase 6 protections
and CSP direction from Phase 1).

## Canonical data and storage impact

Establishes IndexedDB as the canonical store — formalized in
[ADR-0004](ADR-0004-indexeddb-canonical-authority.md). Requires a migration story from
Phase 2, because browser-resident schemas evolve under data the owner cannot afford to lose.

Runtime validation at the storage boundary is mandatory: data read back from IndexedDB, or
restored from a backup, is untrusted with respect to the current schema version.

## Intelligence impact

All intelligence runs client-side, synchronously, in the main thread until profiling proves
otherwise. This constrains algorithms to what can complete without blocking the interface —
which aligns with the constitutional preference for simple, transparent, deterministic logic
over heavy models.

The 3-second cached-startup budget (`UX-005`) constrains bundle size and startup work,
including intelligence initialization.

## User-experience impact

- One responsive design system spans phone and desktop; Phase 3 variants are evaluated on
  both.
- Installability gives an app-like launch without app-store friction.
- Offline is a normal state, not an error state — it appears in the Phase 3 interaction
  states.
- The Phase 1 Pages URL lets the owner inspect real interface progress from their phone from
  the first phase onward.

## Testing required

- **Phase 1:** fresh clone installs and builds deterministically; PWA shell opens and works
  offline; manifest and service-worker scope correct under the repository base path; Pages
  URL loads over HTTPS on phone and desktop.
- **Phase 2:** browser-backed persistence tests — canonical data survives reload and
  synthetic restore.
- **Phase 6:** offline, reload, restart, update, storage-quota, corruption, stale-tab, and
  interrupted-write behavior.
- **Phase 10:** browser matrix, installability, service-worker update **and rollback**,
  performance against the startup budget on the named representative device.

## Deferred future work

- Native packaging — not planned; post-release change control only.
- Web Workers — only if profiling shows a current intelligence operation blocks the
  interface.
- Notifications — Phase 6 at the earliest, only with honest platform support and an active
  requirement.
- Synchronization — see [ADR-0006](ADR-0006-single-device-first-with-sync-metadata.md).

## Reversal strategy

The domain, application, and intelligence layers are framework-agnostic TypeScript by
design; only `src/ui/` and `src/app/` depend on React and Vite. Replacing the interface
framework, or wrapping the built application in a native shell later, would not require
rewriting the canonical model or the intelligence layer.

Abandoning the browser platform entirely would require replacing the IndexedDB
infrastructure — the reason ADR-0004 defines the repository boundary such that storage
access is confined to `src/infrastructure/database/`.
