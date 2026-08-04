import { MILESTONE_STATUS_LABELS, type CanonicalRecord } from '../../../domain/records';
import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  movedForward,
  skillLevelIndex,
} from '../../../domain/fatherhood/development';
import { assessConfidence } from '../../support';
import type { CategorySummary, TrajectoryResult } from '../../types';
import type { Graph } from '../../learning/insights';
import {
  meterEligibility,
  stagePathEligibility,
  timelineEligibility,
  type VisualSpec,
} from '../../visuals/eligibility';
import type { DomainContribution } from '../domainPanel';
import { assessFatherhood, childReference, type FatherhoodEvidence } from './assessFatherhood';
import {
  generateFatherhoodCandidate,
  type FatherhoodCandidateResult,
} from './fatherhoodCandidate';

export { assessFatherhood, childReference, generateFatherhoodCandidate };
export type { FatherhoodEvidence, FatherhoodCandidateResult };

/**
 * The Fatherhood slice, assembled (Prompt 8D tasks 8–11).
 *
 * ## The third answer to the same visual question
 *
 * Health refused a meter because health has no total to be a fraction of. Career earned
 * one because "claims with something behind them, out of claims made" has a denominator
 * the owner defined. Fatherhood refuses one for a third reason, and it is the strongest:
 * a denominator *does* exist — eight milestones, six skills, a countable number of yeses
 * — and rendering it would produce a percentage describing a child.
 *
 * That is the one output this domain must never produce, so the refusal is computed
 * from an explicitly invalid construct and stated on the panel. Not because the data is
 * missing. Because the number would be real, and would still be wrong.
 *
 * ## What it does earn
 *
 * A **stage path** for one skill at a time — genuinely ordinal, about support rather
 * than achievement — and a **timeline** of moments the owner chose to keep. Neither
 * aggregates. Neither compares her to anybody.
 */

/* -------------------------------------------------------------------------- */

function conditionOf(evidence: FatherhoodEvidence): string {
  if (!evidence.anyEvidence) return 'Nothing recorded here yet';

  if (evidence.persistentConcern !== undefined && evidence.concernStillPresent !== false) {
    return 'Something you noticed weeks ago is still on record';
  }

  const moving = evidence.skills.filter(
    (skill) => skill.previous !== undefined && movedForward(skill.previous, skill.level),
  ).length;

  if (moving > 0) {
    return `${String(moving)} skill${moving === 1 ? '' : 's'} needing less help than last time`;
  }
  if (evidence.skills.length > 0) {
    return `${String(evidence.skills.length)} skill${evidence.skills.length === 1 ? '' : 's'} being practised`;
  }
  return `${String(evidence.momentsCaptured.length)} moment${evidence.momentsCaptured.length === 1 ? '' : 's'} kept, and nothing else recorded yet`;
}

function driversOf(evidence: FatherhoodEvidence): readonly string[] {
  const drivers: string[] = [];

  const newest = evidence.skills[0];
  if (newest !== undefined) {
    drivers.push(`${newest.label}: ${newest.levelLabel.toLowerCase()}`);
  }

  for (const concern of evidence.openConcerns.slice(0, 2)) {
    drivers.push(
      `On record as "${MILESTONE_STATUS_LABELS[concern.status].toLowerCase()}": ${concern.text}`,
    );
  }

  if (evidence.lessonsStarted > 0) {
    drivers.push(
      `${String(evidence.lessonsThatHappened)} of ${String(evidence.lessonsStarted)} tiny lessons happened`,
    );
  }

  if (evidence.untouchedSkills.length > 0) {
    drivers.push(
      `${String(evidence.untouchedSkills.length)} tracked skills have no reading — that is an absence, not a gap in her`,
    );
  }

  return drivers.length > 0 ? drivers : ['Nothing recorded yet'];
}

