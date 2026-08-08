import { assertContextualCaptures, type ContextualCapture } from '../capture/contextualCapture';
import { ALL_PROMPTS } from '../prompts/definitions';

/**
 * Where every health question belongs (`V33-067`, v3.3 section K2).
 *
 * ## The gap this closes
 *
 * Five areas declared contextual-capture metadata and health was not one of them, so its
 * questions could not be planned, suppressed, expired or budgeted alongside everything
 * else. `planCoverage` walks `ALL_CONTEXTUAL_CAPTURES`; a domain absent from that list is
 * invisible to the orchestrator, which meant health questions were reachable only from
 * inside their own guide.
 *
 * ## Only what changes a decision
 *
 * Section K1 is explicit that metadata must not be added to make every move look
 * sophisticated, and the temptation here is real: health has more askable things than any
 * other area. Each declaration below has to name the decision it moves.
 *
 *   - **Hydration and hunger** are *prerequisites*. They decide whether the right answer is
 *     the move the owner came for or the small thing that has to happen first — which is
 *     `AT33-046`, and the only reason either is allowed to interrupt.
 *   - **Persistence** decides whether this is still the app's business at all. Something
 *     that has not shifted in weeks is the one health signal that should route to a person
 *     rather than to a move, and that is a change in what gets recommended, not a record.
 *
 * Everything else about health stays behind `Update this area` or an action follow-up.
 *
 * ## No diagnosis, by construction
 *
 * K2 forbids turning discomfort into medical inference. Nothing here can: every question
 * references a prompt from the catalogue, the catalogue validates itself against the
 * behaviour-first policy, and none of these prompts asks what something means. They ask
 * what happened. A capture has nowhere to write a question the policy would reject.
 */

export const HEALTH_CAPTURES: readonly ContextualCapture[] = [
  {
    /*
     * A prerequisite, not a health metric.
     *
     * Worth interrupting for precisely because the answer can replace the recommendation:
     * offering a focus block to somebody who has not had a drink since breakfast is
     * offering the second-best thing. The window is short because the answer goes stale
     * quickly — it is a fact about this afternoon, not about the owner.
     */
    id: 'health:hydration-prerequisite',
    domainId: 'health-recovery-energy',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    /*
     * Owned by Update This Area, and *also* triggerable.
     *
     * The owning surface is where the prompt lives, not the only place it can be raised.
     * Declaring `decision-episode` here removed `health:hydration` from the area's own
     * guide, because `planGuide` treats a prompt owned elsewhere as belonging elsewhere —
     * so a question that had always been part of opening the area silently vanished.
     * The trigger is what lets the episode raise it; the ownership is what keeps it in the
     * one place the owner already knows to look.
     */
    owningSurface: 'update-this-area',
    promptId: 'health:hydration',
    eligibleGuides: [],
    triggers: [
      'Energy is low and the move being considered needs sustained attention',
      'A recovery move is about to be recommended and a simpler prerequisite may come first',
    ],
    parentingContext: undefined,
    privacy: 'health',
    excludedContexts: ['sleep', 'commute'],
    freshnessHours: 4,
    duplicateSuppression: 'One hydration reading per half-day',
    cooldownHours: 4,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: 6,
    canAffectCurrentDecision: true,
  },
  {
    /* The same argument as hydration, and the other half of `AT33-046`. */
    id: 'health:hunger-prerequisite',
    domainId: 'health-recovery-energy',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    owningSurface: 'update-this-area',
    promptId: 'health:food-need',
    eligibleGuides: [],
    triggers: [
      'A move needing concentration is being considered and hunger would undermine it',
      'The owner declined something because they were hungry',
    ],
    parentingContext: undefined,
    privacy: 'health',
    excludedContexts: ['sleep', 'commute'],
    freshnessHours: 3,
    duplicateSuppression: 'One hunger reading per meal window',
    cooldownHours: 3,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: 5,
    canAffectCurrentDecision: true,
  },
  {
    /*
     * The one health question whose answer can route away from the product entirely.
     *
     * Deliberately not guide-eligible and deliberately slow: asking weekly whether
     * something has persisted is a reasonable thing to wonder and a terrible thing to be
     * asked every morning.
     */
    id: 'health:persistence-check',
    domainId: 'health-recovery-energy',
    recordFamily: 'observation',
    captureClass: 'triggered-domain-question',
    owningSurface: 'update-this-area',
    promptId: 'health:persistence',
    eligibleGuides: [],
    triggers: [
      'The same physical interference has been recorded across several days',
      'A recovery move has been offered repeatedly without the reading changing',
    ],
    parentingContext: undefined,
    privacy: 'health',
    excludedContexts: ['sleep', 'commute', 'family'],
    freshnessHours: 72,
    duplicateSuppression: 'One persistence reading per three days',
    cooldownHours: 48,
    repeatedSkip: 'stop-offering',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: undefined,
    followUpWindowHours: undefined,
    expiresAfterHours: undefined,
    canAffectCurrentDecision: true,
  },
  {
    /* Follows a movement suggestion that was actually started. */
    id: 'health:movement-follow-up',
    domainId: 'health-recovery-energy',
    recordFamily: 'observation',
    captureClass: 'action-follow-up',
    owningSurface: 'update-this-area',
    promptId: 'health:movement-after',
    eligibleGuides: [],
    triggers: ['A movement move was carried out and its window has closed'],
    parentingContext: undefined,
    privacy: 'health',
    excludedContexts: ['sleep'],
    freshnessHours: 0,
    duplicateSuppression: 'One follow-up per execution',
    cooldownHours: 0,
    repeatedSkip: 'back-off',
    skipWritesNothing: true,
    offersUnsure: true,
    linkedAction: 'move-body',
    followUpWindowHours: 3,
    expiresAfterHours: 12,
    canAffectCurrentDecision: false,
  },
  {
    /* The deliberate route. Owner-initiated, so nothing here interrupts. */
    id: 'health:update-area',
    domainId: 'health-recovery-energy',
    recordFamily: 'observation',
    captureClass: 'update-this-area',
    owningSurface: 'update-this-area',
    promptId: 'update-area:health-recovery-energy',
    eligibleGuides: [],
    triggers: ['The owner opened this area'],
    parentingContext: undefined,
    privacy: 'health',
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
  HEALTH_CAPTURES,
  new Set(ALL_PROMPTS.map((prompt) => prompt.promptId)),
);
