import { assessConfidence } from '../../support';
import type { CategorySummary } from '../../types';
import {
  barComparisonEligibility,
  meterEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessFaith, type FaithEvidence } from './assessFaith';
import { generateFaithCandidate, type FaithCandidateResult } from './faithCandidate';

export { assessFaith, generateFaithCandidate };
export type { FaithEvidence, FaithCandidateResult };
export { buildFaithScan } from './scan';
export type { FaithScan } from './scan';

/**
 * The Faith slice, assembled (Prompt 8F).
 *
 * ## The fifth answer to the meter question, and the first double refusal
 *
 * Health refused a meter for want of a denominator. Career earned one. Fatherhood and
 * emotional refused ones that would have computed. This domain refuses **two** visuals,
 * for two different reasons, and it is the only one that does.
 *
 * The meter is obvious: practices done over practices intended divides cleanly, and the
 * result would be a number telling someone how they are doing at their faith.
 *
 * The bar comparison is the interesting one. Counting occasions per practice is
 * legitimate arithmetic and would be allowed anywhere else in this product — career has
 * exactly that chart. Here it would rank a person's practices against each other, and
 * the bottom bar would read as the one he is failing at. So it is refused too, with its
 * own reason recorded.
 *
 * What is left is an evidence summary: his words, and what he recorded, side by side,
 * with no verdict between them.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: FaithEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing written down here yet';

  if (evidence.openRepair !== undefined && !evidence.repairDone) {
    return 'Something you decided to put right is still open';
  }

  const named = evidence.values.length;
  if (evidence.activePractices === 0) {
    return named === 0
      ? 'Nothing named yet'
      : `${String(named)} thing${named === 1 ? '' : 's'} named, and nothing chosen to do about ${named === 1 ? 'it' : 'them'} yet`;
  }

  return `${String(evidence.activePractices)} practice${evidence.activePractices === 1 ? '' : 's'} on record, in your words`;
}

/**
 * Drivers: his words and his counts, with nothing inferred between them.
 *
 * Deliberately no sentence of the form "you are doing well at X" or "X has slipped". The
 * closest this comes to a judgement is naming which practices have nothing recorded
 * lately, which is a fact about the records rather than about him.
 */
function driversOf(evidence: FaithEvidence): readonly string[] {
  const drivers: string[] = [];

  if (evidence.purpose !== undefined) {
    drivers.push(`You wrote: "${evidence.purpose.statement}"`);
  }
  for (const value of evidence.values.slice(0, 2)) {
    drivers.push(`What matters: "${value.statement}"`);
  }

  if (evidence.quietPractices.length > 0) {
    drivers.push(
      `${String(evidence.quietPractices.length)} of ${String(evidence.activePractices)} practices have nothing recorded lately`,
    );
  }
  if (evidence.serviceCount > 0) {
    drivers.push(
      `${String(evidence.serviceCount)} thing${evidence.serviceCount === 1 ? '' : 's'} recorded as done for someone else`,
    );
  }

  return drivers.length > 0 ? drivers : ['Nothing written down yet'];
}

