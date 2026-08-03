# Product Constitution

**Status:** Controlling
**Plan version:** 2.6 Lean Execution
**Applies from:** Phase 0 onward, without expiry

This document is the highest authority in the repository. Architecture, design,
requirements, and implementation are subordinate to it.

**Controlling order when statements appear to conflict:**

1. This Product Constitution
2. Lean Execution rules (Section 18 below)
3. Phase gates
4. Specialized architecture, privacy, storage, intelligence, UX, testing, and domain specifications
5. Templates and examples

---

## 1. Product identity

Life Command OS is a private, local-first personal decision-intelligence system for a
single owner on a single device.

It is **not** primarily a tracker, habit app, journal, motivational dashboard, chatbot, or
collection of disconnected life-category dashboards. Tracking and journaling may supply
evidence, but they are inputs, not the product.

The product exists to help one person:

1. understand the present moment;
2. distinguish what is known from what is inferred, stale, conflicting, or unknown;
3. recognize meaningful patterns and trajectories;
4. anticipate what is likely to happen if nothing changes;
5. compare realistic actions and their cross-domain effects;
6. select the best realistic move, or intentionally remain silent;
7. observe what actually happened;
8. evaluate forecasts and recommendations honestly;
9. learn conservatively from personal evidence;
10. become more useful while becoming less intrusive.

## 2. Ten-second opening contract

Within roughly ten seconds, the opening experience communicates:

| # | Element | Question it answers |
|---:|---|---|
| 1 | **Now** | What does the system believe is happening? |
| 2 | **Evidence status** | What is observed, inferred, stale, conflicting, or missing? |
| 3 | **What changed** | What materially changed since the last useful assessment, and why did the recommendation or confidence change? |
| 4 | **Trajectory** | What important pattern is developing? |
| 5 | **Untreated path** | What is likely if nothing materially changes? |
| 6 | **Decision** | Is action warranted? |
| 7 | **Best move** | What is the single best realistic action, when one is warranted? |
| 8 | **Effects** | What positive, negative, delayed, uncertain, and cross-domain effects are expected? |
| 9 | **Reason** | Why was this action selected? |
| 10 | **Confidence** | How strong is the evidence, and what could change the conclusion? |
| 11 | **Next interaction** | Act, adjust constraints, answer one material question, inspect details, or dismiss. |

The application must also be able to conclude:

> **Nothing requires attention right now.**

Silence is a valid intelligent output, not a failure state and not an empty state.

## 3. Greenfield mandate

This repository is a true rebuild. The prior application is not a codebase to refactor,
wrap, translate, modernize, or imitate.

The prior application may later be used **only** to recover product intent, identify
requirements worth reconsidering, identify failure modes that should not recur, and supply
private historical data through an optional quarantined one-way importer (Phase 9).

Do not copy old source code, storage shapes, formulas, scores, navigation, screen layouts,
naming, or architecture merely because they existed.

**A legacy feature has no automatic right to survive.**

## 4. Privacy boundary

The repository defines application code, schemas, documentation, tests, and neutral
synthetic fixtures. The owner's actual life data belongs in the running application's local
IndexedDB database.

Never place in tracked repository content, Git history, build artifacts, hosted preview
output, logs, screenshots, or committed prompts:

- real names, addresses, employers, account values, family details, health details,
  messages, schedules, or private notes;
- real backups or exported user data;
- credentials or secrets.

Additional rules:

- Do not log full canonical records or free-text private payloads.
- Do not place sensitive data in URLs.
- Keep external AI and remote analytics disabled unless separately and explicitly approved.
- Use neutral synthetic identities and invented values for all development and automated
  testing — permanently, including after Phase 6.

**Proportionality:** privacy protection must match project maturity. Do not build an
enterprise-grade PII-detection platform for an empty repository, and do not build a broad
custom detector that treats ordinary names or prose as an error.

## 5. Canonical intelligence concepts

