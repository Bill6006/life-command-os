import {
  FATHERHOOD_ACTIONS,
  lessonFor,
  lessonLabel,
  type FatherhoodAction,
} from '../../../domain/fatherhood/actions';
import { SKILL_LEVELS, skillLevelIndex } from '../../../domain/fatherhood/development';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { mayGenerateCandidate } from '../registry';
import type { FatherhoodEvidence } from './assessFatherhood';

/**
 * The one fatherhood candidate (Prompt 8D tasks 7–8, `XDS-015`).
 *
 * ## The order, and why it is this order
 *
 * 1. **A concern that has not gone away.** The domain stops having a view and says who
 *    should. This is first because nothing else it could suggest matters more, and
 *    because an app that buried it under a play idea would be worse than one that never
 *    mentioned it.
 * 2. **A skill practised but not yet seen alone.** A specific lesson beats a general
 *    one, because "spend time with her" is advice nobody needed.
 * 3. **Several days with nothing recorded together.** The lowest-cost action there is:
 *    join what she is already doing. It needs no setup and no cooperation.
 * 4. **Nothing.** Silence is the normal case here, more than in any other domain. A
 *    father does not need an app to tell him to see his daughter.
 *
 * ## What this never does
 *
 * It never suggests anything because of what the child can or cannot do. Branch 2 keys
 * off a skill *the owner chose to practise*, not off a milestone, and no branch anywhere
 * reads the official checklist as a reason to act. That separation is the whole
 * argument: a checklist is someone else's list of what is typical, and turning it into
 * a to-do list for a parent is how a supportive tool becomes a source of pressure.
 *
 * It also never proposes anything during protected sleep or work focus, and — unlike
 * every other domain — it is deliberately **not** blocked by `family` or `caregiving`.
 * Those are precisely the contexts in which a Dad action makes sense.
 */

export interface FatherhoodCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(
  action: FatherhoodAction,
  reason: string,
  statementOverride?: string,
): CandidateAction {
  return {
    id: `fatherhood:${action.id}`,
    statement: statementOverride ?? action.statement,
    category: 'fatherhood-and-child',
    originDomainId: 'fatherhood',
    intendedOutcome: action.intendedOutcome,
    followUp: { promptId: action.followUpPromptId, windowHours: 14 },
    capabilityEffects: action.capabilityEffects,
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.minimumVersion,
    stoppingPoint: action.stoppingPoint,
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    // Not `family` or `caregiving`: those are when this domain's actions belong.
    blockedByProtectedContexts: ['sleep', 'work-focus', 'commute'],
    goalId: undefined,
    reason,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function generateFatherhoodCandidate(
  records: readonly CanonicalRecord[],
  evidence: FatherhoodEvidence,
  now: Date,
): FatherhoodCandidateResult {
  if (!mayGenerateCandidate(records, 'fatherhood')) {
    return { candidate: undefined, because: 'This area is not switched on' };
  }

  /* 1. Something the owner flagged, still there weeks later. */
  const concern = evidence.persistentConcern;
  if (concern !== undefined && evidence.concernStillPresent !== false) {
    return {
      candidate: toCandidate(
        FATHERHOOD_ACTIONS['raise-it-with-someone-qualified'],
        `Recorded ${String(concern.ageDays)} days ago and not reported as resolved`,
      ),
      because:
        'Something you noticed is still on record after several weeks. This app has no view on what it means, and should not have one.',
    };
  }

  /* 2. A skill being practised that she has not yet done on her own. */
  const inProgress = evidence.skills.find(
    (skill) =>
      skillLevelIndex(skill.level) >= skillLevelIndex('practising-with-daddy') &&
      skillLevelIndex(skill.level) < skillLevelIndex('uses-on-her-own'),
  );
  const lesson = inProgress === undefined ? undefined : lessonFor(inProgress.skillId);
  if (inProgress !== undefined && lesson !== undefined) {
    return {
      candidate: toCandidate(
        FATHERHOOD_ACTIONS['tiny-lesson'],
        `${inProgress.label} is at "${inProgress.levelLabel.toLowerCase()}"`,
        lessonLabel(lesson),
      ),
      because: `You have been practising ${inProgress.label.toLowerCase()} with her. This is the next small go at it.`,
    };
  }

  /* 3. Nothing recorded together for a few days. */
  const daysSinceTogether =
    evidence.lastTogetherAt === undefined
      ? undefined
      : Math.floor((now.getTime() - Date.parse(evidence.lastTogetherAt)) / DAY_MS);
  if (evidence.anyEvidence && (daysSinceTogether === undefined || daysSinceTogether >= 3)) {
    return {
      candidate: toCandidate(
        FATHERHOOD_ACTIONS['follow-her-lead'],
        daysSinceTogether === undefined
          ? 'Nothing recorded about time together yet'
          : `${String(daysSinceTogether)} days since anything was recorded together`,
      ),
      because:
        'Nothing has been written down here for a few days. That is not a judgement about the days — only that this is the cheapest thing to offer.',
    };
  }

  /* 4. Silence, which is the normal case. */
  return {
    candidate: undefined,
    because:
      'Nothing here needs to interrupt you. This area is the one most likely to be right without the app saying anything.',
  };
}

/** The ladder positions in order, for the stage-path visual. */
export const LADDER_FOR_DISPLAY = SKILL_LEVELS;
