import { KeyValues, Panel } from '../../components/primitives';
import { GraphFigure } from '../../components/GraphFigure';
import { DomainPanelView } from './DomainPanelView';
import type { DomainId } from '../../../domain/domains/definitions';
import type { DomainState } from '../../../domain/records/domains';
import { domainDefinition } from '../../../domain/domains/definitions';
import { cadenceSettings, type CoverageCadence } from '../../../domain/domains/cadence';
import { resolveDomains } from '../../../intelligence/domains/registry';
import { ManageAreasView } from './ManageAreasView';
import { ManualFocusView } from './ManualFocusView';
import type { EpisodeResult } from '../../../intelligence';
import type { CanonicalRecord } from '../../../domain/records';
import { moveStances } from '../../../command-core/arbitration/stances';
import type { SituationalCapacity } from '../../../domain/domains/capacity';
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
/**
 * Moves the owner has set aside, and the way back.
 *
 * Renders nothing when there are none, so it costs a quiet profile no space at all. Every
 * entry says which stance is in force and, where the stance has an end or a scope, what it
 * is — a pause the owner cannot see the end of is indistinguishable from a prohibition.
 */
function SetAsideMoves({
  records,
  situation,
  busy,
  onRestoreMove,
}: {
  readonly records: readonly CanonicalRecord[];
  readonly situation: SituationalCapacity;
  readonly busy: boolean;
  readonly onRestoreMove?:
    | ((move: { readonly engineCandidateId: string; readonly statement: string }) => void)
    | undefined;
}): React.JSX.Element | null {
  const stances = moveStances(records, new Date(), situation).filter(
    (entry) => entry.stance !== 'restored',
  );
  if (stances.length === 0 || onRestoreMove === undefined) return null;

  return (
    <Panel label="Moves you have set aside" wide>
      <ul className="changes">
        {stances.map((entry) => (
          <li key={entry.engineCandidateId}>
            <span className="change-main">{entry.moveStatement}</span>
            <span className="fine">{entry.because}</span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                onRestoreMove({
                  engineCandidateId: entry.engineCandidateId,
                  statement: entry.moveStatement,
                });
              }}
            >
              {`Put back: ${entry.moveStatement}`}
            </button>
          </li>
        ))}
      </ul>
      <p className="fine">
        Putting one back is immediate, and you can set it aside again afterwards.
      </p>
    </Panel>
  );
}

export function DirectionSurface({
  episode,
  records,
  busy = false,
  onUpdateArea,
  onSetAreaState,
  onSetCadence,
  onSnooze,
  onRestoreMove,
}: {
  episode: EpisodeResult;
  records: readonly CanonicalRecord[];
  busy?: boolean;
  /** Opens Update This Area for one domain. Owned here and nowhere else. */
  onUpdateArea?: ((domainId: DomainId) => void) | undefined;
  /** Switches one area on or off. The only route to a domain preference. */
  onSetAreaState?: ((domainId: DomainId, state: DomainState) => void) | undefined;
  /** How often an area may raise something. Narrows only — never promotes. */
  onSetCadence?: ((domainId: DomainId, cadence: CoverageCadence) => void) | undefined;
  onSnooze?: ((domainId: DomainId, untilIso: string) => void) | undefined;
  /**
   * Puts a move the owner set aside back into play (`V33-032`, section I).
   *
   * Section I requires restoring to be discoverable and reversible. It lives here rather
   * than beside `Can't now`, because by the time a move is forbidden it no longer appears
   * on Now at all — the one place it could never be found is the surface it disappeared
   * from.
   */
  onRestoreMove?:
    | ((move: { readonly engineCandidateId: string; readonly statement: string }) => void)
    | undefined;
}): React.JSX.Element {
  const star = records.find((record) => record.recordType === 'north-star');
  const goals = records.filter((record) => record.recordType === 'goal');

  const areaStates = new Map<DomainId, DomainState>(
    resolveDomains(records).map((domain) => [domain.definition.id, domain.state]),
  );

  /*
   * Categories a visible domain panel already reports on.
   *
   * `reads[0]` is each domain's own category; the shared ones it also reads (time and
   * capacity, direction and commitments) stay visible because several domains touch them
   * and none of them owns the reading.
   */
  const coveredByDomain = new Set(
    episode.domains.map((panel) => domainDefinition(panel.domainId).reads[0]),
  );

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
        The control that switches them on lives here and nowhere else.
      */}
      {onSetAreaState === undefined ? null : (
        <ManageAreasView
          states={areaStates}
          cadences={
            new Map(
              cadenceSettings(records, new Date(episode.at)).map((s) => [
                s.domainId,
                s.cadence,
              ]),
            )
          }
          snoozes={
            new Map(
              cadenceSettings(records, new Date(episode.at)).flatMap((s) =>
                s.snoozedUntil === undefined ? [] : [[s.domainId, s.snoozedUntil] as const],
              ),
            )
          }
          busy={busy}
          onSetState={onSetAreaState}
          onSetCadence={onSetCadence ?? (() => undefined)}
          onSnooze={onSnooze ?? (() => undefined)}
        />
      )}
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
        <DomainPanelView panel={panel} key={panel.domainId} onUpdate={onUpdateArea} />
      ))}

      {/*
        Category summaries, minus anything a domain panel already covers.

        A switched-on area renders its own panel with the same condition, trajectory,
        confidence, freshness, and drivers — so showing the category beside it printed the
        same reading twice under two nearly identical headings, and for money under the
        *same* heading until 8H worked around it. The domain panel is the richer of the two
        and wins; categories no domain reads (time and capacity, direction and commitments)
        still get one, because otherwise nothing would show them.
      */}
      {episode.categories
        .filter((category) => !coveredByDomain.has(category.category))
        .map((category) => (
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

      <SetAsideMoves
        records={records}
        situation={episode.state.situation}
        busy={busy}
        onRestoreMove={onRestoreMove}
      />

      {episode.learning.graphs
        .filter((graph) => ['focused-hours', 'capacity', 'north-star'].includes(graph.id))
        .map((graph) => (
          /*
            Labelled by the question the graph answers, not by the word "Trend".
            Three panels all called "Trend" gave the surface three landmarks with the same
            accessible name — indistinguishable to anyone navigating by heading, and the
            same defect as the domain/category collision one line up.
          */
          <Panel label={graph.question} wide key={graph.id}>
            <GraphFigure graph={graph} />
          </Panel>
        ))}
    </div>
  );
}
