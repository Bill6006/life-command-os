/**
 * Synthetic view models for the Phase 3 Console shell.
 *
 * **No intelligence produced any of this.** Every value is hand-written, and the
 * types here are deliberately independent of the canonical record families so the
 * interface cannot start depending on record shapes before Phase 4 wires them
 * (`LEAN-001`, Prompt 4 task 13).
 *
 * All values are neutral and synthetic (`PRIV-002`).
 */

export type EvidenceKind = 'observed' | 'inferred';

export interface StateReading {
  readonly label: string;
  readonly value: string;
  readonly evidence: EvidenceKind;
  readonly basis: string;
}

export interface MaterialChange {
  readonly change: string;
  readonly detail: string;
  readonly when: string;
  /** What this change altered — the point of showing it at all. */
  readonly altered: 'state' | 'recommendation' | 'confidence';
}

export interface PredictedEffect {
  readonly category: string;
  readonly direction: 'positive' | 'negative' | 'neutral';
  readonly magnitude: 'small' | 'moderate' | 'large' | 'unknown';
  readonly timing: 'immediate' | 'delayed';
  readonly crossDomain: boolean;
  readonly uncertain: boolean;
  readonly note: string;
}

export interface Situation {
  readonly clock: string;
  readonly readings: readonly StateReading[];
  readonly whatChanged: readonly MaterialChange[];
  readonly whyTheAnswerChanged: string;
  readonly trajectory: {
    readonly question: string;
    readonly direction: 'improving' | 'stable' | 'declining' | 'mixed';
    readonly detail: string;
    readonly confidence: string;
    readonly freshness: string;
  };
  readonly untreatedPath: {
    readonly summary: string;
    readonly horizon: string;
    readonly assumptions: readonly string[];
    readonly uncertainty: string;
  };
}

export interface ActionDecision {
  readonly statement: string;
  readonly duration: string;
  readonly minimumVersion: string;
  readonly stoppingPoint: string;
  readonly effects: readonly PredictedEffect[];
  readonly northStar: { readonly relevance: string; readonly statement: string };
  readonly confidence: string;
  readonly confidenceWhy: string;
  readonly reasonTrace: readonly string[];
  readonly primaryAction: string;
  readonly secondaryActions: readonly string[];
}

/**
 * Every state the Now surface can be in.
 *
 * There is no branch carrying more than one recommendation. A ranked list is
 * unrepresentable here, exactly as it is in `RecommendationRecord` (`PROD-005`).
 */
export type NowState =
  | {
      readonly kind: 'action';
      readonly situation: Situation;
      readonly decision: ActionDecision;
    }
  | {
      readonly kind: 'mixed-effects';
      readonly situation: Situation;
      readonly decision: ActionDecision;
    }
  | {
      readonly kind: 'silence';
      readonly situation: Situation;
      readonly statement: string;
      readonly rationale: string;
      readonly confidence: string;
      readonly confidenceWhy: string;
      readonly reasonTrace: readonly string[];
      readonly nextCheck: string;
      readonly secondaryActions: readonly string[];
    }
  | {
      readonly kind: 'insufficient-evidence';
      readonly situation: Situation;
      readonly statement: string;
      readonly missing: readonly string[];
      readonly wouldHelp: string;
    }
  | {
      readonly kind: 'question';
      readonly situation: Situation;
      readonly prompt: string;
      readonly whyItMatters: string;
      readonly couldChange: readonly string[];
      readonly answers: readonly string[];
    }
  | {
      readonly kind: 'what-changed';
      readonly situation: Situation;
      readonly since: string;
      readonly unchanged: readonly string[];
    }
  | {
      readonly kind: 'weekly-direction';
      readonly situation: Situation;
      readonly weekOf: string;
      readonly proposal: string;
      readonly proposalKind: 'focus' | 'deliberately-quiet';
      readonly basedOn: readonly string[];
      readonly confidence: string;
      readonly lastWeek: string;
      readonly responses: readonly string[];
    }
  | { readonly kind: 'loading' }
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'offline';
      readonly situation: Situation;
      readonly decision: ActionDecision;
    }
  | { readonly kind: 'error'; readonly summary: string; readonly detail: string }
  | { readonly kind: 'locked' }
  | {
      readonly kind: 'recovery';
      readonly summary: string;
      readonly detail: string;
      readonly options: readonly string[];
    };

