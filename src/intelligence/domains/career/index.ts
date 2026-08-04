import {
  BARRIER_LABELS,
  LADDER_LABELS,
  LADDER_RUNGS,
  rungIndex,
} from '../../../domain/career/ladder';
import { assessConfidence } from '../../support';
import type { CategorySummary, TrajectoryResult } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  barComparisonEligibility,
  lineGraphEligibility,
  meterEligibility,
  meterPercent,
  stagePathEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessCareer, assessClaim, type CareerEvidence } from './assessCareer';
import { generateCareerCandidate, type CareerCandidateResult } from './careerCandidate';

export { assessCareer, assessClaim, generateCareerCandidate };
export type { CareerEvidence, CareerCandidateResult };

/**
 * The Career slice, assembled (Prompt 8C tasks 11–13).
 *
 * ## Where this differs from Health, and why that matters
 *
 * Health earned a trend and **refused a meter** — there is no total that health is a
 * fraction of. Career earns a meter, because "claims with something behind them, out of
 * claims made" has a real denominator that the owner defined themselves. Same
 * eligibility rules, opposite answer, and the difference is a property of the evidence
 * rather than of who wrote the slice.
 *
 * It also earns a **stage path**, which health could not: the proof ladder is genuinely
 * ordinal, and its rungs are defined by evidence rather than by self-assessment.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: CareerEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded about career or learning yet';

  const unsupported = evidence.claims.filter((claim) => claim.unsupported).length;

  if (evidence.openInterruption) return 'Something was interrupted and not picked back up';
  if (evidence.nextStep === undefined) return 'No exact next step written down';
  if (unsupported > 0) {
    return `${String(unsupported)} claim${unsupported === 1 ? '' : 's'} with nothing behind ${unsupported === 1 ? 'it' : 'them'} yet`;
  }
  if (evidence.sessionsThisWeek === 0)
    return 'A next step is recorded; nothing studied this week';
  return `${String(evidence.sessionsThisWeek)} session${evidence.sessionsThisWeek === 1 ? '' : 's'} this week, with a next step recorded`;
}

function driversOf(evidence: CareerEvidence): readonly string[] {
  const drivers: string[] = [];

  if (evidence.nextStep !== undefined) {
    drivers.push(`Next step on record: "${evidence.nextStep.text}"`);
  } else {
    drivers.push('No next step recorded — the most common reason a session does not start');
  }

  if (evidence.claims.length > 0) {
    const supported = evidence.claims.filter((claim) => !claim.unsupported).length;
    drivers.push(
      `${String(supported)} of ${String(evidence.claims.length)} claims have evidence behind them`,
    );
  }

  const topBarrier = evidence.barriers[0];
  if (topBarrier !== undefined) {
    drivers.push(
      `Most frequent obstacle: ${BARRIER_LABELS[topBarrier.id] ?? topBarrier.id} (${String(topBarrier.count)}×)`,
    );
  }

  if (evidence.workWins.length > 0) {
    drivers.push(
      `${String(evidence.workWins.length)} Work Win${evidence.workWins.length === 1 ? '' : 's'} on record, usable as interview evidence`,
    );
  }

  return drivers.length > 0 ? drivers : ['Nothing recorded yet'];
}

function bottleneckOf(evidence: CareerEvidence): string | undefined {
  if (evidence.nextStep === undefined) return 'Not knowing what the next step is';
  if (evidence.openInterruption) return 'A session that was interrupted and never resumed';

  const unsupported = evidence.claims.find((claim) => claim.unsupported);
  if (unsupported !== undefined) {
    return `Proof, not knowledge — "${unsupported.claim.statement}" has nothing behind it`;
  }

  const topBarrier = evidence.barriers[0];
  if (topBarrier !== undefined && topBarrier.count >= 2) {
    return `A recurring obstacle: ${BARRIER_LABELS[topBarrier.id] ?? topBarrier.id}`;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */

