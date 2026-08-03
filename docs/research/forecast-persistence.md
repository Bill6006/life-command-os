# Research card — persistence as the untreated forecast

**Rule ID:** `FORECAST-UNTREATED`
**Requirements:** `INTEL-002`, `INTEL-005`
**Status:** Unproven transparent baseline
**Written:** Phase 4

## The decision it supports

Whether the cost of interrupting the user is justified. "Nothing changes and this keeps
sliding" is a different situation from "nothing changes and it holds", and the user should be
able to see which one they are in.

## The rule

Carry the observed trajectory direction forward to the end of the current ISO week,
unchanged, and state the assumptions that make that valid.

## Why persistence

It is the **standard naive baseline** for a short-horizon series, and it is the honest
starting point because it claims almost nothing: things continue as they have been.

Every more sophisticated option was rejected for this phase:

- **Linear extrapolation** would put a number on the end of the week. There is no basis for
  that precision, and the number would be the most-quoted and least-supported thing on screen.
- **Any fitted model** needs more history than eight weeks with gaps, and would trade the one
  property that matters most here — being explainable in a sentence — for accuracy nobody has
  demonstrated.
- **Seasonal or day-of-week adjustment** requires knowing this person's rhythm, which is
  exactly what has not been established yet.

Persistence is also the baseline that Phase 8 will have to beat. Choosing something more
complex now would leave nothing honest to compare against.

## Horizon

**To the end of the current week, and no further.** The horizon is kept short deliberately:
persistence degrades with distance, and a one-week claim is one the user can check.

## Abstention

The forecast returns `unknown` with a reason when the trajectory reports insufficient
evidence. It does not hedge, and it does not produce a softened sentence.

This is the most important property of the rule. An unsupported forecast that reads plausibly
is worse than no forecast, because the user cannot tell the difference — and the whole product
rests on them being able to.

## Required data

The trajectory result, and the active goals in the same category so the projection can name
what is at risk. Nothing else.

## What it does not claim

- No confidence interval, because a number here would be invented.
- No causal claim. It says what continues, not why.
- Nothing outside the enabled alpha categories.

## False-precision risk

**Low by construction.** The output is a direction and a sentence. The assumptions are listed
on screen, and the uncertainty sentence states how many comparable weeks are behind it. There
is no figure to over-read.

## What would count as being wrong

- Forecasts are contradicted more often than supported once outcome windows close.
- A known upcoming change repeatedly makes persistence wrong, and the user has no way to tell
  the system about it. That would be an argument for recording it as a commitment, not for a
  more complex forecast.

## Test strategy

`tests/unit/engine.test.ts` covers: abstention when the trajectory is insufficient; empty
assumptions when abstaining; and the projection carrying the trajectory's direction when it is
supported.

## Personal validation requirement

Phase 5 evaluates forecast accuracy **separately from** whether any recommendation helped
(`LEARN-001`). A well-calibrated forecast says nothing about whether the advice was good.

## Retirement condition

Retire when forecast evaluation shows persistence is contradicted more often than supported,
or when Phase 8 shows a candidate that meaningfully improves calibration without losing
explainability.
