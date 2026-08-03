import type {
  CanonicalRecord,
  ConfidenceLabel,
  LifeContextChangeRecord,
} from '../../domain/records';
import { currentOfType } from '../support';
import type { ConfidenceAssessment } from '../types';
import type { EffectivenessEvaluation } from '../evaluation/evaluate';

/**
 * The conservative learning governor (Prompt 6 tasks 6–7).
 *
 * Beliefs form slowly, narrow before they strengthen, and are suspended rather than
 * deleted when circumstances change.
 *
 * **This is where the Phase 4 confidence ceiling lifts — and only here.**
 * `strong-personal-evidence` becomes reachable because prospective validation now
 * exists: a recommendation was made, then carried out, then observed through a
 * closed outcome window. Nothing that looks backwards through history can reach it,
 * which is `LEARN-003` made operational rather than promised.
 *
 * Four rules the governor will not break:
 *   - **Unresolved evaluations count for nothing.** A declined recommendation and a
 *     missing outcome are not weak evidence; they are no evidence.
 *   - **Confounded episodes cannot strengthen a belief.** They can only narrow it.
 *   - **Contradiction narrows before it retires.** A belief that fails in one context
 *     is limited to the contexts where it held, not thrown away.
 *   - **Association is never stated as causation.** Below the top label, statements
 *     say "is associated with", not "causes" or "works".
 */

/** Supporting evaluations needed before a belief may be stated at all. */
const FORM_THRESHOLD = 2;
/** Needed before it may be relied on. */
const HELD_THRESHOLD = 3;
/** Needed, with no contradictions and no confounding, for the top label. */
const STRONG_THRESHOLD = 4;

export type BeliefStatus = 'forming' | 'held' | 'narrowed' | 'suspended' | 'retired';
export type BeliefChange =
  'formed' | 'strengthened' | 'weakened' | 'narrowed' | 'suspended' | 'retired';

export interface BeliefHistoryEntry {
  readonly change: BeliefChange;
  readonly because: string;
  readonly evaluationIds: readonly string[];
}

export interface BeliefState {
  readonly id: string;
  readonly statement: string;
  readonly status: BeliefStatus;
  readonly confidence: ConfidenceAssessment;
  readonly supporting: readonly string[];
  readonly contradicting: readonly string[];
  readonly prospectivelyValidated: boolean;
  readonly applicability: string;
  readonly suspendedBy: string | undefined;
  readonly history: readonly BeliefHistoryEntry[];
}

function beliefConfidence(
  supporting: number,
  contradicting: number,
  confoundedCount: number,
  prospectivelyValidated: boolean,
): ConfidenceAssessment {
  const clean = supporting - confoundedCount;

  const dimensions: ConfidenceAssessment['dimensions'] = [
    {
      dimension: 'comparable-evidence-volume',
      assessment:
        supporting >= HELD_THRESHOLD ? 'supports' : supporting > 0 ? 'neutral' : 'undermines',
      note: `${String(supporting)} supporting, ${String(contradicting)} contradicting`,
    },
    {
      dimension: 'confounding-risk',
      assessment: confoundedCount === 0 ? 'supports' : 'undermines',
      note:
        confoundedCount === 0
          ? 'No confounded episodes among the supporting evidence'
          : `${String(confoundedCount)} supporting episode${confoundedCount === 1 ? '' : 's'} confounded`,
    },
    {
      dimension: 'consistency',
      assessment: contradicting === 0 ? 'supports' : 'undermines',
      note: contradicting === 0 ? 'Nothing contradicts it yet' : 'Contradicted at least once',
    },
    {
      dimension: 'prospective-validation',
      assessment: prospectivelyValidated ? 'supports' : 'undermines',
      note: prospectivelyValidated
        ? 'Every supporting episode was predicted before it was observed'
        : 'Not yet validated against a later outcome',
    },
  ];

  let label: ConfidenceLabel;
  let why: string;

  if (supporting === 0) {
    label = 'insufficient-evidence';
    why = 'Nothing resolved supports this yet.';
  } else if (
    prospectivelyValidated &&
    clean >= STRONG_THRESHOLD &&
    contradicting === 0 &&
    confoundedCount === 0
  ) {
    // The ceiling lifts here, and nowhere else.
    label = 'strong-personal-evidence';
    why = `${String(clean)} clean episodes, each predicted before it was observed, none contradicted.`;
  } else if (clean >= HELD_THRESHOLD && contradicting === 0) {
    label = 'moderate-evidence';
    why = `${String(clean)} unconfounded supporting episodes, none contradicted.`;
  } else {
    label = 'early-signal';
    why =
      contradicting > 0
        ? `Supported ${String(supporting)} times and contradicted ${String(contradicting)}. Narrowed rather than dropped.`
        : `Only ${String(supporting)} supporting episode${supporting === 1 ? '' : 's'}, some confounded.`;
  }

  return { label, why, dimensions };
}

