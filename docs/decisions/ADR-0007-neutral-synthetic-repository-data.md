# ADR-0007: Neutral synthetic data only in repository and hosted content

## Status

Accepted — 2026-08-03, Phase 0

## Context

This product will eventually hold the owner's most sensitive information: health details,
family details, financial facts, emotional state, private notes. Meanwhile the repository
will be public — GitHub Pages hosting requires it on a free account, and the owner-preview
URL is a public HTTPS link from Phase 1 onward.

The realistic failure is not malice. It is convenience. Real data makes better test
fixtures. A real screenshot is faster than building a synthetic scenario. A quick debug
`console.log` of a canonical record is the obvious way to diagnose a problem. Each of these
is individually reasonable and collectively fatal, because **Git history is effectively
permanent** — a committed secret is compromised even after it is removed, and a public
repository may have been cloned, forked, or indexed before the mistake was noticed.

The rule must therefore be absolute rather than case-by-case, and it must be established
before any code exists — while there is no accumulated inconvenience arguing against it.

Requirements: `PRIV-001`, `PRIV-002`, `PRIV-003`, `OPS-002`.

## Decision

**All repository content and all hosted content use neutral synthetic data — permanently,
including after the Phase 6 gate makes real private use safe.**

Never in tracked content, Git history, build artifacts, hosted preview output, logs,
screenshots, or committed prompts:

- real names, addresses, employers, account values, family details, health details,
  messages, schedules, or private notes;
- real backups or exported user data;
- credentials or secrets.

Additional rules:

- Development and automated tests use **neutral synthetic identities and invented values**
  (`PRIV-002`).
- Do not log full canonical records or free-text private payloads.
- Do not place sensitive data in URLs.
- Real runtime life data lives only in local IndexedDB on the owner's device.

**Synthetic means invented, not anonymized.** Anonymized real data is out of scope: it
requires judgment about what identifies a person, that judgment is made under time pressure,
and re-identification from "anonymized" personal data is a well-established failure mode.
Fixtures are constructed from nothing.

**Proportionality (`LEAN-002`).** Protection matches maturity. Phase 1 adds a lightweight
baseline: `.gitignore` for exports, backups, local databases, environment files, private
screenshots, and owner-only files; standard secret scanning where supported; a dependency
lockfile; and Content Security Policy direction. Do **not** build an enterprise PII-detection
platform for an empty repository, and do not build a broad custom detector that flags
ordinary names or prose as errors.

Phase 6 adds stronger measures targeted at real risks: log-redaction tests, a repository and
build-artifact privacy audit, and explicit screenshot and export review rules.

## Rationale

An absolute rule is enforceable; a conditional one is not. "Use synthetic data unless real
data is clearly necessary" requires a judgment call at exactly the moment judgment is worst —
mid-debugging, under pressure. "Never" needs no judgment and can be verified at a gate.

The permanence clause matters most. The natural assumption is that once Phase 6 makes real
private use safe, real data becomes acceptable in fixtures. It does not. Phase 6 makes the
*runtime* safe for private data; it changes nothing about the repository, which remains
public and permanent.

Synthetic-first also has a design benefit that is easy to miss: constructing fixtures for
sparse evidence, stale evidence, contradictory evidence, and missing outcomes forces those
cases to be thought through explicitly. Real personal data would over-represent the owner's
typical patterns and under-represent exactly the edge cases the honesty rules exist to
handle. Phase 4's scenario harness depends on being able to construct situations at will.

## Alternatives considered

**Anonymized real data for fixtures.** Rejected. Requires ongoing judgment about what
identifies a person, and re-identification from anonymized personal data is well documented.
Synthetic data has no such risk because there is no underlying person.

**Real data in a private repository.** Rejected. It would forfeit the free GitHub Pages
owner-preview that `OPS-002` requires from Phase 1, and it would relocate the risk rather
than removing it — repository visibility can be changed accidentally, and history persists
across that change.

**Real data locally, with `.gitignore` protection.** Rejected as the primary mechanism.
`.gitignore` is a single line away from failing, `git add -f` bypasses it, and one mistake is
permanent. `.gitignore` remains a useful defense-in-depth layer, not the strategy.

**A comprehensive custom PII detector.** Rejected as disproportionate (`LEAN-002`). For a
repository containing only synthetic data, a broad detector generates false positives on
ordinary prose, trains everyone to ignore it, and provides less real protection than the
absolute rule plus standard secret scanning.

## Consequences

### Positive

