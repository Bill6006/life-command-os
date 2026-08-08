import type { MovePattern } from './families';

/**
 * Personalising an authored pattern (`V33-046`, v3.3 section D5).
 *
 * ## The rule this exists to enforce
 *
 * Personalisation changes **what the owner reads**. It never changes **what the move is**.
 * The `patternId` that comes out is the `patternId` that went in, always, so a move
 * observed eleven times keeps those eleven observations when it starts naming the owner's
 * actual goal instead of saying "the thing that matters most today".
 *
 * That is not a convention here, it is the return type: this returns a `statement`, not a
 * pattern. There is no code path by which personalising something can mint a new identity.
 *
 * ## What it must not become
 *
 * A generator. Filling a slot in an authored sentence with the owner's own goal is
 * personalisation; assembling a new sentence from parts is invention, and this product
 * does not invent moves. If a situation needs a sentence the catalogue does not contain,
 * the honest answer is that the catalogue is missing something.
 *
 * It also must not write owner facts back into the catalogue. The catalogue is authored
 * and reviewed; the owner's goal is canonical record data. Copying one into the other
 * would give the same fact two homes, which is the thing the canonical store exists to
 * prevent.
 *
 * ## Privacy
 *
 * Owner-named faith practices are protected content on Now and stay that way. This module
 * substitutes only what it is handed, and the caller is responsible for not handing it
 * something the current surface has no permission to show — the same rule that already
 * governs every other quotation of the owner's own words.
 */

/**
 * The canonical facts a pattern may be personalised with.
 *
 * All optional, all read from records rather than invented. An absent fact means the
 * authored wording stands, which is why every pattern has to read correctly with no
 * substitutions at all.
 */
export interface OwnerContext {
  /** The active goal's own statement. */
  readonly goal?: string | undefined;
  /** An open commitment's statement. */
  readonly commitment?: string | undefined;
  /** The next step the owner named for it. */
  readonly nextStep?: string | undefined;
  /**
   * A practice the owner named in their own words.
   *
   * Faith practices are protected content. The caller passes this only where the surface
   * has permission; see `TopicPermissions` and the faith scan.
   */
  readonly practice?: string | undefined;
  /** The person a relational move is about, in the owner's words. */
  readonly person?: string | undefined;
  /** This week's direction, when one is confirmed. */
  readonly weeklyDirection?: string | undefined;
}

/**
 * Slots an authored statement may contain.
 *
 * A closed set, checked by `moveCatalogue.test.ts`. An unknown slot in an authored
 * sentence would render as literal braces to the owner, which is the failure mode of every
 * template system that allows arbitrary keys.
 */
export const PERSONALISATION_SLOTS = [
  'goal',
  'commitment',
  'nextStep',
  'practice',
  'person',
  'weeklyDirection',
] as const;
export type PersonalisationSlot = (typeof PERSONALISATION_SLOTS)[number];

const SLOT = /\{(\w+)\}/g;

export interface Personalised {
  /** Unchanged. This is the point of the module. */
  readonly patternId: string;
  readonly statement: string;
  readonly minimumVersion: string;
  /** True when at least one slot was filled from the owner's own records. */
  readonly personalised: boolean;
}

function fill(text: string, context: OwnerContext): { text: string; used: boolean } {
  let used = false;
  const out = text.replace(SLOT, (whole, key: string) => {
    const value = (context as Record<string, string | undefined>)[key];
    if (value === undefined || value.trim() === '') return whole;
    used = true;
    return value;
  });
  return { text: out, used };
}

/**
 * Strips any slot that could not be filled, leaving a sentence that still reads.
 *
 * The failure this handles: `Take twenty minutes on {goal}` with no goal recorded. Showing
 * the braces is unacceptable and showing nothing loses the move, so the slot and the
 * preposition in front of it come out together and the generic sentence stands.
 */
function stripUnfilled(text: string): string {
  return text
    .replace(/\s*(?:on|for|about|with|to)?\s*\{\w+\}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * The owner-facing wording for a pattern, given what is currently known about them.
 *
 * Returns the pattern's own identity untouched. Callers that need the rest of the pattern
 * still read it from the registry — this deliberately returns only the words, so nothing
 * downstream can mistake a personalised statement for a distinct move.
 */
export function personalise(pattern: MovePattern, context: OwnerContext): Personalised {
  const statement = fill(pattern.statement, context);
  const minimum = fill(pattern.minimumVersion, context);

  return {
    patternId: pattern.patternId,
    statement: stripUnfilled(statement.text),
    minimumVersion: stripUnfilled(minimum.text),
    personalised: statement.used || minimum.used,
  };
}

/**
 * Owner wording that should win over the catalogue's.
 *
 * The migration rule: where a domain already had a better, more specific sentence than the
 * generic catalogue one, the specific sentence stays. It is a *presentation* override
 * attached to a canonical pattern id, not a second move — which is what stops "preserve the
 * good wording" from quietly rebuilding the parallel library the catalogue replaced.
 */
export function withPreferredWording(
  base: Personalised,
  preferred: string | undefined,
): Personalised {
  if (preferred === undefined || preferred.trim() === '') return base;
  return { ...base, statement: preferred };
}
