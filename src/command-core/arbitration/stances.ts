import type { CanonicalRecord, MoveStance, BlockedContext } from '../../domain/records';
import type { SituationalCapacity } from '../../domain/domains/capacity';

/**
 * The owner's standing say over a move, resolved (`V33-032`, section I).
 *
 * ## What this is not
 *
 * It is not `activeDeclines`. That reads `execution` records and answers "did the owner say
 * not-now, and has anything happened since" — a question about the last hour that releases
 * itself. This reads `move-preference` records and answers "what has the owner decided
 * about this move", which nothing releases except the owner.
 *
 * Keeping them apart is the whole point. The failure they are separated to prevent is an
 * engine that counts declines and concludes a preference: three "not now, I am at work"
 * answers becoming a permanent prohibition the owner never asked for and cannot see. There
 * is no code path from a decline to a stance, in either module, by construction.
 *
 * ## Precedence
 *
 * The most recent record wins, always. `restored` is not a special case that erases
 * history — it is simply a later stance that permits, which is why the owner can forbid,
 * restore, and forbid again without the record store having to forget anything.
 */

export interface ResolvedStance {
  readonly engineCandidateId: string;
  /** The move's wording when the stance was set. The only place it survives. */
  readonly moveStatement: string;
  readonly stance: MoveStance;
  /** True when this stance stops the move being offered right now. */
  readonly suppressed: boolean;
  /** Stated for the trace. Present whether or not it suppresses. */
  readonly because: string;
  /** Set by `modified`: the owner's wording, used in place of the generator's. */
  readonly replacementStatement?: string | undefined;
  readonly replacementMinutes?: number | undefined;
}

interface Declared {
  readonly engineCandidateId: string;
  readonly moveStatement: string;
  readonly stance: MoveStance;
  readonly recordedAt: string;
  readonly until?: string | undefined;
  readonly inContext?: BlockedContext | undefined;
  readonly replacementStatement?: string | undefined;
  readonly replacementMinutes?: number | undefined;
}

/**
 * Whether the situation the owner blocked a move in is the situation they are in now.
 *
 * Every field the stance names has to match. An unnamed field is not a wildcard that
 * matches everything — it was simply not part of what the owner meant, so it is ignored.
 *
 * An **unknown** current value never matches. "Not while I am at work" cannot be applied
 * when the app has no idea where the owner is; guessing would turn a narrow, situational
 * block into a broad one at exactly the moment there is no evidence for it.
 */
export function contextMatches(
  blocked: BlockedContext,
  situation: SituationalCapacity,
): boolean {
  const fields = ['setting', 'engagement', 'interruptibility', 'privacy'] as const;
  let named = 0;

  for (const field of fields) {
    const wanted = blocked[field];
    if (wanted === undefined) continue;
    named += 1;
    if (situation[field] !== wanted) return false;
  }

  /* A block naming nothing would suppress everywhere, which the schema already forbids. */
  return named > 0;
}

function latestPerMove(records: readonly CanonicalRecord[]): Map<string, Declared> {
  const latest = new Map<string, Declared>();

  for (const record of records) {
    if (record.recordType !== 'move-preference') continue;
    const entry: Declared = {
      engineCandidateId: record.engineCandidateId,
      moveStatement: record.moveStatement,
      stance: record.stance,
      recordedAt: record.recordedAt,
      until: record.until,
      inContext: record.inContext,
      replacementStatement: record.replacementStatement,
      replacementMinutes: record.replacementMinutes,
    };

    const current = latest.get(entry.engineCandidateId);
    if (current === undefined || entry.recordedAt > current.recordedAt) {
      latest.set(entry.engineCandidateId, entry);
    }
  }

  return latest;
}

/**
 * Every move the owner has taken a position on, and whether it applies right now.
 *
 * Returned in full rather than filtered to the suppressing ones, because a surface that
 * offers `Restore` needs to see a forbidden move in order to offer it back.
 */
export function moveStances(
  records: readonly CanonicalRecord[],
  now: Date,
  situation: SituationalCapacity,
): readonly ResolvedStance[] {
  const out: ResolvedStance[] = [];

  for (const declared of latestPerMove(records).values()) {
    const base = {
      engineCandidateId: declared.engineCandidateId,
      moveStatement: declared.moveStatement,
      stance: declared.stance,
      ...(declared.replacementStatement === undefined
        ? {}
        : { replacementStatement: declared.replacementStatement }),
      ...(declared.replacementMinutes === undefined
        ? {}
        : { replacementMinutes: declared.replacementMinutes }),
    };

    switch (declared.stance) {
      case 'forbidden':
        out.push({ ...base, suppressed: true, because: 'You asked never to be offered this' });
        break;

      case 'paused': {
        const until = declared.until === undefined ? undefined : Date.parse(declared.until);
        const stillPaused =
          until !== undefined && !Number.isNaN(until) && now.getTime() < until;
        out.push({
          ...base,
          suppressed: stillPaused,
          because: stillPaused
            ? `Paused until ${new Date(until).toISOString().slice(0, 10)}`
            : 'The pause you set has ended',
        });
        break;
      }

      case 'blocked-here': {
        const here =
          declared.inContext !== undefined && contextMatches(declared.inContext, situation);
        out.push({
          ...base,
          suppressed: here,
          because: here
            ? 'You blocked this in the situation you are in'
            : 'Blocked in a different situation from this one',
        });
        break;
      }

      case 'modified':
        /* A modification changes the wording, never the eligibility. */
        out.push({ ...base, suppressed: false, because: 'Reworded by you' });
        break;

      case 'restored':
        out.push({ ...base, suppressed: false, because: 'You put this back' });
        break;
    }
  }

  return out;
}

/** Just the ids that must not be offered right now, for the arbitration filter. */
export function suppressedMoveIds(
  records: readonly CanonicalRecord[],
  now: Date,
  situation: SituationalCapacity,
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const resolved of moveStances(records, now, situation)) {
    if (resolved.suppressed) map.set(resolved.engineCandidateId, resolved.because);
  }
  return map;
}

/** The owner's replacement wording for a move, when they have given one. */
export function modificationFor(
  records: readonly CanonicalRecord[],
  now: Date,
  situation: SituationalCapacity,
  engineCandidateId: string,
): { readonly statement: string; readonly minutes?: number | undefined } | undefined {
  const found = moveStances(records, now, situation).find(
    (entry) => entry.engineCandidateId === engineCandidateId && entry.stance === 'modified',
  );
  if (found?.replacementStatement === undefined) return undefined;
  return {
    statement: found.replacementStatement,
    ...(found.replacementMinutes === undefined ? {} : { minutes: found.replacementMinutes }),
  };
}
