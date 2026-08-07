import type { CanonicalRecord } from '../records';
import { DOMAIN_IDS, type DomainId } from './definitions';

/**
 * Coverage cadence, snooze, and deliberate quiet (Phase 8 deliverable 19).
 *
 * ## Cadence can only ever reduce
 *
 * The single rule this file exists to enforce. A cadence setting narrows what the app may
 * raise about an area; it can never make something eligible that was not already. There is
 * no `More often` option and no code path that promotes.
 *
 * The reason is that eligibility is a statement about evidence — this question could change
 * a decision right now — and a preference cannot make that true. A dial that turned "ask me
 * more" into "ask me things that would not change anything" would produce exactly the
 * checklist the whole coverage design exists to prevent, and it would do it at the owner's
 * own request, which is worse.
 *
 * ## Deliberate quiet is not neglect
 *
 * An area marked `only-when-i-open-it` is not raised as forgotten. Somebody who has decided
 * to leave money alone this season has made a decision, and an app that kept flagging it
 * would be overriding that decision while calling it protection. The forgotten-domain
 * check reads this and skips those areas — which is the difference between noticing neglect
 * and nagging.
 *
 * ## Snooze has an end and leaves no debt
 *
 * A snooze names a date. Nothing accumulates while it runs and nothing is owed when it
 * lapses — the same non-punitive re-entry the guides have had since Prompt 7A. There is
 * deliberately no "you snoozed this three times" anywhere.
 */

export const COVERAGE_CADENCES = ['normal', 'less-often', 'only-when-i-open-it'] as const;
export type CoverageCadence = (typeof COVERAGE_CADENCES)[number];

export const DEFAULT_CADENCE: CoverageCadence = 'normal';

export const CADENCE_LABELS: Record<CoverageCadence, string> = {
  normal: 'Normal',
  'less-often': 'Less often',
  'only-when-i-open-it': 'Only when I open it',
};

export const CADENCE_EXPLANATIONS: Record<CoverageCadence, string> = {
  normal: 'Raised whenever the answer could change something.',
  'less-often':
    'Raised only when the answer could change what is eligible, not merely refine it.',
  'only-when-i-open-it':
    'Never raised on its own. It still records everything, and it is not counted as forgotten.',
};

/** How much a cadence multiplies a declared freshness window. Never below one. */
export const CADENCE_FRESHNESS_MULTIPLIER: Record<CoverageCadence, number> = {
  normal: 1,
  'less-often': 3,
  'only-when-i-open-it': 1,
};

export const CADENCE_ATTRIBUTE = 'preference:cadence';
export const SNOOZE_ATTRIBUTE = 'preference:snooze';

function newestState(
  records: readonly CanonicalRecord[],
  attribute: string,
): string | undefined {
  let newest: { at: string; value: string } | undefined;
  for (const record of records) {
    if (record.recordType !== 'observation') continue;
    if (record.attribute !== attribute) continue;
    if (record.value.kind !== 'state') continue;
    if (newest === undefined || record.recordedAt > newest.at) {
      newest = { at: record.recordedAt, value: record.value.state };
    }
  }
  return newest?.value;
}

export function cadenceFor(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
): CoverageCadence {
  const stored = newestState(records, `${CADENCE_ATTRIBUTE}:${domainId}`);
  return COVERAGE_CADENCES.find((cadence) => cadence === stored) ?? DEFAULT_CADENCE;
}

/** The instant a snooze runs until, when one is in force. */
export function snoozedUntil(
  records: readonly CanonicalRecord[],
  domainId: DomainId,
  now: Date,
): string | undefined {
  const stored = newestState(records, `${SNOOZE_ATTRIBUTE}:${domainId}`);
  if (stored === undefined) return undefined;
  const until = Date.parse(stored);
  if (Number.isNaN(until) || until <= now.getTime()) return undefined;
  return stored;
}

export interface CadenceSetting {
  readonly domainId: DomainId;
  readonly cadence: CoverageCadence;
  readonly snoozedUntil: string | undefined;
}

export function cadenceSettings(
  records: readonly CanonicalRecord[],
  now: Date,
): readonly CadenceSetting[] {
  return DOMAIN_IDS.map((domainId) => ({
    domainId,
    cadence: cadenceFor(records, domainId),
    snoozedUntil: snoozedUntil(records, domainId, now),
  }));
}

/** Areas the owner has deliberately made quiet, which are never reported as forgotten. */
export function intentionallyQuiet(records: readonly CanonicalRecord[]): ReadonlySet<DomainId> {
  return new Set(
    DOMAIN_IDS.filter((domainId) => cadenceFor(records, domainId) === 'only-when-i-open-it'),
  );
}
