import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every faith question belongs (Prompt 8F).
 *
 * ## Nothing here is guide-eligible, and that is deliberate
 *
 * Health earns a place in a morning check-in because capacity decides what anyone can do
 * today. Emotional earns one for the same reason. This domain earns none: whether someone
 * prayed this morning does not change what the app should suggest, and a daily check-in
 * that asks about it becomes a religious observance tracker with a nagging habit — the
 * exact thing the Blueprint forbids and the exact thing people abandon.
 *
 * Everything is either deliberate (he opened the area), action-linked (he started
 * something), or unexpected (Quick Capture). A practice is followed up because he chose
 * to do it, never because a day has passed.
 */

export const FAITH_CAPTURES: readonly ContextualCapture[] = [
  {
    id: 'faith:practice-done',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:faith-and-meaning',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'faith',
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
    id: 'faith:practice-happened',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'faith:practice-happened',
    eligibleGuides: [],
    triggers: ['A practice action was started'],
    parentingContext: undefined,
    privacy: 'faith',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per started action',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'faith:return-to-a-practice',
    followUpWindowHours: 24,
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    id: 'faith:service-happened',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'faith:service-happened',
    eligibleGuides: [],
    triggers: ['A service action was started'],
    parentingContext: undefined,
    privacy: 'faith',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 24,
    duplicateSuppression: 'One answer per started action',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'faith:do-the-thing-for-someone-else',
    followUpWindowHours: 48,
    expiresAfterHours: 72,
    canAffectCurrentDecision: false,
  },
  {
    id: 'faith:repair-happened',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'faith:repair-happened',
    eligibleGuides: [],
    triggers: ['A repair was named and the action was started'],
    parentingContext: undefined,
    privacy: 'faith',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 24,
    duplicateSuppression: 'One answer per named repair',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'faith:make-the-repair',
    followUpWindowHours: 48,
    expiresAfterHours: 96,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * Deliberate review, and the only place a repair is named.
     *
     * Barred from every guide: "is there something you have decided to put right" asked
     * between the school run and a meeting gets a shrug, and asked repeatedly becomes an
     * accusation.
     */
    id: 'faith:repair-needed',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'faith:repair-needed',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'faith',
    excludedContexts: ['work-focus', 'commute', 'sleep'],
    freshnessHours: 24 * 7,
    duplicateSuppression: 'One named repair at a time',
    cooldownHours: 24,
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
     * Doubt and difficulty. Protected, manual, and read by nothing.
     *
     * Excluded from every protected context there is, offered only where he opened it,
     * and — uniquely in this product — deliberately not consulted by the candidate
     * generator. Recording it is the entire feature.
     */
    id: 'faith:struggle',
    domainId: 'faith-and-meaning',
    recordFamily: 'observation',
    captureClass: 'quick-capture',
    owningSurface: 'quick-capture',
    promptId: 'faith:struggle',
    eligibleGuides: [],
    triggers: ['The owner deliberately opened it'],
    parentingContext: undefined,
    privacy: 'faith',
    excludedContexts: ['sleep', 'family', 'caregiving', 'work-focus', 'commute', 'recovery'],
    freshnessHours: 0,
    duplicateSuppression: 'None — every entry is its own record',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: false,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
    quickCaptureKind: 'Something about how this is going',
    protectedTopic: 'faith-struggle',
  },
];

assertContextualCaptures(FAITH_CAPTURES, new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)));
