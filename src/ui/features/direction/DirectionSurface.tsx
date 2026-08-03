import { KeyValues, Panel } from '../../components/primitives';
import { TrendChart } from '../../components/TrendChart';
import {
  CATEGORY_OVERVIEW,
  FOCUSED_HOURS_TREND,
  NORTH_STAR,
  NOW_STATES,
} from '../../view-models/prototype';

/**
 * Direction — North Star, goals, and the **full enabled-category overview**.
 *
 * Two rules are load-bearing here:
 *
 *   - **No numerical category score** (`UX-009`). The score gate requires evidence
 *     adequate for the displayed precision, which a synthetic prototype cannot
 *     satisfy honestly. Each category shows condition, trajectory, confidence,
 *     freshness, drivers, and *real domain metrics* — hours, counts, days. Those
 *     mean something on their own; a 0–100 number would not.
 *   - **No overall Life Score**, and nothing here is summed across categories.
 *
 * Reachable from Now in one interaction via the Trajectory panel (`UX-005`).
 */
export function DirectionSurface(): React.JSX.Element {
  const action = NOW_STATES.action;
  const effects = action.kind === 'action' ? action.decision.effects : [];

  return (
    <div className="grid">
      <Panel label="North Star" wide>
        <p className="lead">{NORTH_STAR.statement}</p>
        <ul className="goals">
          {NORTH_STAR.goals.map((goal) => (
            <li key={goal.statement}>
              <span className="change-main">{goal.statement}</span>
              <span className="fine">
                {goal.category} · {goal.state} · {goal.progress}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      {CATEGORY_OVERVIEW.map((category) => (
        <Panel label={category.category} key={category.category}>
          <p className="lead">{category.condition}</p>
          <p className="fine">
            Trajectory: <strong>{category.trajectory}</strong> · {category.confidence} ·{' '}
            {category.freshness}
          </p>

          <p className="panel-label">Principal drivers</p>
          <ul className="changes">
            {category.drivers.map((driver) => (
              <li key={driver}>
                <span className="fine">{driver}</span>
              </li>
            ))}
          </ul>

          <p className="panel-label">Metrics</p>
          <KeyValues entries={category.metrics} />

          <p className="fine why">Would change it: {category.wouldChangeIt}</p>
        </Panel>
      ))}

      <Panel label="Expected effects of the current best move" wide>
        <p className="fine">
          What the recommendation on Now is expected to do to each category. Benefits and costs
          are shown together and are never combined into a single figure.
        </p>
        <table className="effects">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Effect</th>
              <th scope="col">When</th>
            </tr>
          </thead>
          <tbody>
            {effects.map((effect) => (
              <tr key={`${effect.category}-${effect.note}`}>
                <th scope="row">
                  {effect.category}
                  <span className="effect-note">{effect.note}</span>
                </th>
                <td>
                  <span className={`dir dir-${effect.direction}`}>
                    {effect.direction === 'positive'
                      ? '+ benefit'
                      : effect.direction === 'negative'
                        ? '− cost'
                        : '= neutral'}
                  </span>
                  {effect.magnitude === 'unknown' ? '' : ` ${effect.magnitude}`}
                  {effect.uncertain ? <span className="uncertain"> · uncertain</span> : null}
                </td>
                <td>
                  {effect.timing}
                  {effect.crossDomain ? <span className="cross"> · cross-domain</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel label="Trend" wide>
        <TrendChart series={FOCUSED_HOURS_TREND} />
      </Panel>
    </div>
  );
}
