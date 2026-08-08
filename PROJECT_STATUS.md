# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.3 UI Clarity and North Star Intelligence Amendment**, plus eleven owner
  clarifications that supersede it where they conflict
- Current phase: **Phase 8 closed.** Phases 0–7 remain GREEN.
- Current prompt: **PROMPT 9C v3.3 — partially delivered. YELLOW.** Sections **A, B and I**
  are complete, as are all eleven owner clarifications. Sections **C–H, J, K** and the AT33
  acceptance scenarios are not started. See "Prompt 9C v3.3" below for the exact line.

## Prompt 9C v3.3 status

**YELLOW — a verified partial delivery, stopped for owner review.**

Everything below the line is complete, tested, and green on the production build. Everything
in "Not started" is untouched. Nothing is half-built: no section was left in a state where
the app behaves differently but incompletely.

### Delivered and verified

| Item | What changed |
| --- | --- |
| **A1** local time (`V33-031`) | `src/domain/time/localTime.ts`. Every human-facing time goes through `Intl.DateTimeFormat` with an explicit IANA zone. Canonical storage stays UTC — conflating the two was the defect. DST-safe by construction; asserted across the 2026 spring-forward. |
| **A2** duplicate Timeline writes (`V33-061`) | `idempotencyKey` on the canonical envelope, enforced in `writeRecord`. One logical event, one record. Placed at the write path, not the UI or the projection, so nothing can route around it. |
| **A3** `Answer it` (`V33-049`, `V33-050`) | `promptId` on `HighValueQuestion`; `leadPromptId` on `planGuide`. The question on screen is the question the guide opens with, even when suppression would have removed it. |
| **Fresh-profile crash** | Not in the prompt. Found by the production suite: A3 widened `onOpenGuide` to take an optional prompt id, which made it assignable to a `() => void` click slot, so React passed the click event, `promptById` threw, and a new owner got a white screen on the first button in the app. Fixed, and the parameter is now **required** so the same handoff is a compile error. |
| **B1** check-in card (`V33-011`) | One component for morning, afternoon and evening. Was 94/116/135px tall across the three blocks with 12.5px type and a bare "Open" link; now a uniform 151px with a title at reading size and a full-width target. |
| **B2** (part) audit metadata (`V33-012`) | "What changed" was printing `kind:anchored-scale, scaleId:energy, scaleVersion:1, ordinal:1, label:Drained` on Now. Replaced with a real per-kind summary. The provenance is intact in Timeline, which is where it belongs. |
| **B10** (part) mobile type (`V33-030`) | A narrow-viewport scale in `tokens.css`, so legibility is a token decision rather than something each new component must remember. |
| **B2** command hierarchy (`V33-013`, `V33-014`) | Now leads with the premise — where you are, what is in the way — then the decision, then the minimum version as an offer rather than a caveat. Expected effect and `Why this` are collapsed. No numeric effect is rendered anywhere, because nothing in the product produces one backed by a defined metric. The panel is `Do now`, not `Best move`. |
| **B7** Manage areas (`V33-016`) | Leads with `Areas enabled: n of 7`; every toggle, cadence control and snooze button moved behind a drawer. Direction was spending most of its height on a settings screen. |
| **Section I UI** (`V33-032`) | The lifecycle is reachable. `Can't now` keeps its short reason list and gains a disclosure worded about the *move* rather than the moment: pause with a visible return date, block scoped to the situation it names, reword, and a two-press `Never suggest this`. `Restore` lives on Direction under `Moves you have set aside` — the one surface a forbidden move has not vanished from. 7 browser tests. |
| **B3** supporting wins (`V33-020`) | Zero to three, and empty is the normal case. A win must be small (≤10 min minimum), from a different area than the primary, low-friction, no identified risk and reversible — anything else is a second recommendation wearing a smaller label. None at all when capacity is low or depleted. |
| **B4** weekly direction (`V33-019`) | The card names the kind first — one focus, or deliberately quiet "chosen on its merits, not for lack of an idea" — then the proposal, the **minimum win**, what to **protect**, confidence, and `Why this` collapsed. Snooze states its return date; Skip states its semantics. All four controls are worded identically on every branch (`Adjust` and `Set a direction instead` were the same control under two names). Expected lift is optional and never set: a number would need a defined metric and comparable weeks, and neither exists. |
| **B6** Direction (`V33-015`) | Compact cards showing condition, trajectory (hidden when it would only say "unknown" twice), what is in the way, one move or an explicit no-move, at most two metrics, and Update. Everything else behind `More`. Exactly one card open at a time, owned by the surface, with compact jump controls. |
| **B8** Review (`V33-017`) | Freshness and quiet are badges — word plus border style, never colour alone — instead of a grey run-together sentence. Rows stack on a phone and split into text/controls when there is room. |
| **B9** Learning (`V33-018`) | Leads with what has been learned, how confident, and what changed. Findings are one sentence with the chart one tap away, and a finding whose graph has no evidence renders **nothing at all** — a chart of nothing implies a finding was looked for and found. |
| **D1/D2** move families and catalogue (`V33-040`–`V33-042`) | A family model — stable `patternId` independent of wording, `familyId`, purpose, safety class, lifecycle state, observation window, capacity shape, one-hop prerequisites, declared contradictions and a rule version — and **102 authored patterns across 20 families**, up from 40. Every pattern declares `distinctBecause`, and `moveCatalogue.test.ts` (22 tests) fails the build on a reused statement, a duplicated reason within a family, two siblings sharing shape/size/effect, a family holding more than a third of the catalogue, a family of one, a dangling contradiction, a two-hop prerequisite, or any calorie, macro, dose or treatment word. |
| **D3/D4/D5** registry, contradictions, personalisation (`V33-043`–`V33-046`) | `registry.ts` is the one door into the catalogue, with `LEGACY_ALIASES` mapping 30 pre-catalogue candidate ids onto canonical patterns so evidence recorded since Phase 7 stays attached. **D4** is operational, not documentation: `resolveContradictions` runs in `arbitrate` after the North Star gate and before ranking, supporting wins refuse to contradict the primary or each other, and `ruledOutByRecentAction` stops a move that would undo something completed in the last four hours. Symmetric, contextual, and writes nothing — a conflict tonight is not a ban tomorrow. **D5** `personalise()` returns a statement, never a pattern, so substitution structurally cannot mint a new identity; unfilled slots are stripped so braces never reach the owner. |
| **Section I** owner sovereignty (`V33-032`) | A 28th record family, `move-preference`, carrying the owner's standing say over a move: `paused` (must name an end — a pause without one is a prohibition in softer wording), `blocked-here` (must name the context, and never matches an unknown one), `modified` (changes the words, never the eligibility), `forbidden`, `restored`. Resolved in `stances.ts`, applied in `arbitrate`, written only by explicit commands in `moveSovereignty.ts`. |

