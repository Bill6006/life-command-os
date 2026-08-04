import type { CanonicalRecord, ObservationRecord } from '../../domain/records';
import { isDomainId, type DomainId } from '../../domain/domains/definitions';

/**
 * Quick Capture plumbing (Prompt 8A task 8, `OWN-063`, LEG-057).
 *
 * **One capture writes one canonical event, and every surface that shows it is a
 * projection of that one record.**
 *
 * This is the single rule the whole rebuild was undertaken for. In the legacy app a
 * work win was entered in the career tab, again in the daily log, and again in the
 * weekly review — three records of one thing, drifting apart, each surface confident
 * it held the truth. The fix is not discipline; it is that there is only ever one
 * record, and `projectionsFor` describes where it *appears* rather than where it is
 * *stored*.
 *
 * Nothing here writes. Routing is a read-side question by construction, which is what
 * makes duplication impossible rather than merely discouraged.
 */

export const CAPTURE_SURFACES = [
  'timeline',
  'domain-detail',
  'learning',
  'weekly-review',
  'evidence',
  'export',
] as const;
export type CaptureSurface = (typeof CAPTURE_SURFACES)[number];

const CAPTURE_PREFIX = 'capture:';

/** True when this record came from Quick Capture. */
export function isCapture(record: CanonicalRecord): record is ObservationRecord {
  return record.recordType === 'observation' && record.attribute.startsWith(CAPTURE_PREFIX);
}

/**
 * The attribute a capture is filed under.
 *
 * `capture:<kind>` for a general event, `capture:<domainId>:<kind>` once a domain owns
 * it. The domain travels in the attribute rather than in a separate field so that a
 * capture made before a domain existed keeps working, and so that deleting the domain
 * framework leaves the record perfectly readable.
 */
export function captureAttribute(kind: string, domainId?: DomainId): string {
  const slug = kind
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const safe = slug === '' ? 'event' : slug;
  return domainId === undefined
    ? `${CAPTURE_PREFIX}${safe}`
    : `${CAPTURE_PREFIX}${domainId}:${safe}`;
}

/** The domain a capture belongs to, if any. Absent is normal, not an error. */
export function captureDomain(record: ObservationRecord): DomainId | undefined {
  const parts = record.attribute.slice(CAPTURE_PREFIX.length).split(':');
  const candidate = parts.length > 1 ? parts[0] : undefined;
  return isDomainId(candidate) ? candidate : undefined;
}

/**
 * Where one captured event appears.
 *
 * Note what this returns: a list of *surfaces*, from a single record. There is no
 * branch that returns records, because a routing function that returned records would
 * be one refactor away from returning copies of them.
 */
export function projectionsFor(record: ObservationRecord): readonly CaptureSurface[] {
  const surfaces: CaptureSurface[] = ['timeline', 'evidence', 'export'];
  if (captureDomain(record) !== undefined) surfaces.push('domain-detail');
  // Everything captured is available to the weekly review and to learning; neither
  // copies it, and both read the same record.
  surfaces.push('weekly-review', 'learning');
  return surfaces;
}

/**
 * Every captured event, newest first.
 *
 * The whole capture history from one query over the shared store. A per-domain capture
 * table would make this seven queries and make duplication the default.
 */
export function capturedEvents(
  records: readonly CanonicalRecord[],
): readonly ObservationRecord[] {
  return records
    .filter(isCapture)
    .slice()
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

/**
 * Detects the same event captured twice.
 *
 * Same attribute, same text, within a minute of each other. This does not prevent a
 * duplicate — the owner is allowed to record two similar things a minute apart — it
 * reports one, so a surface offering a second capture route can be caught in a test
 * (`AT-065`).
 */
export function duplicateCaptures(
  records: readonly CanonicalRecord[],
): readonly { readonly first: string; readonly second: string }[] {
  const captures = capturedEvents(records);
  const duplicates: { first: string; second: string }[] = [];

  for (let index = 0; index < captures.length; index += 1) {
    for (let other = index + 1; other < captures.length; other += 1) {
      const a = captures[index];
      const b = captures[other];
      if (a === undefined || b === undefined) continue;
      if (a.attribute !== b.attribute) continue;
      if (JSON.stringify(a.value) !== JSON.stringify(b.value)) continue;
      if (Math.abs(Date.parse(a.occurredAt) - Date.parse(b.occurredAt)) > 60_000) continue;
      duplicates.push({ first: a.recordId, second: b.recordId });
    }
  }

  return duplicates;
}
