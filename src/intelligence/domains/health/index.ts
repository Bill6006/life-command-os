import {
  scaleAttribute,
  type CanonicalRecord,
  type ObservationRecord,
} from '../../../domain/records';
import { assessConfidence } from '../../support';
import type { CategorySummary, StateAssessment } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  lineGraphEligibility,
  barComparisonEligibility,
  meterEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessHealth, labelFor, type HealthEvidence } from './assessHealth';
import { generateHealthCandidate, type HealthCandidateResult } from './healthCandidate';

export { assessHealth, generateHealthCandidate };
export type { HealthEvidence, HealthCandidateResult };

/**
 * The Health slice, assembled (Prompt 8B tasks 10–11).
 *
 * Everything the domain shows comes through the shared panel contract built in Prompt
 * 8A. There is no health-shaped panel, no health-only layout, and no health metric that
 * other domains could not also express.
 *
 * ## Visuals, and the one that is refused
 *
 * Recovery over time earns a line graph. Energy by part of day earns a bar comparison.
 * A **meter is refused**, and the refusal is computed rather than assumed: health has
 * no valid target and no denominator, so `meterEligibility` says no and the panel shows
 * an evidence summary instead. That refusal is the point of the eligibility rules —
 * "Health 72%" is the exact thing they exist to prevent.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */

const PAIN_WORDS: Record<string, string> = {
  'not-at-all': 'nothing physical is in the way',
  slightly: 'something is slightly in the way',
  noticeably: 'something is noticeably in the way',
  'a-lot': 'something is significantly in the way',
  'cannot-work-around-it': 'something cannot be worked around',
};

/**
 * The condition, in plain non-moral language.
 *
 * "Running on poor recovery" describes a situation. "Poor self-care" would grade a
 * person, and this is the domain where that distinction matters most.
 */
function conditionOf(evidence: HealthEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded about health yet';

  const pain = evidence.painInterference?.value;
  if (pain === 'a-lot' || pain === 'cannot-work-around-it') {
    return `Constrained — ${PAIN_WORDS[pain] ?? 'something is in the way'}`;
  }

  const recovery = evidence.recovery?.value;
  const physical = evidence.physicalEnergy?.value;
  const mental = evidence.mentalEnergy?.value;

  if (physical !== undefined && mental !== undefined && Math.abs(physical - mental) >= 2) {
    return physical > mental
      ? 'Body has more in it than head does'
      : 'Head is clearer than the body is';
  }

  if (recovery !== undefined && recovery <= 2) return 'Running on poor recovery';
  if (recovery !== undefined && recovery >= 4) return 'Well recovered';

  const energy = physical ?? mental ?? evidence.generalEnergy?.value;
  if (energy === undefined) return 'Some evidence, but nothing current enough to describe';
  return energy <= 2 ? 'Low on energy' : energy >= 4 ? 'Good energy' : 'Functional';
}

function driversOf(evidence: HealthEvidence): readonly string[] {
  const drivers: string[] = [];

  if (evidence.physicalEnergy !== undefined && evidence.mentalEnergy !== undefined) {
    drivers.push(
      `Physical ${labelFor('physical-energy', evidence.physicalEnergy.value)}, mental ${labelFor(
        'mental-energy',
        evidence.mentalEnergy.value,
      )} — asked separately because they differ`,
    );
  } else if (evidence.generalEnergy !== undefined) {
    drivers.push(
      `Energy ${labelFor('energy', evidence.generalEnergy.value)} — the split was not asked`,
    );
  }

  if (evidence.recovery !== undefined) {
    drivers.push(
      `Last night's recovery: ${labelFor('sleep-recovery', evidence.recovery.value)}`,
    );
  }
  if (evidence.painInterference !== undefined) {
    drivers.push(
      `Interference: ${PAIN_WORDS[evidence.painInterference.value] ?? 'unknown'}${
        evidence.persistence === undefined
          ? ''
          : ` (${evidence.persistence.value.replace(/-/g, ' ')})`
      }`,
    );
  }
  if (evidence.movement !== undefined)
    drivers.push(`Movement today: ${evidence.movement.value}`);
  if (evidence.digestiveResponse?.value === 'Yes') {
    drivers.push('Reflux or stomach discomfort reported after eating');
  }

  return drivers.length > 0 ? drivers : ['Nothing recorded recently enough to drive anything'];
}

