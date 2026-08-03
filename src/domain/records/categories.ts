import { z } from 'zod';

/**
 * Enabled life categories.
 *
 * These are **shared vocabulary, not domain schemas**. The initial alpha scope
 * (Product Constitution §13) covers three areas, and the plan is explicit that this
 * "is not permission to hard-code those three areas into separate engines" — they
 * use the same canonical records and the same intelligence contracts.
 *
 * Phase 7 activates further categories one at a time, each through its own domain
 * activation contract. Adding one here without that contract is a stop condition.
 */
export const ENABLED_CATEGORIES = [
  'time-attention-capacity',
  'direction-and-commitments',
  'career-work-learning',
] as const;
export type LifeCategory = (typeof ENABLED_CATEGORIES)[number];

export const lifeCategory = z.enum(ENABLED_CATEGORIES);

/**
 * Contexts that constrain what may be recommended. A protected context removes
 * candidates before ranking rather than penalising them during it (`SAFE-001`).
 */
export const PROTECTED_CONTEXTS = [
  'sleep',
  'family',
  'caregiving',
  'work-focus',
  'commute',
  'recovery',
] as const;
export type ProtectedContext = (typeof PROTECTED_CONTEXTS)[number];

export const protectedContext = z.enum(PROTECTED_CONTEXTS);

/** How a category or metric is moving. `insufficient-evidence` is a real answer. */
export const TRAJECTORY_DIRECTIONS = [
  'improving',
  'stable',
  'declining',
  'mixed',
  'insufficient-evidence',
] as const;
export type TrajectoryDirection = (typeof TRAJECTORY_DIRECTIONS)[number];

export const trajectoryDirection = z.enum(TRAJECTORY_DIRECTIONS);
