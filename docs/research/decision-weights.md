# Research card — comparison weights and the interruption threshold

**Rule ID:** `DECISION-CONSTRAINT-FIRST`
**Requirements:** `INTEL-004`, `INTEL-006`, `SAFE-001`, `PROD-002`
**Status:** Unproven transparent baseline
**Written:** Phase 4

## The decision it supports

The one thing worth doing now — or the decision not to interrupt at all. This is the product's
central output, so it is the rule that most needs to be inspectable.

## The structure, which matters more than the numbers

**Filtering happens before ranking, and cannot be outscored.**

1. Safety — high risk or irreversible actions are removed.
2. Protected contexts — a clash removes the action.
3. Non-negotiable commitments — a conflict removes the action.
4. Time — the minimum useful version must fit the window plus five minutes of margin.
5. Capacity — depleted rules out anything over 15 minutes; low, over 30.

Only survivors are compared. This ordering is a Constitution requirement, not an optimisation:
an unsafe or ineligible action must be *impossible* to recommend, no matter how attractive its
expected benefit.

## The weights

| Factor | Points |
|---|---|
| Linked to an active goal with no recorded progress | +3 |
| Linked to an active goal | +2 |
| Expected benefit: large / moderate / small / unknown | +3 / +2 / +1 / 0 |
| Friction: moderate / high | −1 / −2 |
| Reversibility: partially / irreversible | −1 / −3 |
| Fits the window with margin | +1 |
| Carries a moderate or larger cost | −1 |

**Interruption threshold: 3.** Below it, the engine emits deliberate silence.

## Why these numbers

They are **stated conventions**, and the full working is shown to the user in the reason
trace — "+3 relevance to an active goal, +2 expected benefit (moderate), −1 friction". That
visibility is the point: the user can disagree with the arithmetic because they can see it.

The relative ordering encodes three judgements worth defending:

- **Goal relevance outweighs raw benefit.** An action that moves something the user said
  matters beats a marginally larger benefit that serves nothing they named.
- **Irreversibility is punished harder than friction.** Friction costs effort; irreversibility
  costs options. In practice irreversible actions are already removed by the safety filter, so
  the weight is a second line rather than the first.
- **The threshold is deliberately conservative.** The product prefers silence to noise. A
  threshold of 3 means an action needs at least goal relevance plus a real benefit, or a large
  benefit on its own, before it is worth interrupting for.

## Why not a learned ranking

There is nothing to learn from. No recommendation has been executed and observed, so any
weighting derived from data would be derived from no data. Phase 8 is where a learned or
alternative ranking can be compared against this baseline — and it will have to beat it on
calibration, usefulness, safety, burden, privacy, and explainability, not just accuracy.

## What it does not claim

- The weights are not measured utilities. They are an ordering.
- The score is **never shown as a score**. It appears only as the working inside a reason
  trace, attached to words.
- Rejected candidates are recorded in an internal audit trail and are never rendered
  (`INTEL-006`). There is no code path that surfaces them.

## False-precision risk

**Moderate.** A score is a number, and numbers invite over-reading. Mitigations: it is never
displayed as a figure on its own, never compared across episodes, and never described as a
confidence or a probability.

## What would count as being wrong

- Phase 5 effectiveness evaluation shows the ranking systematically picks worse actions than a
  simpler rule.
- Silence fires so often the product is useless, or so rarely it becomes noise.
- The user consistently declines the top-scored action and does something the engine rejected.

## Test strategy

`tests/unit/engine.test.ts` covers: protected-context removal happening before ranking;
minimum-version-plus-margin filtering; capacity ceilings; silence below threshold; exactly one
output in every scenario; and the audit trail never leaking into the output.
`tests/e2e/console-shell.spec.ts` covers the same at the interface: at most one primary action,
in every scenario.

## Personal validation requirement

Phase 5 evaluates recommendation effectiveness — and **only for recommendations that were
actually carried out**. A declined recommendation produces no evidence about whether it would
have helped (`LEARN-002`).

## Retirement condition

Retire when effectiveness evaluation shows the ranking picks worse actions than a simpler or
different rule, or when Phase 8 finds a candidate that meaningfully beats it without costing
explainability.
