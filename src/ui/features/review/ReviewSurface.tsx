import { KeyValues, Panel } from '../../components/primitives';
import { freshnessLabel } from '../../view-models/present';
import type { EpisodeResult } from '../../../intelligence';
import type { DomainId } from '../../../domain/domains/definitions';

/**
 * Review — the Weekly Quick Domain Scan, the synthesis, and the deep review (Phase 8).
 *
 * ## Why three things on one surface rather than three destinations
 *
 * They answer the same question at three ranges: what is going on across everything, this
 * week and this season. Splitting them would make the owner navigate to find out whether
 * there was anything to find out, which is the behaviour that leaves areas forgotten.
 *
 * ## Why a wall of rows is acceptable here and nowhere else
 *
 * Because it is a page he opened. Master plan §10 is explicit that the one-question rule
 * does not prohibit this surface: a guide is the app asking, and this is the owner looking.
 * Every row is a domain-owned summary — counts and states, no sentence anybody wrote about
 * their own life except where the classification made that harmless.
 *
 * ## What has no place here
 *
 * No total, no ranking, no percentage, and no ordering by how well an area is going. The
 * rows are in registry order, which is the order the slices were built, and it means
 * nothing.
 */

/**
 * How current an area's evidence is, as something you can see rather than read.
 *
 * Never colour alone (`UX-002`): each badge carries its own word and its own border
 * style, so it survives being greyscale and being read aloud.
 */
function FreshnessBadge({
  freshness,
}: {
  readonly freshness: Parameters<typeof freshnessLabel>[0];
}): React.JSX.Element | null {
  if (freshness === 'fresh') return <span className="badge badge-fresh">Fresh</span>;
  if (freshness === 'aging') return <span className="badge badge-aging">Ageing</span>;
  if (freshness === 'stale') return <span className="badge badge-stale">Stale</span>;
  /* `none` means no dated evidence at all, which the standing line already says. */
  return null;
}

export function ReviewSurface({
  episode,
  busy,
  onOpenArea,
  onQuickUpdate,
  onNoChange,
}: {
  readonly episode: EpisodeResult;
  readonly busy: boolean;
  readonly onOpenArea: (domainId: DomainId) => void;
  readonly onQuickUpdate: (domainId: DomainId) => void;
  readonly onNoChange: (domainId: DomainId) => void;
}): React.JSX.Element {
  const { weeklyScan, synthesis, deepReview, coverage } = episode.commandCore;

  return (
    <div className="grid">
      <Panel label="This week, across everything" tone="decision" wide>
        <p className="lead">{synthesis.headline}</p>
        <p className="fine why">{weeklyScan.note}</p>
      </Panel>

      <Panel label="Every area you have switched on" wide>
        {weeklyScan.rows.length === 0 ? (
          <p className="fine">
            None yet. Switch an area on under Direction and it will appear here.
          </p>
        ) : (
          <ul className="areas scan" aria-label="Weekly domain scan">
            {weeklyScan.rows.map((row) => (
              <li className="area" key={row.domainId}>
                <div className="area-main">
                  <span className="change-main">{row.label}</span>
                  {/*
                    Badges rather than a run-together sentence (`V33-017`, v3.3 B8).

                    This was `standing · freshness · nothing for a while` as one grey line,
                    which is three separate facts wearing the same weight and reading as
                    one. Freshness and quiet are states worth spotting at a glance down a
                    column of seven areas; the standing is the sentence.
                  */}
                  <span className="badges">
                    <FreshnessBadge freshness={row.freshness} />
                    {row.quiet ? <span className="badge badge-quiet">Quiet</span> : null}
                  </span>
                  <span className="fine">{row.standing}</span>
                  {row.openItem === undefined ? null : (
                    <span className="fine why">Open: {row.openItem}</span>
                  )}
                </div>
                <div className="actions">
                  {/*
                    The three responses the plan names, in increasing cost. `No change` is a
                    real answer and the cheapest useful thing a scan can collect: it says the
                    owner looked and nothing moved, which is different from silence.
                  */}
                  <button
                    type="button"
                    className="btn btn-link"
                    disabled={busy}
                    onClick={() => {
                      onNoChange(row.domainId);
                    }}
                  >
                    No change
                  </button>
                  {row.quickResponses[0] === undefined ? null : (
                    <button
                      type="button"
                      className="btn btn-link"
                      disabled={busy}
                      onClick={() => {
                        onQuickUpdate(row.domainId);
                      }}
                    >
                      Quick update
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => {
                      onOpenArea(row.domainId);
                    }}
                  >
                    Open
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="fine why">
          Every switched-on area appears, including the ones with nothing to say. An area that
          is quiet is shown as quiet rather than hidden — quiet is often correct, and this is
          the only place it gets noticed without interrupting you.
        </p>
      </Panel>

      {synthesis.improving.length === 0 && synthesis.drifting.length === 0 ? null : (
        <Panel label="What moved" wide>
          {synthesis.improving.length > 0 ? (
            <>
              <p className="panel-label">Moving forward</p>
              <ul className="changes">
                {synthesis.improving.map((line) => (
                  <li key={line}>
                    <span className="fine">{line}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {synthesis.drifting.length > 0 ? (
            <>
              <p className="panel-label">Drifting</p>
              <ul className="changes">
                {synthesis.drifting.map((line) => (
                  <li key={line}>
                    <span className="fine">{line}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </Panel>
      )}

      {synthesis.tradeoffs.length === 0 ? null : (
        <Panel label="Pulling against each other" wide>
          <ul className="changes" aria-label="Tradeoffs">
            {synthesis.tradeoffs.map((tradeoff) => (
              <li key={tradeoff.statement}>
                <span className="fine">{tradeoff.statement}</span>
              </li>
            ))}
          </ul>
          <p className="fine why">
            Named, not resolved. Which one gives way is yours to decide, and nothing here has a
            view on it.
          </p>
        </Panel>
      )}

      {synthesis.recentVersusLongTerm.length === 0 ? null : (
        <Panel label="Recent against long-term" wide>
          <ul className="changes">
            {synthesis.recentVersusLongTerm.map((line) => (
              <li key={line}>
                <span className="fine">{line}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel label="Deeper review" tone="quiet" wide>
        <p className="fine">{deepReview.window}</p>
        {deepReview.due ? null : (
          <p className="fine why">
            Not due yet. Nothing counts up while it is unopened and skipping one leaves no
            trace.
          </p>
        )}
        {deepReview.sections.map((section) => (
          <div key={section.heading}>
            <p className="panel-label">{section.heading}</p>
            <ul className="changes">
              {section.lines.map((line) => (
                <li key={line}>
                  <span className="fine">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="fine why">{deepReview.noScoreNote}</p>
      </Panel>

      {coverage.suppressed.length === 0 ? null : (
        <Panel label="What was not asked, and why" tone="quiet" wide>
          <KeyValues
            entries={coverage.suppressed.slice(0, 8).map((item) => ({
              label: item.promptId,
              value: item.detail,
            }))}
          />
          <p className="fine why">
            A question that stopped appearing looks identical to one that was never written.
            This is the difference.
          </p>
        </Panel>
      )}
    </div>
  );
}
