import { SCALES } from '../../../domain/records';
import { assessConfidence } from '../../support';
import type { CategorySummary, TrajectoryResult } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  lineGraphEligibility,
  meterEligibility,
  barComparisonEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessEmotional, type EmotionalEvidence } from './assessEmotional';
import {
  generateEmotionalCandidate,
  type EmotionalCandidateResult,
} from './emotionalCandidate';

export { assessEmotional, generateEmotionalCandidate };
export type { EmotionalEvidence, EmotionalCandidateResult };
export { buildEmotionalScan } from './scan';
export type { EmotionalScan } from './scan';

/**
 * The Emotional slice, assembled (Prompt 8E).
 *
 * ## The fourth answer to the meter question
 *
 * Health refused a meter for want of a denominator. Career earned one. Fatherhood
 * refused one that would have computed. This domain refuses for the reason closest to
 * the surface: "connection 62%" would be a number describing whether someone's
 * relationships are going well, which is not a quantity, and putting it on a screen
 * would be the single most damaging thing this product could do to a lonely week.
 *
 * What it earns instead is a loneliness trend — genuinely ordinal, self-reported, with
 * gaps drawn as gaps — and a bar comparison of what was actually practised.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: EmotionalEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded here yet';

  if (evidence.persistentInterference) {
    return 'Something has been getting in the way for weeks';
  }
  if (evidence.conflictOpen && !evidence.repairMade) {
    return 'Something is unresolved with someone';
  }
  if (evidence.interference === 'a-lot') return 'Something is getting in the way today';
  if (evidence.connectionDays === 0) return 'No contact recorded in the last fortnight';

  return `Contact recorded on ${String(evidence.connectionDays)} day${evidence.connectionDays === 1 ? '' : 's'} in the last fortnight`;
}

function driversOf(evidence: EmotionalEvidence): readonly string[] {
  const drivers: string[] = [];

  if (evidence.interference !== undefined) {
    drivers.push(
      evidence.interference === 'none'
        ? 'Nothing recorded as getting in the way'
        : `Something on your mind is getting in the way ${evidence.interference === 'a-lot' ? 'a lot' : 'a bit'}`,
    );
  }

  if (evidence.loneliness !== undefined) {
    drivers.push(
      `Connection right now: ${SCALES.loneliness.anchors[evidence.loneliness - 1]?.label ?? 'recorded'}`,
    );
  }

  const topPractice = evidence.practices[0];
  if (topPractice !== undefined) {
    drivers.push(
      `Most practised: ${topPractice.label.toLowerCase()} (${String(topPractice.count)}×)`,
    );
  }

  if (evidence.boundaryAttempts > 0) {
    drivers.push(
      `${String(evidence.boundaryHeldCount)} of ${String(evidence.boundaryAttempts)} boundaries held when it came up`,
    );
  }

  return drivers.length > 0 ? drivers : ['Nothing recorded yet'];
}

function bottleneckOf(evidence: EmotionalEvidence): string | undefined {
  if (evidence.persistentInterference) {
    return 'Something in the way for weeks, which is beyond what this app should interpret';
  }
  if (evidence.conflictOpen && !evidence.repairMade) return 'An unresolved conversation';
  if (evidence.rejectionStopped) return 'Something was stopped after it did not go your way';
  if (evidence.connectionFreshness === 'stale' || evidence.connectionFreshness === 'none') {
    return 'No recent contact recorded';
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */

/** Loneliness over eight weeks. Gaps are gaps. */
function lonelinessGraph(evidence: EmotionalEvidence): Graph | undefined {
  if (!lineGraphEligibility({ points: evidence.lonelinessTrend, ordered: true }).eligible) {
    return undefined;
  }

  const recorded = evidence.lonelinessTrend.filter((point) => point.value !== null).length;
  return {
    kind: 'trend',
    id: 'emotional-loneliness',
    question: 'Is this a hard week, or a hard season?',
    metric: 'Connection right now, on the five-point anchored scale, averaged per week',
    window: 'Last eight weeks',
    evidence: 'observed',
    missingDataTreatment:
      'A week with no reading is a gap. It is never read as a good week or a bad one.',
    uncertainty:
      'Self-reported in a moment. It says how connected you felt when asked, not how much company you had.',
    textSummary: `${String(recorded)} of the last eight weeks include a reading.`,
    unit: '',
    points: evidence.lonelinessTrend,
  };
}

