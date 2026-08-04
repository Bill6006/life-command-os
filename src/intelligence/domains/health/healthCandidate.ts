import { HEALTH_ACTIONS, type HealthAction } from '../../../domain/health/actions';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction, StateAssessment } from '../../types';
import { mayGenerateCandidate } from '../registry';
import type { HealthEvidence } from './assessHealth';

/**
 * The one health candidate (Prompt 8B tasks 8–9, `XDS-015`).
 *
 * Zero or one. The domain does its own choosing, in its own terms, and brings one
 * thing to the global comparison — where it may well lose, in which case nothing about
 * health appears on Now at all.
 *
 * ## The order, and why it is an order rather than a score
 *
 * 1. **Something is badly in the way and has been for weeks.** The domain declines to
 *    have an opinion and says who might.
 * 2. **Something is badly in the way today.** The smallest protective action.
 * 3. **Recovery was poor and it is evening.** Protect tonight rather than optimise today.
 * 4. **An ordinary explanation is unruled-out** — nothing to drink, nothing eaten.
 * 5. **Mental energy is low while physical energy is not.** The split earns its keep:
 *    a body that can move and a mind that cannot concentrate needs movement or quiet,
 *    not a focus block.
 * 6. **Nothing.** Silence is the normal case and the correct one.
 *
 * A score would let a large enough "benefit" outrank a safety concern. An order cannot.
 *
 * ## What it will never do
 *
 * Every action comes from `HEALTH_ACTIONS`, a closed set written out in full. There is
 * no template, no composition, and no branch that produces a sentence about a symptom.
 * The domain's answer to a persistent problem is to stop having an answer.
 */

export interface HealthCandidateResult {
  readonly candidate: CandidateAction | undefined;
  /** Why this one, or why none. Always populated, always inspectable. */
  readonly because: string;
  /** True when the domain deliberately deferred to a person (`SAFE-001`). */
  readonly deferredToHuman: boolean;
}

function toCandidate(action: HealthAction, reason: string): CandidateAction {
  return {
    id: `health:${action.id}`,
    statement: action.statement,
    category: 'health-recovery-energy',
    originDomainId: 'health-recovery-energy',
    intendedOutcome: action.intendedOutcome,
    followUp: action.followUp,
    capabilityEffects: action.capabilityEffects,
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.fallback,
    stoppingPoint: action.stoppingPoint,
    friction: action.friction,
    risk: 'none-identified',
    reversibility: 'reversible',
    /*
     * Health actions are blocked by the same protected contexts as everything else.
     * Suggesting a walk while someone is driving is not a health failure, it is a
     * safety one, and the shared filter already removes it.
     */
    blockedByProtectedContexts: ['sleep', 'commute'],
    goalId: undefined,
    reason,
  };
}

/** Evening, in the owner's local time. Sleep advice before lunch is noise. */
function isEvening(now: Date): boolean {
  return now.getHours() >= 18;
}

export function generateHealthCandidate(
  records: readonly CanonicalRecord[],
  evidence: HealthEvidence,
  state: StateAssessment,
  now: Date,
): HealthCandidateResult {
  if (!mayGenerateCandidate(records, 'health-recovery-energy')) {
    return {
      candidate: undefined,
      because: 'Health is not switched on.',
      deferredToHuman: false,
    };
  }

  if (!evidence.anyEvidence) {
    return {
      candidate: undefined,
      because: 'Nothing has been recorded about health, so there is nothing to act on.',
      deferredToHuman: false,
    };
  }

  const pain = evidence.painInterference?.value;
  const persistence = evidence.persistence?.value;
  const badlyInTheWay = pain === 'a-lot' || pain === 'cannot-work-around-it';

  /* 1. Persistent and interfering — stop having an opinion. ------------------ */
  if (badlyInTheWay && (persistence === 'weeks' || persistence === 'over-a-month')) {
    return {
      candidate: toCandidate(
        HEALTH_ACTIONS['seek-human-support'],
        'Something physical has been getting in the way for weeks',
      ),
      because:
        'Something has been in the way for weeks and is still interfering. That is past the point where an app should be suggesting anything — this is the one thing worth doing, and it is not a health tip.',
      deferredToHuman: true,
    };
  }

  /* 2. Badly in the way today — the smallest protective thing. --------------- */
  if (badlyInTheWay) {
    return {
      candidate: toCandidate(
        HEALTH_ACTIONS.pause,
        'Something physical is significantly in the way right now',
      ),
      because:
        'Something is significantly in the way right now. Stopping is the only thing worth proposing while that is true; nothing here is an opinion about what it is.',
      deferredToHuman: false,
    };
  }

  /* 3. Poor recovery, and it is evening. ------------------------------------- */
  const recovery = evidence.recovery?.value;
  if (recovery !== undefined && recovery <= 2 && isEvening(now)) {
    return {
      candidate: toCandidate(
        HEALTH_ACTIONS['prepare-for-sleep'],
        'Recovery was poor and it is late enough to protect tonight',
      ),
      because:
        'Recovery was poor last night and it is evening. Protecting tonight is worth more than anything that could be squeezed out of today.',
      deferredToHuman: false,
    };
  }

  /* 4. Ordinary explanations, not yet ruled out. ----------------------------- */
  if (evidence.hydration?.value === 'Barely anything') {
    return {
      candidate: toCandidate(HEALTH_ACTIONS.hydrate, 'Almost nothing to drink today'),
      because:
        'Almost nothing to drink today. This is the cheapest ordinary explanation for feeling flat, and it is worth ruling out before anything more elaborate.',
      deferredToHuman: false,
    };
  }

  if (evidence.foodNeed?.value === 'Very') {
    return {
      candidate: toCandidate(HEALTH_ACTIONS['eat-something'], 'Reported as very hungry'),
      because: 'You said you are very hungry. Hunger is one of the things in the way.',
      deferredToHuman: false,
    };
  }

  /* 5. The split earns its keep. --------------------------------------------- */
  const physical = evidence.physicalEnergy?.value;
  const mental = evidence.mentalEnergy?.value;
  if (physical !== undefined && mental !== undefined && physical - mental >= 2) {
    return {
      candidate: toCandidate(
        HEALTH_ACTIONS['gentle-movement'],
        'Physical energy is well ahead of mental energy',
      ),
      because:
        'Your body has more in it than your head does right now. That is the case where moving is worth more than trying to concentrate — and it is only visible because the two were asked separately.',
      deferredToHuman: false,
    };
  }

  if (mental !== undefined && mental <= 2 && (physical === undefined || physical >= 3)) {
    return {
      candidate: toCandidate(
        HEALTH_ACTIONS.meditate,
        'Mental energy is low with no physical reason recorded',
      ),
      because:
        'Mental energy is low without a physical reason on record. Ten quiet minutes is a small, reversible thing to try before a focus block that may not land.',
      deferredToHuman: false,
    };
  }

  /* 6. Nothing. ------------------------------------------------------------- */
  const capacity = state.capacity.status === 'known' ? state.capacity.value : undefined;
  return {
    candidate: undefined,
    because:
      capacity === 'depleted' || capacity === 'low'
        ? 'Capacity is low, but nothing recorded about health points at a specific thing worth doing. Suggesting something anyway would be filling the space.'
        : 'Nothing in the health evidence warrants interrupting. That is the normal case.',
    deferredToHuman: false,
  };
}
