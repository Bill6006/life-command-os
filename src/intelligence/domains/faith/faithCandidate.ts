import { FAITH_ACTIONS, type FaithAction } from '../../../domain/faith/meaning';
import type { CanonicalRecord } from '../../../domain/records';
import type { CandidateAction } from '../../types';
import { maySurface } from '../../../domain/emotional/permissions';
import { mayGenerateCandidate } from '../registry';
import type { FaithEvidence } from './assessFaith';

/**
 * The one faith candidate (Prompt 8F, `XDS-015`).
 *
 * ## The order
 *
 * 1. **A repair he named and has not done.** He decided it; the app's only job is to
 *    keep it from quietly lapsing.
 * 2. **A practice he chose that has gone quiet.** Offered as the smallest version,
 *    because the version that survives a bad week is the one that gets done at all.
 * 3. **Nothing named yet.** One action, and it asks for his words rather than offering
 *    him any.
 * 4. **Silence.**
 *
 * ## What is deliberately not a branch
 *
 * **Struggle.** Someone writing down that this is hard, or that they are not sure any
 * more, produces exactly nothing from this generator — no suggestion to return to a
 * practice, no encouragement, no concern, and no referral. Doubt is not a symptom, an
 * app has no standing to respond to it, and the honest response is silence.
 *
 * That is the sharpest expression of authority separation in the product: the domain can
 * read the record and chooses to have no view.
 *
 * There is also no branch keyed on how *long* a practice has been going, no comparison
 * between practices, and no notion of a lapse. A practice that has gone quiet is offered
 * once, as a small thing, and never chased.
 */

export interface FaithCandidateResult {
  readonly candidate: CandidateAction | undefined;
  readonly because: string;
}

function toCandidate(
  action: FaithAction,
  reason: string,
  statementOverride?: string,
): CandidateAction {
  return {
    id: `faith:${action.id}`,
    statement: statementOverride ?? action.statement,
    category: 'faith-and-meaning',
    originDomainId: 'faith-and-meaning',
    intendedOutcome: action.intendedOutcome,
    followUp: { promptId: action.followUpPromptId, windowHours: 24 },
    capabilityEffects: action.capabilityEffects,
    durationMinutes: action.durationMinutes,
    minimumMinutes: action.minimumMinutes,
    minimumVersion: action.minimumVersion,
    fallback: action.minimumVersion,
    stoppingPoint: action.stoppingPoint,
    friction: 'low',
    risk: 'none-identified',
    reversibility: 'reversible',
    blockedByProtectedContexts: ['sleep', 'work-focus', 'commute'],
    goalId: undefined,
    reason,
  };
}

export function generateFaithCandidate(
  records: readonly CanonicalRecord[],
  evidence: FaithEvidence,
): FaithCandidateResult {
  if (!mayGenerateCandidate(records, 'faith-and-meaning')) {
    return { candidate: undefined, because: 'This area is not switched on' };
  }

  /*
   * 1. A repair he named and has not done.
   *
   * His words are deliberately **not** quoted in the reason. A candidate's reason trace
   * is rendered on Now, and a repair is by its nature the description of something that
   * went wrong with another person — the last sentence anyone wants on the front page of
   * an app while someone is looking over their shoulder. The statement is discreet on
   * purpose; the words he wrote stay on the area page he opened.
   */
  if (evidence.openRepair !== undefined && !evidence.repairDone) {
    return {
      candidate: toCandidate(
        FAITH_ACTIONS['make-the-repair'],
        'You wrote this one down yourself',
      ),
      because: 'You decided this one. Nothing here is deciding it for you.',
    };
  }

  /*
   * 2. A practice that has gone quiet. Offered small, and offered once.
   *
   * **His words appear only where he said they may.** Switching the area on says he wants
   * somewhere to record a practice; it does not say the sentence may sit on the front page,
   * which is the surface he sees most and chooses least. The scan has withheld the same
   * content since Prompt 8F, and this brings Now into line with it.
   *
   * Without the permission the offer still happens — the app still knows a practice has
   * gone quiet, still counts it, still puts the words on the area page he opened. Only the
   * quoting stops. Withholding the content is not withholding the help.
   */
  const quiet = evidence.quietPractices[0];
  if (quiet !== undefined) {
    const mayQuote = maySurface(records, 'faith-practice', 'now');
    return {
      candidate: toCandidate(
        FAITH_ACTIONS['do-the-smallest-version'],
        quiet.lastAt === undefined
          ? 'Nothing recorded against this yet'
          : 'Nothing recorded against this for a while',
        mayQuote
          ? `Two minutes of: ${quiet.statement}`
          : 'Two minutes of something you said you wanted to do',
      ),
      because: mayQuote
        ? 'Your words, offered back at the size that survives a bad week. Not doing it is not recorded as anything.'
        : 'One of the things you said you wanted to do, at the size that survives a bad week. The words stay on the page you opened.',
    };
  }

  /* 3. Nothing named yet. */
  if (evidence.values.length === 0 && evidence.practices.length === 0) {
    return {
      candidate: toCandidate(
        FAITH_ACTIONS['write-down-what-matters'],
        'Nothing has been written down here yet',
      ),
      because:
        'This area holds your words and has none. It will not suggest any — that is not something an app should be choosing for you.',
    };
  }

  /* 4. Silence. */
  return {
    candidate: undefined,
    because:
      'Nothing here needs to interrupt you. This is the area where an app has least business having an opinion.',
  };
}