/** What was actually practised. Counts of events, never a rate of success. */
function practiceGraph(evidence: EmotionalEvidence): Graph | undefined {
  const bars = evidence.practices.map((practice) => ({
    label: practice.label,
    value: practice.count,
  }));
  if (!barComparisonEligibility({ bars, discrete: true }).eligible) return undefined;

  return {
    kind: 'comparison',
    id: 'emotional-practice',
    question: 'What have I actually been doing?',
    metric: 'Times each thing was recorded as attempted',
    window: 'All recorded',
    evidence: 'observed',
    missingDataTreatment:
      'Only what was recorded appears. Anything not written down is absent, not zero.',
    uncertainty:
      'It counts attempts, not how they went. How another person responded is not recorded anywhere.',
    textSummary: `${String(bars.length)} kinds of thing attempted.`,
    bars: bars.map((bar) => ({
      label: bar.label,
      value: bar.value,
      tone: 'benefit' as const,
      note: `${String(bar.value)} time${bar.value === 1 ? '' : 's'}`,
    })),
  };
}

function emotionalVisuals(evidence: EmotionalEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What is interfering, and what connection is available?',
      source: 'Shared canonical observations — contact, practice, boundaries, conflict',
      window: 'All recorded',
      units: 'Counts of things that happened and anchored labels, never a rating of anyone',
      missingData: 'Nothing recorded shows as nothing recorded.',
      uncertainty:
        'Self-reported at the time, about what happened. Nothing here is about what another person meant.',
      location: 'domain-detail',
      decisionValue: 'Decides whether the next small thing is a pause, a message, or a repair.',
    },
  ];

  /*
   * The refusal.
   *
   * Passed an explicitly invalid construct, because the temptation here is real: contact
   * days over a fortnight would divide cleanly. "Connection 62%" would be a number about
   * whether someone's relationships are going well, and a bad week would render as a
   * failing grade at the exact moment it would do the most harm.
   */
  const meter = meterEligibility({
    current: evidence.connectionDays,
    target: 14,
    baseline: 0,
    unit: 'days',
    hasValidDenominator: false,
  });

  if (!meter.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How are my relationships doing?',
      source: 'Not answerable, and not asked',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No percentage is shown here: ${meter.because.toLowerCase()}. Contact days would divide neatly and the result would be a grade for a quiet fortnight, which this product does not produce.`,
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

export function summariseEmotionalCategory(evidence: EmotionalEvidence): CategorySummary {
  return {
    category: 'emotional-and-relationships',
    condition: conditionOf(evidence),
    trajectory: evidence.anyEvidence ? 'stable' : 'insufficient-evidence',
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: evidence.connectionFreshness,
      consistent: true,
      complete: evidence.anyEvidence,
    }),
    freshness: evidence.connectionFreshness,
    drivers: driversOf(evidence),
    metrics: [
      {
        label: 'Days with contact, last fortnight',
        value: evidence.anyEvidence ? String(evidence.connectionDays) : 'Nothing recorded',
      },
      {
        label: 'Something in the way',
        value:
          evidence.interference === undefined
            ? 'Not asked'
            : evidence.interference === 'none'
              ? 'No'
              : evidence.interference === 'some'
                ? 'A bit'
                : 'A lot',
      },
      {
        label: 'Unresolved with someone',
        value: evidence.conflictOpen ? (evidence.repairMade ? 'Repair made' : 'Yes') : 'No',
      },
    ],
    wouldChangeIt: 'Any contact recorded, or an unresolved conversation being picked back up.',
  };
}

export function emotionalContribution(
  evidence: EmotionalEvidence,
  candidate: EmotionalCandidateResult,
  trajectory: TrajectoryResult,
): DomainContribution {
  const summary = summariseEmotionalCategory(evidence);
  const graphs = [lonelinessGraph(evidence), practiceGraph(evidence)].filter(
    (graph): graph is Graph => graph !== undefined,
  );

  const strongestEvidence: string[] = [
    ...evidence.practices
      .slice(0, 3)
      .map(
        (practice) =>
          `${practice.label}: ${String(practice.count)} time${practice.count === 1 ? '' : 's'}`,
      ),
    ...(evidence.openBoundary === undefined ? [] : [`Decided: "${evidence.openBoundary}"`]),
  ];

  return {
    condition: summary.condition,
    trajectory: trajectory.direction,
    confidence: summary.confidence,
    freshness: summary.freshness,
    drivers: summary.drivers,
    bottleneck: bottleneckOf(evidence),
    strongestEvidence,
    metrics: summary.metrics,
    move: candidate.candidate,
    capabilityEffects: candidate.candidate?.capabilityEffects ?? [],
    visuals: emotionalVisuals(evidence),
    graphs,
    northStarContribution:
      'This area records what you did and what is in the way. It holds nothing about any other person, and never rates a relationship.',
  };
}