/**
 * What is most in the way.
 *
 * Returns `undefined` rather than inventing one. "Nothing identifiable is in the way"
 * is a different and more honest claim than a bottleneck chosen to fill the field.
 */
function bottleneckOf(evidence: HealthEvidence): string | undefined {
  const pain = evidence.painInterference?.value;
  if (pain === 'a-lot' || pain === 'cannot-work-around-it') {
    return 'Something physical is significantly in the way';
  }
  if (evidence.recovery !== undefined && evidence.recovery.value <= 2) {
    return 'Recovery — everything else is being run on a poor night';
  }
  if (evidence.hydration?.value === 'Barely anything') {
    return 'Almost nothing to drink today, which is the cheapest thing to rule out';
  }
  const physical = evidence.physicalEnergy?.value;
  const mental = evidence.mentalEnergy?.value;
  if (physical !== undefined && mental !== undefined && physical - mental >= 2) {
    return 'Mental energy, not physical — concentration rather than capability';
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */

/**
 * Recovery over the last two weeks, or nothing.
 *
 * Days with no record are gaps. A recovery chart that plotted the unrecorded nights at
 * zero would say the owner slept terribly on every night they forgot to write down.
 */
function recoveryGraph(records: readonly CanonicalRecord[], now: Date): Graph | undefined {
  const observations = records.filter(
    (record): record is ObservationRecord =>
      record.recordType === 'observation' &&
      record.attribute === scaleAttribute('sleep-recovery') &&
      record.value.kind === 'anchored-scale',
  );

  const points = Array.from({ length: 14 }, (_, index) => {
    const dayStart = new Date(now.getTime() - (13 - index) * DAY_MS);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + DAY_MS;

    const onDay = observations.filter((record) => {
      const at = Date.parse(record.occurredAt);
      return at >= dayStart.getTime() && at < dayEnd;
    });

    const value =
      onDay.length === 0
        ? null
        : onDay.reduce(
            (sum, record) =>
              sum + (record.value.kind === 'anchored-scale' ? record.value.ordinal : 0),
            0,
          ) / onDay.length;

    return { label: dayStart.toISOString().slice(5, 10), value };
  });

  if (!lineGraphEligibility({ points, ordered: true }).eligible) return undefined;

  const observed = points.filter((point) => point.value !== null).length;
  return {
    kind: 'trend',
    id: 'health-recovery',
    question: 'Is recovery holding up, or slipping?',
    metric: 'Reported recovery, on the five-point anchored scale',
    window: 'Last fourteen days',
    evidence: 'observed',
    missingDataTreatment:
      'Nights with nothing recorded are gaps. They are never plotted as a bad night.',
    uncertainty:
      'One self-reported reading per night. It describes how the night felt, not how much sleep happened.',
    textSummary: `${String(observed)} of the last fourteen nights carry a recorded reading.`,
    unit: '',
    points,
  };
}

/**
 * Energy by part of day (task 7).
 *
 * A bar comparison, because the parts of a day are genuinely discrete rather than
 * points on a continuum — which is what `barComparisonEligibility` checks.
 */
function timeOfDayGraph(evidence: HealthEvidence): Graph | undefined {
  const withEvidence = evidence.timeOfDay.filter((bucket) => bucket.value !== null);
  if (
    !barComparisonEligibility({
      bars: withEvidence.map((bucket) => ({ label: bucket.label, value: bucket.value ?? 0 })),
      discrete: true,
    }).eligible
  ) {
    return undefined;
  }

  return {
    kind: 'comparison',
    id: 'health-time-of-day',
    question: 'When in the day is there most to work with?',
    metric: 'Mean reported energy, on the five-point anchored scale',
    window: 'All recorded readings',
    evidence: 'observed',
    missingDataTreatment:
      'Parts of the day with no readings are absent from the chart rather than shown as low.',
    uncertainty:
      'A mean over few readings moves a lot. Read it as a hint about when to look, not a fact about the day.',
    textSummary: `${String(withEvidence.length)} of four parts of the day carry readings.`,
    bars: withEvidence.map((bucket) => ({
      label: bucket.label,
      value: bucket.value ?? 0,
      tone: 'neutral' as const,
      note: `${String(bucket.count)} reading${bucket.count === 1 ? '' : 's'}`,
    })),
  };
}

/**
 * The declarations for the representations this domain uses, including the refusal.
 *
 * The meter entry is the interesting one: it records that a meter was *considered and
 * rejected*, with the reason, so the absence of a percentage is a decision on the
 * record rather than something nobody got round to.
 */
function healthVisuals(evidence: HealthEvidence): readonly VisualSpec[] {
  const meter = meterEligibility({
    current: evidence.recovery?.value,
    target: undefined,
    baseline: undefined,
    unit: '',
    // Health has no total to be a fraction of. This is a fact about the construct.
    hasValidDenominator: false,
  });

  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What is my capacity today, and what protects it?',
      source: 'Shared canonical observations — sleep, energy, pain, food, movement',
      window: 'Most recent reading of each',
      units: 'Anchored labels and plain answers, never a score',
      missingData: 'Anything unreported is shown as unreported, never as fine.',
      uncertainty: 'All self-reported, at one moment each.',
      location: 'domain-detail',
      decisionValue:
        'Decides whether today is for pushing, protecting, or asking someone qualified.',
    },
  ];

  if (!meter.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How complete is my health?',
      source: 'Not answerable',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No meter is shown here: ${meter.because.toLowerCase()}. A percentage would be invented precision.`,
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

/**
 * The health category summary, for the shared category overview.
 *
 * Same shape as every other category. Health does not get a richer summary object than
 * career does — the panel is where the domain's own reading lives.
 */
export function summariseHealthCategory(
  evidence: HealthEvidence,
  state: StateAssessment,
): CategorySummary {
  const recovery = evidence.recovery;
  return {
    category: 'health-recovery-energy',
    condition: conditionOf(evidence),
    trajectory: !evidence.anyEvidence ? 'insufficient-evidence' : 'stable',
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: recovery?.freshness ?? 'none',
      consistent: evidence.contradictions.length === 0,
      complete: evidence.anyEvidence,
    }),
    freshness: recovery?.freshness ?? state.readings[0]?.freshness ?? 'none',
    drivers: driversOf(evidence),
    metrics: [
      {
        label: 'Recovery last night',
        value: recovery === undefined ? 'Unknown' : labelFor('sleep-recovery', recovery.value),
      },
      {
        label: 'Physical energy',
        value:
          evidence.physicalEnergy === undefined
            ? 'Not asked'
            : labelFor('physical-energy', evidence.physicalEnergy.value),
      },
      {
        label: 'Mental energy',
        value:
          evidence.mentalEnergy === undefined
            ? 'Not asked'
            : labelFor('mental-energy', evidence.mentalEnergy.value),
      },
      {
        label: 'Health readings on record',
        value: String(evidence.observationCount),
      },
    ],
    wouldChangeIt:
      'A second poor night, or something physical starting to get in the way, would change this.',
  };
}

/**
 * Everything the Health domain contributes to its panel.
 *
 * Note what is passed in rather than fetched: the candidate result and the evidence.
 * The contribution builder decides nothing — it describes what was already decided,
 * which keeps the reason on screen identical to the reason in the engine.
 */
export function healthContribution(
  records: readonly CanonicalRecord[],
  evidence: HealthEvidence,
  candidate: HealthCandidateResult,
  state: StateAssessment,
  now: Date,
): DomainContribution {
  const summary = summariseHealthCategory(evidence, state);
  const graphs = [recoveryGraph(records, now), timeOfDayGraph(evidence)].filter(
    (graph): graph is Graph => graph !== undefined,
  );

  const strongestEvidence: string[] = summary.metrics
    .filter((metric) => metric.value !== 'Unknown' && metric.value !== 'Not asked')
    .map((metric) => `${metric.label}: ${metric.value}`);

  if (evidence.contradictions.length > 0) {
    strongestEvidence.push(
      `Two readings disagree on ${evidence.contradictions.join(', ')} — left unresolved rather than decided for you`,
    );
  }

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
    visuals: healthVisuals(evidence),
    graphs,
    northStarContribution: candidate.deferredToHuman
      ? 'Capacity underpins everything else, which is exactly why this one is not for an app to answer.'
      : 'Capacity is what every other area is spent from. Protecting it is not a competing priority.',
  };
}