### The eleven clarifications

| # | Status |
| --- | --- |
| 1 — depth is not a control | **Done.** The `15/30/45/Full` selector is **removed**, not relabelled. `src/intelligence/guides/questionValue.ts` derives length from decision value, coverage/cadence, existing evidence, and marginal value. A caller's `depth` argument now provably cannot change what is asked. |
| 2 — no generic time question | **Done.** Four contextual-capacity prompts added (setting, engagement, interruptibility, privacy), wired into the morning and afternoon guide orders *ahead of* the clock, and `selectQuestion` runs a ladder from most constraining to least. The minutes question is last and gated: asked only when a reply could change which moves are possible, or which can be done in full rather than cut to their minimum. Every question carries `Not sure`. |
| 3 — move capacity characteristics | **Done end to end.** The five shapes with setup and interruption cost; profiles declared on the moves whose eligibility genuinely depends on one; `selectOutput` runs a third filter after time and capacity that removes a move whose shape the situation forbids; the situation is read from records with a three-hour recency window. Proven by changing one answer and watching the recommendation change. |
| 4 — Can't Now as a small secondary action | **Done.** Reasons are classified `temporary-context` / `prerequisite` / `preference` (section I's three kinds), reversible prerequisites carry an unlocking action rather than recording an inability, and `chooseDeclineReasons` offers at most five drawn from the situation — always ending in `Other, or not sure`, so the list is never a closed menu. |
| 11 — recurring context as soft prior | **Done.** `recurringContext.ts` infers what the situation usually is at this hour on this weekday, requiring three comparable days and 70% agreement, one vote per day. It is stored apart from the observed situation and **never reaches `fits`** — enforced by a test that reads `selectOutput`'s source. Fresh explicit context wins immediately. |
| 5 — real global recomputation | **Done.** `afterDecline.ts` rejects the same move shortened, a reworded twin, and anything from the area just refused, then walks the ranking for a real alternative. |
| 6 — temporary constraints release | **Done** (verified pre-existing behaviour, now covered by tests). |
| 7 / 8 — no pestering; optimise per unit capacity | **Done at the decision layer.** Abstention is a first-class result: when nothing genuinely beats carrying on, the recompute returns silence rather than filler. |
| 9 — association not causation | **Done for owner sovereignty.** The specific inference this forbids — repeated declines becoming a standing preference — is now structurally impossible: declines live on `execution` records and release themselves, stances live in their own family and are only ever written by explicit commands, and tests read both sources to prove no path connects them. The wider "often followed by" association language in section G is still not started. |
| 10 — regression tests | **Done.** `tests/unit/v33Capacity.test.ts`, 18 tests, one block per named property. |

