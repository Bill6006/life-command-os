import { assessConfidence } from '../../support';
import type { CategorySummary } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  barComparisonEligibility,
  lineGraphEligibility,
  meterEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessHome, type HomeEvidence } from './assessHome';
import { generateHomeCandidate, type HomeCandidateResult } from './homeCandidate';

export { assessHome, generateHomeCandidate };
export type { HomeEvidence, HomeCandidateResult };
export { buildHomeScan } from './scan';
export type { HomeScan } from './scan';

/**
 * The Home slice, assembled (Prompt 8G).
 *
 * ## The comparison faith refused, earned here
 *
 * Prompt 8F declined a bar chart the eligibility rules would have allowed, because
 * ranking a person's practices puts one of them at the bottom and the bottom reads as
 * failure. This slice draws exactly that chart, and the difference is what the bars are
 * **of**.
 *
 * Here they are friction kinds — properties of a house, not of a man. A tall bar says
 * "this is where the time goes", which is the most useful sentence this domain has, and
 * nobody reads "nowhere to put things: 4" as a judgement about themselves. Same rules,
 * opposite answer, and the reason is the subject rather than the arithmetic.
 *
 * ## The meter is still refused
 *
 * Friction removed over friction recorded would divide. It would also be a readiness
 * percentage for somebody's home, which is a Life Score with a different label on it, and
 * "zero friction" is not a target any person should be held to.
 *
 * ## This category may say `declining`
 *
 * Unlike faith. A fortnight with more friction than the fortnight before is a fact about
 * a setup, and saying so is not a verdict on anyone — which is exactly why the word is
 * available here and unavailable there.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: HomeEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded about the setup yet';

  if (evidence.openChange !== undefined) return 'One change decided, and not made yet';

  const worst = evidence.repeated[0];
  if (worst !== undefined) {
    return `"${worst.label}" has got in the way ${String(worst.occasions)} times`;
  }

  if (evidence.totalFrictions === 0) {
    return 'Nothing has got in the way of what you recorded';
  }

  return evidence.totalFrictions === 1
    ? '1 thing recorded, and not a second time'
    : `${String(evidence.totalFrictions)} things recorded, none of them twice`;
}

/**
 * Trajectory over fortnights, and only when both fortnights were observed.
 *
 * A quiet fortnight because he stopped recording is not an improvement, and calling it
 * one would reward closing the app. Both halves need evidence before this says anything.
 */
function trajectoryOf(evidence: HomeEvidence): CategorySummary['trajectory'] {
  const weeks = evidence.weeklyCounts;
  const observed = (from: number, to: number): boolean =>
    weeks.slice(from, to).some((week) => week.value !== null);

  if (!observed(4, 6) || !observed(2, 4)) return 'insufficient-evidence';
  if (evidence.recentCount < evidence.priorCount) return 'improving';
  if (evidence.recentCount > evidence.priorCount) return 'declining';
  return 'stable';
}

function driversOf(evidence: HomeEvidence): readonly string[] {
  if (!evidence.anyEvidence) return ['Nothing recorded yet'];

  const drivers: string[] = [];

  for (const reading of evidence.repeated.slice(0, 2)) {
    drivers.push(
      `"${reading.label}" — ${String(reading.occasions)} times${
        reading.purposes.length === 0 ? '' : `, mostly around ${reading.purposes.join(' and ')}`
      }`,
    );
  }

  if (evidence.repeated.length === 0 && evidence.totalFrictions > 0) {
    drivers.push('Nothing has been recorded twice, so nothing is suggested');
  }
  if (evidence.totalFrictions === 0) {
    drivers.push('Nothing recorded as getting in the way');
  }

  if (evidence.setupTime === 'Long enough that I did something else') {
    drivers.push('Getting set up took long enough that something else happened instead');
  }
  if (evidence.transition === 'A lot') {
    drivers.push('Switching the space over means moving a lot first');
  }
  if (evidence.changeMade && evidence.frictionSince !== undefined) {
    drivers.push(
      evidence.frictionSince === 'No'
        ? 'Since the change, the same thing has not come back'
        : `Since the change: ${evidence.frictionSince.toLowerCase()}`,
    );
  }

  return drivers.length > 0 ? drivers : ['Nothing recorded twice yet'];
}

