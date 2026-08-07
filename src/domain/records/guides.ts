import { z } from 'zod';
import { envelopeShape, isoInstant, withEnvelopeInvariants } from './envelope';

/**
 * Guide sessions — the twenty-second canonical family (`OWN-016`–`OWN-021`, LEG-020).
 *
 * A guide session records that the owner sat down with the app and what came of it.
 * It is canonical rather than derived because it is a fact about the day that cannot
 * be reconstructed from the observations it produced: a session that legitimately
 * asked nothing new leaves no observations behind, and "I checked in and nothing had
 * changed" is different from "I never opened it".
 *
 * **There is no failure state, and there cannot be one.** The outcomes are completed,
 * stopped, snoozed, and skipped. Nothing here can express missed, overdue, broken, or
 * incomplete, so no later feature can quietly start counting them — which is what
 * makes "Snooze and Skip are never interpreted as failure" (LEG-021) structural
 * rather than a copywriting rule.
 *
 * Note what is absent: any notion of a *scheduled* session. A guide that was never
 * started leaves no record at all, so there is nothing for a backlog to be built from
 * (`OWN-007`).
 */

export const GUIDE_KINDS = [
  'morning',
  'morning-catch-up',
  'afternoon',
  'evening',
  'weekly',
  /** The ad-hoc check-in behind "Update state" (LEG-018). Shortest of them all. */
  'quick-check-in',
  /**
   * Update This Area — one domain's own questions, on demand (`XDS-034`).
   *
   * Its own kind because it is owned by the domain panel rather than by the clock, and
   * because keeping it separate is what stops a switched-on area adding questions to
   * the morning. Turning a domain on must never make the daily check-in longer.
   */
  'update-area',
] as const;
export type GuideKind = (typeof GUIDE_KINDS)[number];

/**
 * Depth modes (`OWN-021`, `V33-018`).
 *
 * Depth is **how much this check-in covers** — how many questions are worth asking. It
 * never changes the truth model: a brief morning and a thorough morning record the same
 * kinds of observation, and neither invents a value the owner did not give.
 *
 * ## What depth is not
 *
 * Depth is **not** how many minutes the owner has free, and never has been. That is a
 * separate, canonical observation with its own prompt (`context:available-minutes`) and its
 * own record. Conflating them was the reported defect: the stored values below are
 * minute-shaped strings, which made a coverage control read as a time budget, so the app
 * appeared to ask the owner for their free time and then do nothing with the answer.
 *
 * The wire values are kept because canonical records already carry them and records are
 * append-only. They are opaque level identifiers. Nothing may render them as minutes —
 * `tests/unit/v33GuideDepth.test.ts` fails the build if anything does.
 */
export const GUIDE_DEPTHS = ['15', '30', '45', 'full'] as const;
export type GuideDepth = (typeof GUIDE_DEPTHS)[number];

/**
 * How the session ended.
 *
 *   - `completed` — the guide ran out of questions worth asking.
 *   - `stopped` — the owner stopped early. Everything already answered is kept.
 *   - `snoozed` — ask again later. Carries when, and nothing else.
 *   - `skipped` — not this time. Carries an optional reason the owner volunteered.
 */
export const GUIDE_OUTCOMES = ['completed', 'stopped', 'snoozed', 'skipped'] as const;
export type GuideOutcome = (typeof GUIDE_OUTCOMES)[number];

export const guideSessionRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('guide-session', 'observed'),
      kind: z.enum(GUIDE_KINDS),
      depth: z.enum(GUIDE_DEPTHS),
      outcome: z.enum(GUIDE_OUTCOMES),
      /** The prompts actually shown, in order. Empty when the guide had nothing to ask. */
      promptIdsAnswered: z.array(z.string().min(1).max(120)),
      /** Prompts shown and passed over. Skipping one is an ordinary, costless choice. */
      promptIdsSkipped: z.array(z.string().min(1).max(120)),
      /** Observations this session produced. May legitimately be empty. */
      producedRecordIds: z.array(z.uuid()),
      /** Present only for `snoozed`. Required there — a snooze with no return is a drop. */
      remindAt: isoInstant.optional(),
      note: z.string().max(500).optional(),
    })
    .refine((r) => r.outcome !== 'snoozed' || r.remindAt !== undefined, {
      message: 'A snoozed guide must say when to ask again',
      path: ['remindAt'],
    })
    .refine((r) => r.outcome === 'snoozed' || r.remindAt === undefined, {
      message: 'Only a snoozed guide carries a reminder time',
      path: ['remindAt'],
    })
    .refine(
      (r) =>
        new Set([...r.promptIdsAnswered, ...r.promptIdsSkipped]).size ===
        r.promptIdsAnswered.length + r.promptIdsSkipped.length,
      {
        message: 'A prompt cannot be both answered and skipped in one session',
        path: ['promptIdsSkipped'],
      },
    ),
);
export type GuideSessionRecord = z.infer<typeof guideSessionRecord>;
