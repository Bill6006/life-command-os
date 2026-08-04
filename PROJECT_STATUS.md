# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: 3.0 Final
- Current phase: **Phase 7 — framework and the first domain slice complete.** Slices
  8C–8H outstanding.
- Current prompt: PROMPT 8B (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8B requirement is met.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Uses shared canonical records* — health activated a **category**, not a store. The
    domain reads the new category and the one its data used to live in, so nothing
    recorded before this slice is stranded.
  - *One domain intelligence panel* — the shared 8A contract, unchanged.
  - *Zero or one candidate* — chosen by a strict order, not a score, so no benefit can
    outrank a safety concern.
  - *Observable outcomes defined* — every action carries a behaviour-first follow-up
    and a stopping point.
  - *One optional domain move, subordinate* — asserted.
  - *Update This Area supported* — its own guide kind, owned by the panel, and it never
    lengthens the morning check-in. Asserted from both directions.
  - *Disable and deprioritise without deleting history* — unchanged from 8A.
  - *What Changed exposed* — through the shared contract.
  - *Only valid representations* — a line trend and a bar comparison earned; a **meter
    refused**, with the reason recorded and rendered.
  - *Privacy and safety boundaries preserved* — everything the slice captures is
    classified `health`; no diagnosis, treatment, programming, or macro vocabulary
    exists anywhere in it.
  - *Absent from Now when irrelevant* — nothing about a domain reaches Now.
  - *Synthetic tests added* — safety, missing, stale, contradictory, Can't Now, silence.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — and no data at all; the app
  starts empty and the scenario corpus is not in the production bundle.

## The decision this slice turned on

Health is the first domain that can hurt someone by being helpful. A health engine that
composes its own advice will eventually compose advice about a symptom, and the distance
between "try a short walk" and "that sounds like it might be…" is one plausible-looking
template.

**So there is no template.** Every action the domain can propose is written out in full
in `domain/health/actions.ts` and reviewed as text. If an action is not in that list the
domain cannot produce it — not because a filter catches it, but because no code path
constructs one.

And the domain knows when to stop. Something significantly in the way *for weeks*
produces one output: worth raising with someone qualified. That is not advice about a
symptom; it is the app declining to have a view and saying who might.

## Work completed

- **`health-recovery-energy` activated as a life category**, through the slice's own
  contract — which is what `categories.ts` has said since Phase 2 is the only way a
  category may arrive. Sleep and food captures moved to it; the domain reads both, so
  records written before today still count.
- **Physical and mental energy as separate scales**, asked from Update This Area rather
  than the morning. They change which action fits, and there is no combined figure
  anywhere on the reading.
- **Pain as interference, not intensity**, and persistence as duration, not severity.
  Both are things the owner can answer without grading themselves.
- **Hydration, food need, movement, and movement response** — broad answers only.
- **Time-of-day energy patterns**, as a bar comparison whose empty buckets are absent
  rather than shown as low.
- **One health candidate**, by a six-step order ending in silence.
- **Update This Area** — its own guide kind, entered from the panel, asking that
  domain's questions and nothing else.
- **Meditation as a shared action captured by purpose** — no page, no streak, no target.
- **A recovery trend** whose unrecorded nights are gaps, and a **refused meter** whose
  refusal is recorded and rendered.

### Decisions worth naming

- **An order, not a score.** A scored health candidate would let a large enough expected
  benefit outrank a safety concern. Six ordered branches cannot.
- **The escalation asks how long, not how bad.** Duration is a fact the owner can state.
  Severity on a scale of ten is a clinical judgement, and asking for one would be this
  product pretending to a role it has explicitly refused.
- **Update This Area is its own owner.** If health questions joined the morning guide,
  switching an area on would make the daily check-in longer — and after seven slices the
  check-in would be the checkbox wall this rebuild exists to end. A test asserts the
  morning is unchanged.
- **Sleep and food moved category, not home.** They were filed under time-and-capacity
  because that was the decision they informed. That was a category error waiting to
  compound; the slice that gives them a real home is the moment to fix it.
- **The meter refusal is rendered, not just computed.** "Health 72%" is exactly what the
  eligibility rules exist to prevent, so the panel says a meter was considered and why
  it was rejected.

## Files created or modified

Created (5): `src/domain/health/actions.ts`;
`src/intelligence/domains/health/{index,assessHealth,healthCandidate}.ts`;
`tests/unit/health.test.ts`; `tests/e2e/health.spec.ts`

Modified: `domain/records/{categories,scales,guides}.ts`;
`domain/prompts/{definitions,ownership}.ts`; `domain/domains/definitions.ts`;
`intelligence/{index}.ts`; `intelligence/state/categorySummaries.ts`;
`intelligence/guides/planGuide.ts`; `intelligence/domains/domainPanel.ts`;
`ui/features/direction/{DirectionSurface,DomainPanelView}.tsx`;
`ui/features/shell/AppShell.tsx`; `ui/features/guides/GuideSurface.tsx`;
`app/scenarios.ts`; four unit tests; `tests/e2e/domains.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 339 passed**, up from 306. 33 new for the slice.
- **Browser: 318 passed**, up from 298. 20 new across desktop and mobile.
- Covers: the closed action set; no clinical or programming vocabulary in the actions,
  the prompts, or the rendered panel; no 1-to-10 pain scale; deferral to a person after
  weeks with no interpretation of the symptom; only stopping proposed while something is
  significantly in the way; physical and mental energy read separately and changing which
  action fits; every unreported reading left undefined; three-day-old readings marked
  stale; a disagreement surfaced rather than resolved; silence as the normal case; health
  absent from Now; the full panel contract with no numeric field; a recovery trend whose
  gaps are gaps; a meter refused with its reason; Update This Area asking only health
  questions; the morning check-in unchanged; meditation captured by purpose with no
  streak anywhere; and Can't Now behaving identically for a health action.
- **One real defect found and fixed rather than tested around:** the 8A domain panel
  rendered only the *first* declared visual, so the meter refusal existed in the data and
  never reached the screen. That made "the absence of a percentage is a decision on the
  record" true of the record and false of the page. The panel now renders every
  declaration.
- **One improvement the tests prompted:** career offered an "Update this area" button
  with no prompts behind it, which would have opened an empty guide. A domain can now be
  readable before it is updatable, and says so plainly instead.
- Four older assertions were correct failures and were updated to read from
  `ENABLED_CATEGORIES` and `SCALE_IDS` rather than hard-coded counts, so activating the
  next category or scale cannot break them again.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- Real personal data detected in tracked content: **NO**
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Everything the health slice captures is classified `health` and excluded from AI
  exports unless explicitly included.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records), ADR-0008 (the Console's five-panel cap, which is why no domain reaches Now),
and the Prompt 8A framework contracts.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/health/actions.ts`** — a closed action set, not a generator.
- Active requirement: `SAFE-001`, Blueprint §9.2, tasks 8–9 and 12.
- Why smaller was insufficient: a filter over generated text catches the phrasings you
  thought of. A closed set has no code path that produces the ones you did not.

**2. `intelligence/domains/health/`** — reading, candidate, and contribution.
- Active requirement: tasks 1–11.
- Why smaller was insufficient: the reading is used by both the category summary and
  the panel, and a second copy would drift from the first within a phase.

**3. The `update-area` guide kind.**
- Active requirement: `XDS-034`, task 10.
- Why smaller was insufficient: folding domain questions into an existing guide is
  precisely how the daily check-in grows into a form.

## Known limitations

- **Six domains remain unimplemented.** Career (8C), fatherhood (8D), emotional and
  relationships (8E), faith (8F), home (8G), money (8H). Each is readable-but-not-updatable
  until its slice lands, and says so.
- **Health is switched off by default**, like every domain. It appears only after the
  owner enables it.
- **The energy split is only asked from Update This Area.** That is deliberate — adding
  it to the morning would cost two questions a day for a distinction that matters
  occasionally — but it means the split is often absent and the general scale is used.
- **Time-of-day patterns need readings across the day** to say anything, and a check-in
  habit clustered at one hour will produce one bucket.
- **No cross-domain synthesis yet.** Health competes in the same comparison as
  everything else; genuine tradeoff reasoning between areas is Phase 8.
- **Cached startup is still unmeasured.** Bundle is ~163 kB gzipped, up from ~160 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; the regression suite runs against a
  bridge-enabled build with production covered by 14 dedicated tests; `frame-ancestors`
  unenforceable on Pages; Chromium-only matrix; no router; service-worker staleness;
  deletion semantics undecided.

## Deferred work

| Deferred | Activates |
| --- | --- |
| Career, Azure, and learning | Prompt 8C |
| Fatherhood and Adaya | Prompt 8D |
| Emotional state, social, and relationships | Prompt 8E |
| Faith and meaning | Prompt 8F |
| Home and environment | Prompt 8G |
| Money | Prompt 8H |
| Cross-domain synthesis, full Can't Now regeneration, strategic review, optional model comparison | Phase 8 |
| Quarantined legacy importer | Phase 9 |
| Traceability generator, full browser matrix, startup measurement, release artifacts | Phase 10 |

## Blockers

**None blocking Prompt 8C.**

One non-blocking owner action carried forward: **measure cached startup on the Samsung
phone** and say if it exceeds three seconds.

## Next permitted prompt

**PROMPT 8C — Phase 7 domain slice: Career, Azure, and learning.**

The framework has now been through one real slice and held: health added a category, a
panel, a candidate, and its own questions without touching the global decision, the
Now surface, or any other area's records. 8C is where it gets tested against a domain
with genuinely different evidence — proof and progression rather than state and capacity.
