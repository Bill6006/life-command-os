import { z } from 'zod';
import { envelopeShape, withEnvelopeInvariants } from './envelope';

/**
 * `SurfacePermissionRecord` — the twenty-sixth family, and Prompt 8E's only one.
 *
 * ## Why this is a family and not an attribute
 *
 * Every other preference in this product decides what the owner *sees*. This one decides
 * what the product may **show without being asked** — and getting it wrong means private
 * content appearing on a screen at the wrong moment, in front of the wrong person.
 *
 * As an ordinary observation it would be a string under a string, writable by anything
 * that writes observations, and a typo in either would silently read as "no permission
 * recorded". Failing closed is the right default, but a permission that is *impossible
 * to state incorrectly* is better than one that merely fails safely when mistyped. Here
 * the topic and the surface are enums: an unknown value is a parse failure rather than a
 * quietly ignored record.
 *
 * ## Off unless explicitly granted, and revocable
 *
 * There is no "enabled by default" anywhere in this file. Absence means not granted, a
 * grant names exactly one topic and one surface, and revoking appends a record rather
 * than deleting one — so "I turned this off in March" stays true and readable.
 */

/**
 * Topics that never surface without permission (Master Plan v3.2 §11).
 *
 * Everything here is either about another person or about something the owner would not
 * want on a shared screen. General health — mood, sleep, energy, pain interference — is
 * deliberately **not** in this list: it may surface contextually, and treating it as
 * secret would make the product useless for the thing it is mainly for.
 */
export const PROTECTED_TOPICS = [
  'private-pattern',
  'relationship-detail',
  'conflict-detail',
  'dating',
  /**
   * Doubt, dryness, and difficulty (Prompt 8F).
   *
   * Protected for the same reason a private journal is: it is written in full sentences,
   * it is nobody else's business, and it is the last thing anyone would want on a screen
   * someone else can see. It is **not** protected because it is a problem — the domain
   * has no view on that at all.
   */
  'faith-struggle',
  /**
   * Amounts and balances (Prompt 8H).
   *
   * The plan defers "detailed account, transaction, bill, debt, credit, and portfolio
   * machinery **unless separately activated**", and this is the separate activation. The
   * money domain works fully without it: pressure, resilience, avoidance, what the money
   * is for, and the decisions taken are all bands and words. Switching this on adds
   * exactly one capability — a figure against one goal — and with it the only earned
   * percentage in the product.
   */
  'money-figures',
  /**
   * A practice the owner named, quoted back to him (Phase 8 repair pass).
   *
   * The faith scan withheld his words from the weekly review from the day it was written,
   * on the grounds that a surface showing several areas at once is not one he controls the
   * audience of. Now is that argument at its strongest: it is the default landing screen,
   * open more often than anything else, and nobody chooses what it shows.
   *
   * Switching the area on says he wants somewhere to record a practice. It does not say the
   * words may appear on the front page. Those are two decisions and this is the second.
   */
  'faith-practice',
] as const;
export type ProtectedTopic = (typeof PROTECTED_TOPICS)[number];

export const PROTECTED_TOPIC_LABELS: Record<ProtectedTopic, string> = {
  'private-pattern': 'Private patterns',
  'relationship-detail': 'Relationship detail',
  'conflict-detail': 'Conflict detail',
  dating: 'Dating',
  'faith-struggle': 'Doubt and struggle',
  'money-figures': 'Amounts and balances',
  'faith-practice': 'Practices, in your words',
};

/**
 * Where a topic may appear once permitted.
 *
 * `manual-only` is the floor and cannot be revoked, because it means "shown when the
 * owner deliberately opens it" — which is not the app surfacing anything. Everything
 * else is a place the content could arrive **unasked**, which is why each is granted
 * separately rather than by one switch.
 */
export const PERMISSIBLE_SURFACES = [
  /**
   * The default landing screen (Phase 8 repair pass).
   *
   * Added last and deliberately: Now is the surface the owner sees most and chooses least,
   * which makes it the one where "the area is switched on" is furthest from "these words may
   * appear here". Anything gated on this surface is content the app may hold, act on, and
   * describe in the abstract — while quoting it only where he said so.
   */
  'now',
  'guide',
  'weekly-scan',
  'notification',
  'ai-export',
] as const;
export type PermissibleSurface = (typeof PERMISSIBLE_SURFACES)[number];

export const SURFACE_LABELS: Record<PermissibleSurface, string> = {
  now: 'The Now screen',
  guide: 'Daily check-ins',
  'weekly-scan': 'The weekly review',
  notification: 'Notifications',
  'ai-export': 'The readable export',
};

export const surfacePermissionRecord = withEnvelopeInvariants(
  z.strictObject({
    ...envelopeShape('surface-permission', 'observed'),
    topic: z.enum(PROTECTED_TOPICS),
    surface: z.enum(PERMISSIBLE_SURFACES),
    /** `true` grants; `false` revokes. Both are appended, never deleted. */
    granted: z.boolean(),
    /** The owner's reason, if he gave one. Never inferred, never required. */
    reason: z.string().max(300).optional(),
  }),
);
export type SurfacePermissionRecord = z.infer<typeof surfacePermissionRecord>;
