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
  /**
   * Activated by Prompt 8B, through the Health slice's own domain contract.
   *
   * Until now sleep, food, and readiness were filed under `time-attention-capacity`
   * because no better home existed — capacity is what they informed. That was a
   * category error waiting to compound: reflux is not "time, attention and capacity".
   * The slice that gives them a real home is the moment to fix it, and the health
   * domain reads **both** categories so nothing recorded before today is stranded.
   */
  'health-recovery-energy',
  /**
   * Activated by Prompt 8D, through the Fatherhood slice's own domain contract.
   *
   * The first category whose records are about **someone else**. Everything filed here
   * is classified `child`, which is why it needed its own home rather than sitting
   * alongside the owner's own state: a category is what an export offers to include,
   * and "my daughter's development" must never be swept up by a filter that meant
   * "my week".
   */
  'fatherhood-and-child',
  /**
   * Activated by Prompt 8E, through the Emotional slice's own domain contract.
   *
   * The mood, stress, confidence, and overwhelm scales deliberately **stay** in
   * `time-attention-capacity`: the core engine reads them to decide what anyone can
   * take on today, and they are general state rather than relationship content. This
   * category is for what the slice adds — connection, loneliness, boundaries, conflict
   * and repair — all of which is `relationship` data or more sensitive.
   */
  'emotional-and-relationships',
  /**
   * Activated by Prompt 8F, through the Faith slice's own domain contract.
   *
   * Its own category because everything filed here is classified `faith`, and because an
   * export offering to include "direction and commitments" must not sweep up what
   * someone believes along with their work goals.
   */
  'faith-and-meaning',
  /**
   * Activated by Prompt 8G, through the Home slice's own domain contract.
   *
   * Its own category because friction is about a place rather than about the owner, and
   * because an export offering "time, attention and capacity" should not sweep up a
   * description of somebody's house along with their working hours. Everything filed here
   * is `general` — the first slice-owned category that is not sensitive by default.
   */
  'home-and-environment',
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
