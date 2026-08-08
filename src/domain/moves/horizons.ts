import type { ObservationWindow } from './families';
import { findPattern } from './registry';

/**
 * When a move's effect can honestly be looked for (`V33-062`, v3.3 section G3).
 *
 * ## What was wrong
 *
 * Every execution opened the same seven-day window, whatever the move was. So a glass of
 * water and a change of routine were judged on the same clock: one stayed "unresolved" for
 * a week after it had plainly already worked or not, and the other was closed and scored
 * long before the thing it was meant to affect could have moved.
 *
 * The catalogue has declared `observationWindow` on all 113 patterns since D1 and nothing
 * read it. This is the module that makes the declaration mean something.
 *
 * ## Two horizons, not one
 *
 * `closes` is the earliest an outcome can be read. Before it, the answer is `unresolved` —
 * which is a true statement about the evidence, not a placeholder for a result.
 *
 * `expires` is the point past which asking would produce recall rather than observation.
 * A window that reaches it without an outcome stays permanently unresolved. That is a
 * deliberate dead end: an unanswered question is not a failure, and silently reading it as
 * one is how a learning system talks itself into conclusions nobody supplied.
 *
 * Expiry is a multiple of the close rather than a flat constant, because the useful recall
 * period scales with what is being remembered. Whether last night's wind-down helped is a
 * question with a short shelf life; whether a fortnight of earlier starts changed anything
 * is still answerable a fortnight later.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface Horizon {
  /** Earliest the effect can be read. Before this, the outcome is unresolved. */
  readonly closesAfterMs: number;
  /** Past this, asking produces recall rather than observation. */
  readonly expiresAfterMs: number;
}

/**
 * The five declared windows, in time.
 *
 * `immediate` is thirty minutes rather than zero: the point of an immediate move is that
 * the effect shows up in the same sitting, and asking the instant it finishes measures
 * having finished it. Completion is execution evidence, never effectiveness evidence.
 */
export const HORIZONS: Record<ObservationWindow, Horizon> = {
  immediate: { closesAfterMs: 30 * MINUTE, expiresAfterMs: 6 * HOUR },
  'same-day': { closesAfterMs: 6 * HOUR, expiresAfterMs: 36 * HOUR },
  'next-morning': { closesAfterMs: 14 * HOUR, expiresAfterMs: 3 * DAY },
  'multi-day': { closesAfterMs: 3 * DAY, expiresAfterMs: 14 * DAY },
  'multi-week': { closesAfterMs: 14 * DAY, expiresAfterMs: 56 * DAY },
};

/**
 * The horizon for a move that predates the catalogue, or is not from it at all.
 *
 * The seven-day window every execution used to get. Kept as the fallback rather than
 * replaced by a guess, so nothing recorded before this module changes meaning
 * retroactively — an execution's window must not move because the code was edited.
 */
export const DEFAULT_HORIZON: Horizon = {
  closesAfterMs: 7 * DAY,
  expiresAfterMs: 21 * DAY,
};

/**
 * What can be observed about this move, and when.
 *
 * Resolves through the registry, so a legacy candidate id recorded before the rename gets
 * the horizon of the pattern it became rather than falling through to the default.
 */
export function horizonFor(patternId: string | undefined): Horizon {
  if (patternId === undefined) return DEFAULT_HORIZON;
  const pattern = findPattern(patternId);
  if (pattern === undefined) return DEFAULT_HORIZON;
  return HORIZONS[pattern.observationWindow];
}

/** Whether this move's effect is one that can only be seen after the day ends. */
export function isDelayed(patternId: string | undefined): boolean {
  const pattern = patternId === undefined ? undefined : findPattern(patternId);
  if (pattern === undefined) return false;
  return (
    pattern.observationWindow === 'next-morning' ||
    pattern.observationWindow === 'multi-day' ||
    pattern.observationWindow === 'multi-week'
  );
}