The architecture keeps these structurally separate. Definitions live in
[GLOSSARY.md](GLOSSARY.md).

Observed fact · correction or supersession · contextual snapshot · inferred current state ·
trajectory · untreated forecast · candidate action · predicted intervention effect ·
recommendation · execution (executed, partially executed, not executed, unknown) · actual
outcome · forecast-accuracy evaluation · recommendation-effectiveness evaluation · learned
belief · life-context change · uncertainty and confidence · question and answer.

These may never be collapsed into one generic status or one overall Life Score.
Merging canonical concepts "for convenience" is a stop condition.

## 6. Intelligence honesty

- An inference is never displayed as an observed fact.
- Missing evidence remains unknown or unresolved — never zero, false, or failure.
- A recommendation that was not performed cannot be judged ineffective.
- A positive outcome after an action does not prove causation.
- Prediction accuracy and recommendation effectiveness are separate evaluations.
- Confidence comes from evidence quality, never from decorative precision.
- Historical associations must not become strong personal claims without prospective
  validation.
- Conflicting evidence must reduce confidence or narrow applicability.
- Old patterns must lose influence when circumstances change.
- The system may abstain and say it does not know.

## 7. Local-first reliability

The first production target is a responsive, installable Progressive Web App that works
without a network connection.

- **IndexedDB is the only authoritative store for canonical life data.**
- `localStorage` may contain only disposable, non-authoritative boot preferences. It may
  never become a life-data fallback.
- Derived views are projections. They may be deleted and rebuilt, and are never canonical
  truth.
- The application may not display "saved" until the authoritative transaction commits.
- Data must survive reloads, browser restarts, offline operation, upgrades, backups,
  restores, and fresh-profile recovery.

## 8. Decision quality over activity

The system optimizes for useful decisions — not engagement, streaks, screen density,
constant prompting, or maximum scheduled activity.

Recommendations must consider current capacity and energy; time and timing; active
commitments and dependencies; protected contexts; safety and reversibility; friction and
minimum viable dose; likely positive and negative effects; delayed effects; cross-domain
tradeoffs; North Star and current goals; interruption cost; and uncertainty.

**The preferred action is often the smallest action that captures most of the expected
benefit.**

## 9. Deterministic core and optional language layer

The authoritative reasoning system is local, structured, deterministic, and testable
without judging prose.

Optional external AI may later explain or summarize structured results **only** when the
owner explicitly enables it, the exact information leaving the device is previewed, the
application remains fully useful without it, and it cannot invent evidence, change
confidence, create hidden recommendations, or bypass canonical validation.

External AI becoming required or authoritative is a stop condition.

## 10. Safety boundaries

Life Command OS is decision support. It is not a substitute for professional medical,
legal, financial, or emergency services.

The system must not autonomously propose experiments involving medication changes,
dangerous health behavior, driving risk, self-harm, dependent-care risk, illegal activity,
substantial financial risk, or security-sensitive behavior.

Low-risk personal experiments must be voluntary, reversible, time-bounded, measurable, and
easy to stop. Unsafe actions are filtered **before** any ranking occurs.

## 11. User control

The user owns the data and the final decision. The product must support correction and
deletion; export and restore; visibility into what is known and inferred; visibility into
belief changes and supporting evidence; rejection, adjustment, postponement, or
constraining of recommendations; disabling optional external AI; offline use; graceful
return after absence; and enabling, disabling, or deprioritizing life domains without
corrupting history.

---

## 12. Owner-approved interaction rules

These rules are approved and controlling. They are not open design questions.

### 12.1 Cold start does not interrogate the user

- No broad "What matters most?" questionnaire.
- No forced ranking of life domains.
- No requirement to declare a priority before the system can help.
- Use known commitments, capacity, goals, enabled domains, and available observations.
- Ask **at most one question at a time**, and only when the answer could materially change
  state interpretation, safety, candidate eligibility, recommendation, or confidence.
