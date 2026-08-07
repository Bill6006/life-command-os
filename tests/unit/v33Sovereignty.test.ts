import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  blockMoveHere,
  forbidMove,
  modifyMove,
  pauseMove,
  restoreMove,
} from '../../src/application/commands/moveSovereignty';
import { listAllRecords } from '../../src/application/queries/readRecords';
import {
  contextMatches,
  modificationFor,
  moveStances,
  suppressedMoveIds,
} from '../../src/command-core/arbitration/stances';
import { parseCanonicalRecord } from '../../src/domain/records';
import { resetDatabase } from '../support/database';

/**
 * Section I and clarification 9: the owner's standing say over a move.
 *
 * The whole family exists to keep one thing from happening — a temporary inability turning
 * into a permanent prohibition without the owner ever choosing it. Every test here is
 * ultimately about that boundary.
 */

const MOVE = 'health:meditate';
const NOW = new Date('2026-08-07T13:00:00.000Z');

beforeEach(async () => {
  await resetDatabase();
});

/* -------------------------------------------------------------------------- */

describe('a pause ends by itself', () => {
  it('suppresses the move while it runs and releases it afterwards', async () => {
    const until = new Date('2026-08-10T13:00:00.000Z');
    expect((await pauseMove(MOVE, until, NOW)).ok).toBe(true);
    const records = await listAllRecords();

    const during = suppressedMoveIds(records, new Date('2026-08-08T13:00:00.000Z'), {});
    expect(during.has(MOVE)).toBe(true);
    expect(during.get(MOVE)).toMatch(/paused until/i);

    /* Nothing has to happen for this to lift. The clock is enough. */
    const after = suppressedMoveIds(records, new Date('2026-08-11T13:00:00.000Z'), {});
    expect(after.has(MOVE)).toBe(false);
  });

  it('refuses a pause that has already ended', async () => {
    const result = await pauseMove(MOVE, new Date('2026-08-06T13:00:00.000Z'), NOW);
    expect(result.ok).toBe(false);
  });

  it('cannot be written without an end date', () => {
    /*
     * Enforced by the schema, not by the command, so no future caller can route around it.
     * A pause with no end is a prohibition wearing a softer word.
     */
    const parsed = parseCanonicalRecord({
      recordId: '2f1e2c9a-0000-4000-8000-000000000001',
      recordType: 'move-preference',
      schemaVersion: 1,
      occurredAt: NOW.toISOString(),
      recordedAt: NOW.toISOString(),
      source: 'user-entry',
      provenance: { method: 'direct-report' },
      privacy: 'general',
      engineCandidateId: MOVE,
      stance: 'paused',
    });
    expect(parsed.ok).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('a context block applies only in that context', () => {
  it('suppresses at work and permits at home', async () => {
    expect((await blockMoveHere(MOVE, { setting: 'work', privacy: 'public' }, NOW)).ok).toBe(
      true,
    );
    const records = await listAllRecords();

    const atWork = suppressedMoveIds(records, NOW, { setting: 'work', privacy: 'public' });
    expect(atWork.has(MOVE)).toBe(true);

    const atHome = suppressedMoveIds(records, NOW, { setting: 'home', privacy: 'private' });
    expect(atHome.has(MOVE)).toBe(false);
  });

  it('does not apply when the situation is unknown', () => {
    /*
     * The dangerous direction. Applying "not while I am at work" when the app has no idea
     * where the owner is would quietly widen a narrow block at exactly the moment there is
     * no evidence for it.
     */
    expect(contextMatches({ setting: 'work' }, {})).toBe(false);
    expect(contextMatches({ setting: 'work' }, { setting: 'work' })).toBe(true);
  });

  it('requires every field it names to match, and ignores fields it does not', () => {
    const blocked = { setting: 'work', privacy: 'public' } as const;
    expect(contextMatches(blocked, { setting: 'work', privacy: 'public' })).toBe(true);
    expect(contextMatches(blocked, { setting: 'work', privacy: 'private' })).toBe(false);

    /* Engagement was not part of what the owner meant, so it does not affect the match. */
    expect(
      contextMatches(blocked, { setting: 'work', privacy: 'public', engagement: 'eating' }),
    ).toBe(true);
  });

  it('refuses a block that names no context at all', async () => {
    expect((await blockMoveHere(MOVE, {}, NOW)).ok).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('a modification changes the words, not the eligibility', () => {
  it('keeps the move in play and swaps in the owner’s wording', async () => {
    expect((await modifyMove(MOVE, 'Five minutes on the back step', NOW, 5)).ok).toBe(true);
    const records = await listAllRecords();

    expect(suppressedMoveIds(records, NOW, {}).has(MOVE)).toBe(false);
    expect(modificationFor(records, NOW, {}, MOVE)).toEqual({
      statement: 'Five minutes on the back step',
      minutes: 5,
    });
  });

  it('refuses an empty rewording', async () => {
    expect((await modifyMove(MOVE, '   ', NOW)).ok).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('forbidding and restoring', () => {
  it('holds indefinitely once forbidden', async () => {
    expect((await forbidMove(MOVE, NOW)).ok).toBe(true);
    const records = await listAllRecords();

    /* A year later, with no intervening evidence, it is still forbidden. */
    const later = suppressedMoveIds(records, new Date('2027-08-07T13:00:00.000Z'), {});
    expect(later.has(MOVE)).toBe(true);
    expect(later.get(MOVE)).toMatch(/never/i);
  });

  it('comes back the moment the owner restores it', async () => {
    await forbidMove(MOVE, NOW);
    await restoreMove(MOVE, new Date('2026-08-07T14:00:00.000Z'));
    const records = await listAllRecords();

    const after = suppressedMoveIds(records, new Date('2026-08-07T15:00:00.000Z'), {});
    expect(after.has(MOVE)).toBe(false);
  });

  it('can be forbidden again after being restored', async () => {
    /* Sovereignty is not a decision the owner gets to make once. */
    await forbidMove(MOVE, NOW);
    await restoreMove(MOVE, new Date('2026-08-07T14:00:00.000Z'));
    await forbidMove(MOVE, new Date('2026-08-07T15:00:00.000Z'));

    const records = await listAllRecords();
    expect(suppressedMoveIds(records, new Date('2026-08-07T16:00:00.000Z'), {}).has(MOVE)).toBe(
      true,
    );
  });

  it('keeps a forbidden move visible so it can be offered back', async () => {
    await forbidMove(MOVE, NOW);
    const stances = moveStances(await listAllRecords(), NOW, {});

    /* Filtered out of arbitration, but not out of existence — Restore needs to find it. */
    const found = stances.find((entry) => entry.engineCandidateId === MOVE);
    expect(found?.stance).toBe('forbidden');
    expect(found?.suppressed).toBe(true);
  });

  it('takes the most recent stance, whatever order the records arrive in', async () => {
    await pauseMove(MOVE, new Date('2026-09-01T00:00:00.000Z'), NOW);
    await restoreMove(MOVE, new Date('2026-08-07T14:00:00.000Z'));

    const shuffled = [...(await listAllRecords())].reverse();
    expect(
      suppressedMoveIds(shuffled, new Date('2026-08-07T15:00:00.000Z'), {}).has(MOVE),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */

describe('temporary inability never becomes a permanent preference', () => {
  it('writes no stance when a move is merely declined', async () => {
    /*
     * The boundary this whole family exists for. Declining lives on an `execution` record
     * and releases itself; a stance lives here and does not. There must be no path from
     * the first to the second.
     */
    const before = await listAllRecords();
    expect(before.filter((record) => record.recordType === 'move-preference')).toHaveLength(0);

    const declineSource = readFileSync('src/application/commands/decisionEpisode.ts', 'utf8');
    expect(declineSource).not.toContain('move-preference');
    expect(declineSource).not.toContain('moveSovereignty');
  });

  it('never infers a stance from repetition anywhere in the resolver', () => {
    /*
     * `moveStances` reads declared records only. If it ever counted executions, three
     * "not now, I am at work" answers could silently become "never" — the exact failure
     * section I forbids, and one the owner would have no way to see.
     */
    const source = readFileSync('src/command-core/arbitration/stances.ts', 'utf8');
    expect(source).not.toContain("recordType === 'execution'");
    expect(source).not.toContain('declineReason');
  });

  it('leaves a declined move eligible again once anything else is recorded', async () => {
    /* Proven in v33Capacity; asserted here as the counterpart to a stance persisting. */
    const records = await listAllRecords();
    expect(suppressedMoveIds(records, NOW, {}).size).toBe(0);
  });
});
