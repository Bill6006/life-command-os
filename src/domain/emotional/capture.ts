import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every emotional question belongs (Prompt 8E).
 *
 * The placement decisions here are the sharpest in the product so far, because the cost
 * of getting one wrong is not a wasted tap — it is a question about someone's marriage
 * appearing on a screen in a meeting.
 *
 * ## The one that is guide-eligible, and why only that one
 *
 * `emotional:interference` is the single question in this domain that belongs in a daily
 * check-in. It is about the owner's own capacity — is something in the way of what he
 * meant to do — which is the same class of fact as energy or free time, and it changes
 * what may be suggested today. It names nobody and describes nothing.
 *
 * Everything else is either deliberate (opened on purpose) or action-linked (it follows
 * something he started). Nothing about conflict, dating, or a private note is ever
 * eligible for a guide, and the validator refuses to let that be softened.
 */

export const EMOTIONAL_CAPTURES: readonly ContextualCapture[] = [
  {
    id: 'emotional:interference',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'guide-recurring',
    owningSurface: 'guide',
    promptId: 'emotional:interference',
    eligibleGuides: ['morning', 'afternoon', 'quick-check-in'],
    triggers: [
      'A check-in is open and this has not been answered today',
      'The answer decides whether a regulation option is worth offering',
    ],
    parentingContext: undefined,
    privacy: 'relationship',
    excludedContexts: ['sleep'],
    freshnessHours: 8,
    duplicateSuppression: 'One answer per part of the day',
    cooldownHours: 4,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
  {
    id: 'emotional:connection',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:emotional-and-relationships',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'relationship',
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
    id: 'emotional:practice',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'emotional:practice',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'relationship',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 24,
    duplicateSuppression: 'One entry per practice per day; repeats are separate attempts',
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
    id: 'emotional:reached-out',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'emotional:reached-out',
    eligibleGuides: [],
    triggers: ['A reach-out or send-the-message action was started'],
    parentingContext: undefined,
    privacy: 'relationship',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 12,
    duplicateSuppression: 'One answer per started action',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'emotional:reach-out-to-one-person',
    followUpWindowHours: 24,
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    id: 'emotional:boundary-outcome',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'emotional:boundary-outcome',
    eligibleGuides: [],
    triggers: ['A boundary was written down and the holding action was started'],
    parentingContext: undefined,
    privacy: 'relationship',
    excludedContexts: ['work-focus', 'commute'],
    freshnessHours: 24,
    duplicateSuppression: 'One answer per started action',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'emotional:hold-the-boundary-you-decided',
    followUpWindowHours: 24,
    expiresAfterHours: 48,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * The only triggered question here, and it interrupts for one reason.
     *
     * Whether a repair has happened decides between suggesting one and saying nothing.
     * It is barred from every guide: "is anything still unresolved with someone" is a
     * question about another person's place in the owner's life, and a morning check-in
     * is not where that belongs.
     */
    id: 'emotional:repair-happened',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    owningSurface: 'update-this-area',
    promptId: 'emotional:repair-happened',
    eligibleGuides: [],
    triggers: [
      'Something is on record as unresolved',
      'At least twelve hours have passed since it was recorded',
    ],
    parentingContext: undefined,
    privacy: 'relationship',
    excludedContexts: ['work-focus', 'commute', 'sleep'],
    freshnessHours: 24,
    duplicateSuppression: 'Once a day at most, per open conflict',
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
    /**
     * Everything sensitive is here, and it is manual in the strongest sense.
     *
     * Opened by the owner, never surfaced, never triggered, and classified
     * `private-pattern` so it is excluded from exports unless he separately and
     * explicitly includes it. `excludedContexts` lists every protected context there is:
     * there is no situation in which this should appear because the app decided to show
     * it.
     */
    id: 'emotional:note',
    domainId: 'emotional-and-relationships',
    recordFamily: 'observation',
    captureClass: 'quick-capture',
    owningSurface: 'quick-capture',
    promptId: 'emotional:note',
    eligibleGuides: [],
    triggers: ['The owner deliberately opened a private note'],
    parentingContext: undefined,
    privacy: 'private-pattern',
    excludedContexts: ['sleep', 'family', 'caregiving', 'work-focus', 'commute', 'recovery'],
    freshnessHours: 0,
    duplicateSuppression: 'None — every note is its own record',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: false,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
    quickCaptureKind: 'A private note',
    protectedTopic: 'private-pattern',
  },
];

assertContextualCaptures(
  EMOTIONAL_CAPTURES,
  new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)),
);
