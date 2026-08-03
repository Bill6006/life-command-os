import {
  knownValue,
  type CanonicalRecord,
  type ContextSnapshotRecord,
} from '../../domain/records';
import { activeGoals, currentOfType, openCommitments, shortLabel } from '../support';
import type { EffectivenessEvaluation, ForecastEvaluation } from '../evaluation/evaluate';
import type { TrajectoryResult } from '../types';
import type { BeliefState } from './beliefs';

/**
 * The graphs (Prompt 6 tasks 9–10).
 *
 * Every graph carries its obligations **as data**, so one cannot be rendered without
 * them: the question it answers, its metric, its window, whether it shows observed
 * or inferred content, how missing data is treated, its uncertainty, and a text
 * summary (`UX-003`).
 *
 * The rule that shaped all of them: **unresolved is always shown, never dropped.**
 * A follow-through chart that quietly omits the recommendations still waiting for an
 * outcome would flatter the system; showing them is the whole point.
 *
 * Nothing here is decorative. A graph that cannot state its question does not exist.
 */

export interface GraphMeta {
  readonly id: string;
  readonly question: string;
  readonly metric: string;
  readonly window: string;
  readonly evidence: 'observed' | 'inferred' | 'mixed';
  readonly missingDataTreatment: string;
  readonly uncertainty: string;
  readonly textSummary: string;
}

export interface TrendGraph extends GraphMeta {
  readonly kind: 'trend';
  readonly unit: string;
  /** `null` means no evidence for that period — a gap, never a zero. */
  readonly points: readonly { readonly label: string; readonly value: number | null }[];
}

export type BarTone = 'benefit' | 'cost' | 'neutral' | 'unresolved';

export interface ComparisonGraph extends GraphMeta {
  readonly kind: 'comparison';
  readonly bars: readonly {
    readonly label: string;
    readonly value: number;
    readonly tone: BarTone;
    readonly note: string;
  }[];
}

export type Graph = TrendGraph | ComparisonGraph;

const CAPACITY_SCALE: Record<string, number> = { depleted: 1, low: 2, moderate: 3, high: 4 };

