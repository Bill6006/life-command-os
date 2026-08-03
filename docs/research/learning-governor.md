# Research card — the learning governor and the confounding rule

**Rule IDs:** `LEARN-EVALUATE`, `LEARN-GOVERNOR`
**Requirements:** `LEARN-001`, `LEARN-002`, `LEARN-003`
**Status:** Unproven transparent baseline
**Written:** Phase 5

## The decision it supports

Whether the system has earned the right to state a personal claim, and how strongly.
Everything downstream — what it recommends, how confident it sounds — rests on this being
conservative.

## The rules

**Two evaluations, never combined.**
Forecast accuracy asks whether what was predicted happened. Recommendation effectiveness asks
whether following the advice helped. Separate functions, separate result types, no code path
averages them.

**Outcome windows.** An execution opens a window; it closes after seven days. Nothing is
evaluated before it closes. A window with no outcome after twenty-one days is *expired*, not
failed.

**Belief formation.** Two supporting resolved evaluations to state a belief; three to hold it;
**four clean prospective ones, with zero contradictions and zero confounding, to reach
`strong-personal-evidence`**.

**Confounding.** Each of these adds a factor: another action inside the same window, a
life-context change inside the window, partial execution. One factor is moderate risk, two or
more is high. **A high-risk episode cannot produce a `supported` verdict**, whatever the
outcome looked like.

**Narrow before weakening.** A contradicted belief is limited to the contexts where it held,
not denied. Retirement requires contradiction at least equalling support, and at least twice.

**Suspend, never delete.** A life-context change suspends a belief and names the change. The
evidence was real; it is simply no longer comparable.

## Why these thresholds

They are **stated conventions**, chosen to be conservative rather than because any study
supports them. The reasoning:

- **Two is the floor for saying anything.** A single episode is an anecdote, and the product
  should not repeat anecdotes back to the user as insight.
- **Four for the top label** is deliberately more than three. `strong-personal-evidence` is the
  only label that licenses causal-sounding language, and it should feel expensive.
- **Zero tolerance for contradiction or confounding at the top label** matters more than the
  count. Three clean episodes plus one confounded one does not reach it, and should not: the
  confounded episode is precisely the one that might be a coincidence.

## The failure mode this exists to prevent

A user protects a focus block, has a good week, and the system tells them protecting focus
blocks *works*. That inference is available after a single episode, sounds plausible, and is
very often wrong — the good week may have come from a quieter project, a colleague being away,
or nothing at all.

Every rule above is aimed at that specific failure: the counts, the confounding detection, the
prospective requirement, and the vocabulary split between "is associated with" and "reliably".

## Required data

Executions with a state, outcomes with a direction inside a closed window, and life-context
changes. Nothing else. In particular the governor does **not** consult how the user felt about
the recommendation — satisfaction is not effectiveness.

## What it does not claim

- **Association is not causation**, and the statement text says so below the top label.
- Volume is not quality. Four confounded episodes reach nothing.
- A belief is never evidence for itself; recomputation is from evaluations every time, so a
  belief cannot drift away from what supports it.

## False-precision risk

**Moderate.** The counts are visible, and a count invites over-reading — four supporting
episodes is not a sample. Mitigations: the confidence label is a word not a number, the
supporting and contradicting counts are shown side by side, and the uncertainty text on the
confidence graph states plainly that volume is not quality.

## User burden

The loop only closes if executions and outcomes are recorded. If the user records
recommendations but never outcomes, everything stays unresolved forever — which is the honest
result, and is shown as such rather than being quietly filled in.

## What would count as being wrong

- Beliefs form that the user recognises as coincidence.
- The top label is reached and then repeatedly contradicted.
- Suspension fires so often after context changes that no belief ever survives, meaning the
  suspension rule is too eager.
- Confounding is detected so aggressively that nothing ever reaches `supported`.

## Test strategy

`tests/unit/learning.test.ts` covers: the two evaluations staying separate; declining producing
`unresolved`; missing outcomes producing `unresolved`; confounded episodes unable to reach
`supported`; partial execution counted as a confounder; four clean prospective episodes
reaching the top label; two episodes not reaching it; state and forecast confidence never
reaching it at all; suspension preserving evidence; and belief history carrying a reason for
every change.

## Personal validation requirement

This is itself the validation machinery, so it cannot validate itself. What Phase 8 can do is
compare it against an alternative governor on calibration, burden, and explainability.

## Retirement condition

Retire or retune when beliefs that reach `held` or above are contradicted by the user's own
judgement more often than they are confirmed, or when the thresholds prove either so strict
that nothing is ever learned, or so loose that coincidences get through.
