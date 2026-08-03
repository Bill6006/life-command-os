# Glossary of Canonical Concepts

**Status:** Controlling
**Purpose:** make the canonical concepts unambiguous so they are never collapsed into one
another.

Merging any two of these "for convenience" is a universal stop condition. Phase 2 enforces
the separations below with invariants that make invalid substitutions **fail**, not warn.

---

## 1. Evidence and state

### Observation
A recorded fact about what happened or what was measured, with its source and provenance.

*Not:* an interpretation, a judgment, or a derived value. An inference may never be stored
or displayed as an observation.

### Observation correction
A new record that supersedes an earlier observation. The original is retained.

*Not:* an edit. Historical truth is never silently rewritten. Corrections **append and
supersede**.

### Context snapshot
The surrounding circumstances at a point in time — capacity, protected contexts, location
class, life season, and similar conditions that qualify how other records should be read.

*Not:* an observation about the user's performance, and not a state assessment.

### Inferred state
The system's interpretation of what is currently true, derived from observations, context,
and history. Always labeled as inferred, and always distinguishable from observed fact
**without relying on color alone**.

*Not:* an observed fact. Not a forecast.

### Trajectory
A characterization of how something is developing over time — improving, stable, declining,
mixed, or insufficient evidence.

*Not:* a prediction of a future value, and not a score.

---

## 2. Prediction

### Untreated forecast
What is likely to happen **if nothing materially changes**, for an explicit target over an
explicit horizon, with stated assumptions, uncertainty, and a reason trace.

*Not:* a prediction about what happens if the user acts. Not an outcome.

### Predicted intervention effect
The expected change attributable to a **specific candidate action**, represented separately
from the untreated forecast, and decomposed into positive, negative, delayed, uncertain,
and cross-domain effects independently.

*Not:* an untreated forecast. Not a measured outcome. Not proof of causation.

---

## 3. Decision

### Candidate action
A realistic possible action, described with timing, duration or dose, context, friction,
minimum viable version, fallback, stopping point, risk, and reversibility.

*Not:* a recommendation. Candidates are **internal**. Rejected and lower-ranked candidates
are never exposed to the user as a list, carousel, comparison table, or ranked menu.

### Recommendation
The single selected best realistic action presented to the user, with its reason trace,
expected effects, costs, North Star relevance, and confidence.

Exactly one of three things reaches the user at any time: **one recommendation**, **one
high-value question**, or **deliberate silence**.

*Not:* an execution. Not evidence that anything happened.

### High-value question
A single question asked only when its answer could materially change state interpretation,
safety, candidate eligibility, recommendation, or confidence.

At most one is asked at a time. Never a questionnaire, and never a domain-ranking exercise.

### Deliberate silence
A legitimate, intentional conclusion that no action warrants interruption right now.

*Not:* an empty state, a loading state, an error, or a failure to compute. Silence is a
first-class output and must be visibly distinguishable from "we have nothing."

### Decision episode
The linked chain from a state assessment through forecast, candidate evaluation, emitted
output, execution, and later evaluation. Records carry a decision-episode link so the chain
can be reconstructed.

### Weekly direction
One system-proposed focus for the coming week, or a **deliberately quiet week**, derived
from all enabled domain evidence, capacity, protected obligations, active commitments,
recent outcomes, changed context, and upcoming risks.

The user confirms, adjusts, or rejects it. The user is never required to invent it from a
blank slate. A weekly direction guides daily decisions but never overrides safety, protected
responsibilities, changed evidence, or deliberate silence.

*Not:* a goal. Not a commitment. Not a mandate.

---

## 4. What actually happened

### Execution
Whether and how the recommendation was carried out. Four distinct states:

| State | Meaning |
|---|---|
| Executed | Performed as recommended |
| Partially executed | Performed in part or in reduced form |
| Not executed | Deliberately not performed |
| Unknown execution | No reliable evidence either way |

*Not:* a recommendation. Not an outcome.

**Non-execution is never evidence that a recommendation was ineffective.** Declining,
postponing, or reporting "cannot now" must never be converted into
recommendation-effectiveness evidence.

### Outcome
What was actually observed within a defined outcome window after an execution.

*Not:* a causal effect. A positive outcome after an action does not prove the action caused
it.

**Missing outcomes remain unresolved.** They never become zero, false, or failure.

---

## 5. Evaluation and learning

### Forecast-accuracy evaluation
How well an untreated forecast matched what was later observed.

### Recommendation-effectiveness evaluation
Whether following a recommendation was associated with a better result than the untreated
path — computed **only when evidence permits**.

