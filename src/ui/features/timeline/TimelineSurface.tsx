import { EvidenceTag, Panel } from '../../components/primitives';
import { TIMELINE } from '../../view-models/prototype';

/**
 * Timeline — observations, corrections, recommendations, executions, outcomes, and
 * context changes, with their decision episodes.
 *
 * The correction entry is the one worth looking at: it shows the superseding value
 * *and* says what it replaced. Append-and-supersede is only useful to a person if
 * the interface makes the earlier value visible rather than quietly gone.
 *
 * The non-execution entry states plainly that declining is not evidence about the
 * recommendation (`LEARN-002`), because that is exactly where a user would
 * otherwise assume they had been judged.
 */
export function TimelineSurface(): React.JSX.Element {
  return (
    <div className="grid">
      <Panel label="Timeline" wide>
        <p className="fine">
          Everything recorded, newest first. Corrections append rather than overwrite, so the
          earlier value stays readable.
        </p>
        <ol className="timeline">
          {TIMELINE.map((entry) => (
            <li key={`${entry.at}-${entry.summary}`} className={`tl tl-${entry.type}`}>
              <div className="tl-head">
                <span className="tl-when value">{entry.at}</span>
                <span className="tl-type">{entry.type.replace('-', ' ')}</span>
                <EvidenceTag kind={entry.evidence} />
              </div>
              <p className="change-main">{entry.summary}</p>
              <p className="fine">
                {entry.detail}
                {entry.episode === undefined ? '' : ` · ${entry.episode}`}
              </p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
