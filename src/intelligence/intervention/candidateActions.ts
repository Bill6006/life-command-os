import { knownValue, type CanonicalRecord } from '../../domain/records';
import { activeGoals, openCommitments } from '../support';
import type { CandidateAction, StateAssessment } from '../types';

/**
 * Candidate generation (part of `DECISION-CONSTRAINT-FIRST`).
 *
 * Candidates are **internal**. They are generated so they can be compared, and only
 * the winner is ever surfaced (`INTEL-006`). Nothing about this module's output is
 * shaped for display.
 *
 * Every candidate carries the full set the Constitution requires: timing, dose,
 * friction, a minimum useful version, a fallback, a stopping point, risk, and
 * reversibility. A candidate without a stopping point cannot be constructed, because
 * an action with no defined end is not something this product should propose.
 *
 * **Safety by construction:** this baseline can only generate focus blocks, small
 * unblocking steps, and recovery pauses. It has no vocabulary for medication,
 * health risk, driving, dependents, legal, financial, or security-sensitive actions,
 * so those cannot appear even before the safety filter runs.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateCandidates(
  records: readonly CanonicalRecord[],
  state: StateAssessment,
  now: Date,
): CandidateAction[] {
  const candidates: CandidateAction[] = [];
  const free = knownValue(state.availableMinutes);
  const capacity = knownValue(state.capacity);
  const goals = activeGoals(records);
  const commitments = openCommitments(records);

  // 1. Focused work on an active goal that has not moved recently.
  for (const goal of goals) {
    const daysSince = Math.floor((now.getTime() - Date.parse(goal.recordedAt)) / DAY_MS);
    const dose = free === undefined ? 25 : Math.max(10, Math.min(50, free - 15));
    candidates.push({
      id: `focus:${goal.recordId}`,
      statement: goal.statement,
      category: goal.category,
      intendedOutcome: 'The block is started and the goal moves',
      followUp: { promptId: 'outcome:completed', windowHours: 24 },
      capabilityEffects: [
        {
          channel: 'focus-and-clarity',
          effect: 'improves',
          magnitude: 'meaningful',
          basis: 'app-inference',
          crossDomain: false,
        },
        {
          channel: 'energy-and-recovery',
          effect: 'costs',
          magnitude: 'small',
          basis: 'app-inference',
          crossDomain: true,
        },
      ],
      durationMinutes: dose,
      minimumMinutes: 10,
      minimumVersion: 'Ten minutes still counts',
      fallback: 'Write down the single next step instead',
      stoppingPoint:
        free === undefined
          ? 'Stop when the next commitment starts'
          : `Stop after ${String(dose)} minutes whatever the progress`,
      friction: daysSince > 7 ? 'moderate' : 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: ['sleep', 'family', 'caregiving'],
      goalId: goal.recordId,
      reason:
        daysSince > 7
          ? `No recorded progress for ${String(daysSince)} days`
          : 'Active goal with a window open',
    });
  }

  // 2. A small step against a commitment that is blocked or waiting on someone.
  for (const commitment of commitments) {
    if (commitment.state !== 'blocked' && commitment.state !== 'waiting') continue;
    candidates.push({
      id: `unblock:${commitment.recordId}`,
      statement: `Unblock: ${commitment.statement}`,
      category: commitment.category,
      intendedOutcome: 'The commitment is no longer waiting on this step',
      followUp: { promptId: 'outcome:decision-completed', windowHours: 72 },
      capabilityEffects: [
        {
          channel: 'follow-through',
          effect: 'improves',
          magnitude: 'meaningful',
          basis: 'app-inference',
          crossDomain: false,
        },
      ],
      durationMinutes: 10,
      minimumMinutes: 5,
      minimumVersion: 'Send the one message that unblocks it',
      fallback: 'Note who you are waiting on and when you last asked',
      stoppingPoint: 'Stop once the message is sent',
      friction: 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: ['sleep', 'family', 'caregiving'],
      goalId: undefined,
      reason: `Blocked or waiting, and a short step would move it`,
    });
  }

  // 3. A recovery pause when capacity is low. Doing less is a legitimate action.
  if (capacity === 'low' || capacity === 'depleted') {
    candidates.push({
      id: 'recover:pause',
      statement: 'Take a deliberate pause',
      category: 'time-attention-capacity',
      intendedOutcome: 'The interference eases enough to do something else',
      followUp: { promptId: 'outcome:still-interfering', windowHours: 4 },
      capabilityEffects: [
        {
          channel: 'energy-and-recovery',
          effect: 'improves',
          magnitude: 'small',
          basis: 'app-inference',
          crossDomain: false,
        },
      ],
      durationMinutes: 10,
      minimumMinutes: 5,
      minimumVersion: 'Five minutes away from a screen',
      fallback: 'Stand up and stop working for a moment',
      stoppingPoint: 'Stop when the next commitment starts',
      friction: 'low',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
      goalId: undefined,
      reason: `Capacity is ${capacity}`,
    });
  }

  // Deterministic order, so the same records always produce the same comparison.
  return candidates.sort((a, b) => a.id.localeCompare(b.id));
}