- Remain honest when evidence is insufficient.

*(`UX-007`)*

### 12.2 The system proposes the weekly direction

An optional compact weekly review runs at a user-selected day and time. The **system
proposes** one weekly direction or a **deliberately quiet week**, derived from all enabled
domain evidence, current capacity, protected obligations, active commitments, recent
outcomes, changed context, and upcoming risks.

The user may confirm, adjust, or reject the proposal. The user is never required to invent
the priority from a blank slate.

A weekly direction guides daily decisions but never overrides safety, protected
responsibilities, changed evidence, or the right to remain deliberately quiet. When a
direction changes, the reason is preserved without moral scoring.

*(`INTEL-007`)*

### 12.3 One best recommendation only

Candidate actions may be generated, scored, and compared **internally**. The interface
presents exactly one of:

- one best recommendation;
- one high-value question;
- deliberate silence.

**Prohibited without exception:** alternative-recommendation carousels, ranked action
lists, comparison tables, "other options" menus, or any competing-recommendation surface.

When the user changes timing, capacity, constraints, or context, the engine **recomputes**
and presents one new best recommendation. It does not reveal the runners-up. Rejected
candidates remain internal reasoning artifacts.

*(`PROD-005`, `INTEL-006`)*

### 12.4 "What changed?" stays visible

The Now surface explains what materially changed since the last useful assessment and why
the recommendation or confidence changed, identifying the specific evidence, context,
commitment, capacity, or timing change responsible.

This is an explanation, not a changelog and not decoration.

*(`UX-004`, `INTEL-008`)*

### 12.5 Measurable interaction budgets

The selected design must adopt these as pass/fail budgets, each with a repeatable test or
review method.

| Budget | Threshold |
|---|---|
| Decision-critical content on a representative phone viewport | First viewport, or at most one short vertical scroll |
| Normal quick check-in | ≤ 5 responses; target ≤ 60 seconds; stable periods require fewer or none |
| Start / decline / postpone / "cannot now" from Now | ≤ 2 taps |
| Evidence detail, full "What changed?", full enabled-category overview | Reachable within 1 interaction |
| Mobile persistent navigation | ≤ 5 destinations |
| Normal operational state | 0 dedicated dashboard panels |
| Horizontal scrolling in normal phone flows | None |
| Interactive touch targets | ≥ 44 × 44 CSS pixels, unless a documented accessible equivalent |
| Text zoom | Usable at 200% with no loss of information or function |
| Cached local startup | Useful visible state within 3 seconds on the representative test device |

Decision-critical content means: current state, what changed, one best recommendation or
silence, major effects, reason, and confidence.

A budget may be tightened or adjusted **only** by explicit owner approval recorded in the
Phase 3 design ADR. The representative test device must be named in that ADR.

*(`UX-005`)*

### 12.6 Notifications are off by default

Notifications are disabled by default and are not required for the core product to work.

When later implemented — Phase 6 at the earliest, and only with honest platform support and
an active approved requirement — they must be:

- explicitly enabled by the user **per notification class**;
- reserved for time-sensitive, actionable situations whose expected value exceeds
  interruption cost;
- clear about why the alert matters now;
- respectful of quiet hours, protected contexts, and user-selected timing;
- easy to snooze, disable, or retime.

**Prohibited:** streak pressure, guilt language, engagement bait, and alerts triggered
merely because the application has not been opened.

If notifications are not implemented, record the reason and build no placeholder
infrastructure.

*(`UX-006`)*

### 12.7 There is no overall Life Score

No giant overall Life Score exists at any point in the product's life.

Category values may never be summed, averaged, or otherwise compressed into a total-life
score. Nothing in the product ranks the user's worth.

*(`UX-009`)*

### 12.8 Every enabled category gets an understandable overview

The full enabled-category overview lives in **Direction** and is reachable from **Now**
within one interaction. Now shows only the categories materially affected by the current
recommendation or change.

