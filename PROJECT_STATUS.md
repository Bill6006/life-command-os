# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 3 — Command-surface selection and UX foundation
- Current prompt: PROMPT 4 (complete)

## Gate status
- Status: **GREEN**
- Gate evidence:
  - *The owner explicitly approves one primary design* — **Console (Variant B)**, selected against the live build on the owner's Samsung phone. Recorded in ADR-0008.
  - *Only the selected design is expanded* — Variants A and C and the selection gallery were **deleted**, not archived. Verified: no reference to them remains anywhere in the tree.
  - *The ten-second synthetic comprehension test passes* — owner-judged against the live build. Mechanically, every element of the contract is present without an interaction: current state with observed/inferred labels, what changed and why, trajectory, untreated path, one best move, effects with costs, North Star relevance, confidence with its reasoning, reason trace, and one next interaction.
  - *The useful intelligence is visible rather than buried* — nothing on Now sits behind disclosure. This was the decisive reason Console was chosen over Focus.
  - *Only one best recommendation is shown; no competing menu exists* — at most one primary action in every state, asserted across all seven answer states.
  - *The weekly direction review does not require inventing a priority* — the system proposes, with its basis shown; the user confirms, adjusts, or takes a quiet week.
  - *The approved interaction budgets pass* — at 375 × 812: no element past the viewport edge in any of thirteen states or four destinations, every interactive target ≥ 44 × 44, usable at 200% text zoom, respond/adjust/decline within two taps.
  - *Compact, accessible, dark but energetic, non-generic* — preserved and constrained by the ADR-0008 anti-dashboard rules, which are enforced by test rather than left to taste.
  - *No overall Life Score, and no numerical category score* — asserted across every state and every destination.
  - *The full enabled-category overview is reachable within one interaction* — one click from Now's Trajectory panel.
  - *Mobile persistent navigation contains no more than five destinations* — exactly five; all six on desktop.
  - *No habit-streak grid, widget wall, decorative AI imagery, normal-state status panel, or meaningless graph* — asserted; the only graphic in the product is the trend chart, which carries an accessible name and lives in a `figure`.
  - *No production intelligence algorithm exists* — every surface reads a hand-written view model typed independently of the canonical records.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: the current head of `main`. Data & Privacy reports the exact commit it was built from.
- Last phone-and-desktop verification: 2026-08-03 at 375 × 812 and desktop.
- Hosted build contains synthetic content only: **YES**

> **Service-worker note.** A returning visitor may see the previous build once; reload a
> second time.

## The selection
**Console (Variant B).** Parallel panels read like an instrument; state, change,
trajectory, and untreated path are all readable without a disclosure step.

It was chosen because the Constitution requires the useful intelligence to stay *visible
rather than buried*, and Console was the only variant that showed all four without a fold.
Focus was the strongest first impression and would likely win a snap test, but it put four
required elements behind disclosure — an argument that gets weaker every phase as there is
more to show. Briefing put the answer below the situation.

**Its risk was named up front and is now a written rule.** The owner's constraint —
preserve the compact high-information style without drifting into a crowded generic
dashboard — became five enforceable rules in ADR-0008:

1. The decision always leads and is never displaced.
2. Now is capped at **five panels**.
3. Every panel answers a named question.
4. No panel renders in a normal operational state.
5. Density serves reading, not volume.

Rules 1 and 2 are asserted by test. Rule 2 caught a real violation during construction: the
offline state had six panels, and the offline notice became a banner instead — which is the
correct treatment for actionable status anyway.

## Work completed
- Recorded the selection and its full rationale, including why A and C were rejected, in **ADR-0008**, with the adopted budgets and the named representative device.
- **Deleted** Variants A and C, the gallery, the switcher, and the pre-selection spec.
- Formalised **semantic design tokens** (`src/ui/design-system/tokens.css`). Raw palette values appear once; components ask for `--evidence-inferred`, never "the violet one".
- Built the accessible responsive Console shell: segmented bar on a phone, left rail on desktop, six logical destinations with five persistent on mobile.
- Implemented all **thirteen interaction states** on Now.
- Implemented all six destinations: Now, Timeline, Direction, Commitments, Learning, Data & Privacy.
- Built the **full enabled-category overview** in Direction — condition, trajectory, confidence, freshness, principal drivers, real domain metrics, and what would change the interpretation — for all three enabled categories.
- Built static synthetic views for **expected category effects** and **one useful trend graph**.
- Added Phase 3 gate tests and updated the Phase 1 platform tests for the new shell.

