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

function build(
  scenarioId: string,
  name: string,
  description: string,
  records: readonly CanonicalRecord[],
  nowOffsetMs = 0,
): Scenario {
  return { id: scenarioId, name, description, nowIso: at(nowOffsetMs), records };
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