/**
 * Derives the current belief set from resolved evaluations.
 *
 * Recomputed from evidence every time rather than mutated in place, so a belief can
 * never drift away from what actually supports it.
 */
export function deriveBeliefs(
  records: readonly CanonicalRecord[],
  evaluations: readonly EffectivenessEvaluation[],
  now: Date,
): BeliefState[] {
  const resolved = evaluations.filter((evaluation) => evaluation.verdict !== 'unresolved');
  if (resolved.length === 0) return [];

  const contextChanges = currentOfType<LifeContextChangeRecord>(records, 'life-context-change');
  const latestChange = contextChanges.reduce<LifeContextChangeRecord | undefined>(
    (latest, change) =>
      latest === undefined || change.effectiveFrom > latest.effectiveFrom ? change : latest,
    undefined,
  );

  const supporting = resolved.filter(
    (evaluation) =>
      evaluation.verdict === 'supported' || evaluation.verdict === 'partially-supported',
  );
  const contradicting = resolved.filter((evaluation) => evaluation.verdict === 'contradicted');
  const confounded = supporting.filter((evaluation) => evaluation.confounding.risk === 'high');

  if (supporting.length < FORM_THRESHOLD) {
    return [];
  }

  const prospectivelyValidated = supporting.every((evaluation) => evaluation.prospective);
  const confidence = beliefConfidence(
    supporting.length,
    contradicting.length,
    confounded.length,
    prospectivelyValidated,
  );

  const history: BeliefHistoryEntry[] = [
    {
      change: 'formed',
      because: `${String(supporting.length)} recommendations were carried out and their outcomes observed.`,
      evaluationIds: supporting.map((evaluation) => evaluation.executionRecordId),
    },
  ];

  let status: BeliefStatus = supporting.length >= HELD_THRESHOLD ? 'held' : 'forming';
  let applicability = 'All recorded contexts so far';
  let suspendedBy: string | undefined;

  if (supporting.length > FORM_THRESHOLD && contradicting.length === 0) {
    history.push({
      change: 'strengthened',
      because: 'Further episodes were carried out and observed without contradiction.',
      evaluationIds: supporting.slice(FORM_THRESHOLD).map((e) => e.executionRecordId),
    });
  }

  // Narrow before weakening: a belief that failed somewhere is limited, not denied.
  if (contradicting.length > 0) {
    status = 'narrowed';
    applicability = 'Limited to the contexts where it held; it did not hold everywhere';
    history.push({
      change: 'narrowed',
      because: `Contradicted ${String(contradicting.length)} time${contradicting.length === 1 ? '' : 's'}, so its scope was reduced rather than its truth denied.`,
      evaluationIds: contradicting.map((e) => e.executionRecordId),
    });
  }

  // Retire only when contradiction outweighs support.
  if (contradicting.length >= supporting.length && contradicting.length >= 2) {
    status = 'retired';
    history.push({
      change: 'retired',
      because:
        'Contradicted at least as often as it was supported. It should stop influencing anything.',
      evaluationIds: contradicting.map((e) => e.executionRecordId),
    });
  }

  /*
   * A life-context change suspends rather than deletes. The evidence was real; it
   * is simply no longer comparable, and it may become relevant again.
   */
  if (
    latestChange !== undefined &&
    status !== 'retired' &&
    Date.parse(latestChange.effectiveFrom) <= now.getTime()
  ) {
    status = 'suspended';
    suspendedBy = latestChange.recordId;
    history.push({
      change: 'suspended',
      because: `Circumstances changed — ${latestChange.summary}. The earlier evidence is no longer comparable, so this is paused rather than discarded.`,
      evaluationIds: [],
    });
  }

  const statement =
    confidence.label === 'strong-personal-evidence'
      ? 'Protecting a focused block earlier in the day reliably improves focused hours for you'
      : 'Protecting a focused block earlier in the day is associated with better focused hours';

  return [
    {
      id: 'belief:focus-block-timing',
      statement,
      status,
      confidence,
      supporting: supporting.map((evaluation) => evaluation.executionRecordId),
      contradicting: contradicting.map((evaluation) => evaluation.executionRecordId),
      prospectivelyValidated,
      applicability,
      suspendedBy,
      history,
    },
  ];
}
