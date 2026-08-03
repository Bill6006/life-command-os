import { Panel } from '../../components/primitives';
import { COMMITMENTS } from '../../view-models/prototype';

/**
 * Commitments — the open loops.
 *
 * States are shown as words, never as a completion percentage or a progress bar.
 * "Unclear" is a first-class state rather than a gap: a commitment with no due date
 * and no recorded next step is a real situation the user should see, not a record
 * to be tidied away.
 */
export function CommitmentsSurface(): React.JSX.Element {
  const blocked = COMMITMENTS.filter((c) => c.state === 'blocked' || c.state === 'waiting');
  const rest = COMMITMENTS.filter((c) => c.state !== 'blocked' && c.state !== 'waiting');

  return (
    <div className="grid">
      <Panel label="Needs attention" wide>
        {blocked.length === 0 ? (
          <p className="fine">Nothing is blocked or waiting.</p>
        ) : (
          <ul className="changes">
            {blocked.map((commitment) => (
              <li key={commitment.statement}>
                <span className="change-main">
                  {commitment.statement} <span className="tl-type">{commitment.state}</span>
                </span>
                <span className="fine">
                  {commitment.category} · {commitment.note}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel label="Open loops" wide>
        <ul className="changes">
          {rest.map((commitment) => (
            <li key={commitment.statement}>
              <span className="change-main">
                {commitment.statement} <span className="tl-type">{commitment.state}</span>
                {commitment.nonNegotiable ? (
                  <span className="tag tag-observed">non-negotiable</span>
                ) : null}
              </span>
              <span className="fine">
                {commitment.category} · {commitment.note}
              </span>
            </li>
          ))}
        </ul>
        <p className="fine why">
          Non-negotiable commitments remove candidate actions before ranking, rather than
          counting against them afterwards.
        </p>
      </Panel>
    </div>
  );
}
