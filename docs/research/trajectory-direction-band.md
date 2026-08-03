# Research card — the trajectory direction band

**Rule ID:** `TRAJECTORY-FOCUSED-HOURS`
**Requirements:** `INTEL-002`, `UX-008`
**Status:** Unproven transparent baseline
**Written:** Phase 4

## The decision it supports

Whether the untreated path is worth acting against this week. If focused hours are declining,
the forecast says so and the decision layer weighs a focus action more heavily. If they are
stable, there is usually nothing to push against.

## The rule

Sum observed focus blocks per ISO week. Compare the most recent week carrying evidence
against the mean of the prior weeks that carry evidence. Call it **improving** or **declining**
when the difference exceeds **15 percent**; otherwise **stable**.

Fewer than three weeks with evidence returns `insufficient-evidence`, and the confidence label
agrees with it.

## Why 15 percent

It is a **stated convention, not a finding**, and it is labelled as such everywhere it
appears.

The reasoning: a band has to be wide enough that ordinary week-to-week variation does not
read as a trend, and narrow enough that a real slide is caught before the goal window closes.
Against the synthetic series in the harness, roughly 6.5 → 5.0 → 3.5 hours, a 15 percent band
identifies the decline on the third week rather than the second — late enough not to fire on
noise, early enough to be actionable.

**No external evidence supports this number**, and none is claimed. There is no literature on
this person's focus variance, and population-level findings about work patterns would not
transfer to a single individual's calendar.

## Required data

Observations with `attribute: focused-block-minutes` and a duration value. Nothing else. In
particular the rule does **not** need self-reported productivity, mood, or output quality, and
deliberately does not use them — they would make the metric a judgement rather than a count.

## What it does not claim

- It does not say more focused hours are better. It reports direction, and the interface
  states the direction in non-moral language.
- It does not adjust for week length, holidays, or life-context changes. Phase 5's
  context-change detection is what makes older weeks non-comparable; Phase 4 cannot.
- It does not extrapolate. That is a separate rule, in a separate module.

## False-precision risk

**Moderate, and mitigated structurally.** The obvious failure would be showing "focused hours
down 23 percent" — a number that sounds measured but rests on a convention and a small count.
The interface therefore shows the *word* (declining), the underlying series, and the
confidence label, never the percentage. The band lives in code and in this card, not on screen.

## User burden

Low, but real: the rule is only as good as the consistency of recording. A week where the user
simply forgot to log sessions is indistinguishable from a week where they did not work
focused. This is why a week with no evidence is a **gap**, never a zero — the rule refuses to
treat absence as a low value.

## What would count as being wrong

- Direction flips between adjacent weeks with no behavioural change, meaning the band flags
  noise.
- The user reports that a "declining" call did not match their experience, repeatedly.
- Recording consistency changes and the rule reads it as a behaviour change.

## Test strategy

`tests/unit/engine.test.ts` covers: abstention below three weeks; gaps never rendered as zero;
direction computed from the harness series; and the confidence label agreeing with the
direction when evidence is insufficient.

## Personal validation requirement

Phase 5 evaluates whether declared direction matched the following weeks. Until several such
windows have closed, this rule cannot rise above `moderate-evidence`.

## Retirement condition

Retire or replace when forecast evaluation shows the band flags noise as direction, or when
Phase 8 demonstrates a better-calibrated rule that is still explainable.
