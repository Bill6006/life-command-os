import type { FreshnessStatus } from '../../types';
import type { HomeEvidence } from './assessHome';

/**
 * The domain-owned scan summary (Phase 7 shared rule 20).
 *
 * What this domain will hand the Weekly Quick Domain Scan that Phase 8 builds.
 *
 * ## It quotes the change, and that is a decision rather than an oversight
 *
 * The faith slice's scan withholds everything the owner wrote, because a weekly scan puts
 * several areas of life on one screen and a sentence about someone's beliefs does not
 * belong there. This one shows the change he named — "move the charger to the desk" — for
 * the opposite reason: it describes an object in a room, it costs nothing if read over
 * his shoulder, and hiding it would make the scan useless without making anything safer.
 *
 * Withholding is applied where the content warrants it, not uniformly out of habit.
 */

export interface HomeScan {
  readonly domainId: 'home-and-environment';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildHomeScan(evidence: HomeEvidence): HomeScan {
  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : evidence.repeated.length > 0
      ? `${String(evidence.repeated.length)} thing${evidence.repeated.length === 1 ? '' : 's'} happening more than once`
      : evidence.totalFrictions === 0
        ? 'Nothing recorded as getting in the way'
        : 'Recorded, nothing twice';

  return {
    domainId: 'home-and-environment',
    freshness: evidence.observationCount > 0 ? 'fresh' : 'none',
    lastMeaningfulUpdate: evidence.frictions[0]?.lastAt,
    standing,
    openItem: evidence.openChange,
    quickResponses: [
      { promptId: 'update-area:home-and-environment', label: 'Anything in the way?' },
      { promptId: 'home:conditions', label: 'Noise, light, privacy' },
    ],
  };
}
