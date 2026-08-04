# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 3.0 Final
- Current phase: **Phase 7 — shared domain framework complete.** Domain slices 8B–8H
  outstanding.
- Current prompt: PROMPT 8A (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8A gate requirement is met.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *No parallel database exists* — seven domains, one `records` store. The only domain
    record family is `domain-preference`, which holds a preference and no content.
  - *No domain content is duplicated across canonical records* — a capture writes one
    event and `projectionsFor` returns **surfaces**, never records, so duplication is
    unrepresentable rather than merely discouraged.
  - *No domain can emit more than one candidate* — the limit is applied before
    comparison, and a rejected second candidate is reported rather than dropped.
  - *Now remains compact* — five panels maximum, decision first, and nothing about a
    domain reaches Now at all. Asserted with a domain switched on.
  - *No category score wall appears* — `DomainPanel` has no numeric field, and a test
    walks every field of a live panel asserting none is a number.
  - *Shared framework can be removed without breaking core records* — every domain
    defaults to off, `originDomainId` is optional everywhere, and the global decision is
    identical with a domain enabled.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — and no data at all; the app
  starts empty and the scenario corpus is not in the production bundle.

> **Service-worker note.** A returning visitor may see the previous build once; reload again.

## What Prompt 8A changed, and what it deliberately did not

It built the architecture seven areas of life will share, and switched none of them on.

**Nothing visible changed.** `Direction` shows exactly what it showed before, `Now` is
untouched, and the deployed app behaves identically. That is the correct outcome: a
definition is not an implementation, and enabling a domain before its slice exists would
put an empty panel in front of the owner and call it a feature. Each slice from Prompt 8B
switches on its own domain when it has something to say.

## Work completed

- **Domain metadata for the seven approved areas** — `domain/domains/definitions.ts`.
  What each reads, how it classifies its content, which capability channels it touches,
  which legacy capabilities it inherits, and what it must never build. No candidate
  generator, no panel content, no record family.
- **`DomainPreferenceRecord`** — the twenty-third canonical family. Whether an area is
  on is the owner's decision with a date and a reason, so it belongs in a backup. It
  carries no domain content, and it has no destructive state: turning a domain off
  appends a record and deletes nothing.
- **The shared panel contract** — twelve fields, one component, every domain. North Star
  contribution, condition, trajectory, confidence, freshness, drivers, bottleneck, what
  changed, strongest evidence, one optional move, Update This Area, and visuals.
- **The final candidate contract** — `intendedOutcome` and `observableFollowUp` are now
  **required** on `candidateActionRecord`, plus origin domain, bottleneck, North Star
  link, and capability effects.
- **One candidate per domain**, enforced before comparison and reported when exceeded.
- **Capability channels** — ten channels, six words, and no numeric field anywhere.
- **Prompt ownership** — exactly one surface owns each question, derived from the prompt
  id and checked.
- **Manual Domain Focus shell** — the owner's constraint, labelled as theirs.
- **Quick Capture plumbing** — one event, many projections, with duplicate detection.
- **Visual eligibility** — meter, line, bar, stage, timeline, evidence summary, each
  with a rule that can refuse, and eight declarations every visual must carry.
- **Legacy provenance** on the envelope, whose `evidenceClass` is the literal
  `legacy-heuristic` with no branch that promotes it.

### Decisions worth naming

- **A domain is a reading, not a store.** Every fact a domain shows comes from the same
  canonical records everything else uses, filtered by category. That is the single
  decision this whole prompt exists to make, and it is what stops the rebuild
  reproducing the twelve-tab app it replaced.
- **The capability effect type has nowhere to put a number.** Strict object, closed word
  sets, and no function anywhere that totals them. The moment such a function exists
  something will render it, and a wall of seven numbers is the score wall the gate
  forbids.
- **Routing returns surfaces, never records.** A function that returned records would be
  one refactor away from returning copies of them, which is exactly how the legacy app
  ended up with a work win stored in three places.
- **A rejected second candidate is loud.** A domain quietly losing half its output looks
  like a domain with nothing to say — the hardest kind of bug to notice.
- **Manual focus is labelled as the owner's choice.** Without the label, choosing a
  domain and receiving a recommendation is indistinguishable from the system
  recommending it — except the system judged it best *within a constraint the owner
  imposed*. The label is the feature.
- **A meter that cannot refuse is a meter that will render "Fatherhood 68%".** The
  eligibility rules exist for what they reject, not for what they allow.
- **`intendedOutcome` is required rather than optional.** An optional intended outcome is
  one most candidates eventually get written without, and an engine full of those learns
  nothing while appearing to.

## Files created or modified

Created (10): `src/domain/capabilities.ts`; `src/domain/domains/definitions.ts`;
`src/domain/records/domains.ts`; `src/domain/prompts/ownership.ts`;
`src/intelligence/domains/{registry,domainPanel,candidateLimit,manualFocus,captureRouting}.ts`;
`src/intelligence/visuals/eligibility.ts`; `src/ui/components/visuals.tsx`;
`src/ui/features/direction/{DomainPanelView,ManualFocusView}.tsx`;
`tests/unit/domains.test.ts`; `tests/e2e/domains.spec.ts`

Modified: `domain/records/{index,envelope,decision}.ts`;
`intelligence/{index,types}.ts`; `intelligence/intervention/candidateActions.ts`;
`application/commands/{decisionEpisode,guideSession}.ts`; `app/scenarios.ts`;
`ui/features/direction/DirectionSurface.tsx`; `ui/design-system/console.css`;
`tests/fixtures/records.ts`; `tests/unit/records.test.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 306 passed**, up from 259. 46 new for the framework.
- **Browser: 298 passed**, up from 284. 14 new across desktop and mobile.
- Covers: the seven domains registering no content family; every domain starting off; a
  newer preference superseding an older one with both records kept; no destructive
  preference state; deprioritised being readable and silent; a second domain candidate
  rejected and reported; a candidate record with no intended outcome failing validation;
  a numeric field on a capability effect failing to parse; benefits and costs partitioned
  without netting; the full twelve-field panel with no numeric field anywhere; a domain
  that reads nothing abstaining instead of inventing a condition; every domain move
  marked subordinate; manual focus labelled as the owner's; one capture routed to five
  surfaces as one record; duplicate captures detected; a meter refused over a construct
  with no denominator; the evidence summary never refusing; and the global decision being
  identical with a domain switched on.
- **One real defect found and fixed rather than tested around:** the candidate contract
  change made `intendedOutcome` and `observableFollowUp` required, which correctly broke
  the fixture and the persisted-decision path. Both were updated to supply real values
  rather than the requirement being softened to optional.
- Two older assertions were correct failures and were updated: the family count moved to
  23, and the "no domain-specific family" test was tightened to say *content* family and
  given an extra probe, since `domain-preference` is deliberately not one.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- Real personal data detected in tracked content: **NO**
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Domain-level privacy: every domain declares a default class, and captures inherit it —
  a fatherhood capture is `child` data whatever else it is.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. Prompt 8A is an application of decisions already recorded: ADR-0004
(boundaries), ADR-0005 (append-oriented records), ADR-0008 (the Console's five-panel cap,
which is why nothing about a domain reaches Now).

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/domains/` and `intelligence/domains/`** — the framework.
- Active requirement: `OWN-013`, `XDS-073`, Prompt 8A tasks 1–8.
- Why smaller was insufficient: seven areas either share one architecture or grow seven,
  and the second happens by default. The framework is the thing that has to exist before
  the first slice, not after the third.

**2. `domain/capabilities.ts`** — ten channels, no scores.
- Active requirement: `OWN-014`, `CI-015`, task 5.
- Why smaller was insufficient: cross-domain comparison needs shared vocabulary, and
  shared vocabulary without a structural ban on numbers becomes a score within a phase.

**3. `intelligence/visuals/eligibility.ts`** — what a representation has earned.
- Active requirement: `OWN-051`–`OWN-054`, `UX-003`, tasks 9–10.
- Why smaller was insufficient: the rules exist to *refuse*. A helper that only rendered
  charts would not have prevented a single one of the failures it is there to prevent.

**4. `DomainPreferenceRecord`** — the twenty-third family.
- Active requirement: task 1, Phase 7 gate ("one domain may be disabled without
  corrupting history").
- Why smaller was insufficient: enablement in a settings blob is data a restore drops.

## Known limitations

- **No domain is implemented.** Seven definitions, zero slices — by design, and the app
  looks identical because of it. Prompt 8B onwards.
- **The default panel contribution is deliberately thin.** With no slice, a switched-on
  domain summarises the shared category evidence it reads. That is honest and it is not
  domain intelligence; a slice replaces it.
- **`update-area:*` prompts do not exist yet.** Each arrives with its slice, and a test
  reports any enabled domain that lacks one — so a slice cannot ship an area the owner
  can read and cannot correct.
- **`legacyProvenance` is defined and unwritten.** Phase 9 writes it.
- **Fatherhood reads no category yet**, because no fatherhood category exists. It
  abstains rather than borrowing another area's records.
- **Cached startup is still unmeasured.** Bundle is ~160 kB gzipped, up from ~158 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; the regression suite runs against a
  bridge-enabled build with production covered by 14 dedicated tests;
  `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router;
  service-worker staleness; deletion semantics undecided.

## Deferred work

| Deferred | Activates |
| --- | --- |
| Health, recovery, and energy | Prompt 8B |
| Career, Azure, and learning | Prompt 8C |
| Fatherhood and Adaya | Prompt 8D |
| Emotional state, social, and relationships | Prompt 8E |
| Faith and meaning | Prompt 8F |
| Home and environment | Prompt 8G |
| Money | Prompt 8H |
| Cross-domain synthesis, full Can't Now regeneration, strategic review, optional model comparison | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts | Phase 10 |

## Blockers

**None blocking Prompt 8B.**

One non-blocking owner action carried forward: **measure cached startup on the Samsung
phone** and say if it exceeds three seconds.

## Next permitted prompt

**PROMPT 8B — Phase 7 domain slice: Health, recovery, and energy.**

It is the right one to go first: sleep, food, and readiness are already being captured
under time-and-capacity and classified as health data, so 8B gives evidence that already
exists a proper home rather than starting from nothing.