### Not started

Sections **C, E, F, G, H, J, K** and the **AT33 acceptance scenarios (M)**. Section **D** is
partly done: D1 (the family model) and D2 (breadth, 102 patterns) are complete, D3, D4 and D5 are
complete. **The generator migration itself is not**: the seven domain slices still build
candidates from their own authored lists rather than selecting catalogue patterns, so the
102 patterns remain reachable in principle — via the registry, with aliases and
contradictions live — rather than in practice. `moveReachability.test.ts` states that
boundary rather than hiding it, and fails the build if a legacy list ever leaks into
shared decision code. Sections **A, B** and **I** are complete. Section **I** is complete —
three-way distinction, prerequisite actions, the full owner-control lifecycle, and the
interface to reach all of it.

This is still the majority of Prompt 9C by volume. It is stated plainly rather than folded
into a gate table, because a partial pass reported as anything but partial is worse than no
pass.

The North Star intelligence architecture in the v3.3 amendment — move families and the
≥100-pattern catalogue, sequence and combination learning, opportunity-cost reasoning,
sustainability versus immediate effectiveness, bounded experiments, move lifecycle and
evidence versioning — is untouched. It is the bulk of the remaining work and needs its own
passes; none of it is started, and nothing in the codebase pretends otherwise.

## Gate status

- Status: **GREEN.** Every item the repair pass was scoped to is done and verified on the
  deployed build. The coverage plan now changes what the owner is asked, a declined action
  cannot come straight back, same-surface duplication is removed at the source, rules are
  versioned with a stated migration policy, cadence and snooze exist and can only narrow, and
  the model tournament is deferred with its reasons recorded — which the plan permits.
- One owner decision was applied: **a faith practice is protected content on Now**, requiring
  an explicit surface permission rather than domain enablement alone.
- Private local use: **READY** (unchanged from Prompt 7B).

### Phase 8 gate, item by item

| Gate item | Verdict |
| --- | --- |
| No competing global recommendations | **PASS** — one `DecisionOutput`; rejected candidates never rendered |
| Every global action passes the North Star gate | **PASS** — applied before ranking; abstains when no direction is recorded, and says so |
| Each time block can change coverage and the move | **PASS** — recomputes on every new record, and the coverage decision now narrows what each guide asks |
| Daily Guides stay focused, not a checklist | **PASS** — ≤5 steps asserted on a real check-in with seven areas on |
| Every enabled domain visible in the Weekly Quick Domain Scan | **PASS** — including areas with nothing in them; verified on the deployed build |
| A quiet domain cannot stay forgotten | **PASS** — 21 days to the scan, 60 to the deep review, and an area the owner deliberately quieted is excluded rather than nagged |
| Full domain pages scan fast without duplicating truth | **PASS** — Phase 7; Command Core adds no store |
| Can't Now fully recomputes | **PASS** — the declined action is held out of arbitration until evidence recorded strictly after the decline |
| Equivalent candidates merge | **PASS** |
| Every contextual question has decision or learning value | **PASS** — the guide planner consumes the coverage decision, so suppression governs what is asked |
| Sensitive topics never appear outside explicit permissions | **PASS** — including Now, which is now a permissible surface and denied by default |
| Observable outcomes replace cause questions | **PASS** — Phase 6 |
| Missing outcomes stay unresolved | **PASS** — Phase 5 |
| Tradeoffs are visible | **PASS** — stated, never resolved |
| Recent and long-term patterns can disagree | **PASS** — both printed, never averaged |
| No score wall of any kind | **PASS** — no percentage in the synthesis, deep review, or scan |
| AI export prompt concise, evidence-bound, personality-aware, privacy-explicit | **PASS** — verified on the deployed build, including a no-network assertion |
| Strategic review useful without a scorecard | **PASS** |
| Complexity adopted only when it beats the baseline | **DEFERRED** with reasons recorded in `docs/REQUIREMENTS.md` §3p, as the plan permits at line 734 |

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES**

