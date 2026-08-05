# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 7 — framework and six domain slices complete.** Slice 8H
  outstanding.
- Current prompt: PROMPT 8G (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8G requirement passes, and every earlier slice it was
  required to leave alone still passes.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Functional friction* — eight kinds, every one describing what happened to an
    activity, none describing how a room looks.
  - *Access, setup, noise/light/privacy* — all recorded as observable answers, all
    buttons.
  - *Role transitions* — measured by what had to move first, never by how long anything
    looked wrong.
  - *Recovery, parenting, and learning environments* — five purposes the friction is
    recorded against, and left unknown when he did not say.
  - *One targeted change* — one open at a time, enforced in the generator and in the
    command layer, with the text field absent while one is open.
  - *Observable friction outcome* — whether the same thing came back, asked after a
    fortnight rather than the next morning.
  - *Environment candidate and visuals* — one candidate or none; a bar comparison and a
    line graph earned, and the meter refused with its reason.
  - *Contextual-capture metadata* — nine declarations, one triggered question, and not one
    trigger that names an interval.
  - *Not a cleaning, chore, calendar, or task app* — asserted by vocabulary, by the
    single-occurrence silence, and by the one-open-change rule.
  - *Now unchanged and compact* — five panels, the area named nowhere on it.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — the app starts empty and the
  scenario corpus is not in the production bundle.

## The decision this slice turned on

**Repetition is the entry condition.**

A friction recorded once produces nothing at all — no suggestion, no nudge, no "you might
want to look at this". One awkward morning is an event. The same thing twice is a property
of the setup, and only the second is worth a word. A product that responds to the first
becomes a chore generator inside a fortnight, whatever its copy says.

Two more rules make the boundary structural rather than editorial. **One open change,
ever** — enforced in the candidate generator and again in `nameEnvironmentChange`, because
a rule that lives only in the generator is one the interface can walk around. And
**nothing is ever raised because time passed**: no capture trigger names an interval, and
a test walks every trigger string to prove it.

The vocabulary carries the rest. Eight friction kinds, all functional, and no word anywhere
for tidy, messy, cluttered, or clean. "Nowhere to put things" is a fact about trying to
work at a desk; "the desk is a mess" is a judgement about a desk, and the second has no
representation in this product.

**Where this differs from faith.** Prompt 8F withheld a view because the application had no
standing to hold one. This domain is the opposite: the app has plenty of standing to say
"that same thing has got in your way four times", because that is arithmetic over what he
recorded. What it withholds is the task list.

## Work completed

- **No new record family, and that is the finding.** `EnvironmentSetupRecord` was designed
  and discarded: a friction is one observable fact with one value, the activity it
  interrupted rides in the attribute (`home:friction:<purpose>`, the device
  `father:skill:<id>` established), and the link from a change to what it addresses is what
  `provenance.derivedFromRecordIds` is for. `LEAN-001` permits a family **where
  irreducible**; here it was not.
- **Eight friction kinds and five purposes**, with the purpose optional everywhere and
  never guessed — a friction recorded from a guide genuinely does not know what he was
  doing, and filling that in would put invented context into the one chart this domain
  draws.
- **Four closed actions**, none of which says what to change. Three ask for his change; the
  fourth names a *time* rather than a thing — set the space up before you need it — which
  holds whatever the space contains.
- **A bar comparison earned**, and it is the chart Prompt 8F refused. The difference is
  what the bars are of: friction kinds are properties of a house, and nobody reads "nowhere
  to put things: 4" as a verdict on themselves.
- **A line graph over six weeks**, with a week he recorded nothing kept as a **gap** rather
  than a zero. Collapsing the two would draw friction falling away every time he stopped
  using the app.
- **The meter refused.** Friction removed over friction recorded divides cleanly, and the
  result is a readiness percentage for somebody's home with zero as the implied target.
- **A category that may read `declining`** — unlike faith, because a fortnight with more
  friction than the one before is a fact about a setup.
- **A domain-owned scan summary** that quotes the change he named, which is the deliberate
  contrast with the faith scan.

### Decisions worth naming

- **Success is whether the same thing came back, never completion.** A change filed as a
  commitment would report "done" as success, when the question is whether the friction
  stopped. The outcome question waits a fortnight, because asking the next morning collects
  an opinion.
- **A change that did not hold is offered a second attempt, once, and it is not a
  telling-off.** Knowing a change failed is worth as much as knowing one worked.
- **The one triggered question earns its interruption.** Whether the room is too loud
  decides whether a focus block is worth suggesting at all — the same test emotional
  interference passed in 8E.
- **Discretion is applied where the content warrants it.** The scan and the candidate
  reason both quote the change he named; the faith equivalents quote nothing. A charger on
  a desk is not a confession, and blanket redaction would make the weekly scan useless
  without making anything safer.

## Files created or modified

Created (9): `src/domain/home/{environment,capture}.ts`; `src/domain/prompts/home.ts`;
`src/application/commands/home.ts`;
`src/intelligence/domains/home/{index,assessHome,homeCandidate,scan}.ts`;
`src/ui/features/direction/HomeAreaView.tsx`; `tests/unit/home.test.ts`;
`tests/e2e/{home,production-home}.spec.ts`

Modified: `domain/records/categories.ts`; `domain/domains/definitions.ts`;
`domain/prompts/definitions.ts`; `domain/capture/registry.ts`; `intelligence/index.ts`;
`intelligence/state/categorySummaries.ts`; `ui/features/shell/AppShell.tsx`;
`ui/view-models/present.ts`; `app/scenarios.ts`; `playwright.config.ts`;
`playwright.deployed.config.ts`; `tests/unit/{domains,areas}.test.ts`;
`tests/e2e/production-areas.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 598 passed**, up from 567. 31 new for the slice.
- **Browser: 549 passed** across both builds in 6.0 minutes, including 15 new specs against
  seeded state and 10 new on the production build, all in isolated contexts.
- **Deployed: verified against Pages** with `playwright.deployed.config.ts`.
- Covers: no aesthetic vocabulary anywhere in the domain or on any rendered surface in any
  of four states; a single friction producing no candidate, no bottleneck, and no move; a
  change offered only on the second occurrence; the one-open-change rule at both
  enforcement points; a purpose left unknown rather than defaulted; a week with no records
  kept as a gap; the comparison earned and the meter refused with their reasons; no capture
  trigger naming an interval; no home question reaching a daily check-in; the scan quoting
  the change; a free-text note staying off Now; and Now unchanged and compact.
- **No defect found in existing code this slice.** The general no-`note`-on-Now rule
  introduced in Prompt 8F held for the new domain without being touched, which is what it
  was generalised for — the previous two slices each had to extend a list.
- Four older assertions were correct failures from activating the domain: the
  implemented-domain list, the unbuilt-area list, and both Manage Areas counts.
- Three failures were mine rather than the code's. Two were the disavowal trap: `tidy`
  appeared in an action's stopping point and `every week` in the panel's North Star line,
  both there to say the app is *not* that — and a disavowal is still a mention, which is
  exactly how the career slice tripped over "study more". Both were reworded to carry the
  meaning without the word. The third was a regex that did not match its own copy.
- Two type errors reached only `npm run build`, not `vitest`: the unit runner does not
  typecheck, so `tsc --noEmit` is the gate that catches a bad cast in a test file.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files and the built
  bundle.
- Every placeholder in the home tests is explicitly labelled as one. No friction, change,
  or note text in this repository describes anybody's actual home.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records) and the Prompt 8A framework contracts. The repetition rule, the one-open-change
invariant, and the earned comparison are recorded in `docs/REQUIREMENTS.md` §3m.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/home/environment.ts`** — the closed vocabulary and the forbidden list.

- Active requirement: `LEG-121`, `SAFE-001`, `XDS-015`.
- Why smaller was insufficient: the device health, fatherhood, emotional, and faith already
  use. It is load-bearing here for a specific reason — the file's most important property
  is what it does **not** contain, and the four products this slice must not become are
  each one aesthetic word away.

**2. `frictionAttribute` / `purposeOfAttribute`** — the per-purpose attribute pair.

- Active requirement: `LEG-121`, `OWN-024`.
- Why smaller was insufficient: a friction needs two dimensions and an observation carries
  one value. Encoding the purpose in the attribute reuses `father:skill:<id>` rather than
  inventing a record family, and keeps "not recorded" distinguishable from "focused work" —
  which a default would have destroyed silently.

**3. `ui/features/direction/HomeAreaView.tsx`** — the area page.

- Active requirement: Phase 7 shared rules 21–24.
- Why smaller was insufficient: six independently editable sections cannot be a guide, and
  the single free-text field has to *disappear* while a change is open rather than merely
  be ignored.

## Known limitations

- **One domain remains unimplemented.** Money (8H).
- **The `LEG-*` row mapping in §3l and §3m is unverified.** The Final Legacy Decisions map
  is not in the repository. No ID has been minted — every one cited is either an approved
  cross-cutting ID or one the domain definition already declares — but which requirement
  each table row satisfies needs the owner's confirmation. Documentation only; no code.
- **The scan summary is built and unused.** Phase 8 owns the Weekly Quick Domain Scan.
- **`home:conditions` is declared as a triggered question and nothing triggers it yet.**
  The metadata says when it should appear; Phase 8 owns the orchestration that acts on it.
  Until then it is reachable from the area page only.
- **The trajectory abstains more often than it speaks.** Both fortnights need evidence
  before it says anything, so a profile with sporadic recording reads
  `insufficient-evidence` for a long time. That is correct and worth knowing before it
  looks like a bug.
- **No cross-domain synthesis yet.** Home competes in the same comparison as everything
  else, and can win it.
- **Cached startup is still unmeasured.** Bundle is ~206 kB gzipped, up from ~200 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; `frame-ancestors` unenforceable on Pages;
  Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided;
  the duplicate panel/category naming, which Phase 8 owns.

## Deferred work

| Deferred                                                                            | Activates |
| ----------------------------------------------------------------------------------- | --------- |
| Money                                                                                 | Prompt 8H |
| Weekly Quick Domain Scan, monthly review, forgotten-domain protection                 | Phase 8   |
| Contextual-capture orchestration across domains                                       | Phase 8   |
| Duplicate panel/category label resolution                                             | Phase 8   |
| AI review export prompt with coaching intensity                                       | Phase 8   |
| Quarantined legacy importer                                                           | Phase 9   |
| Traceability generator, full browser matrix, startup measurement, release artifacts    | Phase 10  |

## Blockers

**None blocking Prompt 8H.** Three owner decisions carried forward, none blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
3. **Confirm the `LEG-*` row mapping** for §3l and §3m.

## Process notes carried forward

Two Playwright runs must not overlap on this repository — they bind the same preview ports.
Recorded after Prompt 8E's 2.9-hour run. Honoured again; the full suite ran alone in 6.0
minutes.

`prettier --write .` reports files as written while `prettier --check .` still fails them.
Run the explicit glob form and re-check before committing, or CI fails the format gate and
no deploy ever appears. Hit again this slice on four files the glob form missed.

New this slice: **`vitest` does not typecheck.** Two bad casts in a test file passed 31
green unit tests and failed `npm run build`. Run `npx tsc --noEmit` before believing a test
file.

## Next permitted prompt

**PROMPT 8H — Phase 7 domain slice: Money.**

The last domain, and the one with the sharpest scope boundary in the plan: strategic
pressure, resilience, freedom, avoidance, goals, and decisions — with account,
transaction, bill, debt, credit, and portfolio machinery deferred unless separately
activated. The failure mode there is a budgeting app, and the defence will have to be
structural in the same way this slice's was.
