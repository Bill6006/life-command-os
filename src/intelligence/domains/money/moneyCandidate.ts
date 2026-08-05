import { MONEY_ACTIONS, type MoneyAction } from '../../../domain/money/strategy';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { mayGenerateCandidate } from '../registry';
import type { MoneyEvidence } from './assessMoney';

/**
 * The one money candidate (Prompt 8H, `XDS-015`).
 *
 * ## The order
 *
 * 1. **A decision he named and has not settled.** He raised it; the app's only job is to
 *    keep it from drifting.
 * 2. **He said he has not looked in a while.** Two minutes, one number. This is the only
 *    branch the app raises without him naming something first, and it is deliberately the
 *    smallest act available.
 * 3. **Pressure is heavy and nothing is named as the point of it.** Asks what the money
 *    is for, in his words.
 * 4. **Something is named and nothing has moved it lately.** One step.
 * 5. **Silence.**
 *
 * ## What is deliberately not a branch
 *
 * **Thin resilience.** Someone with under a week of cover is told nothing by this
 * generator. There is no action that would help — "build up savings" is not a move
 * anybody can do this afternoon, and offering it to a person who is short of money is the
 * cruellest kind of useless. The reading is shown on the panel because it is true and he
 * should be able to see it; it produces no suggestion because there is none to give.
 *
 * **A figure.** No branch reads `goalTarget` or `goalCurrent`. What the app suggests is
 * identical whether or not amounts are switched on, which is what stops the optional
 * machinery quietly becoming required.
 *
 * **Silence itself.** Nothing here fires because a week passed, a month closed, or a
 * balance changed — the app has no access to the last of those and no business acting on
 * the first two.
 */

export interface MoneyCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(action: MoneyAction, reason: string): CandidateAction {
  return {
    id: `money:${action.id}`,
    statement: action.statement,
    category: 'money',
    originDomainId: 'money',
    intendedOutcome: action.intendedOutcome,
    followUp: { promptId: action.followUpPromptId, windowHours: 48 },
    capabilityEffects: action.capabilityEffects,
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.minimumVersion,
    stoppingPoint: action.stoppingPoint,
    friction: 'high',
    risk: 'none-identified',
    reversibility: 'reversible',
    /*
     * Every protected context, which no other domain's actions claim. Money is the one
     * subject where being interrupted in front of family, mid-commute, or during
     * caregiving is worse than not being asked at all.
     */
    blockedByProtectedContexts: [
      'sleep',
      'family',
      'caregiving',
      'work-focus',
      'commute',
      'recovery',
    ],
    goalId: undefined,
    reason,
  };
}

export function generateMoneyCandidate(
  records: readonly CanonicalRecord[],
  evidence: MoneyEvidence,
): MoneyCandidateResult {
  if (!mayGenerateCandidate(records, 'money')) {
    return { candidate: undefined, because: 'This area is not switched on' };
  }

  /*
   * 1. A decision he named and has not settled.
   *
   * His words are **not** quoted in the reason. A candidate reason is rendered on Now, and
   * money is a protected class — "whether to tell them I cannot make the payment" is not a
   * sentence that belongs on the front page of an app somebody might glance at. The faith
   * slice withheld for the same reason; the home slice quoted because a charger on a desk
   * is harmless. The classification decides, not the habit.
   */
  if (evidence.openDecision !== undefined) {
    return {
      candidate: toCandidate(
        MONEY_ACTIONS['make-the-call'],
        'You wrote this one down yourself',
      ),
      because:
        'You raised it. Leaving it undecided costs something too, and this is not deciding it for you.',
    };
  }

  /* 2. He said he has not looked. Offered as two minutes, and never as a reckoning. */
  if (evidence.notLookingLately) {
    return {
      candidate: toCandidate(
        MONEY_ACTIONS['look-at-one-number'],
        'You said it has been a while since you looked',
      ),
      because:
        'Two minutes and one number. Nothing has to be decided, worked out, or fixed today — looking is the whole of it.',
    };
  }

  /* 3. Heavy pressure with nothing named as the point of it. */
  if (
    evidence.pressure !== undefined &&
    evidence.pressure.ordinal >= 4 &&
    evidence.purpose === undefined
  ) {
    return {
      candidate: toCandidate(
        MONEY_ACTIONS['name-what-it-is-for'],
        'A lot on your mind, and nothing written down about what it is for',
      ),
      because:
        'Pressure with no stated point to it is harder to carry. This asks for your sentence, not a plan.',
    };
  }

  /* 4. Something named, and nothing recorded against it lately. */
  if (evidence.purpose !== undefined && evidence.pressureSince === undefined) {
    return {
      candidate: toCandidate(
        MONEY_ACTIONS['one-thing-that-moves-it'],
        'You named what it is for',
      ),
      because: 'One step against the thing you named. Not an afternoon of admin.',
    };
  }

  /* 5. Silence. */
  return {
    candidate: undefined,
    because:
      evidence.resilienceIndex !== undefined && evidence.resilienceIndex <= 1
        ? 'Cover is thin, and there is no move that fixes that this afternoon. Saying so is more honest than suggesting something.'
        : 'Nothing here needs deciding today.',
  };
}
