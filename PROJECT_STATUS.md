# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 2.6 Lean Execution
- Current phase: Phase 5 — Outcome learning, trajectories, and useful graphs
- Current prompt: PROMPT 6 (complete)

## Gate status
- Status: **GREEN**
- Gate evidence:
  - *Forecast accuracy and recommendation effectiveness remain separate* — separate functions, separate result types, separate fields, separate panels. No code path averages them, asserted against the engine data and at the interface.
  - *Missing outcomes remain unresolved* — a closed window with no outcome, and an expired window, both produce `unresolved` with a reason saying it is not counted against the recommendation.
  - *Strong personal claims require prospective evidence* — the top confidence label needs four clean episodes, each predicted before it was observed, none contradicted and none confounded. The record schema refuses it independently of the governor.
  - *Graphs answer real questions* — eight graphs, each carrying its question, metric, window, evidence basis, missing-data treatment, uncertainty, and a visible text summary as **data**, so one cannot be rendered without them.
  - *Beliefs update conservatively and retain reason traces* — form, strengthen, narrow, suspend, retire; every history entry carries why, and narrowing precedes weakening.
  - *Return after absence is non-punitive* — no backlog, no missed-day count, no guilt vocabulary. Predictions expire rather than fail.
  - *The first complete synthetic learning loop passes* — `learning-loop` runs observation → recommendation → execution → outcome → evaluation → belief, and reaches the top label legitimately.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Last phone-and-desktop verification: 2026-08-03 at 375 × 812 and desktop.
- Hosted build contains synthetic content only: **YES**

> **Service-worker note.** A returning visitor may see the previous build once; reload again.

## The confidence ceiling lifted — and only here
Through Phase 4, `strong-personal-evidence` was unreachable by construction, because nothing
had been validated against a later outcome.

Phase 5 makes it reachable **for beliefs only**, and only on four clean prospective episodes
with zero contradictions and zero confounding. State, trajectory, forecast, decision, and
weekly-direction confidence still cannot reach it — a test asserts that across every scenario.
None of them is checked against a later outcome, so none has earned it.

## Work completed
- **Activated `LearnedBeliefRecord`** — twenty-one canonical families now. Its schema enforces three things independently of the governor that writes it: a belief must cite its evaluations, its applicability is explicit, and the top label requires prospective validation.
- **Outcome windows** — an execution opens one, it closes after seven days, and expires unresolved after twenty-one. Nothing is evaluated before its window closes.
- **Two evaluations, permanently apart** — forecast accuracy and recommendation effectiveness, with the five verdicts preserved: supported, partially supported, contradicted, context-invalidated, unresolved.
- **Confounding detection** — overlapping executions, context changes inside the window, and partial execution each add a factor. A high-risk episode **cannot** reach `supported`.
- **Conservative learning governor** — two supporting episodes to state a belief, three to hold it, four clean prospective ones for the top label. Contradiction narrows before it weakens; a context change suspends rather than deletes.
- **Eight graphs** — category trajectory, workload versus capacity, forecast accuracy, follow-through, actions and outcomes, expected versus actual, North Star progress, and confidence.
- **Weekly-direction continuity** — carry forward, adjust, abandon, or go quiet, with why preserved and no moral scoring.
- **Graceful return after absence** — a calm banner, expired predictions, summarised open loops, and honestly lower confidence.
- **Nine new scenarios** covering executed, declined, partially executed, missing-outcome, confounded, context-change, forecast-accuracy, weekly-continuity, and return-after-absence.

### Decisions worth naming
- **The failure mode the governor exists to prevent** is stated in its research card: a user protects one focus block, has a good week, and the system tells them it *works*. Every threshold, the confounding detection, and the vocabulary split between "is associated with" and "reliably" are aimed at that specific inference.
- **Unresolved is always shown, never dropped.** A follow-through chart that quietly omitted pending outcomes would flatter the system.
- **Suspension preserves evidence.** A context change pauses a belief and names the change; the evidence was real and may matter again.
- **Beliefs are recomputed from evaluations every time**, never mutated in place, so a belief cannot drift away from what supports it.

## Files created or modified
Created (11): `src/domain/records/learning.ts`; `src/intelligence/evaluation/{outcomeWindows,evaluate}.ts`; `src/intelligence/learning/{beliefs,insights}.ts`; `src/intelligence/decision/weeklyContinuity.ts`; `src/intelligence/state/absence.ts`; `src/ui/components/GraphFigure.tsx`; `tests/unit/learning.test.ts`; `docs/research/learning-governor.md`

Deleted (1): `src/ui/components/TrendChart.tsx`, superseded by `GraphFigure`

