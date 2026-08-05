import { maySurface } from '../../../domain/emotional/permissions';
import type { CanonicalRecord } from '../../../domain/records';
import type { FreshnessStatus } from '../../types';
import { moneyFreshness, type MoneyEvidence } from './assessMoney';

/**
 * The domain-owned scan summary (Phase 7 shared rule 20).
 *
 * What this domain will hand the Weekly Quick Domain Scan that Phase 8 builds.
 *
 * ## It quotes nothing, and it withholds amounts twice over
 *
 * The weekly scan puts several areas of life on one screen, and the owner does not choose
 * what each one says. A money decision he is weighing can be about a job, a relative, or a
 * payment he cannot make — so the scan names the *category* of thing and never its
 * content, exactly as the faith scan does.
 *
 * Figures are held to a further test. Switching `money-figures` on says he wants to record
 * amounts; it does not say they may appear on a surface he did not open. The scan checks
 * `maySurface(..., 'weekly-scan')` separately, which is the enabling-is-not-permitting
 * separation from Prompt 8E applied to the one thing in this domain that carries a number.
 */

export interface MoneyScan {
  readonly domainId: 'money';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildMoneyScan(
  records: readonly CanonicalRecord[],
  evidence: MoneyEvidence,
): MoneyScan {
  const mayShowFigures =
    evidence.figuresEnabled && maySurface(records, 'money-figures', 'weekly-scan');

  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : evidence.notLookingLately
      ? 'Not looked at recently'
      : evidence.pressure === undefined
        ? 'Recorded, with no pressure reading yet'
        : mayShowFigures && evidence.goalTarget !== undefined
          ? `${evidence.pressure.label} on your mind · ${String(evidence.goalCurrent ?? 0)} of ${String(evidence.goalTarget)}`
          : `${evidence.pressure.label} on your mind`;

  return {
    domainId: 'money',
    freshness: moneyFreshness(evidence),
    lastMeaningfulUpdate: evidence.pressureAt ?? evidence.lastLookedAt,
    standing,
    /*
     * The category of thing, never its content. "A decision you are weighing" is enough
     * for him to recognise; the sentence he wrote stays where he wrote it.
     */
    openItem: evidence.openDecision === undefined ? undefined : 'A decision you are weighing',
    quickResponses: [
      { promptId: 'money:financial-pressure', label: 'Money on your mind right now' },
      { promptId: 'update-area:money', label: 'When did you last look?' },
    ],
  };
}