**These two evaluations are permanently separate.** A well-calibrated forecast says nothing
about whether the recommendation helped, and vice versa (`LEARN-001`).

Both preserve these states: supported · partially supported · contradicted ·
context-invalidated · unresolved.

### Learned belief
A conservative, revisable personal claim derived from accumulated evidence, carrying its
supporting evidence, applicability limits, confidence, and history of change.

Beliefs may be strengthened, weakened, **narrowed**, suspended, or retired. *A belief should
become narrower before it becomes stronger.*

Strong personal causal claims require prospective evidence. A historical pattern may be
shown only as an association or early signal until then (`LEARN-003`).

Activated in Phase 5. Not implemented before then.

### Life-context change
A detected change in circumstances significant enough to discount older patterns — a new
job, a new life season, a changed constraint, a changed capacity baseline.

Old patterns must lose influence when circumstances change.

---

## 6. Uncertainty

### Confidence
An evidence-grounded assessment of how much the conclusion can be trusted, and what could
change it.

Internal computation may be numerical. The **user-facing labels are exactly four**:

| Label | Meaning |
|---|---|
| Insufficient evidence | Not enough to conclude; the system abstains |
| Early signal | Suggestive, not established |
| Moderate evidence | Reasonably supported for this context |
| Strong personal evidence | Prospectively validated for this person |

Confidence dimensions include: amount of comparable evidence, recency, contextual
similarity, observation completeness, consistency, confounding risk, prospective validation,
context drift, execution fidelity, and missing-outcome rate.

*Not:* a decorative percentage. Confidence without an evidence basis is a stop condition.

### Evidence-status vocabulary

These are distinct and must not be conflated:

| Term | Meaning |
|---|---|
| **Known / observed** | Directly recorded with provenance |
| **Inferred** | Derived by the system; labeled as such |
| **Unknown** | No evidence exists |
| **Not applicable** | The concept does not apply in this context |
| **Stale** | Evidence exists but is too old to be relied on for this decision |
| **Conflicting** | Multiple credible records disagree |
| **Unresolved** | Awaited but not yet available — for example, a pending outcome |

**None of these may become zero, false, or failure.**

### Freshness
How recent the supporting evidence is, relative to what the current decision requires.
Freshness is shown wherever a category condition, trajectory, or score is shown.

---

## 7. Direction

### North Star
The owner's enduring long-term direction. Recommendations report relevance to it.

*Not:* a goal, and not a score.

### Goal
A specific intended outcome with a horizon, supported by evidence of progress.

### Commitment
An obligation or open loop the user has taken on. States tracked: active, scheduled,
waiting, blocked, postponed, delegated, completed, abandoned, expired, unclear.

Commitments constrain candidate eligibility before ranking occurs.

### Life season
A durable period with distinct constraints and expectations that changes how evidence should
be read.

---

## 8. Presentation

### Enabled category
A life area currently activated in the product. Every enabled category receives an
understandable overview: condition, trajectory, confidence, freshness, principal drivers,
meaningful domain-specific metrics when available, and what evidence would change the
interpretation.

### Numerical category score
An **optional** per-category number, permitted only when the nine-condition score gate in
Product Constitution §12.9 passes.

*Never:* summed, averaged, or compressed into a total. **There is no overall Life Score.**

### Material change
A change in evidence, context, commitment, capacity, or timing significant enough to alter
state, recommendation, or confidence. The Now surface explains it: **what changed, and why
the recommendation or confidence changed.**

*Not:* a changelog, and not a feed of every new record.

### Interaction budget
A measurable pass/fail limit on interface burden — viewport depth, check-in responses and
time, taps, touch-target size, text zoom, navigation destinations, startup time. Each has a
repeatable test method. See Product Constitution §12.5.

---

## 9. System

### Canonical record
An authoritative life-data record stored in IndexedDB with the full record envelope. The
single source of truth.

*Not:* a projection.

### Projection
A derived, rebuildable view over canonical records. **Never canonical truth.** Must be
deletable and deterministically rebuildable.

### Synthetic data
Neutral invented identities and values used for all development, fixtures, tests,
screenshots, and hosted preview content — permanently, including after Phase 6.

*Not:* anonymized real data. Real data is never the starting point.

### Gate
The demonstrable exit condition of a phase, recorded in `PROJECT_STATUS.md` as NOT STARTED,
YELLOW, GREEN, or RED. Work does not advance past a gate that is not GREEN, and a failed
gate is repaired in its own phase.