export const NOW_STATE_KINDS = [
  'action',
  'silence',
  'insufficient-evidence',
  'question',
  'what-changed',
  'mixed-effects',
  'weekly-direction',
  'loading',
  'empty',
  'offline',
  'error',
  'locked',
  'recovery',
] as const;

export type NowStateKind = (typeof NOW_STATE_KINDS)[number];

/* -------------------------------------------------------------------------- */
/* Shared situation                                                            */
/* -------------------------------------------------------------------------- */

const SITUATION: Situation = {
  clock: 'Monday 17:58',
  readings: [
    {
      label: 'Time free',
      value: '40 min',
      evidence: 'observed',
      basis: 'Calendar, clear until 18:30',
    },
    {
      label: 'Capacity',
      value: 'Moderate',
      evidence: 'inferred',
      basis: 'From three observations today',
    },
    {
      label: 'Protected from',
      value: '18:30',
      evidence: 'observed',
      basis: 'Family block, non-negotiable',
    },
  ],
  whatChanged: [
    {
      change: 'Commitment One completed',
      detail: 'Freed the window from 17:50 to 18:30',
      when: '20 min ago',
      altered: 'recommendation',
    },
    {
      change: 'Evening confirmed protected',
      detail: 'Rules out anything after 18:30',
      when: '2 h ago',
      altered: 'state',
    },
  ],
  whyTheAnswerChanged:
    'An hour ago there was nothing worth suggesting. This is the first block this week long enough to be useful.',
  trajectory: {
    question: 'Focused hours per week',
    direction: 'declining',
    detail: '6.5 → 5.0 → 3.5 over three weeks',
    confidence: 'Moderate evidence',
    freshness: 'Observed through yesterday',
  },
  untreatedPath: {
    summary:
      'If nothing changes this week, focused hours fall again and Goal One passes its window with no progress recorded.',
    horizon: 'Through Sunday',
    assumptions: ['Current commitments hold', 'No new blocks appear before Friday'],
    uncertainty: 'Three weeks of comparable evidence only.',
  },
};

const ACTION: ActionDecision = {
  statement: 'Activity One',
  duration: '25 min',
  minimumVersion: 'Ten minutes still counts',
  stoppingPoint: 'Stop at 18:25 whatever the progress',
  effects: [
    {
      category: 'Career, work & learning',
      direction: 'positive',
      magnitude: 'moderate',
      timing: 'immediate',
      crossDomain: false,
      uncertain: false,
      note: 'First focused block this week',
    },
    {
      category: 'Time, attention & capacity',
      direction: 'negative',
      magnitude: 'small',
      timing: 'immediate',
      crossDomain: true,
      uncertain: false,
      note: 'Uses the whole free window',
    },
    {
      category: 'Time, attention & capacity',
      direction: 'neutral',
      magnitude: 'unknown',
      timing: 'delayed',
      crossDomain: true,
      uncertain: true,
      note: 'Evening unaffected if you stop by 18:25',
    },
  ],
  northStar: {
    relevance: 'Moves toward it',
    statement: 'Build durable capability without burning out',
  },
  confidence: 'Early signal',
  confidenceWhy:
    'Three comparable blocks, all recent. None has been followed through to an outcome yet.',
  reasonTrace: [
    'The window is long enough for the minimum useful version',
    'No protected context is active before 18:30',
    'Goal One has no recorded progress for eleven days',
  ],
  primaryAction: 'Start',
  secondaryActions: ['Adjust', 'Not now'],
};

