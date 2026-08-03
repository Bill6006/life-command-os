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