function bottleneckOf(evidence: HomeEvidence): string | undefined {
  if (evidence.openChange !== undefined) return 'A change you decided on and have not made';
  const worst = evidence.repeated[0];
  return worst === undefined ? undefined : `"${worst.label}", repeatedly`;
}

/* -------------------------------------------------------------------------- */

function homeGraphs(evidence: HomeEvidence): readonly Graph[] {
  const graphs: Graph[] = [];

  const comparison = barComparisonEligibility({
    bars: evidence.frictions.map((reading) => ({
      label: reading.label,
      value: reading.occasions,
    })),
    discrete: true,
  });

  if (comparison.eligible) {
    graphs.push({
      kind: 'comparison',
      id: 'home-friction-by-kind',
      question: 'What keeps getting in the way?',
      metric: 'Times recorded',
      window: 'All recorded',
      evidence: 'observed',
      missingDataTreatment:
        'Only things you recorded appear. A kind with no bar has nothing recorded against it, which is not the same as it never happening.',
      uncertainty: 'Counts of what you noticed and entered, which is fewer than what happened.',
      textSummary: evidence.frictions
        .map((reading) => `${reading.label}: ${String(reading.occasions)}`)
        .join(' · '),
      bars: evidence.frictions.map((reading) => ({
        label: reading.label,
        value: reading.occasions,
        tone: 'cost',
        note:
          reading.purposes.length === 0
            ? 'Recorded without saying what you were doing'
            : `Around ${reading.purposes.join(' and ')}`,
      })),
    });
  }

  const series = lineGraphEligibility({ points: evidence.weeklyCounts, ordered: true });
  if (series.eligible) {
    graphs.push({
      kind: 'trend',
      id: 'home-friction-by-week',
      question: 'Is the same thing still costing me time?',
      metric: 'Things recorded as in the way',
      window: 'Last six weeks',
      evidence: 'observed',
      missingDataTreatment:
        'A week you recorded nothing at all is a gap, not a zero. A week you recorded something and nothing got in the way is a real zero.',
      uncertainty: 'Six weeks is enough to see a change hold, and not enough to call a season.',
      textSummary: evidence.weeklyCounts
        .map(
          (week) =>
            `${week.label}: ${week.value === null ? 'no evidence' : String(week.value)}`,
        )
        .join(' · '),
      unit: 'things',
      points: evidence.weeklyCounts,
    });
  }

  return graphs;
}

