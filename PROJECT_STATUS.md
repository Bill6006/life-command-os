# Life Command OS Project Status

## Project identity
- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 3.0 Final
- Current phase: Phase 6 — Integrated private alpha, real interactions, and Guide foundation
- Current prompt: PROMPT 7A (complete). **Phase 6 is incomplete until Prompt 7B.**

## Gate status
- Status: **GREEN** for Prompt 7A. Phase 6 as a whole remains open.
- Gate evidence:
  - *All checks pass* — 212 unit tests, 266 browser tests, lint, typecheck, format, build.
  - *No normal prompt asks why, what caused it, whether it worked, or how it felt* — the
    policy rejects all four families, and the catalogue validates itself on import, so a
    prohibited question cannot reach a person without breaking the build.
  - *Real interactions survive reload* — Start, Can't Now, guide completion, outcome
    capture, weekly response, and Quick Capture each write canonical records; every browser
    assertion reloads the page before reading.
  - *No default value becomes evidence* — nothing is preselected anywhere, and an untouched
    control writes no record at all. Asserted in both the unit and browser suites.
  - *Guides meet the interaction budget* — a normal check-in is capped at five responses;
    only `45` and `full`, chosen deliberately, go beyond it.
  - *No private data in repository evidence* — synthetic-only, scanned clean.

## GitHub Pages owner preview
- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — and the deployed app now starts
  **empty**, because it reads real local records rather than a chosen scenario.

> **Service-worker note.** A returning visitor may see the previous build once; reload again.

## What changed most: the app now reads what is stored
Through Phase 5 the shell picked a set of synthetic records from a dropdown and asked the
engine to reason over them. That dropdown is gone. The shell reads IndexedDB, the controls
write back through the application layer, and the surfaces render what committed.

The synthetic scenarios still exist and every test still uses them — they are seeded through
the test bridge, so the browser tests now drive **exactly the interface the owner uses**
rather than a scenario the owner could also see.

## Work completed
- **The behaviour-first question boundary** — `domain/prompts/policy.ts` rejects questions
  requiring a cause, a feeling, an efficacy judgement, or self-diagnosis. Every prompt in the
  product is a `CapturePrompt`; the catalogue calls `assertPromptCatalogue` at module load, so
  a violation fails the build, the tests, and the page load together.
- **The seven approved anchored scales** — energy, mood, stress, confidence, overwhelm,
  sleep/recovery, readiness. Ordinal, visible label, scale id, and scale version are stored
  together, and the direction of each scale is data rather than an assumption.
- **Wired response controls** — Start, Can't Now, Done / Record outcome, Update state, Why
  this. All write through `application/commands/`; the UI cannot reach IndexedDB and fails
  lint if it tries.
- **`GuideSessionRecord`** — the twenty-second canonical family. Morning, catch-up,
  afternoon, evening, weekly, and quick check-in, at 15 / 30 / 45 / Full depth, one question
  at a time.
- **Lightweight sleep and food capture** — times, counts, and two existing scales. Sleep
  duration is calculated and labelled an estimate. Five food prompts, no checkbox wall.
- **Quick Capture shell** — one capture writes one canonical event.
- **Real interface states** — loading, empty, and error are driven by real storage; recovery
  by a real failed write.

### Decisions worth naming
- **Starting is not executing.** Pressing Start writes an execution in the
  `unknown-execution` state. It opens the outcome window so the evening guide can follow up,
  and claims nothing about what happened. The real state is written later as a superseding
  record. The evaluation layer already refuses to read `unknown-execution` as evidence, so an
  un-followed-up start can never quietly become a success.
- **Completing is not an outcome.** "Did you finish it?" describes the execution. Whether
  anything changed is a separate observable question, and with no answer to one the outcome
  stays `unresolved`. Finishing an action is never promoted into evidence that it helped.
- **An untouched control writes nothing.** Not a zero, not a null, not a placeholder record.
  Absence of a record is the only representation of "not reported" that cannot later be
  misread. A deliberate "I cannot tell" *does* write — as its own value kind, so nothing can
  read it as no, zero, or unchanged.
- **Declining for lack of time makes free time `unresolved`, not smaller.** Guessing a number
  downwards would be inventing evidence. Unresolved is true, and the engine's honest response
  to it is to ask — which is the recomputation the owner wanted.
- **The guide session record has no failure state, and cannot be given one.** Its outcomes are
  completed, stopped, snoozed, and skipped. Nothing there can express missed, overdue, or
  incomplete, so no later feature can start counting them.
