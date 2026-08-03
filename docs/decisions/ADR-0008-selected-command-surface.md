# ADR-0008: Console selected as the primary command surface

## Status

Accepted — 2026-08-03, Phase 3. Selected by the owner against the live build.

## Context

Phase 3 required exactly three meaningfully different high-fidelity variants of the primary
command surface, judged on the owner's own device against one shared synthetic decision
scenario (`LEAN-003`, `UX-001`).

Three were built and published to the stable Pages URL:

| | Idea | Its risk, as stated to the owner |
|---|---|---|
| **A — Briefing** | Linear narrative; the situation arrives before the answer | The move sits below the situation, so a phone may need a short scroll to reach the answer |
| **B — Console** | Parallel panels read like an instrument; everything visible at once | Density — most likely to drift toward the generic dashboard the Constitution warns against |
| **C — Focus** | One dominant answer; the evidence folded away beneath it | Folding the evidence tests hardest against "useful intelligence visible rather than buried" |

Each was shown in both the action state and the deliberate-silence state, because a
composition that looks broken when the honest answer is "nothing requires attention" would
be disqualifying, and that is invisible if a variant is only ever shown its best case.

All three passed the automatable pre-selection checks: the full ten-second payload, one best
move with no alternatives, silence as a conclusion, absence of every prohibited construct,
five mobile destinations, and the 375 × 812 budgets. The choice was therefore a genuine
judgement about composition, not a choice between one compliant option and two broken ones.

## Decision

**Variant B — Console — is the primary command surface.** Variants A and C, and the
temporary selection gallery, are deleted. Only Console is expanded.

Its defining properties, which are now controlling:

- **Hierarchy:** parallel panels rather than a narrative. State, what changed, trajectory,
  and the untreated path are readable at once; the decision panel is the widest and is the
  only panel carrying accent treatment.
- **Density:** high, deliberately. Compact leading, small-caps labels, monospace values.
- **Typography:** `ui-monospace` for values and series, system sans for prose. Small-caps
  label rails at 0.62rem with wide tracking.
- **Surface:** layered bordered panels on the canvas — an instrument reading, not cards
  floating in space.
- **Navigation:** segmented bar on a phone, left rail on desktop.
- **Expression:** terse and labelled. Facts before sentences.

### The owner's constraint, adopted as a rule

> Preserve the compact high-information style, but prevent it from drifting into a crowded
> generic dashboard.

This is the central risk of the variant that was chosen, and it is now a standing
constraint rather than a note. Concretely, for Console:

1. **The decision panel always leads and is never displaced.** On every viewport the Now
   surface opens with the decision — one best move, one high-value question, or deliberate
   silence. Panels that describe the situation follow it. A layout where the answer is
   below the evidence is the Briefing variant, not this one.
2. **Panel count on Now is capped at five.** More panels is the exact mechanism by which a
   console becomes a widget wall. Anything further belongs in a destination.
3. **Every panel answers a named question.** A panel that exists to fill grid space is
   removed. This is the same rule the graph policy applies to charts, applied to panels.
4. **No panel renders in a normal operational state.** Storage health, sync status, and
   similar appear only when actionable (`UX-011`).
5. **Density serves reading, not volume.** Compactness is spent on making more *decision-
   relevant* content legible at once — never on fitting more widgets.

### Measurable budgets adopted

The owner named the representative device: **their Samsung phone, with 375 × 812 CSS pixels
as the repeatable test viewport.** All `UX-005` budgets are measured against it.

| Budget | Threshold | How it is tested |
|---|---|---|
| Decision-critical content | First viewport, or one short scroll | Automated at 375 × 812: the decision panel's top edge is within the first viewport |
| Normal quick check-in | ≤ 5 responses, target ≤ 60s | Deferred to Phase 4, when check-ins exist |
| Start / decline / postpone from Now | ≤ 2 taps | Automated: primary and secondary actions are reachable without navigating |
| Evidence detail, full "What changed", full category overview | ≤ 1 interaction | Automated: reachable in one click from Now |
| Mobile persistent navigation | ≤ 5 destinations | Automated |
| Normal operational state | 0 dedicated panels | Automated: no status panel unless a problem state is active |
| Horizontal scrolling | None | Automated at 375 × 812, per element, offenders named |
| Touch targets | ≥ 44 × 44 CSS px | Automated, offenders named |
| Text zoom | Usable at 200% | Automated: decision still present, no horizontal overflow |
| Cached local startup | Useful visible state ≤ 3s | **Owner-measured on the Samsung phone.** CI hardware cannot produce an honest number. |

**No budget was tightened or relaxed.** The plan's defaults are adopted as written.

## Rationale

