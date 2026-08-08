import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every career question belongs (`V33-067`, v3.3 section K3).
 *
 * ## Three questions, and each one changes the answer
 *
 *   - **The next step.** A commitment with no named next step cannot be acted on, only
 *     worried about. Naming it is what converts "the paper" into something a focus block
 *     can be about, so the answer decides whether a focus move is offerable at all — the
 *     strongest form of `canAffectCurrentDecision` there is.
 *   - **What was in the way.** Section K3 lists "whether waiting on another person blocks
 *     the commitment", and this is where that is established. A barrier that turns out to
 *     be another person routes to `unblock-by-asking`; one that turns out to be the work
 *     itself does not. Different barrier, different move.
 *   - **What came back without looking.** The one learning question here, and it earns its
 *     place because retrieval strength decides whether the next session should be review
 *     or something new.
 *
 * ## What is deliberately absent
 *
 * No question about hours worked, output, or progress against a plan. K1 warns against
 * populating metadata to look thorough, and career is where that temptation becomes a
 * productivity tracker — a thing this product is constitutionally not. Nothing here is
 * triggered by time passing, so no career question can arrive because a week elapsed.
 *
 * ## Privacy
 *
 * Every one of these is `workplace`, and every one is excluded from family and caregiving
 * contexts. Being asked about the paper in the middle of bedtime is worse than not being
 * asked at all, and that is a placement decision rather than a wording one.
 */

export const CAREER_CAPTURES: readonly ContextualCapture[] = [
  {
    /*
     * The eligibility question. A commitment without a named next step produces no
     * actionable candidate, so the answer changes what can be offered rather than merely
     * describing the situation.
     */
    id: 'career:name-the-next-step',
    domainId: 'career-and-learning',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    /*
     * Owned by Update This Area and triggerable from an episode. The owning surface says
     * where the question lives; the class says when it may also be raised. Declaring
     * `decision-episode` here removed every career question from the area's own guide.
     */
    owningSurface: 'update-this-area',
    promptId: 'career:next-step',
    eligibleGuides: [],
    triggers: [
      'An active career commitment has no recorded next step',
      'A focus block is being considered and there is nothing specific for it to be about',
    ],
    parentingContext: undefined,
    privacy: 'workplace',
    excludedContexts: ['sleep', 'family', 'caregiving', 'commute'],
    freshnessHours: 48,
    duplicateSuppression: 'One next step per commitment until it changes',
    cooldownHours: 24,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
  {
    /*
     * Whether the obstacle is a person or the work. The answer selects between two
     * different families of move, which is `AT33-046`'s prerequisite path in career form.
     */
    id: 'career:what-blocked-it',
    domainId: 'career-and-learning',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'update-this-area',
    promptId: 'career:barrier',
    eligibleGuides: [],
    triggers: [
      'A career move was started and stopped short',
      'The same commitment has stalled more than once',
    ],
    parentingContext: undefined,
    privacy: 'workplace',
    excludedContexts: ['sleep', 'family', 'caregiving', 'commute'],
    freshnessHours: 0,
    duplicateSuppression: 'One barrier reading per stalled attempt',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'protect-a-block',
    followUpWindowHours: 24,
    expiresAfterHours: 72,
    canAffectCurrentDecision: true,
  },
  {
    /* Decides whether the next session is review or new ground. */
    id: 'career:retrieval-strength',
    domainId: 'career-and-learning',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'update-this-area',
    promptId: 'career:retrieval',
    eligibleGuides: [],
    triggers: ['A learning move was carried out and its window has closed'],
    parentingContext: undefined,
    privacy: 'workplace',
    excludedContexts: ['sleep', 'family', 'caregiving', 'commute'],
    freshnessHours: 0,
    duplicateSuppression: 'One retrieval reading per learning session',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'practise-retrieval',
    followUpWindowHours: 24,
    expiresAfterHours: 96,
    canAffectCurrentDecision: false,
  },
  {
    id: 'career:update-area',
    domainId: 'career-and-learning',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:career-and-learning',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'workplace',
    excludedContexts: ['sleep'],
    freshnessHours: 6,
    duplicateSuppression: 'One reading per opening of this area',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
];

assertContextualCaptures(
  CAREER_CAPTURES,
  new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)),
);
