# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 7 — framework and five domain slices complete.** Slices 8G–8H
  outstanding.
- Current prompt: PROMPT 8F (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8F requirement passes, and every earlier slice it was
  required to leave alone still passes.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Values, purpose, and practices in his own words* — one canonical family holding all
    three, stored unedited, with no field for a level or a rating.
  - *No catalogue of values and no catalogue of practices* — the application ships the
    container and never the contents. Asserted by test.
  - *Occasions recorded against a practice he named* — counted, never rated, never turned
    into a rate.
  - *No streak, no percentage, no grade* — two visuals refused, one of them against
    evidence that would have supported it.
  - *A quiet practice offered at two minutes* — offered once, in his words, never chased.
  - *A repair he named, held without interpretation* — and offered back discreetly, with
    his words left on the page he opened.
  - *Doubt recorded and left alone* — no candidate, no encouragement, no concern, no
    referral, and no change to any reading.
  - *Retiring keeps everything* — stopping something is not a gap in the record.
  - *Contextual-capture metadata* — six declarations, none guide-eligible, validated at
    import.
  - *Now unchanged and compact* — five panels, the area named nowhere on it.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — the app starts empty and the
  scenario corpus is not in the production bundle.

## The decision this slice turned on

**The application supplies the container and never the contents.**

Every other domain in this product ships a vocabulary. Health ships recovery actions,
career ships a proof ladder, fatherhood ships developmental checklists. Shipping the
equivalent here — a list of practices worth keeping, a starter set of values — would be
this application taking a position on how a person should live. So it ships none. The text
fields are blank, they have no placeholder examples, and a test asserts that the words
`pray`, `prayer`, `meditat`, `scripture`, `church`, `worship`, `fast`, and `tithe` appear
in no action and no prompt in the domain.

What the app does supply is structure: somewhere to put what matters, somewhere to record
what he actually did about it, and the arithmetic to put those two next to each other. The
conclusion is left to him, because the conclusion was never the app's to draw.

**The second decision follows from the first: doubt produces nothing.** Someone writing
down that this is hard, or that they are not sure any more, gets no suggestion, no
encouragement, no concern, and no referral. The candidate generator can read the record and
deliberately has no branch for it. Doubt is not a symptom, and the honest response from a
piece of software is silence.

## Work completed

- **`FaithAnchorRecord`**, the 27th family, holding value, purpose, and practice as three
  kinds of the same act — naming something. Filing these as commitments was rejected: a
  commitment completes and has a due date, so "being present with my family" would become a
  permanent open loop.
- **Occasions counted per practice** through `derivedFromRecordIds`, so the count survives
  him rewording the practice tomorrow.
- **Five closed actions**, every one about something he already wrote down. The one action
  for an empty area asks for his words rather than offering him any.
- **Two refused visuals, for different reasons.** The meter is refused because no valid
  denominator exists. The bar comparison is refused _although the eligibility rules allow
  it_ — the counts are real and the arithmetic would be valid, and the practice at the
  bottom would read as the one he is failing at.
- **A category that can never summarise as `declining`.** A quiet month is a quiet month.
- **Retiring appends** a `retired` record, so every occasion recorded against a practice
  survives him stopping it.
- **A struggle field behind a control that says nothing reads it** — excluded from all six
  protected contexts, absent from Quick Capture until switched on, and read by no branch of
  the domain.
- **A domain-owned scan summary** that quotes none of his words; the open item is named as
  "Something you decided to put right", never as its content.

### Decisions worth naming

- **A practice with nothing recorded shows as having nothing recorded.** It is not read as
  skipped, not called a lapse, and not chased. Absence of evidence is not evidence of
  absence, which is a rule the whole product holds and this domain leans on hardest.
- **The repair is offered discreetly.** The statement on Now is "Do the thing you decided
  to put right"; his words stay on the page he opened. A repair describes something that
  went wrong with another person, which is not a sentence that belongs on a front page
  while someone is looking over his shoulder.
- **No question asks why, how it felt, or what it meant.** Every prompt in the domain is
  about something observable, and a test enforces it.
- **Free text only where the words must be his.** Everything after naming — recording an
  occasion, marking a repair done, retiring a practice — is a button.

## Files created or modified

Created (10): `src/domain/records/faith.ts`; `src/domain/faith/{meaning,capture}.ts`;
`src/domain/prompts/faith.ts`; `src/application/commands/faith.ts`;
`src/intelligence/domains/faith/{index,assessFaith,faithCandidate,scan}.ts`;
`src/ui/features/direction/FaithAreaView.tsx`; `tests/unit/faith.test.ts`;
`tests/e2e/{faith,production-faith}.spec.ts`

Modified: `domain/records/{index,categories,permissions}.ts`;
`domain/prompts/definitions.ts`; `domain/domains/definitions.ts`;
`domain/capture/registry.ts`; `intelligence/index.ts`;
`intelligence/state/categorySummaries.ts`;
`intelligence/change-detection/materialChange.ts`; `ui/features/shell/AppShell.tsx`;
`ui/view-models/present.ts`; `app/scenarios.ts`; `playwright.config.ts`;
`playwright.deployed.config.ts`; `tests/fixtures/records.ts`;
`tests/unit/{records,domains,areas,emotional}.test.ts`;
`tests/e2e/production-areas.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 567 passed**, up from 532. 33 new for the slice, plus two on the change detector.
- **Browser: 509 passed** across both builds in 5.6 minutes, including 16 new specs against
  seeded state and 9 new on the production build, all in isolated contexts.
- **Deployed: verified against Pages** with `playwright.deployed.config.ts`.
- Covers: no catalogue of values or practices anywhere in the domain; no authority,
  grading, or pressure vocabulary on any rendered surface in any of three states; both
  refusals with their distinct reasons; the category never reading as `declining`; a
  struggle producing no candidate and appearing in no condition, driver, or bottleneck; the
  scan quoting nothing; the area page offering an empty box with no suggestions; an
  occasion recorded against one practice without touching another; the guided flow still
  reachable; no horizontal overflow at 375×812; and Now unchanged and compact.
- **One real defect found, in code this slice did not write — and it is a repeat.** The
  production test caught What Changed printing free text verbatim on Now for the second
  slice running: `Recorded faith:repair needed — kind:note, text: <the repair>`. Prompt
  8E's fix was a **list of sensitive classes**, and `faith` had not been added to it. A
  list that must be edited every time the product grows is a reminder, not a safeguard. The
  rule is now general: **no `note` value is ever quoted on Now, in any domain**, because a
  note is the one value kind whose contents are unbounded. The class list survives
  alongside it with `faith` added, and a unit test covers the general rule.
- Six older assertions were correct failures from activating the domain: the family count,
  the fixture coverage, the implemented-domain list, the unbuilt-area list, and both Manage
  Areas counts.
- One assertion of my own was wrong rather than the code: the panel does not render the
  candidate's `because` text, so a spec expecting it there was corrected.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files and the built
  bundle.
- Every placeholder in the faith tests is explicitly labelled as one. No value, purpose,
  practice, repair, or struggle text in this repository is anybody's actual words.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records) and the Prompt 8A framework contracts. Authority separation and the two refusals
are recorded in `docs/REQUIREMENTS.md` §3l.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/records/faith.ts`** — `FaithAnchorRecord`.

- Active requirement: Prompt 8F task 1; `SAFE-001`.
- Why smaller was insufficient: `CommitmentRecord` was the obvious reuse and is wrong. A
  commitment completes and carries a due date, so a value filed as one becomes a permanent
  open loop the owner can never close. A separate family also gives the schema somewhere to
  refuse a level, a rating, or a streak outright rather than by convention.

**2. `domain/faith/meaning.ts`** — the closed action set and the forbidden vocabulary.

- Active requirement: `SAFE-001`, `XDS-015`.
- Why smaller was insufficient: the device health, fatherhood, and emotional already use.
  It is load-bearing here for a different reason — the file's most important property is
  what it does **not** contain, and a generated suggestion in this domain would be one
  template away from telling someone how to live.

**3. `ui/features/direction/FaithAreaView.tsx`** — the area page.

- Active requirement: Phase 7 shared rules 21–24.
- Why smaller was insufficient: six independently editable sections cannot be a guide, and
  the struggle field has to be visibly present and visibly unread rather than merely
  absent.

## Known limitations

- **Two domains remain unimplemented.** Home (8G), money (8H).
- **The faith-specific `LEG-*` requirement IDs were unavailable.** The Final Legacy
  Decisions map was not in this session's context, so §3l cites the approved IDs that
  genuinely apply and prompt task numbers elsewhere, following the convention §3j set. No
  ID was minted. Recorded as an open item in `docs/REQUIREMENTS.md` §5; substituting the
  intended IDs touches no code.
- **The scan summary is built and unused.** Phase 8 owns the Weekly Quick Domain Scan.
- **The struggle count appears on the panel**, as "N notes you wrote about how this is
  going — kept here, read by nothing". The contents never do. That is deliberate: he should
  be able to see they were kept.
- **No cross-domain synthesis yet.** Faith competes in the same comparison as everything
  else, and can win it — as it did during verification, which is how the What Changed leak
  surfaced.
- **Cached startup is still unmeasured.** Bundle is ~200 kB gzipped, up from ~195 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; `frame-ancestors` unenforceable on Pages;
  Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided;
  the duplicate panel/category naming, which Phase 8 owns.

## Deferred work

| Deferred                                                                            | Activates |
| ----------------------------------------------------------------------------------- | --------- |
| Home and environment                                                                  | Prompt 8G |
| Money                                                                                 | Prompt 8H |
| Weekly Quick Domain Scan, monthly review, forgotten-domain protection                 | Phase 8   |
| Contextual-capture orchestration across domains                                       | Phase 8   |
| Duplicate panel/category label resolution                                             | Phase 8   |
| AI review export prompt with coaching intensity                                       | Phase 8   |
| Quarantined legacy importer                                                           | Phase 9   |
| Traceability generator, full browser matrix, startup measurement, release artifacts    | Phase 10  |

## Blockers

**None blocking Prompt 8G.** Three owner decisions carried forward, none blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
3. **Confirm the faith `LEG-*` requirement IDs** so §3l can cite them.

## Process notes carried forward

Two Playwright runs must not overlap on this repository — they bind the same preview ports.
Recorded after Prompt 8E's 2.9-hour run. Honoured this slice; the full suite ran alone in
5.6 minutes.

A second one from this slice: `prettier --write .` reported files as written while
`prettier --check .` still failed them. Run the explicit glob form and re-check before
committing, or CI fails the format gate and no deploy ever appears.

## Next permitted prompt

**PROMPT 8G — Phase 7 domain slice: Home and environment.**

It is the first domain since 8B where the subject is not the owner himself but the space
around him, and the restraint it needs is different again: the failure mode there is a
cleaning-schedule app that generates chores nobody agreed to.
