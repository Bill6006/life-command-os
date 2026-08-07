import type { CanonicalRecord } from '../../domain/records';

/**
 * What the owner has just declined (Phase 8 deliverable 21, repair pass).
 *
 * ## The failure this closes
 *
 * "Can't now" writes an execution in the `not-executed` state and a context snapshot
 * carrying whatever constraint the decline implied. The episode then re-runs from records —
 * which is a genuine full recomputation, and was already correct for the constraints that
 * *say* something. `Not the right action` says nothing about time, capacity, or context, so
 * the recomputation ran against an unchanged state and re-selected the identical candidate.
 * The owner declined, and the same sentence came back.
 *
 * ## The rule
 *
 * A declined action is excluded **until decision-changing evidence arrives**. Not for a
 * fixed cooldown, not for the rest of the day, and not permanently: those would each be the
 * app deciding on the owner's behalf how long a "no" lasts.
 *
 * Decision-changing evidence is an observation or a context snapshot recorded *strictly
 * after* the decline. The decline's own snapshot shares its instant, so `>` excludes it —
 * a decline cannot count as the evidence that reverses itself. The moment anything else is
 * recorded, the action is eligible again and competes on its merits.
 *
 * ## Why the exclusion lives here rather than in the decline command
 *
 * Because it must hold for *every* re-run, not only the one immediately after the button.
 * A rule that lived in the command would be honoured once and forgotten on the next reload,
 * which is exactly the kind of correctness that looks fine in a demo.
 */

interface Decline {
  readonly engineCandidateId: string;
  readonly at: string;
}

/**
 * Declines still in force, by the generator's own candidate id.
 *
 * Matching is on `engineCandidateId` — the stable identifier a generator produces, such as
 * `home:make-the-change` — rather than on the record id, which is unique per decision and
 * so could never match the next episode's candidate.
 */
export function activeDeclines(records: readonly CanonicalRecord[]): ReadonlySet<string> {
  const declines: Decline[] = [];

  for (const record of records) {
    if (record.recordType !== 'execution') continue;
    if (record.state !== 'not-executed') continue;
    if (record.decisionEpisodeId === undefined) continue;

    /*
     * The candidate that was declined, found through the decision episode the decline
     * belongs to. The three records are written in one transaction and share the id, which
     * is what makes the link reliable without a second pointer field.
     */
    const candidate = records.find(
      (entry) =>
        entry.recordType === 'candidate-action' &&
        entry.decisionEpisodeId === record.decisionEpisodeId,
    );
    if (candidate?.recordType !== 'candidate-action') continue;
    if (candidate.engineCandidateId === undefined) continue;

    declines.push({ engineCandidateId: candidate.engineCandidateId, at: record.recordedAt });
  }

  const stillInForce = new Set<string>();

  for (const decline of declines) {
    const supersededByEvidence = records.some(
      (entry) =>
        (entry.recordType === 'observation' || entry.recordType === 'context-snapshot') &&
        entry.recordedAt > decline.at,
    );
    if (!supersededByEvidence) stillInForce.add(decline.engineCandidateId);
  }

  return stillInForce;
}
