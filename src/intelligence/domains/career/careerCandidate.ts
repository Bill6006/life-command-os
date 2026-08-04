import { CAREER_ACTIONS, type CareerAction } from '../../../domain/career/ladder';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { mayGenerateCandidate } from '../registry';
import type { CareerEvidence } from './assessCareer';

/**
 * The one career candidate (Prompt 8C tasks 9–10, `XDS-015`).
 *
 * ## The order, and why it is this order
 *
 * 1. **No next step written down.** The most common reason a session does not start is
 *    not knowing what to do first, and it is the only one the app can remove outright.
 * 2. **An interruption nobody came back from.** Resuming is cheaper than restarting,
 *    and the window in which that is true is short.
 * 3. **A claim with nothing behind it.** The gap between what you would say and what
 *    you could show is the thing this domain exists to close.
 * 4. **Retrieval has not been tested lately.** Reading feels like learning; recalling
 *    is the part that shows whether it was.
 * 5. **Nothing.** Silence, and the core engine's own focus block competes as usual.
 *
 * ## What is deliberately not here
 *
 * "Do the next module." "Continue the course." "Complete today's task." The Blueprint
 * forbids hosting course content and building a second task board, and a domain that
 * generated its own study items would be both within a month. Four actions, all of
 * which are about *evidence* rather than *progress through material*.
 */

export interface CareerCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(
  action: CareerAction,
  reason: string,
  statementOverride?: string,
): CandidateAction {
  return {
    id: `career:${action.id}`,
    statement: statementOverride ?? action.statement,
    category: 'career-work-learning',
    originDomainId: 'career-and-learning',
    intendedOutcome: action.intendedOutcome,
    followUp: action.followUp,
    capabilityEffects: [
      {
        channel: 'learning-and-capability',
        effect: 'improves',
        magnitude: 'meaningful',
        basis: 'external-research',
        crossDomain: false,
      },
      {
        channel: 'follow-through',
        effect: 'improves',
        magnitude: 'small',
        basis: 'app-inference',
        crossDomain: true,
      },
    ],
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.fallback,
    stoppingPoint: action.stoppingPoint,
    friction: action.friction,
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: ['sleep', 'family', 'caregiving', 'commute'],
    goalId: undefined,
    reason,
  };
}

export function generateCareerCandidate(
  records: readonly CanonicalRecord[],
  evidence: CareerEvidence,
): CareerCandidateResult {
  if (!mayGenerateCandidate(records, 'career-and-learning')) {
    return { candidate: undefined, because: 'Career and learning is not switched on.' };
  }

  if (!evidence.anyEvidence) {
    return {
      candidate: undefined,
      because:
        'Nothing has been recorded about career or learning, so there is nothing to act on.',
    };
  }

  /* 1. The next step is missing or has gone stale. --------------------------- */
  if (evidence.nextStep === undefined || evidence.nextStep.freshness === 'stale') {
    return {
      candidate: toCandidate(
        CAREER_ACTIONS['name-the-next-step'],
        evidence.nextStep === undefined
          ? 'No exact next step is recorded'
          : 'The recorded next step is old enough to have been overtaken',
      ),
      because:
        evidence.nextStep === undefined
          ? 'There is no exact next step written down. That is the most common reason a session does not start, and it is the one thing here that can be removed outright.'
          : 'The next step on record is old enough that it has probably been overtaken. Five minutes now saves the next session from starting with a decision.',
    };
  }

  /* 2. An interruption that was never returned to. --------------------------- */
  if (evidence.openInterruption) {
    return {
      candidate: toCandidate(
        CAREER_ACTIONS['return-to-it'],
        'A session was interrupted and not resumed',
        `Pick up where you stopped: ${evidence.nextStep.text}`,
      ),
      because:
        'Something was interrupted and never picked back up. Resuming is much cheaper than restarting, and it stops being true quite quickly.',
    };
  }

  /* 3. A claim with nothing behind it. --------------------------------------- */
  const unsupported = evidence.claims.find((claim) => claim.unsupported);
  if (unsupported !== undefined) {
    return {
      candidate: toCandidate(
        CAREER_ACTIONS['prove-a-claim'],
        'A stated claim has no supporting evidence',
        `Do the smallest thing that would prove: ${unsupported.claim.statement}`,
      ),
      because: `"${unsupported.claim.statement}" has nothing behind it yet. ${unsupported.nextProof}. That gap is not a failing — it is the most useful thing on this screen.`,
    };
  }

  /* 4. Retrieval has not been checked in a while. ---------------------------- */
  const lastRetrieval = evidence.retrievalTrend
    .map((point, index) => ({ index, value: point.value }))
    .filter((point) => point.value !== null)
    .at(-1);
  const retrievalStale = lastRetrieval === undefined || lastRetrieval.index < 5;

  if (evidence.studiedRecently && retrievalStale) {
    return {
      candidate: toCandidate(
        CAREER_ACTIONS['practise-retrieval'],
        'Study has happened but nothing has tested what stuck',
      ),
      because:
        'You have been studying, and nothing recent has tested what actually comes back. Reading feels like learning; recalling is the part that shows whether it was.',
    };
  }

  /* 5. Nothing. -------------------------------------------------------------- */
  return {
    candidate: undefined,
    because:
      evidence.sessionsThisWeek > 0
        ? 'Study is happening, a next step is recorded, and every claim has something behind it. There is nothing this area needs to interrupt for.'
        : 'Nothing in the career evidence points at a specific thing worth doing. The ordinary focus block competes on its own merits.',
  };
}