/** Retrieval over eight weeks, when at least two carry a reading. */
function retrievalGraph(evidence: CareerEvidence): Graph | undefined {
  if (!lineGraphEligibility({ points: evidence.retrievalTrend, ordered: true }).eligible) {
    return undefined;
  }

  const observed = evidence.retrievalTrend.filter((point) => point.value !== null).length;
  return {
    kind: 'trend',
    id: 'career-retrieval',
    question: 'Is what I study actually staying with me?',
    metric: 'How much came back without looking, on the five-point anchored scale',
    window: 'Last eight weeks',
    evidence: 'observed',
    missingDataTreatment:
      'Weeks with no recall check are gaps. A week you did not test is not a week you failed.',
    uncertainty:
      'Self-reported immediately after trying to recall. It measures what came back that time, on that topic.',
    textSummary: `${String(observed)} of the last eight weeks include a recall check.`,
    unit: '',
    points: evidence.retrievalTrend,
  };
}

/** Which obstacles recur, when there are at least two distinct ones. */
function barrierGraph(evidence: CareerEvidence): Graph | undefined {
  const bars = evidence.barriers.map((barrier) => ({
    label: BARRIER_LABELS[barrier.id] ?? barrier.id,
    value: barrier.count,
  }));

  if (!barComparisonEligibility({ bars, discrete: true }).eligible) return undefined;

  return {
    kind: 'comparison',
    id: 'career-barriers',
    question: 'What keeps getting in the way of starting?',
    metric: 'Times each obstacle was recorded',
    window: 'All recorded sessions',
    evidence: 'observed',
    missingDataTreatment:
      'Only what was recorded appears. Sessions where nothing was noted are not counted as obstacle-free.',
    uncertainty:
      'A count of what the owner reported. It says what recurs, not why — and nothing here infers a cause.',
    textSummary: `${String(bars.length)} distinct obstacles recorded.`,
    bars: bars.map((bar) => ({
      label: bar.label,
      value: bar.value,
      tone: 'cost' as const,
      note: `${String(bar.value)} time${bar.value === 1 ? '' : 's'}`,
    })),
  };
}

/**
 * The visuals, including the one career earns that health could not.
 *
 * The meter is the interesting entry. `meterEligibility` is given a genuine
 * denominator — claims the owner made — and says yes, where for health it said no.
 * That is the eligibility rules working, not an exception being carved out.
 */