function bottleneckOf(evidence: FatherhoodEvidence): string | undefined {
  if (evidence.persistentConcern !== undefined && evidence.concernStillPresent !== false) {
    return 'Something noticed weeks ago that a person should hear about';
  }
  if (evidence.togetherFreshness === 'stale' || evidence.togetherFreshness === 'none') {
    return 'Nothing recorded together recently';
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */

/** Moments kept, as a timeline. Events, never a rate. */
function momentsTimeline(evidence: FatherhoodEvidence): Graph | undefined {
  const events = evidence.momentsCaptured.map((record) => ({ at: record.occurredAt }));
  if (!timelineEligibility(events).eligible) return undefined;

  return {
    kind: 'comparison',
    id: 'fatherhood-moments',
    question: 'What have I kept from this year?',
    metric: 'Moments the owner chose to write down',
    window: 'All recorded',
    evidence: 'observed',
    missingDataTreatment:
      'A week with nothing kept is a week nothing was written down. It is never read as a week without moments.',
    uncertainty:
      'Entirely the owner’s choice of what was worth keeping. It measures what he recorded, and nothing about her.',
    textSummary: `${String(evidence.momentsCaptured.length)} moments kept.`,
    bars: evidence.momentsCaptured.slice(0, 6).map((record) => ({
      label: record.occurredAt.slice(0, 10),
      value: 1,
      tone: 'benefit' as const,
      note: record.value.kind === 'note' ? record.value.text : 'kept',
    })),
  };
}

/**
 * The visuals — including the refusal that matters most in this product.
 */
function fatherhoodVisuals(evidence: FatherhoodEvidence): readonly VisualSpec[] {
  const specs: VisualSpec[] = [
    {
      kind: 'evidence-summary',
      decisionQuestion: 'What did I practise, and what did I notice?',
      source:
        'Shared canonical observations — skills practised, moments kept, checklist answers',
      window: 'All recorded',
      units: 'Positions on a support ladder and dated answers, never a level or a rating',
      missingData: 'A skill with no reading shows as having no reading.',
      uncertainty: 'One father, watching. It records what he saw, on the day he saw it.',
      location: 'domain-detail',
      decisionValue:
        'Decides whether the next small thing is practice, presence, or a phone call.',
    },
  ];

  /*
   * The refusal, computed rather than asserted.
   *
   * `hasValidDenominator: false` is the honest input: the number of milestones marked
   * yes is countable, and it is not a measurement of anything. Passing `true` here
   * would produce a working meter, which is precisely why the refusal is written down
   * where a future reader will see it.
   */
  const meter = meterEligibility({
    current: evidence.milestones.filter((reading) => reading.status === 'yes').length,
    target: evidence.milestones.length,
    baseline: 0,
    unit: 'milestones',
    hasValidDenominator: false,
  });

  if (!meter.eligible) {
    specs.push({
      kind: 'evidence-summary',
      decisionQuestion: 'How far along is she?',
      source: 'Not answerable, and not asked',
      window: 'n/a',
      units: 'none',
      missingData: 'n/a',
      uncertainty: 'n/a',
      location: 'domain-detail',
      decisionValue: `No percentage is shown here: ${meter.because.toLowerCase()}. The milestones answered would produce one, and it would be a score for a child — which this product does not calculate, store, or display.`,
    });
  }

  /* One skill at a time, on its own ladder. Never all of them averaged. */
  const focus = evidence.skills[0];
  if (
    focus !== undefined &&
    stagePathEligibility({
      stages: [...SKILL_LEVELS],
      currentIndex: skillLevelIndex(focus.level),
      ordinal: true,
    }).eligible
  ) {
    specs.push({
      kind: 'stage-path',
      data: {
        kind: 'stage-path',
        stages: SKILL_LEVELS.map((level) => SKILL_LEVEL_LABELS[level]),
        currentIndex: skillLevelIndex(focus.level),
      },
      decisionQuestion: `How much help does ${focus.label.toLowerCase()} still need?`,
      source: 'What the owner observed, on the day he observed it',
      window: 'Most recent reading',
      units: 'Positions on a support ladder — not evenly spaced, and never a percentage',
      missingData: 'No reading means no reading. It is not the first rung by default.',
      uncertainty: 'One observation by one parent. It describes an evening, not a capability.',
      location: 'domain-detail',
      decisionValue: 'Names the next small thing to practise, or says she no longer needs it.',
    });
  }

  return specs;
}

/* -------------------------------------------------------------------------- */

/**
 * The fatherhood category summary, for the shared category overview.
 *
 * Delegated to the slice for the same reason health's is: the slice created this
 * category, so nothing else can describe it. Before this existed, `categorySummaries`
 * had a trailing branch that applied **career's** focused-hours reading to any category
 * it did not recognise — so activating this one produced "losing ground on focused
 * work" under a heading about a two-year-old. The branching is exhaustive now, and
 * activating a category without writing its summary fails to compile.
 */
export function summariseFatherhoodCategory(evidence: FatherhoodEvidence): CategorySummary {
  return {
    category: 'fatherhood-and-child',
    condition: conditionOf(evidence),
    trajectory: evidence.anyEvidence ? 'stable' : 'insufficient-evidence',
    confidence: assessConfidence({
      comparableCount: evidence.skills.length + evidence.milestones.length,
      freshness: evidence.togetherFreshness,
      consistent: true,
      complete: evidence.anyEvidence,
    }),
    freshness: evidence.togetherFreshness,
    drivers: driversOf(evidence),
    metrics: [
      { label: 'Skills with a reading', value: String(evidence.skills.length) },
      { label: 'Moments kept', value: String(evidence.momentsCaptured.length) },
      {
        label: 'Time together last recorded',
        value: evidence.lastTogetherAt?.slice(0, 10) ?? 'Not yet',
      },
    ],
    wouldChangeIt: 'Anything written down after the next time you are together.',
  };
}

export function fatherhoodContribution(
  evidence: FatherhoodEvidence,
  candidate: FatherhoodCandidateResult,
  trajectory: TrajectoryResult,
): DomainContribution {
  const graphs = [momentsTimeline(evidence)].filter(
    (graph): graph is Graph => graph !== undefined,
  );

  const strongestEvidence = [
    ...evidence.skills.map(
      (skill) =>
        `${skill.label}: ${skill.levelLabel.toLowerCase()}${
          skill.previous !== undefined && movedForward(skill.previous, skill.level)
            ? ` — needed more help last time (${SKILL_LEVEL_LABELS[skill.previous].toLowerCase()})`
            : ''
        }`,
    ),
    ...evidence.milestones
      .slice(0, 3)
      .map(
        (reading) =>
          `"${reading.text}" — ${MILESTONE_STATUS_LABELS[reading.status].toLowerCase()}, against ${reading.checklistSource} (${reading.checklistVersion})`,
      ),
  ];

  return {
    condition: conditionOf(evidence),
    trajectory: trajectory.direction,
    confidence: assessConfidence({
      comparableCount: evidence.skills.length + evidence.milestones.length,
      freshness: evidence.togetherFreshness,
      consistent: true,
      complete: evidence.skills.length > 0,
    }),
    freshness: evidence.togetherFreshness,
    drivers: driversOf(evidence),
    bottleneck: bottleneckOf(evidence),
    strongestEvidence,
    metrics: [
      { label: 'Skills with a reading', value: String(evidence.skills.length) },
      { label: 'Moments kept', value: String(evidence.momentsCaptured.length) },
      {
        label: 'Checklist answers on record',
        value:
          evidence.milestones.length === 0
            ? 'None yet'
            : `${String(evidence.milestones.length)} of ${String(evidence.milestones.length)} answered`,
      },
      {
        label: 'Tiny lessons that happened',
        value:
          evidence.lessonsStarted === 0
            ? 'None started'
            : `${String(evidence.lessonsThatHappened)} of ${String(evidence.lessonsStarted)}`,
      },
    ],
    move: candidate.candidate,
    capabilityEffects: candidate.candidate?.capabilityEffects ?? [],
    visuals: fatherhoodVisuals(evidence),
    graphs,
    northStarContribution: `This area measures what ${childReference(evidence)} was shown and what her father did, never how she is doing against anyone else.`,
  };
}

/** Convenience for callers that hold only records. */
export function fatherhoodEvidenceFrom(
  records: readonly CanonicalRecord[],
  now: Date,
): FatherhoodEvidence {
  return assessFatherhood(records, now);
}