Each enabled category shows, when supported:

- current condition, in clear non-moral language;
- trajectory — improving, stable, declining, mixed, or insufficient evidence;
- confidence;
- evidence freshness;
- principal drivers of the current interpretation;
- one or more meaningful domain-specific metrics when available;
- what evidence would materially change the interpretation.

Legitimate domain-specific metrics include things like sleep duration, available time, debt
balance, completed learning evidence, workload, recovery observations, or forecast
accuracy. The overview must never imply that one category's number is directly comparable
with another's.

*(`UX-008`)*

### 12.9 Numerical category scores must pass a gate

A numerical score for an individual category is **optional**. It may appear only when all
nine conditions hold:

1. the construct being measured is explicitly defined;
2. the calculation and scale have documented meaning;
3. the underlying evidence is adequate and current enough for the displayed precision;
4. confidence and freshness are shown;
5. the user can inspect the principal inputs and explanation;
6. missing data does not silently become zero;
7. the number improves a real decision or understanding;
8. the score is not treated as moral worth, a ranking of people, or a cross-category
   comparison;
9. the score can be retired when it proves misleading or unhelpful.

When these conditions are not met, use condition, trajectory, confidence, freshness,
drivers, and real domain metrics instead of manufacturing a number.

*(`UX-009`)*

### 12.10 Mobile navigation is limited to five destinations

The logical information architecture has six destinations:

**Now · Timeline · Direction · Commitments · Learning · Data & Privacy**

On mobile, at most five may remain persistently visible. The default arrangement is:

**Now · Timeline · Direction · Commitments · More**

**More** contains Learning, Data & Privacy, and other infrequent controls. Desktop may
expose all six when space and comprehension allow.

*(`UX-010`)*

### 12.11 Primary-surface prohibitions

The Now surface is a decision surface, not a widget wall. Excluded from the primary
experience:

- **habit-streak grids** — consistency, adherence, frequency, or continuity may appear only
  in a routine or domain detail view, only when it answers a defined question, and never
  with shame, flames, streak-loss pressure, or engagement bait. Emphasis belongs on whether
  a routine appears useful, sustainable, and appropriate under current capacity — not merely
  whether it was repeated;
- **decorative AI imagery** — no "AI brain," intelligence iconography, or AI filler;
- **normal-state system-status panels** — never an "All systems operational" card;
- **crowded widget walls, giant low-information card stacks, unexplained score rings,
  decorative sparkline wallpaper, and meaningless graphs**;
- **an overall Life Score, or a universal 0–100 category-score grid** without individually
  justified meaning.

Operational status appears only when it is **actionable**: offline mode affecting a
requested action, stale or conflicting evidence, failed or overdue backup, storage quota
risk, interrupted migration, restore or recovery needed, or an optional service
unavailable. Otherwise it stays quiet.

*(`UX-011`)*

### 12.12 Graphs must answer a named question

Every chart must state the question it answers, its metric definition, its time window,
observed-versus-inferred content, missing-data treatment, uncertainty where relevant, and
an accessible text summary.

*(`UX-003`)*

---

## 13. Initial alpha scope

The first complete vertical slice (Phase 4) uses exactly three areas:

1. **Time, attention, and capacity**
2. **North Star, goals, commitments, and life seasons**
3. **Career, work, and learning**

This scope is large enough to prove the shared intelligence lifecycle end to end and useful
enough to produce real decisions, projections, effects, graphs, and a system-proposed
weekly direction.

The initial alpha must include the compact weekly review behavior defined in Section 12.2.

**This is not permission to hard-code three separate engines.** All three areas use shared
canonical records and shared intelligence contracts. No area-specific schema is created for
them.

## 14. Later domain expansion

Additional domains are added **one at a time**, each through its own Phase 7 run, in an
order the owner chooses based on usefulness:

