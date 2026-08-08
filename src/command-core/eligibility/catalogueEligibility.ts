import { MOVE_FAMILIES, MOVE_PATTERNS } from '../../domain/moves/catalogue';
import type { MovePattern } from '../../domain/moves/families';
import { contradicts } from '../../domain/moves/registry';
import { fits, type SituationalCapacity } from '../../domain/domains/capacity';
import type { DomainId } from '../../domain/domains/definitions';

/**
 * Which catalogue patterns the situation admits (`V33-050`, v3.3 section D).
 *
 * ## The problem this solves
 *
 * After the migration there was one authored move library and only thirty-five of its
 * hundred and thirteen patterns could ever be produced — because each domain slice is a
 * hand-written decision tree over a hand-picked array, and a pattern nobody had added to
 * an array was unreachable no matter how well it fitted.
 *
 * That is the wrong shape for a catalogue this size. A move should become available
 * because its purpose and prerequisites suit the moment, not because someone remembered
 * to list its id.
 *
 * ## What this does not replace
 *
 * The domain decision trees. Health's ordering — defer to a person before anything else,
 * protect tonight before optimising today — is careful, safety-critical judgement that no
 * generic rule reproduces, and it stays exactly as it is. Each slice still brings the one
 * candidate it considers best.
 *
 * This runs *alongside* them and opens the rest of the catalogue to the same global
 * arbitration. A domain's own pick competes with everything the situation admits, and the
 * arbiter decides. That is the difference between a bigger library and a better answer.
 *
 * ## Eligible is not recommended
 *
 * Nothing here ranks. Every rule answers one question — is this possible right now — and
 * the honest default is yes. A pattern is removed only for a stated, checkable reason,
 * because a rule that removes things on suspicion quietly shrinks the catalogue back to
 * thirty-five without anyone noticing.
 */

/** How recently a completed move keeps its family quiet. */
export const RECENTLY_DONE_MS = 4 * 60 * 60 * 1000;

/** How long a satisfied prerequisite unlocks what follows it. */
export const PREREQUISITE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface CompletedMove {
  readonly patternId: string;
  readonly at: string;
}

export interface EligibilityContext {
  readonly now: Date;
  /** Areas the owner has switched on. A pattern from a silent area is not offered. */
  readonly enabledDomains: ReadonlySet<DomainId>;
  /** What the owner has said about right now. Unknown fields never block. */
  readonly situation: SituationalCapacity;
  /** Move ids the owner has paused, blocked here, or forbidden, with the reason. */
  readonly suppressed: ReadonlyMap<string, string>;
  /** Moves completed recently, newest first or not — order does not matter. */
  readonly recentlyCompleted: readonly CompletedMove[];
  /**
   * True when the owner has a North Star on record.
   *
   * Patterns whose whole job is realigning behaviour with a stated value cannot be
   * offered to someone who has not stated one — there is nothing to realign towards.
   */
  readonly hasNorthStar: boolean;
  /** True when at least one goal or commitment is open. */
  readonly hasOpenCommitment: boolean;
}

export interface PatternEligibility {
  readonly patternId: string;
  readonly eligible: boolean;
  /** Always populated, whichever way it went. The trace quotes this. */
  readonly because: string;
}

const FAMILY_DOMAINS = new Map(
  MOVE_FAMILIES.map((family) => [family.familyId, family.domains]),
);

function withinWindow(at: string, now: Date, windowMs: number): boolean {
  const parsed = Date.parse(at);
  return !Number.isNaN(parsed) && now.getTime() - parsed <= windowMs && parsed <= now.getTime();
}

/**
 * Whether one pattern is possible right now, and why.
 *
 * The order matters only for which reason gets reported: the cheapest and most decisive
 * checks come first so a trace says "that area is switched off" rather than a subtler
 * truth that is also true.
 */
export function judge(pattern: MovePattern, context: EligibilityContext): PatternEligibility {
  const no = (because: string): PatternEligibility => ({
    patternId: pattern.patternId,
    eligible: false,
    because,
  });

  /* 1. Withdrawn by evidence. Returns when the owner or a context change brings it back. */
  if (pattern.lifecycle === 'retired') {
    return no('Retired — repeated outcomes withdrew it');
  }

  /* 2. The area is not switched on, so nothing from it may be raised. */
  const domains = FAMILY_DOMAINS.get(pattern.familyId) ?? [];
  if (!domains.some((domain) => context.enabledDomains.has(domain))) {
    return no('No area this belongs to is switched on');
  }

  /* 3. The owner's own standing decision. Nothing outranks it. */
  const stance = context.suppressed.get(pattern.patternId);
  if (stance !== undefined) return no(stance);

  /* 4. The situation forbids the shape. Unknown never blocks — see `fits`. */
  if (pattern.capacity !== undefined) {
    const fit = fits(pattern.capacity, context.situation);
    if (!fit.eligible) return no(fit.because);
  }

  /* 5. Just done. Offering it again is not a recommendation, it is a loop. */
  const justDone = context.recentlyCompleted.find(
    (done) =>
      done.patternId === pattern.patternId &&
      withinWindow(done.at, context.now, RECENTLY_DONE_MS),
  );
  if (justDone !== undefined) return no('You have just done this');

  /* 6. Something done recently that this would undo. */
  const undoes = context.recentlyCompleted.find(
    (done) =>
      withinWindow(done.at, context.now, RECENTLY_DONE_MS) &&
      contradicts(done.patternId, pattern.patternId),
  );
  if (undoes !== undefined) return no('It would undo something you have just done');

  /*
   * 7. A prerequisite that has not happened.
   *
   * One hop, and satisfied by having done the prerequisite within the day. A pattern
   * whose prerequisite is missing is not a bad move — it is a move whose turn has not
   * come, which is a different thing and worth saying differently.
   */
  if (pattern.after !== undefined) {
    const done = context.recentlyCompleted.some(
      (entry) =>
        entry.patternId === pattern.after &&
        withinWindow(entry.at, context.now, PREREQUISITE_WINDOW_MS),
    );
    if (!done) return no('Something else has to happen first');
  }

  /*
   * 8. Realignment needs something to realign towards.
   *
   * Offering "close the gap between what you said matters and what you did" to somebody
   * who has never said what matters is asking them to feel bad about an absence.
   */
  const family = MOVE_FAMILIES.find((entry) => entry.familyId === pattern.familyId);
  if (family?.purpose === 'realign' && !context.hasNorthStar) {
    return no('Nothing has been recorded about what matters yet');
  }

  /* 9. Unblocking needs something blocked. */
  if (family?.purpose === 'unblock' && !context.hasOpenCommitment) {
    return no('Nothing is currently open or waiting');
  }

  return {
    patternId: pattern.patternId,
    eligible: true,
    because: family === undefined ? 'Possible right now' : family.decisionJob,
  };
}

/** Every pattern, judged. Returned in full so a trace can show what was ruled out. */
export function judgeAll(context: EligibilityContext): readonly PatternEligibility[] {
  return MOVE_PATTERNS.map((pattern) => judge(pattern, context));
}

/** Just the patterns the situation admits. */
export function eligiblePatterns(context: EligibilityContext): readonly MovePattern[] {
  const verdicts = new Map(judgeAll(context).map((entry) => [entry.patternId, entry]));
  return MOVE_PATTERNS.filter((pattern) => verdicts.get(pattern.patternId)?.eligible === true);
}
