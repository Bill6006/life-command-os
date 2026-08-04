# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
  (supersedes v3.1 for remaining work)
- Current phase: **Phase 7 — framework, three domain slices, and the 8D.2 bridge
  complete.** Slices 8E–8H outstanding.
- Current prompt: PROMPT 8D.2 v3.2 (complete)

**Prompt 8D.2 is a bounded Phase 7 bridge. It adds no numbered phase.**

## Gate status

- Status: **GREEN.** Every Prompt 8D.2 requirement passes, and every Prompt 8D behaviour
  it was required to preserve still passes.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *The full learning map is fast to scan* — six sections, everything relevant at once,
    one item updated without walking any other, and no typing required.
  - *Progression suggestions are evidence-backed, transparent, one-rung, and
    owner-approved* — three observations across two separate days, citing the records,
    labelled a suggestion, applied only on Approve.
  - *Age-band changes preserve history* — the band decides what is newly worth looking
    at, never what is true. Nothing is ever removed.
  - *Milestones remain separate* — their own family, their own section, out of every
    daily guide.
  - *No grading, scoring, or privacy leak* — asserted against the rendered production
    build; no birth date is stored anywhere.
  - *No owner-profile deletion* — verification runs in an isolated context. See below.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit and
  now reports plan version **3.2 Coverage and Learning Map**.
- Hosted build contains synthetic content only: **YES** — and no data at all; the app
  starts empty and the scenario corpus is not in the production bundle.

## The decision this bridge turned on

**Two interactions, both of them right, kept apart.**

A guide asks one question at a time because the app is deciding what is worth asking. A
learning map shows everything at once because the owner has deliberately opened it to see
where things stand and change the one or two that moved. Prompt 8D had only the first,
so updating one skill meant walking every question — the checklist this rebuild exists to
end, arriving through the back door.

Both now exist. `Update This Area` opens the map; "Take me through it instead" opens the
guided flow, unchanged. Neither replaced the other.

The second decision is what the map is *not* allowed to do with that reach. It can see
everything, so it could easily produce a total. It produces none: no grade, no score, no
percentage, no ranking, no comparison — and the two numbers it does expose count rows on
a page, not anything about a child.

## Work completed

- **A six-section learning map** — language and early reading, numbers and thinking,
  motor skills, social and emotional, independence and practical life, creativity and
  play — with twenty-seven skills, each carrying its source, version, and age bands.
- **Age bands chosen by the owner, with no birth date stored anywhere.** A date of birth
  is the most identifying thing this app could hold about a child; the band buys the same
  relevance in one tap.
- **Changing the band adds and never removes.** A skill that leaves the band is marked
  as kept from an earlier age band, keeps every observation, and is never called a gap.
- **Quiet by default**, with exactly four highlights: newly relevant, stale, recently
  changed, and possible progression.
- **Structured quick updates** — every control is a button; the only text field says
  "optional" and writes nothing when blank.
- **Evidence separated from declared level.** `father:skill:<id>` is what the owner says
  is true; `father:skill-evidence:<id>` is what he saw once. Both the map and the guided
  flow write the same evidence attribute.
- **A conservative progression rule** — three observations, two separate days, one rung,
  citing the records, withheld when a newer occasion disagrees.
- **Four responses, one of which writes.** Approve applies the rung; Keep current level,
  Review evidence, and Not now write nothing at all.
- **Official milestones untouched** — their own family, their own review, absent from
  every daily guide.
- **Plan and build metadata now report v3.2.**

### Decisions worth naming

- **Declining a suggestion records nothing.** It says something about the father's
  judgement, not about the child. Storing it would let a hesitation become a fact about a
  two-year-old.
- **There is no automatic downgrade, and no code path from evidence to a stored level.**
  A lower observation is real evidence, kept and shown; the app can say "this disagrees
  with the level you set" and stops there.
- **Three observations from one bath-time is one occasion.** The rule counts separate
  days, which is the stricter reading of "dates or occasions" and the honest one.
- **A completed Tiny Lesson is never mastery.** It is one occasion. Three across separate
  days is what a *suggestion* needs, and even then the owner decides.
- **Empty sections still render.** A heading with nothing under it is a true statement
  about the map; hiding it would make the page change shape as the child grows.
- **The scan page stays open after an edit.** `run()` gained a `stay` option: a guide is
  finished by answering it, but a scan page is somewhere the owner is working, and
  closing it after each change would make updating three things a matter of opening it
  three times.

## Files created or modified

Created (8): `src/domain/fatherhood/{learningMap,ageBands,progression}.ts`;
`src/application/commands/fatherhood.ts`;
`src/intelligence/domains/fatherhood/learningMap.ts`;
`src/ui/features/direction/LearningMapView.tsx`;
`tests/unit/{learningMap,learningMapCommands}.test.ts`;
`tests/e2e/{learning-map,production-learning-map}.spec.ts`