function careerVisuals(evidence: CareerEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What is the exact next step, and what is blocking it?',
      source: 'Shared canonical observations — study sessions, barriers, Work Wins, claims',
      window: 'All recorded',
      units: 'Counts and anchored labels, never a skill level',
      missingData: 'A topic with no evidence shows as having no evidence.',
      uncertainty: 'Self-reported at the time, about what happened.',
      location: 'domain-detail',
      decisionValue: 'Decides whether the next session needs a plan, a resumption, or proof.',
    },
  ];

  if (evidence.claims.length > 0) {
    const supported = evidence.claims.filter((claim) => !claim.unsupported).length;
    const eligible = meterEligibility({
      current: supported,
      target: evidence.claims.length,
      baseline: 0,
      unit: 'claims',
      // A real denominator: the claims the owner wrote down themselves.
      hasValidDenominator: true,
    });

    if (eligible.eligible) {
      specs.push({
        kind: 'meter',
        data: {
          kind: 'meter',
          current: `${String(supported)} claims with evidence`,
          target: `${String(evidence.claims.length)} claims made`,
          percent: meterPercent({
            current: supported,
            target: evidence.claims.length,
            baseline: 0,
            unit: 'claims',
            hasValidDenominator: true,
          }),
        },
        decisionQuestion: 'How much of what I would say could I show?',
        source: 'Claims the owner wrote down, and the records each one cites',
        window: 'Current claims',
        units: 'claims with at least one supporting record, out of claims made',
        missingData: 'A claim citing nothing counts as unsupported, which is its true state.',
        uncertainty:
          'Counts evidence, not adequacy. One study session supports a claim here; it may not support it in an interview.',
        location: 'domain-detail',
        decisionValue: 'Shows the gap between what you would say and what you could show.',
      });
    }
  }

  const strongest = evidence.claims.at(-1);
  if (
    strongest !== undefined &&
    stagePathEligibility({
      stages: [...LADDER_RUNGS],
      currentIndex: rungIndex(strongest.earnedRung),
      ordinal: true,
    }).eligible
  ) {
    specs.push({
      kind: 'stage-path',
      data: {
        kind: 'stage-path',
        stages: LADDER_RUNGS.map((rung) => LADDER_LABELS[rung]),
        currentIndex: rungIndex(strongest.earnedRung),
      },
      decisionQuestion: 'What would the evidence actually support me saying?',
      source: 'The records each claim cites',
      window: 'All evidence for this claim',
      units: 'Rungs, defined by the kind of evidence behind them',
      missingData: 'No evidence means the first rung, which is a position rather than a gap.',
      uncertainty:
        'The rung is what the evidence supports. It is not a judgement about how well you know it.',
      location: 'domain-detail',
      decisionValue: 'Names the specific next piece of proof rather than "study more".',
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

/**
 * The career reading, in the shared category shape.
 *
 * Deliberately **not** wired into the category overview. Health delegated its category
 * summary to its slice because the slice created that category and nothing else could
 * summarise it. career-work-learning predates this slice and its existing summary —
 * focused hours, from the trajectory — is a true and useful thing to say about it.
 *
 * So the two coexist: the category panel says how focused work is going, and the domain
 * panel says what the evidence would support you claiming. They answer different
 * questions, and collapsing them would lose one of the answers.
 */
function careerReading(
  evidence: CareerEvidence,
  trajectory: TrajectoryResult,
): CategorySummary {
  const supported = evidence.claims.filter((claim) => !claim.unsupported).length;

  return {
    category: 'career-work-learning',
    condition: conditionOf(evidence),
    trajectory: trajectory.direction,
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: evidence.nextStep?.freshness ?? 'none',
      consistent: true,
      complete: evidence.anyEvidence,
    }),
    freshness: evidence.nextStep?.freshness ?? trajectory.freshness,
    drivers: driversOf(evidence),
    metrics: [
      {
        label: 'Next step recorded',
        value: evidence.nextStep === undefined ? 'No' : 'Yes',
      },
      { label: 'Study sessions this week', value: String(evidence.sessionsThisWeek) },
      {
        label: 'Claims with evidence',
        value:
          evidence.claims.length === 0
            ? 'No claims recorded'
            : `${String(supported)} of ${String(evidence.claims.length)}`,
      },
      { label: 'Work Wins on record', value: String(evidence.workWins.length) },
    ],
    wouldChangeIt:
      'One piece of proof behind a claim that has none, or a next step written down.',
  };
}

export function careerContribution(
  evidence: CareerEvidence,
  candidate: CareerCandidateResult,
  trajectory: TrajectoryResult,
): DomainContribution {
  const summary = careerReading(evidence, trajectory);
  const graphs = [retrievalGraph(evidence), barrierGraph(evidence)].filter(
    (graph): graph is Graph => graph !== undefined,
  );

  const supported = evidence.claims.filter((claim) => !claim.unsupported).length;
  const percent =
    evidence.claims.length === 0
      ? undefined
      : meterPercent({
          current: supported,
          target: evidence.claims.length,
          baseline: 0,
          unit: 'claims',
          hasValidDenominator: true,
        });

  /*
   * Claims are listed weakest first, each with what the evidence supports and what
   * would move it up. Never with an assertion that the claim is true — the record has
   * no field for that, and this is the surface where the temptation would be greatest.
   */
  const strongestEvidence = [
    ...evidence.claims.map(
      (claim) =>
        `"${claim.claim.statement}" — evidence supports: ${claim.earnedRungLabel}${
          claim.unsupported ? ' (nothing behind it yet)' : ''
        }. Next: ${claim.nextProof}`,
    ),
    ...(percent === undefined
      ? []
      : [`${String(percent)}% of claims have at least one supporting record`]),
    ...evidence.workWins
      .slice(0, 3)
      .map((win) => `Work Win: ${win.value.kind === 'note' ? win.value.text : 'recorded'}`),
  ];

  return {
    condition: summary.condition,
    trajectory: summary.trajectory,
    confidence: summary.confidence,
    freshness: summary.freshness,
    drivers: summary.drivers,
    bottleneck: bottleneckOf(evidence),
    strongestEvidence,
    metrics: summary.metrics,
    move: candidate.candidate,
    capabilityEffects: candidate.candidate?.capabilityEffects ?? [],
    visuals: careerVisuals(evidence),
    graphs,
    northStarContribution:
      evidence.claims.length === 0
        ? 'Career progress is measured here by evidence, not by hours. Nothing is claimed yet, so there is nothing to prove yet.'
        : `The ladder runs ${LADDER_LABELS['not-started'].toLowerCase()} to ${LADDER_LABELS['used-it-for-real'].toLowerCase()}, and only evidence moves a claim up it.`,
  };
}
