# Life Command OS

A private, single-device, local-first personal decision-intelligence system.

It helps one person understand the present moment, separate what is known from what is
inferred, see where things are heading, anticipate the untreated path, and receive **one
best realistic action — or deliberate silence** — with visible reasons, tradeoffs, and
honest confidence. It then observes what actually happened and learns conservatively.

It is **not** primarily a tracker, habit app, journal, motivational dashboard, chatbot,
or a collection of life-category dashboards.

---

## Current state

| | |
|---|---|
| Plan version | 2.6 Lean Execution |
| Current phase | **Phase 0 — Lean constitution and architecture lock** |
| Application code | **None yet.** Phase 1 creates the application shell. |
| Live preview | Not available until Phase 1 |

Authoritative, continuously updated status lives in [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Controlling documents

Read in this order. When two statements appear to conflict, the earlier document wins.

1. **[Product Constitution](docs/PRODUCT_CONSTITUTION.md)** — what the product is, what it
   must always do, and what it may never do.
2. **[Architecture Overview](docs/architecture/ARCHITECTURE_OVERVIEW.md)** — the approved
   technical shape, canonical records, and storage progression.
3. **[Glossary](docs/GLOSSARY.md)** — the canonical concepts that must never be collapsed
   into one another.
4. **[Requirements Registry](docs/REQUIREMENTS.md)** — approved requirement IDs, owning
   phases, and traceability status.
5. **[Visual Direction](docs/design/VISUAL_DIRECTION.md)** — the Luminous Dark Command
   Surface and the Phase 3 design-selection process.
6. **[Decision records](docs/decisions/)** — ADRs for consequential, hard-to-reverse
   decisions.

---

## The privacy rule

> **The repository defines the application. The owner's life data lives only in local
> IndexedDB on their own device.**

Never in tracked content, Git history, build artifacts, hosted preview output, logs,
screenshots, or committed prompts: real names, addresses, employers, account values,
family details, health details, messages, schedules, or private notes.

All fixtures, tests, screenshots, and hosted content are **neutral synthetic data** —
permanently, including after the application becomes safe for real private use.

Meaningful real private data may not be entered until the Phase 6 gate proves encrypted
backup and fresh-profile recovery.

---

## Non-negotiables

- **One best move.** The interface shows one best recommendation, one high-value question,
  or deliberate silence — never a menu of competing recommendations.
- **Silence is a valid output.** "Nothing requires attention right now" is a legitimate,
  intelligent conclusion.
- **Honest uncertainty.** Inferences are never shown as facts. Missing evidence stays
  unknown, not zero. Non-execution is never judged ineffective. Correlation is never sold
  as personal causation.
- **No overall Life Score.** Ever. Per-category numbers are optional and must pass a
  documented evidence gate.
- **Local and deterministic.** Structured local logic is authoritative. External AI is
  disabled and out of scope.
- **Nothing speculative.** No abstraction, registry, dependency, service, or infrastructure
  is created without a current approved requirement that uses it.

---

## How this repository is built

Development proceeds one prompt at a time through eleven gated phases (0–10). Each phase:

- performs only its own named work;
- runs its own tests;
- updates `PROJECT_STATUS.md`;
- stops at its gate.

A phase does not begin until the previous gate is **GREEN**. A failed gate is repaired in
its own phase, never buried beneath later work.

| Phase | Delivers |
|---:|---|
| 0 | Constitution, architecture lock, requirements, ADRs *(current)* |
| 1 | Repository, offline PWA shell, CI, stable public preview URL |
| 2 | Core canonical records and working IndexedDB storage |
| 3 | Command-surface selection and UX foundation |
| 4 | Transparent baseline intelligence, first complete vertical slice |
| 5 | Outcome learning, trajectories, useful graphs |
| 6 | Encrypted backup and recovery — **real private use becomes safe** |
| 7 | One additional life domain per run |
| 8 | Model tournament, only where evidence justifies complexity |
| 9 | Optional quarantined legacy importer |
| 10 | Production hardening, deployment, release |

---

## Repository layout

```text
.
├── PROJECT_STATUS.md              # Authoritative phase and gate status
├── README.md
└── docs/
    ├── PRODUCT_CONSTITUTION.md    # Controlling product law
    ├── GLOSSARY.md                # Canonical concept definitions
    ├── REQUIREMENTS.md            # Approved requirement registry
    ├── architecture/
    │   └── ARCHITECTURE_OVERVIEW.md
    ├── decisions/                 # ADR-0001 .. ADR-0007
    └── design/
        └── VISUAL_DIRECTION.md
```

Application directories are created when their owning phase begins — not in advance.
The target module map is documented in the Architecture Overview.
