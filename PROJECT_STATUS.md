# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 8 — Command Core delivered.** Phases 0–7 remain GREEN.
- Current prompt: PROMPT 9 / Phase 8, including the bounded repair pass (complete)

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

**A passing suite is not evidence that behaviour is unchanged.**
630 tests passed while the North Star gate silenced most of the product. Nothing asserted
what Now emits across the corpus, so nothing could have caught it. When a change sits in the
path of every decision, assert the output of every scenario before and after.

## Next permitted prompt

**Phase 9 — optional quarantined legacy import.**

Phase 8 is closed. The one piece of Phase 8 work deliberately left is contextual-capture
metadata for health and career, which would make cadence and suppression uniform across all
seven areas rather than five; it is a bounded amendment rather than a gate item, and it is
recorded under Known limitations.
