import { MOVE_FAMILIES, MOVE_PATTERNS } from './catalogue';
import type { MoveFamily, MovePattern } from './families';

/**
 * The one way to reach an authored move (`V33-043`, v3.3 section D).
 *
 * ## Why this exists rather than seven imports
 *
 * Before this, each domain owned a small authored list and each generator imported its
 * own. Seven independent libraries meant seven places a move could be added, seven places
 * a duplicate could appear, and no place at all where you could ask "what can this product
 * actually suggest?" The catalogue answers that question, and this module is the only door
 * into it — so a new parallel library is not merely discouraged, it is visible, because
 * `moveReachability.test.ts` walks the generators and fails if one bypasses this.
 *
 * ## Identity across the migration
 *
 * The domains' original actions produced candidate ids like `health:pause` and evidence has
 * been attaching to those since Phase 7. The catalogue calls the same move
 * `pause:screen-break`. Renaming it silently would detach every observation ever recorded
 * against it, which is the one thing a move's identity exists to prevent.
 *
 * So `LEGACY_ALIASES` maps the old id to the canonical pattern, permanently. Old records
 * resolve, new records use the canonical id, and nothing has to be rewritten in place —
 * which matters because the store is append-only and rewriting is not available anyway.
 */

/* -------------------------------------------------------------------------- */

const BY_ID = new Map(MOVE_PATTERNS.map((pattern) => [pattern.patternId, pattern]));
const FAMILY_BY_ID = new Map(MOVE_FAMILIES.map((family) => [family.familyId, family]));

/**
 * Candidate ids the domains emitted before the catalogue existed.
 *
 * Every entry is a move that genuinely already existed under another name. A legacy id
 * with no catalogue equivalent is *not* listed here — it means the catalogue is missing
 * something, and the reachability test says so rather than letting the id quietly vanish.
 */
export const LEGACY_ALIASES: Readonly<Record<string, string>> = {
  'health:pause': 'pause:screen-break',
  'health:hydrate': 'hydrate-eat:water',
  'health:gentle-movement': 'move-body:gentle-ten',
  'health:prepare-for-sleep': 'wind-down:start-now',
  'health:meditate': 'settle-attention:sit-quietly',
  'health:eat-something': 'hydrate-eat:eat-something',

  'career:name-the-next-step': 'smallest-next-step:name-it',
  'career:return-to-it': 'protect-a-block:short-block',
  'career:prove-a-claim': 'find-out:try-it-small',

  'emotional:step-outside': 'pause:step-outside',
  'emotional:name-it-and-park-it': 'settle-attention:name-the-loop',
  'emotional:move-the-body': 'move-body:gentle-ten',
  'emotional:reach-out-to-one-person': 'reach-out:message-someone',
  'emotional:send-the-message-you-drafted': 'unblock-by-asking:send-the-message',
  'emotional:repair-after-a-conflict': 'repair:name-it-to-them',
  'emotional:hold-the-boundary-you-decided': 'boundary:say-no-once',

  'faith:return-to-a-practice': 'live-the-value:do-the-small-version',
  'faith:do-the-smallest-version': 'live-the-value:do-the-small-version',
  'faith:write-down-what-matters': 'live-the-value:notice-the-gap',

  'home:name-one-change': 'decide-and-close:make-the-call',
  'home:make-the-change': 'reduce-friction-at-home:fix-the-repeat-offender',
  'home:set-it-up-before': 'prepare-the-ground:lay-it-out-tonight',

  'money:make-the-call': 'decide-and-close:make-the-call',
  'money:look-at-one-number': 'money-clarity:look-at-it',
  'money:name-what-it-is-for': 'money-clarity:name-the-worry',

  'fatherhood:follow-her-lead': 'attend-to-child:follow-their-lead',
  'fatherhood:repair-after-a-hard-moment': 'repair:ask-what-they-need',

  focus: 'protect-a-block:deep-block',
  unblock: 'unblock-by-asking:send-the-message',
  'recover:pause': 'pause:screen-break',
};

/** The canonical pattern id for anything that might be a legacy id. */
export function canonicalPatternId(id: string): string {
  return LEGACY_ALIASES[id] ?? id;
}

/** A pattern by id, resolving legacy ids. Undefined when genuinely unknown. */
export function findPattern(id: string): MovePattern | undefined {
  return BY_ID.get(canonicalPatternId(id));
}

/** A pattern by id. Throws, because a missing pattern is an authoring bug. */
export function pattern(id: string): MovePattern {
  const found = findPattern(id);
  if (found === undefined) throw new Error(`Unknown move pattern: ${id}`);
  return found;
}

export function family(familyId: string): MoveFamily {
  const found = FAMILY_BY_ID.get(familyId);
  if (found === undefined) throw new Error(`Unknown move family: ${familyId}`);
  return found;
}

/** Every pattern in a family, in catalogue order. */
export function patternsInFamily(familyId: string): readonly MovePattern[] {
  return MOVE_PATTERNS.filter((entry) => entry.familyId === familyId);
}

/**
 * Patterns a domain may draw on, via their families' declared domains.
 *
 * A family serving several areas is deliberate: "ask someone who would know" is the same
 * move whether the question is about work or about money, and duplicating it per domain is
 * exactly the fragmentation the catalogue replaced.
 */
export function patternsForDomain(domainId: string): readonly MovePattern[] {
  const families = new Set(
    MOVE_FAMILIES.filter((entry) =>
      (entry.domains as readonly string[]).includes(domainId),
    ).map((entry) => entry.familyId),
  );
  return MOVE_PATTERNS.filter((entry) => families.has(entry.familyId));
}

/**
 * Patterns eligible to be recommended at all.
 *
 * `retired` is withdrawn by evidence and stays out until the owner or a material context
 * change brings it back. Everything else competes on its merits, including `experimental`
 * and `weakened` — the first because untested is not the same as bad, the second because
 * ranked-down is not the same as removed.
 */
export function recommendablePatterns(): readonly MovePattern[] {
  return MOVE_PATTERNS.filter((entry) => entry.lifecycle !== 'retired');
}

/* -------------------------------------------------------------------------- */
/* Contradictions (D4)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Whether two patterns cannot both be right at the same moment (`V33-044`, section D4).
 *
 * Symmetric by construction. "Stop for tonight" declares that it contradicts a deep block;
 * the block does not need to declare the reverse, and requiring it would mean every new
 * pattern had to be added to the contradiction list of everything it conflicts with.
 *
 * **Contextual, never permanent.** This answers "can these two be offered together right
 * now", and nothing here writes anything down. A move that lost a conflict this evening
 * competes again tomorrow morning on its merits, which is the difference between an
 * arbitration rule and a blacklist.
 */
export function contradicts(a: string, b: string): boolean {
  const left = findPattern(a);
  const right = findPattern(b);
  if (left === undefined || right === undefined) return false;
  if (left.patternId === right.patternId) return false;

  return (
    (left.contradicts ?? []).includes(right.patternId) ||
    (right.contradicts ?? []).includes(left.patternId)
  );
}

/** Everything in the set that conflicts with the chosen pattern. */
export function conflictsWith(chosen: string, others: readonly string[]): readonly string[] {
  return others.filter((other) => contradicts(chosen, other));
}
