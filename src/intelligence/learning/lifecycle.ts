import type { CanonicalRecord } from '../../domain/records';
import type { MoveLifecycle } from '../../domain/moves/families';
import { canonicalPatternId, findPattern } from '../../domain/moves/registry';
import {
  CONSISTENT_AT,
  EMERGING_AT,
  contextualEvidence,
  type ContextualEvidence,
} from './contextualEvidence';

/**
 * Lifecycle and sustainability, driven by evidence (`V33-065`, v3.3 sections G5 and G6).
 *
 * ## Two questions that must not be merged
 *
 * G5 is the whole reason this file holds both. **Effectiveness** asks whether the desired
 * result was observed. **Sustainability** asks whether the move is realistic enough to
 * keep doing. A move can score well on the first and be quietly abandoned on the second,
 * and an engine that folds them together will go on recommending the thing being avoided —
 * with evidence, which makes it worse rather than better.
 *
 * They are computed from different signals here and never combined into one figure.
 * Effectiveness comes from resolved outcomes; sustainability comes from what happened to
 * the *attempt* — declined, abandoned, stopped early, or carried through.
 *
 * ## Nothing turns on one observation
 *
 * The rule in both directions (`AT33-035`). A single poor result must not retire a move: a
 * bad evening is the most ordinary thing there is, and a system that reacts to it deletes
 * options faster than it can ever earn them back. A single good result must not make a
 * move supported either, for the same reason read the other way.
 *
 * So transitions need a run, and the run has to agree with itself. Disagreement produces
 * `context-specific` rather than an average — which is not a compromise, it is the more
 * precise finding: the move works somewhere, and the somewhere is known.
 *
 * ## Evidence retires; the owner forbids
 *
 * These two must never be confused (`AT33-045`). `retired` here is a claim about
 * observations and can be revisited when the situation changes materially. A forbidden
 * move is the owner's decision, lives in `move-preference`, needs no evidence, and is not
 * a judgement about whether the move works. Nothing in this file writes or reads that
 * stance.
 */

export type LifecycleReason =
  | 'never-observed'
  | 'too-few-observations'
  | 'consistent-here'
  | 'works-in-some-contexts'
  | 'repeatedly-unhelpful'
  | 'withdrawn-by-evidence';

export interface LifecycleVerdict {
  readonly patternId: string;
  /** What the catalogue authored. Never overwritten — this file derives, it does not edit. */
  readonly authored: MoveLifecycle;
  /** What the evidence supports now. */
  readonly current: MoveLifecycle;
  readonly reason: LifecycleReason;
  /** In words, for the trace. Association language only. */
  readonly because: string;
  /** The contexts it held in, when the answer is `context-specific`. */
  readonly heldIn: readonly string[];
}

/** Disagreeing observations before a move is ranked down. */
export const WEAKEN_AT = 3;
/** Disagreeing observations, with nothing in its favour, before evidence withdraws it. */
export const RETIRE_AT = 5;

/**
 * What the evidence currently supports for one move.
 *
 * Derived, never stored. Recomputing from raw records each time is what makes a correction
 * take effect everywhere at once — see `G8`: rolling back an interpretation must change
 * the derived belief without touching a single observation.
 */
export function lifecycleOf(
  patternId: string,
  evidence: readonly ContextualEvidence[],
): LifecycleVerdict {
  const authored = findPattern(patternId)?.lifecycle ?? 'experimental';
  const mine = evidence.filter((entry) => entry.patternId === patternId);

  const verdict = (
    current: MoveLifecycle,
    reason: LifecycleReason,
    because: string,
    heldIn: readonly string[] = [],
  ): LifecycleVerdict => ({ patternId, authored, current, reason, because, heldIn });

  if (mine.length === 0) {
    return verdict(
      'experimental',
      'never-observed',
      'Nothing has been observed about this here yet',
    );
  }

  const favourable = mine.reduce((total, entry) => total + entry.favourable, 0);
  const unfavourable = mine.reduce((total, entry) => total + entry.unfavourable, 0);

  /*
   * Withdrawal requires a run of disagreement and *nothing* in its favour. One good
   * result anywhere is enough to make this a context question rather than a verdict.
   */
  if (unfavourable >= RETIRE_AT && favourable === 0) {
    return verdict(
      'retired',
      'withdrawn-by-evidence',
      'Repeatedly not followed by any improvement here',
    );
  }

  const strongContexts = mine.filter(
    (entry) => entry.strength === 'consistent' && entry.favourable > entry.unfavourable,
  );
  const weakContexts = mine.filter((entry) => entry.unfavourable > entry.favourable);

  /*
   * Held somewhere and not elsewhere is the most useful thing evidence can say, and the
   * one an average destroys. Reported before the global verdicts so it wins.
   */
  if (strongContexts.length > 0 && weakContexts.length > 0) {
    return verdict(
      'context-specific',
      'works-in-some-contexts',
      'Often followed by something better in some situations and not others',
      strongContexts.map((entry) => `${entry.facet.kind}: ${entry.facet.value}`),
    );
  }

  if (strongContexts.length > 0) {
    return verdict(
      'supported',
      'consistent-here',
      'Often followed by something better in similar situations',
      strongContexts.map((entry) => `${entry.facet.kind}: ${entry.facet.value}`),
    );
  }

  if (unfavourable >= WEAKEN_AT && favourable < unfavourable) {
    return verdict(
      'weakened',
      'repeatedly-unhelpful',
      'Has more often been followed by no change',
    );
  }

  /*
   * The honest middle, and the most common answer. Something has been seen; it is not
   * enough. The authored lifecycle is not promoted on this — a catalogue claiming
   * `supported` from research has still not been supported *here*.
   */
  return verdict(
    'experimental',
    'too-few-observations',
    'Evidence is still limited for this one',
  );
}