- **Guide entry and Quick Capture are bars, not panels.** The Blueprint wants both on Now;
  ADR-0008 caps Now at five panels. Making them controls satisfies both rather than trading
  one against the other.

## Files created or modified
Created (14): `src/domain/records/{scales,guides}.ts`; `src/domain/prompts/{policy,definitions}.ts`;
`src/intelligence/guides/planGuide.ts`;
`src/application/commands/{capture,decisionEpisode,guideSession}.ts`;
`src/ui/state/useLocalRecords.ts`; `src/ui/features/guides/{GuideSurface,PromptControl}.tsx`;
`src/ui/features/respond/RespondSurfaces.tsx`; `tests/unit/{prompts,interactions}.test.ts`;
`tests/e2e/interactions.spec.ts`; `tests/support/required.ts`

Modified: `domain/records/{index,envelope,evidence,direction}.ts`; `domain/policies/invariants.ts`;
`intelligence/decision/{selectOutput,weeklyDirection}.ts`; `app/{scenarios,diagnostics}.ts`;
`ui/features/{shell/AppShell,now/NowSurface,data-privacy/DataPrivacySurface}.tsx`;
`ui/components/primitives.tsx`;
`ui/design-system/console.css`; `vite.config.ts`; `tests/fixtures/records.ts`;
`tests/unit/records.test.ts`; `tests/e2e/{console-shell,shell}.spec.ts`;
`docs/{REQUIREMENTS.md,architecture/ARCHITECTURE_OVERVIEW.md}`

## Tests and evidence
- **Unit: 212 passed**, up from 143. 69 new across prompts and interactions.
- **Browser: 268 passed**, up from 252, across desktop and mobile viewports.
- **Live verification** at 375 × 812 against the deployed build, service worker cleared and
  starting from an empty profile: no scenario picker anywhere; the empty state reached; a
  real morning check-in run through the interface; nothing preselected; the stored
  observation carrying ordinal `4`, label `Good`, `scaleId`, `scaleVersion`, `privacy:
  health`, both timestamps and local-time context; two records surviving a reload; and the
  answered question correctly not asked again.
- Covers: every prohibited question family rejected; the shipped catalogue passing the policy;
  Unknown writing nothing and Unsure writing something; Start, decline, guide completion,
  outcome, weekly response and capture all surviving a reload; catch-up asking strictly less;
  depth changing quantity but not meaning; snooze and skip never becoming failure; one
  capture writing one event; every new control at 44 × 44 with no horizontal overflow.
- **Three real defects found by these tests and fixed rather than tested around:**
  1. **Cross-record invariant checking was quadratic.** It asked "is a cycle reachable from
     here?" once per record, each search starting with a fresh visited set. That was tolerable
     while only restore used the path — but Phase 6 wired it to *every user write*, so a few
     thousand stored records would have made saving a check-in block for seconds. Replaced
     with a single three-colour depth-first search. **5,000 records: 4,838 ms → 20,000
     records: 332 ms.** The regression test now builds twenty thousand rather than five, so
     the length is the assertion and there is no wall-clock threshold to go flaky.
  2. **"I cannot tell" was being dropped.** The outcome command read `Unsure` only when it
     arrived as a list choice, so pressing the dedicated *I cannot tell* button produced
     `unresolved` (nothing reported) instead of `unknown` (looked, could not say). Those are
     different claims about the evidence.
  3. **The browser tests raced their own writes** — reloading before the transaction had
     committed. It passed on desktop and failed on mobile, which is the signature of a timing
     bug rather than a behavioural one. My first fix was itself wrong: it waited for the guide
     bar, which never disappears when the write is made from the console, so it settled
     instantly for Start and stayed flaky. Console writes now wait for the follow-up control,
     which cannot render until the execution is stored and re-read. Suite run twice clean.
  4. **Data & Privacy called the owner's own records synthetic** — found by using the
     deployed build rather than by a test. The sentence was true through Phase 5 and false
     the moment the controls became real, in the one place where being trusted matters most.
     The surface now describes what is actually stored, states plainly that there is no
     encrypted backup and no tested recovery yet, and stops calling the unencrypted export
     anything it is not. A browser assertion now guards it.
- Two of my own assertions were wrong and were corrected: one required Quick Capture to offer
  "Unsure" (the owner is writing something down unprompted — it is not a state they can be
  in), and one asserted guide timing against UTC when the rule is deliberately the owner's
  local wall clock.
- One test file gained an assertion it should always have had: `oneOfEveryFamily()` must
  cover every registered family. It did not cover `learned-belief`, which therefore went
  unfixtured through the whole of Phase 5.

