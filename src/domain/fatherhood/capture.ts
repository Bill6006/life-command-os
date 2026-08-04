import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every fatherhood question belongs, and when it is worth asking.
 *
 * This is the first domain to declare its contextual-capture metadata (Master Plan
 * v3.1). Read the `owningSurface` column as the argument: nothing here is on a daily
 * guide except the one recurring question that genuinely belongs there, and the
 * milestone review — the most tempting thing to put in a morning flow — is
 * structurally barred from one.
 *
 * ## The placement decisions, and why
 *
 * **Milestone review is deliberate.** Asked at 7am between the school run and a
 * meeting, "have you seen her do this?" gets a guess. Asked when the owner has opened
 * this area on purpose, it gets an answer. The validator refuses to let it be
 * guide-eligible at all, so this cannot be softened later by someone in a hurry.
 *
 * **A Tiny Lesson is followed up, not surveyed.** The follow-up exists because a
 * specific lesson was started, it names that action, and it expires. Two days later
 * the honest answer is recall rather than observation, so it stops asking.
 *
 * **Dad actions are contextual.** Relevant in the evening, when he is with her, and
 * never during work focus — which is not a nicety. A question about his daughter
 * appearing on a shared screen in a meeting is exactly the exposure the plan forbids.
 *
 * **Meaningful moments stay manual.** They are unpredictable by definition; no trigger
 * could find them, and a prompt asking "did anything nice happen today?" would produce
 * dutiful answers rather than real ones.
 *
 * ## What this file does not do
 *
 * It decides nothing. There is no scheduler here, no ordering, no arbitration between
 * domains — Phase 8 owns all of that and will read these declarations. Building it
 * early is a stop condition.
 */

export const FATHERHOOD_CAPTURES: readonly ContextualCapture[] = [
  {
    id: 'father:together',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:fatherhood',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: 'Any time the owner chooses to look at this area',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
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
  {
    id: 'father:skill-level',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'father:skill-level',
    eligibleGuides: [],
    triggers: ['The owner opened this area', 'A tracked skill was practised recently'],
    parentingContext: 'After time together, when what happened is still fresh',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 24,
    duplicateSuppression: 'One reading per skill per day; a second replaces nothing',
    cooldownHours: 12,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
  {
    /**
     * One occasion, from whichever surface the owner was on.
     *
     * Owned by Update This Area because that is where he deliberately looks at her
     * learning; a Tiny Lesson follow-up writes the same attribute through the decision
     * episode, which is the point — one canonical record either way.
     */
    id: 'father:skill-evidence',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'father:skill-evidence',
    eligibleGuides: [],
    triggers: [
      'The owner opened the learning map',
      'A Tiny Lesson for this skill was completed',
    ],
    parentingContext: 'Straight after the occasion, while what happened is still exact',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One occasion per skill per entry; repeats are separate occasions',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * The one milestone capture. Barred from every guide by the validator, not by
     * this file remembering to leave the list empty.
     */
    id: 'father:milestone-status',
    domainId: 'fatherhood',
    recordFamily: 'milestone-observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'father:milestone-status',
    eligibleGuides: [],
    triggers: [
      'The owner opened this area and chose to review the list',
      'A milestone has never been answered and the owner asked to review',
    ],
    parentingContext: 'A deliberate sit-down review, never a passing question',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute', 'sleep'],
    freshnessHours: 24 * 30,
    duplicateSuppression: 'One answer per milestone per month unless the owner reopens it',
    cooldownHours: 24 * 7,
    repeatedSkip: 'stop-offering',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
  },
  {
    id: 'father:lesson-happened',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'father:lesson-happened',
    eligibleGuides: [],
    triggers: ['A Tiny Lesson was started'],
    parentingContext: 'The same day, once the activity has ended',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per started lesson',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'fatherhood:tiny-lesson',
    followUpWindowHours: 12,
    /*
     * Two days is where observation becomes recall. An unanswered follow-up expires
     * unresolved rather than being chased, because an outcome reconstructed later is
     * worse evidence than no outcome at all.
     */
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    id: 'father:child-tried',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'father:child-tried',
    eligibleGuides: [],
    triggers: ['A Tiny Lesson was started and reported as having happened'],
    parentingContext: 'Immediately after the activity',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per started lesson',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'fatherhood:tiny-lesson',
    followUpWindowHours: 12,
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    id: 'father:together-happened',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'father:together-happened',
    eligibleGuides: [],
    triggers: ['A Dad action was started'],
    parentingContext: 'The same evening',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per started action',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'fatherhood:follow-her-lead',
    followUpWindowHours: 12,
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    id: 'father:wind-down-happened',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'father:wind-down-happened',
    eligibleGuides: [],
    triggers: ['The wind-down action was started'],
    parentingContext: 'After bedtime',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute', 'sleep'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per evening',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'fatherhood:protect-the-wind-down',
    followUpWindowHours: 14,
    expiresAfterHours: 36,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * The only triggered question in this domain.
     *
     * It interrupts, so it has to earn it: a concern already on record is the one
     * fatherhood answer that can change what is recommended right now, because a
     * concern that has gone is the difference between silence and suggesting the
     * owner mention it to someone qualified.
     */
    id: 'father:concern-still-present',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    owningSurface: 'update-this-area',
    promptId: 'father:concern-still-present',
    eligibleGuides: [],
    triggers: [
      'A milestone was answered as a concern or a possible loss',
      'At least seven days have passed since that answer',
    ],
    parentingContext: 'When the owner is looking at this area, not in passing',
    privacy: 'child',
    excludedContexts: ['work-focus', 'commute', 'sleep'],
    freshnessHours: 24 * 7,
    duplicateSuppression: 'Once a week at most, per concern',
    cooldownHours: 24 * 7,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
  {
    id: 'father:moment',
    domainId: 'fatherhood',
    recordFamily: 'observation',
    captureClass: 'quick-capture',
    owningSurface: 'quick-capture',
    promptId: undefined,
    eligibleGuides: [],
    triggers: ['Something happened that the owner wants to keep'],
    parentingContext: 'Whenever it happens — that is the entire point',
    privacy: 'child',
    excludedContexts: ['work-focus'],
    freshnessHours: 0,
    duplicateSuppression: 'Same text within a minute is reported as a duplicate, never merged',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: false,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
    quickCaptureKind: 'A moment with my daughter',
  },
];

/*
 * Validated at import, exactly like the prompt catalogue. A placement rule broken here
 * breaks the build rather than reaching a person.
 */
assertContextualCaptures(
  FATHERHOOD_CAPTURES,
  new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)),
);
