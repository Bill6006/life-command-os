import type { FreshnessStatus } from '../../types';
import type { HealthEvidence } from './assessHealth';

/**
 * The domain-owned scan summary for health (shared rule 20, added in Phase 8).
 *
 * Prompt 8B predates the rule — it arrived with Master Plan v3.2, three slices later — so
 * health, career, and fatherhood shipped without one. The Phase 8 gate requires **every**
 * enabled domain to appear on the Weekly Quick Domain Scan, which is what makes the three
 * missing summaries a gap to fill rather than a nicety.
 *
 * They are written to the same shape the four later slices arrived at independently, which
 * is the shape Command Core's `DomainScan` now names.
 *
 * ## What it withholds
 *
 * Pain and symptoms are the sensitive part of this domain, and the scan says a reading
 * exists without saying what it was. General health may surface contextually per §11 —
 * the reason to be brief here is a screen showing seven areas at once, not secrecy.
 */

export interface HealthScan {
  readonly domainId: 'health-recovery-energy';
  readonly freshness: FreshnessStatus;
  readonly lastMeaningfulUpdate: string | undefined;
  readonly standing: string;
  readonly openItem: string | undefined;
  readonly quickResponses: readonly { readonly promptId: string; readonly label: string }[];
}

export function buildHealthScan(evidence: HealthEvidence): HealthScan {
  const readings = [
    evidence.physicalEnergy,
    evidence.mentalEnergy,
    evidence.generalEnergy,
    evidence.recovery,
    evidence.readiness,
  ].filter((reading) => reading !== undefined);

  const lastAt = readings
    .map((reading) => reading.at)
    .sort()
    .at(-1);

  const standing = !evidence.anyEvidence
    ? 'Nothing recorded yet'
    : evidence.painInterference !== undefined &&
        evidence.painInterference.value !== 'not-at-all'
      ? 'Something physical is being worked around'
      : evidence.recovery === undefined
        ? `${String(readings.length)} current reading${readings.length === 1 ? '' : 's'}`
        : `Recovery and energy on record`;

  return {
    domainId: 'health-recovery-energy',
    freshness: evidence.anyEvidence ? 'fresh' : 'none',
    lastMeaningfulUpdate: lastAt,
    standing,
    /*
     * A contradiction is the one thing here worth raising on a scan: two credible records
     * disagreeing is a fact about the evidence that no single reading shows.
     */
    openItem:
      evidence.contradictions.length > 0
        ? 'Two readings that disagree with each other'
        : undefined,
    quickResponses: [
      { promptId: 'state:energy', label: 'Energy right now' },
      { promptId: 'state:readiness', label: 'What is possible right now' },
    ],
  };
}
