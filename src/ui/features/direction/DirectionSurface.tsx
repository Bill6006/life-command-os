import { KeyValues, Panel } from '../../components/primitives';
import { GraphFigure } from '../../components/GraphFigure';
import { DomainPanelView } from './DomainPanelView';
import { ManualFocusView } from './ManualFocusView';
import type { EpisodeResult } from '../../../intelligence';
import type { CanonicalRecord } from '../../../domain/records';
import {
  categoryLabel,
  confidenceLabel,
  freshnessLabel,
  trajectoryLabel,
} from '../../view-models/present';

/**
 * Direction — North Star, goals, and the **full enabled-category overview**, all
 * computed by the engine.
 *
 * **No numerical category score** (`UX-009`). Every metric is a real domain quantity
 * the engine counted — hours, open loops, days since progress. The score gate needs
 * evidence adequate for the displayed precision and this baseline has none, so
 * nothing here manufactures a 0–100 number to look complete.
 *
 * Reachable from Now in one interaction via the Trajectory panel (`UX-005`).
 */
export function DirectionSurface({
  episode,
  records,
}: {
  episode: EpisodeResult;
  records: readonly CanonicalRecord[];
}): React.JSX.Element {
  const star = records.find((record) => record.recordType === 'north-star');
  const goals = records.filter((record) => record.recordType === 'goal');

  return (
    <div className="grid">
      <Panel label="North Star" wide>
        {star === undefined ? (
          <p className="body">No North Star recorded yet.</p>
        ) : (
          <p className="lead">{star.statement}</p>
        )}
        {goals.length === 0 ? (
          <p className="fine">No active goals recorded.</p>
        ) : (
          <ul className="goals">
            {goals.map((goal) => (
              <li key={goal.recordId}>
                <span className="change-main">{goal.statement}</span>
                <span className="fine">
                  {categoryLabel(goal.category)} · {goal.state}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/*
        Domains, when any are switched on. Every one uses the shared panel contract, so
        an area of life cannot acquire its own layout or its own standard of evidence.
        Nothing renders here today: no slice exists yet, and a domain is off until the
        owner turns it on.
      */}
      {episode.domains.length > 0 ? (
        <Panel label="Areas of life" tone="quiet" wide>
          <p className="fine">
            Switched on by you, and readable here. Each shows the same twelve things, and each
            of its moves is subordinate to the single answer on Now.
          </p>
        </Panel>
      ) : null}
      <ManualFocusView panels={episode.domains} />
      {episode.domains.map((panel) => (
        <DomainPanelView panel={panel} key={panel.domainId} />
      ))}

      {episode.categories.map((category) => (
        <Panel label={categoryLabel(category.category)} key={category.category}>
          <p className="lead">{category.condition}</p>
          <p className="fine">
            Trajectory: <strong>{trajectoryLabel(category.trajectory)}</strong> ·{' '}
            {confidenceLabel(category.confidence)} · {freshnessLabel(category.freshness)}
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
        {episode.output.kind === 'action' ? (
          <>
            <p className="fine">
              What the recommendation on Now is expected to do to each category. Benefits and
              costs are shown together and are never combined into a single figure.
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
                {episode.output.effects.map((effect) => (
                  <tr key={`${effect.category}-${effect.note}`}>
                    <th scope="row">
                      {categoryLabel(effect.category)}
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
                      {effect.uncertain ? (
                        <span className="uncertain"> · uncertain</span>
                      ) : null}
                    </td>
                    <td>
                      {effect.timing}
                      {effect.crossDomain ? (
                        <span className="cross"> · cross-domain</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="body">
            There is no action recommended right now, so there are no predicted effects to show.
          </p>
        )}
      </Panel>

      {episode.learning.graphs
        .filter((graph) => ['focused-hours', 'capacity', 'north-star'].includes(graph.id))
        .map((graph) => (
          <Panel label="Trend" wide key={graph.id}>
            <GraphFigure graph={graph} />
          </Panel>
        ))}
    </div>
  );
}