/** Every move anything has been observed about. */
export function lifecycleStates(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly LifecycleVerdict[] {
  const evidence = contextualEvidence(records, now);
  const patternIds = [...new Set(evidence.map((entry) => entry.patternId))];
  return patternIds
    .map((patternId) => lifecycleOf(patternId, evidence))
    .sort((a, b) => a.patternId.localeCompare(b.patternId));
}

/* -------------------------------------------------------------------------- */
/* Sustainability                                                              */
/* -------------------------------------------------------------------------- */

export type Sustainability = 'unknown' | 'sustainable' | 'strained' | 'unsustainable';

export interface SustainabilityVerdict {
  readonly patternId: string;
  readonly offered: number;
  readonly carriedThrough: number;
  readonly declined: number;
  readonly abandoned: number;
  readonly verdict: Sustainability;
  readonly because: string;
}

/** Attempts before the pattern of behaviour says anything at all. */
export const SUSTAINABILITY_AT = 3;

/**
 * Whether a move is one the owner can actually keep doing (`G5`).
 *
 * Read from attempts, not outcomes: how often it was offered, and what became of it.
 * Declining and abandoning are the signals, and they are signals about the *move's* fit
 * with a life — not about the owner, and not about whether it works.
 *
 * A single rejection means nothing (`AT33-034`). People decline useful things constantly
 * for reasons that have no bearing on the move: the phone rang, the baby woke, they simply
 * did not feel like it. Only a repeated pattern is informative, and even then the strongest
 * word available is `unsustainable`, which is a statement about repetition rather than
 * worth.
 */
export function sustainabilityOf(
  records: readonly CanonicalRecord[],
): readonly SustainabilityVerdict[] {
  const patternByEpisode = new Map<string, string>();
  for (const record of records) {
    if (record.recordType !== 'candidate-action') continue;
    if (record.decisionEpisodeId === undefined) continue;
    if (record.engineCandidateId === undefined) continue;
    patternByEpisode.set(
      record.decisionEpisodeId,
      canonicalPatternId(record.engineCandidateId),
    );
  }

  const tally = new Map<
    string,
    { offered: number; carriedThrough: number; declined: number; abandoned: number }
  >();

  for (const record of records) {
    if (record.recordType !== 'execution') continue;
    const execution = record;
    if (execution.decisionEpisodeId === undefined) continue;

    const patternId = patternByEpisode.get(execution.decisionEpisodeId);
    if (patternId === undefined) continue;

    const entry = tally.get(patternId) ?? {
      offered: 0,
      carriedThrough: 0,
      declined: 0,
      abandoned: 0,
    };
    entry.offered += 1;

    if (execution.state === 'executed') entry.carriedThrough += 1;
    else if (execution.state === 'not-executed') entry.declined += 1;
    else if (execution.state === 'partially-executed') entry.abandoned += 1;

    tally.set(patternId, entry);
  }

  return [...tally.entries()]
    .map(([patternId, entry]) => {
      const walkedAway = entry.declined + entry.abandoned;

      if (entry.offered < SUSTAINABILITY_AT) {
        return {
          patternId,
          ...entry,
          verdict: 'unknown' as const,
          because: 'Not offered enough times to say',
        };
      }

      if (walkedAway === 0) {
        return {
          patternId,
          ...entry,
          verdict: 'sustainable' as const,
          because: 'Has been carried through every time it was offered',
        };
      }

      if (walkedAway >= entry.offered * 0.7) {
        return {
          patternId,
          ...entry,
          verdict: 'unsustainable' as const,
          because: 'Has usually been declined or stopped part-way',
        };
      }

      if (walkedAway >= entry.offered * 0.4) {
        return {
          patternId,
          ...entry,
          verdict: 'strained' as const,
          because: 'Often declined or stopped part-way, though not always',
        };
      }

      return {
        patternId,
        ...entry,
        verdict: 'sustainable' as const,
        because: 'Usually carried through when offered',
      };
    })
    .sort((a, b) => a.patternId.localeCompare(b.patternId));
}

/**
 * Sustainability as the arbitration contract states it.
 *
 * The contract's `sustainability` field is a `Level`, and the mapping is deliberately
 * lossy in one direction only: `unknown` stays `unknown`. Everything else this file can
 * conclude is about how much friction repetition has shown, so `sustainable` is high and
 * `unsustainable` is low, and there is no route from an absence of evidence to a value.
 */
export function sustainabilityLevel(
  verdicts: readonly SustainabilityVerdict[],
  patternId: string,
): 'low' | 'moderate' | 'high' | 'unknown' {
  const found = verdicts.find((entry) => entry.patternId === patternId);
  if (found === undefined) return 'unknown';

  switch (found.verdict) {
    case 'sustainable':
      return 'high';
    case 'strained':
      return 'moderate';
    case 'unsustainable':
      return 'low';
    default:
      return 'unknown';
  }
}

/**
 * Whether evidence and repeatability disagree about a move.
 *
 * The case G5 exists for: it works and he will not keep doing it. Surfaced so a caller can
 * say both things rather than resolving them into one.
 */
export function effectiveButUnsustainable(
  lifecycle: readonly LifecycleVerdict[],
  sustainability: readonly SustainabilityVerdict[],
): readonly string[] {
  return lifecycle
    .filter((entry) => entry.current === 'supported')
    .filter((entry) =>
      sustainability.some(
        (other) =>
          other.patternId === entry.patternId &&
          (other.verdict === 'unsustainable' || other.verdict === 'strained'),
      ),
    )
    .map((entry) => entry.patternId);
}

/** Re-exported so callers do not have to know which module owns the thresholds. */
export { CONSISTENT_AT, EMERGING_AT };