## Command Core — where it begins and ends

The architectural requirement of this prompt.

**Begins** at `runCommandCore(input)`. Everything before it — assessing state, running each
of the seven slices, gathering their submissions — is *episode assembly* and lives in
`src/intelligence/index.ts`. Command Core does not know how a submission was produced and
cannot ask.

**Ends** at the returned `CommandCoreResult`. It writes nothing, reads no clock, consumes no
randomness. Same evidence at the same instant, same screen.

**The line is enforced rather than described.** Nothing under `src/command-core/` may import
a domain's content or intelligence modules; nothing under `src/domain/` or
`src/intelligence/domains/` may import Command Core. `tests/unit/commandCore.test.ts` walks
the import graph in both directions, and a third test greps for domain vocabulary — a core
that knew what a milestone or a resilience band was would need editing whenever a domain
changed.

That is what makes the subsystem upgradeable: a research-backed arbitration or a learned
coverage policy replaces files inside the directory, and no slice moves, because no slice is
reachable from it.

One entry point, eight internal modules: `arbitration/`, `coverage/`, `review/`, `trace/`,
`recompute/`, `export/`, plus `boundary.ts` and `index.ts`. Full map in
`docs/architecture/ARCHITECTURE_OVERVIEW.md` §3a.

## Work completed

- **`src/command-core/`** — the subsystem, 14 files, one public function.
- **The North Star gate** — four qualifying routes, applied before ranking, labelling every
  survivor with the route it took.
- **Candidate merging** — two domains asking for the same outcome become one candidate
  carrying both reasons; two candidates from the same generator never merge.
- **Coverage planning** — freshness, cooldown, expiry, repeated-skip, protected context, and
  unpermitted topic, read from the Phase 7 declarations rather than a second copy.
- **Forgotten-domain protection** — 21 days to the weekly scan, 60 to the deep review, never
  a daily guide.
- **The Weekly Quick Domain Scan** — every switched-on area on one surface, with `No change`,
  `Quick update`, and `Open`. Three domain scans were missing (health, career, fatherhood
  predate shared rule 20) and were written.
- **Synthesis, tradeoffs, and two horizons** — tradeoffs are stated and never resolved; the
  recent and long-term readings are printed side by side and never averaged.
- **The monthly deep review** — due, never overdue, and explicitly without a scorecard.
- **The decision trace** — counts per stage, never a list of rejected candidates.
- **The AI review instruction block** — Brief/Standard/Deep, Supportive/Balanced/Hard Coach,
  eight sections, confidence labels, and the privacy disclosure. The prohibitions are
  identical at every intensity.

## The repair pass, item by item

1. **The coverage plan governs what is asked.** `planGuide` takes Command Core's decision.
   Suppression removes a prompt and reports it in the core's own words; offered items append
   at the back and only where the capture's owning surface is `guide`. `update-area` is
   exempt — a question the owner went looking for is a different act from one the app raised.
   Nothing is added because time passed, and a test runs the planner five months apart on
   identical records to prove it.
2. **A declined action cannot come straight back.** `activeDeclines` holds it out of
   arbitration until an observation or context snapshot is recorded **strictly after** the
   decline — strictly, because the decline writes its own snapshot at the same instant and
   must not be the evidence that reverses itself. Matching is on a new optional
   `engineCandidateId`; absent means "cannot be matched", never "matches everything".
3. **Same-surface duplication removed at the source.** A category a domain panel already
   reports on is no longer rendered separately; categories no domain reads still appear, and
   the full domain detail under Direction is untouched. The 8H workaround that renamed
   money's category label is reverted. The test that proves it found a second instance —
   three graph panels all titled "Trend" — now named by the question each answers.
4. **Research-rule versioning.** `DECISION_RULES_VERSION` is recorded on every
   recommendation. Nothing is rewritten on an upgrade, absent means unknown rather than zero,
   and comparison across versions is opt-in and segmented. Policy in
   `docs/architecture/ARCHITECTURE_OVERVIEW.md` §3b.
