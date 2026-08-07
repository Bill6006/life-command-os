import type { CanonicalRecord, LifeCategory, ProtectedContext } from '../domain/records';

/**
 * Deterministic synthetic scenarios (Prompt 5 task 18).
 *
 * These are **records, not view models**. The engine computes every conclusion from
 * them, so nothing here can put words in the interface's mouth — which is the
 * difference between this and the Phase 3 prototype it replaces.
 *
 * The same module feeds the scenario harness and the owner preview, deliberately:
 * what the owner sees on their phone is exactly what the tests assert.
 *
 * All values are neutral and synthetic (`PRIV-002`). Every instant is derived from a
 * fixed anchor, so a scenario produces identical records on every run.
 */

const ANCHOR = Date.parse('2026-01-05T17:58:00.000Z'); // A Monday.
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function id(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function at(offsetMs: number): string {
  return new Date(ANCHOR + offsetMs).toISOString();
}

const LOCAL = { localIso: '2026-01-05T17:58:00', timeZone: 'UTC', utcOffsetMinutes: 0 };

let counter = 0;
function nextId(): string {
  counter += 1;
  return id(counter);
}

function envelope(recordType: string, occurredMs: number, recordedMs = occurredMs) {
  return {
    recordId: nextId(),
    recordType,
    schemaVersion: 1,
    occurredAt: at(occurredMs),
    recordedAt: at(recordedMs),
    localTime: LOCAL,
  };
}

const OBSERVED = { source: 'user-entry', provenance: { method: 'direct-report' } } as const;

function focusBlock(
  minutes: number,
  occurredMs: number,
  recordedMs = occurredMs,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs, recordedMs),
    ...OBSERVED,
    category: 'career-work-learning',
    attribute: 'focused-block-minutes',
    value: { kind: 'duration', minutes },
  } as unknown as CanonicalRecord;
}

function context(
  options: {
    readonly minutes?: number | undefined;
    readonly capacity?: 'depleted' | 'low' | 'moderate' | 'high' | undefined;
    readonly protectedContexts?: readonly ProtectedContext[];
    readonly occurredMs?: number;
  } = {},
): CanonicalRecord {
  const occurredMs = options.occurredMs ?? -2 * MINUTE;
  return {
    ...envelope('context-snapshot', occurredMs),
    ...OBSERVED,
    capacity:
      options.capacity === undefined
        ? { status: 'unknown', reason: 'Not reported' }
        : { status: 'known', value: options.capacity },
    availableMinutes:
      options.minutes === undefined
        ? { status: 'unknown', reason: 'Calendar not available' }
        : { status: 'known', value: options.minutes },
    protectedContexts: [...(options.protectedContexts ?? [])],
  } as unknown as CanonicalRecord;
}

function goal(statement: string, category: LifeCategory, agedDays: number): CanonicalRecord {
  return {
    ...envelope('goal', -agedDays * DAY),
    ...OBSERVED,
    statement,
    category,
    state: 'active',
  } as unknown as CanonicalRecord;
}

function commitment(
  statement: string,
  category: LifeCategory,
  state: string,
  nonNegotiable: boolean,
  requiresProtectedContext?: ProtectedContext,
): CanonicalRecord {
  return {
    ...envelope('commitment', -3 * DAY),
    ...OBSERVED,
    statement,
    category,
    state,
    nonNegotiable,
    ...(requiresProtectedContext === undefined ? {} : { requiresProtectedContext }),
  } as unknown as CanonicalRecord;
}

/**
 * An owner decision to switch an area of life on, off, or down.
 *
 * A preference, never content: it says which areas are readable, and every fact those
 * areas display still comes from the shared records above.
 */
function domainPreference(
  domainId: string,
  state: 'enabled' | 'deprioritised' | 'disabled',
  reason?: string,
): CanonicalRecord {
  return {
    ...envelope('domain-preference', -2 * DAY),
    ...OBSERVED,
    domainId,
    state,
    ...(reason === undefined ? {} : { reason }),
  } as unknown as CanonicalRecord;
}

/** An anchored health reading — the same scales the guides collect. */
function healthScale(
  scaleId: 'physical-energy' | 'mental-energy' | 'pain-interference' | 'sleep-recovery',
  ordinal: number,
  label: string,
  occurredMs = -30 * MINUTE,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'health',
    category: 'health-recovery-energy',
    attribute: `state:${scaleId}`,
    value: { kind: 'anchored-scale', scaleId, scaleVersion: 1, ordinal, label },
  } as unknown as CanonicalRecord;
}

/** A plain health answer, such as hydration or how long something has been going on. */
function healthState(
  attribute: string,
  state: string,
  occurredMs = -30 * MINUTE,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'health',
    category: 'health-recovery-energy',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/** A career observation — the shared observation family, filed under career. */
function careerState(
  attribute: string,
  state: string,
  occurredMs = -2 * HOUR,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'workplace',
    category: 'career-work-learning',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

function careerNote(attribute: string, text: string, occurredMs = -2 * HOUR): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'workplace',
    category: 'career-work-learning',
    attribute,
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

function retrieval(ordinal: number, label: string, occurredMs = -2 * HOUR): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'workplace',
    category: 'career-work-learning',
    attribute: 'state:retrieval-strength',
    value: {
      kind: 'anchored-scale',
      scaleId: 'retrieval-strength',
      scaleVersion: 1,
      ordinal,
      label,
    },
  } as unknown as CanonicalRecord;
}

