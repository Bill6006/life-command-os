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
] as const;
export type ProtectedTopic = (typeof PROTECTED_TOPICS)[number];

export const PROTECTED_TOPIC_LABELS: Record<ProtectedTopic, string> = {
  'private-pattern': 'Private patterns',
  'relationship-detail': 'Relationship detail',
  'conflict-detail': 'Conflict detail',
  dating: 'Dating',
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
  'guide',
  'weekly-scan',
  'notification',
  'ai-export',
] as const;
export type PermissibleSurface = (typeof PERMISSIBLE_SURFACES)[number];

export const SURFACE_LABELS: Record<PermissibleSurface, string> = {
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