5. **Cadence and snooze.** Three settings and no fourth: there is no "more often" and no code
   path that promotes, because eligibility is a statement about evidence and a preference
   cannot make it true. An area set to "Only when I open it" is not reported as forgotten —
   a decision, not neglect. Snooze names a date and leaves nothing owed.
6. **Model tournament deferred**, with all three entry criteria shown absent and recorded in
   `docs/REQUIREMENTS.md` §3p. It will not be built without objective comparison criteria and
   safe synthetic fixtures.

### The privacy decision, applied

A faith practice the owner named is now protected content on Now. `faith-practice` is a
protected topic, `now` is a permissible surface, and the grant is denied by default —
consistent with `buildFaithScan`, which has withheld the same words from the weekly review
since Prompt 8F.

Without the grant the candidate still appears, still counts the practice, and still shows the
words on the page he opened. Only the quoting stops: withholding the content is not
withholding the help.

Making that reachable exposed a related problem. The permissions control lived inside the
emotional area and rendered **every** protected topic, so the switch governing money figures
and the one governing a faith practice both sat under "Emotional state and relationships".
It is now a shared component and each area shows only its own topics.

## Tests and evidence

- **Unit: 693 passed**, up from 668. 23 new for the repair pass.
- **Browser: 640 passed**, run alone, one Playwright process throughout, isolated throwaway
  contexts, no owner data cleared.
- **Deployed: verified against Pages** with `playwright.deployed.config.ts`.
- **Clean checkout: verified.** A fresh clone with `npm ci` passes format, lint, typecheck,
  unit, and build — so nothing in the result depends on an untracked or local-only file.
- The boundary test is the load-bearing one: it walks every import under
  `src/command-core/` and every import under the domain directories, both directions.

### The regression the full browser suite caught

The focused repair tests passed 11/11 and the full suite still failed. The decline exclusion
removed the declined candidate and stopped there — so when it was the only candidate,
`selectOutput` had nothing left to reason about and emitted silence. Declining with "I'm not
sure how much time I have" produced *"nothing requires attention right now"* instead of
asking about the time: strictly worse than the behaviour it replaced.

Fixed by allowing exactly one thing through. A decline may not silence a **question** that
would produce the very evidence releasing that decline, and only a question the unfiltered
set would have asked anyway. The declined action itself stays excluded either way.

This is the second time in Phase 8 that a change in the path of every decision passed its own
tests and broke something else. It is the reason the full suite is a gate and not a
formality.

### Three tests that had become imprecise, and were corrected rather than deleted

- `faith.spec.ts` asserted the practice is quoted on Now — the behaviour this pass
  deliberately changed. Rewritten to assert the withheld form.
- `health.spec.ts` asserted a category label that the deduplication now correctly folds into
  the domain panel. Repointed at a category no domain owns, preserving the slug guard the
  test exists for.
- `production-money.spec.ts` located "the panel is gone" by region name, which stopped
  distinguishing the domain panel from the category summary once the `Money & pressure`
  workaround was reverted. Keyed on the update control instead — and the first replacement
  was also wrong, because Manage Areas prints each area's question as a subtitle.

### Two failures that were the test's fault, not the product's

A hand-built decline fixture omitted `occurredAt` and crashed `outcomeWindows` — a record
missing an envelope field is not a record, and the real fixtures exist for this reason. And
the duplicate-panel assertion read `aria-label` when `Panel` labels its section with
`aria-labelledby`, so every name came back empty and the surface looked catastrophically
broken. Reading the accessible name properly turned a false alarm into a real finding: three
graph panels all titled "Trend".

### The commit that shipped without three of its own files

`ce95c11` was pushed with `src/command-core/coverage/` missing — `plan.ts`,
`suppression.ts`, and `forgotten.ts`. `.gitignore` carried an unanchored `coverage/`, which
git matches at **any** depth, so the directory was silently excluded. `git add -A` reported
success, `git status` showed only the untracked parent directory, and every local check
passed because the files were on disk.

It surfaced as a lint failure in CI — type resolution failing on two imports — after the
deploy job had already been skipped. I caught it by checking the workflow status rather than
continuing to poll a deploy that was never going to appear, which is the lesson Prompt 8D.2
recorded and this is the first time it paid.

