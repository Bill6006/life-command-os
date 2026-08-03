# ADR-0003: Local deterministic logic is the intelligence authority

## Status

Accepted — 2026-08-03, Phase 0

## Context

The product's core claim is that it can be trusted to say what it knows, what it is
guessing, and what it does not know. That claim is only defensible if the reasoning can be
inspected, tested, and reproduced.

A large language model is the obvious shortcut for a system that must explain a situation
and suggest an action. It is also structurally incompatible with several constitutional
requirements: it cannot guarantee that an inference is not presented as an observed fact, it
produces confident language regardless of evidence quality, it cannot be tested
deterministically, and — decisively — it cannot process private life data without that data
leaving the device.

This decision must be made in Phase 0 because it determines whether the intelligence layer
is testable at all, which shapes every phase from 4 onward.

Requirements: `INTEL-001`, `INTEL-002`, `INTEL-005`, `PRIV-003`, `TEST-001`.

## Decision

**The authoritative reasoning system is local, structured, deterministic, and testable
without judging prose.**

Every user-visible conclusion — state assessment, forecast, predicted effect,
recommendation, question, silence, confidence label, "what changed" explanation, and
category overview — is produced by structured local logic operating on validated canonical
records, and carries a reason trace.

**Optional external AI is disabled and out of scope.** It may be reconsidered only through
post-release change control, and only under all of these conditions:

- the owner explicitly enables it;
- the exact information leaving the device is previewed before it leaves;
- the application remains fully useful without it;
- it may **only** explain or summarize already-structured results;
- it may not invent evidence, change confidence, create hidden recommendations, or bypass
  canonical validation.

External AI becoming required or authoritative is a universal stop condition.

Additionally: begin every intelligence problem with the **simplest transparent baseline**.
Model complexity is added only after a real comparison proves meaningful improvement
(Phase 8), and a complex candidate that does not beat its baseline is rejected.

## Rationale

Determinism is what makes the honesty rules enforceable rather than aspirational. "An
inference is never displayed as an observed fact" is a testable invariant when a typed
`InferredStateRecord` cannot be substituted for an `ObservationRecord`. It is an unverifiable
hope when the output is generated prose.

The same applies to abstention. `INTEL-005` requires that unsupported conclusions abstain.
Structured logic can encode explicit abstention conditions and be tested against sparse,
stale, and contradictory synthetic fixtures. A language model's default behavior under thin
evidence is to produce fluent output anyway.

Determinism also makes the Phase 4 scenario harness meaningful: the same synthetic inputs
must produce the same recommendation, silence, or question, every time. Without that, no
gate in Phases 4, 5, or 8 can be demonstrated honestly.

And local processing is what keeps the privacy boundary real. Private life data is exactly
the data class that must not leave the device.

## Alternatives considered

**LLM as the primary reasoning engine.** Rejected. Fails determinism, testability,
abstention, the observed-versus-inferred separation, and the privacy boundary
simultaneously. No amount of prompting makes these guarantees structural.

**Hybrid: deterministic engine, LLM for user-facing explanation prose.** Rejected for now,
and explicitly reserved as the only future path. Even constrained to phrasing, it introduces
a component that can overstate confidence, imply causation the engine did not compute, or
soften an abstention into a suggestion. Deferred to post-release change control, where the
guardrails above would be enforced.

**Local small language model running in-browser.** Rejected. Solves privacy, not
determinism, testability, or calibration — and adds substantial bundle size against a
3-second startup budget.

**Statistical or machine-learning models from the start.** Rejected as a starting point, not
in principle. The Constitution requires the simplest transparent baseline first; Phase 8
exists precisely to adopt complexity where evidence justifies it. Starting complex means
never learning whether complexity was needed, and forfeiting explainability before earning
anything with it.

## Consequences

### Positive

