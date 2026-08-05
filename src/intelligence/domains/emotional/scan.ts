import type { FreshnessStatus } from '../../types';
import type { EmotionalEvidence } from './assessEmotional';

/**
 * The domain-owned scan summary (Phase 7 shared rule 20).
 *
 * Phase 8 builds the Weekly Quick Domain Scan that shows every enabled area together.
 * This is what **this** domain will hand it: a freshness word, one line about where
 * things stand, at most one thing that is open, and two safe quick responses.
 *
 * ## Why the domain owns its own summary
 *
 * A central scan that reached into each domain's records would have to know what
 * "unresolved" means here, what counts as contact, and which of those is safe to show on
 * a shared screen. It would get one of them wrong eventually. The domain answers those
 * questions itself and hands over a shape the scan can render without understanding.
 *
 * ## Nothing protected reaches it
 *
 * The scan is a surface content can arrive on **unasked**, so nothing here quotes a note,
 * names a person, or mentions a protected topic. `quickResponses` are deliberately
 * coarse — a yes or no about whether something is still open — because a quick control
 * on a shared screen is the wrong place for detail.
 */

export interface EmotionalScan {
  readonly domainId: 'emotional-and-relationships';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  /** One line, safe to render anywhere. Never quotes anything the owner wrote. */
  readonly standing: string;
  /** The single open thing, when there is one. */
  readonly openItem: string | undefined;
  /** At most two, each answerable without opening the area. */
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildEmotionalScan(evidence: EmotionalEvidence): EmotionalScan {
  const openItem = evidence.persistentInterference
    ? 'Something has been in the way for weeks'
    : evidence.conflictOpen && !evidence.repairMade
      ? 'Something is unresolved with someone'
      : undefined;

  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : evidence.interference === 'a-lot'
      ? 'Something is getting in the way'
      : evidence.connectionDays === 0
        ? 'No contact recorded in the last fortnight'
        : `Contact on ${String(evidence.connectionDays)} of the last 14 days`;

  /*
   * Two responses at most, and both about what is *currently* open rather than about
   * how anything felt. A scan surface has to be answerable in one tap while standing
   * in a kitchen; anything that needs thought belongs behind Update This Area.
   */
  const quickResponses = [
    { promptId: 'emotional:interference', label: 'Is anything in the way today?' },
    ...(evidence.conflictOpen && !evidence.repairMade
      ? [{ promptId: 'emotional:repair-happened', label: 'Been back in touch?' }]
      : []),
  ];

  return {
    domainId: 'emotional-and-relationships',
    freshness: evidence.connectionFreshness,
    lastMeaningfulUpdate: evidence.lastConnectionAt,
    standing,
    openItem,
    quickResponses,
  };
}