function homeVisuals(evidence: HomeEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What friction is repeatedly in the way?',
      source: 'What you recorded as getting in the way, and what you did about it',
      window: 'All recorded',
      units: 'Counts of occasions, never a rate and never a state of any room',
      missingData:
        'Nothing recorded means nothing recorded. It is not read as everything being fine.',
      uncertainty:
        'Only what you noticed and entered. This has no way of knowing what a room is like and does not try.',
      location: 'domain-detail',
      decisionValue:
        'Separates the thing that happened once from the thing that keeps happening, which is the only distinction that should change anything.',
    },
  ];

  const comparison = barComparisonEligibility({
    bars: evidence.frictions.map((reading) => ({
      label: reading.label,
      value: reading.occasions,
    })),
    discrete: true,
  });

  if (comparison.eligible) {
    specs.push({
      kind: 'bar-comparison',
      decisionQuestion: 'What keeps getting in the way?',
      source: 'Occasions you recorded, grouped by what got in the way',
      window: 'All recorded',
      units: 'Times recorded',
      missingData: 'A kind with no bar has nothing recorded against it.',
      uncertainty: 'Counts of what you entered, which is fewer than what happened.',
      location: 'domain-detail',
      decisionValue:
        'The tall bar is where the time goes, and it is a fact about the setup rather than about you — which is why this chart is drawn here and refused in faith and meaning.',
    });
  }

  const series = lineGraphEligibility({ points: evidence.weeklyCounts, ordered: true });
  if (series.eligible) {
    specs.push({
      kind: 'line-graph',
      decisionQuestion: 'Is the same thing still costing me time?',
      source: 'Occasions per week',
      window: 'Last six weeks',
      units: 'Things recorded as in the way',
      missingData: 'A week with nothing recorded at all is drawn as a gap, never as zero.',
      uncertainty: 'A change needs a few weeks after it to show anything.',
      location: 'domain-detail',
      decisionValue:
        'Shows whether a change held, which is the only measure of success this area has.',
    });
  }

  /*
   * The thin refusals.
   *
   * Recorded only once something is on record: a panel opened on the first day would
   * otherwise be four boxes explaining what it cannot draw yet, which teaches the owner
   * that the panel is mostly apologies. Once there is evidence, saying why a chart is
   * absent is more useful than an unexplained gap.
   */
  if (evidence.anyEvidence && !comparison.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'What keeps getting in the way?',
      source: 'Not drawn yet',
      window: 'All recorded',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No chart yet: ${comparison.because.toLowerCase()}. One kind of friction is a list of one, and a bar chart of it would be decoration.`,
    });
  }

  if (evidence.anyEvidence && !series.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'Is the same thing still costing me time?',
      source: 'Not drawn yet',
      window: 'Last six weeks',
      units: 'none',
      missingData: 'Weeks with nothing recorded are gaps, and gaps cannot be joined up.',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No trend yet: ${series.because.toLowerCase()}.`,
    });
  }

  /* The refusal that would still stand with a hundred weeks of evidence. */
  const meter = meterEligibility({
    current: evidence.totalFrictions - evidence.recentCount,
    target: evidence.totalFrictions,
    baseline: 0,
    unit: 'occasions',
    hasValidDenominator: false,
  });

  if (!meter.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How sorted is my house?',
      source: 'Not answerable, and not asked',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No percentage is shown here: ${meter.because.toLowerCase()}. Friction removed over friction recorded would divide cleanly, and the result would be a readiness score for somebody's home — with zero as the implied target, which is not a target anyone should be held to.`,
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

export function summariseHomeCategory(evidence: HomeEvidence): CategorySummary {
  return {
    category: 'home-and-environment',
    condition: conditionOf(evidence),
    trajectory: trajectoryOf(evidence),
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: evidence.observationCount > 0 ? 'fresh' : 'none',
      consistent: true,
      complete: evidence.repeated.length > 0 || evidence.totalFrictions === 0,
    }),
    freshness: evidence.observationCount > 0 ? 'fresh' : 'none',
    drivers: driversOf(evidence),
    metrics: [
      { label: 'Recorded as in the way', value: String(evidence.totalFrictions) },
      { label: 'Happening more than once', value: String(evidence.repeated.length) },
      {
        label: 'The one change',
        value:
          evidence.changeStatement === undefined
            ? 'None named'
            : evidence.changeMade
              ? 'Made'
              : 'Open',
      },
    ],
    wouldChangeIt: 'The same thing getting in the way once more, or a change that holds.',
  };
}

export function homeContribution(
  evidence: HomeEvidence,
  candidate: HomeCandidateResult,
): DomainContribution {
  const summary = summariseHomeCategory(evidence);

  const strongestEvidence: string[] = [
    ...evidence.frictions
      .slice(0, 4)
      .map(
        (reading) =>
          `"${reading.label}" — ${String(reading.occasions)} time${reading.occasions === 1 ? '' : 's'} recorded`,
      ),
    ...(evidence.changeStatement === undefined
      ? []
      : [
          `You decided: "${evidence.changeStatement}" — ${evidence.changeMade ? 'made' : 'not made yet'}`,
        ]),
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
    visuals: homeVisuals(evidence),
    graphs: homeGraphs(evidence),
    northStarContribution:
      'Friction removed once stays removed. This area exists so the same ten minutes are not lost over and over to the same thing — it has no interest in how any room looks.',
  };
}
