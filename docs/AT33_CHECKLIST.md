# AT33 acceptance checklist — v3.3 Acceptance Test Amendment

Every scenario in the governing amendment, where it is discharged, and what it exercises.

`unit` = `tests/unit/at33Acceptance.test.ts` unless another file is named.
`browser` = Playwright, run in one process against the production build.

| ID | Status | Test file | Primary behaviour exercised | Pass |
| --- | --- | --- | --- | --- |
| AT33-001 | implemented | unit + `production-v33a.spec.ts` | New York reads EDT, not UTC | pass |
| AT33-002 | implemented | unit | Same zone answers differently either side of DST | pass |
| AT33-003 | implemented | `v33sectionb.spec.ts` | Check-in cards at 375px | pass |
| AT33-004 | implemented | `v33sectionb.spec.ts` | No giant empty card around small copy | pass |
| AT33-005 | implemented | unit + `production-v33a.spec.ts` | A question output carries the shown prompt's id | pass |
| AT33-006 | implemented | unit | Exactly one output per episode, across every scenario | pass |
| AT33-007 | implemented | unit | Every emitted question can change something | pass |
| AT33-008 | implemented | `production-v33a.spec.ts` | Re-render adds one Timeline entry | pass |
| AT33-009 | implemented | `production-v33a.spec.ts` | Two genuine events stay distinct | pass |
| AT33-010 | implemented | unit + `v33sectionc.spec.ts` | Fresh profile can record a direction | pass |
| AT33-011 | implemented | unit + `v33DirectionAndDrift` | Revision keeps old version and its dates | pass |
| AT33-012 | implemented | `v33sectionb.spec.ts` | Weekly Direction controls change visible state | pass |
| AT33-013 | implemented | `v33sectionb.spec.ts` | A quiet week is deliberate, not stale | pass |
| AT33-014 | superseded | unit | See note 1 | pass |
| AT33-015 | superseded | unit | See note 1 | pass |
| AT33-016 | superseded | unit | See note 1 | pass |
| AT33-017 | implemented | unit + `v33sectionb.spec.ts` | Now supplies decision, minimum, confidence — no number | pass |
| AT33-018 | implemented | unit | No invented numeric effect in any scenario | pass |
| AT33-019 | implemented | unit | No pattern claims a numeric range | pass |
| AT33-020 | implemented | `v33sectionb.spec.ts` | Direction stays compact with all areas on | pass |
| AT33-021 | implemented | unit | Manage Areas is an enabled-count when closed | pass |
| AT33-022 | implemented | `v33sectionb.spec.ts` | Review uses badges, not a score wall | pass |
| AT33-023 | implemented | `v33sectionb.spec.ts` | A chart with no evidence is not drawn | pass |
| AT33-024 | implemented | `v33sectionb.spec.ts` | Learning leads with what was learned | pass |
| AT33-025 | implemented | unit | No `Help me right now` on any surface | pass |
| AT33-026 | implemented | unit + `moveCatalogue` | 113 authored, all active, each `distinctBecause` | pass |
| AT33-027 | implemented | unit | No duplicate sentence reaches the owner — **defect fixed, note 2** | pass |
| AT33-028 | implemented | unit | A just-completed move is not re-offered | pass |
| AT33-029 | implemented | unit | A move that would undo a completed one is blocked | pass |
| AT33-030 | implemented | unit + `v33Learning` | Same move differs by context without duplication | pass |
| AT33-031 | implemented | unit | Prerequisite held back, then released | pass |
| AT33-032 | implemented | unit + `v33Learning` | Next-morning outcome unresolved on completion | pass |
| AT33-033 | implemented | unit + `v33Learning` | No causal wording can be emitted | pass |
| AT33-034 | implemented | unit + `v33Experiments` | Effectiveness and sustainability stay separate | pass |
| AT33-035 | implemented | unit + `v33Experiments` | Lifecycle needs a run in either direction | pass |
| AT33-036 | implemented | `v33DirectionAndDrift` | Context change discounts, deletes nothing | pass |
| AT33-037 | implemented | unit | Trace has steps, `wouldChangeIt`, and the alternatives | pass |
| AT33-038 | implemented | unit + `v33DirectionAndDrift` | Correction supersedes; observation survives | pass |
| AT33-039 | implemented | unit + `v33Experiments` | Bounded experiment with a stop condition | pass |
| AT33-040 | implemented | unit | A second experiment is refused | pass |
| AT33-041 | implemented | unit | Retest needs a named material change | pass |
| AT33-042 | implemented | unit + `v33FoodRoutineContext` | Near bedtime, stopping wins — through `runEpisode` | pass |
| AT33-043 | implemented | unit + `v33FoodRoutineContext` | Usual and actual bedtime stay distinct | pass |
| AT33-044 | implemented | unit | Opportunity cost turns on what is actually displaced | pass |
| AT33-045 | implemented | unit | Forbidding ≠ recording ineffective | pass |
| AT33-046 | implemented | unit | Prerequisite captures interrupt and expire | pass |
| AT33-047 | implemented | unit | Every capture declares triggers and suppression | pass |
| AT33-048 | implemented | unit + `v33FoodRoutineContext` | Qualitative food, no calories, no causation asked | pass |
| AT33-049 | implemented | unit + `v33FoodRoutineEvidence` | Routine learned; no chore manager in the code | pass |
| AT33-050 | implemented | unit | Budget exhausted ⇒ nothing further; a scenario is silent | pass |
| AT33-051 | implemented | unit | High-stakes downside blocks experimentation | pass |
| AT33-052 | implemented | `repairPass.test.ts` | Prompt 9 repair behaviours still covered | pass |
| AT33-053 | implemented | unit + `v33FoodRoutineContext` | Health and career in the shared capture registry | pass |
| AT33-054 | implemented | `console-shell.spec.ts` | 44×44 targets, 200% zoom, no sideways scroll | pass |
| AT33-055 | implemented | unit + gate run | Rule versions recorded; full gate below | pass |

**Implemented: 55 of 55.** Three are discharged as superseded, named below rather than
skipped.

## Note 1 — AT33-014, AT33-015, AT33-016 are superseded

All three govern a **time-budget / guide-depth selector**: that it must offer `Not sure`,
must not preselect 30 minutes, and must replace `Full` with an explicit meaning.

Owner clarification 1 supersedes them. Guide depth is not a control at all, and the
`15/30/45/Full` selector was **removed** rather than relabelled — length is derived from
decision value, coverage cadence, existing evidence and marginal value. A scenario about
the correct options for a control that no longer exists cannot be satisfied on its own
terms.

They are discharged by proving the stronger property: the selector is gone, and the one
question that survives (`context:available-minutes`) is an ordinary observation that
allows `Not sure` and can change candidate eligibility. This is recorded here rather than
quietly dropped.

## Note 2 — a real defect found by AT33-027

Writing the scenario surfaced a live bug rather than confirming existing behaviour. Two
open commitments each produced their own `unblock:<commitmentId>` candidate, and both
rendered the identical sentence "Send the one message that unblocks it". Deduplication
upstream matches on candidate *identity*, which is correct for arbitration and wrong for
display: distinct moves internally, one repeated line on screen.

`supportingWins` now also matches on the text actually shown. It deliberately does **not**
compare against the primary's *minimum version*: two catalogue moves legitimately share one
("One sentence"), and suppressing a genuinely different move over a cosmetic near-miss would
cost the owner a useful option.