- Every conclusion is reproducible and can be unit-tested against synthetic scenarios.
- Reason traces are real derivations, not post-hoc narration.
- Abstention and deliberate silence are implementable and verifiable.
- No private data leaves the device for reasoning.
- No inference cost, no API dependency, no rate limits, and full offline function.
- Phase 8 has a genuine baseline to measure candidates against.

### Cost or limitation

- **Explanations will be more mechanical than generated prose.** Phrasing quality must come
  from careful copy design, not fluency.
- Every rule must be authored, justified through just-in-time research, and tested. This is
  slower than prompting.
- The system will be blunter under thin evidence — it will say "insufficient evidence"
  where a language model would produce something plausible-sounding. This is the intended
  behavior, and it is a real usability cost.
- Handling genuinely unstructured input (free-text notes) is limited to what structured
  logic can extract.

## Privacy and security impact

**Decisive.** No life data leaves the device for reasoning. No API keys, no external
endpoints, no request logs, no third-party retention, no prompt-injection surface reachable
via the owner's own private data.

If external AI is ever enabled through change control, the preview-before-send requirement
and the "fully useful without it" requirement keep the owner in control of every disclosure.

## Canonical data and storage impact

The canonical model is the intelligence layer's only input, which raises the stakes on
`DATA-001` (concept separation) and the record envelope: provenance, freshness,
supersession, and decision-episode links must be rich enough for structured logic to reason
correctly, because there is no model to paper over gaps.

Intelligence **reads validated projections and does not write to storage directly**. All
writes go through the application command layer.

## Intelligence impact

This ADR defines the intelligence layer. Directly required:

- explicit targets, horizons, assumptions, uncertainty, and reason traces on every forecast
  (`INTEL-002`);
- predicted intervention effects structurally separate from untreated forecasts
  (`INTEL-003`);
- constraint-first decision selection with safety filtering before ranking (`INTEL-004`,
  `SAFE-001`);
- internal candidate comparison with exactly one output exposed (`INTEL-006`);
- explicit abstention conditions per rule (`INTEL-005`);
- confidence derived from evidence dimensions, never decorative (Product Constitution §16).

## User-experience impact

- Reason traces shown to the user are the actual derivation, so "why this?" is always
  answerable.
- Confidence labels are honest, which means the interface must be designed to make
  "Insufficient evidence" feel like competence rather than failure.
- Copy design carries the weight that generated prose would otherwise carry — a real design
  burden in Phase 3 and Phase 4.
- The application works fully offline with no degraded "AI unavailable" mode.

## Testing required

- **Phase 4:** deterministic scenario harness covering cold start, weekly direction proposal
  and quiet week, material change, stable state, sparse evidence, stale evidence,
  contradictory evidence, overload, protected time, competing commitments, mixed effects,
  one valuable question, deliberate silence, and changed context. Identical inputs must
  produce identical outputs.
- **Phase 4:** unsupported forecasts abstain; predicted effects stay separate from untreated
  forecasts; no competing-recommendation menu is reachable.
- **Phase 5:** forecast-accuracy and recommendation-effectiveness evaluations remain
  separate; missing outcomes stay unresolved.
- **Phase 10:** calibration, abstention, deliberate-silence, context-drift, and confounding
  review; verification that external AI remains disabled.

## Deferred future work

- Just-in-time research cards — Phase 4, per consequential rule only.
- Model-candidate registry and tournament — Phase 8, only when a real problem has at least
  two real candidates and enough evidence to compare them. Never manufactured to justify
  complexity.
- Optional external AI explanation layer — post-release change control only, under the
  guardrails above.

## Reversal strategy

Adding an optional explanation layer later is possible without disturbing this decision,
because the deterministic engine remains authoritative and the layer would consume its
structured output. That is an additive change, gated by change control.

Reversing the decision — making a model authoritative — is not a refactor. It would
invalidate the honesty guarantees, the test strategy, and the privacy boundary
simultaneously, and would require reopening the Product Constitution.
