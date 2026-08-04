import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * `SkillClaimRecord` — the twenty-fourth canonical family, and the first that is
 * genuinely domain content (Prompt 8C task 7, LEG-062).
 *
 * A claim is something you would put on a CV or say in an interview: "I can build and
 * deploy a container app." It is an owner statement, so it cannot be derived — but
 * what supports it can be, and that separation is the whole point of the record.
 *
 * ## It has no field that asserts the claim is true
 *
 * There is no `proven`, no `verified`, no `level`, no `confidence`. Look for one; there
 * is nowhere to put it. Whether a claim is supported is **computed** from the evidence
 * that cites it, every time it is displayed.
 *
 * That is what makes "unsupported claims cannot be exported as true" (LEG-062)
 * structural rather than a rule someone has to remember. An export cannot render a
 * claim as proven, because the record does not contain the assertion — the most it can
 * say is what the evidence shows, and for an unsupported claim the evidence shows
 * nothing.
 *
 * ## Why the owner still writes it down
 *
 * Because the gap between what you would claim and what you could show is the single
 * most useful thing this domain can surface. A claim with no evidence is not a failure;
 * it is the next lab worth doing.
 */
export const skillClaimRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('skill-claim', 'observed'),
    /** As the owner would say it out loud. Their words, not a taxonomy. */
    statement: z.string().min(1).max(300),
    /**
     * The topic this belongs to, so evidence can be matched to it.
     * Owner-editable free text — never a hard-coded skill inventory (LEG-066).
     */
    topic: z.string().min(1).max(120),
    /**
     * Where the owner would use it. Changes what counts as adequate proof: a claim for
     * a CV needs more behind it than one for a conversation.
     */
    intendedUse: z.enum(['cv', 'interview', 'conversation', 'personal-target']),
    /**
     * Records the owner has linked as supporting this. May be empty, and an empty list
     * is the normal state for a new claim rather than a problem with it.
     */
    supportingRecordIds: z.array(z.uuid()),
    /** Retired rather than deleted, so the history of having claimed it survives. */
    state: z.enum(['active', 'retired']),
    note: z.string().max(500).optional(),
  }),
);
export type SkillClaimRecord = z.infer<typeof skillClaimRecord>;
