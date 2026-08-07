import {
  RECORD_SCHEMA_VERSION,
  type BlockedContext,
  type MoveStance,
} from '../../domain/records';
import { newRecordId } from '../../domain/records/envelope';
import { writeRecord } from './writeRecord';
import { localTimeContextFor } from './capture';

/**
 * The owner's standing decisions about a move (`V33-032`, section I).
 *
 * ## Why this is its own command
 *
 * Because `declineRecommendation` must never be able to reach it. Declining is a report
 * about the moment; a stance is an instruction about the move. Two commands, two record
 * families, no shared path — so "not now, I am at work" cannot become "never" through any
 * amount of repetition, aggregation, or well-meaning inference.
 *
 * Every function here is called from an explicit, separately-worded control. Nothing in
 * this file is ever invoked on the owner's behalf.
 */

export interface StanceResult {
  readonly ok: boolean;
  readonly issues: readonly string[];
}

async function write(
  engineCandidateId: string,
  stance: MoveStance,
  now: Date,
  extra: Record<string, unknown>,
): Promise<StanceResult> {
  const instant = now.toISOString();
  const result = await writeRecord({
    recordId: newRecordId(),
    recordType: 'move-preference',
    schemaVersion: RECORD_SCHEMA_VERSION,
    occurredAt: instant,
    recordedAt: instant,
    localTime: localTimeContextFor(now),
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    privacy: 'general',
    engineCandidateId,
    stance,
    ...extra,
  });

  return { ok: result.ok, issues: result.ok ? [] : result.issues };
}

/**
 * Not for a while.
 *
 * `until` is required by the schema, not by politeness. A pause without an end is a
 * prohibition in softer wording, and the owner would have no way to tell the difference
 * until months had gone by and the move had never come back.
 */
export async function pauseMove(
  engineCandidateId: string,
  until: Date,
  now: Date,
  note?: string,
): Promise<StanceResult> {
  if (until.getTime() <= now.getTime()) {
    return { ok: false, issues: ['A pause has to end in the future'] };
  }
  return write(engineCandidateId, 'paused', now, {
    until: until.toISOString(),
    ...(note === undefined ? {} : { note }),
  });
}

/**
 * Not in *this* situation.
 *
 * The narrowest of the standing stances, and the one that answers the case the owner
 * actually hits most: a move that is fine in principle and impossible at their desk. It
 * carries the situation with it, so it lifts by itself the moment the situation changes.
 */
export async function blockMoveHere(
  engineCandidateId: string,
  inContext: BlockedContext,
  now: Date,
  note?: string,
): Promise<StanceResult> {
  if (Object.keys(inContext).length === 0) {
    return {
      ok: false,
      issues: ['A context block has to name a context, or it is a prohibition'],
    };
  }
  return write(engineCandidateId, 'blocked-here', now, {
    inContext,
    ...(note === undefined ? {} : { note }),
  });
}

/**
 * The right idea in the wrong words.
 *
 * The move keeps competing on its merits and keeps its evidence history; only what the
 * owner reads changes. Rewording is not a rejection and must not be recorded as one — an
 * engine that treated "say it like this instead" as evidence against the move would learn
 * precisely the wrong thing from being corrected.
 */
export async function modifyMove(
  engineCandidateId: string,
  replacementStatement: string,
  now: Date,
  replacementMinutes?: number,
): Promise<StanceResult> {
  const trimmed = replacementStatement.trim();
  if (trimmed.length === 0) {
    return { ok: false, issues: ['A modification has to say what the move becomes'] };
  }
  return write(engineCandidateId, 'modified', now, {
    replacementStatement: trimmed,
    ...(replacementMinutes === undefined ? {} : { replacementMinutes }),
  });
}

/**
 * Never suggest this.
 *
 * Open-ended, and the only stance that is. It is reachable from exactly one control, whose
 * wording says what it does, and it is undone by `restoreMove` — because a decision the
 * owner can only make once is not sovereignty, it is a trapdoor.
 */
export async function forbidMove(
  engineCandidateId: string,
  now: Date,
  note?: string,
): Promise<StanceResult> {
  return write(engineCandidateId, 'forbidden', now, {
    ...(note === undefined ? {} : { note }),
  });
}

/** Put it back. Supersedes whatever stance was last set, including a prohibition. */
export async function restoreMove(
  engineCandidateId: string,
  now: Date,
  note?: string,
): Promise<StanceResult> {
  return write(engineCandidateId, 'restored', now, {
    ...(note === undefined ? {} : { note }),
  });
}
