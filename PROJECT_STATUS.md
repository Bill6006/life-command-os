# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 4 — Transparent baseline intelligence and first complete vertical slice
- Current prompt: PROMPT 5 (complete)

## Gate status
- Status: **GREEN**
- Gate evidence:
  - *A synthetic user moves from observations and commitments through state, forecast, internal candidate evaluation, one best recommendation or silence, weekly direction, and execution intent* — sixteen scenarios drive the full lifecycle. `runEpisode` performs it in order and every stage is asserted.
  - *The UI exposes no competing recommendation menu* — `DecisionOutput` is a four-branch union, so a ranked list has no representable form. At most one primary action in every scenario, asserted at both viewports.
  - *"What changed?" accurately reflects structured evidence changes* — it is a **diff of two real engine runs**, not a changelog. It cannot claim a change the engine did not make.
  - *Cold start and weekly review do not force a blank-slate priority* — cold start emits insufficient evidence and asks nothing; the weekly direction is always system-proposed with its basis shown.
  - *Facts, inferences, stale data, contradictions, and unknowns remain distinguishable* — evidence tags render the word and differ by border style; stale is marked; contradictions are surfaced and left unresolved; unknowns are listed.
  - *Forecasts are bounded and unsupported forecasts abstain* — explicit target, horizon, assumptions, uncertainty, reason trace; `unknown` with a reason below three comparable weeks.
  - *Predicted action effects remain separate from untreated forecasts* — different modules, and a predicted effect **requires** a candidate id the forecast does not have.
  - *Cross-domain costs and North Star relevance are visible* — in the effects table and the decision panel.
  - *Every enabled alpha category has a condition-and-trajectory overview* with confidence, freshness, drivers, and real domain metrics.
  - *No overall Life Score; no numerical category score anywhere* — asserted across every scenario.
  - *Every active consequential rule is labelled an unproven transparent baseline* — eight machine-readable contracts, completeness asserted by test.
  - *Deliberate silence passes* — emitted when nothing survives the constraints and when the best score does not clear the interruption threshold.
  - *The interface never invents content the engine did not produce* — the Phase 3 view models are **deleted**. Every conclusion on screen comes from `EpisodeResult`.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Last phone-and-desktop verification: 2026-08-03 at 375 × 812 and desktop.
- Hosted build contains synthetic content only: **YES**

> **Service-worker note.** A returning visitor may see the previous build once; reload again.

## The prototype state switcher is gone
Replaced by a **scenario picker**, which is a materially different thing. It selects a set of
synthetic *records*; the engine computes the state, trajectory, forecast, effects,
recommendation, confidence, and weekly direction from them.

The same scenarios feed the test harness and the preview, deliberately — what the owner sees
on their phone is exactly what the tests assert.

Four presentation modes the engine cannot produce (loading, error, locked, recovery) remain
selectable, grouped separately and labelled as not being engine output. Lock and recovery
become real in Phase 6.

## Work completed
- **Eight intelligence contracts** (`src/intelligence/contracts.ts`), each declaring decision target, target, horizon, baseline, evidence class, uncertainty, abstention conditions, failure conditions, safety and privacy boundary, validation path, and retirement condition. Completeness is asserted by test, so a rule cannot ship without one.
- **State assessment** reading the latest context snapshot per field, detecting contradictions across same-day observations, and reporting unknowns and staleness explicitly.
- **Trajectory** summing focus blocks per ISO week with a stated 15 percent direction band, abstaining below three weeks, and carrying weeks without evidence as **gaps rather than zeros**.
- **Untreated forecast** by persistence, with assumptions and uncertainty, abstaining as `unknown` when unsupported.
- **Candidate generation** producing full candidates — dose, minimum useful version, fallback, stopping point, friction, risk, reversibility, blocking contexts. Safe by construction: the generator has no vocabulary for medication, health risk, driving, dependents, legal, financial, or security-sensitive actions.
- **Predicted effects** separate from the forecast and requiring a candidate id, decomposed into positive, negative, delayed, uncertain, and cross-domain, **never netted**, with coarse word magnitudes and `unknown` when the input is missing.
- **Constraint-first selection**: safety, protected contexts, non-negotiable commitments, time-plus-margin, capacity ceilings — then comparison on an inspectable integer score whose working appears in the reason trace.
- **One high-value question**, asked only when the answer changes candidate eligibility.
- **Material-change detection** by diffing two real engine runs.
- **Weekly direction**, always proposed, with a quiet week offered on its merits.
- **Category summaries** for all three enabled categories, with real domain metrics and no scores.
- **Sixteen deterministic scenarios** covering every case the phase requires.
- **Four research cards** for the rules that contain a judgement expressed as a number.
- Replaced every Phase 3 view model with engine output and deleted `prototype.ts`.

### Decisions worth naming
- **Confidence cannot reach `strong-personal-evidence` in this phase, and a test asserts it never appears.** The top label requires prospective validation, which does not exist until Phase 5. A baseline able to award itself the highest confidence on day one would be exactly the false precision the Constitution forbids.
- **Capacity is a constraint, not a penalty.** Depleted capacity removes anything over 15 minutes *before* ranking. Quietly ranking a demanding action lower would still leave it recommendable, which is the productivity-at-all-costs behaviour the Constitution forbids.
- **The minimum useful version needs the window plus five minutes of margin.** An action that exactly fills the gap sets the user up to fail, which is worse than saying nothing.
- **Learning is honestly empty**, with the counts that prove it. Plausible accuracy figures would be the easiest thing in the product to fake convincingly.

