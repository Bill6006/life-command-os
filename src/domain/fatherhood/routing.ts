import {
  MILESTONE_CATALOGUE,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  TRACKED_SKILLS,
  skillAttribute,
  skillEvidenceAttribute,
  DEFAULT_MILESTONE_SOURCE,
  DEFAULT_MILESTONE_SOURCE_VERSION,
} from './development';
import {
  MILESTONE_STATUS_LABELS,
  REPORTABLE_MILESTONE_STATUSES,
  type ReportableMilestoneStatus,
} from '../records/fatherhood';

/**
 * Turning two answers into one canonical record.
 *
 * ## The problem this solves
 *
 * A guide asks one question and writes one observation under that question's attribute.
 * That works until a question is *about* something: "how much help did she need" is
 * meaningless without which skill, and "have you seen her do this" is meaningless
 * without which item on which list.
 *
 * The first version of this slice shipped both questions without the pairing. They were
 * answered, stored under `father:skill-level` and `father:milestone-status`, and read by
 * nothing — the panel said "nothing recorded here yet" immediately after the owner had
 * recorded something. Found on the deployed build, which is the only place it could have
 * been found: every unit test wrote the per-skill attribute directly.
 *
 * ## What this does
 *
 * Given the answers from one Update This Area session, it produces the records those
 * answers actually mean: a skill reading filed under `father:skill:<id>`, and a
 * `milestone-observation` carrying the list and its version. The two selection answers
 * are consumed rather than stored, because "which one were you looking at" is not a fact
 * about anyone — it is part of the question.
 *
 * One event, one record, whichever entry path was used.
 */

export interface RoutedAnswer {
  readonly promptId: string;
  /** The visible label the owner chose, or the text they typed. */
  readonly text: string;
}

export interface RoutedRecords {
  /** Observations to write instead of the raw drafts, keyed by attribute. */
  readonly skillReading: { readonly attribute: string; readonly state: string } | undefined;
  /**
   * One occasion, written to the same attribute the learning map uses.
   *
   * This is what makes "one observation entered through different surfaces creates one
   * canonical record" true rather than aspirational: there is a single attribute for
   * skill evidence, and both surfaces write it.
   */
  readonly skillEvidence: { readonly attribute: string; readonly state: string } | undefined;
  readonly milestone:
    | {
        readonly milestoneId: string;
        readonly status: ReportableMilestoneStatus;
        readonly checklistSource: string;
        readonly checklistVersion: string;
      }
    | undefined;
  /** Prompt ids whose raw drafts must be dropped — they were selections, not facts. */
  readonly consumedPromptIds: readonly string[];
}

const SELECTION_PROMPTS = ['father:skill', 'father:milestone'];

function answerFor(answers: readonly RoutedAnswer[], promptId: string): string | undefined {
  return answers.find((answer) => answer.promptId === promptId)?.text;
}

export function routeFatherhoodAnswers(answers: readonly RoutedAnswer[]): RoutedRecords {
  const consumed: string[] = [];

  /* --- the skill reading -------------------------------------------------- */

  const skillLabel = answerFor(answers, 'father:skill');
  const levelLabel = answerFor(answers, 'father:skill-level');
  const skill = TRACKED_SKILLS.find((entry) => entry.label === skillLabel);
  const level = SKILL_LEVELS.find((entry) => SKILL_LEVEL_LABELS[entry] === levelLabel);

  const skillReading =
    skill === undefined || level === undefined
      ? undefined
      : { attribute: skillAttribute(skill.id), state: SKILL_LEVEL_LABELS[level] };

  const evidenceLabel = answerFor(answers, 'father:skill-evidence');
  const evidenceLevel = SKILL_LEVELS.find(
    (entry) => SKILL_LEVEL_LABELS[entry] === evidenceLabel,
  );
  const skillEvidence =
    skill === undefined || evidenceLevel === undefined
      ? undefined
      : {
          attribute: skillEvidenceAttribute(skill.id),
          state: SKILL_LEVEL_LABELS[evidenceLevel],
        };

  /* --- the milestone answer ----------------------------------------------- */

  const milestoneLabel = answerFor(answers, 'father:milestone');
  const statusLabel = answerFor(answers, 'father:milestone-status');
  const entry = MILESTONE_CATALOGUE.find((item) => item.text === milestoneLabel);
  const status = REPORTABLE_MILESTONE_STATUSES.find(
    (candidate) => MILESTONE_STATUS_LABELS[candidate] === statusLabel,
  );

  const milestone =
    entry === undefined || status === undefined
      ? undefined
      : {
          milestoneId: entry.id,
          status,
          checklistSource: DEFAULT_MILESTONE_SOURCE,
          checklistVersion: DEFAULT_MILESTONE_SOURCE_VERSION,
        };

  /*
   * A selection is always consumed, even when its partner went unanswered. Storing
   * "which skill were you practising" on its own would be a record of a question, not
   * of anything that happened.
   */
  for (const promptId of SELECTION_PROMPTS) {
    if (answerFor(answers, promptId) !== undefined) consumed.push(promptId);
  }
  if (skillReading !== undefined) consumed.push('father:skill-level');
  if (skillEvidence !== undefined) consumed.push('father:skill-evidence');
  if (milestone !== undefined) consumed.push('father:milestone-status');

  return { skillReading, skillEvidence, milestone, consumedPromptIds: consumed };
}
