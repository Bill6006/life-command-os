import type { CanonicalRecord, ExecutionRecord } from '../../domain/records';
import { canonicalPatternId } from '../../domain/moves/registry';
import { outcomeWindows } from '../evaluation/outcomeWindows';
import { EMERGING_AT, type EvidenceStrength } from './contextualEvidence';

/**
 * Whether order made a difference (`V33-064`, v3.3 section G2).
 *
 * ## Observed pairs only
 *
 * The catalogue already declares prerequisites — `after` on a pattern — and those are
 * *authored assumptions*. They decide eligibility, which is a statement about what is
 * sensible, and they must never be mistaken for evidence about what helped. G2 is
 * explicit: sequence evidence requires actual observed sequences.
 *
 * So nothing here reads `after`. A pair exists in this index because the owner really did
 * one move and then another, within a window where the first could still plausibly be
 * relevant, and an outcome was recorded for the second.
 *
 * ## What it can conclude, and what it cannot
 *
 * It can say that B was more often followed by something better when A came first. It
 * cannot say A caused that, and the sentences it produces are the same association
 * vocabulary the rest of the learning layer uses.
 *
 * The comparison is always *against B alone*. A pair with no solo baseline says nothing —
 * "B went well four times, always after A" is equally consistent with A being essential
 * and with A being irrelevant, and the honest output is that there is nothing to compare.
 *
 * ## One step, never a chain
 *
 * This index is pairwise and stays pairwise. G2 forbids long prescribed chains, and the
 * reason is behavioural rather than technical: a three-step plan is a task list, and a
 * product that hands someone a task list has stopped making decisions for them. The
 * engine recommends the next justified action and recomputes.
 */

const PAIR_WINDOW_MS = 4 * 60 * 60 * 1000;

export interface SequenceEvidence {
  /** The move that came first. */
  readonly beforeId: string;
  /** The move whose outcome is being described. */
  readonly afterId: string;
  /** Resolved outcomes of `after` that followed `before` within the window. */
  readonly paired: number;
  readonly pairedFavourable: number;
  /** Resolved outcomes of `after` with no `before` in front of it. */
  readonly solo: number;
  readonly soloFavourable: number;
  readonly strength: EvidenceStrength;
  /** Association language. Never causal, never a prescription. */
  readonly statement: string;
}

interface Done {
  readonly patternId: string;
  readonly at: number;
  readonly resolved: boolean;
  readonly favourable: boolean;
}

/** Every execution, in order, with whether its own window closed on a known result. */
function timeline(records: readonly CanonicalRecord[], now: Date): readonly Done[] {
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

  const executions = new Map(
    records
      .filter((record): record is ExecutionRecord => record.recordType === 'execution')
      .map((execution) => [execution.recordId, execution]),
  );

  const out: Done[] = [];

  for (const window of outcomeWindows(records, now)) {
    if (window.executionState !== 'executed') continue;
    const execution = executions.get(window.executionRecordId);
    if (execution?.decisionEpisodeId === undefined) continue;

    const patternId = patternByEpisode.get(execution.decisionEpisodeId);
    if (patternId === undefined) continue;

    const result = window.state === 'closed' ? window.outcome?.result : undefined;
    const known = result?.status === 'known';
    out.push({
      patternId,
      at: Date.parse(execution.occurredAt),
      resolved: known,
      favourable: result?.status === 'known' && result.value.direction === 'improved',
    });
  }

  return out.sort((a, b) => a.at - b.at);
}

function describe(entry: {
  paired: number;
  pairedFavourable: number;
  solo: number;
  soloFavourable: number;
}): { strength: EvidenceStrength; statement: string } {
  /* Nothing to compare against is not weak evidence — it is no evidence. */
  if (entry.paired < EMERGING_AT || entry.solo < EMERGING_AT) {
    return {
      strength: 'insufficient',
      statement: 'Evidence is still limited: not enough of both orders to compare',
    };
  }

  const pairedRate = entry.pairedFavourable / entry.paired;
  const soloRate = entry.soloFavourable / entry.solo;
  const gap = pairedRate - soloRate;

  /*
   * A tenth is the smallest gap worth reporting on counts this small. Below it the
   * difference is one observation landing either way, which is a fact about the sample
   * rather than about the order.
   */
  if (Math.abs(gap) < 0.1) {
    return {
      strength: 'mixed',
      statement: 'Mixed evidence: order has not made a clear difference so far',
    };
  }

  return {
    strength: entry.paired + entry.solo >= 6 ? 'consistent' : 'emerging',
    statement:
      gap > 0
        ? 'Often followed by a better result when it comes second in this order'
        : 'Has tended to go no better in this order than on its own',
  };
}

/**
 * Every observed pair, compared against the second move happening alone.
 *
 * `before` is the most recent distinct move inside the window. Only one, deliberately:
 * attributing an outcome across three earlier moves is exactly the unfounded causal
 * reasoning this whole layer refuses.
 */
export function sequenceEvidence(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly SequenceEvidence[] {
  const done = timeline(records, now);

  const solo = new Map<string, { total: number; favourable: number }>();
  const pairs = new Map<
    string,
    { beforeId: string; afterId: string; paired: number; pairedFavourable: number }
  >();

  done.forEach((entry, index) => {
    if (!entry.resolved) return;

    const preceding = [...done.slice(0, index)]
      .reverse()
      .find(
        (other) => other.patternId !== entry.patternId && entry.at - other.at <= PAIR_WINDOW_MS,
      );

    if (preceding === undefined) {
      const current = solo.get(entry.patternId) ?? { total: 0, favourable: 0 };
      current.total += 1;
      if (entry.favourable) current.favourable += 1;
      solo.set(entry.patternId, current);
      return;
    }

    const key = `${preceding.patternId}|${entry.patternId}`;
    const current = pairs.get(key) ?? {
      beforeId: preceding.patternId,
      afterId: entry.patternId,
      paired: 0,
      pairedFavourable: 0,
    };
    current.paired += 1;
    if (entry.favourable) current.pairedFavourable += 1;
    pairs.set(key, current);
  });

  return [...pairs.values()]
    .map((pair) => {
      const baseline = solo.get(pair.afterId) ?? { total: 0, favourable: 0 };
      const shape = {
        paired: pair.paired,
        pairedFavourable: pair.pairedFavourable,
        solo: baseline.total,
        soloFavourable: baseline.favourable,
      };
      return { beforeId: pair.beforeId, afterId: pair.afterId, ...shape, ...describe(shape) };
    })
    .sort((a, b) => a.beforeId.localeCompare(b.beforeId) || a.afterId.localeCompare(b.afterId));
}

/**
 * Whether doing `afterId` now is supported by having just done something.
 *
 * Used by the arbiter as one more contract input, and returns `undefined` when the pair
 * has never been observed both ways — which is almost always, and must stay
 * distinguishable from "observed, and order did not matter".
 */
export function sequenceSupportFor(
  evidence: readonly SequenceEvidence[],
  afterId: string,
  recentlyDone: readonly string[],
): SequenceEvidence | undefined {
  return evidence.find(
    (entry) =>
      entry.afterId === afterId &&
      recentlyDone.includes(entry.beforeId) &&
      entry.strength !== 'insufficient',
  );
}
