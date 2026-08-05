import type {
  CandidateAction,
  DecisionOutput,
  RejectedCandidate,
  StateAssessment,
} from '../../intelligence/types';
import type { DecisionTrace, DomainSubmission, TraceStep } from '../boundary';
import type { NorthStarGateResult } from '../arbitration/northStar';

/**
 * The explicit decision trace (Phase 8 deliverable 34).
 *
 * Every stage between "seven domains offered something" and "one thing is on screen",
 * in order, with the count at each step. The existing `reasonTrace` on an output explains
 * why the winner won; this explains **what happened to everything else**, which is the
 * part an owner cannot reconstruct and the part that makes the arbitration inspectable
 * rather than merely deterministic.
 *
 * ## Counts, not menus
 *
 * The trace says how many candidates a stage removed and why. It never lists what they
 * were. Rejected candidates are an internal audit trail and rendering them would turn the
 * one global decision into a menu with a preferred option — which is the exact failure
 * `INTEL-006` exists to prevent, arrived at through the back door.
 *
 * ## `wouldChangeIt` is the useful half
 *
 * A trace that only explains the past is a receipt. Naming what would change the answer
 * turns it into something the owner can act on: answer the time question, finish the open
 * loop, wait for the protected context to end.
 */

function count(
  rejected: readonly RejectedCandidate[],
  stage: RejectedCandidate['stage'],
): number {
  return rejected.filter((entry) => entry.stage === stage).length;
}

export function buildDecisionTrace(input: {
  readonly submissions: readonly DomainSubmission[];
  readonly coreCandidateCount: number;
  readonly afterDedupe: readonly CandidateAction[];
  readonly northStar: NorthStarGateResult;
  readonly rejected: readonly RejectedCandidate[];
  readonly output: DecisionOutput;
  readonly state: StateAssessment;
}): DecisionTrace {
  const offered = input.submissions.filter(
    (submission) => submission.candidate !== undefined,
  ).length;
  const silent = input.submissions.filter(
    (submission) => submission.enabled && submission.candidate === undefined,
  );

  const steps: TraceStep[] = [];

  steps.push({
    stage: 'Domains offered',
    detail: `${String(offered)} of ${String(input.submissions.filter((s) => s.enabled).length)} switched-on areas put something forward, plus ${String(input.coreCandidateCount)} from the core engine.`,
  });

  if (silent.length > 0) {
    steps.push({
      stage: 'Domains that stayed silent',
      detail: `${String(silent.length)} had nothing worth offering. Silence from an area is a result, not a gap.`,
    });
  }

  const mergedAway = count(input.rejected, 'duplicate');
  if (mergedAway > 0) {
    steps.push({
      stage: 'Equivalent candidates merged',
      detail: `${String(mergedAway)} asked for the same outcome as another and were merged into it, carrying their reasons across.`,
    });
  }

  steps.push({
    stage: 'North Star gate',
    detail: input.northStar.abstained
      ? 'Abstained: no enduring direction is recorded, so there was nothing to test against.'
      : `${String(count(input.rejected, 'north-star'))} removed for not serving the recorded direction; ${String(input.northStar.eligible.length)} passed.`,
  });

  for (const [stage, label] of [
    ['safety', 'Safety'],
    ['protected-context', 'Protected contexts'],
    ['commitment', 'Non-negotiable commitments'],
    ['capacity', 'Time and capacity'],
  ] as const) {
    const removed = count(input.rejected, stage);
    if (removed > 0) {
      steps.push({
        stage: label,
        detail: `${String(removed)} removed before ranking. Constraints remove; they never merely score lower.`,
      });
    }
  }

  const compared = count(input.rejected, 'comparison');
  steps.push({
    stage: 'Compared',
    detail:
      input.afterDedupe.length === 0
        ? 'Nothing reached comparison.'
        : `${String(compared + 1)} reached comparison; one was selected on an inspectable integer score.`,
  });

  steps.push({
    stage: 'Emitted',
    detail:
      input.output.kind === 'action'
        ? 'One action.'
        : input.output.kind === 'question'
          ? 'One question, because its answer changes what is eligible at all.'
          : input.output.kind === 'silence'
            ? 'Silence. Interrupting would have cost more than it returned.'
            : 'Not enough recorded to say anything yet.',
  });

  /* --- what would change it ---------------------------------------------- */

  const wouldChangeIt: string[] = [];

  if (input.state.unknowns.length > 0) {
    wouldChangeIt.push(`Answering: ${input.state.unknowns.slice(0, 2).join('; ')}`);
  }
  if (input.state.protectedContexts.length > 0) {
    wouldChangeIt.push(
      `The end of ${input.state.protectedContexts.join(' and ')}, which removes candidates rather than ranking them down`,
    );
  }
  if (count(input.rejected, 'capacity') > 0) {
    wouldChangeIt.push('A longer free window, or more capacity than is currently recorded');
  }
  if (!input.northStar.abstained && count(input.rejected, 'north-star') > 0) {
    wouldChangeIt.push(
      'An objective that one of the removed candidates would actually advance',
    );
  }
  if (wouldChangeIt.length === 0) {
    wouldChangeIt.push('New evidence in any area. Nothing is currently the deciding factor.');
  }

  return { steps, wouldChangeIt };
}
