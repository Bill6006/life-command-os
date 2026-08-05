import type { FreshnessStatus } from '../../types';
import type { CareerEvidence } from './assessCareer';

/**
 * The domain-owned scan summary for career (shared rule 20, added in Phase 8).
 *
 * ## It does not quote the next step
 *
 * The owner's next step is his words, written into a field, and it can name an employer, a
 * colleague, or something he has told nobody. The scan says one is on record and whether
 * it is going stale; the sentence itself stays on the area page. That is the same rule the
 * faith and money scans hold, applied for the same reason — a weekly surface shows several
 * areas at once and nobody controls who is looking at it.
 */

export interface CareerScan {
  readonly domainId: 'career-and-learning';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildCareerScan(evidence: CareerEvidence): CareerScan {
  const lastSession = evidence.sessions
    .map((session) => session.at)
    .sort()
    .at(-1);

  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : evidence.sessionsThisWeek > 0
      ? `${String(evidence.sessionsThisWeek)} session${evidence.sessionsThisWeek === 1 ? '' : 's'} this week`
      : evidence.nextStep === undefined
        ? 'Nothing studied this week, and no next step written down'
        : 'Nothing studied this week';

  return {
    domainId: 'career-and-learning',
    freshness: evidence.anyEvidence ? 'fresh' : 'none',
    lastMeaningfulUpdate: lastSession,
    standing,
    openItem: evidence.openInterruption
      ? 'A session you were interrupted in and did not return to'
      : evidence.nextStep?.freshness === 'stale'
        ? 'A next step that has been on record a while'
        : undefined,
    quickResponses: [
      { promptId: 'update-area:career-and-learning', label: 'Did you study?' },
      { promptId: 'career:next-step', label: 'What is the next step?' },
    ],
  };
}