/** A genuinely awkward tradeoff, so the surface is tested on a hard case too. */
const MIXED: ActionDecision = {
  ...ACTION,
  statement: 'Activity Two',
  duration: '40 min',
  minimumVersion: 'Twenty minutes covers the essential part',
  stoppingPoint: 'Stop at 18:28 — this one runs close to the boundary',
  effects: [
    {
      category: 'Career, work & learning',
      direction: 'positive',
      magnitude: 'large',
      timing: 'immediate',
      crossDomain: false,
      uncertain: false,
      note: 'Clears the blocked commitment outright',
    },
    {
      category: 'Time, attention & capacity',
      direction: 'negative',
      magnitude: 'moderate',
      timing: 'immediate',
      crossDomain: true,
      uncertain: false,
      note: 'Consumes the entire window with no margin',
    },
    {
      category: 'Time, attention & capacity',
      direction: 'negative',
      magnitude: 'unknown',
      timing: 'delayed',
      crossDomain: true,
      uncertain: true,
      note: 'May run past 18:30 and cut into protected time',
    },
    {
      category: 'Direction & commitments',
      direction: 'positive',
      magnitude: 'moderate',
      timing: 'delayed',
      crossDomain: true,
      uncertain: true,
      note: 'Unblocks Commitment Two if it finishes',
    },
  ],
  confidence: 'Early signal',
  confidenceWhy:
    'The benefit is larger but the timing risk is real. Two of four effects are uncertain.',
  reasonTrace: [
    'Highest expected benefit of the eligible actions',
    'Carries a real risk of overrunning protected time',
    'Chosen because the minimum version fits inside the window',
  ],
};

/* -------------------------------------------------------------------------- */
/* The thirteen states                                                         */
/* -------------------------------------------------------------------------- */

