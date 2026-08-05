import { assessConfidence } from '../../support';
import type { CategorySummary } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  barComparisonEligibility,
  lineGraphEligibility,
  meterEligibility,
  meterPercent,
  stagePathEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import { RESILIENCE_BANDS } from '../../../domain/money/strategy';
import type { DomainContribution } from '../domainPanel';
import { assessMoney, moneyFreshness, type MoneyEvidence } from './assessMoney';
import { generateMoneyCandidate, type MoneyCandidateResult } from './moneyCandidate';

export { assessMoney, generateMoneyCandidate, moneyFreshness };
export type { MoneyEvidence, MoneyCandidateResult };
export { buildMoneyScan } from './scan';
export type { MoneyScan } from './scan';

/**
 * The Money slice, assembled (Prompt 8H) — and the first earned percentage in the product.
 *
 * ## Six domains refused a meter. This one earns it, and only on request
 *
 * Health had no denominator. Fatherhood had one and the number would have been a child's
 * score. Emotional's would have graded a quiet fortnight. Faith's would have graded a
 * person's faith. Home's would have been a readiness score for a house. Every refusal was
 * a fact about the construct rather than about the evidence, exactly as
 * `meterEligibility` says.
 *
 * A debt paid down is different. £4,200 of £7,500 is a fraction of a real total, with a
 * real baseline and a real target, and the eligibility rules say yes — the module's own
 * documentation has used this example since Prompt 8A.
 *
 * And it is still refused by default, because the figures do not exist until the owner
 * switches `money-figures` on. So the same domain both earns and refuses the meter, and
 * which one he sees depends on a decision he made about how much to tell it. That is the
 * plan's "unless separately activated" made visible.
 *
 * ## The tradeoff is words, because the two quantities do not share an axis
 *
 * Pressure and resilience move independently and are the useful pair — heavy pressure
 * with months of cover is a bad week; no pressure with under a week of cover is fragility
 * nobody has noticed. Drawing them as two bars would put an ordinal about a state of mind
 * next to an ordinal about a length of time and imply the heights mean the same thing.
 * That comparison is refused with its reason, and the tension is stated in a sentence
 * instead.
 *
 * The comparison that **is** drawn is before-and-after: the pressure reading at the time
 * of a decision beside the pressure reading now. Same scale, same anchors, two moments —
 * and labelled as what changed since, never as what the decision caused.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: MoneyEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded about money yet';

  if (evidence.notLookingLately) {
    return 'Not looked at recently, by your own account';
  }
  if (evidence.openDecision !== undefined) {
    return 'One decision open and not settled';
  }
  if (evidence.pressure !== undefined && evidence.resilience !== undefined) {
    return `${evidence.pressure.label} on your mind, with ${evidence.resilience.toLowerCase()} of cover`;
  }
  if (evidence.pressure !== undefined) {
    return `${evidence.pressure.label} on your mind`;
  }
  return 'Recorded, with not enough yet to describe';
}

/**
 * Trajectory from the pressure readings, and only from weeks that have one.
 *
 * Lower pressure is `improving`. A gap is never read as calm: two readings are required,
 * and a month of silence produces `insufficient-evidence` rather than good news.
 */
function trajectoryOf(evidence: MoneyEvidence): CategorySummary['trajectory'] {
  const observed = evidence.pressureByWeek.filter((week) => week.value !== null);
  if (observed.length < 2) return 'insufficient-evidence';

  const latest = observed.at(-1)?.value ?? 0;
  const earliest = observed[0]?.value ?? 0;
  if (latest < earliest) return 'improving';
  if (latest > earliest) return 'declining';
  return 'stable';
}

function driversOf(evidence: MoneyEvidence): readonly string[] {
  if (!evidence.anyEvidence) return ['Nothing recorded yet'];

  const drivers: string[] = [];

  if (evidence.pressure !== undefined) {
    drivers.push(`Money on your mind: ${evidence.pressure.label.toLowerCase()}`);
  }
  if (evidence.resilience !== undefined) {
    drivers.push(`Cover if income stopped: ${evidence.resilience.toLowerCase()}`);
  }
  if (evidence.notLookingLately) {
    drivers.push('You said it has been a while since you looked');
  }
  if (evidence.purpose !== undefined) {
    drivers.push(`What it is for: "${evidence.purpose.statement}"`);
  }
  if (evidence.decisionMade !== undefined && evidence.pressureSince !== undefined) {
    drivers.push(`Since the call: ${evidence.pressureSince.toLowerCase()} on your mind`);
  }

  return drivers.length > 0 ? drivers : ['Recorded, with nothing to draw on yet'];
}

function bottleneckOf(evidence: MoneyEvidence): string | undefined {
  if (evidence.notLookingLately)
    return 'Not having looked, which makes everything else a guess';
  if (evidence.openDecision !== undefined) return 'A decision you named and have not settled';
  return undefined;
}