function bottleneckOf(evidence: FaithEvidence): string | undefined {
  if (evidence.openRepair !== undefined && !evidence.repairDone) {
    return 'A repair you named and have not done';
  }
  if (evidence.values.length === 0 && evidence.practices.length === 0) {
    return 'Nothing named, so there is nothing to act in line with';
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */

function faithVisuals(evidence: FaithEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'Where am I acting in line with what I say matters?',
      source: 'Your own words, and the occasions you recorded against them',
      window: 'All recorded',
      units: 'Counts of occasions, never a rate and never a level',
      missingData:
        'A practice with nothing recorded shows as having nothing recorded. It is not read as having been skipped.',
      uncertainty:
        'It shows what you wrote down. It has no view on what any of it is worth, and cannot have one.',
      location: 'domain-detail',
      decisionValue:
        'Puts what you said matters next to what you actually recorded, and leaves the conclusion to you.',
    },
  ];

  /* The obvious refusal: an adherence percentage. */
  const meter = meterEligibility({
    current: evidence.activePractices - evidence.quietPractices.length,
    target: evidence.activePractices,
    baseline: 0,
    unit: 'practices',
    hasValidDenominator: false,
  });

  if (!meter.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How am I doing at this?',
      source: 'Not answerable, and not asked',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No percentage is shown here: ${meter.because.toLowerCase()}. Practices kept over practices chosen would divide neatly, and the result would be a number telling you how you are doing at your faith.`,
    });
  }

  /*
   * The less obvious refusal, and the reason it is written down.
   *
   * Counting occasions per practice is ordinary arithmetic — the career slice draws
   * exactly this chart. Here it would rank a person's practices against each other, and
   * whichever ended up at the bottom would read as the one he is failing at. The
   * eligibility rules would allow it; the domain declines.
   */
  const comparison = barComparisonEligibility({
    bars: evidence.practices.map((practice) => ({
      label: practice.statement,
      value: practice.occasions,
    })),
    discrete: true,
  });

  if (comparison.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'Which of these am I best at?',
      source: 'Refused, though the evidence would support it',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue:
        'No chart ranks your practices against each other. The counts are real and the comparison would be valid arithmetic — and the one at the bottom would read as the one you are failing at, which is not something this shows you.',
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

export function summariseFaithCategory(evidence: FaithEvidence): CategorySummary {
  return {
    category: 'faith-and-meaning',
    condition: conditionOf(evidence),
    /*
     * Never `declining`.
     *
     * A trajectory word on this domain would be the app telling someone their faith is
     * going badly. It reports `stable` once anything is recorded and
     * `insufficient-evidence` before that — the two statements it can make honestly.
     */
    trajectory: evidence.anyEvidence ? 'stable' : 'insufficient-evidence',
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: 'fresh',
      consistent: true,
      complete: evidence.anyEvidence,
    }),
    freshness: evidence.observationCount > 0 ? 'fresh' : 'none',
    drivers: driversOf(evidence),
    metrics: [
      {
        label: 'Things you have named',
        value: String(evidence.values.length + evidence.practices.length),
      },
      {
        label: 'Occasions recorded',
        value: String(evidence.practices.reduce((sum, entry) => sum + entry.occasions, 0)),
      },
      {
        label: 'Something to put right',
        value:
          evidence.openRepair === undefined
            ? 'None named'
            : evidence.repairDone
              ? 'Done'
              : 'Open',
      },
    ],
    wouldChangeIt: 'Anything you write down, or any occasion you record against it.',
  };
}

/**
 * The global trajectory is deliberately not a parameter here.
 *
 * Every other domain takes it and blends it in. This one reads its own summary instead,
 * because the global trajectory can be `declining` and this category must never say that
 * about someone's faith — a quiet month is a quiet month.
 */
export function faithContribution(
  evidence: FaithEvidence,
  candidate: FaithCandidateResult,
): DomainContribution {
  const summary = summariseFaithCategory(evidence);

  /* His words and his counts. No sentence here evaluates any of it. */
  const strongestEvidence: string[] = [
    ...evidence.practices
      .filter((practice) => practice.state === 'active')
      .slice(0, 4)
      .map(
        (practice) =>
          `"${practice.statement}" — ${String(practice.occasions)} occasion${practice.occasions === 1 ? '' : 's'} recorded${practice.serves === undefined ? '' : `, for "${practice.serves}"`}`,
      ),
    ...(evidence.struggleCount === 0
      ? []
      : [
          `${String(evidence.struggleCount)} note${evidence.struggleCount === 1 ? '' : 's'} you wrote about how this is going — kept here, read by nothing`,
        ]),
  ];

  return {
    condition: summary.condition,
    /* The domain's own trajectory, not the global one: never `declining`. */
    trajectory: summary.trajectory,
    confidence: summary.confidence,
    freshness: summary.freshness,
    drivers: summary.drivers,
    bottleneck: bottleneckOf(evidence),
    strongestEvidence,
    metrics: summary.metrics,
    move: candidate.candidate,
    capabilityEffects: candidate.candidate?.capabilityEffects ?? [],
    visuals: faithVisuals(evidence),
    graphs: [],
    northStarContribution:
      'This area holds what you said matters, in your words. It has no view on any of it, and never will.',
  };
}