export const NOW_STATES: Record<NowStateKind, NowState> = {
  action: { kind: 'action', situation: SITUATION, decision: ACTION },

  'mixed-effects': { kind: 'mixed-effects', situation: SITUATION, decision: MIXED },

  silence: {
    kind: 'silence',
    situation: {
      ...SITUATION,
      clock: 'Tuesday 11:04',
      readings: [
        {
          label: 'Time free',
          value: '12 min',
          evidence: 'observed',
          basis: 'Meeting at 11:16',
        },
        {
          label: 'Capacity',
          value: 'Low',
          evidence: 'inferred',
          basis: 'Fourth meeting in a row',
        },
        {
          label: 'Protected from',
          value: '11:16',
          evidence: 'observed',
          basis: 'Commitment Two, non-negotiable',
        },
      ],
      whatChanged: [
        {
          change: 'Nothing material since 09:00',
          detail: 'No new evidence, commitments, or context changes',
          when: '2 h ago',
          altered: 'state',
        },
      ],
      whyTheAnswerChanged:
        'The picture has not moved. Interrupting you for a twelve-minute gap would cost more than it could return.',
    },
    statement: 'Nothing requires attention right now',
    rationale:
      'Twelve minutes before a non-negotiable commitment is not long enough for the minimum useful version of anything currently worth doing.',
    confidence: 'Moderate evidence',
    confidenceWhy: 'Capacity is inferred, but the timing constraint alone settles it.',
    reasonTrace: [
      'Every candidate needs more time than the window allows',
      'Capacity is low and the next commitment is non-negotiable',
      'Nothing has changed since the last assessment',
    ],
    nextCheck: 'Next look at 14:30, or sooner if something changes',
    secondaryActions: ['Something changed', 'Show details'],
  },

  'insufficient-evidence': {
    kind: 'insufficient-evidence',
    situation: {
      ...SITUATION,
      clock: 'Wednesday 08:12',
      readings: [
        {
          label: 'Time free',
          value: 'Unknown',
          evidence: 'observed',
          basis: 'No calendar data',
        },
        {
          label: 'Capacity',
          value: 'Unknown',
          evidence: 'inferred',
          basis: 'No observations yet',
        },
        {
          label: 'Protected from',
          value: 'Not applicable',
          evidence: 'observed',
          basis: 'No blocks recorded today',
        },
      ],
      trajectory: {
        question: 'Focused hours per week',
        direction: 'stable',
        detail: 'Insufficient evidence to say',
        confidence: 'Insufficient evidence',
        freshness: 'No observations in four days',
      },
      untreatedPath: {
        summary: 'Not enough recent evidence to project anything honestly.',
        horizon: 'Not stated',
        assumptions: [],
        uncertainty: 'No comparable evidence in the last four days.',
      },
    },
    statement: 'Not enough recent evidence to recommend anything',
    missing: [
      'No observations recorded in four days',
      'Available time is unknown for today',
      'Capacity has no basis to be inferred from',
    ],
    wouldHelp: 'One observation of today’s available time would be enough to start.',
  },

  question: {
    kind: 'question',
    situation: SITUATION,
    prompt: 'Is the evening block still protected this week?',
    whyItMatters:
      'It decides whether any evening action can be suggested at all, so it changes the answer rather than refining it.',
    couldChange: ['Candidate eligibility', 'Recommendation', 'Confidence'],
    answers: ['Yes, protected', 'No, it is free', 'Not sure'],
  },

  'what-changed': {
    kind: 'what-changed',
    situation: SITUATION,
    since: 'Last useful assessment: today 16:40',
    unchanged: [
      'North Star and active goals',
      'Capacity baseline for a Monday',
      'All other commitments',
    ],
  },

  'weekly-direction': {
    kind: 'weekly-direction',
    situation: SITUATION,
    weekOf: 'Week of 5 January',
    proposalKind: 'focus',
    proposal: 'Protect two deep-work blocks before Thursday',
    basedOn: [
      'Focused hours declined for three consecutive weeks',
      'Two commitments compete for the same window',
      'Thursday and Friday are already heavily committed',
      'Capacity has been moderate, not depleted',
    ],
    confidence: 'Moderate evidence',
    lastWeek: 'Last week’s direction was a deliberately quiet week. It was confirmed.',
    responses: ['Confirm', 'Adjust', 'Quiet week instead'],
  },

  loading: { kind: 'loading' },

  empty: { kind: 'empty' },

  offline: { kind: 'offline', situation: SITUATION, decision: ACTION },

  error: {
    kind: 'error',
    summary: 'Could not read local records',
    detail:
      'The local database did not respond. Nothing was written, and nothing has been lost. Retrying is safe.',
  },

  locked: { kind: 'locked' },

  recovery: {
    kind: 'recovery',
    summary: 'A write was interrupted',
    detail:
      'The last change did not finish committing, so it was not applied. Your existing records are intact and unchanged.',
    options: ['Retry the change', 'Discard it', 'Open Data & Privacy'],
  },
};

/* -------------------------------------------------------------------------- */
/* Direction                                                                   */
/* -------------------------------------------------------------------------- */

export interface CategoryOverview {
  readonly category: string;
  readonly condition: string;
  readonly trajectory: 'improving' | 'stable' | 'declining' | 'mixed' | 'insufficient-evidence';
  readonly confidence: string;
  readonly freshness: string;
  readonly drivers: readonly string[];
  /**
   * Real domain metrics, never a score. Counts and durations mean something on
   * their own; a 0–100 category number would need the score gate, which a
   * synthetic prototype cannot satisfy honestly (`UX-009`).
   */
  readonly metrics: readonly { readonly label: string; readonly value: string }[];
  readonly wouldChangeIt: string;
}