- Public repository and public preview URL carry no privacy risk from tracked content.
- No possibility of a permanent Git-history exposure of life data.
- Fixtures deliberately cover sparse, stale, contradictory, and missing-outcome cases.
- Tests are deterministic — synthetic fixtures do not drift as the owner's real life changes.
- Screenshots and documentation can be shared freely.
- Debugging with an AI assistant is safe, because there is no private data in the repository
  to leak into a conversation.

### Cost or limitation

- **Building realistic synthetic scenarios takes real effort**, particularly for the Phase 4
  harness and Phase 9A legacy fixtures.
- **Bugs that only appear with the owner's real data cannot be reproduced in the
  repository.** Phase 9B addresses this narrowly: collect only privacy-safe pass/fail
  categories and non-sensitive error codes, then repair logic using **neutral reproductions
  of the structural problem** — never the private values themselves.
- Screenshots in documentation will look somewhat artificial.
- Synthetic data may not exercise the same volume or messiness as real use; performance and
  scale characteristics need separate attention.

## Privacy and security impact

**This ADR is the privacy boundary's enforcement mechanism.**

It guarantees that a public repository and public preview URL can never expose life data,
that Git history contains no private information, and that AI-assisted development cannot
leak private values from repository content.

It does **not** protect runtime data — that is IndexedDB
([ADR-0004](ADR-0004-indexeddb-canonical-authority.md)) plus Phase 6 hardening.

**One residual exposure, recorded honestly:** Git commit metadata contains the author's name
and email. That is real personal information, in permanent history, in a repository that will
be public. It is standard practice and outside the plan's stated concern (life data), but it
should be a deliberate choice rather than a default. GitHub's `noreply` address is the
standard mitigation. **This must be resolved before the first push in Phase 1**, while
history is still trivial to rewrite. Tracked in `PROJECT_STATUS.md` open decisions.

## Canonical data and storage impact

Canonical schemas are identical for synthetic and real records — synthetic data is not a
separate code path, and no schema branches on it. Fixtures produce ordinary canonical records
that happen to contain invented values.

Phase 2 adds deterministic neutral fixture builders so scenarios are reproducible.

The export and restore format is shared: Phase 2's synthetic development export uses the same
shape that Phase 6's encrypted backup will carry, so the path is exercised continuously.

## Intelligence impact

All intelligence development, testing, and validation runs on synthetic scenarios. Phase 4's
deterministic harness requires constructible situations — cold start, sparse evidence, stale
evidence, contradictory evidence, overload, protected time, competing commitments, mixed
effects, deliberate silence, changed context — which real personal data could not reliably
supply.

Phase 8 model comparison likewise runs on synthetic and, where valid, the owner's own local
data — never on data committed to the repository.

## User-experience impact

- The Phase 1 and Phase 3 hosted previews show synthetic scenarios; the owner evaluates
  design against invented content.
- Synthetic scenarios must be **credible enough to judge the design honestly**. A scenario
  too tidy to resemble real life would produce a design that fails on contact with real data.
  This is a genuine Phase 3 design responsibility.
- Phase 6 private-alpha guidance must explain the boundary to the owner: runtime data stays
  local, repository content stays synthetic, and private values must not be shared with AI
  or GitHub.

## Testing required

- **Phase 0:** repository scanned for accidental personal information. Recorded in
  `PROJECT_STATUS.md`.
- **Phase 1:** `.gitignore` covers exports, backups, local databases, environment files,
  private screenshots, and owner-only files; standard secret scanning runs in CI; synthetic
  fixture conventions established; hosted build contains synthetic content only.
- **Phase 2:** deterministic neutral fixture builders produce valid canonical records.
- **Phase 6:** log-redaction tests confirm no full canonical payloads are logged; repository
  and build-artifact privacy audit; screenshot and export review rules documented.
- **Phase 9B (if run):** no private data enters the repository, fixtures, logs, screenshots,
  documentation, or the AI conversation.
- **Phase 10:** full privacy audit; verification that hosted release content is
  synthetic-only.

## Deferred future work

- `.gitignore`, secret scanning, and synthetic fixture conventions — Phase 1.
- Deterministic fixture builders — Phase 2.
- Log-redaction tests and privacy audit — Phase 6.
- Screenshot and export review rules — Phase 6.
- Synthetic legacy fixtures — Phase 9A, if authorized.
- Commit-author email decision — **before the first push in Phase 1.**

## Reversal strategy

**Not reversible, and deliberately so.** Once real data enters Git history, it is
permanently compromised in a public repository — removal does not undo cloning, forking, or
indexing.

There is no scenario in which this rule is relaxed. If a future need genuinely requires real
data in development, the correct response is a **local, untracked, gitignored** working
directory that never enters version control — not a change to this decision.