/* -------------------------------------------------------------------------- */

function meterInputFor(evidence: MoneyEvidence) {
  return {
    current: evidence.goalCurrent,
    target: evidence.goalTarget,
    baseline: 0,
    unit: 'towards what you named',
    /*
     * True, and this is the only place in the product it is. Money paid towards a stated
     * total is genuinely a fraction of that total — the construct has a denominator, which
     * is what every other domain lacked.
     */
    hasValidDenominator: true,
  };
}

function moneyGraphs(evidence: MoneyEvidence): readonly Graph[] {
  const graphs: Graph[] = [];

  const series = lineGraphEligibility({ points: evidence.pressureByWeek, ordered: true });
  if (series.eligible) {
    graphs.push({
      kind: 'trend',
      id: 'money-pressure-by-week',
      question: 'Is there more or less on my mind about money than there was?',
      metric: 'Pressure, on the five-point scale',
      window: 'Last six weeks',
      evidence: 'observed',
      missingDataTreatment:
        'A week with no reading is a gap, never a low score. Not answering is not calm.',
      uncertainty:
        'One reading per week, taken whenever you opened the area. It is where your head was that day, not an average of the week.',
      textSummary: evidence.pressureByWeek
        .map(
          (week) => `${week.label}: ${week.value === null ? 'no reading' : String(week.value)}`,
        )
        .join(' · '),
      unit: 'ordinal',
      points: evidence.pressureByWeek,
    });
  }

  /*
   * Before and after a decision, on one scale.
   *
   * Two moments, same anchors, and the note says plainly that this is what changed rather
   * than what the decision did. Attributing the difference would be exactly the
   * unsupported causation the gate forbids.
   */
  const before = evidence.pressureAtDecision;
  const after = evidence.pressure;
  if (before !== undefined && after !== undefined && evidence.decisionMadeAt !== undefined) {
    graphs.push({
      kind: 'comparison',
      id: 'money-pressure-around-decision',
      question: 'Has anything shifted since I made that call?',
      metric: 'Pressure, on the five-point scale',
      window: 'The reading at the decision, and the reading now',
      evidence: 'observed',
      missingDataTreatment: 'Both bars are real readings. Neither is interpolated.',
      uncertainty:
        'This is what changed, not what the decision caused. Plenty else moved in the same weeks and none of it is controlled for.',
      textSummary: `At the decision: ${before.label} · Now: ${after.label}`,
      bars: [
        {
          label: 'At the decision',
          value: before.ordinal,
          tone: 'neutral',
          note: before.label,
        },
        { label: 'Now', value: after.ordinal, tone: 'neutral', note: after.label },
      ],
    });
  }

  return graphs;
}

function moneyVisuals(evidence: MoneyEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What is the pressure, and what would reduce it?',
      source:
        'What you said is on your mind, how long you could cover things, and what you decided',
      window: 'All recorded',
      units: 'Bands and positions. No amounts unless you switched them on',
      missingData: 'A month with no readings is a month with no readings, never a calm one.',
      uncertainty:
        'None of this is read from an account. It is what you said, which is the only thing this application has.',
      location: 'domain-detail',
      decisionValue:
        'Puts what is on your mind next to how long you could cover things — two facts that move apart, and the pair is what a balance never tells you.',
    },
  ];

  /* --- the meter, earned or refused by one decision he made ---------------- */

  const meter = meterEligibility(meterInputFor(evidence));

  if (meter.eligible) {
    specs.push({
      kind: 'meter',
      decisionQuestion: 'How far along is the thing I named?',
      source: 'The target and the current figure you entered',
      window: 'Since you set it',
      units: 'The unit you are counting in',
      missingData: 'Both figures are yours. Nothing here is read from anywhere.',
      uncertainty: 'As current as the last time you updated it, which the panel shows you.',
      location: 'domain-detail',
      decisionValue:
        'The only percentage in this product, and it is here because this is the only construct with a real total to be a fraction of.',
      data: {
        kind: 'meter',
        current: String(evidence.goalCurrent ?? 0),
        target: String(evidence.goalTarget ?? 0),
        percent: meterPercent(meterInputFor(evidence)),
      },
    });
  } else {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How far along is the thing I named?',
      source: 'Not shown, because you have not given it any figures',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No percentage here: ${meter.because.toLowerCase()}. This is the one place in the product where a percentage would be valid — amounts are off by default, and everything else in this area works without them.`,
    });
  }

  /* --- resilience as a position, never a percentage ------------------------ */

  const stages = stagePathEligibility({
    stages: [...RESILIENCE_BANDS],
    currentIndex: evidence.resilienceIndex,
    ordinal: true,
  });

  if (stages.eligible && evidence.resilienceIndex !== undefined) {
    specs.push({
      kind: 'stage-path',
      decisionQuestion: 'How long could I cover things?',
      source: 'What you said, in bands',
      window: 'Most recent answer',
      units: 'A position, not a score',
      missingData: 'Never answered shows as never answered.',
      uncertainty: 'Your estimate, which is the honest kind for this.',
      location: 'domain-detail',
      decisionValue:
        'Says where you are without implying you should be at the end of it. The bands hold the fact that matters and no account data at all.',
      data: {
        kind: 'stage-path',
        stages: [...RESILIENCE_BANDS],
        currentIndex: evidence.resilienceIndex,
      },
    });
  }

  /* --- the tradeoff, refused as a chart and given as a sentence ------------ */

  const tradeoff = barComparisonEligibility({
    bars: [
      { label: 'Pressure', value: evidence.pressure?.ordinal ?? 0 },
      { label: 'Cover', value: (evidence.resilienceIndex ?? 0) + 1 },
    ],
    /*
     * The refusal. Two five-point ordinals about entirely different things: one is a state
     * of mind, the other is a length of time. `discrete: false` is not a technicality — bars
     * side by side assert that their heights are comparable, and these are not.
     */
    discrete: false,
  });

  if (!tradeoff.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'Which matters more right now — the pressure or the cover?',
      source: 'Refused as a chart, given as a sentence',
      window: 'Most recent answers',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No chart puts these two side by side: ${tradeoff.because.toLowerCase()}. One is how much is on your mind and the other is how many weeks you could cover — bars would claim the heights mean the same thing. ${tradeoffSentence(evidence)}`,
    });
  }

  return specs;
}

