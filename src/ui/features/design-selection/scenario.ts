/**
 * The shared synthetic decision scenario for Phase 3 design selection.
 *
 * **This is an explicit view model, not intelligence.** No engine produced it and
 * none exists yet — Phase 4 builds that. Every value here was written by hand so
 * that three compositions can be compared against identical content, which is the
 * only way a design comparison means anything (`LEAN-003`).
 *
 * All values are neutral and synthetic (`PRIV-002`). "Activity One", "Goal One",
 * and "Commitment One" are the fixture vocabulary from `tests/fixtures/synthetic.ts`.
 *
 * The scenario is deliberately a *hard* case rather than a flattering one: capacity
 * is inferred rather than observed, the trajectory is declining, one predicted
 * effect is a cost, another is uncertain and delayed, and confidence is only
 * "early signal". A layout that only looks good on good news is the wrong choice.
 */

/** Distinguishable without colour (`UX-002`) — every consumer renders the word. */
export type EvidenceKind = 'observed' | 'inferred';

export interface StateReading {
  readonly label: string;
  readonly value: string;
  readonly evidence: EvidenceKind;
  /** Where it came from, in the user's terms. */
  readonly basis: string;
}

export interface MaterialChange {
  readonly change: string;
  readonly detail: string;
  readonly when: string;
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

export interface Scenario {
  readonly clock: string;
  readonly headline: string;
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
  readonly decision: DecisionAction | DecisionSilence;
}

export interface DecisionAction {
  readonly kind: 'action';
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

export interface DecisionSilence {
  readonly kind: 'deliberate-silence';
  readonly statement: string;
  readonly rationale: string;
  readonly confidence: string;
  readonly confidenceWhy: string;
  readonly reasonTrace: readonly string[];
  readonly nextCheck: string;
  readonly secondaryActions: readonly string[];
}

/* -------------------------------------------------------------------------- */

const SHARED = {
  clock: 'Monday 17:58',
  readings: [
    {
      label: 'Time free',
      value: '40 minutes',
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
  trajectory: {
    question: 'Focused hours per week',
    direction: 'declining',
    detail: '6.5, then 5.0, then 3.5 across three weeks',
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
} as const;

/**
 * The primary case: one best move.
 *
 * Note what is absent — there is no second-choice action anywhere in this object.
 * Alternatives were compared internally and are not representable here, which is
 * the view-model form of `PROD-005`.
 */
export const ACTION_SCENARIO: Scenario = {
  ...SHARED,
  headline: 'A 40-minute window just opened before your protected evening.',
  whatChanged: [
    {
      change: 'Commitment One completed',
      detail: 'Freed the window from 17:50 to 18:30',
      when: '20 minutes ago',
    },
    {
      change: 'Evening confirmed protected',
      detail: 'Rules out anything after 18:30',
      when: '2 hours ago',
    },
  ],
  whyTheAnswerChanged:
    'An hour ago there was nothing worth suggesting. This is the first block this week long enough to be useful.',
  decision: {
    kind: 'action',
    statement: 'Activity One',
    duration: '25 minutes',
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
  },
};

/**
 * The same surface with nothing worth interrupting for.
 *
 * Included because a composition that looks broken, empty, or apologetic when the
 * honest answer is "nothing" would be the wrong one to pick — and that is invisible
 * if every variant is only ever shown its best case. Silence is a conclusion, not
 * an empty state.
 */
export const SILENCE_SCENARIO: Scenario = {
  ...SHARED,
  clock: 'Tuesday 11:04',
  headline: 'Nothing requires attention right now.',
  readings: [
    {
      label: 'Time free',
      value: '12 minutes',
      evidence: 'observed',
      basis: 'Calendar, meeting at 11:16',
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
      when: 'Last useful assessment was 2 hours ago',
    },
  ],
  whyTheAnswerChanged:
    'The picture has not moved. Interrupting you for a twelve-minute gap between meetings would cost more than it could return.',
  decision: {
    kind: 'deliberate-silence',
    statement: 'No action is worth interrupting for',
    rationale:
      'Twelve minutes before a non-negotiable commitment is not long enough for the minimum useful version of anything currently worth doing.',
    confidence: 'Moderate evidence',
    confidenceWhy:
      'Capacity is inferred rather than observed, but the timing constraint alone settles it.',
    reasonTrace: [
      'Every candidate needs more time than the window allows',
      'Capacity is low and the next commitment is non-negotiable',
      'Nothing has changed since the last assessment',
    ],
    nextCheck: 'Next look at 14:30, or sooner if something changes',
    secondaryActions: ['See why', 'Something changed'],
  },
};