### Decisions worth naming
- **Learning is honestly empty.** Nothing has been learned, because no recommendation has been executed and observed through a full outcome window. Filling it with plausible accuracy percentages would be the easiest thing in the product to fake convincingly, and exactly the false precision the Constitution forbids. The surface says so and lists what it is waiting on.
- **The chart's missing week is a gap, not a zero.** The line breaks, the week is marked, and the treatment is stated in text. A chart that plots absent evidence at the bottom of the axis tells the user something false about their life.
- **The chart's text summary is visible**, not only in the SVG description. A chart whose meaning is available only to screen readers has been designed twice, badly.
- **No delete control anywhere**, per owner instruction. Data & Privacy says why: correcting and deleting are different operations and deletion semantics are undecided.
- **The Timeline states plainly that a declined recommendation is not evidence about it** (`LEARN-002`) — that is precisely where a user would otherwise assume they had been judged.

## Files created or modified
Created (13): `docs/decisions/ADR-0008-selected-command-surface.md`; `src/ui/design-system/{tokens.css,console.css}`; `src/ui/view-models/prototype.ts`; `src/ui/components/{primitives.tsx,TrendChart.tsx}`; `src/ui/features/{now/NowSurface,timeline/TimelineSurface,direction/DirectionSurface,commitments/CommitmentsSurface,learning/LearningSurface,data-privacy/DataPrivacySurface}.tsx`; `tests/e2e/console-shell.spec.ts`

Deleted (7): the entire `src/ui/features/design-selection/` directory (6 files) and `tests/e2e/design-variants.spec.ts`

Modified: `src/ui/features/shell/AppShell.tsx` (rewritten as the Console shell), `src/ui/styles/base.css` (reduced to a reset), `src/main.tsx`, `src/app/diagnostics.ts` (removal trigger corrected), `vite.config.ts`, `tests/e2e/shell.spec.ts`, `docs/design/VISUAL_DIRECTION.md`, `docs/REQUIREMENTS.md`, `PROJECT_STATUS.md`

## Tests and evidence
- **Unit: 84 passed** — unchanged. Phase 3 adds no domain or storage behaviour.
- **Browser: 122 passed** across desktop and mobile viewports, up from 80.
  - All thirteen states render with no console errors.
  - The decision leads, and begins within the first viewport at 375 × 812, in all seven answer states.
  - Now never exceeds five panels, in any state.
  - At most one primary action per state; silence has none.
  - Prohibited constructs absent across all thirteen states **and** all six destinations.
  - The only graphic in the product is the trend chart; it has `role="img"`, a non-empty title, and a `figure`.
  - Five persistent destinations on a phone, six on desktop with no More.
  - Category overview and full What-changed each reachable in one interaction.
  - The chart states its question, metric, window, missing-data treatment, and uncertainty; seven points, two line runs, one gap rectangle — proving the missing week is not plotted.
  - Budgets at 375 × 812, including 200% zoom.
  - Evidence tags differ by computed `border-style`, not colour alone.
- **Four real defects found by these tests and fixed rather than tested around:**
  1. The offline state rendered six panels, breaking the ADR's own cap.
  2. At 200% zoom the navigation ellipsed destination names — information loss. It now wraps to a second row.
  3. At 200% zoom grid children and tables refused to shrink, pushing the page sideways. Fixed with `min-width: 0` and fixed table layout; the evidence tag moved into the value cell rather than holding its own column.
  4. The prototype scaffolding bar itself overflowed at 200% zoom. The overflow scan now covers the whole body, so scaffolding cannot hide a failure.
- A Title Case bug was also caught by eye: `text-transform: capitalize` was turning category conditions into headlines. It now applies only to single-word terms.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate. Data & Privacy states this on the surface rather than only in documentation.

## Architecture decisions
**ADR-0008 — Console selected as the primary command surface.** Records the choice, why A
and C were rejected, the five anti-dashboard rules, the adopted budgets, the representative
device, and the reversal strategy.

