import type { CapabilityChannel } from '../capabilities';
import type { LifeCategory } from '../records/categories';
import type { PrivacyClass } from '../records/envelope';

/**
 * The approved domains, as **metadata only** (Prompt 8A task 1, Blueprint §9).
 *
 * This file describes seven domains. It implements none of them. That distinction is
 * the whole of Prompt 8A: a domain definition says what a domain would read, what it
 * would classify its content as, and which capability channels it touches — and
 * nothing here generates a candidate, renders a panel, or creates a record family.
 *
 * ## Why every domain is disabled by default
 *
 * A definition is not an implementation. Enabling a domain before its slice exists
 * would put an empty panel in front of the owner and call it a feature. Each slice
 * (Prompts 8B–8H) enables its own domain when it has something to say, and until then
 * `Direction` shows exactly what it showed before this file existed.
 *
 * That is also what makes the framework removable: delete this directory and the
 * canonical records, the engine, and every surface keep working, because nothing
 * downstream *requires* a domain to exist.
 *
 * ## Why domains are not categories
 *
 * `LifeCategory` is the vocabulary canonical records are filed under, and it stays
 * small — Phase 7 activates categories one at a time through their own contracts. A
 * domain is a **reading** of those records for one area of life. Several domains may
 * read the same category, and one domain may read several, which is why a domain is
 * not simply a fourth category.
 */

export const DOMAIN_IDS = [
  'health-recovery-energy',
  'career-and-learning',
  'fatherhood',
  'emotional-and-relationships',
  'faith-and-meaning',
  'home-and-environment',
  'money',
] as const;
export type DomainId = (typeof DOMAIN_IDS)[number];

export interface DomainDefinition {
  readonly id: DomainId;
  readonly label: string;
  /** The decision question this domain exists to answer. */
  readonly question: string;
  /** Categories whose canonical records this domain reads. It creates no store. */
  readonly reads: readonly LifeCategory[];
  /** Default sensitivity for content this domain captures (`OWN-070`). */
  readonly privacy: PrivacyClass;
  /** Channels this domain's actions typically touch. Evidence routing, not a score. */
  readonly channels: readonly CapabilityChannel[];
  /** Legacy capabilities this domain inherits, for the Phase 9 traceability map. */
  readonly legacyIds: readonly string[];
  /** The prompt that owns updating this area (`XDS-034`). */
  readonly updatePromptId: string;
  /**
   * The prefix this domain's own prompts and captures use.
   *
   * Prompt ownership is derived from the id, so a namespace is how a slice claims its
   * questions without a second list to keep in step. `undefined` until a slice
   * activates the domain and defines what it asks.
   */
  readonly captureNamespace?: string | undefined;
  /** Which prompt slice activates it. Nothing enables a domain before then. */
  readonly activatedBy: string;
  /** Boundaries the slice must not cross, carried from the Blueprint. */
  readonly notBuilt: readonly string[];
}

/**
 * The seven approved domains.
 *
 * `reads` is limited to categories that actually exist today. A domain whose category
 * is not yet activated reads nothing and says so, rather than naming a category the
 * record model would reject.
 */