Console is the variant whose strengths align with what this product is for. The Constitution
requires that the useful intelligence stay *visible rather than buried*, and Console is the
only one of the three that shows the state, the change, the trajectory, and the untreated
path without any disclosure step. Variant C put four of those behind folds; Variant A put
the answer below them.

Its density is also the closest fit to the approved visual family, which asks for a
"compact, high-information, calm, readable, professional, energetic" surface. Briefing was
calm but not high-information; Focus was high-impact but low-information.

The risk is real and was named up front. That is precisely why the anti-dashboard rules
above are written into this ADR rather than left to taste — the failure mode of this choice
is gradual, and a gradual failure needs a written line to check against.

## Alternatives considered

**Variant A — Briefing.** Rejected. Its prose-led composition is genuinely more pleasant to
read, but the decision arrives after the situation, which costs a scroll on the phone that
matters most. It also scales badly: as more evidence becomes visible in Phases 4 and 5, a
linear narrative grows downward and pushes the answer further away.

**Variant C — Focus.** Rejected, and the closest call. It is the strongest ten-second
surface of the three and would likely win a first-impression test. But four of the required
elements sat behind disclosure, and the Constitution's language is explicit that the useful
intelligence must be visible rather than buried. Choosing it would have meant arguing that a
fold is not burial — an argument that gets weaker every phase as there is more to show.

**A hybrid of B and C.** Rejected as a process failure. Merging after the fact would
discard the thing the comparison was for: three coherent compositions, each internally
consistent. Console can adopt a larger decision panel without becoming Focus, and that is
covered by rule 1 above.

## Consequences

### Positive

- Every element of the ten-second contract is visible without an interaction.
- Density scales into Phases 4 and 5, where there is materially more to show.
- The panel model maps cleanly onto the canonical record families — each panel has one
  question and one source.
- The desktop rail supports all six destinations without a second pattern.

### Cost or limitation

- **It is the easiest of the three to ruin.** Every future phase adds content, and each
  addition is a small pull toward the widget wall. The five-panel cap is the guard.
- Compact type demands care at 200% zoom; this is tested, not assumed.
- Monospace values are excellent for series and times and poor for prose — the split has to
  be maintained deliberately.
- Two variants were discarded. That is the intended cost of the method.

## Privacy and security impact

None directly. The surface renders explicit synthetic view models and reaches no storage.
The Data & Privacy destination created in this phase is a static synthetic view; it gains
real storage health, backup, and export behaviour in Phase 6.

## Canonical data and storage impact

None. No production intelligence and no storage access exists in this phase (`LEAN-001`).
The view models are hand-written and typed independently of the canonical records, so the
interface cannot accidentally depend on record shapes before Phase 4 wires them.

## Intelligence impact

Sets the output contract Phase 4 must satisfy. The Now surface renders exactly one of three
things — one best move, one high-value question, or deliberate silence — so the engine has
no way to surface a ranked list even if it computed one (`PROD-005`, `INTEL-006`).

It also fixes what the engine must produce alongside a recommendation: material-change
detection, an untreated forecast with horizon and assumptions, effects decomposed by
category with direction and timing, North Star relevance, a confidence label with its
reasoning, and a reason trace. The surface has a place for each, and an empty place would be
visible.

## User-experience impact

Console becomes the shell. Six logical destinations, five persistent on mobile with Learning
and Data & Privacy under More. Facts and inferences are labelled in words and differ in
border treatment, never by colour alone. Benefits and costs appear in the same table, never
netted.

## Testing required

- **Phase 3:** all thirteen interaction states render; the decision leads on every viewport;
  no prohibited construct in any state; five mobile destinations; category overview within
  one interaction; every chart carries its question, window, missing-data treatment, and text
  summary; budgets pass at 375 × 812 and at 200% zoom.
- **Phase 4:** the surface never invents content the structured engine did not produce.
- **Phase 10:** visual-quality and compactness audit against the anti-dashboard rules above.

## Deferred future work

- Partial execution, declined action, graceful return after absence, check-in, evidence, and
  timeline states — Phase 6, "full selected-design states".
- Cached-startup measurement on the Samsung phone — after the shell is deployed.
- Component-test library and router — with the expanded shell as it gains real routing.
- Numerical category scores — remain prohibited until the score gate can be satisfied with
  real evidence, which a synthetic prototype cannot do.

## Reversal strategy

The surfaces are presentational and read from typed view models in `src/ui/view-models/`.
Replacing the composition later means rewriting `src/ui/features/` against the same view
models, without touching the domain, application, or infrastructure layers.

Reversing the *selection* — adopting A or C after Phase 4 builds on Console — would be far
more expensive, because the engine's output contract is shaped by what this surface needs.
That is the intended weight of the decision, and why it was made against a live build on the
owner's own device rather than from screenshots.
