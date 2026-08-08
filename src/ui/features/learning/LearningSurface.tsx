import { KeyValues, Panel, ReasonTrace } from '../../components/primitives';
import { GraphFigure } from '../../components/GraphFigure';
import type { Graph } from '../../../intelligence/learning/insights';
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
/**
 * Whether a graph is worth drawing (`V33-018`, v3.3 B9).
 *
 * A chart of nothing is worse than no chart: it takes up the space of a finding, implies
 * one was looked for and found, and teaches the owner to skim past the place real findings
 * will eventually appear.
 *
 * A trend with no non-null point has no evidence — gaps are `null` by design, never zero,
 * so this cannot be fooled by a series of honest blanks. A comparison whose bars are all
 * zero has nothing to compare.
 */
function hasEvidence(graph: Graph): boolean {
  if (graph.kind === 'trend') {
    return graph.points.some((point) => point.value !== null);
  }
  return graph.bars.length > 0 && graph.bars.some((bar) => bar.value !== 0);
}

/**
 * One finding, collapsed (`V33-018`, v3.3 B9).
 *
 * Renders nothing at all when its graph has no evidence, so the page length tracks what
 * has actually been learned rather than how many questions the app knows how to ask.
 */
function Finding({
  graphs,
  id,
  label,
  what,
}: {
  readonly graphs: readonly Graph[];
  readonly id: string;
  readonly label: string;
  readonly what: string;
}): React.JSX.Element | null {
  const found = graphs.find((entry) => entry.id === id);
  if (found === undefined || !hasEvidence(found)) return null;

  return (
    <Panel label={label} wide>
      <p className="lead">{found.textSummary}</p>
      <details className="finding-detail">
        <summary>{what}</summary>
        <GraphFigure graph={found} />
      </details>
    </Panel>
  );
}

export function LearningSurface({ episode }: { episode: EpisodeResult }): React.JSX.Element {
  const { beliefs, forecastEvaluations, effectiveness, graphs, continuity } = episode.learning;

  const resolvedEffect = effectiveness.filter((e) => e.verdict !== 'unresolved');
  const resolvedForecast = forecastEvaluations.filter((e) => e.verdict !== 'unresolved');

  return (
    <div className="grid">
      {/*
        What was learned, how sure, and what changed because of it (`V33-018`, v3.3 B9).

        The page used to open with a `Beliefs` panel and six charts, several of them empty.
        Leading with the summary means the first thing read is the answer to "has this
        thing learned anything about me", which is the only question this surface exists
        to answer.
      */}
      <Panel label="What has been learned" tone="decision" wide>
        {beliefs.length === 0 ? (
          <p className="lead">Nothing yet</p>
        ) : (
          <>
            <p className="lead">
              {`${String(beliefs.length)} thing${beliefs.length === 1 ? '' : 's'}, from ${String(resolvedEffect.length)} observed outcome${resolvedEffect.length === 1 ? '' : 's'}`}
            </p>
            <ul className="changes">
              {beliefs.slice(0, 3).map((belief) => (
                <li key={belief.id}>
                  <span className="change-main">{belief.statement}</span>
                  <span className="fine">
                    {belief.status} · {confidenceLabel(belief.confidence)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="fine">
          {resolvedForecast.length === 0
            ? 'No forecast has been through a full window yet, so nothing here rests on a checked prediction.'
            : `${String(resolvedForecast.length)} forecast${resolvedForecast.length === 1 ? '' : 's'} checked against what actually happened.`}
        </p>
        <p className="fine why">
          {continuity.whyItChanged.length > 0
            ? continuity.whyItChanged
            : 'Nothing has changed what the app does yet.'}
        </p>
      </Panel>

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

      <Finding
        graphs={graphs}
        id="forecast-accuracy"
        label="Forecast accuracy"
        what="Was the system right about what would happen? A separate question from whether any advice helped, and never combined with it."
      />

      <Finding
        graphs={graphs}
        id="actions-and-outcomes"
        label="Recommendation effectiveness"
        what="Did following the advice help? Only recommendations carried out and then observed can answer this."
      />

      <Finding
        graphs={graphs}
        id="follow-through"
        label="Follow-through"
        what="How often a started thing was finished. A signal about whether the moves being offered fit the life, and about nothing else."
      />

      <Finding
        graphs={graphs}
        id="expected-vs-actual"
        label="Expected versus actual"
        what="Where the prediction and the observation parted company."
      />

      <Finding
        graphs={graphs}
        id="confidence"
        label="Confidence"
        what="Whether confidence has been earned or merely asserted."
      />

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