export function buildGraphs(
  records: readonly CanonicalRecord[],
  trajectory: TrajectoryResult,
  forecastEvaluations: readonly ForecastEvaluation[],
  effectiveness: readonly EffectivenessEvaluation[],
  beliefs: readonly BeliefState[],
  now: Date,
): Graph[] {
  const graphs: Graph[] = [];

  /* 1. Category trajectory ------------------------------------------------- */
  graphs.push({
    kind: 'trend',
    id: 'focused-hours',
    question: trajectory.question,
    metric: 'Hours in blocks of 25 minutes or more, summed per week',
    window: 'Last eight weeks',
    evidence: 'observed',
    missingDataTreatment:
      'Weeks with no recorded evidence are gaps. They are never counted as zero.',
    uncertainty:
      'Counts are observed, not estimated. The direction band that turns them into a word is a stated convention.',
    textSummary: trajectory.detail,
    unit: 'h',
    points: trajectory.periods,
  });

  /* 2. Workload versus capacity -------------------------------------------- */
  const snapshots = currentOfType<ContextSnapshotRecord>(records, 'context-snapshot')
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .slice(-8);

  const capacityPoints = snapshots.map((snapshot) => {
    const level = knownValue(snapshot.capacity);
    return {
      label: shortLabel(snapshot.occurredAt),
      value: level === undefined ? null : (CAPACITY_SCALE[level] ?? null),
    };
  });

  graphs.push({
    kind: 'trend',
    id: 'capacity',
    question: 'Is capacity holding up, or being spent down?',
    metric: 'Reported capacity per snapshot, on a four-step scale from depleted to high',
    window: 'Last eight context snapshots',
    evidence: 'inferred',
    missingDataTreatment:
      'A snapshot where capacity was not reported is a gap. It is not read as low capacity.',
    uncertainty:
      'Capacity is self-reported and inferred rather than measured. The four steps are ordered, not evenly spaced — the distance between depleted and low is not the same as between moderate and high.',
    textSummary:
      capacityPoints.length === 0
        ? 'No capacity has been recorded yet.'
        : `${String(capacityPoints.filter((p) => p.value !== null).length)} of the last ${String(capacityPoints.length)} snapshots reported capacity. ${String(openCommitments(records).length)} commitments are open against it.`,
    unit: '',
    points: capacityPoints,
  });

  /* 3. Forecast accuracy ---------------------------------------------------- */
  const forecastCounts = {
    supported: forecastEvaluations.filter((e) => e.verdict === 'supported').length,
    partial: forecastEvaluations.filter((e) => e.verdict === 'partially-supported').length,
    contradicted: forecastEvaluations.filter((e) => e.verdict === 'contradicted').length,
    invalidated: forecastEvaluations.filter((e) => e.verdict === 'context-invalidated').length,
    unresolved: forecastEvaluations.filter((e) => e.verdict === 'unresolved').length,
  };

  graphs.push({
    kind: 'comparison',
    id: 'forecast-accuracy',
    question: 'When the system said what would happen, was it right?',
    metric: 'Count of forecasts by verdict',
    window: 'All forecasts recorded',
    evidence: 'mixed',
    missingDataTreatment:
      'Forecasts whose horizon has not closed, or that closed with no outcome, are counted as unresolved and shown. They are never dropped to improve the picture.',
    uncertainty:
      'This measures forecast accuracy only. It says nothing about whether any recommendation helped — that is a separate question with separate evidence.',
    textSummary:
      forecastEvaluations.length === 0
        ? 'No forecast has been evaluated yet.'
        : `${String(forecastCounts.supported)} supported, ${String(forecastCounts.contradicted)} contradicted, ${String(forecastCounts.unresolved)} still unresolved.`,
    bars: [
      {
        label: 'Supported',
        value: forecastCounts.supported,
        tone: 'benefit',
        note: 'Predicted direction matched what was observed',
      },
      {
        label: 'Partly',
        value: forecastCounts.partial,
        tone: 'neutral',
        note: 'Partly consistent',
      },
      {
        label: 'Contradicted',
        value: forecastCounts.contradicted,
        tone: 'cost',
        note: 'The forecast was wrong',
      },
      {
        label: 'Context changed',
        value: forecastCounts.invalidated,
        tone: 'neutral',
        note: 'Circumstances changed inside the horizon — neither right nor wrong',
      },
      {
        label: 'Unresolved',
        value: forecastCounts.unresolved,
        tone: 'unresolved',
        note: 'No outcome yet, or the forecast abstained',
      },
    ],
  });

  /* 4. Recommendation follow-through ---------------------------------------- */
  const followThrough = {
    executed: effectiveness.filter((e) => e.executionState === 'executed').length,
    partial: effectiveness.filter((e) => e.executionState === 'partially-executed').length,
    notExecuted: effectiveness.filter((e) => e.executionState === 'not-executed').length,
    unknown: effectiveness.filter((e) => e.executionState === 'unknown-execution').length,
  };

  graphs.push({
    kind: 'comparison',
    id: 'follow-through',
    question: 'What happened to the recommendations that were made?',
    metric: 'Count of recommendations by execution state',
    window: 'All recommendations with a recorded execution',
    evidence: 'observed',
    missingDataTreatment:
      'Recommendations with no recorded execution do not appear here at all, rather than being assumed declined.',
    uncertainty:
      'This is a record of what happened, not a judgement. Not carrying something out is not a failure, and none of these counts feed into whether a recommendation was any good.',
    textSummary:
      effectiveness.length === 0
        ? 'No recommendation has a recorded execution yet.'
        : `${String(followThrough.executed)} carried out, ${String(followThrough.partial)} partly, ${String(followThrough.notExecuted)} declined, ${String(followThrough.unknown)} unknown.`,
    bars: [
      {
        label: 'Carried out',
        value: followThrough.executed,
        tone: 'neutral',
        note: 'Done as recommended',
      },
      {
        label: 'Partly',
        value: followThrough.partial,
        tone: 'neutral',
        note: 'Done in reduced form',
      },
      {
        label: 'Declined',
        value: followThrough.notExecuted,
        tone: 'neutral',
        note: 'Deliberately not done — this is not counted against the recommendation',
      },
      {
        label: 'Unknown',
        value: followThrough.unknown,
        tone: 'unresolved',
        note: 'No reliable evidence either way',
      },
    ],
  });

  /* 5. Recommendation effectiveness ----------------------------------------- */
  const effectCounts = {
    supported: effectiveness.filter((e) => e.verdict === 'supported').length,
    partial: effectiveness.filter((e) => e.verdict === 'partially-supported').length,
    contradicted: effectiveness.filter((e) => e.verdict === 'contradicted').length,
    unresolved: effectiveness.filter((e) => e.verdict === 'unresolved').length,
  };

  graphs.push({
    kind: 'comparison',
    id: 'actions-and-outcomes',
    question: 'Were the actions that were carried out followed by better outcomes?',
    metric: 'Count of executed recommendations by outcome verdict',
    window: 'All executions with a closed outcome window',
    evidence: 'mixed',
    missingDataTreatment:
      'Declined recommendations and missing outcomes are counted as unresolved and shown. Neither is evidence that the recommendation was poor.',
    uncertainty:
      'Association, not causation. An outcome that improved after an action does not establish that the action caused it. Confounded episodes cannot reach "supported" at all.',
    textSummary:
      effectiveness.length === 0
        ? 'Nothing has been carried out and observed yet.'
        : `${String(effectCounts.supported)} associated with improvement, ${String(effectCounts.contradicted)} with a worse outcome, ${String(effectCounts.unresolved)} unresolved.`,
    bars: [
      {
        label: 'Improved after',
        value: effectCounts.supported,
        tone: 'benefit',
        note: 'Associated with a better outcome',
      },
      {
        label: 'Mixed or confounded',
        value: effectCounts.partial,
        tone: 'neutral',
        note: 'Too much else was going on to attribute it',
      },
      {
        label: 'Worse after',
        value: effectCounts.contradicted,
        tone: 'cost',
        note: 'The outcome worsened',
      },
      {
        label: 'Unresolved',
        value: effectCounts.unresolved,
        tone: 'unresolved',
        note: 'Not carried out, or no outcome observed',
      },
    ],
  });

  /* 6. Expected versus actual ------------------------------------------------ */
  const resolved = effectiveness.filter((e) => e.verdict !== 'unresolved');
  const asExpected = resolved.filter((e) => e.verdict === 'supported').length;
  const notAsExpected = resolved.filter((e) => e.verdict === 'contradicted').length;
  const partly = resolved.filter((e) => e.verdict === 'partially-supported').length;

  graphs.push({
    kind: 'comparison',
    id: 'expected-vs-actual',
    question: 'Do the predicted effects match what actually happened?',
    metric: 'Count of resolved episodes by whether the outcome matched the prediction',
    window: 'All episodes with a closed outcome window',
    evidence: 'mixed',
    missingDataTreatment:
      'Unresolved episodes are excluded here and reported in the chart above, so this is not read as a success rate.',
    uncertainty:
      'Effect magnitudes are coarse words with no personal evidence behind them yet. This compares direction, not size.',
    textSummary:
      resolved.length === 0
        ? 'No episode has closed its outcome window yet, so there is nothing to compare.'
        : `${String(asExpected)} of ${String(resolved.length)} matched the prediction, ${String(partly)} partly, ${String(notAsExpected)} did not.`,
    bars: [
      {
        label: 'As expected',
        value: asExpected,
        tone: 'benefit',
        note: 'Outcome direction matched the prediction',
      },
      {
        label: 'Partly',
        value: partly,
        tone: 'neutral',
        note: 'Consistent but confounded, or mixed',
      },
      {
        label: 'Not as expected',
        value: notAsExpected,
        tone: 'cost',
        note: 'Outcome went the other way',
      },
    ],
  });

  /* 7. North Star directional progress --------------------------------------- */
  const goals = activeGoals(records);
  const DAY = 24 * 60 * 60 * 1000;
  const recentlyMoved = goals.filter(
    (goal) => now.getTime() - Date.parse(goal.recordedAt) < 14 * DAY,
  ).length;

  graphs.push({
    kind: 'comparison',
    id: 'north-star',
    question: 'Is anything actually moving toward the North Star?',
    metric: 'Active goals by whether progress evidence was recorded in the last fourteen days',
    window: 'Last fourteen days',
    evidence: 'observed',
    missingDataTreatment:
      'A goal with no recorded progress is shown as exactly that — no evidence — rather than as zero progress. The difference matters: one is silence, the other is a claim.',
    uncertainty:
      'Recorded progress is not the same as real progress. This measures what was written down.',
    textSummary:
      goals.length === 0
        ? 'No active goals recorded.'
        : `${String(recentlyMoved)} of ${String(goals.length)} active goals have progress evidence in the last fortnight.`,
    bars: [
      {
        label: 'Evidence recorded',
        value: recentlyMoved,
        tone: 'benefit',
        note: 'Progress was written down recently',
      },
      {
        label: 'No recent evidence',
        value: goals.length - recentlyMoved,
        tone: 'unresolved',
        note: 'Silence, not necessarily inaction',
      },
    ],
  });

  /* 8. Confidence changes ---------------------------------------------------- */
  const belief = beliefs[0];
  graphs.push({
    kind: 'comparison',
    id: 'confidence',
    question: 'How much has the system earned the right to be confident?',
    metric: 'Supporting versus contradicting episodes behind the current belief',
    window: 'All resolved episodes',
    evidence: 'inferred',
    missingDataTreatment:
      'Unresolved episodes count for nothing on either side. They are not weak evidence.',
    uncertainty:
      'Volume is not quality. Reaching the top label additionally requires that every supporting episode was predicted before it was observed, and that none was confounded.',
    textSummary:
      belief === undefined
        ? 'No belief has formed yet, so there is no confidence to explain.'
        : `${belief.confidence.label.replace(/-/g, ' ')} — ${belief.confidence.why}`,
    bars:
      belief === undefined
        ? [
            {
              label: 'Nothing formed',
              value: 0,
              tone: 'unresolved',
              note: 'Not enough resolved episodes yet',
            },
          ]
        : [
            {
              label: 'Supporting',
              value: belief.supporting.length,
              tone: 'benefit',
              note: 'Episodes consistent with the belief',
            },
            {
              label: 'Contradicting',
              value: belief.contradicting.length,
              tone: 'cost',
              note: 'Episodes that went against it',
            },
          ],
  });

  return graphs;
}
