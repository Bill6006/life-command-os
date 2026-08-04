# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 3.0 Final
- Current phase: **Phase 7 — framework and two domain slices complete.** Slices 8D–8H
  outstanding.
- Current prompt: PROMPT 8C (complete)

## Gate status

- Status: **YELLOW.** Every Prompt 8C requirement is met and tested. The qualifier is not
  a defect in this slice: **no domain can be switched on from the shipped app**, so
  neither the career panel nor the health panel is reachable by the owner. See below.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Uses shared canonical records* — career reads the category it has always read. One
    new family was added, `SkillClaimRecord`, and §4.2 of the architecture overview
    records the bar it had to clear.
  - *One domain intelligence panel* — the shared 8A contract, unchanged.
  - *Zero or one candidate* — five branches in a strict order, ending in silence.
  - *Observable outcomes defined* — every action carries a behaviour-first follow-up.
  - *One optional domain move, subordinate* — asserted.
  - *Update This Area supported* — career's own questions, and the morning check-in
    unchanged. Asserted from both directions.
  - *Disable and deprioritise without deleting history* — unchanged from 8A.
  - *What Changed exposed* — through the shared contract.
  - *Only valid representations* — a trend, a bar comparison, a **meter**, and a **stage
    path**, each earned against the same eligibility rules that refused health a meter.
  - *Privacy and safety boundaries preserved* — everything the slice captures is
    classified `workplace` and withheld from AI exports unless explicitly included.
  - *Absent from Now when irrelevant* — nothing about a domain reaches Now.
  - *Synthetic tests added* — five career scenarios, 39 unit and 14 browser tests.

### The qualifier, stated plainly

A domain becomes visible when a `DomainPreferenceRecord` says the owner switched it on.
**Nothing in the application writes one.** The only writer is `src/app/scenarios.ts`, which
is compile-time stripped from the production bundle along with the test bridge.

So every domain test runs through the real UI against a seeded corpus, and on the deployed
build `Direction` shows the three category overviews and no domain panel at all — verified
live on commit `9a63aa4` at 375×812.

This is an 8A framework gap, not an 8C one, and it has been true since Prompt 8B shipped;
the 8B report said health "appears only after the owner enables it" without checking that
the owner could. Both slices are complete and correct behind it. **The missing piece is a
switch-on control, which is framework scope and was not part of Prompt 8C's task list.**
It is listed under Blockers for a decision.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — and no data at all; the app
  starts empty and the scenario corpus is not in the production bundle.

## The decision this slice turned on

The gap between what you would say about yourself and what your records would back up.

That gap is the most useful thing this domain can show, and it is one sentence away from
being an accusation. So the claim and the verdict are kept structurally apart:
`SkillClaimRecord` stores what the owner would claim and **has no field for whether it is
true**. `proven`, `level`, and `confidence` are parse failures. Support is computed from
the records the claim cites, which means an unsupported claim is a normal state rather
than a failing — and "exported as true" has no representation to travel in.

The ladder works the same way. `rungFor` takes counts of evidence, never a self-report,
so a claim cannot climb by being asserted more confidently. Nine study sessions do not
reach the rung one lab does.

## Work completed

- **The exact next step**, in the owner's words, stored verbatim and shown back unedited.
- **Ten study obstacles**, recorded as what happened. The Blueprint's psychological
  taxonomy survives as ids; none of it is visible wording.
- **A six-rung evidence ladder** — not started, read about it, followed a guide, did it
  with help, did it alone, used it for real — defined by evidence, not self-assessment.
- **`SkillClaimRecord`**, the 24th family and the first domain *content* family, carrying
  no assertion that the claim is true.
- **Retrieval strength over eight weeks**, where a week with no recall check is a gap and
  never a zero.
- **Work Wins** — one canonical record projected to six surfaces and copied to none.
- **Interruption and re-entry**, offering resumption while that is still cheaper than
  restarting.
- **One career candidate**, by a five-step order ending in silence.
- **Update This Area** for career, and a morning check-in that is exactly as long as it
  was.
- **A meter and a stage path, both earned** — the first time either has been drawn.
- **The AI export names claims and what stands behind them**, under a header that says a
  claim is never exported as true.

