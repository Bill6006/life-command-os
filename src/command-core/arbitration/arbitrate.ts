import { selectOutput } from '../../intelligence/decision/selectOutput';
import type {
  CandidateAction,
  DecisionOutput,
  EffectPrediction,
  RejectedCandidate,
} from '../../intelligence/types';
import type { CommandCoreInput } from '../boundary';
import { dedupeCandidates } from './dedupe';
import { applyNorthStarGate, type NorthStarGateResult } from './northStar';

/**
 * Arbitration: one global action, question, or silence (Phase 8 deliverables 25, 26).
 *
 * ## The nine gates, in order
 *
 * The plan lists them: safety, foundation, commitment, leverage, capacity, effect,
 * evidence, friction, and tie. They are not nine new filters — most were built in Phase 4
 * and live in `selectOutput`, which this wraps rather than replaces. Rewriting them here
 * would have produced two implementations of the same rule, and the one nobody edited
 * would have been the one that mattered.
 *
 * What Phase 8 adds in front of them is the pair that only make sense across domains:
 *
 * 1. **Merge** equivalent candidates, so two areas asking for the same thing count once
 *    and carry both reasons.
 * 2. **North Star**, so an action that serves no recorded direction is removed before
 *    ranking rather than out-scoring one that does.
 *
 * Then `selectOutput` applies safety, protected contexts, non-negotiable commitments,
 * time and capacity — and, among survivors, leverage and effect through the expected
 * benefit terms, evidence through confidence, friction through its own term, and the tie
 * break through a deterministic sort. The order is preserved exactly: Phase 8 narrows the
 * field, and the constraint-first selection that Phase 4 proved still decides.
 *
 * ## Why the North Star gate runs after merging
 *
 * Because a merged candidate carries both reasons, and the bottleneck qualification reads
 * the reason. Gating first would judge each domain's wording alone and could drop a
 * candidate that a second domain had already justified.
 */

export interface ArbitrationResult {
  readonly output: DecisionOutput;
  readonly rejected: readonly RejectedCandidate[];
  readonly considered: readonly CandidateAction[];
  readonly northStar: NorthStarGateResult;
}

export function arbitrate(input: CommandCoreInput): ArbitrationResult {
  const all = [
    ...input.coreCandidates,
    ...input.submissions.flatMap((submission) =>
      submission.candidate === undefined ? [] : [submission.candidate],
    ),
  ];

  const deduped = dedupeCandidates(all);
  const northStar = applyNorthStarGate(input.records, deduped.merged);

  const selection = selectOutput(
    input.records,
    input.state,
    northStar.eligible,
    input.predictions,
    input.forecast,
  );

  return {
    output: selection.output,
    rejected: [...deduped.rejected, ...northStar.rejected, ...selection.rejected],
    considered: northStar.eligible,
    northStar,
  };
}

/**
 * Effect predictions for whatever survived, filling gaps rather than failing.
 *
 * A merged candidate's id is one of the originals, so its prediction is already present.
 * A candidate with no prediction gets an empty one, which `selectOutput` already handles —
 * an absent prediction means "no effects are claimed", which is the honest reading.
 */
export function predictionsFor(
  candidates: readonly CandidateAction[],
  predictions: readonly EffectPrediction[],
): readonly EffectPrediction[] {
  return candidates.map(
    (candidate) =>
      predictions.find((entry) => entry.candidateId === candidate.id) ?? {
        candidateId: candidate.id,
        effects: [],
        confidence: {
          label: 'insufficient-evidence',
          why: 'No effects were predicted for this candidate',
          dimensions: [],
        },
        reasonTrace: [],
      },
  );
}
