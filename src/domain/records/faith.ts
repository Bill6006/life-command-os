import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * `FaithAnchorRecord` — the twenty-seventh family, and Prompt 8F's only one.
 *
 * ## The three things the owner names himself
 *
 * A **value** is what he says matters. A **purpose** is why any of it does. A
 * **practice** is something he chose to do about it. All three are durable, all three
 * are referred to by later observations, and all three are **entirely his words**.
 *
 * There is no built-in list of any of them, and that absence is the point. Shipping a
 * catalogue of practices worth doing, or values worth holding, would be this application
 * taking a position on how a person should live — which is exactly the authority it does
 * not have and must never claim. The domain holds what he wrote down and nothing else.
 *
 * ## Why not a commitment
 *
 * A `CommitmentRecord` completes: it has a state and a due date, and open ones appear as
 * loops to close. A practice recurs and is never finished, and a value is not the kind of
 * thing that can be done at all. Filing "being present with my family" as an open
 * commitment would put it in a list of things outstanding, which is both untrue and the
 * beginning of treating a life by its backlog.
 *
 * ## What this family cannot hold
 *
 * No rating, no level, no maturity, no adherence, no streak, and no interpretation. There
 * is nowhere to put one. A record here says what he named and whether he still holds it —
 * never how well he is doing at it.
 */

export const FAITH_ANCHOR_KINDS = ['value', 'purpose', 'practice'] as const;
export type FaithAnchorKind = (typeof FAITH_ANCHOR_KINDS)[number];

export const FAITH_ANCHOR_KIND_LABELS: Record<FaithAnchorKind, string> = {
  value: 'What matters',
  purpose: 'Why it matters',
  practice: 'Something I do about it',
};

/**
 * Retired, not deleted.
 *
 * People stop doing things, and stopping is not a failure to record. A retired practice
 * keeps every observation ever made against it and stays readable — the alternative is an
 * app that quietly erases what someone used to care about.
 */
export const FAITH_ANCHOR_STATES = ['active', 'retired'] as const;
export type FaithAnchorState = (typeof FAITH_ANCHOR_STATES)[number];

export const faithAnchorRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('faith-anchor', 'observed'),
    kind: z.enum(FAITH_ANCHOR_KINDS),
    /** His words, unedited and never interpreted. */
    statement: z.string().min(1).max(300),
    state: z.enum(FAITH_ANCHOR_STATES),
    /**
     * The value this practice serves, when he chose to link them.
     *
     * Optional on purpose. A practice that serves nothing he has written down is still a
     * practice, and requiring a link would be the app insisting every action justify
     * itself against a stated principle.
     */
    servesRecordId: z.uuid().optional(),
    note: z.string().max(1000).optional(),
  }),
);
export type FaithAnchorRecord = z.infer<typeof faithAnchorRecord>;