### Decisions worth naming

- **Career earns a meter; health refused one.** Same eligibility rules, opposite answer.
  "Claims with something behind them, out of claims made" has a denominator the owner
  defined themselves; health has no total it is a fraction of. The difference is a
  property of the evidence, not of who wrote the slice — which is the strongest evidence
  so far that the 8A rules are doing real work.
- **The forbidden vocabulary rule governs the product's voice, not the owner's.** Someone
  studying for a certification will write "finish the identity module", and the app shows
  it back unaltered — paraphrasing it would make the record wrong. The test strips the
  owner's own strings out of the records before scanning, so app copy that drifts into
  course vocabulary still fails.
- **Fear and perfectionism are ids, not labels.** Merging them into "something else" would
  lose the pattern; asking "were you afraid?" is self-diagnosis, which `OBS-002` forbids.
  The visible wording says what happened: "It looked like more than I had in me."
- **Career does not take over its category summary.** Health delegated its summary to its
  slice because the slice created that category. `career-work-learning` predates this
  slice and its focused-hours summary is still true, so the slice adds a reading beside it
  rather than replacing it. A domain panel and a category overview answer different
  questions.
- **Four closed actions, and none of them is "do the next module."** The Blueprint rules
  out course hosting and a second task board; both are absent rather than filtered.

## Files created or modified

Created (7): `src/domain/career/ladder.ts`; `src/domain/records/career.ts`;
`src/intelligence/domains/career/{index,assessCareer,careerCandidate}.ts`;
`tests/unit/career.test.ts`; `tests/e2e/career.spec.ts`

Modified: `domain/records/{index,scales}.ts`; `domain/prompts/definitions.ts`;
`domain/domains/definitions.ts`; `intelligence/index.ts`;
`intelligence/domains/captureRouting.ts`; `intelligence/visuals/eligibility.ts`;
`application/queries/aiExport.ts`; `ui/features/direction/DomainPanelView.tsx`;
`app/scenarios.ts`; `tests/fixtures/records.ts`; `tests/unit/{records,prompts}.test.ts`;
`tests/e2e/domains.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 379 passed**, up from 339. 40 new for the slice.
- **Browser: 348 passed**, up from 320. 28 new — 14 tests across desktop and mobile.
- Covers: a claim family with no truth field, asserted by parse failure; the ladder
  climbing only on cited evidence; nine study sessions never reaching the rung one lab
  does; one Work Win reaching six surfaces from one record; the five-branch candidate
  order including silence; barriers counted with no cause inferred and no psychological
  label rendered; a meter earned and drawn; a stage path whose position is marked for
  assistive technology and never by colour alone; a retrieval week with no check plotted
  as a gap; an unsupported claim exported as claimed and undemonstrated; claims withheld
  by default as workplace data; Update This Area asking only career questions; the morning
  check-in unchanged; no course or task-board vocabulary in the actions, the prompts, or
  the rendered panel; the owner's own wording echoed verbatim; Now within five panels;
  and no horizontal overflow at 375×812.
- **One real defect found and fixed rather than tested around:** the domain panel rendered
  every visual as an evidence summary, labelling anything after the first "Not shown
  here". That was correct while health was the only slice — its extra visual was a
  refusal — and wrong the moment a domain earned a meter, which would have reached the
  screen under the refusal heading. `VisualSpec` now carries what a meter or stage path
  draws with, and the panel renders each kind as itself.
- Three older assertions were correct failures: the scale list, the family count, and the
  8A claim that career was readable-but-not-updatable. The last is what 8C changes, so the
  test now asserts the opposite and keeps the readable-but-not-updatable state covered
  through Money, which still has no slice.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- Real personal data detected in tracked content: **ONE, now removed from HEAD.** See
  below.
- Commit identity: GitHub noreply address only (`193191643+Bill6006@users.noreply.github.com`).
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Everything the career slice captures is classified `workplace`.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

### The one privacy finding

`PROJECT_STATUS.md` named the 8D slice after a real child's first name, carried in from
the prompt pack's own prompt title. The row now reads "Fatherhood", matching the domain
definition, which never contained the name. **The name is not repeated here** — writing it
into this note would have put it straight back into tracked content.

**It remains in one commit of history** (`b5ffe54`, Prompt 8A). Removing it requires
rewriting history and force-pushing, as was done once before for the email address. That
is the owner's call and is listed under Blockers.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records), ADR-0008 (the Console's five-panel cap, which is why no domain reaches Now), and
the Prompt 8A framework contracts.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/career/ladder.ts`** — rungs, obstacle taxonomy, and a closed action set.
- Active requirement: `LEG-060`, `LEG-061`, tasks 2–3 and 8–9.
- Why smaller was insufficient: the ladder is read by the assessment, the candidate, the
  panel, and the export. A second definition of what "did it alone" means would drift
  within a phase, and the drift would be invisible.