## Privacy status
- Synthetic-only repository: **YES** — scanned clean over all tracked files.
- Real personal data detected in tracked content: **NO**
- Commit identity: GitHub noreply address only.
- Runtime private-data readiness: **NOT YET** — requires Prompt 7B. The empty state says so
  in as many words, on screen, to the owner.

## Architecture decisions
No new ADRs. Two new directories, both created only now that there is behaviour for them:
`domain/prompts/` (what may be asked is a product rule, not a rendering concern) and
`intelligence/guides/` (planning is deterministic reasoning over records; the answers are
written by the application layer, so intelligence still never touches storage).

## New dependencies
**None.**

## New abstractions or infrastructure

**1. `domain/prompts/` — the question boundary**
- Active requirement: `OBS-001`, `OBS-002`, `OBS-003`, `OBS-012`; Prompt 7A task 8.
- Why smaller was insufficient: a prohibited question is easy to add by accident and nearly
  impossible to catch in review once there are a hundred prompts. Making every prompt a
  validated definition turns it into a build failure instead of a conversation.

**2. `GuideSessionRecord` — the twenty-second family**
- Active requirement: `OWN-016`–`OWN-021`, LEG-020; Prompt 7A task 10.
- Why smaller was insufficient: a guide that legitimately asked nothing new leaves no
  observations, so "I checked in and nothing had changed" cannot be reconstructed from
  anything else. And its closed set of outcomes is what makes "snooze is never failure"
  structural rather than a copywriting rule.

**3. `anchored-scale` and `unsure` observed values**
- Active requirement: `OWN-026`–`OWN-032`, `OBS-006`; tasks 5–7 and 9.
- Why smaller was insufficient: a bare state string records what the owner picked while
  losing what the choices meant, which makes the reading uncomparable the first time the
  anchors are reworded. And "I cannot tell" needs a shape with no value field, so no reader
  can mistake it for no, zero, or unchanged.

**4. `privacy` on the envelope**
- Active requirement: `OWN-070`; task 6.
- Why smaller was insufficient: the person entering a fact is the only one who reliably knows
  how sensitive it is. Unclassified resolves to the most protective class, so forgetting to
  classify fails closed. Prompt 7B's export consent consumes it.

**Removed:** the owner-facing scenario picker and its scaffolding styles.
**Carried forward:** the diagnostics bridge, now the seeding path for browser tests, removed
in Prompt 7B.

## Known limitations
- **`locked` is still only a design state.** There is no lock to be in until Prompt 7B builds
  one. `error` and `recovery` are implemented and render from real signals, but reaching them
  in a browser test needs fault injection, which arrives with 7B's corruption, quota, and
  interrupted-write tests.
- **Sleep and food are captured under `time-attention-capacity`**, not a Health domain, which
  does not exist until Phase 7. They are classified `health` for privacy regardless — privacy
  and category are deliberately orthogonal. Phase 7's Health slice projects them by attribute
  rather than re-entering them.
- **Beliefs are still derived, not persisted.** The record family is registered and
  schema-enforced; the engine recomputes from evaluations each run.
- **Follow-ups are the general observable set.** Action-specific follow-ups (`OBS-009`) belong
  to the domains that declare them, in Phases 7–8.
- **Manual Domain Focus, Minimum Wins, and the domain panels are not built.** Phase 7.
- **Cached startup is still unmeasured.** Bundle is ~152 kB gzipped, up from ~137 kB.
- Carried forward: `frame-ancestors` unenforceable on Pages; Chromium-only matrix; no router;
  service-worker staleness; deletion semantics undecided.

## Deferred work
| Deferred | Activates |
|---|---|
| Encrypted backup, versioned crypto metadata, dry-run restore, safety snapshot, rollback, fresh-profile recovery, real Data & Privacy, AI exports, field-level export consent, app lock, notifications, diagnostics-bridge removal | Prompt 7B |
| Domain framework, domain slices, action-specific follow-ups, Manual Domain Focus, Minimum Wins | Phase 7 |
| Cross-domain synthesis, full Can't Now regeneration, strategic review, model comparison | Phase 8 |
| Legacy importer | Phase 9 |
| Traceability generator, browser matrix, release artifacts | Phase 10 |

## Blockers
**None blocking Prompt 7B.**

One non-blocking owner action carried forward: **measure cached startup on the Samsung phone**
and say if it exceeds three seconds.

## Next permitted prompt
**PROMPT 7B — Phase 6: encryption, recovery, and private-alpha readiness.**

Until 7B passes, entering meaningful private data is not safe. The empty state says exactly
that, on screen, rather than leaving the owner to infer it.