/** A Work Win — one canonical event, projected to six surfaces and copied to none. */
function workWin(text: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'workplace',
    category: 'career-work-learning',
    attribute: 'capture:career-and-learning:work-win',
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

/** A claim the owner would make. Carries no assertion that it is true. */
function claim(
  statement: string,
  topic: string,
  supportingRecordIds: readonly string[] = [],
): CanonicalRecord {
  return {
    ...envelope('skill-claim', -5 * DAY),
    ...OBSERVED,
    privacy: 'workplace',
    statement,
    topic,
    intendedUse: 'interview',
    supportingRecordIds: [...supportingRecordIds],
    state: 'active',
  } as unknown as CanonicalRecord;
}

/* --- Prompt 8D: fatherhood ------------------------------------------------ */

/**
 * A fatherhood observation.
 *
 * Every one of these is about the **father** — what he did, what he saw. Her recorded
 * status is a separate family entirely, built by `milestone()` below, and no helper
 * here can write both.
 */
function fatherState(attribute: string, state: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'child',
    category: 'fatherhood-and-child',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/** One skill reading, on the support ladder. */
function skill(skillId: string, levelLabel: string, occurredMs = -1 * DAY): CanonicalRecord {
  return fatherState(`father:skill:${skillId}`, levelLabel, occurredMs);
}

/**
 * One milestone answer, against a named list at a named version.
 *
 * Never superseded: an answer of "not yet" in one month and "yes" in the next are both
 * true, and the change between them is the only developmental information in the pair.
 */
function milestone(
  milestoneId: string,
  status: string,
  occurredMs = -10 * DAY,
): CanonicalRecord {
  return {
    ...envelope('milestone-observation', occurredMs),
    ...OBSERVED,
    privacy: 'child',
    milestoneId,
    checklistSource: 'General guidance (built in)',
    checklistVersion: '2026-08',
    status,
  } as unknown as CanonicalRecord;
}

/** A moment the owner chose to keep, through Quick Capture. */
function moment(text: string, occurredMs = -2 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'child',
    category: 'fatherhood-and-child',
    attribute: 'capture:fatherhood:a-moment-with-my-daughter',
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

/* --- Prompt 8E: emotional state, social, and relationships ---------------- */

/** One emotional observation. Never about a named person — there is no field for one. */
function emotionalState(
  attribute: string,
  state: string,
  occurredMs = -1 * DAY,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'relationship',
    category: 'emotional-and-relationships',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

function emotionalNote(
  attribute: string,
  text: string,
  occurredMs = -1 * DAY,
  privacy: 'relationship' | 'private-pattern' = 'relationship',
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy,
    category: 'emotional-and-relationships',
    attribute,
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

/** A loneliness reading, on the shared anchored scale. */
function loneliness(ordinal: number, label: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'relationship',
    category: 'emotional-and-relationships',
    attribute: 'state:loneliness',
    value: {
      kind: 'anchored-scale',
      scaleId: 'loneliness',
      scaleVersion: 1,
      ordinal,
      label,
    },
  } as unknown as CanonicalRecord;
}

/* --- Prompt 8F: faith and meaning ----------------------------------------- */

/** Something the owner named. Synthetic and deliberately neutral. */
function faithAnchor(
  kind: 'value' | 'purpose' | 'practice',
  statement: string,
  occurredMs = -30 * DAY,
  state: 'active' | 'retired' = 'active',
): CanonicalRecord {
  return {
    ...envelope('faith-anchor', occurredMs),
    ...OBSERVED,
    privacy: 'faith',
    kind,
    statement,
    state,
  } as unknown as CanonicalRecord;
}

/** One occasion, pointing at the practice it belongs to. */
function faithOccasion(
  practiceRecordId: string,
  outcome: string,
  occurredMs = -1 * DAY,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    source: 'user-entry',
    provenance: { method: 'direct-report', derivedFromRecordIds: [practiceRecordId] },
    privacy: 'faith',
    category: 'faith-and-meaning',
    attribute: 'faith:practice-done',
    value: { kind: 'state', state: outcome },
  } as unknown as CanonicalRecord;
}

function faithState(attribute: string, state: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'faith',
    category: 'faith-and-meaning',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

function faithNote(attribute: string, text: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'faith',
    category: 'faith-and-meaning',
    attribute,
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

/* --- Prompt 8G: home and environment -------------------------------------- */

/** One thing that got in the way, with the activity it interrupted when known. */
function homeFriction(
  label: string,
  purpose: string | undefined,
  occurredMs = -1 * DAY,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'general',
    category: 'home-and-environment',
    attribute: purpose === undefined ? 'home:friction' : `home:friction:${purpose}`,
    value: { kind: 'state', state: label },
  } as unknown as CanonicalRecord;
}

function homeState(attribute: string, state: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'general',
    category: 'home-and-environment',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

function homeNote(attribute: string, text: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'general',
    category: 'home-and-environment',
    attribute,
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

/* --- Prompt 8H: money ------------------------------------------------------ */

const PRESSURE_ANCHORS = [
  'None right now',
  'A bit',
  'Noticeable',
  'Heavy',
  'Constant',
] as const;

function moneyPressure(ordinal: number, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    category: 'money',
    attribute: 'state:financial-pressure',
    value: {
      kind: 'anchored-scale',
      scaleId: 'financial-pressure',
      scaleVersion: 1,
      ordinal,
      label: PRESSURE_ANCHORS[ordinal - 1],
    },
  } as unknown as CanonicalRecord;
}

function moneyState(attribute: string, state: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    category: 'money',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

function moneyNote(attribute: string, text: string, occurredMs = -1 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    category: 'money',
    attribute,
    value: { kind: 'note', text },
  } as unknown as CanonicalRecord;
}

function moneyFigure(
  attribute: string,
  amount: number,
  occurredMs = -1 * DAY,
): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    category: 'money',
    attribute,
    value: { kind: 'quantity', amount, unit: 'towards it' },
  } as unknown as CanonicalRecord;
}

function moneyPurpose(statement: string, occurredMs = -30 * DAY): CanonicalRecord {
  return {
    ...envelope('goal', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    statement,
    category: 'money',
    state: 'active',
  } as unknown as CanonicalRecord;
}

function figuresOn(occurredMs = -20 * DAY): CanonicalRecord {
  return {
    ...envelope('observation', occurredMs),
    ...OBSERVED,
    privacy: 'money',
    category: 'money',
    attribute: 'privacy:topic-enabled:money-figures',
    value: { kind: 'state', state: 'On' },
  } as unknown as CanonicalRecord;
}

function star(): CanonicalRecord {
  return {
    ...envelope('north-star', -30 * DAY),
    ...OBSERVED,
    statement: 'Build durable capability without burning out',
  } as unknown as CanonicalRecord;
}

/** Three declining weeks of focus, so the trajectory rule has something to work on. */
function decliningWeeks(): CanonicalRecord[] {
  return [
    focusBlock(120, -21 * DAY),
    focusBlock(90, -20 * DAY),
    focusBlock(120, -14 * DAY),
    focusBlock(60, -13 * DAY),
    focusBlock(90, -7 * DAY),
    focusBlock(30, -6 * DAY),
  ];
}

function steadyWeeks(): CanonicalRecord[] {
  return [
    focusBlock(120, -21 * DAY),
    focusBlock(90, -20 * DAY),
    focusBlock(115, -14 * DAY),
    focusBlock(95, -13 * DAY),
    focusBlock(120, -7 * DAY),
    focusBlock(90, -6 * DAY),
  ];
}

/* -------------------------------------------------------------------------- */
/* Phase 5 builders — the loop from recommendation through outcome             */
/* -------------------------------------------------------------------------- */

const DERIVED = {
  source: 'system-derived',
  provenance: { method: 'derived', derivedFromRecordIds: [id(1)] },
} as const;

const CONFIDENCE = {
  label: 'early-signal',
  dimensions: [{ dimension: 'comparable-evidence-volume', assessment: 'supports' }],
  basisRecordIds: [id(1)],
} as const;

function recommendation(occurredMs: number): CanonicalRecord {
  return {
    ...envelope('recommendation', occurredMs),
    ...DERIVED,
    output: { kind: 'action', candidateActionRecordId: id(9001) },
    confidence: CONFIDENCE,
    reasonTrace: ['A window was open and the goal had not moved'],
    consideredCandidateActionIds: [id(9001), id(9002)],
    whatChanged: ['A window opened'],
  } as unknown as CanonicalRecord;
}

function execution(
  recommendationRecordId: string,
  state: 'executed' | 'partially-executed' | 'not-executed' | 'unknown-execution',
  occurredMs: number,
): CanonicalRecord {
  const window = { start: at(occurredMs), end: at(occurredMs + 25 * MINUTE) };
  return {
    ...envelope('execution', occurredMs),
    ...OBSERVED,
    recommendationRecordId,
    state,
    ...(state === 'executed' || state === 'partially-executed'
      ? { executedWindow: window }
      : {}),
    ...(state === 'not-executed' ? { declineReason: 'Could not now' } : {}),
  } as unknown as CanonicalRecord;
}

function outcome(
  executionRecordId: string,
  direction: 'improved' | 'unchanged' | 'worsened' | 'mixed',
  occurredMs: number,
  resolved = true,
): CanonicalRecord {
  const observationId = id(9100);
  return {
    ...envelope('outcome', occurredMs),
    ...OBSERVED,
    category: 'career-work-learning',
    target: 'Focused hours by the end of this week',
    outcomeWindow: { start: at(occurredMs - 7 * DAY), end: at(occurredMs) },
    result: resolved
      ? {
          status: 'known',
          value: { summary: `Focused hours ${direction}`, direction },
        }
      : { status: 'unresolved', awaiting: 'The week to finish' },
    observationRecordIds: resolved ? [observationId] : [],
    executionRecordId,
  } as unknown as CanonicalRecord;
}

function forecastRecord(
  direction: 'improving' | 'stable' | 'declining' | 'mixed',
  occurredMs: number,
  horizonEndMs: number,
): CanonicalRecord {
  return {
    ...envelope('untreated-forecast', occurredMs),
    ...DERIVED,
    category: 'career-work-learning',
    target: 'Focused hours by the end of this week',
    horizon: { start: at(occurredMs), end: at(horizonEndMs) },
    projection: {
      status: 'known',
      value: { summary: `Focused hours ${direction}`, direction },
    },
    assumptions: ['Current commitments hold'],
    uncertainty: 'Three weeks of comparable evidence only.',
    confidence: CONFIDENCE,
    reasonTrace: ['Persistence from the observed trajectory'],
  } as unknown as CanonicalRecord;
}

function weeklyDirection(
  statement: string,
  response: 'confirmed' | 'rejected' | undefined,
  occurredMs: number,
): CanonicalRecord {
  return {
    ...envelope('weekly-direction', occurredMs),
    ...DERIVED,
    weekWindow: { start: at(occurredMs), end: at(occurredMs + 7 * DAY) },
    proposal: { kind: 'focus', statement, categories: ['career-work-learning'] },
    userResponse:
      response === undefined
        ? { status: 'unresolved', awaiting: 'user confirmation' }
        : { status: 'known', value: response === 'rejected' ? { response } : { response } },
    confidence: CONFIDENCE,
    reasonTrace: ['Focused hours declined for three weeks'],
  } as unknown as CanonicalRecord;
}

/** One complete episode: recommended, carried out, observed. */
function closedLoop(
  dayOffset: number,
  state: 'executed' | 'partially-executed' | 'not-executed' | 'unknown-execution',
  direction: 'improved' | 'unchanged' | 'worsened' | 'mixed',
  options: { readonly withOutcome?: boolean } = {},
): CanonicalRecord[] {
  const recommendedAt = -dayOffset * DAY;
  const rec = recommendation(recommendedAt);
  const exec = execution(
    (rec as unknown as { recordId: string }).recordId,
    state,
    recommendedAt + HOUR,
  );
  const records: CanonicalRecord[] = [rec, exec];

  if (options.withOutcome !== false) {
    records.push(
      outcome(
        (exec as unknown as { recordId: string }).recordId,
        direction,
        recommendedAt + 8 * DAY,
      ),
    );
  }
  return records;
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  /** What this scenario is testing, in the owner's terms. */
  readonly description: string;
  readonly nowIso: string;
  readonly records: readonly CanonicalRecord[];
}

/**
 * A situation observation — where the owner is, and what that allows (`V33-023`).
 *
 * Filed as `general` because none of it is sensitive: the room you are in is not a
 * health fact, and treating it as one would put ordinary context behind a permission.
 */
function situationState(attribute: string, state: string): CanonicalRecord {
  return {
    ...envelope('observation', -20 * MINUTE),
    ...OBSERVED,
    privacy: 'general',
    category: 'time-attention-capacity',
    attribute,
    value: { kind: 'state', state },
  } as unknown as CanonicalRecord;
}

/**
 * The situation every scenario assumes unless it says otherwise.
 *
 * At home, nothing in particular on, able to step away and speak freely — the condition
 * under which the largest number of moves are possible, so a scenario that expects a
 * recommendation gets one for reasons to do with what it is testing rather than with an
 * unrelated gap in its context.
 *
 * A scenario that is *about* an unknown or constrained situation records its own values
 * and these are skipped. That is the point of merging by attribute rather than appending.
 */
const DEFAULT_SITUATION: readonly CanonicalRecord[] = [
  situationState('context:setting', 'Home'),
  situationState('context:engagement', 'Nothing in particular'),
  situationState('context:interruptibility', 'Yes, freely'),
  situationState('context:privacy', 'Yes'),
];

function build(
  scenarioId: string,
  name: string,
  description: string,
  records: readonly CanonicalRecord[],
  nowOffsetMs = 0,
  /**
   * Set false where a *known* situation would falsify the premise.
   *
   * `return-after-absence` is the case: three weeks with nothing recorded, and a set of
   * twenty-minute-old context observations would make the profile look freshly active.
   * It would also be untrue — after a gap the app genuinely does not know where you are.
   */
  assumeSituation = true,
): Scenario {
  if (!assumeSituation) {
    return { id: scenarioId, name, description, nowIso: at(nowOffsetMs), records };
  }
  const declared = new Set(
    records.flatMap((record) => {
      const attribute = (record as { attribute?: string }).attribute;
      return attribute === undefined ? [] : [attribute];
    }),
  );
  const situation = DEFAULT_SITUATION.filter((record) => {
    const attribute = (record as unknown as { attribute: string }).attribute;
    return !declared.has(attribute);
  });

  return {
    id: scenarioId,
    name,
    description,
    nowIso: at(nowOffsetMs),
    records: [...situation, ...records],
  };
}

/**
 * Built once, eagerly, so identifiers are stable across calls. Rebuilding on demand
 * would renumber records and make "the same scenario" quietly untrue.
 */
export const SCENARIOS: readonly Scenario[] = [
  build(
    'action',
    'A window opens',
    'A goal has not moved for eleven days and forty minutes just came free. Expect one best move.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'cold-start',
    'Cold start',
    'Nothing recorded at all. Expect an honest "not enough yet" — and no questionnaire, no domain ranking, no request to declare what matters most.',
    [],
  ),

  build(
    'sparse-evidence',
    'Sparse evidence',
    'One observation and nothing else. Expect abstention rather than a confident-sounding guess.',
    [context({ minutes: 30, capacity: 'moderate' }), focusBlock(25, -2 * DAY)],
  ),

  build(
    'stale-evidence',
    'Stale evidence',
    'The context snapshot is nine hours old. Expect it to be marked stale and confidence to drop.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 40, capacity: 'moderate', occurredMs: -9 * HOUR }),
    ],
  ),

  build(
    'contradictory-evidence',
    'Contradictory evidence',
    'Two credible records disagree about the same day. Expect the conflict to be surfaced, not resolved.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      focusBlock(45, -6 * DAY, -5 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'protected-time',
    'Protected time',
    'The evening is protected and non-negotiable. Expect every focus action to be removed before ranking, and deliberate silence.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      commitment('Family block', 'time-attention-capacity', 'scheduled', true, 'family'),
      context({ minutes: 40, capacity: 'moderate', protectedContexts: ['family'] }),
    ],
  ),

  build(
    'overload',
    'Overload',
    'Capacity is depleted and only twelve minutes are free. Expect a recovery pause or silence — never a push to do more.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      commitment('Commitment Two', 'career-work-learning', 'active', false),
      commitment('Commitment Three', 'direction-and-commitments', 'active', false),
      context({ minutes: 12, capacity: 'depleted' }),
    ],
  ),

  build(
    'silence',
    'Deliberate silence',
    'Twelve minutes before a non-negotiable commitment. Nothing fits. Expect silence as a conclusion, with its reasoning.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 12, capacity: 'moderate' }),
    ],
  ),

  build(
    'one-question',
    'One valuable question',
    'Candidates exist but free time is unknown. Expect exactly one question — the one that changes which actions are eligible.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ capacity: 'moderate' }),
    ],
  ),

  build(
    'stable-state',
    'Stable state',
    'Focused hours are holding steady. Expect a stable trajectory and a quiet week rather than a manufactured push.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 2),
      ...steadyWeeks(),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'competing-commitments',
    'Competing commitments',
    'Two commitments want the same window and one is blocked. Expect internal comparison — and still exactly one output.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      commitment('Commitment Two', 'career-work-learning', 'blocked', false),
      commitment('Commitment Three', 'direction-and-commitments', 'waiting', false),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'mixed-effects',
    'Mixed effects',
    'The action consumes the whole window with no margin before protected time. Expect a benefit and a real cost, shown together.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      commitment('Family block', 'time-attention-capacity', 'scheduled', true),
      context({ minutes: 28, capacity: 'moderate' }),
    ],
  ),

  build(
    'material-change',
    'Material change',
    'A commitment completed twenty minutes ago and freed the window. Expect the answer to move, and the explanation to say why.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 8, capacity: 'moderate', occurredMs: -3 * HOUR }),
      // Newest cluster: the change that moved the answer.
      context({ minutes: 40, capacity: 'moderate', occurredMs: -20 * MINUTE }),
    ],
  ),

  build(
    'changed-context',
    'Changed context',
    'The working pattern changed three days ago. Expect older weeks to be treated as less comparable.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      {
        ...envelope('life-context-change', -3 * DAY),
        ...OBSERVED,
        summary: 'Working pattern changed to four longer days',
        affectedCategories: ['time-attention-capacity', 'career-work-learning'],
        effectiveFrom: at(-3 * DAY),
      } as unknown as CanonicalRecord,
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'weekly-direction',
    'Weekly direction',
    'A declining category with capacity to spare. Expect one proposed direction the user can confirm, adjust, or reject.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 40, capacity: 'high' }),
    ],
  ),

  /* --- Phase 5: the learning loop ---------------------------------------- */

  build(
    'learning-loop',
    'A belief forms',
    'Four recommendations carried out and observed, none confounded. Expect the confidence ceiling to lift — this is the only way it can.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 2),
      ...decliningWeeks(),
      ...closedLoop(40, 'executed', 'improved'),
      ...closedLoop(32, 'executed', 'improved'),
      ...closedLoop(24, 'executed', 'improved'),
      ...closedLoop(16, 'executed', 'improved'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'declined',
    'A recommendation declined',
    'The user said "cannot now". Expect unresolved — declining is never evidence that the advice was poor.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      ...closedLoop(10, 'not-executed', 'unchanged'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'partial-execution',
    'Partly carried out',
    'Done in reduced form. Expect the dose uncertainty to count as confounding rather than being ignored.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      ...closedLoop(12, 'partially-executed', 'improved'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'missing-outcome',
    'Outcome never arrived',
    'Carried out, window long closed, nothing observed. Expect unresolved — absence is never counted against the recommendation.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      ...closedLoop(30, 'executed', 'improved', { withOutcome: false }),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'misleading-correlation',
    'A tempting coincidence',
    'The outcome improved — but two actions ran in the same window and circumstances changed. Expect the engine to refuse to call it supported.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      ...closedLoop(14, 'executed', 'improved'),
      ...closedLoop(14, 'executed', 'improved'),
      {
        ...envelope('life-context-change', -13 * DAY),
        ...OBSERVED,
        summary: 'Started a quieter project',
        affectedCategories: ['career-work-learning'],
        effectiveFrom: at(-13 * DAY),
      } as unknown as CanonicalRecord,
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'context-change-learning',
    'Circumstances changed',
    'A belief had formed, then the working pattern changed. Expect it suspended rather than deleted — the evidence was real, it is just no longer comparable.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 2),
      ...decliningWeeks(),
      ...closedLoop(40, 'executed', 'improved'),
      ...closedLoop(32, 'executed', 'improved'),
      ...closedLoop(24, 'executed', 'improved'),
      {
        ...envelope('life-context-change', -5 * DAY),
        ...OBSERVED,
        summary: 'Working pattern changed to four longer days',
        affectedCategories: ['time-attention-capacity', 'career-work-learning'],
        effectiveFrom: at(-5 * DAY),
      } as unknown as CanonicalRecord,
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'forecast-accuracy',
    'Forecast checked',
    'One forecast said declining and the week worsened; another has not closed. Expect accuracy reported separately from whether any advice helped.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      forecastRecord('declining', -14 * DAY, -7 * DAY),
      forecastRecord('improving', -2 * DAY, 5 * DAY),
      ...closedLoop(13, 'executed', 'worsened'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'weekly-continuity',
    'Week compared with last',
    'Last week proposed a direction and it was confirmed and acted on. Expect it carried forward, with no moral scoring either way.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 2),
      ...decliningWeeks(),
      // Proposed a fortnight ago, acted on since, and both outcome windows have
      // closed. Loops dated inside the window would still be unresolved — correctly.
      weeklyDirection('Protect two deep-work blocks', 'confirmed', -14 * DAY),
      ...closedLoop(12, 'executed', 'improved'),
      ...closedLoop(10, 'executed', 'improved'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'return-after-absence',
    'Returning after a gap',
    'Nothing recorded for three weeks. Expect no backlog and no guilt — just expired predictions and honestly lower confidence.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 30),
      focusBlock(90, -40 * DAY),
      focusBlock(60, -39 * DAY),
      commitment('Commitment Two', 'career-work-learning', 'blocked', false),
      forecastRecord('declining', -35 * DAY, -28 * DAY),
      context({ minutes: 40, capacity: 'moderate', occurredMs: -30 * DAY }),
    ],
    0,
    /* Nothing recorded for three weeks includes the situation. */
    false,
  ),

  /* --- Phase 7 Prompt 8A: the shared domain framework --------------------- */

  build(
    'domain-enabled',
    'One area switched on',
    'Career and learning turned on by the owner, and health deprioritised. Expect one full panel, one readable-and-silent panel, and a Now that has not changed at all.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('career-and-learning', 'enabled'),
      // Deprioritised has to be an area that exists, now that an area with no slice
      // behind it produces no panel at all.
      domainPreference('health-recovery-energy', 'deprioritised', 'Not this season'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'areas-all-off',
    'Nothing switched on',
    'A profile with records and no area enabled. Expect Manage Areas offering the two built areas, the five unbuilt ones named as unavailable, and no domain panel.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  /* --- Prompt 8B: Health, recovery, and energy ---------------------------- */

  build(
    'health-enabled',
    'Health switched on',
    'Health on, with ordinary readings and nothing wrong. Expect a full panel, a recovery chart, and no health move — silence is the normal case.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('sleep-recovery', 4, 'Good', -10 * HOUR),
      healthScale('sleep-recovery', 3, 'Mixed', -34 * HOUR),
      healthScale('physical-energy', 3, 'Functional'),
      healthScale('mental-energy', 3, 'Functional'),
      healthScale('pain-interference', 1, 'Not at all'),
      healthState('health:hydration', 'Plenty'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'health-constrained',
    'Something is in the way',
    'Something physical is significantly in the way today. Expect the smallest protective action and no opinion about what it is.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('pain-interference', 4, 'A lot'),
      healthState('health:persistence', 'Today only'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'health-persistent',
    'In the way for weeks',
    'The same interference, going on for weeks. Expect the app to stop having an opinion and say who might.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('pain-interference', 4, 'A lot'),
      healthState('health:persistence', 'Longer than a month'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'health-energy-split',
    'Body ahead of head',
    'Physical energy well ahead of mental. Expect movement rather than a focus block — the split is the only reason that is visible.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('physical-energy', 4, 'Good'),
      healthScale('mental-energy', 2, 'Low'),
      healthScale('pain-interference', 1, 'Not at all'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'health-contradictory',
    'Two health readings disagree',
    'Two recovery readings minutes apart, two steps apart. Expect the disagreement surfaced and confidence lowered, not a winner picked.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('sleep-recovery', 2, 'Poor', -30 * MINUTE),
      healthScale('sleep-recovery', 4, 'Good', -35 * MINUTE),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'health-stale',
    'Health evidence has gone stale',
    'The last health reading was three days ago. Expect it marked stale rather than trusted.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('health-recovery-energy', 'enabled'),
      healthScale('physical-energy', 4, 'Good', -3 * DAY),
      healthScale('sleep-recovery', 4, 'Good', -3 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  /* --- Prompt 8C: Career, Azure, and learning ----------------------------- */

  build(
    'career-no-next-step',
    'No next step written down',
    'Career on, study happening, and nothing recorded about what comes next. Expect the smallest possible move: write one sentence.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('career-and-learning', 'enabled'),
      careerState('career:studied', 'Yes', -2 * DAY),
      careerState('career:barrier', 'I was not sure what to do next', -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'career-unsupported-claim',
    'A claim with nothing behind it',
    'A next step is recorded and a claim has no evidence. Expect the gap named as the most useful thing on the screen, not as a failing.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('career-and-learning', 'enabled'),
      careerNote('career:next-step', 'Finish the networking lab', -1 * DAY),
      careerState('career:studied', 'Yes', -1 * DAY),
      claim('I can design a hub-and-spoke network', 'networking'),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'career-proven-claim',
    'A claim with a Work Win behind it',
    'One canonical Work Win, cited by a claim. Expect the ladder at its top rung and the same record feeding six surfaces.',
    ((): CanonicalRecord[] => {
      // Built first so the claim can cite their real ids. A claim points at evidence;
      // evidence never points at a claim, which is what keeps the direction of proof
      // one-way.
      const lab = careerState('career:lab-independence', 'Did it on my own', -3 * DAY);
      const win = workWin('Migrated the reporting service without downtime');

      return [
        star(),
        goal('Goal One', 'career-work-learning', 2),
        ...decliningWeeks(),
        domainPreference('career-and-learning', 'enabled'),
        careerNote('career:next-step', 'Write up the migration', -1 * DAY),
        careerState('career:studied', 'Yes', -3 * DAY),
        lab,
        win,
        retrieval(4, 'Most of it', -3 * DAY),
        retrieval(3, 'About half', -10 * DAY),
        claim('I can run a container migration end to end', 'containers', [
          lab.recordId,
          win.recordId,
        ]),
        context({ minutes: 40, capacity: 'moderate' }),
      ];
    })(),
  ),

  build(
    'career-interrupted',
    'Interrupted and never resumed',
    'A session stopped and not picked back up. Expect resumption offered while that is still cheap.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      domainPreference('career-and-learning', 'enabled'),
      careerNote('career:next-step', 'Finish the identity module walkthrough', -1 * DAY),
      careerState('career:studied', 'Yes', -1 * DAY),
      careerState('career:re-entry', 'No', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'career-recurring-barrier',
    'The same obstacle keeps recurring',
    'Setup cost recorded three times. Expect it named as a recurring obstacle, with no inference about why.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 2),
      ...decliningWeeks(),
      domainPreference('career-and-learning', 'enabled'),
      careerNote('career:next-step', 'Rebuild the lab environment', -1 * DAY),
      careerState('career:studied', 'Yes', -1 * DAY),
      retrieval(4, 'Most of it', -1 * DAY),
      careerState('career:barrier', 'Getting set up takes too long', -3 * DAY),
      careerState('career:barrier', 'Getting set up takes too long', -6 * DAY),
      careerState('career:barrier', 'Getting set up takes too long', -9 * DAY),
      careerState('career:barrier', 'I was interrupted', -12 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'home-repeated-friction',
    'The same thing, four times',
    'One friction recorded repeatedly and one recorded once. Expect a change offered against the repeated one, silence about the other, and a chart of what keeps happening.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('home-and-environment', 'enabled'),
      homeFriction('What I needed was somewhere else', 'focused-work', -2 * DAY),
      homeFriction('What I needed was somewhere else', 'focused-work', -6 * DAY),
      homeFriction('What I needed was somewhere else', 'learning', -11 * DAY),
      homeFriction('What I needed was somewhere else', undefined, -18 * DAY),
      homeFriction('Too loud', 'focused-work', -4 * DAY),
      homeState('home:setup-time', 'Long enough that I did something else', -2 * DAY),
      homeState('home:transition', 'A lot', -3 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'home-single-friction',
    'One awkward morning',
    'Exactly one friction on record. Expect the app to say nothing at all about it.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('home-and-environment', 'enabled'),
      homeFriction('Nowhere to put things', 'everyday', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'home-change-open',
    'A change decided and not made',
    'One change named against repeated friction. Expect it offered back in his words, and no second job added while it is open.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('home-and-environment', 'enabled'),
      homeFriction('It had to be set up first', 'learning', -3 * DAY),
      homeFriction('It had to be set up first', 'learning', -8 * DAY),
      homeNote('home:change-named', 'Placeholder change written by the owner', -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'home-change-did-not-hold',
    'The change did not hold',
    'A change made and the same thing still happening. Expect a second attempt offered once, and nothing that reads as a telling-off.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('home-and-environment', 'enabled'),
      homeFriction('Too loud', 'focused-work', -25 * DAY),
      homeFriction('Too loud', 'focused-work', -22 * DAY),
      homeNote('home:change-named', 'Placeholder change written by the owner', -20 * DAY),
      homeState('home:change-made', 'Yes', -19 * DAY),
      homeFriction('Too loud', 'focused-work', -4 * DAY),
      homeState('home:friction-outcome', 'Still happening', -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'money-pressure-no-figures',
    'Money area switched on, amounts off',
    'Pressure and cover recorded, no figures anywhere. Expect a stage path for cover, a pressure trend, the meter refused, and the tradeoff refused as a chart.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('money', 'enabled'),
      moneyState('money:last-looked', 'This week', -2 * DAY),
      moneyState('money:resilience', 'Several months', -3 * DAY),
      moneyPressure(4, -1 * DAY),
      moneyPressure(3, -9 * DAY),
      moneyPressure(2, -16 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'money-figures-on',
    'Amounts switched on',
    'The one place a percentage is valid. Expect a real meter, and everything else identical to the scenario without figures.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('money', 'enabled'),
      figuresOn(),
      moneyPurpose('Placeholder purpose written by the owner'),
      moneyState('money:last-looked', 'Today or yesterday', -1 * DAY),
      moneyState('money:resilience', 'A month or two', -3 * DAY),
      moneyPressure(3, -1 * DAY),
      moneyPressure(3, -9 * DAY),
      moneyFigure('money:goal-target', 7500, -20 * DAY),
      moneyFigure('money:goal-current', 4200, -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'money-not-looked',
    'Not looked at in a while',
    'He said so himself. Expect two minutes and one number, and nothing that reads as a telling-off.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('money', 'enabled'),
      moneyState('money:last-looked', 'I have been putting it off', -1 * DAY),
      moneyPressure(4, -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'money-thin-cover',
    'Thin cover, and nothing to suggest',
    'Under a week of cover with low pressure. Expect the reading shown plainly and no suggestion at all, because there is none worth giving.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('money', 'enabled'),
      moneyState('money:last-looked', 'This week', -1 * DAY),
      moneyState('money:resilience', 'Under a week', -2 * DAY),
      moneyPressure(2, -1 * DAY),
      moneyPressure(2, -8 * DAY),
      moneyPurpose('Placeholder purpose written by the owner'),
      moneyState('money:pressure-since', 'About the same', -3 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'money-decision-settled',
    'A decision made, and what moved after it',
    'Pressure recorded before and after a settled decision. Expect a two-bar comparison labelled as change rather than cause.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('money', 'enabled'),
      moneyState('money:last-looked', 'This week', -1 * DAY),
      moneyState('money:resilience', 'A few weeks', -30 * DAY),
      moneyPressure(5, -30 * DAY),
      moneyNote('money:decision-named', 'Placeholder decision written by the owner', -29 * DAY),
      moneyState('money:decision-made', 'Did it', -28 * DAY),
      moneyPressure(3, -2 * DAY),
      moneyState('money:pressure-since', 'Less', -2 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  /* --- Prompt 8D: fatherhood and child development ------------------------ */

  build(
    'faith-enabled',
    'Faith area switched on',
    'Two things named, one practice kept and one gone quiet. Expect his words shown back, a small offer against the quiet one, and no chart ranking them.',
    ((): CanonicalRecord[] => {
      const kept = faithAnchor(
        'practice',
        'Ten quiet minutes before the house wakes up',
        -40 * DAY,
      );
      const quiet = faithAnchor(
        'practice',
        'Write to someone who would not expect it',
        -40 * DAY,
      );

      return [
        star(),
        ...decliningWeeks(),
        domainPreference('faith-and-meaning', 'enabled'),
        faithAnchor('value', 'Being someone my family can rely on', -45 * DAY),
        faithAnchor('purpose', 'Because the small things are what people remember', -45 * DAY),
        kept,
        quiet,
        faithOccasion(kept.recordId, 'Did it', -1 * DAY),
        faithOccasion(kept.recordId, 'A shorter version', -3 * DAY),
        faithOccasion(kept.recordId, 'Did it', -6 * DAY),
        faithState('faith:service-happened', 'Yes', -4 * DAY),
        context({ minutes: 40, capacity: 'moderate' }),
      ];
    })(),
  ),

  build(
    'faith-repair',
    'Something to put right',
    'A repair named and not done. Expect it offered once, in his words, with no view on what it was about.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('faith-and-meaning', 'enabled'),
      faithAnchor('value', 'Saying the true thing even when it costs', -45 * DAY),
      faithNote(
        'faith:repair-needed',
        'Apologise properly for how I spoke on Tuesday',
        -2 * DAY,
      ),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'faith-struggle',
    'Doubt, recorded and left alone',
    'A struggle note on record with practices kept up. Expect the app to do nothing with it at all.',
    ((): CanonicalRecord[] => {
      const kept = faithAnchor(
        'practice',
        'Ten quiet minutes before the house wakes up',
        -40 * DAY,
      );

      return [
        star(),
        ...decliningWeeks(),
        domainPreference('faith-and-meaning', 'enabled'),
        faithAnchor('value', 'Being someone my family can rely on', -45 * DAY),
        kept,
        faithOccasion(kept.recordId, 'Did it', -1 * DAY),
        faithOccasion(kept.recordId, 'Did it', -4 * DAY),
        faithNote('faith:struggle', 'Placeholder struggle entry', -2 * DAY),
        context({ minutes: 40, capacity: 'moderate' }),
      ];
    })(),
  ),

  build(
    'emotional-enabled',
    'Emotional area switched on',
    'Contact, practice, and a boundary held. Expect a readable panel, a practice comparison, and a refused percentage.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('emotional-and-relationships', 'enabled'),
      emotionalState('emotional:connection', 'In person', -2 * DAY),
      emotionalState('emotional:connection', 'A call or video', -5 * DAY),
      emotionalState('emotional:practice', 'Started a conversation', -2 * DAY),
      emotionalState('emotional:practice', 'Said no to something', -4 * DAY),
      emotionalState('emotional:practice', 'Started a conversation', -9 * DAY),
      emotionalNote(
        'emotional:boundary-decided',
        'Not answering work messages after seven',
        -6 * DAY,
      ),
      emotionalState('emotional:boundary-outcome', 'Held it', -3 * DAY),
      emotionalState('emotional:interference', 'Not really', -1 * DAY),
      loneliness(2, 'Mostly fine', -1 * DAY),
      loneliness(3, 'A bit apart', -9 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'emotional-unresolved',
    'Something unresolved with someone',
    'A conflict on record, settled but not repaired. Expect repair offered while it is still cheap, and nothing about the other person.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('emotional-and-relationships', 'enabled'),
      emotionalState('emotional:conflict-open', 'Yes', -2 * DAY),
      emotionalState('emotional:connection', 'In person', -2 * DAY),
      emotionalState('emotional:interference', 'A bit', -1 * DAY),
      loneliness(3, 'A bit apart', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'emotional-quiet',
    'Nothing to interrupt for',
    'Contact yesterday, nothing in the way, nothing open. Expect silence.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('emotional-and-relationships', 'enabled'),
      emotionalState('emotional:connection', 'In person', -1 * DAY),
      emotionalState('emotional:interference', 'Not really', -1 * DAY),
      loneliness(1, 'Connected', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'emotional-private',
    'A private note, and no permission to show it',
    'Private patterns switched on with a note recorded and every surface still denied. Expect it stored, withheld from the export, and absent from every guide.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('emotional-and-relationships', 'enabled'),
      emotionalState('emotional:topic-enabled:private-pattern', 'On', -3 * DAY),
      emotionalNote('emotional:note', 'Placeholder private note', -2 * DAY, 'private-pattern'),
      emotionalState('emotional:connection', 'Messages back and forth', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'fatherhood-enabled',
    'Fatherhood switched on',
    'Skills practised, a moment kept, and milestones answered. Expect a stage path for one skill, a refused percentage, and the two ladders shown separately.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('fatherhood', 'enabled'),
      skill('taking-turns', 'Doing sometimes', -1 * DAY),
      skill('taking-turns', 'Needs support', -8 * DAY),
      skill('putting-things-away', 'Practising with daddy', -3 * DAY),
      milestone('points-to-show', 'yes', -20 * DAY),
      milestone('two-word-phrases', 'not-yet', -20 * DAY),
      moment('She handed me the book and said the word for it', -2 * DAY),
      fatherState('father:together', 'Yes', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'fatherhood-learning-map',
    'A learning map with a progression waiting',
    'One skill set to needs support, with three occasions across separate days pointing higher. Expect a suggestion the owner must approve, and no number anywhere.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('fatherhood', 'enabled'),
      fatherState('father:age-band', 'Around 2–3 years', -40 * DAY),
      skill('taking-turns', 'Needs support', -30 * DAY),
      fatherState('father:skill-evidence:taking-turns', 'Doing sometimes', -15 * DAY),
      fatherState('father:skill-evidence:taking-turns', 'Doing sometimes', -11 * DAY),
      fatherState('father:skill-evidence:taking-turns', 'Doing often', -6 * DAY),
      skill('naming-feelings', 'Practising with daddy', -3 * DAY),
      milestone('points-to-show', 'yes', -20 * DAY),
      fatherState('father:together', 'Yes', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'fatherhood-concern',
    'Something noticed weeks ago',
    'A concern recorded a month back and still on record. Expect the app to stop having a view and name who should.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('fatherhood', 'enabled'),
      milestone('two-word-phrases', 'concern', -30 * DAY),
      skill('naming-feelings', 'Practising with daddy', -4 * DAY),
      fatherState('father:together', 'Yes', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'fatherhood-quiet',
    'Nothing to interrupt for',
    'Time together recorded yesterday and no skill mid-practice. Expect silence — the normal case in this area.',
    [
      star(),
      ...decliningWeeks(),
      domainPreference('fatherhood', 'enabled'),
      skill('taking-turns', 'Uses on her own', -2 * DAY),
      fatherState('father:together', 'Yes', -1 * DAY),
      moment('Danced to the washing machine finishing', -1 * DAY),
      context({ minutes: 40, capacity: 'moderate' }),
    ],
  ),

  build(
    'quiet-week',
    'Deliberately quiet week',
    'Capacity is depleted. Expect a quiet week proposed on its merits, not as a fallback.',
    [
      star(),
      goal('Goal One', 'career-work-learning', 11),
      ...decliningWeeks(),
      context({ minutes: 40, capacity: 'depleted' }),
    ],
  ),
];

export function scenarioById(scenarioId: string): Scenario {
  const found = SCENARIOS.find((scenario) => scenario.id === scenarioId);
  if (found === undefined) throw new Error(`Unknown scenario: ${scenarioId}`);
  return found;
}

/* -------------------------------------------------------------------------- */

/** Matches the ISO-8601 instants the envelope accepts. Local wall-clock strings do not. */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function shiftValue(value: unknown, deltaMs: number): unknown {
  if (typeof value === 'string') {
    return ISO_INSTANT.test(value)
      ? new Date(Date.parse(value) + deltaMs).toISOString()
      : value;
  }
  if (Array.isArray(value)) return value.map((entry) => shiftValue(entry, deltaMs));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, shiftValue(entry, deltaMs)]),
    );
  }
  return value;
}

/**
 * Moves a whole scenario along the timeline without changing its shape.
 *
 * A scenario is written against a fixed anchor so that unit tests are reproducible.
 * Seeding one into a running app is a different job: the app reads the real clock, so
 * a corpus anchored to January would look like a seven-month absence in August.
 * Shifting every instant by the same delta preserves each record's meaning — the
 * relative distances, the ordering, and `occurredAt <= recordedAt` are all invariant
 * under a uniform translation — while placing it where the app is actually standing.
 *
 * Local wall-clock strings are deliberately left alone: they carry no offset, so they
 * are context rather than instants, and nothing computes from them.
 */
export function shiftScenario(scenario: Scenario, targetNow: Date): Scenario {
  const deltaMs = targetNow.getTime() - Date.parse(scenario.nowIso);
  return {
    ...scenario,
    nowIso: targetNow.toISOString(),
    records: scenario.records.map(
      (record) => shiftValue(record, deltaMs) as (typeof scenario.records)[number],
    ),
  };
}
