# Research — Just In Time

**Activated:** Phase 4
**Rule:** Product Constitution §16, master plan §44

Research activates when a consequential rule is about to become authoritative. It is not
produced in advance for domains that do not exist, and it is not produced at all for rules
that carry no judgement.

## Where the contracts live

The full contract for every active rule — decision target, target and horizon, baseline,
evidence class, uncertainty, abstention conditions, failure conditions, safety and privacy
boundary, future validation path, and retirement condition — is **machine-readable** in
[`src/intelligence/contracts.ts`](../../src/intelligence/contracts.ts).

That is deliberate. A test asserts that no rule ships without a complete contract, which
makes the discipline enforceable rather than aspirational. Prose in a document cannot do
that.

## What the cards in this directory add

The contracts record *what* each rule does and when it abstains. The cards here cover the
parts that need a paragraph rather than a field:

- the specific number or convention chosen, and why that one;
- what evidence does and does not support it;
- what would count as being wrong;
- the false-precision risk it carries.

There is a card for each rule that contains a **judgement expressed as a number**. Those are
where unearned precision creeps in, so those are where the reasoning has to be written down.

| Card | The judgement it defends |
|---|---|
| [trajectory-direction-band.md](trajectory-direction-band.md) | The 15 percent band separating direction from noise |
| [forecast-persistence.md](forecast-persistence.md) | Carrying the observed direction forward unchanged |
| [effect-dose-and-cost.md](effect-dose-and-cost.md) | Coarse magnitudes from dose and window share |
| [decision-weights.md](decision-weights.md) | The comparison weights and the interruption threshold |

## The honest status of everything here

Every rule in Phase 4 is classified `unproven-transparent-baseline`.

None has been validated against this user's outcomes, because **no outcome has been observed
yet**. That is not a gap to apologise for — it is the correct state after one phase of
intelligence work, and the reason the confidence ceiling is `moderate-evidence` until
Phase 5 makes prospective validation possible.

A rule that could award itself the highest confidence label on its first day would be
exactly the false precision the Constitution forbids.

## What is deliberately absent

- **No model-candidate registry.** Phase 8 creates one, and only when a real problem has at
  least two real candidates and enough evidence to compare them.
- **No evidence-source registry.** No rule here rests on external literature; every one is a
  stated convention or a naive baseline, and says so.
- **No research for unactivated domains.** Health, money, relationships and the rest have no
  cards, because they have no rules.
