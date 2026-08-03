# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 3 — Command-surface selection and UX foundation
- Current prompt: PROMPT 4 (**paused mid-phase, awaiting owner selection**)

## Gate status
- Status: **YELLOW — awaiting owner design selection**
- This is the planned mid-phase stop. Prompt 4 publishes three primary command-surface variants and halts until one is chosen. Nothing is expanded until then.
- Pre-selection evidence:
  - *Exactly three variants of the primary command surface exist* — asserted by test, and only the primary surface was built. No secondary screens, no second destination, no third application (`LEAN-003`).
  - *One shared synthetic decision scenario* — all three render identical content, which is the only way the comparison means anything.
  - *Each variant carries the full ten-second payload* — current state, observed versus inferred, what materially changed and why, trajectory, untreated path, one best move, positive/negative/delayed/uncertain/cross-domain effects, North Star relevance, confidence, reason trace, and one next interaction. Asserted per variant.
  - *No competing recommendation menu in any variant* — exactly one primary action; no runner-up is representable in the view model.
  - *Deliberate silence renders as a conclusion in all three*, not an empty or apologetic screen.
  - *Prohibited constructs absent from all three* — no Life Score, no numerical category score, no streak grid, no "all systems operational" panel, no meter or progressbar, and zero `img`/`svg`/`canvas` elements (no decorative AI imagery).
  - *Mobile navigation is exactly five destinations in all three.*
  - *Budgets pass at 375 × 812* — no horizontal overflow on any element, every interactive target ≥ 44 × 44, and the decision survives 200% text zoom without sideways scrolling.
  - *No production intelligence algorithm exists* — every variant reads from an explicit hand-written view model.