export const CATEGORY_OVERVIEW: readonly CategoryOverview[] = [
  {
    category: 'Time, attention & capacity',
    condition: 'Fragmented, but not overloaded',
    trajectory: 'stable',
    confidence: 'Moderate evidence',
    freshness: 'Observed today',
    drivers: ['Meetings cluster on Tuesday and Thursday', 'Evenings consistently protected'],
    metrics: [
      { label: 'Free blocks ≥ 25 min this week', value: '2' },
      { label: 'Protected hours this week', value: '14' },
      { label: 'Longest free block', value: '40 min' },
    ],
    wouldChangeIt: 'A second week of fragmented mornings would move this to declining.',
  },
  {
    category: 'Direction & commitments',
    condition: 'Two active commitments, one blocked on someone else',
    trajectory: 'mixed',
    confidence: 'Early signal',
    freshness: 'Observed yesterday',
    drivers: ['Commitment One completed today', 'Commitment Two blocked for six days'],
    metrics: [
      { label: 'Open loops', value: '5' },
      { label: 'Blocked', value: '1' },
      { label: 'Past due', value: '1' },
    ],
    wouldChangeIt: 'Unblocking Commitment Two, or agreeing to drop it.',
  },
  {
    category: 'Career, work & learning',
    condition: 'Losing ground on focused work',
    trajectory: 'declining',
    confidence: 'Moderate evidence',
    freshness: 'Observed yesterday',
    drivers: ['Focused hours down three weeks running', 'Goal One has no progress for 11 days'],
    metrics: [
      { label: 'Focused hours this week', value: '3.5' },
      { label: 'Learning sessions this week', value: '1' },
      { label: 'Days since progress on Goal One', value: '11' },
    ],
    wouldChangeIt: 'Two focused blocks this week would be enough to call it stable.',
  },
];

/**
 * The one trend graph required by Phase 3.
 *
 * Every field the graph policy demands is carried as data rather than left to the
 * component, so a chart cannot be rendered without them (`UX-003`).
 */
export interface TrendSeries {
  readonly question: string;
  readonly metric: string;
  readonly window: string;
  readonly evidence: EvidenceKind;
  readonly missingDataTreatment: string;
  readonly uncertainty: string;
  readonly textSummary: string;
  readonly unit: string;
  /** `null` means no evidence for that week — rendered as a gap, never as zero. */
  readonly points: readonly { readonly label: string; readonly value: number | null }[];
}

export const FOCUSED_HOURS_TREND: TrendSeries = {
  question: 'Is focused work recovering, or still declining?',
  metric: 'Hours in blocks of 25 minutes or more, summed per week',
  window: 'Last eight weeks',
  evidence: 'observed',
  missingDataTreatment:
    'Week of 24 Nov has no recorded evidence and is drawn as a gap. It is not counted as zero.',
  uncertainty:
    'Counts are observed, not estimated, so the series carries no model uncertainty.',
  textSummary:
    'Focused hours rose to 7.0 in mid-November, then fell for three consecutive weeks to 3.5. One week has no evidence. The last three weeks are the lowest in the window.',
  unit: 'h',
  points: [
    { label: '10 Nov', value: 5.5 },
    { label: '17 Nov', value: 7.0 },
    { label: '24 Nov', value: null },
    { label: '1 Dec', value: 6.0 },
    { label: '8 Dec', value: 6.5 },
    { label: '15 Dec', value: 5.0 },
    { label: '22 Dec', value: 4.0 },
    { label: '29 Dec', value: 3.5 },
  ],
};

export const NORTH_STAR = {
  statement: 'Build durable capability without burning out',
  goals: [
    {
      statement: 'Goal One',
      category: 'Career, work & learning',
      state: 'active',
      progress: 'No evidence of progress for 11 days',
    },
    {
      statement: 'Goal Two',
      category: 'Time, attention & capacity',
      state: 'active',
      progress: 'Two protected evenings held every week this month',
    },
  ],
} as const;

/* -------------------------------------------------------------------------- */
/* Timeline, Commitments, Learning, Data & Privacy                             */
/* -------------------------------------------------------------------------- */

export interface TimelineEntry {
  readonly at: string;
  readonly type:
    | 'observation'
    | 'correction'
    | 'recommendation'
    | 'execution'
    | 'outcome'
    | 'context-change';
  readonly summary: string;
  readonly detail: string;
  readonly evidence: EvidenceKind;
  readonly episode?: string;
}