**2. `domain/records/career.ts`** — `SkillClaimRecord`.
- Active requirement: `LEG-062`, task 4.
- Why smaller was insufficient: what the owner would claim about themselves is not
  derivable from what they did. Two people with identical study records may claim
  entirely different things, and the gap is the domain's central reading.

**3. `intelligence/domains/career/`** — assessment, candidate, contribution.
- Active requirement: tasks 1–12.
- Why smaller was insufficient: the same shape health uses; the assessment is read by
  both the panel and the claim evaluation.

**4. `VisualSpec.data`** — what a meter or stage path draws with.
- Active requirement: `OWN-051`, `OWN-053`, tasks 11–12.
- Why smaller was insufficient: an earned meter with no data reached the screen under the
  refusal heading, which said the opposite of what it meant.

## Known limitations

- **Five domains remain unimplemented.** Fatherhood (8D), emotional and relationships
  (8E), faith (8F), home (8G), money (8H). Each is readable-but-not-updatable until its
  slice lands, and says so.
- **Career is switched off by default**, like every domain — and, until a switch-on
  control exists, it cannot be switched on from the shipped app at all. See the gate
  qualifier.
- **The claim meter counts evidence, not adequacy.** One study session puts something
  behind a claim here; it may not support that claim in an interview. The visual says so
  in its own uncertainty declaration, but it is a real limit of the reading.
- **Obstacles are only as good as what gets recorded.** Sessions where nothing was noted
  are not counted as obstacle-free, but they are also not counted at all.
- **Retrieval needs a habit to say anything.** Two weeks of readings is the minimum, and a
  gap-heavy trend stays a gap-heavy trend.
- **No cross-domain synthesis yet.** Career competes in the same comparison as everything
  else; genuine tradeoff reasoning between areas is Phase 8.
- **Cached startup is still unmeasured.** Bundle is ~175 kB gzipped, up from ~163 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; the regression suite runs against a
  bridge-enabled build with production covered by 14 dedicated tests; `frame-ancestors`
  unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness;
  deletion semantics undecided.

## Deferred work

| Deferred | Activates |
| --- | --- |
| Fatherhood | Prompt 8D |
| Emotional state, social, and relationships | Prompt 8E |
| Faith and meaning | Prompt 8F |
| Home and environment | Prompt 8G |
| Money | Prompt 8H |
| Cross-domain synthesis, full Can't Now regeneration, strategic review, optional model comparison | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts | Phase 10 |

## Blockers

**None blocking Prompt 8D.** Three owner decisions are open, one of them affecting whether
the last two slices are usable.

1. **Where the switch-on control goes.** Two slices are complete and neither can be reached
   on the shipped build. It is a small piece of work — one command writing a
   `DomainPreferenceRecord`, and a place to put it — but it is framework scope, and where
   it lives (Data & Privacy, Direction, or a first-run step) is a product decision rather
   than a technical one. Recommended as the first item of Prompt 8D, or as a short
   framework prompt before it.
2. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
3. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
   A history rewrite and force-push would remove it entirely; leaving it means one file in
   one historical commit contains it.

## Next permitted prompt

**PROMPT 8D — Phase 7 domain slice: Fatherhood.**

Two slices have now run through the shared framework, and the useful result is that they
disagreed: health refused a meter and career earned one, on the same rules. 8D is the
hardest test of those rules so far — a domain where almost nothing is countable and where
a meter would be actively harmful.
