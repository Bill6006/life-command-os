import { EMOTIONAL_ACTIONS, type EmotionalAction } from '../../../domain/emotional/regulation';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { mayGenerateCandidate } from '../registry';
import { REPAIR_SETTLING_HOURS, type EmotionalEvidence } from './assessEmotional';

/**
 * The one emotional candidate (Prompt 8E, `XDS-015`).
 *
 * ## The order, and why it is this order
 *
 * 1. **Something has been in the way for weeks.** The domain stops having a view and
 *    names who might. First because nothing else it could offer matters more, and
 *    because burying it under a suggestion to go for a walk would be worse than saying
 *    nothing at all.
 * 2. **A conflict that has settled but not been repaired.** Going back is available for
 *    a short while and gets harder with distance; this is the one moment the app can be
 *    genuinely useful in a relationship without knowing anything about the other person.
 * 3. **A boundary already decided but not yet held.** He made the decision. The app's
 *    only job is to not let it quietly lapse.
 * 4. **Something is interfering right now.** One regulation option, chosen for how much
 *    is in the way, all of which are ten minutes and reversible.
 * 5. **No contact for several days while loneliness is high.** The cheapest possible
 *    move: one message to one person, done when it is sent.
 * 6. **Nothing.** Silence, which is the normal case.
 *
 * ## What never appears here
 *
 * No advice about another person, no interpretation of a mood, no suggestion that
 * springs from a single low reading, and nothing at all about a protected topic. Private
 * Patterns cannot reach this function: they are read from a surface the owner opened
 * himself, and no branch below consults them.
 */

export interface EmotionalCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(action: EmotionalAction, reason: string): CandidateAction {
  return {
    id: `emotional:${action.id}`,
    statement: action.statement,
    category: 'emotional-and-relationships',
    originDomainId: 'emotional-and-relationships',
    intendedOutcome: action.intendedOutcome,
    followUp: { promptId: action.followUpPromptId, windowHours: 24 },
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
     * Not blocked by `family` or `caregiving`: reaching out to someone, or going back
     * after a row, is often exactly what belongs in those hours. Work focus and sleep
     * are protected as everywhere else.
     */
    blockedByProtectedContexts: ['sleep', 'work-focus', 'commute'],
    goalId: undefined,
    reason,
  };
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function generateEmotionalCandidate(
  records: readonly CanonicalRecord[],
  evidence: EmotionalEvidence,
  now: Date,
): EmotionalCandidateResult {
  if (!mayGenerateCandidate(records, 'emotional-and-relationships')) {
    return { candidate: undefined, because: 'This area is not switched on' };
  }

  /* 1. Weeks of interference: stop having a view. */
  if (evidence.persistentInterference) {
    return {
      candidate: toCandidate(
        EMOTIONAL_ACTIONS['speak-to-someone-qualified'],
        'Recorded as significantly in the way for three weeks or more',
      ),
      because:
        'You have recorded something getting in the way for weeks. This app has no view on what it is, and should not have one.',
    };
  }

  /* 2. A conflict that has settled and not been repaired. */
  if (evidence.conflictOpen && !evidence.repairMade) {
    const settledFor =
      evidence.conflictOpenSince === undefined
        ? 0
        : now.getTime() - Date.parse(evidence.conflictOpenSince);

    if (settledFor >= REPAIR_SETTLING_HOURS * HOUR_MS) {
      return {
        candidate: toCandidate(
          EMOTIONAL_ACTIONS['repair-after-a-conflict'],
          'Something is recorded as unresolved, and enough time has passed for it to have settled',
        ),
        because:
          'Going back is easier now than it will be in a week. What they do with it is theirs.',
      };
    }
  }

  /* 3. A boundary decided but not yet held. */
  if (evidence.openBoundary !== undefined && evidence.boundaryAttempts === 0) {
    return {
      candidate: toCandidate(
        EMOTIONAL_ACTIONS['hold-the-boundary-you-decided'],
        `You wrote down: "${evidence.openBoundary}"`,
      ),
      because: 'You already made this decision. Nothing here is being decided for you.',
    };
  }

  /* 4. Something is interfering right now. */
  if (evidence.interference === 'a-lot' || evidence.interference === 'some') {
    const action =
      evidence.interference === 'a-lot'
        ? EMOTIONAL_ACTIONS['step-outside']
        : EMOTIONAL_ACTIONS['name-it-and-park-it'];

    return {
      candidate: toCandidate(action, 'Something is recorded as getting in the way today'),
      because:
        'Ten minutes, reversible, and it asks nothing of anyone else. It is offered because something is in the way, not because of how you rated anything.',
    };
  }

  /* 5. Days without contact while loneliness is high. */
  const daysSinceContact =
    evidence.lastConnectionAt === undefined
      ? undefined
      : Math.floor((now.getTime() - Date.parse(evidence.lastConnectionAt)) / DAY_MS);

  if (
    evidence.anyEvidence &&
    (evidence.loneliness ?? 0) >= 4 &&
    (daysSinceContact === undefined || daysSinceContact >= 3)
  ) {
    return {
      candidate: toCandidate(
        EMOTIONAL_ACTIONS['reach-out-to-one-person'],
        daysSinceContact === undefined
          ? 'No contact recorded yet, and loneliness is recorded as high'
          : `${String(daysSinceContact)} days since any contact was recorded`,
      ),
      because:
        'One message to one person. It is done when it is sent — a reply is not part of it.',
    };
  }

  /* 6. Silence. */
  return {
    candidate: undefined,
    because:
      'Nothing here needs to interrupt you. Most of what matters in this area happens without an app suggesting it.',
  };
}
