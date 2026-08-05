import type { FreshnessStatus } from '../../types';
import type { FaithEvidence } from './assessFaith';

/**
 * The domain-owned scan summary (Phase 7 shared rule 20).
 *
 * What this domain will hand the Weekly Quick Domain Scan that Phase 8 builds.
 *
 * ## What it withholds
 *
 * It quotes **nothing**. Not a value, not a purpose, not a practice, and certainly not a
 * struggle note. A weekly scan is a surface where several areas of life appear together
 * and the owner did not choose what each one says — putting "you wrote: being a better
 * father" on it, next to a money figure, is the kind of thing that makes someone stop
 * using an app on a train.
 *
 * So the scan says how many things are on record and whether one is open. The words stay
 * behind a screen he opened.
 */

export interface FaithScan {
  readonly domainId: 'faith-and-meaning';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  /** Counts only. Never quotes anything the owner wrote. */
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildFaithScan(evidence: FaithEvidence): FaithScan {
  const lastPractice = evidence.practices
    .flatMap((practice) => (practice.lastAt === undefined ? [] : [practice.lastAt]))
    .sort()
    .at(-1);

  const standing = !evidence.anyEvidence
    ? 'Nothing written down yet'
    : evidence.activePractices === 0
      ? 'Named, with nothing chosen to do yet'
      : `${String(evidence.activePractices)} practice${evidence.activePractices === 1 ? '' : 's'} on record`;

  return {
    domainId: 'faith-and-meaning',
    freshness: evidence.observationCount > 0 ? 'fresh' : 'none',
    lastMeaningfulUpdate: lastPractice ?? evidence.lastServiceAt,
    standing,
    /*
     * An open repair is named as a category of thing, never as its content. "Something
     * you decided to put right" is enough for him to recognise; the sentence he wrote
     * stays where he wrote it.
     */
    openItem:
      evidence.openRepair !== undefined && !evidence.repairDone
        ? 'Something you decided to put right'
        : undefined,
    quickResponses: [{ promptId: 'update-area:faith-and-meaning', label: 'Anything happen?' }],
  };
}
