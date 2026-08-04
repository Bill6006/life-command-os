import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  skillLevelIndex,
  type SkillLevel,
} from './development';

/**
 * When several occasions add up to a suggestion (Prompt 8D.2 task 5).
 *
 * ## The rule, and why every clause is in it
 *
 * A progression is suggested only when **all** of these hold:
 *
 * 1. **At least three qualifying observations.** One good evening is not a change in
 *    what she can do; it is a good evening.
 * 2. **Across at least two separate dates.** Three notes from one bath-time is one
 *    occasion described three times, which is the easiest way to fool yourself.
 * 3. **They support the next rung.** Evidence at or above where the suggestion would
 *    put her — never evidence of anything else.
 * 4. **No newer contradictory observation.** If the most recent thing he saw was below
 *    her current level, saying "she has moved up" would be misleading, so the
 *    suggestion is withheld and the disagreement is named instead.
 * 5. **At most one rung.** Even overwhelming evidence moves her one step. A ladder that
 *    can be climbed three rungs at once is a ladder nobody trusts.
 *
 * ## What this function cannot do
 *
 * It cannot change anything. It returns a *suggestion* with the records behind it, and
 * the level only ever moves when the owner presses Approve. There is no code path from
 * evidence to a stored level that does not pass through him.
 *
 * It also cannot suggest going **down**. A lower observation is real evidence and is
 * kept and shown, but a downgrade is a judgement about a child, and the app does not
 * make those. It can say "this disagrees with the level you set"; it stops there.
 */

export interface ProgressionEvidence {
  readonly recordId: string;
  /** The rung this occasion supports. */
  readonly level: SkillLevel;
  readonly occurredAt: string;
  readonly note: string | undefined;
}

export type ProgressionOutcome =
  /** Enough evidence, no contradiction: offer the next rung. */
  | {
      readonly kind: 'suggested';
      readonly from: SkillLevel;
      readonly to: SkillLevel;
      readonly supporting: readonly ProgressionEvidence[];
      readonly occasions: number;
      readonly because: string;
    }
  /** Enough evidence, but something newer disagrees. Named, never acted on. */
  | {
      readonly kind: 'conflicting';
      readonly from: SkillLevel;
      readonly wouldHaveBeen: SkillLevel;
      readonly contradicting: ProgressionEvidence;
      readonly because: string;
    }
  /** Nothing to offer. The ordinary case, and not a shortfall. */
  | { readonly kind: 'none'; readonly because: string };

export const MINIMUM_OBSERVATIONS = 3;
export const MINIMUM_OCCASIONS = 2;

/** The day an observation happened, in the owner's local terms. */
function dayOf(occurredAt: string): string {
  return occurredAt.slice(0, 10);
}

export function nextRung(level: SkillLevel): SkillLevel | undefined {
  return SKILL_LEVELS[skillLevelIndex(level) + 1];
}

export function suggestProgression(
  current: SkillLevel,
  evidence: readonly ProgressionEvidence[],
): ProgressionOutcome {
  const target = nextRung(current);
  if (target === undefined) {
    return {
      kind: 'none',
      because: 'She is already doing this on her own — there is no rung above it.',
    };
  }

  const sorted = [...evidence].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  const qualifying = sorted.filter(
    (item) => skillLevelIndex(item.level) >= skillLevelIndex(target),
  );
  const occasions = new Set(qualifying.map((item) => dayOf(item.occurredAt))).size;

  if (qualifying.length < MINIMUM_OBSERVATIONS || occasions < MINIMUM_OCCASIONS) {
    return {
      kind: 'none',
      because:
        qualifying.length === 0
          ? 'Nothing recorded yet points above the level you set.'
          : `${String(qualifying.length)} observation${qualifying.length === 1 ? '' : 's'} on ${String(occasions)} occasion${occasions === 1 ? '' : 's'} — a suggestion needs ${String(MINIMUM_OBSERVATIONS)} across ${String(MINIMUM_OCCASIONS)}.`,
    };
  }

  /*
   * The newest thing he saw decides whether the suggestion would be honest.
   *
   * Checked against the *current* level rather than the target: an occasion below where
   * he already put her is a genuine disagreement, and offering "she has moved up" on top
   * of it would be the app talking over him.
   */
  const newest = sorted.at(-1);
  if (newest !== undefined && skillLevelIndex(newest.level) < skillLevelIndex(current)) {
    return {
      kind: 'conflicting',
      from: current,
      wouldHaveBeen: target,
      contradicting: newest,
      because: `Earlier occasions pointed to "${SKILL_LEVEL_LABELS[target].toLowerCase()}", but the most recent one you recorded was "${SKILL_LEVEL_LABELS[newest.level].toLowerCase()}". Worth a look rather than a change.`,
    };
  }

  return {
    kind: 'suggested',
    from: current,
    to: target,
    supporting: qualifying,
    occasions,
    because: `${String(qualifying.length)} occasions across ${String(occasions)} separate days point to "${SKILL_LEVEL_LABELS[target].toLowerCase()}". This is a suggestion — nothing changes unless you say so.`,
  };
}

/**
 * The four things the owner may do with a suggestion.
 *
 * Three of them decline it, and **none of them records anything against her**. Declining
 * a suggestion is not evidence that she cannot do something; it is evidence about what
 * her father thinks, which the app has no business storing as a fact about a child.
 */
export const PROGRESSION_RESPONSES = [
  'approve',
  'keep-current-level',
  'review-evidence',
  'not-now',
] as const;
export type ProgressionResponse = (typeof PROGRESSION_RESPONSES)[number];

export const PROGRESSION_RESPONSE_LABELS: Record<ProgressionResponse, string> = {
  approve: 'Approve progression',
  'keep-current-level': 'Keep current level',
  'review-evidence': 'Review evidence',
  'not-now': 'Not now',
};

/** True when the response should write a new declared level. Exactly one does. */
export function appliesProgression(response: ProgressionResponse): boolean {
  return response === 'approve';
}
