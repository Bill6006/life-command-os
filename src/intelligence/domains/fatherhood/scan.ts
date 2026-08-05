import type { FreshnessStatus } from '../../types';
import type { FatherhoodEvidence } from './assessFatherhood';

/**
 * The domain-owned scan summary for fatherhood (shared rule 20, added in Phase 8).
 *
 * ## The most withheld scan in the product
 *
 * Everything this domain holds is `child`-classified and about somebody who did not choose
 * to be recorded. So the scan names **no skill, no milestone, no moment, and never the
 * display name** — not even on a surface the owner opened, because the weekly scan shows
 * seven areas at once and a child's development is not something to have on screen while
 * somebody reads over a shoulder.
 *
 * An open concern is the one thing it will raise, and it raises it as "something you
 * flagged" rather than as what was flagged. That is enough for him to recognise and
 * useless to anybody else.
 */

export interface FatherhoodScan {
  readonly domainId: 'fatherhood';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildFatherhoodScan(evidence: FatherhoodEvidence): FatherhoodScan {
  const lastSkillAt = evidence.skills
    .map((skill) => skill.at)
    .sort()
    .at(-1);

  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : `${String(evidence.skills.length)} skill${evidence.skills.length === 1 ? '' : 's'} on record, ${String(evidence.momentsCaptured.length)} moment${evidence.momentsCaptured.length === 1 ? '' : 's'} kept`;

  return {
    domainId: 'fatherhood',
    freshness: evidence.anyEvidence ? 'fresh' : 'none',
    lastMeaningfulUpdate: lastSkillAt ?? evidence.lastTogetherAt,
    standing,
    openItem:
      evidence.openConcerns.length > 0
        ? 'Something you flagged and have not closed'
        : undefined,
    quickResponses: [{ promptId: 'update-area:fatherhood', label: 'Anything you noticed?' }],
  };
}
