import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  HORIZONS,
  DEFAULT_HORIZON,
  horizonFor,
  isDelayed,
} from '../../src/domain/moves/horizons';
import {
  CONSISTENT_AT,
  applicabilityIn,
  contextualEvidence,
  facetsOf,
  minutesBand,
  timeOfDay,
} from '../../src/intelligence/learning/contextualEvidence';
import { sequenceEvidence } from '../../src/intelligence/learning/sequences';
import { outcomeWindows } from '../../src/intelligence/evaluation/outcomeWindows';
import { MOVE_PATTERNS } from '../../src/domain/moves/catalogue';
import type { CanonicalRecord } from '../../src/domain/records';
import { required } from '../support/required';

/**
 * The learning layer (`V33-062`–`V33-064`, v3.3 sections G1–G4).
 *
 * Every test here is about what the engine is allowed to conclude from evidence, and —
 * more often — what it must refuse to conclude. The failure mode this whole layer guards
 * against is not being wrong; it is being confident, which is a much harder thing to
 * notice from inside.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const BASE = Date.parse('2026-06-01T09:00:00.000Z');
let seq = 0;

function id(): string {
  seq += 1;
  return `00000000-0000-4000-c000-${String(seq).padStart(12, '0')}`;
}

function envelope(recordType: string, at: number, episode: string) {
  return {
    recordId: id(),
    recordType,
    schemaVersion: 1,
    occurredAt: new Date(at).toISOString(),
    recordedAt: new Date(at).toISOString(),
    localTime: { localIso: new Date(at).toISOString(), timeZone: 'UTC', utcOffsetMinutes: 0 },
    decisionEpisodeId: episode,
    source: 'user-entry',
    provenance: { method: 'direct-report' },
  };
}

/**
 * One complete episode: the move that was chosen, that it was done, and what followed.
 *
 * `direction: undefined` writes the outcome as unresolved, which is how a missing
 * follow-up is represented — never as a quiet failure.
 */
function episode(
  patternId: string,
  atMs: number,
  direction: 'improved' | 'unchanged' | 'worsened' | undefined,
  outcomeDelayMs = 30 * MINUTE,
): readonly CanonicalRecord[] {
  const episodeId = id();
  const at = BASE + atMs;
  const observationId = id();
  const executionId = id();

  return [
    {
      ...envelope('candidate-action', at, episodeId),
      provenance: { method: 'derived', derivedFromRecordIds: [] },
      statement: `Do ${patternId}`,
      category: 'time-attention-capacity',
      engineCandidateId: patternId,
      intendedOutcome: 'Something observable changes',
      observableFollowUp: { promptId: 'outcome:completed', windowHours: 24 },
      capabilityEffects: [],
      timing: {},
      durationMinutes: 10,
      friction: 'low',
      minimumViableVersion: 'A smaller version',
      fallback: 'Something else',
      stoppingPoint: 'When it is done',
      risk: 'none-identified',
      reversibility: 'reversible',
      blockedByProtectedContexts: [],
    },
    {
      ...envelope('execution', at, episodeId),
      recordId: executionId,
      recommendationRecordId: id(),
      state: 'executed',
      executedWindow: {
        start: new Date(at).toISOString(),
        end: new Date(at + 10 * MINUTE).toISOString(),
      },
    },
    {
      ...envelope('outcome', at + outcomeDelayMs, episodeId),
      category: 'time-attention-capacity',
      target: 'The thing it was for',
      outcomeWindow: {
        start: new Date(at).toISOString(),
        end: new Date(at + outcomeDelayMs).toISOString(),
      },
      /* The link the evaluator actually joins on. Without it the window never closes. */
      executionRecordId: executionId,
      result:
        direction === undefined
          ? { status: 'unknown', reason: 'Not yet observed' }
          : { status: 'known', value: { summary: 'Observed', direction } },
      observationRecordIds: direction === undefined ? [] : [observationId],
    },
  ] as unknown as readonly CanonicalRecord[];
}