Fixed in `5659f64`: the build and test-output rules are anchored to the repository root, and
a guard fails the build when git is ignoring anything under `src/`. The guard was verified
non-vacuous — with the old pattern restored it names exactly the three missing files.

### Four defects found, and how

An independent read-only audit agent was run against the finished tree, per the multi-agent
instruction — one lead agent throughout, no subagent editing shared files, no second
Playwright process. It found three of the four below; the first I found myself with a probe.

1. **The North Star gate silenced five of seven domains.** It accepted `improves` only on
   three "foundation" channels, so environmental ease, financial resilience, values
   alignment, and connection all failed it. **630 unit tests passed** while the global output
   flipped from action to silence across the corpus, because nothing asserted what Now
   actually emits. Fixed, and `everyDomainCanReachNow` now guards it.
2. **Deduplication merged two different commitments.** Two `unblock` candidates for two open
   loops shared a generic outcome and follow-up; one was dropped from the comparison without
   a word. Fixed by merging only across distinct generators.
3. **The synthesis described one area using another's evidence.** `summaryFor` matched on
   `reads.includes(...)`, so health, emotional, and home all resolved to
   `time-attention-capacity`, and faith and money to `direction-and-commitments`. The same
   shape as the fatherhood fallback bug — and worse in consequence, because the false
   attribution reached the review surface and the block pasted into an external model.
4. **Prompt deduplication was a no-op.** The call site built a `Set` of the deduplicated ids
   and filtered by membership, which keeps every duplicate. The function was correct and
   unit-tested in isolation; the caller discarded its result.

The audit also flagged that the boundary test matched `domain/<name>/` with a trailing slash
only, so a barrel import would evade it. Tightened.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across tracked files and the built
  bundle.
- The weekly scan is walked across every scenario for sensitive placeholder strings. The
  home slice's change is quoted deliberately: it is `general`-class and describes an object.
- The review instructions declare the range, the included classes, and what was withheld,
  and instruct the reader that absent is not zero.
- **One pre-existing exposure carried forward, not introduced here.** A faith practice the
  owner named can appear in a candidate statement on Now (`faithCandidate.ts`), gated on
  domain enablement only. The faith scan withholds the same content from the weekly scan on
  exactly the reasoning that would apply. It predates Phase 8 and is listed as a blocker
  decision below rather than changed silently in a phase that was not scoped to it.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.

## Architecture decisions

No new ADRs. Command Core wraps Phase 4's `selectOutput` rather than reimplementing the nine
gates, which was the significant call: two implementations of one rule means the one nobody
edits is the one that matters.

## New dependencies

**None.**

## Known limitations

- **The coverage plan can only ever cover five domains.** `ALL_CONTEXTUAL_CAPTURES` is
  composed from the five slices that declared contextual-capture metadata; health and career
  predate the requirement and declare none. Their questions are still asked — the planner's
  own lists cover them — but they cannot be suppressed, snoozed, or cadence-controlled until
  they declare. That is the next bounded piece of work if you want cadence to be uniform.
- **No scenario produces a quiet area**, so the forgotten-domain path is unit-tested through
  its own function rather than end to end through the corpus.
- **Time-block awareness is recomputation, not scheduling.** Every write recomputes and the
  answer can change at any hour, but nothing fires at a boundary; there is no timer anywhere
  in the product. That is the honest reading of "each time block can change coverage" for an
  app with no background execution.
- **Only two generators declare capacity shapes so far.** The shared core generator (focus
  block, unblocking step, recovery pause) and health. The other six domains produce moves
  with no declared shape, which the gate correctly treats as *unclassified* rather than as
  *fits anywhere* — so they are never wrongly removed, but they are also never protected from
  a situation that genuinely rules them out. Extending the remaining six is bounded, mechanical
  work and the largest remaining piece of clarification 3's intent.
- **The recovery pause is deliberately shapeless and must stay that way.** It is the move of
  last resort; if `you cannot step away` could remove it, the app would fall silent in exactly
  the situation most needing an answer. There is a test that fails if it gains a shape.
- **The e2e preview server drops one navigation per full run, on this machine.** Two
  consecutive 703-test runs each failed exactly one test with `net::ERR_ABORTED` on
  `page.goto` against `localhost:4173` — a different test each time, never an assertion,
  and each passing on its own immediately afterwards. Ruled out: competing servers (node
  killed before each run, one Playwright process), ambiguous locators (the failure is
  before any locator), stale artifacts (fresh build per run), shared state (fresh context
  per test), and product regression (isolation passes). It is `vite preview` dropping a
  connection under sustained load. Not masked with a retry, because a retry would also
  hide a real navigation failure; recorded here so the next reader knows the signature.
