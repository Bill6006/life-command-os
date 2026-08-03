import { KeyValues, Panel, ReasonTrace } from '../../components/primitives';
import { GraphFigure } from '../../components/GraphFigure';
import type { EpisodeResult } from '../../../intelligence';
import { confidenceLabel } from '../../view-models/present';

/**
 * Learning — what the system has actually earned the right to believe.
 *
 * **Forecast accuracy and recommendation effectiveness are shown as separate
 * panels and are never combined into one figure** (`LEARN-001`). They answer
 * different questions from different evidence, and averaging them would produce a
 * number that means nothing.
 *
 * When nothing has been learned, this surface says so with the counts that prove it
 * rather than filling the space. That remains the honest state until recommendations
 * have been carried out and observed through closed outcome windows.
 */
/**
 * Renders one engine graph by id, or nothing if the engine did not produce it.
 *
 * Module level, not defined inside the surface: a component created during render
 * gets a new identity every pass, which throws away its subtree on each update.
 */
function Figure({
  graphs,
  id,
}: {
  graphs: EpisodeResult['learning']['graphs'];
  id: string;
}): React.JSX.Element | null {
  const found = graphs.find((entry) => entry.id === id);
  return found === undefined ? null : <GraphFigure graph={found} />;
}

export function LearningSurface({ episode }: { episode: EpisodeResult }): React.JSX.Element {
  const { beliefs, forecastEvaluations, effectiveness, graphs, continuity } = episode.learning;

  const resolvedEffect = effectiveness.filter((e) => e.verdict !== 'unresolved');
  const resolvedForecast = forecastEvaluations.filter((e) => e.verdict !== 'unresolved');

  return (
    <div className="grid">
      {beliefs.length === 0 ? (
        <Panel label="Beliefs" wide>
          <p className="lead">Nothing has been learned yet</p>
          <p className="body">
            Learning needs recommendations that were carried out and then observed through a
            full outcome window. Until that has happened, there is nothing here that would be
            true.
          </p>
          <KeyValues
            entries={[
              {
                label: 'Recommendations with an execution',
                value: String(effectiveness.length),
              },
              { label: 'Resolved', value: String(resolvedEffect.length) },
              { label: 'Forecasts evaluated', value: String(resolvedForecast.length) },
              { label: 'Beliefs formed', value: '0' },
            ]}
          />
          <p className="fine why">
            A recommendation that was declined, or whose outcome never arrived, counts for
            nothing on either side. It is not weak evidence — it is no evidence.
          </p>
        </Panel>
      ) : (
        beliefs.map((belief) => (
          <Panel label={`Belief · ${belief.status}`} tone="decision" wide key={belief.id}>
            <p className="decision-statement">{belief.statement}</p>
            <p className="fine">Applies to: {belief.applicability}</p>

            <dl className="kv">
              <div className="kv-row">
                <dt>Confidence</dt>
                <dd>
                  {confidenceLabel(belief.confidence)} — {belief.confidence.why}
                </dd>
              </div>
              <div className="kv-row">
                <dt>Evidence</dt>
                <dd>
                  {String(belief.supporting.length)} supporting ·{' '}
                  {String(belief.contradicting.length)} contradicting ·{' '}
                  {belief.prospectivelyValidated
                    ? 'each predicted before it was observed'
                    : 'not yet validated against a later outcome'}
                </dd>
              </div>
              <div className="kv-row">
                <dt>How it changed</dt>
                <dd>
                  <ReasonTrace
                    reasons={belief.history.map((entry) => `${entry.change}: ${entry.because}`)}
                  />
                </dd>
              </div>
            </dl>

            {belief.status === 'suspended' ? (
              <p className="fine why">
                Suspended, not deleted. The evidence behind it was real — it is simply no longer
                comparable, and it may become relevant again.
              </p>
            ) : null}
          </Panel>
        ))
      )}

      <Panel label="Forecast accuracy" wide>
        <p className="fine">
          Was the system right about what would happen? This is a separate question from whether
          any advice helped, and is never combined with it.
        </p>
        <Figure graphs={graphs} id="forecast-accuracy" />
      </Panel>

      <Panel label="Recommendation effectiveness" wide>
        <p className="fine">
          Did following the advice help? Only recommendations that were actually carried out and
          observed can answer this.
        </p>
        <Figure graphs={graphs} id="actions-and-outcomes" />
      </Panel>

      <Panel label="Follow-through" wide>
        <Figure graphs={graphs} id="follow-through" />
      </Panel>

      <Panel label="Expected versus actual" wide>
        <Figure graphs={graphs} id="expected-vs-actual" />
      </Panel>

      <Panel label="Confidence" wide>
        <Figure graphs={graphs} id="confidence" />
      </Panel>

      <Panel label="Weekly direction, week over week" wide>
        <p className="lead lead-term">{continuity.decision.replace(/-/g, ' ')}</p>
        {continuity.previousProposal === undefined ? (
          <p className="body">{continuity.whatHappened}</p>
        ) : (
          <>
            <p className="fine">Last week: {continuity.previousProposal}</p>
            <p className="body">{continuity.whatHappened}</p>
          </>
        )}
        <p className="fine why">{continuity.whyItChanged}</p>
        <p className="fine">
          Nothing here is scored. A direction that was not followed says something about the
          direction, not about you.
        </p>
      </Panel>
    </div>
  );
}