Modified: `domain/records/index.ts` (21 families), `intelligence/{index,types}.ts`, `app/scenarios.ts`, the Learning and Direction surfaces, `AppShell`, `console.css`, `vite.config.ts`, `tests/unit/{records,engine}.test.ts`, `tests/e2e/{console-shell,shell}.spec.ts`, `docs/REQUIREMENTS.md`

## Tests and evidence
- **Unit: 143 passed**, up from 115. 28 new learning tests.
- **Browser: 252 passed**, up from 186, across desktop and mobile viewports.
- **Three real defects found by these tests and fixed rather than tested around:**
  1. The `weekly-continuity` scenario dated its outcomes in the future, so they were correctly `unresolved` and the engine said `adjust`. **The engine was right and the scenario was wrong** — the data was fixed, not the rule.
  2. **Markdown asterisks were rendering literally** in the interface — `**Association, not causation.**` appeared with the asterisks visible.
  3. A component was being defined during render in the Learning surface, which throws away its subtree on every update.
- Two of my own test assertions were wrong and were corrected rather than worked around: a regex flagged the honest prose "not read as a success rate", and the chart assertions counted across all three Direction charts instead of the trajectory one.

## Privacy status
- Synthetic-only repository: **YES**
- Real personal data detected in tracked content: **NO**
- Runtime private-data readiness: **NOT YET** — requires the Phase 6 gate.

## Architecture decisions
No new ADRs. Phase 5 implements ADR-0005 (append-oriented records — beliefs supersede rather
than mutate) and completes the lifecycle ADR-0003 describes.

`src/intelligence/` now has `evaluation/` and `learning/`, both documented in the architecture
tree and both created only now that there is behaviour for them.

## New dependencies
**None.**

## New abstractions or infrastructure

**1. `LearnedBeliefRecord`** — `src/domain/records/learning.ts`
- Active requirement: `LEARN-003`, Prompt 6 task 6.
- Why smaller was insufficient: the belief invariants — cited evidence, explicit applicability, prospective validation for the top label — need to hold regardless of which code writes the record.

**2. Evaluation modules** — `evaluation/{outcomeWindows,evaluate}.ts`
- Active requirement: `LEARN-001`, `LEARN-002`, Prompt 6 tasks 1–5.
- Why smaller was insufficient: keeping the two evaluations in separate functions with separate types is what makes "never combined" structural rather than a convention.

**3. Learning governor and insights** — `learning/{beliefs,insights}.ts`
- Active requirement: Prompt 6 tasks 6–11.
- Why smaller was insufficient: the graphs' obligations are enforced by the `GraphMeta` type, so a chart that cannot state its question cannot be constructed.

**4. `GraphFigure`** — replaces `TrendChart`
- Active requirement: `UX-003`.
- Why smaller was insufficient: two chart kinds now exist and both must satisfy the same policy; one component enforcing it is smaller than two that each might drift.

**Carried forward:** the scenario picker and the diagnostics bridge, both removed in Phase 6.

## Known limitations
- **The governor's thresholds are conventions**, not measurements — two, three, four episodes. Defended in `docs/research/learning-governor.md`, and it cannot validate itself. Phase 8 can compare it against an alternative.
- **Beliefs are derived, not yet persisted.** `LearnedBeliefRecord` is registered, validated, and schema-enforced, but the engine recomputes beliefs from evaluations each run rather than writing them. Persisting belief history is Phase 6 work, alongside real storage writes.
- **Execution and outcome capture is modelled but not user-driven.** Start, Adjust, and Not now still do not write records; the loop is exercised through scenarios. Wiring the controls is Phase 6.
- **Only one belief pattern is derived.** The governor is general but the single derivation rule is focus-block timing; more patterns arrive with more domains in Phase 7.
- **Cached startup is still unmeasured.** Bundle is now ~137 kB gzipped.
- Carried forward: `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided.

## Deferred work
| Deferred | Activates |
|---|---|
| Persisting beliefs and evaluations as canonical records; wiring Start/Adjust/Not now to writes; full selected-design states; encrypted backup; app lock; notifications; real Data & Privacy; scenario-picker and diagnostics-bridge removal | Phase 6 |
| Domain schemas and further belief patterns | Phase 7 |
| Model-candidate registry and tournament | Phase 8 |
| Legacy importer | Phase 9A |
| Full traceability generator, browser matrix, release artifacts | Phase 10 |

## Blockers
**None blocking Prompt 7.**

One non-blocking owner action: **measure cached startup on the Samsung phone** and say if it
exceeds three seconds.

## Next permitted prompt
**PROMPT 7 — Phase 6: Integrated private alpha and real-data hardening.**

Phase 6 is the gate that matters most: encrypted backup and fresh-profile recovery. Until it
passes, entering meaningful private data is not safe, and the interface says so.
