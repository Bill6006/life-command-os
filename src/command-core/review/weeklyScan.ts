import { domainDefinition } from '../../domain/domains/definitions';
import type { DomainSubmission, QuietArea, WeeklyScan, WeeklyScanRow } from '../boundary';
import { quietOnWeeklyScan } from '../coverage/forgotten';

/**
 * The Weekly Quick Domain Scan (Phase 8 deliverables 12, 13, 16; master plan §10).
 *
 * > The owner can skim and update without opening seven sequential flows. The
 * > one-question-at-a-time rule does not prohibit this scan surface.
 *
 * ## Why this does not break the one-question rule
 *
 * Because it is not a guide. A guide is the app asking; this is the owner looking. The
 * distinction the plan draws is between an adaptive flow that interrupts and a page opened
 * deliberately, and it is the same distinction Update This Area already rests on. Seven
 * rows on one screen would be a wall if the app pushed it at somebody; it is a relief when
 * they went looking for it.
 *
 * ## Every enabled area appears, including the ones with nothing to say
 *
 * That is the gate wording and it is load-bearing. An area with no evidence shows its
 * emptiness rather than being dropped — a scan that quietly hid the quiet areas would
 * defeat the forgotten-domain protection it exists to serve.
 *
 * ## What it never contains
 *
 * Nothing the owner wrote. Each domain's `standing` is counts and states; each `openItem`
 * names a category of thing rather than its content. That rule was set slice by slice —
 * faith withholds everything, money names a decision without quoting it — and this surface
 * is the reason it was set: several areas of life on one screen, and no control over who
 * is looking at it.
 *
 * The scan does not enforce that by filtering, because filtering would mean parsing the
 * owner's words to decide what to hide. It relies on each domain having withheld at the
 * point of writing, and a test walks every scan to check.
 */

export function buildWeeklyScan(
  submissions: readonly DomainSubmission[],
  quiet: readonly QuietArea[],
): WeeklyScan {
  const quietIds = quietOnWeeklyScan(quiet.filter((area) => area.raiseOn === 'weekly-scan'));

  const rows: WeeklyScanRow[] = submissions
    .filter((submission) => submission.enabled)
    .map((submission) => ({
      domainId: submission.domainId,
      label: domainDefinition(submission.domainId).label,
      freshness: submission.scan.freshness,
      standing: submission.scan.standing,
      openItem: submission.scan.openItem,
      lastMeaningfulUpdate: submission.scan.lastMeaningfulUpdate,
      quickResponses: submission.scan.quickResponses,
      quiet: quietIds.has(submission.domainId),
    }));

  const quietCount = rows.filter((row) => row.quiet).length;

  return {
    rows,
    quietCount,
    note:
      rows.length === 0
        ? 'No areas are switched on, so there is nothing to scan.'
        : quietCount === 0
          ? 'Every area has something recorded recently. Nothing here needs opening.'
          : `${String(quietCount)} of ${String(rows.length)} areas have had nothing for a while. That is a fact, not a instruction — quiet is often correct.`,
  };
}