No budget was tightened or relaxed. The plan's defaults are adopted as written.

## New dependencies
**None.**

## New abstractions or infrastructure

**1. Semantic design tokens** — `src/ui/design-system/tokens.css`
- Active requirement: `UX-001`, Prompt 4 task 8 ("formalize semantic design tokens").
- Why smaller was insufficient: raw hex values scattered through components cannot be adjusted for measured accessibility without hunting. Tokens give the palette meaning, so a component asks for `--evidence-inferred` rather than a colour.

**2. Console primitives** — `src/ui/components/primitives.tsx`
- Active requirement: `UX-002`, `PROD-005`, ADR-0008 rule 3.
- Why smaller was insufficient: the panel is the entire design language, and the `label` prop being required is what enforces "every panel answers a named question". The `Actions` component has no shape that could hold a ranked list.

**3. Trend chart** — `src/ui/components/TrendChart.tsx`
- Active requirement: `UX-003`, Prompt 4 task 8 ("one useful trend graph").
- Why smaller was insufficient: the graph policy's obligations are enforced by the `TrendSeries` type, so a chart that cannot state its question, window, missing-data treatment, and text summary cannot be constructed at all.

**4. Prototype state switcher — TEMPORARY** — the `.proto` bar in `AppShell`
- Active requirement: Prompt 4 task 8 (thirteen interaction states must be demonstrable).
- Why smaller was insufficient: there is no engine to produce these states and no other way for the owner to see them on their own device.
- **Removal trigger: Phase 4**, when the states become real engine outputs.

**Carried forward — diagnostics bridge, with its removal trigger corrected.** The Phase 2
trigger said "when Phase 3 delivers Data & Privacy". That was wrong: Phase 3's Data &
Privacy is a static synthetic view and cannot exercise real storage, so removing the bridge
now would delete the Phase 2 persistence evidence and replace it with nothing. **Corrected
trigger: Phase 6**, when Data & Privacy is wired to real storage health, backup, and
restore.

## Known limitations
- **The 3-second cached startup target is still not measured.** It needs the physical Samsung phone; CI hardware would produce a number that means nothing. This is the one adopted budget without automated evidence, and it is the owner's to measure.
- **Two pieces of temporary scaffolding now ship**: the prototype state switcher (removed in Phase 4) and the diagnostics bridge (Phase 6).
- **Every surface is a synthetic view model.** Nothing reads storage. The Data & Privacy storage figures in particular are invented and labelled as such.
- **Check-in burden budget (≤ 5 responses, ≤ 60s) is not yet testable** — no check-in flow exists until Phase 4.
- **Bundle is ~117 kB gzipped.** The shell added little; zod and the canonical model remain the bulk.
- Carried forward: `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness on first load after a deploy; deletion semantics undecided.

## Deferred work
| Deferred | Activates |
|---|---|
| Partial execution, declined action, graceful return after absence, check-in, evidence, and timeline states ("full selected-design states") | Phase 6 |
| Router and component-test library | When real routing and component tests are needed |
| Prototype state switcher removal | Phase 4 |
| Diagnostics bridge removal | Phase 6 |
| Cached-startup measurement on the Samsung phone | Owner, against the deployed build |
| `src/intelligence/`, research cards, real state/forecast/decision behaviour | Phase 4 |
| `LearnedBeliefRecord`, real Learning content, more graphs | Phase 5 |
| Encrypted backup, app lock, notifications, real Data & Privacy | Phase 6 |
| Numerical category scores | Only if the score gate can ever be satisfied with real evidence |
| Deletion semantics and any delete control | Undecided |
| Domain schemas / model registry / legacy importer / release artifacts | Phases 7–10 |

## Blockers
**None blocking Prompt 5.**

One owner action outstanding, which does not block: **measure cached startup on the Samsung
phone** against the deployed build, and tell me if it exceeds three seconds.

## Next permitted prompt
**PROMPT 5 — Phase 4: Transparent baseline intelligence and first complete vertical slice.**

Phase 4 replaces every view model in `src/ui/view-models/prototype.ts` with real engine
output. The surface is now the contract: each place that holds a reason trace, an
untreated forecast, a confidence label, or a decomposed effect is a thing the engine must
actually produce, and an empty place would be visible.