Modified: `domain/fatherhood/{development,routing,capture}.ts`;
`domain/prompts/definitions.ts`; `application/commands/guideSession.ts`;
`intelligence/domains/fatherhood/assessFatherhood.ts`;
`intelligence/domains/fatherhood/index.ts`; `ui/features/shell/AppShell.tsx`;
`ui/design-system/console.css`; `app/scenarios.ts`; `vite.config.ts`;
`playwright.config.ts`; `tests/e2e/{fatherhood,production-fatherhood,shell}.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 495 passed**, up from 450. 45 new for the bridge.
- **Browser: 428 passed**, up from 393. 35 new — 14 against seeded state on desktop and
  mobile, 7 on the **production** build in an isolated context.
- All twenty-one required proofs are covered: six sections render; every relevant skill is
  visible together; one item updates without walking the rest; structured controls need
  no typing; milestones and personal skills stay separate; an age-band change introduces
  new skills without deleting history; retained skills and observations survive it; three
  observations across two occasions suggest one rung; fewer cannot; contradictory newer
  evidence withholds the suggestion and names the disagreement; a progression is never
  applied without approval; Keep current level and Not now write nothing; no automatic
  downgrade exists; Tiny Lesson evidence supports without declaring mastery; one
  observation through two surfaces makes one canonical record; no letter grade, score,
  percentage, ranking, or comparison renders; sensitive milestone statuses stay out of
  ordinary guides; the domain survives reload, disable, and re-enable; Now stays compact;
  build metadata reports v3.2; and no child name or birth date appears anywhere.
- **One design defect found and fixed:** every write closed the map and returned to the
  console, so updating three skills meant opening the page three times. Found by the
  browser tests. `run()` now takes a `stay` option and the scan page keeps its place.
- Three older assertions were correct failures: the 8D tests opened the guided flow
  through "Update this area", which now opens the map. They go through "Take me through
  it instead" and assert the same things.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- **No child name and no birth date** in source, fixtures, tests, scenarios, docs,
  commits, or build evidence. The age band is a chosen range, not a date.
- Everything the bridge captures is classified `child`.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- **No owner profile was deleted or cleared.** Prompt 8D's verification cleared an
  IndexedDB to obtain a fresh profile and destroyed the records in it. v3.2 Part V makes
  that a stop condition; verification now runs in a throwaway browser context, and
  crossing a day boundary is done with Playwright's clock rather than by touching data.

## Architecture decisions

No new ADRs. The bridge applies decisions already recorded: ADR-0005 (append-oriented
records) and the Prompt 8A framework contracts. The scan-versus-guide separation is
recorded in `docs/REQUIREMENTS.md` §3j and in the architecture testing progression.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/fatherhood/learningMap.ts`** — the sectioned, age-banded map.
- Active requirement: Master Plan v3.2 §10, Prompt 8D.2 tasks 1–3.
- Why smaller was insufficient: a flat list cannot express which skills are relevant now,
  and the six-skill list could not carry sections, bands, or per-skill provenance.

**2. `domain/fatherhood/progression.ts`** — the suggestion rule.
- Active requirement: task 5.
- Why smaller was insufficient: the rule is read by the map, the commands, and the tests.
  A version of it inside the component would be untestable and would drift.

**3. `application/commands/fatherhood.ts`** — the four writes.
- Active requirement: tasks 1–6, `ARCH-001`.
- Why smaller was insufficient: the interface must not write, and the "approve applies
  exactly one rung, declining writes nothing" rule belongs where it can be tested against
  storage.

**4. `ui/features/direction/LearningMapView.tsx`** — the scan page.
- Active requirement: tasks 1, 3, 8.
- Why smaller was insufficient: a guide cannot show several independently editable items,
  and reusing the guide would have meant walking every question to change one.

## Known limitations

- **The built-in map is guidance, not authority.** Configuring an owner-supplied source
  is supported by the data model — every skill carries source and version — but has no
  interface yet.
- **Age bands are approximate and overlapping**, which is deliberate, but it means a
  child near a boundary shows a slightly wider set than strictly necessary.
- **A suggestion needs two calendar days.** An owner recording several occasions in one
  evening will see nothing until the next day. That is the rule working, but it is worth
  knowing before it looks like a bug.
- **Highlights are computed, not dismissible.** A stale skill stays marked until
  something is recorded; there is no "I know" control yet.
- **The duplicate panel/category naming remains.** Direction still shows "Fatherhood and
  child development" beside "Fatherhood & child development". Phase 8 owns the
  system-wide resolution, as the plan directs.
- **No Weekly Quick Domain Scan, cross-domain scheduler, monthly review, or AI coaching
  prompt** — all explicitly Phase 8.
- **Cached startup is still unmeasured.** Bundle is ~186 kB gzipped, up from ~181 kB.
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
| Weekly Quick Domain Scan, monthly review, forgotten-domain protection | Phase 8 |
| Contextual-capture orchestration across domains | Phase 8 |
| Duplicate panel/category label resolution | Phase 8 |
| AI review export prompt with coaching intensity | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts | Phase 10 |

## Blockers

**None blocking Prompt 8E.** Two owner decisions carried forward, neither blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean
   and nothing since has added a name anywhere.

## Next permitted prompt

**PROMPT 8E — Phase 7 domain slice: Emotional state, social, and relationships.**

It inherits everything this bridge established: contextual-capture metadata, the
scan-page-versus-guided-flow separation, structured controls before free text, and
sensitive-topic permissions. That last one is where its hardest problem lives — a
question about a relationship arriving at the wrong moment is worse than not asking it,
and Private Pattern content must never surface unasked.
