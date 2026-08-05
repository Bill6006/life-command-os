# Life Command OS Project Status

## Project identity

- Repository: life-command-os (https://github.com/Bill6006/life-command-os)
- Plan version: **3.2 Coverage, Domain Scan, Learning Map, and AI Review Amendment**
- Current phase: **Phase 7 — framework and four domain slices complete.** Slices 8F–8H
  outstanding.
- Current prompt: PROMPT 8E (complete)

## Gate status

- Status: **GREEN.** Every Prompt 8E requirement passes, and every earlier slice it was
  required to leave alone still passes.
- Private local use: **READY** (unchanged from Prompt 7B).
- Gate evidence:
  - *Mood, stress, confidence, overwhelm, loneliness, and connection context* — the four
    existing scales stay where the engine reads them; loneliness is added.
  - *Emotional interference and regulation options* — interference is the one question
    here allowed into a daily check-in, because it is about capacity rather than mood.
  - *Connection, social practice, dating, boundaries, conflict and repair, rejection
    recovery* — all recorded as what happened, none as how it went.
  - *Observable interaction outcomes* — did you send it, did that happen, has either of
    you been back in touch.
  - *Private-by-default notes* — classified `private-pattern`, the most protected class.
  - *Optional high-privacy module, explicitly enabled and manually opened* — off by
    default, silent while off, and permitted on nothing when switched on.
  - *Contextual-capture metadata* — seven declarations, validated at import.
  - *Structured controls before free text* — every control is a button; two optional
    text fields, both labelled optional.
  - *Explicit protected-surface permissions* — a canonical family, denied by default,
    granted one topic and one surface at a time.
  - *No therapy, CRM, surveillance, or message automation* — no person record exists.

## GitHub Pages owner preview

- URL: **https://bill6006.github.io/life-command-os/**
- Deployment status: **LIVE**
- Deployed commit: current head of `main`. Data & Privacy reports the exact commit.
- Hosted build contains synthetic content only: **YES** — the app starts empty and the
  scenario corpus is not in the production bundle.

## The decision this slice turned on

**Enabling is not permitting.**

Every earlier domain had one switch: the area is on or off. That is not enough here. A
man may want somewhere to record something he would not say aloud, and want it to appear
absolutely nowhere — not in a morning check-in, not in a weekly review, not in an export
he pastes into a chat window. One switch cannot express that.

So there are two decisions, and they are separate everywhere in the code. **Enabling** a
protected topic means "I want to record this"; it grants no surface anything. **Permitting**
names one topic and one surface, all four start denied, and there is deliberately no
"allow everywhere" control — a single switch that opened four surfaces at once would be
pressed in a hurry and regretted on a shared screen.

The second decision is the shape of the data. **There is no person record and no field
that could hold one.** Every observation is about what the owner did; the other person
appears only as an unnamed participant. The Blueprint forbids a contact CRM, and the
absence of a person family is what makes that structural rather than a promise.

## Work completed

- **A `loneliness` scale**, read as a trend against the owner's own weeks. Mood, stress,
  confidence, and overwhelm stay in `time-attention-capacity`, where the core engine
  reads them for capacity.
- **Interference as the load-bearing reading** — "is something on your mind getting in
  the way of what you meant to do" is about capacity, which is why it is the single
  question in this domain allowed into a daily check-in.
- **Eight closed actions**, one of which is the domain declining to have a view and
  naming who might.
- **Connection counted by day**, practice counted as attempts, boundaries recorded as
  what he decided, conflict recorded only as whether contact happened, and rejection
  recovery measured by re-entry rather than by mood.
- **`SurfacePermissionRecord`**, the 26th family and this slice's only one: topic and
  surface are enums, so a permission cannot be stated incorrectly, and absence means
  denied.
- **A second gate on the readable export** — private content stays out even when its
  privacy class was ticked, unless the export surface was separately granted.
- **A scan-friendly area page** with seven sections, all structured controls, and the
  guided flow still reachable from it.
- **A domain-owned scan summary** for the Weekly Quick Domain Scan that Phase 8 will
  build — it quotes nothing and names nobody.

### Decisions worth naming

- **Mood never triggers an action.** A single low reading changing what the app suggests
  would make it a mood-reactive machine, which is the opposite of useful on a bad day.
  Mood is an input to the shared state assessment and nothing in this domain's branch
  order reads it.
- **Repair is offered on a timer, not on a judgement.** Twelve hours after something is
  recorded as unresolved — long enough to have settled, short enough that going back is
  still cheap. The app has no view on who was right.
- **Recovery is re-entry.** "Have you tried anything similar again" is answerable.
  "Have you got over it" is not, and asking would be asking him to grade himself.
- **The private note is the only free-text field that matters, and it is the most
  protected thing in the product.** Everything else is a button.
- **Fatherhood and emotional actions are not blocked by `family` or `caregiving`.**
  Reaching out, or going back after a row, is often exactly what belongs in those hours.

## Files created or modified

Created (10): `src/domain/emotional/{regulation,social,permissions,capture}.ts`;
`src/domain/records/permissions.ts`; `src/domain/prompts/emotional.ts`;
`src/application/commands/emotional.ts`;
`src/intelligence/domains/emotional/{index,assessEmotional,emotionalCandidate,scan}.ts`;
`src/ui/features/direction/EmotionalAreaView.tsx`;
`tests/unit/emotional.test.ts`;
`tests/e2e/{emotional,production-emotional}.spec.ts`

Modified: `domain/records/{index,categories,scales}.ts`;
`domain/prompts/definitions.ts`; `domain/domains/definitions.ts`;
`domain/capture/{contextualCapture,registry}.ts`;
`application/queries/aiExport.ts`; `intelligence/index.ts`;
`intelligence/state/categorySummaries.ts`;
`intelligence/change-detection/materialChange.ts`;
`ui/features/shell/AppShell.tsx`; `ui/view-models/present.ts`;
`ui/design-system/console.css`; `app/scenarios.ts`;
`playwright.config.ts`; `playwright.deployed.config.ts`; `tests/fixtures/records.ts`;
`tests/unit/{records,domains,areas,prompts}.test.ts`;
`tests/e2e/production-areas.spec.ts`;
`docs/{REQUIREMENTS,architecture/ARCHITECTURE_OVERVIEW}.md`

## Tests and evidence

- **Unit: 532 passed**, up from 498. 34 new for the slice.
- **Browser: new specs are 16 against seeded state and 8 on the production build**, in
  isolated contexts.
- Covers: no person record and no field that could hold one; every question passing the
  behaviour-first policy; no clinical or blaming vocabulary on any rendered surface;
  nothing granted by default on any surface; enabling separated from permitting; a
  permission naming one topic and one surface with revocation appended; unknown topics
  and surfaces rejected by the schema; a private note withheld from the export until the
  export surface is granted; the private capture route absent until the topic is on; only
  the capacity question reaching a guide; the meter refused with its reason; the scan
  summary quoting nothing; and Now unchanged.
- **One real defect found, in code this slice did not write.** The production test caught
  What Changed — on Now, the most-seen panel in the product — printing a private note
  verbatim: `Recorded emotional:note — text: <the note>`. The change detector quoted every
  record's value regardless of classification. It now withholds the value for
  `private-pattern`, `child`, and `relationship` content while still reporting that
  something was recorded. A unit test builds the exact case, and a second asserts ordinary
  observations are still quoted so the panel stays useful.
- Six older assertions were correct failures from activating the domain: the scale list,
  the family count, the fixture coverage, the implemented-domain list, the unbuilt-area
  list, and the Manage Areas counts.

### One process failure worth recording

The first full browser run took **2.9 hours** and reported a 59.9-minute test. That was
mine: I started a second Playwright run while the first was still going, and both bound
the same preview ports. The suite was re-run alone. Two Playwright runs must not overlap
on this repository.

## Privacy status

- Synthetic-only repository: **YES** — scanned clean across all tracked files.
- Private Pattern content is `private-pattern`-classified, denied on every surface by
  default, and requires two separate decisions before it can appear in a readable export.
- Commit identity: GitHub noreply address only.
- Dependency audit: `npm audit` — **0 vulnerabilities**.
- Runtime private-data readiness: **READY.** See `docs/PRIVATE_ALPHA.md`.

## Architecture decisions

No new ADRs. The slice applies decisions already recorded: ADR-0005 (append-oriented
records) and the Prompt 8A framework contracts. The enabling-versus-permitting separation
is recorded in `docs/REQUIREMENTS.md` §3k.

## New dependencies

**None.**

## New abstractions or infrastructure

**1. `domain/records/permissions.ts`** — `SurfacePermissionRecord`.
- Active requirement: Master Plan v3.2 §11.
- Why smaller was insufficient: as an attribute it would be a string under a string,
  writable by anything that writes observations. For a control that decides what appears
  unasked, a permission that *cannot be stated incorrectly* beats one that merely fails
  closed when mistyped.

**2. `domain/emotional/permissions.ts`** — the read side.
- Active requirement: v3.2 §11.
- Why smaller was insufficient: the export, the capture registry, and the interface all
  ask the same question, and three copies of "is this allowed" would eventually disagree.

**3. `domain/emotional/{regulation,social}.ts`** — the closed vocabulary.
- Active requirement: `SAFE-001`, `LEG-111`–`LEG-117`.
- Why smaller was insufficient: the same device health and fatherhood use. A generated
  suggestion in this domain is one template away from advice about a person's inner life.

**4. `ui/features/direction/EmotionalAreaView.tsx`** — the area page.
- Active requirement: Phase 7 shared rules 21–24.
- Why smaller was insufficient: a guide cannot show several independently editable
  sections, and the protected section needs to be visibly off rather than merely absent.

## Known limitations

- **Three domains remain unimplemented.** Faith (8F), home (8G), money (8H).
- **`dating` and `conflict-detail` are protected topics with no separate surface of their
  own yet.** They are declared, denied by default, and honoured by the permission gate;
  the interface currently exposes practice and conflict through the ordinary sections.
- **The scan summary is built and unused.** Phase 8 owns the Weekly Quick Domain Scan
  that will render it; this slice supplies the shape and tests it.
- **Loneliness needs several weeks to say anything**, and a gap-heavy trend stays
  gap-heavy — which is correct, and worth knowing before it looks like a bug.
- **The permission screen lists four surfaces, two of which do not exist yet.**
  Notifications and the weekly scan are Phase 8; granting them today stores a decision
  that nothing reads. Denied-by-default means that is harmless, but it is visible.
- **No cross-domain synthesis yet.** Emotional competes in the same comparison as
  everything else.
- **Cached startup is still unmeasured.** Bundle is ~195 kB gzipped, up from ~186 kB.
- Carried forward: the local database is not encrypted at rest; the app lock hides the
  screen only; notifications do not exist; `frame-ancestors` unenforceable on Pages;
  Chromium-only matrix; no router; service-worker staleness; deletion semantics undecided;
  the duplicate panel/category naming, which Phase 8 owns.

## Deferred work

| Deferred | Activates |
| --- | --- |
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

**None blocking Prompt 8F.** Two owner decisions carried forward, neither blocking:

1. **Measure cached startup on the Samsung phone** and say if it exceeds three seconds.
2. **Decide whether to purge a child's first name from commit `b5ffe54`.** HEAD is clean.

## Next permitted prompt

**PROMPT 8F — Phase 7 domain slice: Faith and meaning.**

It inherits the sensitive-topic machinery this slice built, and it needs the same
restraint for a different reason: the risk there is not exposure but authority. A product
that grades faith, or claims to know what a practice was worth, would be doing the thing
the Blueprint forbids most explicitly.