/** The tension in words, which is the only honest form it has. */
function tradeoffSentence(evidence: MoneyEvidence): string {
  const pressure = evidence.pressure;
  const cover = evidence.resilienceIndex;
  if (pressure === undefined || cover === undefined) {
    return 'Both readings are needed before there is a tension worth naming.';
  }
  if (pressure.ordinal >= 4 && cover >= 3) {
    return 'A lot on your mind, and months of cover behind it. Those disagree, and the cover is the more durable fact.';
  }
  if (pressure.ordinal <= 2 && cover <= 1) {
    return 'Not much on your mind, and under a few weeks of cover. Those disagree too, and this is the direction worth noticing.';
  }
  return 'The two readings currently point the same way.';
}

/* -------------------------------------------------------------------------- */

export function summariseMoneyCategory(evidence: MoneyEvidence): CategorySummary {
  return {
    category: 'money',
    condition: conditionOf(evidence),
    trajectory: trajectoryOf(evidence),
    confidence: assessConfidence({
      comparableCount: evidence.observationCount,
      freshness: moneyFreshness(evidence),
      consistent: true,
      complete: evidence.pressure !== undefined && evidence.resilience !== undefined,
    }),
    freshness: moneyFreshness(evidence),
    drivers: driversOf(evidence),
    metrics: [
      { label: 'On your mind', value: evidence.pressure?.label ?? 'Unknown' },
      { label: 'Cover if income stopped', value: evidence.resilience ?? 'Unknown' },
      {
        label: 'Open decision',
        value:
          evidence.decisionStatement === undefined
            ? 'None named'
            : evidence.openDecision === undefined
              ? 'Settled'
              : 'Open',
      },
    ],
    wouldChangeIt: 'Another pressure reading, or settling the decision you named.',
  };
}

export function moneyContribution(
  evidence: MoneyEvidence,
  candidate: MoneyCandidateResult,
): DomainContribution {
  const summary = summariseMoneyCategory(evidence);

  const strongestEvidence: string[] = [
    ...(evidence.pressureAt === undefined
      ? []
      : [`Pressure last recorded ${evidence.pressureAt.slice(0, 10)}`]),
    ...(evidence.resilience === undefined
      ? []
      : [`Cover: ${evidence.resilience.toLowerCase()}, in your own estimate`]),
    ...(evidence.figuresEnabled && evidence.goalTarget !== undefined
      ? [
          `Amounts switched on: ${String(evidence.goalCurrent ?? 0)} of ${String(evidence.goalTarget)}`,
        ]
      : ['Amounts are switched off, and nothing here needs them']),
    ...(evidence.eventCount === 0
      ? []
      : [
          `${String(evidence.eventCount)} note${evidence.eventCount === 1 ? '' : 's'} you wrote — open the area to read them`,
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
    visuals: moneyVisuals(evidence),
    graphs: moneyGraphs(evidence),
    northStarContribution:
      'Money buys the room to make other choices. This area tracks the pressure and the cover, and holds no account, no transaction, and no opinion about what anything was spent on.',
  };
}
