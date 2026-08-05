import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every money question belongs (Prompt 8H).
 *
 * ## Nothing here is guide-eligible
 *
 * Money is a protected class, and a question about it arriving in a morning check-in is
 * the exact surprise Master Plan §11 exists to prevent — on a shared screen, on a train,
 * in front of a child. Health earns a place in a guide because capacity decides what
 * anyone can do today. This does not, and the cost of asking at the wrong moment is far
 * higher than the value of asking daily.
 *
 * Everything is deliberate, action-linked, or unexpected. The pressure scale is included:
 * it is a present state like mood, and it is still not allowed to interrupt.
 *
 * ## Every context is excluded
 *
 * All six, on every declaration. `family` and `caregiving` are on the list here where the
 * home and faith slices left them off — a question about money in front of the people it
 * affects is worse than useless.
 */

const ALL_CONTEXTS = [
  'sleep',
  'family',
  'caregiving',
  'work-focus',
  'commute',
  'recovery',
] as const;

export const MONEY_CAPTURES: readonly ContextualCapture[] = [
  {
    id: 'money:last-looked',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:money',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 7,
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
    id: 'money:financial-pressure',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'money:financial-pressure',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 3,
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
    id: 'money:resilience',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'money:resilience',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 30,
    duplicateSuppression: 'One reading per opening of this area',
    cooldownHours: 24 * 7,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
  },
  {
    /** A decision he is weighing. Named deliberately, and never asked in passing. */
    id: 'money:decision-named',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'money:decision-named',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 7,
    duplicateSuppression: 'One decision at a time',
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
    id: 'money:decision-made',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'money:decision-made',
    eligibleGuides: [],
    triggers: ['A decision was named and the action was started'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24,
    duplicateSuppression: 'One answer per named decision',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'money:make-the-call',
    followUpWindowHours: 48,
    expiresAfterHours: 24 * 14,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * The observable outcome, asked a fortnight later.
     *
     * A money decision does not change how much is on somebody's mind by the next
     * morning. Asking then would collect the relief of having decided; asking after a
     * fortnight collects whether anything actually moved.
     */
    id: 'money:pressure-since',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'decision-episode',
    promptId: 'money:pressure-since',
    eligibleGuides: [],
    triggers: ['A decision was made and a fortnight has passed'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 14,
    duplicateSuppression: 'One answer per decision made',
    cooldownHours: 24 * 7,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'money:one-thing-that-moves-it',
    followUpWindowHours: 24 * 14,
    expiresAfterHours: 24 * 28,
    canAffectCurrentDecision: false,
  },
  {
    /**
     * The figures, and the only two captures in the product gated by a protected topic
     * rather than merely classified by one.
     *
     * `protectedTopic` means switching the **area** on is not enough to reach them. The
     * plan defers account machinery "unless separately activated", and this field is the
     * separate activation.
     */
    id: 'money:goal-target',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'money:goal-target',
    eligibleGuides: [],
    triggers: ['The owner switched amounts on and opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 90,
    duplicateSuppression: 'One target per goal',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
    protectedTopic: 'money-figures',
  },
  {
    id: 'money:goal-current',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'money:goal-current',
    eligibleGuides: [],
    triggers: ['The owner switched amounts on and opened this area'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
    freshnessHours: 24 * 30,
    duplicateSuppression: 'One reading per opening of this area',
    cooldownHours: 0,
    repeatedSkip: 'owner-initiated',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: false,
    protectedTopic: 'money-figures',
  },
  {
    /** The unexpected event, through the compact manual route. */
    id: 'money:event',
    domainId: 'money',
    recordFamily: 'observation',
    captureClass: 'quick-capture',
    owningSurface: 'quick-capture',
    promptId: 'money:event',
    eligibleGuides: [],
    triggers: ['Something happened and he wanted it on record before he forgot'],
    parentingContext: undefined,
    privacy: 'money',
    excludedContexts: ALL_CONTEXTS,
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
    quickCaptureKind: 'Something about money',
  },
];

assertContextualCaptures(MONEY_CAPTURES, new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)));