- meaning, values, faith, or philosophy;
- health, sleep, body readiness, and recovery;
- emotional regulation and mental well-being;
- parenting, caregiving, and family;
- relationships and social connection;
- money and financial resilience;
- home, environment, and logistics.

A domain may be activated only when it defines all twelve items: the user decision it
improves; canonical observations and records; privacy classification; safety boundary;
intelligence inputs and outputs; uncertainty behavior; effect categories and cross-domain
costs; compact UI contract; transparent baseline; synthetic acceptance scenarios;
requirement IDs and tests; and specialist-app boundary where applicable.

Do not create a domain merely as a dashboard, form, decorative score, or parallel database.

**Domain guardrails.** Meaning and values: no theological judgment, moral score, or shame.
Health and recovery: no diagnosis, treatment claims, medication-change suggestions, or
dangerous experiments; route urgent concerns to real-world support. Emotional well-being:
no clinical labeling or fake certainty; crisis behavior stays separate from normal
recommendation ranking. Parenting and caregiving: no moral parent score or risky
dependent-care experiments. Relationships: no manipulation, pressure, ranking of people, or
inference of another person's private mental state. Career and learning: no inflated skill
claims or productivity-at-all-costs optimization; distinguish completed content from
demonstrated capability. Money: no investment, debt, or tax claims without current explicit
data and appropriate boundaries; keep financial facts separate from financial stress. Home
and logistics: no unnecessary location tracking or unsafe equipment instructions. Time and
capacity: no infinite optimization, no guilt for unfilled time, no assumption that busyness
equals progress.

## 15. Visual direction

The approved visual family is the **Luminous Dark Command Surface**. Its character, tokens,
prohibitions, accessibility baseline, and the Phase 3 selection process are recorded in
[docs/design/VISUAL_DIRECTION.md](design/VISUAL_DIRECTION.md).

*(`UX-001`, `UX-002`)*

## 16. Evidence and model discipline

- Research activates **just in time**, when a consequential rule is about to be implemented
  — never in advance for unbuilt domains.
- Before any measurement, threshold, forecast, intervention effect, recommendation rule, or
  confidence rule becomes authoritative, define: the user decision it supports; target and
  horizon; relevant evidence and uncertainty; the simplest transparent baseline; failure and
  abstention conditions; safety and privacy boundaries; synthetic tests; how future personal
  validation could occur; and rollback or retirement conditions.
- The first implementation of any intelligence problem is the **simplest transparent
  approach** that can be tested honestly.
- Complexity is accepted only for meaningful improvement in usefulness, calibration, safety,
  burden, or stability. A complex candidate that does not beat its baseline is rejected.
- A pattern found in historical data may be shown as an association or early signal. It may
  not be presented as a strong personal causal belief until prospective evidence supports it.
- Marketing claims, unsourced blogs, search-result summaries, and generic AI output are
  never the decisive basis for a consequential rule.

**Approved user-facing confidence labels:** Insufficient evidence · Early signal · Moderate
evidence · Strong personal evidence.

*(`INTEL-005`, `LEARN-003`)*

## 17. Storage and real-data readiness

- IndexedDB is the sole canonical authority (Section 7).
- Phases 1–2 provide a basic **unencrypted synthetic** development export and restore.
- Phase 6, before any real private data, provides encrypted portable backups using
  established Web Crypto primitives — **never custom cryptography** — plus dry-run restore,
  integrity validation, fresh-profile recovery, and application lock where technically
  meaningful with honest stated limitations.
- **Meaningful real private data may not be entered until the Phase 6 gate passes.**
  `PROJECT_STATUS.md` carries an explicit runtime private-data readiness field.

*(`STORE-001`, `STORE-002`, `STORE-003`)*

## 18. Lean Execution rules

**Build useful behavior before building bureaucracy.** Machinery is not created before
there is behavior for it to govern.

Every implementation artifact must satisfy at least one of:

