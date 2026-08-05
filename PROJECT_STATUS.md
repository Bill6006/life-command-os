# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 7 — complete.** All seven domains ship. Phase 8 is next.
- Current prompt: PROMPT 8H (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8H requirement passes, and every earlier slice it was
  required to leave alone still passes.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - _Financial pressure_ — a five-point anchored scale, owned by the area rather than a
    guide, and deliberately not read by the shared state assessment.
  - _Resilience_ — five bands answering how long he could cover things, with no figure
    anywhere near it.
  - _Freedom_ — what the money is for, in his words, filed as an ordinary goal.
  - _Avoidance_ — when he last looked, in his words. The app never concludes it.
  - _Goals, decisions and outcomes_ — one decision at a time, settled either way, with the
    observable outcome asked a fortnight later.
  - _Valid meters_ — the meter **earned** for the first time in the product, and refused by
    the same domain when the figures are absent.
  - _Trajectory and tradeoff visuals_ — a pressure trend, a stage path for cover, a
    before-and-after comparison, and a tradeoff chart refused with its reason.
  - _Money candidate generation_ — zero or one, four branches, and silence for thin cover.
  - _Contextual-capture metadata_ — nine declarations, none guide-eligible, every protected
    context excluded on every one.
  - _Detailed account machinery deferred unless separately activated_ — `money-figures` is
    the separate activation, and the domain works fully without it.
  - _Now unchanged and compact_ — five panels, and no money question in any check-in.

### Phase 7 final gate

- All approved domains use one architecture: **yes** — every panel is `buildDomainPanel`.
- No duplicate canonical facts: **yes** — 27 families, and the last two slices added none.
- One domain may be disabled without corrupting history: **yes**, asserted per domain on the
  production build.
- Domain candidates remain subordinate to central selection: **yes** — `subordinate: true`
  with no way to set it otherwise.
- Now remains compact: **yes** — five panels at 375×812 with all seven areas on.
- Every capture has contextual metadata and one canonical write path: **yes**, validated at
  import.
- Domain prompts have not turned the guides into a checklist: **yes** — 8F, 8G, and 8H
  contribute one guide-eligible question between them.
- Each domain supplies a compact scan summary: **yes**, seven of them, all unused until
  Phase 8 builds the surface.
- Sensitive topics cannot surface outside their explicit permissions: **yes**, and money's
  figures are gated twice.
- No capability, child, faith, relationship, or overall-life score wall exists: **yes** —
  one percentage in the whole product, over the one construct with a real denominator.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — the app starts empty and the
  scenario corpus is not in the production bundle.

## The decision this slice turned on

**The whole domain works without a single figure.**

The plan defers "detailed account, transaction, bill, debt, credit, and portfolio machinery
unless separately activated". That is not a feature flag over a budgeting app — it is the
shape of the domain. Pressure is a five-point scale. Cover is five bands. Avoidance is when
he last looked. Freedom is a sentence. A decision is his words plus what became of it. Every
one of those is useful to somebody who will never tell this application a balance.

Resilience is the clearest case. "If money stopped coming in, how long could you cover
things?" answered as _a few weeks_ carries the fact that matters and no account data at all.
A budgeting app needs six months of transactions to compute a worse version of the same
answer.

Switching `money-figures` on adds exactly one capability: a target and a current figure
against one goal. **No branch of the candidate generator reads either**, and a test proves
the suggestion is identical with amounts on and off — which is what stops the optional
machinery quietly becoming required.

**The second decision: money is where a wrong word does the most damage.** It is the domain
most likely to produce shame, and shame is why people stop looking — which is the actual
problem the avoidance reading exists to catch. So the forbidden list is the longest in the
product and bars two registers: the moralising one and the scoring one. The word
_avoidance_ is itself on it. It is the plan's name for the deliverable, not a word this app
may use about a person.

## Work completed

- **The first earned percentage in the product.** Six domains refused a meter, each for a
  fact about the construct rather than the evidence. A debt paid down is different: 4,200 of
  7,500 is a fraction of a real total. The same domain refuses the same meter when the
  figures are absent, so which one he sees depends on a decision he made about how much to
  tell it.
- **The tradeoff given as a sentence.** Pressure and cover move independently and are the
  useful pair, but bars side by side would claim an ordinal about a state of mind and an
  ordinal about a length of time are comparable. The chart is refused with
  `discrete: false`; the tension is stated in words.
- **A before-and-after comparison** of the pressure reading at a decision and the reading
  now — same scale, two moments, and labelled as what changed rather than what the decision
  caused.
- **Thin cover produces no suggestion.** There is no action that helps, and offering one to
  somebody short of money is the cruellest kind of useless. The reading stays on the panel;
  the advice is withheld and the app says why.
- **Nine captures, none guide-eligible, every protected context excluded on every one** —
  including `family` and `caregiving`, which the home and faith slices left off. A money
  question in front of the people it affects is worse than not asking.
- **No new record family**, for the second slice running. Money reuses `GoalRecord`,
  `ObservationRecord` with a `quantity` value, and `SurfacePermissionRecord`.

### Decisions worth naming

- **Financial pressure is not capacity.** The scale exists and the shared state assessment
  deliberately does not read it. A hard month with money is not low capacity, and quietly
  suggesting less because of it would be the app deciding somebody is fragile.
- **Deciding against it is deciding it.** The decision outcomes are `Did it`,
  `Decided against it`, and `Still deciding`, and nothing reads the second as a failure.
- **The gentlest question opens the area.** "When did you last look at it?" comes before the
  pressure scale, because it can be answered honestly on a bad month without admitting
  anything, and because readings from somebody who has not looked in six weeks are
  recollections.
- **Discretion is settled by classification, not habit.** Faith withholds its repair, home
  quotes its change, money withholds its decision. Three slices, one rule.

## Files created or modified

Created (9): `src/domain/money/{strategy,capture}.ts`; `src/domain/prompts/money.ts`;
`src/application/commands/money.ts`;
`src/intelligence/domains/money/{index,assessMoney,moneyCandidate,scan}.ts`;
`src/ui/features/direction/MoneyAreaView.tsx`; `tests/unit/money.test.ts`;
`tests/e2e/{money,production-money}.spec.ts`

Modified: `domain/records/{scales,categories,permissions}.ts`;
`domain/prompts/definitions.ts`; `domain/domains/definitions.ts`;
`domain/capture/registry.ts`; `domain/emotional/permissions.ts`;
`application/commands/emotional.ts`; `intelligence/index.ts`;
`intelligence/state/categorySummaries.ts`; `ui/features/shell/AppShell.tsx`;
`ui/features/direction/ManageAreasView.tsx`; `ui/view-models/present.ts`; `app/scenarios.ts`;
`playwright.config.ts`; `playwright.deployed.config.ts`;
`tests/unit/{domains,areas,emotional,prompts}.test.ts`;
`tests/e2e/production-areas.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 630 passed**, up from 598. 32 new for the slice.
- **Browser: 595 passed** across both builds in 6.4 minutes, including 17 new specs against
  seeded state and 12 new on the production build, all in isolated contexts.
- **Deployed: verified against Pages** with `playwright.deployed.config.ts`.
- Covers: no moralising, scoring, or budgeting vocabulary on any surface in any of five
  states; the word _avoidance_ absent everywhere; the meter earned and the same meter
  refused with its reason; no percentage anywhere else; cover as a ladder with no
  destination implied; the tradeoff refused in both directions of the tension; a
  before-and-after comparison that claims no causation; thin cover producing no candidate;
  the decision kept off Now; amounts withheld from the reading when the topic is off and
  from the weekly scan until that surface is granted; no money question in any guide at any
  depth; and financial pressure absent from the shared state assessment.
- **Two defects found in existing code, both by the browser tests.**
  - _An exact accessible-name collision._ Direction renders a category summary beside a
    domain panel. For every other area the names merely resemble each other ("Faith &
    meaning" against "Faith and meaning"); for money both were "Money" — two regions with
    the same accessible name on one screen, indistinguishable to anyone navigating by
    landmark. The category label is now "Money & pressure".
  - _An empty list with a heading over it._ Manage Areas rendered "Not built yet" above
    nothing once the last domain shipped, which reads as a loading failure rather than as
    completeness. The block is now omitted when the list is empty.
- **Seven older assertions were correct failures**, and four of them marked a milestone
  rather than a change: with every domain built, the tests that pointed at "the unbuilt one"
  had no subject left. They were rewritten to exercise the availability mechanism directly —
  a synthetic definition with no update prompt, and a preference naming a domain this build
  has never heard of — so the guarantee survives the last slice shipping.
- **One near-miss worth recording.** I wrote `?? ({} as ObservationRecord)` into
  `assessMoney` and caught it on re-reading: that exact cast shipped in Prompt 8E and
  crashed reading `.value.kind` off an empty object. Replaced with an explicit `undefined`
  check before it ran once.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files and the built
  bundle.
- Every placeholder in the money tests is explicitly labelled as one. No figure, decision,
  purpose, or note in this repository describes anybody's actual finances.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records) and the Prompt 8A framework contracts. The earned meter, the refused tradeoff, and
the figures gate are recorded in `docs/REQUIREMENTS.md` §3n.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/money/strategy.ts`** — the bands, the four actions, and the forbidden list.

- Active requirement: `SAFE-001`, `XDS-015`, `LEG-067`–`LEG-070`.
- Why smaller was insufficient: the device every slice since 8B has used. It carries more
  weight here than anywhere — the file's most important property is that no action in it is
  financial advice, and the forbidden list is the longest in the product because this is the
  domain where a wrong word does the most damage.

**2. Scale classification on the definition** — replacing the `HEALTH_SCALES` set.

- Active requirement: `LEG-067`, `OWN-013`.
- Why smaller was insufficient: the set could answer only "is this health data", and a money
  reading is neither general capacity nor health. A lookup table needing a branch per
  classification is not a rule. Category, privacy, and prompt namespace now travel with the
  scale, so a new scale cannot be filed under the wrong area by omission — and the prompt
  namespace is what keeps a money question from being owned by whichever guide asks first.

**3. `privacy:topic-enabled`** — the domain-neutral protected-topic switch.

- Active requirement: v3.2 §11.
- Why smaller was insufficient: the attribute was `emotional:topic-enabled`, written when
  the emotional slice owned the only protected topic. "The emotional slice owns the money
  switch" is the kind of thing that looks like a defect forever. The old attribute is still
  read, so no existing decision is lost.

## Known limitations

- **Phase 7 is complete and Phase 8 has not started.** Seven domain slices exist and nothing
  yet synthesises them: no Weekly Quick Domain Scan, no monthly review, no forgotten-domain
  protection, no cross-domain arbitration, and no AI review prompt.
- **Seven scan summaries are built and unused.** Every domain supplies one; the surface that
  renders them is Phase 8's.
- **`home:conditions` and money's triggered placement are declarations only.** The metadata
  says when a question should appear; the orchestration that acts on it is Phase 8's.
- **The `LEG-*` row mapping in §3l, §3m, and §3n is unverified.** The Final Legacy Decisions
  map is not in the repository. No ID has been minted — every one cited is either an
  approved cross-cutting ID or one the domain definition already declares — but which
  requirement each table row satisfies needs the owner's confirmation. Documentation only.
- **The duplicate panel/category naming is mitigated, not resolved.** Money's exact
  collision is fixed; the general near-duplication across all seven areas is Phase 8's.
- **Money's trajectory abstains often.** Two weeks with readings are required before it says
  anything, and a gap is never read as calm — correct, and worth knowing before it looks
  like a bug.
- **Cached startup is still unmeasured.** Bundle is ~211 kB gzipped, up from ~206 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; `frame-ancestors` unenforceable on Pages;
  Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided.

## Deferred work

| Deferred                                                                            | Activates |
| ----------------------------------------------------------------------------------- | --------- |
| Cross-domain synthesis and one global decision across seven areas                     | Phase 8   |
| Weekly Quick Domain Scan, monthly review, forgotten-domain protection                 | Phase 8   |
| Contextual-capture orchestration across domains                                       | Phase 8   |
| Duplicate panel/category label resolution                                             | Phase 8   |
| AI review export prompt with coaching intensity                                       | Phase 8   |
| Quarantined legacy importer                                                           | Phase 9   |
| Traceability generator, full browser matrix, startup measurement, release artifacts    | Phase 10  |

## Blockers

**None blocking Phase 8.** Three owner decisions carried forward, none blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
3. **Confirm the `LEG-*` row mapping** for §3l, §3m, and §3n.

## Process notes carried forward

Two Playwright runs must not overlap on this repository — they bind the same preview ports.
Recorded after Prompt 8E's 2.9-hour run. Honoured again; the full suite ran alone in 6.4
minutes.

`prettier --write .` reports files as written while `prettier --check .` still fails them.
Run the explicit glob form and re-check before committing, or CI fails the format gate and
no deploy ever appears. Hit again this slice.

`vitest` does not typecheck. Run `npx tsc --noEmit` before believing a test file — recorded
in Prompt 8G and not needed this slice, because it was run.

New this slice: **a disavowal is still a mention.** Prompt 8G put `tidy` and `every week`
into shipped copy in order to disown them, and the vocabulary tests caught both. When
writing "this app is not X", check whether X is on the forbidden list before shipping the
sentence.

## Next permitted prompt

**Phase 8 — cross-domain synthesis, learning refinement, and optional model comparison.**

Seven domains now offer into one comparison and nothing yet reconciles them. Phase 8 owns
the North Star eligibility gate, candidate and prompt deduplication, the Weekly Quick Domain
Scan, forgotten-domain protection, the monthly review, and the copy-ready AI coaching
prompt. Its gate is explicit that no capability, child, faith, relationship, or overall-life
score wall may exist — which the one percentage this product now draws is deliberately not,
and which Phase 8 will have to keep true while combining seven areas into one answer.