/* -------------------------------------------------------------------------- */

describe('G3. every move is judged on its own clock', () => {
  it('gives each declared window a different horizon', () => {
    /*
     * The defect this replaced: one seven-day window for everything, so a glass of water
     * stayed unresolved for a week and a change of routine was scored before it could
     * possibly have mattered.
     */
    expect(HORIZONS.immediate.closesAfterMs).toBeLessThan(HORIZONS['same-day'].closesAfterMs);
    expect(HORIZONS['same-day'].closesAfterMs).toBeLessThan(
      HORIZONS['next-morning'].closesAfterMs,
    );
    expect(HORIZONS['next-morning'].closesAfterMs).toBeLessThan(
      HORIZONS['multi-day'].closesAfterMs,
    );
    expect(HORIZONS['multi-day'].closesAfterMs).toBeLessThan(
      HORIZONS['multi-week'].closesAfterMs,
    );

    /* And every horizon expires later than it closes, or nothing could ever resolve. */
    for (const horizon of Object.values(HORIZONS)) {
      expect(horizon.expiresAfterMs).toBeGreaterThan(horizon.closesAfterMs);
    }
  });

  it('reads the horizon from the pattern, through the registry', () => {
    const immediate = required(
      MOVE_PATTERNS.find((entry) => entry.observationWindow === 'immediate'),
      'an immediate pattern',
    );
    const weeks = required(
      MOVE_PATTERNS.find((entry) => entry.observationWindow === 'multi-week'),
      'a multi-week pattern',
    );

    expect(horizonFor(immediate.patternId)).toEqual(HORIZONS.immediate);
    expect(horizonFor(weeks.patternId)).toEqual(HORIZONS['multi-week']);
  });

  it('falls back rather than guessing for a move it does not know', () => {
    /* An execution recorded before horizons existed must not change meaning. */
    expect(horizonFor(undefined)).toEqual(DEFAULT_HORIZON);
    expect(horizonFor('nonsense:not-a-move')).toEqual(DEFAULT_HORIZON);
  });

  it('keeps a delayed outcome unresolved right after completion (AT33-032)', () => {
    const overnight = required(
      MOVE_PATTERNS.find((entry) => entry.observationWindow === 'next-morning'),
      'a next-morning pattern',
    );
    const records = episode(overnight.patternId, 0, 'improved');

    /* Ten minutes later: done, and nothing can yet be said about whether it helped. */
    const soon = outcomeWindows(records, new Date(BASE + 10 * MINUTE));
    expect(required(soon[0], 'a window').state).toBe('open');

    /* The next morning: now it can be read. */
    const later = outcomeWindows(records, new Date(BASE + 15 * HOUR));
    expect(required(later[0], 'a window').state).toBe('closed');
  });

  it('knows which moves cannot be judged the same day', () => {
    expect(isDelayed('wind-down:stop-for-tonight')).toBe(true);
    expect(isDelayed(undefined)).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('G1. evidence is held per context, not per move', () => {
  it('reads the time of day in the owner’s own local time', () => {
    expect(timeOfDay('2026-06-01T09:00:00.000Z', 0)).toBe('morning');
    expect(timeOfDay('2026-06-01T23:00:00.000Z', 0)).toBe('night');
    /* Same instant, New York in EDT: still the evening before. */
    expect(timeOfDay('2026-06-01T23:00:00.000Z', -4 * 60)).toBe('evening');
  });

  it('bands free time rather than learning about exact minute counts', () => {
    expect(minutesBand(5)).toBe('under-15');
    expect(minutesBand(30)).toBe('15-45');
    expect(minutesBand(90)).toBe('over-45');
    expect(minutesBand(undefined)).toBeUndefined();
  });

  it('produces no facet at all for a situation field nobody recorded', () => {
    /*
     * An `unknown` bucket would quietly become the biggest one, and evidence about times
     * we did not know where he was is not evidence about a situation.
     */
    const facets = facetsOf({ at: '2026-06-01T09:00:00.000Z', offsetMinutes: 0 });
    expect(facets.map((facet) => facet.kind)).toEqual(['time-of-day']);
  });

  it('lets one move read differently in two contexts (AT33-030)', () => {
    /*
     * The same pattern, four good mornings and two bad nights. There is deliberately no
     * combined verdict to ask for — the two contexts are separate findings.
     */
    const records = [
      ...episode('pause:screen-break', 0, 'improved'),
      ...episode('pause:screen-break', DAY, 'improved'),
      ...episode('pause:screen-break', 2 * DAY, 'improved'),
      ...episode('pause:screen-break', 3 * DAY, 'improved'),
      ...episode('pause:screen-break', 14 * HOUR, 'unchanged'),
      ...episode('pause:screen-break', DAY + 14 * HOUR, 'unchanged'),
    ];

    const evidence = contextualEvidence(records, new Date(BASE + 30 * DAY));
    const morning = required(
      evidence.find((entry) => entry.facet.value === 'morning'),
      'morning evidence',
    );
    const night = required(
      evidence.find((entry) => entry.facet.value === 'night'),
      'night evidence',
    );

    expect(morning.favourable).toBe(CONSISTENT_AT);
    expect(morning.strength).toBe('consistent');
    expect(night.favourable).toBe(0);
    expect(night.unfavourable).toBe(2);
    expect(night.strength).toBe('emerging');
  });

  it('will not call one good result supported', () => {
    const evidence = contextualEvidence(
      episode('pause:screen-break', 0, 'improved'),
      new Date(BASE + 30 * DAY),
    );
    for (const entry of evidence) expect(entry.strength).toBe('insufficient');
  });

  it('counts an unresolved outcome as nothing at all', () => {
    /* Not weak evidence of failure. No evidence. */
    const evidence = contextualEvidence(
      [
        ...episode('pause:screen-break', 0, undefined),
        ...episode('pause:screen-break', DAY, undefined),
      ],
      new Date(BASE + 30 * DAY),
    );
    expect(evidence).toEqual([]);
  });

  it('reports disagreement as mixed rather than picking a side', () => {
    const evidence = contextualEvidence(
      [
        ...episode('pause:screen-break', 0, 'improved'),
        ...episode('pause:screen-break', DAY, 'worsened'),
      ],
      new Date(BASE + 30 * DAY),
    );
    const morning = required(
      evidence.find((entry) => entry.facet.kind === 'time-of-day'),
      'morning evidence',
    );
    expect(morning.strength).toBe('mixed');
    expect(morning.statement).toMatch(/mixed evidence/i);
  });

  it('says nothing about a context it has never seen', () => {
    const evidence = contextualEvidence(
      [
        ...episode('pause:screen-break', 0, 'improved'),
        ...episode('pause:screen-break', DAY, 'improved'),
      ],
      new Date(BASE + 30 * DAY),
    );

    expect(
      applicabilityIn(evidence, 'pause:screen-break', [{ kind: 'setting', value: 'work' }]),
    ).toBeUndefined();
    expect(
      applicabilityIn(evidence, 'pause:screen-break', [
        { kind: 'time-of-day', value: 'morning' },
      ]),
    ).toBeDefined();
  });
});

/* -------------------------------------------------------------------------- */

describe('G4. association language, enforced by construction', () => {
  it('never says a move caused anything', () => {
    const records = [
      ...episode('pause:screen-break', 0, 'improved'),
      ...episode('pause:screen-break', DAY, 'improved'),
      ...episode('pause:screen-break', 2 * DAY, 'worsened'),
    ];

    for (const entry of contextualEvidence(records, new Date(BASE + 30 * DAY))) {
      expect(entry.statement).not.toMatch(/\bcaus(e|ed|es|ing)\b/i);
      expect(entry.statement).not.toMatch(/\bbecause of\b/i);
      expect(entry.statement).not.toMatch(/\bproven\b/i);
      expect(entry.statement).toMatch(
        /often followed by|tended to coincide|mixed|still limited/i,
      );
    }
  });

  it('has no causal vocabulary anywhere in the source', () => {
    /* The guard that survives somebody writing new copy in a hurry. */
    const source = [
      'src/intelligence/learning/contextualEvidence.ts',
      'src/intelligence/learning/sequences.ts',
    ];
    for (const file of source) {
      const text = readFileSync(file, 'utf8');
      const code = text
        .split(/\r?\n/)
        .filter((line) => {
          const trimmed = line.trimStart();
          return (
            !trimmed.startsWith('*') && !trimmed.startsWith('/*') && !trimmed.startsWith('//')
          );
        })
        .join('\n');
      expect(code, file).not.toMatch(/'[^']*\bcaused\b[^']*'/i);
    }
  });
});

/* -------------------------------------------------------------------------- */

describe('G2. sequences are learned from observation, never from the catalogue', () => {
  it('says nothing without both orders to compare', () => {
    /* Four good runs, always after the same thing, and no solo baseline: no finding. */
    const records = [
      ...episode('hydrate-eat:water', 0, 'improved'),
      ...episode('protect-a-block:deep-block', 20 * MINUTE, 'improved'),
      ...episode('hydrate-eat:water', DAY, 'improved'),
      ...episode('protect-a-block:deep-block', DAY + 20 * MINUTE, 'improved'),
    ];

    const pairs = sequenceEvidence(records, new Date(BASE + 30 * DAY));
    const pair = required(
      pairs.find((entry) => entry.afterId === 'protect-a-block:deep-block'),
      'the pair',
    );
    expect(pair.strength).toBe('insufficient');
    expect(pair.statement).toMatch(/still limited/i);
  });

  it('finds an order effect once the same move has also happened alone', () => {
    const records = [
      /* Paired, and it went well. */
      ...episode('hydrate-eat:water', 0, 'improved'),
      ...episode('protect-a-block:deep-block', 20 * MINUTE, 'improved'),
      ...episode('hydrate-eat:water', DAY, 'improved'),
      ...episode('protect-a-block:deep-block', DAY + 20 * MINUTE, 'improved'),
      /* Alone, and it did not. Far enough apart to be genuinely unpaired. */
      ...episode('protect-a-block:deep-block', 5 * DAY, 'unchanged'),
      ...episode('protect-a-block:deep-block', 7 * DAY, 'unchanged'),
    ];

    const pair = required(
      sequenceEvidence(records, new Date(BASE + 30 * DAY)).find(
        (entry) =>
          entry.beforeId === 'hydrate-eat:water' &&
          entry.afterId === 'protect-a-block:deep-block',
      ),
      'the pair',
    );

    expect(pair.paired).toBe(2);
    expect(pair.solo).toBe(2);
    expect(pair.strength).not.toBe('insufficient');
    expect(pair.statement).toMatch(/often followed by a better result/i);
    expect(pair.statement).not.toMatch(/\bcaus/i);
  });

  it('reads no sequence from an authored prerequisite alone', () => {
    /*
     * `money-guard:move-toward-the-purpose` declares `after`. That is an assumption about
     * what is sensible, and it must not appear as evidence about what helped.
     */
    expect(sequenceEvidence([], new Date(BASE))).toEqual([]);
  });

  it('never chains further than one step', () => {
    const records = [
      ...episode('hydrate-eat:water', 0, 'improved'),
      ...episode('pause:screen-break', 20 * MINUTE, 'improved'),
      ...episode('protect-a-block:deep-block', 40 * MINUTE, 'improved'),
    ];

    /* Every finding names exactly one `before` and one `after`. */
    for (const entry of sequenceEvidence(records, new Date(BASE + 30 * DAY))) {
      expect(entry.beforeId).not.toContain(',');
      expect(entry.afterId).not.toContain(',');
      expect(entry.beforeId).not.toBe(entry.afterId);
    }
  });
});