export const DOMAIN_DEFINITIONS: Record<DomainId, DomainDefinition> = {
  'health-recovery-energy': {
    id: 'health-recovery-energy',
    label: 'Health, recovery, and energy',
    question: 'What is my capacity today, and what protects it?',
    /*
     * Both, on purpose. `health-recovery-energy` is where sleep, pain, food, and
     * movement are filed from Prompt 8B onwards; `time-attention-capacity` is where
     * they were filed before it existed, and nothing recorded then is stranded.
     */
    reads: ['health-recovery-energy', 'time-attention-capacity'],
    privacy: 'health',
    captureNamespace: 'health',
    channels: ['energy-and-recovery', 'focus-and-clarity', 'emotional-regulation'],
    legacyIds: ['LEG-090', 'LEG-091', 'LEG-092', 'LEG-096', 'LEG-097', 'LEG-100'],
    updatePromptId: 'update-area:health-recovery-energy',
    activatedBy: 'Prompt 8B',
    notBuilt: [
      'workout programming',
      'diagnosis or treatment claims',
      'calorie or macro tracking',
    ],
  },
  'career-and-learning': {
    id: 'career-and-learning',
    label: 'Career and learning',
    question: 'What is the exact next step, and what is blocking it?',
    reads: ['career-work-learning'],
    privacy: 'workplace',
    channels: ['learning-and-capability', 'follow-through', 'confidence-and-courage'],
    legacyIds: ['LEG-059', 'LEG-060', 'LEG-061', 'LEG-062', 'LEG-063', 'LEG-064'],
    updatePromptId: 'update-area:career-and-learning',
    captureNamespace: 'career',
    activatedBy: 'Prompt 8C',
    notBuilt: ['course-content hosting', 'a second task board'],
  },
  fatherhood: {
    id: 'fatherhood',
    label: 'Fatherhood',
    question: 'What did I practise, and what did I notice?',
    reads: [],
    privacy: 'child',
    channels: ['connection-and-relationships', 'purpose-and-values-alignment'],
    legacyIds: ['LEG-073', 'LEG-075', 'LEG-076', 'LEG-078', 'LEG-079', 'LEG-081'],
    updatePromptId: 'update-area:fatherhood',
    activatedBy: 'Prompt 8D',
    notBuilt: ['any child score', 'a percentage for connection or safety'],
  },
  'emotional-and-relationships': {
    id: 'emotional-and-relationships',
    label: 'Emotional state and relationships',
    question: 'What is interfering, and what connection is available?',
    reads: ['time-attention-capacity'],
    privacy: 'relationship',
    channels: [
      'emotional-regulation',
      'connection-and-relationships',
      'confidence-and-courage',
    ],
    legacyIds: ['LEG-111', 'LEG-112', 'LEG-115', 'LEG-116', 'LEG-117'],
    updatePromptId: 'update-area:emotional-and-relationships',
    activatedBy: 'Prompt 8E',
    notBuilt: ['therapy', 'diagnosis', 'a contact CRM', 'message automation'],
  },
  'faith-and-meaning': {
    id: 'faith-and-meaning',
    label: 'Faith and meaning',
    question: 'Where am I acting in line with what I say matters?',
    reads: ['direction-and-commitments'],
    privacy: 'faith',
    channels: ['purpose-and-values-alignment', 'emotional-regulation'],
    legacyIds: ['LEG-084', 'LEG-086', 'LEG-087', 'LEG-089'],
    updatePromptId: 'update-area:faith-and-meaning',
    activatedBy: 'Prompt 8F',
    notBuilt: [
      'any claim of divine command, punishment, or blessing',
      'a faith or spiritual-maturity score',
    ],
  },
  'home-and-environment': {
    id: 'home-and-environment',
    label: 'Home and environment',
    question: 'What friction is repeatedly in the way?',
    reads: ['time-attention-capacity'],
    privacy: 'general',
    channels: ['environmental-ease', 'focus-and-clarity'],
    legacyIds: ['LEG-121', 'LEG-123', 'LEG-124'],
    updatePromptId: 'update-area:home-and-environment',
    activatedBy: 'Prompt 8G',
    notBuilt: ['a cleanliness score', 'a chore manager', 'a calendar', 'a task platform'],
  },
  money: {
    id: 'money',
    label: 'Money',
    question: 'What is the pressure, and what would reduce it?',
    reads: ['direction-and-commitments'],
    privacy: 'money',
    channels: ['financial-freedom-and-resilience', 'emotional-regulation'],
    legacyIds: ['LEG-067', 'LEG-068', 'LEG-069', 'LEG-070'],
    updatePromptId: 'update-area:money',
    activatedBy: 'Prompt 8H',
    notBuilt: [
      'transaction, bill, debt, credit, or portfolio machinery unless separately activated',
    ],
  },
};

export const DOMAIN_LIST: readonly DomainDefinition[] = DOMAIN_IDS.map(
  (id) => DOMAIN_DEFINITIONS[id],
);

export function isDomainId(value: unknown): value is DomainId {
  return typeof value === 'string' && (DOMAIN_IDS as readonly string[]).includes(value);
}

export function domainDefinition(id: DomainId): DomainDefinition {
  return DOMAIN_DEFINITIONS[id];
}
