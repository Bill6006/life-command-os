import { Panel } from '../../components/primitives';
import type { CanonicalRecord } from '../../../domain/records';
import { currentRecords } from '../../../domain/policies/invariants';
import { categoryLabel } from '../../view-models/present';

/**
 * Commitments — the open loops.
 *
 * States are shown as words, never as a completion percentage or a progress bar.
 * "Unclear" is a first-class state rather than a gap: a commitment with no due date
 * and no recorded next step is a real situation the user should see, not a record to
 * be tidied away.
 */
export function CommitmentsSurface({
  records,
}: {
  records: readonly CanonicalRecord[];
}): React.JSX.Element {
  const commitments = currentRecords(records).filter(
    (record) => record.recordType === 'commitment',
  );

  const needsAttention = commitments.filter(
    (commitment) => commitment.state === 'blocked' || commitment.state === 'waiting',
  );
  const open = commitments.filter(
    (commitment) =>
      commitment.state !== 'blocked' &&
      commitment.state !== 'waiting' &&
      commitment.state !== 'completed' &&
      commitment.state !== 'abandoned' &&
      commitment.state !== 'expired',
  );

  return (
    <div className="grid">
      <Panel label="Needs attention" wide>
        {needsAttention.length === 0 ? (
          <p className="fine">Nothing is blocked or waiting.</p>
        ) : (
          <ul className="changes">
            {needsAttention.map((commitment) => (
              <li key={commitment.recordId}>
                <span className="change-main">
                  {commitment.statement} <span className="tl-type">{commitment.state}</span>
                </span>
                <span className="fine">
                  {categoryLabel(commitment.category)}
                  {commitment.note === undefined ? '' : ` · ${commitment.note}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Open loops" wide>
        {open.length === 0 ? (
          <p className="fine">No open commitments recorded.</p>
        ) : (
          <ul className="changes">
            {open.map((commitment) => (
              <li key={commitment.recordId}>
                <span className="change-main">
                  {commitment.statement} <span className="tl-type">{commitment.state}</span>
                  {commitment.nonNegotiable ? (
                    <span className="tag tag-observed">non-negotiable</span>
                  ) : null}
                </span>
                <span className="fine">{categoryLabel(commitment.category)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="fine why">
          Non-negotiable commitments remove candidate actions before ranking, rather than
          counting against them afterwards.
        </p>
      </Panel>
    </div>
  );
}
