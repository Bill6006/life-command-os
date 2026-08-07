import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * The owner's standing decisions about a move (`V33-032`, section I, clarification 9).
 *
 * ## The distinction this record exists to protect
 *
 * Declining a move and forbidding a move are different acts, and the app must never turn
 * the first into the second. "Not now, I am at work" is a fact about the next hour. "Never
 * suggest this" is a correction about the move itself. An engine that quietly promotes the
 * first into the second after a few repetitions would look like it was learning, and would
 * in fact be deleting options the owner never rejected — silently, and for good.
 *
 * So temporary inability lives in `execution` records with a decline reason, expires the
 * moment anything else is recorded, and **cannot produce a stance here**. Everything in
 * this family is something the owner chose deliberately, on purpose, about the move.
 *
 * ## The stances
 *
 *   - **`paused`** — not for a while. Carries `until`, so it ends by itself. A pause with
 *     no end is a prohibition wearing a softer word.
 *   - **`blocked-here`** — not in *this* situation. Carries the situation it was blocked
 *     in, and applies only while that situation holds. At work today does not mean at home
 *     tonight.
 *   - **`modified`** — the right idea, wrong shape. Carries the owner's replacement wording
 *     and optionally a duration, and the move continues to compete on its merits.
 *   - **`forbidden`** — never suggest this. The only stance that is open-ended, and the
 *     only one reachable by an explicit, separately-worded control.
 *   - **`restored`** — undo any of the above. Present because a forbidden move that cannot
 *     come back is a decision the owner can only make once, which is not sovereignty.
 *
 * Every stance is superseded by a later one for the same move, so the whole history stays
 * readable and the current answer is always the most recent record.
 */

export const MOVE_STANCES = [
  'paused',
  'blocked-here',
  'modified',
  'forbidden',
  'restored',
] as const;
export type MoveStance = (typeof MOVE_STANCES)[number];

/**
 * The situation a `blocked-here` stance was taken in.
 *
 * Deliberately the same shape as `SituationalCapacity` minus the minute count, which is
 * too fine-grained to match on: "not while I am at work" is a rule someone might mean,
 * and "not while I have 23 minutes free" is not.
 */
export const blockedContext = z.strictObject({
  setting: z.enum(['home', 'work', 'out', 'travelling', 'other']).optional(),
  engagement: z
    .enum(['free', 'working', 'with-family', 'eating', 'travelling', 'winding-down'])
    .optional(),
  interruptibility: z.enum(['free', 'brief', 'none']).optional(),
  privacy: z.enum(['private', 'semi-private', 'public']).optional(),
});
export type BlockedContext = z.infer<typeof blockedContext>;

export const movePreferenceRecord = withEnvelopeInvariants(
  z
    .strictObject({
      ...envelopeShape('move-preference', 'observed'),
      /**
       * The generator's stable candidate id — `home:make-the-change`, not the record id.
       *
       * Matching on the record id could never work: it is unique per decision, so the
       * stance would apply to exactly one episode and never be found again.
       */
      engineCandidateId: z.string().min(1).max(160),
      stance: z.enum(MOVE_STANCES),
      /** Required by `paused`. When the pause ends by itself. */
      until: z.iso.datetime().optional(),
      /** Required by `blocked-here`. The situation this applies in, and only in. */
      inContext: blockedContext.optional(),
      /** Required by `modified`. The owner's wording, used in place of the generator's. */
      replacementStatement: z.string().min(1).max(300).optional(),
      /** Optional with `modified`. The owner's sense of how long it should take. */
      replacementMinutes: z.int().min(1).max(480).optional(),
      /**
       * Why, in the owner's words. Optional and never inferred — the app does not write a
       * reason on the owner's behalf for a decision the owner made.
       */
      note: z.string().max(300).optional(),
    })
    /*
     * Each stance carries exactly what it needs. A `paused` with no end is the failure this
     * guards against: it would read as temporary and behave as permanent.
     */
    .refine((record) => record.stance !== 'paused' || record.until !== undefined, {
      message: 'A pause must say when it ends',
      path: ['until'],
    })
    .refine(
      (record) =>
        record.stance !== 'blocked-here' ||
        (record.inContext !== undefined && Object.keys(record.inContext).length > 0),
      {
        message: 'A context block must name the context it applies in',
        path: ['inContext'],
      },
    )
    .refine(
      (record) => record.stance !== 'modified' || record.replacementStatement !== undefined,
      { message: 'A modification must say what it becomes', path: ['replacementStatement'] },
    ),
);
export type MovePreferenceRecord = z.infer<typeof movePreferenceRecord>;
