import type { CanonicalRecord, SurfacePermissionRecord } from '../records';
import {
  PERMISSIBLE_SURFACES,
  PROTECTED_TOPICS,
  type PermissibleSurface,
  type ProtectedTopic,
} from '../records/permissions';

/**
 * Reading surface permissions (Prompt 8E, Master Plan v3.2 §11).
 *
 * One function does the work, and everything sensitive in the product is expected to
 * call it before showing anything. It answers a single question — *may this topic appear
 * on this surface without the owner having opened it* — and the answer is `false` unless
 * a record says otherwise.
 *
 * ## Manual is not a permission
 *
 * `manual-only` is not in the surface list, because deliberately opening a screen is not
 * the app surfacing anything. Everything a permission governs is a place content could
 * arrive **unasked**: a check-in, the weekly review, a notification, an export.
 */

/** Newest decision per topic-and-surface pair. Absence means not granted. */
function currentGrants(
  records: readonly CanonicalRecord[],
): Map<string, SurfacePermissionRecord> {
  const newest = new Map<string, SurfacePermissionRecord>();

  for (const record of records) {
    if (record.recordType !== 'surface-permission') continue;
    const key = `${record.topic}|${record.surface}`;
    const existing = newest.get(key);
    if (existing === undefined || record.recordedAt > existing.recordedAt) {
      newest.set(key, record);
    }
  }

  return newest;
}

/**
 * Whether one topic may appear on one surface unasked.
 *
 * Fails closed in every direction: no record, a revoking record, an unknown topic, or an
 * unknown surface all produce `false`.
 */
export function maySurface(
  records: readonly CanonicalRecord[],
  topic: ProtectedTopic,
  surface: PermissibleSurface,
): boolean {
  return currentGrants(records).get(`${topic}|${surface}`)?.granted === true;
}

/** Every grant currently in force, for the screen that shows the owner what he allowed. */
export function grantedSurfaces(
  records: readonly CanonicalRecord[],
  topic: ProtectedTopic,
): readonly PermissibleSurface[] {
  return PERMISSIBLE_SURFACES.filter((surface) => maySurface(records, topic, surface));
}

/**
 * True when the owner has switched a protected topic on at all.
 *
 * Separate from permission: a topic can be **enabled** — meaning he wants to record it,
 * and it appears when he opens it — while being permitted on no surface at all. That is
 * the default for Private Patterns and the whole point of the distinction.
 */
export const TOPIC_ENABLED_ATTRIBUTE = 'privacy:topic-enabled';

/**
 * The attribute Prompt 8E wrote, still read.
 *
 * The switch was named `emotional:topic-enabled` when the emotional slice was the only
 * thing with a protected topic. Prompt 8H added `money-figures`, and "the emotional slice
 * owns the money switch" is the kind of thing that looks like a defect forever. The
 * neutral attribute is written from now on; the old one is still read so a profile
 * created before this change keeps its decisions.
 */
const LEGACY_TOPIC_ENABLED_ATTRIBUTE = 'emotional:topic-enabled';

export function topicEnabled(
  records: readonly CanonicalRecord[],
  topic: ProtectedTopic,
): boolean {
  const decisions = records
    .filter(
      (record) =>
        record.recordType === 'observation' &&
        (record.attribute === `${TOPIC_ENABLED_ATTRIBUTE}:${topic}` ||
          record.attribute === `${LEGACY_TOPIC_ENABLED_ATTRIBUTE}:${topic}`),
    )
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const newest = decisions[0];
  if (newest?.recordType !== 'observation') return false;
  return newest.value.kind === 'state' && newest.value.state === 'On';
}

/** Topics the owner has switched on. Empty is the normal, shipped state. */
export function enabledTopics(records: readonly CanonicalRecord[]): readonly ProtectedTopic[] {
  return PROTECTED_TOPICS.filter((topic) => topicEnabled(records, topic));
}

/**
 * Whether a piece of content may be included in a readable export.
 *
 * The export already filters by privacy class. This is the second gate: a protected
 * topic stays out **even when its privacy class was included**, unless the owner
 * separately permitted the export surface. `private-pattern` therefore requires two
 * deliberate choices before it can ever leave the device in readable form, which is what
 * the plan means by "excluded unless separately and explicitly included".
 */
export function mayExport(records: readonly CanonicalRecord[], topic: ProtectedTopic): boolean {
  return maySurface(records, topic, 'ai-export');
}
