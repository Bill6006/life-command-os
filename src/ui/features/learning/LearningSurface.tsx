import { KeyValues, Panel } from '../../components/primitives';
import { LEARNING } from '../../view-models/prototype';

/**
 * Learning.
 *
 * The honest state of this destination today is **empty**, and it says so.
 *
 * Filling it with plausible accuracy percentages would be the exact false precision
 * the Constitution forbids, and it would be the easiest thing in the product to fake
 * convincingly. Nothing has been learned because no recommendation has been executed
 * and then observed through a full outcome window. One was declined — which is not
 * evidence about whether it would have helped (`LEARN-002`).
 *
 * Real learning behaviour arrives in Phase 5.
 */
export function LearningSurface(): React.JSX.Element {
  return (
    <div className="grid">
      <Panel label="Learning" wide>
        <p className="lead">{LEARNING.headline}</p>
        <p className="body">{LEARNING.detail}</p>
        <p className="panel-label">Waiting on</p>
        <KeyValues entries={LEARNING.waitingOn} />
        <p className="fine why">{LEARNING.separation}</p>
      </Panel>
    </div>
  );
}