1. required by the current phase gate;
2. required by an active user-facing vertical slice;
3. necessary to protect canonical data integrity;
4. necessary to test current behavior;
5. required before real private data or production release.

Otherwise it is explicitly deferred in `PROJECT_STATUS.md`.

### 18.1 Pre-creation justification gate

Before creating any new abstraction, registry, dependency, service, generic component
family, adapter, infrastructure system, or background process, record:

- **the current approved requirement that uses it**, and
- **why a smaller direct implementation is insufficient.**

If no current requirement uses it, defer it. Do not implement it.

*(`LEAN-005`)*

### 18.2 Supporting rules

- No unused interfaces, factories, registries, dependency-injection layers, generic engines,
  event buses, plugin systems, abstraction hierarchies, or configuration frameworks
  (`LEAN-001`).
- Research, privacy, traceability, and model infrastructure activate only when their owning
  behavior exists (`LEAN-002`).
- UI variants are limited to the primary surface until one design is selected (`LEAN-003`).
- Domains are implemented one at a time after the first vertical slice (`LEAN-004`).
- **Dependency discipline:** before adding a dependency, record the active requirement it
  supports, why platform capabilities or existing dependencies are insufficient, its
  maintenance and privacy impact, and its removal strategy. Never add a dependency for
  hypothetical future use.
- **Just-in-time documentation:** specialized research, migration, security, and release
  artifacts are created when their owning phase begins.
- **Lean traceability:** every implemented behavior carries an approved requirement ID in
  its implementation and tests. A full generated repository-wide traceability report is
  required before release, not before the first working application. Unimplemented future
  scope requires no empty test placeholders.
- **Phase-sized commits:** each prompt performs only its named phase, avoids unrelated
  cleanup, runs the phase's tests, updates `PROJECT_STATUS.md`, reports files, dependencies,
  and deferrals, and stops at the gate.
- **A failed gate is repaired in its own phase.** It is never hidden beneath later work.

### 18.3 Do not implement for future readiness

Synchronization, native packaging, analytics, external AI, plugin systems, event buses,
dependency injection, and Web Workers are not implemented merely for future readiness. No
Web Worker until profiling shows a current intelligence operation blocks the interface.

---

## 19. Definition of product success

Life Command OS succeeds when it becomes more accurate, selective, transparent, and useful
over time while requiring **less** unnecessary input.

It should help the owner make better decisions than they would have made unaided, while
showing enough evidence and uncertainty to preserve trust.

---

## 20. Universal stop conditions

Stop the current phase immediately when:

- real personal information appears in tracked content or history;
- later-phase work begins early;
- an unused framework or speculative abstraction is being created;
- a domain is implemented without a defined decision target;
- canonical concepts are merged for convenience;
- `localStorage` becomes a life-data fallback;
- the UI writes directly to persistence;
- success is shown before transaction commit;
- missing information becomes zero or failure;
- confidence lacks an evidence basis;
- a recommendation exists only to keep the interface active;
- the interface exposes competing recommendation menus instead of one best recommendation;
- an overall Life Score is introduced;
- a numerical category score is introduced without a defined construct, transparent
  calculation, adequate evidence, confidence, freshness, and inspectable explanation;
- the primary surface becomes a habit-streak grid, decorative AI showcase, normal-state
  system-status panel, or crowded widget wall;
- mobile persistent navigation exceeds five destinations without an owner-approved
  accessibility reason;
- onboarding requires the user to rank domains or declare a priority from a blank slate;
- notification behavior uses guilt, streak pressure, inactivity bait, or bypasses protected
  contexts;
- a new abstraction, registry, dependency, service, or infrastructure system lacks a current
  approved requirement;
- external AI becomes required or authoritative;
- a complex model is adopted without beating its baseline;
- tests are weakened to preserve current behavior;
- three complete UI systems are being built before owner selection;
- private-alpha use begins before encrypted recovery is proven;
- a gate cannot be demonstrated honestly.
