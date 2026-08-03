# Visual Direction and Design-Selection Process

**Status:** Approved and controlling (`UX-001`)
**Approved family:** Luminous Dark Command Surface
**Design ADR:** reserved as **ADR-0008**, authored in Phase 3 after owner selection

Interaction rules, budgets, and primary-surface prohibitions are defined in
[Product Constitution §12](../PRODUCT_CONSTITUTION.md#12-owner-approved-interaction-rules)
and are not restated here.

---

## 1. The approved family

**Luminous Dark Command Surface.**

- deep navy or blue-black canvas rather than pure black;
- layered blue-charcoal surfaces with clear separation;
- cyan or teal primary action and intelligence accents;
- restrained violet and warm-gold secondary accents;
- crisp off-white primary text and cool muted secondary text;
- controlled glow, edge light, and gradients **only where hierarchy benefits**;
- compact, high-information, calm, readable, optimistic, professional, and energetic.

The character to preserve is **dark but energized** — a command surface, not a mood.

## 2. Starting tokens

Adjustable only for measured accessibility and device rendering. These are starting values,
not final semantic tokens; semantic tokens are formalized in Phase 3 after selection.

| Role | Value |
|---|---|
| Canvas | `#07111F` |
| Surface 1 | `#0C1929` |
| Surface 2 | `#11243A` |
| Elevated | `#17304B` |
| Border | `#25415D` |
| Text primary | `#F4F8FC` |
| Text muted | `#A9BED2` |
| Cyan | `#28D7E5` |
| Teal | `#19C3B1` |
| Violet | `#8B7CFF` |
| Warm gold | `#F2C75C` |
| Success | `#45D483` |
| Warning | `#FFB45C` |
| Danger | `#FF7082` |

## 3. What to avoid

Gray gloom · pure-black flatness · low-contrast mud · red-heavy atmosphere · uncontrolled
neon · cyberpunk clutter · game-dashboard styling · generic administrative dashboards ·
giant low-information cards · crowded widget walls · one giant overall Life Score ·
universal 0–100 category-score grids without individually justified meaning · habit-streak
grids on the primary surface · decorative "AI brain" or intelligence imagery · normal-state
"system status" panels · decorative AI filler.

## 4. Accessibility baseline

Required of every implemented surface:

- semantic HTML;
- keyboard operation;
- visible focus;
- appropriate labels;
- sufficient contrast;
- text resizing;
- reduced-motion support;
- **no color-only status** — facts and inferences must be distinguishable without color
  (`UX-002`);
- mobile-sized touch targets;
- screen-reader announcements for save, error, offline, and restore states;
- accessible chart summaries;
- plain-language alternatives to model terminology.

## 5. Presentation contracts

### 5.1 Action projection

Before an action is taken, expected effects may be shown in a compact form such as:

```text
Career growth:        moderate positive
Confidence:           small positive
Recovery:             small cost
Family time:          neutral under current timing
Sleep:                neutral if completed before 7:30 PM
North Star direction: positive
Evidence:             early signal from comparable situations
```

**Benefits and costs must be visible together.** Numerical effects are permitted only when
the metric is defined, evidence-backed, and understandable. Do not invent meaningless
precision.

### 5.2 Progressive disclosure

| Tier | Content |
|---|---|
| **Visible immediately** | Current understanding; what materially changed and why; trajectory; one best recommendation or silence; predicted category effects; major costs and risks; reason; confidence; one useful trend when relevant |
| **Within one interaction** | Full enabled-category overview; detailed category breakdown; historical charts; evidence records; similar past episodes; assumptions; expected-versus-actual comparisons; belief changes; what could change the recommendation |
| **Internal, never surfaced** | Database structure; traceability IDs; model-candidate registries; raw calibration calculations; internal candidate comparison and rejection reasoning; test evidence; source registries; technical provenance machinery |

Hiding machinery is never an excuse to hide evidence. Exposing evidence is never an excuse
to leak schema plumbing into the interface.

---

## 6. Phase 3 efficient design-selection process

The goal is to choose a design **without building three applications** (`LEAN-003`).

### 6.1 Before selection

1. Create **exactly three** meaningfully different high-fidelity variants of the **primary
   command surface only**.
2. Use **one shared neutral synthetic decision scenario** across all three.
3. Show each variant on one representative phone viewport and one representative desktop
   viewport — and nothing else.
4. Each variant must visibly communicate the full ten-second payload: current state;
   observed versus inferred; what materially changed and why; important trajectory;
   untreated path; one best move or deliberate silence with **no alternative list**;
   predicted positive, negative, delayed, uncertain, and cross-domain effects; North Star or
   goal relevance; confidence; short reason trace; one next interaction.
5. Variants must differ in **hierarchy, density, typography, surface composition,
   navigation, and expression** — not merely accent colors.
6. Publish the three variants to the existing GitHub Pages owner-preview URL, verify the
   live phone and desktop views, present that stable link, and **stop for explicit owner
   selection**.

**Do not** create every secondary state for all three variants.

### 6.1a The representative test device (owner-decided 2026-08-03)

| Budget input | Decision |
|---|---|
| Representative device | The owner's **Samsung phone** |
| Repeatable test viewport | **375 × 812 CSS pixels** |

Every `UX-005` budget is measured against this. The viewport is what makes the budget
repeatable in CI — `tests/e2e/design-variants.spec.ts` sets exactly 375 × 812 before
checking horizontal overflow and touch-target size, so the check does not depend on
whoever runs it. The physical device remains the authority for the 3-second cached
startup target, which cannot be measured honestly on CI hardware.

This resolves the open decision carried since Phase 1. It is recorded here now and is
restated in the design ADR (ADR-0008) at selection.

### 6.2 After selection, within the same phase

- record the selection in **one ADR (ADR-0008)**, including the named representative test
  device and any owner-approved budget adjustment with its repeatable test method;
- formalize semantic design tokens;
- build the accessible responsive shell from the selected variant;
- implement selected-design synthetic states for: action, silence, insufficient evidence,
  one question, what changed, mixed effects, weekly direction review, loading, empty,
  offline, error, locked, and recovery;
- implement the logical destinations Now, Timeline, Direction, Commitments, Learning, and
  Data & Privacy, with no more than five persistent mobile destinations;
- create the full enabled-category overview in Direction;
- create static synthetic views for expected category effects and **one** useful trend
  graph;
- verify the interaction budgets pass.

Remaining states — partial execution, declined action, graceful return after absence,
check-in, evidence, and timeline states — are completed in **Phase 6** under "full
selected-design states." This split is recorded so nothing is silently dropped.

### 6.3 No numerical category scores in the Phase 3 prototype

The score gate (Product Constitution §12.9) requires that *"the underlying evidence is
adequate and current enough for the displayed precision."* A Phase 3 prototype runs on
explicit synthetic view models with no production intelligence, so that condition cannot be
satisfied honestly.

**Decision: the Phase 3 prototype displays no numerical category scores.** Categories use
condition, trajectory, confidence, freshness, drivers, and meaningful domain metrics. The
score gate is revisited when real evidence adequacy can actually be demonstrated.

### 6.4 Phase 3 gate

- the owner explicitly approves one primary design;
- only the selected design is expanded;
- the ten-second synthetic comprehension test passes;
- the useful intelligence, including "What changed?", is visible rather than buried;
- only one best recommendation is shown; no competing recommendation menu exists;
- the weekly direction review does not require the user to invent a priority from a blank
  slate;
- the approved interaction budgets pass;
- the interface remains compact, accessible, dark but energetic, and non-generic;
- no overall Life Score exists;
- the full enabled-category overview is reachable within one interaction;
- mobile persistent navigation contains no more than five destinations;
- no habit-streak grid, giant low-information card stack, crowded widget wall, decorative AI
  imagery, normal-state system-status panel, or meaningless graph exists;
- **no production intelligence algorithm exists.**
