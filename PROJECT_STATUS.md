# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 8 — Command Core delivered.** Phases 0–7 remain GREEN.
- Current prompt: PROMPT 9 / Phase 8 (complete)

## Gate status

- Status: **YELLOW.** The subsystem is built, documented, boundary-enforced, and verified on
  the deployed build. Four Phase 8 deliverables are **not** wired to a surface the owner can
  reach, and two are not built at all. They are listed under "What is not done" and none is
  hidden behind a passing test.
- Private local use: **READY** (unchanged from Prompt 7B).

### Phase 8 gate, item by item

| Gate item | Verdict |
| --- | --- |
| No competing global recommendations | **PASS** — one `DecisionOutput`; rejected candidates never rendered |
| Every global action passes the North Star gate | **PASS** — applied before ranking; abstains when no direction is recorded, and says so |
| Each time block can change coverage and the move | **PARTIAL** — recomputes on every new record; no time-block trigger |
| Daily Guides stay focused, not a checklist | **PASS** — ≤5 steps asserted on a real check-in with seven areas on |
| Every enabled domain visible in the Weekly Quick Domain Scan | **PASS** — including areas with nothing in them; verified on the deployed build |
| A quiet domain cannot stay forgotten | **PASS (untested at the boundary)** — 21 days to the scan, 60 to the deep review; no scenario yet produces one |
| Full domain pages scan fast without duplicating truth | **PASS** — Phase 7; Command Core adds no store |
| Can't Now fully recomputes | **PARTIAL** — `recomputeAfterCantNow` written and tested; the decline path still re-runs the episode without it |
| Equivalent candidates merge | **PASS** |
| Every contextual question has decision or learning value | **PARTIAL** — enforced for triggered questions; the plan is not yet consumed by the guide |
| Sensitive topics never appear outside explicit permissions | **PASS on the new surfaces**; one pre-existing exposure noted below |
| Observable outcomes replace cause questions | **PASS** — Phase 6 |
| Missing outcomes stay unresolved | **PASS** — Phase 5 |
| Tradeoffs are visible | **PASS** — stated, never resolved |
| Recent and long-term patterns can disagree | **PASS** — both printed, never averaged |
| No score wall of any kind | **PASS** — no percentage in the synthesis, deep review, or scan |
| AI export prompt concise, evidence-bound, personality-aware, privacy-explicit | **PASS** — verified on the deployed build, including a no-network assertion |
| Strategic review useful without a scorecard | **PASS** |
| Complexity adopted only when it beats the baseline | **DEFERRED**, as the plan permits — no transparent baseline, no proven deficiency, no two candidates |

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

## What is not done, and is not hidden

This is why the gate is YELLOW rather than GREEN.

1. **The coverage plan is not consumed by the guide planner.** `planGuide` still builds its
   steps from its own lists and its own freshness rule. Suppression, cooldown, expiry, and
   repeated-skip are computed, reported on the Review surface, and affect nothing the owner
   is asked. Deliverables 4, 6, 9, and 10 are therefore built but inert.
2. **`recomputeAfterCantNow` has no call site.** Declining still re-runs the whole episode —
   so recomputation does happen — but without the declined-candidate exclusion the module
   was written to provide. A `not-relevant` decline can re-offer the same action.
3. **Visual and surface deduplication (23) and the duplicate panel/category labels (24) are
   not addressed.** Money's exact label collision was fixed in 8H; the general
   near-duplication across all seven areas remains.
4. **Research-rule versioning (32) is not built.** No version identifier exists on any rule.
5. **Owner-controlled coverage cadence (part of 19) is not built.** Snooze, domain
   enablement, sensitive-topic permissions, and coaching intensity all exist; cadence does
   not.
6. **Model tournament (39) is deferred**, which the plan explicitly permits: no transparent
   baseline exists, no deficiency has been proven, and there are not two meaningful
   candidates. This is now recorded rather than silently skipped.

## Tests and evidence

- **Unit: 667 passed**, up from 630. 37 new for Command Core.
- **Browser: run alone**, one Playwright process throughout, isolated throwaway contexts, no
  owner data cleared.
- **Deployed: verified against Pages** with `playwright.deployed.config.ts`.
- The boundary test is the load-bearing one: it walks every import under
  `src/command-core/` and every import under the domain directories, both directions.

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

- Everything under "What is not done" above.
- **The coverage plan can only ever cover five domains.** `ALL_CONTEXTUAL_CAPTURES` is
  composed from the five slices that declared metadata; health and career predate the
  requirement and declare none.
- **No scenario produces a quiet area**, so the forgotten-domain path is unit-tested by its
  constants rather than end to end.
- Carried forward: local database not encrypted at rest; app lock hides the screen only; no
  notifications; `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router;
  service-worker staleness; deletion semantics undecided.

## Blockers

**None blocking Phase 9.** Four owner decisions carried forward:

1. **Measure cached startup on the Samsung phone.**
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.
3. **Confirm the `LEG-*` row mapping** for §3l–§3n.
4. **Decide whether a faith practice may appear in a candidate statement on Now.** The scan
   withholds it; the candidate does not.

## Process notes carried forward

One Playwright process at a time — honoured throughout this prompt, including while the
audit agent ran (it was read-only and ran none).

`prettier --write .` under-reports; run it and re-check before committing.

`vitest` does not typecheck; run `npx tsc --noEmit`.

A disavowal is still a mention (Prompt 8G).

**New, and the sharpest yet: a passing suite is not evidence that behaviour is unchanged.**
630 tests passed while the North Star gate silenced most of the product. Nothing asserted
what Now emits across the corpus, so nothing could have caught it. When a change sits in the
path of every decision, assert the output of every scenario before and after.

## Next permitted prompt

**Phase 9 — optional quarantined legacy import**, or a bounded amendment closing the six
items under "What is not done". The larger of those — wiring the coverage plan into the
guide planner — is the one that would turn four built-but-inert deliverables into behaviour
the owner can see, and it is the natural next bounded prompt.