- Still owner-judged, and deliberately not automated: the ten-second comprehension test, and which composition to build on.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/** → **Design** tab
- Deployment status: **LIVE**
- Deployed commit: the current head of `main`. The About surface reports the exact commit it was built from.
- Last phone-and-desktop verification: 2026-08-03 at 375 × 812 and desktop.
- Hosted build contains synthetic content only: **YES**

> **Service-worker note.** A returning visitor may see the previous build once. If the
> Design tab is missing, reload a second time.

## Owner decisions recorded this phase
1. **Representative device: the owner's Samsung phone, repeatable test viewport 375 × 812.** Recorded in `docs/design/VISUAL_DIRECTION.md` §6.1a and enforced in `tests/e2e/design-variants.spec.ts`. This closes the open decision carried since Phase 1 and makes the `UX-005` budgets testable. The physical device remains the authority for the 3-second startup target, which CI hardware cannot measure honestly.
2. **Deletion semantics stay deferred; no delete control added.** Nothing in this phase deletes a canonical record, and no variant offers such a control.
3. **`STORE-004` approved** and moved into the approved requirements table with a full traceability record. `docs/REQUIREMENTS.md` §5 now reports no open requirement gaps.

## The three variants

| | **A — Briefing** | **B — Console** | **C — Focus** |
|---|---|---|---|
| Hierarchy | Linear narrative; situation before answer | Parallel panels, all visible at once | One dominant answer, rest folded away |
| Density | Low | High | Very low above the fold |
| Typography | Large headline, comfortable prose | Compact, monospace values, small caps | Large decision type, minimal labels |
| Surface | Flat bands, one elevated block | Layered bordered panels | One strongly elevated card |
| Navigation | Bottom tab bar | Segmented bar (phone) / rail (desktop) | Minimal header menu |
| Expression | Complete sentences, calm | Terse labelled readouts | Short and decisive |
| **Its risk** | The move sits below the situation; may take a short scroll on a phone | Density — most likely to drift toward the dashboard the Constitution warns against | Folding the evidence — tests hardest against "visible rather than buried" |

Each variant's risk is stated in the gallery itself, and a test asserts all three are
stated. A comparison that lists only strengths is not a comparison.

## Work completed
- Recorded the three owner decisions above.
- Wrote one shared synthetic decision scenario, deliberately a **hard** case: capacity is inferred rather than observed, the trajectory is declining, one predicted effect is a cost, another is uncertain and delayed, and confidence is only "early signal". A layout that only looks good on good news would be the wrong choice.
- Built exactly three high-fidelity variants of the **primary command surface only**, each owning the full viewport including its own navigation — because navigation is one of the six dimensions they must differ on, and judging them inside a shared chrome would hide exactly that.
- Added a deliberate-silence toggle inside each variant. This is one extra state, not a full secondary-state build: task 4 names "one best move **or** deliberate silence" as part of the primary contract, and a composition that looks broken when the honest answer is "nothing" is disqualifying — invisible if every variant is only ever shown its best case.
- Published to the existing Pages URL under a **Design** tab and verified live at 375 × 812 and desktop.
- Added Phase 3 pre-selection gate tests covering the payload, the one-best-move rule, silence, the prohibitions, the five-destination limit, and the budgets.

## Files created or modified
Created (6): `src/ui/features/design-selection/{scenario.ts,DesignSelection.tsx,VariantBriefing.tsx,VariantConsole.tsx,VariantFocus.tsx,variants.css}`, `tests/e2e/design-variants.spec.ts`

Modified: `src/ui/features/shell/AppShell.tsx` (Design view, three destinations), `src/ui/styles/base.css` (remaining approved colour tokens), `vite.config.ts` (phase marker), `tests/e2e/shell.spec.ts`, `docs/REQUIREMENTS.md`, `docs/design/VISUAL_DIRECTION.md`, `PROJECT_STATUS.md`

## Tests and evidence
- **Unit: 84 passed** — unchanged; Phase 3 adds no domain or storage behaviour.
- **Browser: 80 passed** across desktop and mobile viewports, up from 34. 23 new Phase 3 tests × 2 viewports.
- Three issues were found by these tests and **fixed rather than tested around**:
  1. Variant B's mobile navigation overflowed 375px, clipping "Commitments". A nav strip that scrolls sideways hides destinations, which is what the five-destination limit exists to prevent. Fixed by tightening the phone layout so all five fit.
  2. Variants A and C omitted the cross-domain marker on predicted effects. Cross-domain cost is explicitly required by task 4.
  3. A copy bug lowercased "Friday" in the assumptions line.
- The overflow test reports offending elements by selector, so a future failure says what to fix rather than only that something is wrong.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate.

## Architecture decisions
No new ADRs yet. **ADR-0008 is written at selection**, recording the chosen variant, the
representative device and viewport, and any owner-approved budget adjustment with its
repeatable test method.

## New dependencies
**None.**

## New abstractions or infrastructure
**One, and it is temporary.**

- Artifact: `src/ui/features/design-selection/` (six files).
- Active requirement: `LEAN-003`, `UX-001`, Prompt 4 tasks 2–6.
- Why a smaller direct implementation was insufficient: the phase requires three
  meaningfully different high-fidelity variants that the owner can judge on their own
  phone against the live build. Static mockups could not be checked against the budgets
  or the prohibitions, and could not demonstrate navigation differences.
- **Removal trigger: immediately after selection.** Only the chosen variant is expanded;
  the gallery, the switcher, and the two unchosen variants are deleted.

Carried forward, unchanged: the Phase 2 diagnostics bridge remains and is still scheduled
for removal in Phase 3 once Data & Privacy exists.

## Known limitations
- **The gate is YELLOW by design.** It cannot go green without a human judgement.
- **The 3-second cached startup target is not yet measured.** It needs the physical Samsung phone; CI hardware would produce a number that means nothing. Measure after selection, once the real shell exists.
- **Two of three variants will be discarded.** That is the intended cost of the approach — cheaper than building three applications.
- **The design gallery ships to the public preview** while selection is open. It is synthetic-only and disappears at selection.
- Carried forward: diagnostics bridge still shipping; bundle ~116 kB gzipped before the variants; `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness on first load after deploy.

## Deferred work
| Deferred | Activates |
|---|---|
| Expanding the selected variant into its interaction states, semantic design tokens, ADR-0008, the six destinations, the enabled-category overview, one trend graph | Immediately after selection, same phase |
| Router, component-test library, diagnostics-bridge removal | With the expanded shell |
| Partial execution, declined action, graceful return after absence, check-in, evidence, timeline states | Phase 6 ("full selected-design states") |
| `src/intelligence/`, research cards | Phase 4 |
| `LearnedBeliefRecord` | Phase 5 |
| Encrypted backup, app lock, notifications | Phase 6 |
| Deletion semantics and any delete control | Undecided; owner deferred again this phase |
| Domain schemas / model registry / legacy importer / release artifacts | Phases 7–10 |

## Blockers
**One, and it is the intended stop: the owner must select a variant.**

Open the Pages URL on the Samsung phone, go to **Design**, open A, B, and C, toggle each
between *action* and *quiet*, and name the one to build on.

No other decision is outstanding. Deletion semantics remain deferred by owner instruction
and are not needed until a delete control is proposed.

## Next permitted prompt
**Continue PROMPT 4 within Phase 3**, after the owner names a variant. The remainder of the
phase then runs: ADR-0008, semantic design tokens, the accessible responsive shell built
from the selected variant, its interaction states, the six logical destinations with five
persistent on mobile, the full enabled-category overview in Direction, static synthetic
views for expected category effects and one useful trend graph, and a further publish to
the same Pages URL.