- **A situation report expires after three hours.** Where the owner was this morning is not
  where they are now. That window is a judgement, not a measurement, and it is the number to
  revisit first if the app starts asking where you are too often.
- Carried forward: local database not encrypted at rest; app lock hides the screen only; no
  notifications; `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router;
  service-worker staleness; deletion semantics undecided.

## Blockers

**None blocking Phase 9.** Three owner decisions carried forward:

1. **Measure cached startup on the Samsung phone.**
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
3. **Confirm the `LEG-*` row mapping** for §3l–§3n.

The fourth — whether a faith practice may appear on Now — was decided and applied in this
pass: it may not, without an explicit permission for that surface.

## Process notes carried forward

One Playwright process at a time — honoured throughout this prompt, including while the
audit agent ran (it was read-only and ran none).

`prettier --write .` under-reports; run it and re-check before committing.

`vitest` does not typecheck; run `npx tsc --noEmit`.

A disavowal is still a mention (Prompt 8G).

**An unanchored `.gitignore` rule can delete source from a commit in silence.** `coverage/`
matched `src/command-core/coverage/`. Anchor anything naming a build artifact, and never
trust `git add -A` plus a green local suite as proof that the commit is complete — a clean
clone is the only proof.

**A failed deploy is a CI question, not a patience question.** Twenty minutes of polling told
me nothing; one API call told me the run had failed and the deploy was skipped.

**Widening a callback signature is an API change, and TypeScript will not always stop you.**
Making `onOpenGuide` take an *optional* prompt id left it assignable to a `() => void` click
slot, so `onPrimary={onOpenGuide}` kept compiling and React started passing the click event
as a prompt id. 720 unit tests and 638 browser tests were green; the app white-screened on
the first button a new owner ever touches, because the only surface that reaches it is a
profile with zero records and every seeded test skips past it. Two lessons: **make the
parameter required** when `undefined` is a real choice rather than an absence, and **the
fresh-profile path needs its own tests** — no amount of seeded coverage will ever visit it.

**A locator that passes in isolation and fails in the full run is ambiguous, not flaky.**
`production-faith` created two practices whose names share a prefix and matched them with a
substring locator, so which one got clicked was a coin toss. It had been passing for weeks.
Reach for `exact: true` before reaching for a retry.

**Two Playwright processes at once looks exactly like flake.** Running a second suite while
one was going killed a preview server and produced 48 `ERR_CONNECTION_REFUSED` failures that
varied run to run. I diagnosed a scenario as non-deterministic on that evidence and was
wrong. Rule out competing servers before the word "flaky" is used at all.

**An uncontrolled `<details>` loses its state on every re-render.** The areas drawer slammed
shut each time the owner toggled an area, because React re-renders the panel on the write.
Any disclosure on a surface that writes has to hold its open state in React.

**Measure before redesigning.** The B1 card was "oversized with tiny words". Rendering it at
three time blocks and reading the boxes turned that into 94/116/135px at 12.48px, which named
both the geometry bug and the type bug precisely and made the fix verifiable.

**A passing suite is not evidence that behaviour is unchanged.**
630 tests passed while the North Star gate silenced most of the product. Nothing asserted
what Now emits across the corpus, so nothing could have caught it. When a change sits in the
path of every decision, assert the output of every scenario before and after.

## Next permitted prompt

**Continue Prompt 9C v3.3 at section B2.** Phase 9 legacy import remains out of scope and
is not the next prompt.

The two cheapest high-value items to resume with, because they turn tested modules into
observable behaviour rather than adding new surface area:

1. Attach a `CapacityProfile` to each domain's candidates, then assert the parallel-move
   property end to end through the scenario corpus.
2. Add the four contextual-capacity prompts to the guide orders and re-baseline what every
   scenario emits, before and after.

### Superseded, for the record

**Phase 9 — optional quarantined legacy import.**

Phase 8 is closed. The one piece of Phase 8 work deliberately left is contextual-capture
metadata for health and career, which would make cadence and suppression uniform across all
seven areas rather than five; it is a bounded amendment rather than a gate item, and it is
recorded under Known limitations.
