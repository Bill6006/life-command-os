import { z } from 'zod';
import { DOMAIN_IDS } from '../domains/definitions';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * `DomainPreferenceRecord` — the twenty-third canonical family (Prompt 8A task 1).
 *
 * Whether an area of life is switched on is the owner's decision, with a date and a
 * reason. It belongs in a backup, it belongs in history, and it is exactly the kind of
 * fact that must not live in a settings blob that a restore would quietly drop.
 *
 * ## What this is not
 *
 * It is **not a truth store for the domain**. It carries no observations, no metrics,
 * no state — only the preference. Every fact a domain displays still comes from the
 * shared canonical records, which is what stops seven domains becoming seven parallel
 * databases (`XDS-073`).
 *
 * ## Disabling never deletes
 *
 * There is no destructive branch here. Turning a domain off appends a record saying
 * so; the observations that domain was reading stay exactly where they are, and
 * turning it back on shows them again. That is required (`Phase 7 gate`: "one domain
 * may be disabled without corrupting history") and it is also the only behaviour that
 * makes switching a domain off a safe thing to try.
 */

export const DOMAIN_STATES = [
  /** Generates a candidate, shows a panel, may be asked about. */
  'enabled',
  /**
   * Visible and readable, but generates no candidate and asks nothing.
   * For an area that matters and is not the current focus.
   */
  'deprioritised',
  /** Silent everywhere. Its records remain, untouched and un-deleted. */
  'disabled',
] as const;
export type DomainState = (typeof DOMAIN_STATES)[number];

export const domainPreferenceRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('domain-preference', 'observed'),
    domainId: z.enum(DOMAIN_IDS),
    state: z.enum(DOMAIN_STATES),
    /**
     * Why, in the owner's words. Optional and never inferred — the app does not get
     * to write a reason on the owner's behalf for a decision the owner made.
     */
    reason: z.string().max(300).optional(),
  }),
);
export type DomainPreferenceRecord = z.infer<typeof domainPreferenceRecord>;
