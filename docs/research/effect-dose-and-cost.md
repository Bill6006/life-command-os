# Research card — effect magnitudes from dose and window share

**Rule ID:** `INTERVENTION-EFFECTS`
**Requirements:** `INTEL-003`, `INTEL-004`
**Status:** Unproven transparent baseline
**Written:** Phase 4

## The decision it supports

Whether the benefit of an action is worth its cross-domain cost. This is the tradeoff the Now
surface exists to show, so the rule that produces it is the one most likely to mislead if it
overreaches.

## The rule

For a candidate action:

- **Benefit** to its own category scales with dose against its minimum useful version.
  Three times the minimum or more is `large`; 1.8 times or more is `moderate`; otherwise
  `small`.
- **Cost** to time and capacity scales with the share of the free window consumed. 85 percent
  or more is `moderate`; below that, `small`.
- An action finishing within **15 minutes** of a protected boundary carries an additional
  **delayed, uncertain** effect on that context.
- If available time is unknown, the cost is reported as `unknown` magnitude and marked
  uncertain — never assumed small.

## Why coarse words rather than numbers

**No personal evidence for effect sizes exists.** Nothing has been executed and observed, so
any number would be a claim about a measurement nobody has taken.

Words like `small` and `moderate` are honest about their own resolution. "Improves focused
work by 12 percent" would be the single most misleading string the product could display, and
it would be trivially easy to generate.

## Why these thresholds

They are **stated conventions**, chosen so the words behave sensibly at the edges rather than
because any study supports them:

- The 1.8× and 3× dose bands mean the minimum version never reads as a large benefit, and a
  full-length session does.
- The 85 percent share threshold is the point at which an action leaves effectively no margin,
  which is when consuming the window becomes a real cost rather than a nominal one.
- The 15-minute boundary window is a judgement about overrun. It exists so that "this may eat
  into your protected evening" is said *before* it happens, and marked uncertain because it
  may not.

## Required data

The candidate's duration and minimum, the state assessment's available minutes, and the active
protected contexts. Nothing about the user's history, because none of it is validated yet.

## What it does not claim

- **Nothing here is causal.** These are predictions about an action not yet taken. A later
  outcome that matches does not confirm the mechanism.
- Effects are never netted. Benefit and cost appear in the same table as separate rows, and no
  code path combines them into a score.
- No effect is dropped for being uncertain. Uncertain effects are marked and shown.

## False-precision risk

**The highest of any rule in this phase**, which is why the mitigations are structural: coarse
vocabulary, no arithmetic on screen, uncertainty marked per effect, and an explicit `unknown`
magnitude when the input is missing.

## User burden

None directly. The rule consumes what is already recorded.

## What would count as being wrong

- Expected-versus-actual comparison in Phase 5 shows the dose bands do not track how much the
  user actually gets out of a block.
- The boundary-overrun effect fires constantly and is never borne out, training the user to
  ignore it.
- Costs are systematically understated, so the user keeps agreeing to actions they later
  regret.

## Test strategy

`tests/unit/engine.test.ts` covers: benefit and cost present together; cross-domain marking;
uncertain effects retained; and unknown magnitude when available time is unknown.

## Personal validation requirement

Phase 5 compares expected against actual effects once outcomes exist. Until then these are
predictions with no personal evidence, and the confidence label reflects that.

## Retirement condition

Retire when expected-versus-actual comparison shows the dose or share rules do not track
reality, or when enough personal evidence exists to replace conventions with observation.
