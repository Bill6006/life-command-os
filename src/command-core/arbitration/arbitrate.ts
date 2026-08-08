import { selectOutput } from '../../intelligence/decision/selectOutput';
import type {
  CandidateAction,
  DecisionOutput,
  EffectPrediction,
  RejectedCandidate,
} from '../../intelligence/types';
import type { CommandCoreInput } from '../boundary';
import { modificationFor, suppressedMoveIds } from './stances';
import { resolveContradictions } from './contradictions';
import { activeDeclines } from './declined';
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

  /*
   * What the owner just declined, removed before anything else looks at it.
   *
   * First, because re-offering a declined action is the one outcome no amount of merging or
   * gating can excuse — and because it must hold on every re-run, not only the one directly
   * after the button.
   */
  const declined = activeDeclines(input.records);

  /*
   * And what the owner has taken a standing position on (`V33-032`, section I).
   *
   * A separate question from the decline above, deliberately. That one asks "did you say
   * not-now in the last hour"; this asks "what have you decided about this move". A pause
   * ends by itself, a context block applies only in the situation it was set in, and a
   * prohibition holds until the owner restores it — none of which any number of declines
   * can produce.
   */
  const stanced = suppressedMoveIds(input.records, input.now, input.state.situation);

  const withOwnerWording = all.map((candidate) => {
    const reworded = modificationFor(
      input.records,
      input.now,
      input.state.situation,
      candidate.id,
    );
    if (reworded === undefined) return candidate;
    return {
      ...candidate,
      statement: reworded.statement,
      ...(reworded.minutes === undefined ? {} : { durationMinutes: reworded.minutes }),
    };
  });

  const offered = withOwnerWording.filter(
    (candidate) => !declined.has(candidate.id) && !stanced.has(candidate.id),
  );
  const declinedRejections: RejectedCandidate[] = [
    ...all
      .filter((candidate) => declined.has(candidate.id))
      .map((candidate) => ({
        candidateId: candidate.id,
        stage: 'declined' as const,
        reason:
          'You said not now, and nothing has been recorded since that would change the answer',
      })),
    ...all
      .filter((candidate) => stanced.has(candidate.id))
      .map((candidate) => ({
        candidateId: candidate.id,
        stage: 'declined' as const,
        reason: stanced.get(candidate.id) ?? 'You set a standing preference on this',
      })),
  ];

  const deduped = dedupeCandidates(offered);
  const northStar = applyNorthStarGate(input.records, deduped.merged);

  /*
   * Contradictions, after the North Star gate and before ranking (`V33-045`, D4).
   *
   * Here because both survivors have to have passed everything else first — resolving a
   * conflict between two candidates one of which was about to be removed for safety would
   * be answering the wrong question. And before `selectOutput`, so the loser is recorded
   * as beaten by a specific alternative rather than disappearing into the ranking.
   */
  const resolved = resolveContradictions(northStar.eligible);

  const selection = selectOutput(
    input.records,
    input.state,
    resolved.kept,
    input.predictions,
    input.forecast,
    input.now,
  );

  /*
   * A decline must not silence a question that would unblock the decline.
   *
   * The first version of this exclusion removed the declined candidate and stopped there.
   * When it was the only candidate, `selectOutput` had nothing left to reason about and
   * emitted silence — so declining with "I'm not sure how much time I have" produced
   * "nothing requires attention right now" instead of asking about the time. That is
   * strictly worse than the behaviour it replaced, and the browser suite caught it.
   *
   * A question is not the declined action coming back. It is the one thing that produces
   * the evidence which releases the decline, and it is only asked here when the unfiltered
   * set would have asked it anyway. The action itself stays excluded either way.
   */
  const rescuedQuestion =
    selection.output.kind === 'silence' && declinedRejections.length > 0
      ? selectOutput(
          input.records,
          input.state,
          applyNorthStarGate(input.records, dedupeCandidates(all).merged).eligible,
          input.predictions,
          input.forecast,
          input.now,
        )
      : undefined;

  const output =
    rescuedQuestion?.output.kind === 'question' ? rescuedQuestion.output : selection.output;

  return {
    output,
    rejected: [
      ...declinedRejections,
      ...deduped.rejected,
      ...northStar.rejected,
      ...resolved.rejected,
      ...selection.rejected,
    ],
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
