# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.1 Contextual Capture Amendment** (supersedes v3.0 for remaining work)
- Current phase: **Phase 7 — framework and three domain slices complete, all reachable.**
  Slices 8E–8H outstanding.
- Current prompt: PROMPT 8D v3.1 (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8D requirement and every contextual-capture metadata
  rule passes. Verified on the production build from a genuinely fresh profile at
  375×812.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Official milestones with source and version* — carried on every answer, in the
    record, permanently.
  - *Personal skill progression* — seven positions on a support ladder, reported, never
    computed.
  - *Dad actions stored separately from child status* — structurally: no action carries a
    milestone id, a status, or a level.
  - *Meaningful moments* — one Quick Capture write, offered only while the area is on.
  - *Today's Tiny Lesson* — why it matters, minimum version, observable follow-up,
    stopping point.
  - *Zero or one candidate* — four branches, ending in silence.
  - *One subordinate domain move* — asserted.
  - *Update This Area* — its own questions, and a morning check-in that is unchanged.
  - *Stage and timeline only where valid* — and a **percentage refused** with its reason.
  - *Observable outcomes* — participation, support, completion, interference.
  - *Enable and disable through Manage Areas* — without deleting history, proved on the
    production build.
  - *Contextual-capture metadata* — nine declarations, validated at import, with the
    placement rules enforced rather than documented.
  - *No child scoring and no privacy leak* — asserted against the rendered production
    build, and the repository carries no child's name.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — and no data at all; the app
  starts empty and the scenario corpus is not in the production bundle.

## The decision this slice turned on

**A denominator exists, and the number must still not be shown.**

Health refused a meter because health has no total to be a fraction of. Career earned one
because "claims with evidence, out of claims made" has a denominator the owner defined.
Fatherhood is the case where the eligibility rules could have been satisfied: eight
milestones, six skills, a countable number of yeses. The percentage would compute cleanly.

It would also be a score for a child.

So `fatherhoodVisuals` passes `hasValidDenominator: false` deliberately, and the refusal is
rendered with its reason rather than left as an absence. That is the one output this domain
must never produce, and the code says so where the next person to read it will see it.

## Work completed

- **Two ladders that never merge.** An official checklist answer is one family; a personal
  skill reading is an ordinary observation. Nothing takes both.
- **`MilestoneObservationRecord`**, the 25th family, carrying `checklistSource` and
  `checklistVersion` with every answer — so replacing the list later leaves earlier
  answers meaningful.
- **Five reportable statuses**, including "was doing it, not now". *Not assessed* is the
  absence of a record and is rejected by the schema.
- **A seven-position support ladder** — not introduced, exposed through play, practising
  with daddy, needs support, doing sometimes, doing often, uses on her own.
- **Five Dad actions**, closed and written out in full, none of which can touch her status.
- **Six Tiny Lessons**, one per tracked skill, each with a reason, a minimum version, an
  observable follow-up, and a stopping point.
- **Meaningful moments** through the shared Quick Capture path, offered only when the area
  is on, classified `child`.
- **One candidate**, by a four-step order that ends in silence — including the branch that
  stops having a view and names who should.
- **A stage path for one skill and a timeline of moments**, and a **refused percentage**.
- **Contextual-capture metadata**, the v3.1 addition: nine declarations with a validator
  that refuses milestone review on a guide, a triggered question with no decision value,
  an incomplete follow-up, and a child question that allows work focus.

### Decisions worth naming

- **A milestone answer never supersedes.** Every other repeated answer in this product
  replaces the last. "Not yet" in March and "yes" in June are both true, and the change
  between them is the only developmental information in the pair — superseding would
  delete the one thing worth keeping.
- **The support ladder is not an achievement ladder.** "Needs support" sits above
  "practising with daddy" because attempting something and needing help is further along
  than being shown it.
- **The Blueprint's checklist is not reproduced.** The built-in list is plainly worded and
  written here, attributed to what it is — "General guidance (built in)". The feature is
  not the list; it is that the source and version travel with the answer.
- **Fatherhood actions are not blocked by `family` or `caregiving`.** Every other domain
  treats those as protected. These are precisely the contexts in which a Dad action
  belongs.
- **The candidate never keys off the checklist.** It reads a skill the owner chose to
  practise. Turning someone else's list of what is typical into a to-do list for a parent
  is how a supportive tool becomes a source of pressure.

## Files created or modified

Created (11): `src/domain/records/fatherhood.ts`;
`src/domain/fatherhood/{development,actions,capture,routing}.ts`;
`src/domain/capture/{contextualCapture,registry}.ts`;
`src/application/commands/milestone.ts`;
`src/intelligence/domains/fatherhood/{index,assessFatherhood,fatherhoodCandidate}.ts`;
`tests/unit/fatherhood.test.ts`;
`tests/e2e/{fatherhood,production-fatherhood}.spec.ts`

Modified: `domain/records/{index,categories}.ts`; `domain/prompts/definitions.ts`;
`domain/domains/definitions.ts`; `intelligence/index.ts`;
`intelligence/state/categorySummaries.ts`; `intelligence/guides/planGuide.ts`;
`application/commands/guideSession.ts`;
`ui/features/respond/RespondSurfaces.tsx`; `ui/features/shell/AppShell.tsx`;
`ui/view-models/present.ts`; `app/scenarios.ts`; `playwright.config.ts`;
`tests/fixtures/records.ts`; `tests/unit/{records,domains,areas}.test.ts`;
`tests/e2e/{domains,production-areas}.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 450 passed**, up from 396. 54 new for the slice.
- **Browser: 393 passed**, up from 359. 34 new — 14 against seeded state on desktop and
  mobile, 6 on the **production** build from a fresh profile.
- Covers all fourteen required proofs: milestones and personal skills separate; Dad
  actions unable to mutate child status; no percentage or score renderable; one moment
  reaching every projection from one record; a Tiny Lesson with an action-linked
  observable follow-up; milestone prompts absent from the daily guides; metadata
  declaring timing, trigger, privacy, suppression, follow-up, and expiration; duplicate
  entry paths producing one canonical event; Skip and Unsure without penalty; prohibited
  causal questions rejected; enable–update–disable–reload–re-enable preserving data; Now
  compact with no domain dashboard; a fresh production profile enabling the area through
  Manage Areas; and no real child name in tracked files or production evidence.
- **Two real defects found and fixed rather than tested around.**
- **The first was found only on the deployed build.** Update This Area asked "how much
  help did she need" and "have you seen her do this", and stored both under attributes
  nothing reads — so the panel said "nothing recorded here yet" immediately after the
  owner had recorded something. A level with no skill and a status with no milestone are
  not readable facts. Each question now has a "which one" step before it, the pair is
  combined into one canonical record on save, and the selection is consumed rather than
  stored. The production test now reads the panel after answering, which is the only
  check that could have caught this — counting records would not have.
- **Making the metadata load-bearing fell out of the same fix.** `planGuide` collected a
  domain's questions by namespace, so fatherhood's action follow-ups were asked inside
  Update This Area with no action to follow up. The declared `owningSurface` now decides,
  which shortened the flow to seven questions and made the contextual-capture declarations
  do real work rather than describe intentions.
- **The second:** `categorySummaries` ended
  in a fallback branch that applied **career's** focused-hours reading to any category it
  did not recognise. Activating `fatherhood-and-child` put "losing ground on focused work"
  under a heading about a two-year-old. The branching is now exhaustive by assignment, so
  activating a category without writing its summary is a type error.
- **One copy change the tests forced:** the refusal originally read "a figure could be
  calculated…". "Could be" is on the speculation list this domain is checked against, and
  narrowing the check to let my own wording through would have been the wrong fix. The
  sentence is blunter now.
- Five older assertions were correct failures from activating the domain: the family
  count, the domain-content list, and three that used fatherhood as a stand-in for an
  unbuilt area. Availability flipped on its own — fatherhood became switchable purely by
  having its update prompt, with no list edited anywhere.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- **No child's name in source, fixtures, tests, scenarios, docs, commits, or build
  evidence.** The display name is owner data on the owner's device; the fixture uses the
  literal string `Placeholder`, and the domain falls back to "your daughter".
- Everything this slice captures is classified `child` and excluded from AI exports unless
  explicitly included.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records), ADR-0008 (the five-panel cap on Now), and the Prompt 8A framework contracts.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/records/fatherhood.ts`** — `MilestoneObservationRecord`.
- Active requirement: tasks 1–2.
- Why smaller was insufficient: an answer against a checklist is meaningless without which
  list and which revision. In an attribute string those are beyond validation and beyond
  query.

**2. `domain/fatherhood/`** — the ladders, the closed action set, the lessons.
- Active requirement: tasks 3–6.
- Why smaller was insufficient: the same device as `domain/health/actions.ts`, for a
  related reason — a generated parenting suggestion is one template away from telling a
  father his daughter should be doing something by now.

**3. `domain/capture/contextualCapture.ts`** — the metadata contract and its validator.
- Active requirement: Master Plan v3.1 §9, Phase 7 shared rules 14–19.
- Why smaller was insufficient: 8E–8H all declare this metadata and Phase 8 orchestrates
  it. Putting the contract inside the fatherhood folder would force a move; leaving the
  placement rules as prose would leave them unenforced.

**4. `domain/capture/registry.ts`** — the aggregation Quick Capture reads.
- Active requirement: task 5, placement rules.
- Why smaller was insufficient: the alternative is a component with a list of domain names
  in it, which is exactly the coupling the shared framework removes.

## Known limitations

- **Four domains remain unimplemented.** Emotional and relationships (8E), faith (8F),
  home (8G), money (8H).
- **A domain panel and its category overview have similar names.** With fatherhood on,
  Direction shows "Fatherhood and child development" (the slice's reading) beside
  "Fatherhood & child development" (the shared category summary). True of health since 8B.
  They answer different questions and both are useful, but the labels are close enough to
  be momentarily confusing. Worth resolving in Phase 8, which owns the surface.
- **The built-in checklist is a starting point, not an authority**, and configuring an
  owner-supplied source is supported by the record but has no interface yet.
- **Triggered questions are declared, not scheduled.** The metadata says when a question
  becomes relevant; nothing yet acts on it. That is Phase 8 by design.
- **The concern branch keys off a milestone answer**, so a worry the owner never recorded
  against a checklist item does not reach it.
- **No cross-domain synthesis yet.** Fatherhood competes in the same comparison as
  everything else.
- **Cached startup is still unmeasured.** Bundle is ~181 kB gzipped, up from ~175 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; `frame-ancestors` unenforceable on Pages;
  Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided.

## Deferred work

| Deferred | Activates |
| --- | --- |
| Emotional state, social, and relationships | Prompt 8E |
| Faith and meaning | Prompt 8F |
| Home and environment | Prompt 8G |
| Money | Prompt 8H |
| Contextual-capture orchestration across domains | Phase 8 |
| Cross-domain synthesis, full Can't Now regeneration, strategic review | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts | Phase 10 |

## Blockers

**None blocking Prompt 8E.** Two owner decisions carried forward, neither blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean,
   and this slice adds no name anywhere. A history rewrite and force-push would remove the
   historical occurrence entirely.

## Next permitted prompt

**PROMPT 8E — Phase 7 domain slice: Emotional state, social, and relationships.**

Three slices have now run through the shared framework and answered its central question
three different ways: health refused a meter for want of a denominator, career earned one,
and fatherhood refused one that would have computed. 8E inherits the contextual-capture
contract, which is where its hardest problem lives — a question about a relationship
arriving at the wrong moment is worse than not asking it.