## Files created or modified
Created (24): `src/intelligence/` (14 files: types, contracts, support, index, and the state, forecast, intervention, decision, change-detection, and questioning modules); `src/app/scenarios.ts`; `src/application/queries/storageInfo.ts`; `src/ui/view-models/present.ts`; `tests/unit/engine.test.ts`; `docs/research/` (5 files)

Deleted (1): `src/ui/view-models/prototype.ts`

Modified: all six surfaces, `AppShell`, `TrendChart` (every gap now marked, not just the first), `primitives`, `vite.config.ts`, `tests/e2e/console-shell.spec.ts`, `tests/e2e/shell.spec.ts`, `docs/REQUIREMENTS.md`, `PROJECT_STATUS.md`

## Tests and evidence
- **Unit: 115 passed**, up from 84. 31 new engine tests: scenario records all parse; determinism; exactly one output in every scenario; cold start; abstention; constraint-first filtering; the question rule; effect separation; material change; weekly direction; category summaries; the confidence ceiling; and contract completeness.
- **Browser: 186 passed**, up from 122, across desktop and mobile viewports. Every Phase 3 assertion still holds, now against engine output rather than a prototype.
- **Four real defects found by these tests and fixed rather than tested around:**
  1. A 10-minute action was recommended in a 12-minute window with no margin — fixed by requiring the minimum plus slack.
  2. Depleted capacity still produced a career action — fixed by treating capacity as a filter, per master plan §28 step 3.
  3. The chart drew only the **first** gap when five weeks were missing, implying the rest carried evidence. Every gap is now marked.
  4. A test regex flagged the word "ranked" inside honest prose explaining that a question changes eligibility rather than ranking — the regex was wrong, not the copy.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate.
- No network access exists in the intelligence layer. Every conclusion is computed on-device.

## Architecture decisions
No new ADRs. Phase 4 implements ADR-0003 (local deterministic intelligence authority) and
satisfies the output contract ADR-0008 set.

`src/intelligence/` now exists with the documented subdirectories, each holding real code.
It reads validated records and **never writes to storage** (ARCH-001).

## New dependencies
**None.**

## New abstractions or infrastructure

**1. The intelligence layer** — `src/intelligence/` (14 files)
- Active requirement: `INTEL-001` through `INTEL-008`, `SAFE-001`, `PROD-002`, Prompt 5 tasks 4–15.
- Why smaller was insufficient: this *is* the phase deliverable. The module split follows the documented boundaries so each rule can be tested and retired independently.

**2. Intelligence contracts** — `src/intelligence/contracts.ts`
- Active requirement: Prompt 5 task 3.
- Why smaller was insufficient: prose in a document cannot be asserted. As data, a test proves no rule ships without a complete contract.

**3. Synthetic scenarios** — `src/app/scenarios.ts`
- Active requirement: Prompt 5 task 18.
- Why smaller was insufficient: the harness needs record sets, and the preview needs the same ones — sharing them is what makes "what the owner sees is what the tests assert" true.

**Removed:** the Phase 3 prototype state switcher and `prototype.ts`.

**Carried forward:** the diagnostics bridge, removal trigger Phase 6 (corrected in Phase 3).

## Known limitations
- **Every rule is an unproven baseline.** None has been validated against this owner's outcomes, because none has been observed. Phase 5 is what changes that.
- **The numeric conventions are judgements** — the 15 percent band, the dose thresholds, the weights, the interruption threshold of 3. Each is defended in a research card and shown in the reason trace, but none is measured.
- **The scenario picker still ships.** It now selects records rather than faking states, but it is scaffolding; it goes when the owner enters real records in Phase 6.
- **No execution or outcome is recorded yet.** Start, Adjust, and Not now are rendered but not wired to writes — Phase 5 owns execution and outcome capture. Nothing currently converts a decline into evidence, and nothing can.
- **The 3-second cached startup target is still not measured** — it needs the physical Samsung phone. Bundle is now ~127 kB gzipped.
- Carried forward: `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided.

## Deferred work
| Deferred | Activates |
|---|---|
| Execution and outcome capture, forecast evaluation, recommendation-effectiveness evaluation, `LearnedBeliefRecord`, real Learning content, more graphs | Phase 5 |
| Full selected-design states, encrypted backup, app lock, notifications, real Data & Privacy, scenario-picker and diagnostics-bridge removal | Phase 6 |
| Domain schemas | Phase 7 |
| Model-candidate registry and tournament | Phase 8 — only when a real problem has two real candidates |
| Legacy importer | Phase 9A |
| Full traceability generator, browser matrix, release artifacts | Phase 10 |

## Blockers
**None blocking Prompt 6.**

One non-blocking owner action: **measure cached startup on the Samsung phone** and say if it
exceeds three seconds.

## Next permitted prompt
**PROMPT 6 — Phase 5: Outcome learning, trajectories, and useful graphs.**

Phase 5 closes the loop. It is also what lifts the confidence ceiling: once recommendations
have been executed and observed through outcome windows, `strong-personal-evidence` becomes
reachable — and only then.