export const TIMELINE: readonly TimelineEntry[] = [
  {
    at: 'Today 17:58',
    type: 'recommendation',
    summary: 'Activity One, 25 min',
    detail: 'One best move · Early signal',
    evidence: 'inferred',
    episode: 'Episode 14',
  },
  {
    at: 'Today 17:50',
    type: 'observation',
    summary: 'Commitment One completed',
    detail: 'Direct report',
    evidence: 'observed',
  },
  {
    at: 'Today 15:20',
    type: 'correction',
    summary: 'Available time corrected to 30 min',
    detail: 'Superseded the 45 min entry — original double-counted a break',
    evidence: 'observed',
  },
  {
    at: 'Today 09:05',
    type: 'observation',
    summary: 'Focus session, 20 min',
    detail: 'Direct report',
    evidence: 'observed',
  },
  {
    at: 'Yesterday 19:40',
    type: 'outcome',
    summary: 'Focused hours unchanged',
    detail: 'Outcome window closed · associated with Episode 13',
    evidence: 'observed',
    episode: 'Episode 13',
  },
  {
    at: 'Yesterday 18:05',
    type: 'execution',
    summary: 'Not executed',
    detail: 'Declined — "cannot now". Not treated as evidence about the recommendation.',
    evidence: 'observed',
    episode: 'Episode 13',
  },
  {
    at: '2 Jan',
    type: 'context-change',
    summary: 'Working pattern changed to four longer days',
    detail: 'Patterns before 2 Jan carry less weight',
    evidence: 'observed',
  },
];

export interface CommitmentEntry {
  readonly statement: string;
  readonly category: string;
  readonly state: string;
  readonly note: string;
  readonly nonNegotiable: boolean;
}

export const COMMITMENTS: readonly CommitmentEntry[] = [
  {
    statement: 'Commitment Two',
    category: 'Career, work & learning',
    state: 'blocked',
    note: 'Waiting on someone else for six days',
    nonNegotiable: false,
  },
  {
    statement: 'Commitment Three',
    category: 'Direction & commitments',
    state: 'active',
    note: 'Due Friday',
    nonNegotiable: false,
  },
  {
    statement: 'Family block, weekday evenings',
    category: 'Time, attention & capacity',
    state: 'scheduled',
    note: 'From 18:30 daily',
    nonNegotiable: true,
  },
  {
    statement: 'Commitment Four',
    category: 'Career, work & learning',
    state: 'waiting',
    note: 'Past due by two days',
    nonNegotiable: false,
  },
  {
    statement: 'Commitment Five',
    category: 'Direction & commitments',
    state: 'unclear',
    note: 'No due date and no recorded next step',
    nonNegotiable: false,
  },
];

export const LEARNING = {
  /**
   * Honest by construction. Nothing has been learned because no recommendation has
   * been executed and observed through a full outcome window. Showing invented
   * accuracy figures here would be exactly the false precision the Constitution
   * forbids.
   */
  state: 'nothing-yet',
  headline: 'Nothing has been learned yet',
  detail:
    'Learning needs recommendations that were executed and then observed through a full outcome window. One recommendation was declined, which is not evidence about whether it would have helped.',
  waitingOn: [
    { label: 'Recommendations made', value: '2' },
    { label: 'Executed', value: '0' },
    { label: 'Outcomes observed', value: '1' },
    { label: 'Beliefs formed', value: '0' },
  ],
  separation:
    'Forecast accuracy and recommendation effectiveness are evaluated separately, and neither can be judged from a recommendation that was not carried out.',
} as const;

export const DATA_PRIVACY = {
  storage: [
    { label: 'Canonical records', value: '0' },
    { label: 'Schema version', value: '2' },
    { label: 'Storage used', value: 'Under 1 MB' },
  ],
  /** Only actionable status appears. There is no "all systems operational" row. */
  attention: [] as readonly { readonly summary: string; readonly detail: string }[],
  facts: [
    'All data stays on this device. There is no server and no account.',
    'No analytics, no telemetry, no external AI.',
    'This build and the repository behind it contain synthetic content only.',
  ],
  notReady: {
    headline: 'Not ready for private data yet',
    detail:
      'Encrypted backup and fresh-profile recovery are proven in Phase 6. Until then, entering meaningful private information is not safe.',
  },
} as const;
