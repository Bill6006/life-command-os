import { ENVIRONMENT_ACTIONS, type EnvironmentAction } from '../../../domain/home/environment';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { mayGenerateCandidate } from '../registry';
import type { HomeEvidence } from './assessHome';

/**
 * The one home candidate (Prompt 8G, `XDS-015`).
 *
 * ## The order
 *
 * 1. **A change he named and has not made.** He decided it; the app's only job is to keep
 *    it from quietly lapsing.
 * 2. **A change made, and the same thing still happening.** Offered once, naming that the
 *    first attempt did not hold. Knowing a change failed is worth as much as knowing one
 *    worked, and the app says so rather than going quiet out of tact.
 * 3. **A friction recorded more than once, with no change named.** The setup question,
 *    asked about the specific thing that keeps happening.
 * 4. **Silence.**
 *
 * ## What is deliberately not a branch
 *
 * **A single friction.** One occurrence produces nothing at all — no suggestion, no
 * nudge, no "you might want to look at this". One bad morning is an event, not a
 * property of a room, and a product that responds to it becomes a chore generator inside
 * a fortnight. Repetition is the entry condition, and it is the load-bearing restraint in
 * this slice.
 *
 * **Time.** There is no branch keyed on a week having passed, on a change being old, or
 * on an area being quiet. Nothing here is ever raised because of the calendar, which is
 * the difference between this and every cleaning app ever written.
 *
 * **A second open item.** While one change is open, no other is offered — the app holds
 * exactly one thing about the house at a time, by construction rather than by taste.
 */

export interface HomeCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(
  action: EnvironmentAction,
  reason: string,
  statementOverride?: string,
): CandidateAction {
  return {
    id: `home:${action.id}`,
    statement: statementOverride ?? action.statement,
    category: 'home-and-environment',
    originDomainId: 'home-and-environment',
    intendedOutcome: action.intendedOutcome,
    followUp: { promptId: action.followUpPromptId, windowHours: 48 },
    capabilityEffects: action.capabilityEffects,
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.minimumVersion,
    stoppingPoint: action.stoppingPoint,
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    /*
     * Moving furniture about during a work block or while someone is asleep is not a
     * favour to anyone. `family` and `caregiving` are deliberately absent: setting a
     * space up for the evening is often exactly what belongs in those hours.
     */
    blockedByProtectedContexts: ['sleep', 'work-focus', 'commute'],
    goalId: undefined,
    reason,
  };
}

export function generateHomeCandidate(
  records: readonly CanonicalRecord[],
  evidence: HomeEvidence,
): HomeCandidateResult {
  if (!mayGenerateCandidate(records, 'home-and-environment')) {
    return { candidate: undefined, because: 'This area is not switched on' };
  }

  /*
   * 1. A change he named and has not made.
   *
   * His words are quoted here, unlike the faith slice's repair. The difference is what
   * the field holds: this one describes an object in a room, and seeing "move the charger
   * to the desk" on the front page costs nothing if somebody else reads it over his
   * shoulder. Discretion is applied where the content warrants it, not everywhere out of
   * habit — blanket redaction would make the app less useful without making it safer.
   */
  if (evidence.openChange !== undefined) {
    return {
      candidate: toCandidate(
        ENVIRONMENT_ACTIONS['make-the-change'],
        `You decided: "${evidence.openChange}"`,
      ),
      because:
        'You picked this one. Nothing here is adding a second job while it is still open.',
    };
  }

  /* 2. The change was made, and the same thing is still happening. */
  if (evidence.changeMade && evidence.frictionSince === 'Still happening') {
    return {
      candidate: toCandidate(
        ENVIRONMENT_ACTIONS['try-a-different-change'],
        'The change was made and the same thing came back',
      ),
      because:
        'A change that did not hold is evidence too. This is offered once, and it is not a verdict on the first attempt.',
    };
  }

  /*
   * 3. Something that keeps happening.
   *
   * `set-it-up-before` when the repetition is setup cost, because that is the one case
   * where the shape of the answer is knowable without knowing anything about his house.
   * Otherwise the app asks for his change rather than inventing one.
   */
  const worst = evidence.repeated[0];
  if (worst !== undefined && evidence.changeStatement === undefined) {
    const action =
      worst.kindId === 'setup-first'
        ? ENVIRONMENT_ACTIONS['set-it-up-before']
        : ENVIRONMENT_ACTIONS['name-one-change'];

    return {
      candidate: toCandidate(
        action,
        `"${worst.label}" — recorded ${String(worst.occasions)} times`,
      ),
      because:
        'Recorded more than once, which is the only thing that gets a mention here. A single awkward morning is left alone.',
    };
  }

  /* 4. Silence. */
  return {
    candidate: undefined,
    because:
      evidence.totalFrictions === 1
        ? 'One thing got in the way once. That is an event, not a pattern, and nothing is suggested for it.'
        : 'Nothing here has happened often enough to be worth a change.',
  };
}
