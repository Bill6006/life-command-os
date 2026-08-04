import type { VisualSpec } from '../../intelligence/visuals/eligibility';

/**
 * The representations a domain's evidence can earn (Prompt 8A task 9).
 *
 * Line graphs and bar comparisons already exist as `GraphFigure`. These are the other
 * three: a meter, a stage path, and an evidence summary.
 *
 * Each takes a `VisualSpec` and renders every one of its eight declarations. That is
 * not thoroughness for its own sake — it is what stops a chart being reused somewhere
 * it does not belong. A visual that has to state its own decision question, on screen,
 * cannot quietly become decoration.
 */

function Declarations({ spec }: { readonly spec: VisualSpec }): React.JSX.Element {
  return (
    <>
      <figcaption className="chart-question">{spec.decisionQuestion}</figcaption>
      <p className="fine">
        {spec.source} · {spec.window} · {spec.units}
      </p>
      <p className="fine">{spec.missingData}</p>
      <p className="fine">{spec.uncertainty}</p>
      <p className="fine why">Worth the space because: {spec.decisionValue}</p>
    </>
  );
}

/**
 * A meter.
 *
 * Renders only when the engine already decided it was eligible — `percent` is
 * `undefined` otherwise, and the component shows the values without the bar rather
 * than drawing a fraction of a denominator that does not exist (`OWN-051`).
 */
export function Meter({
  spec,
  label,
  current,
  target,
  percent,
  change,
}: {
  readonly spec: VisualSpec;
  readonly label: string;
  readonly current: string;
  readonly target: string;
  readonly percent: number | undefined;
  readonly change?: string | undefined;
}): React.JSX.Element {
  return (
    <figure className="figure">
      <p className="panel-label">{label}</p>
      {percent === undefined ? (
        <p className="body">
          {current} of {target}. No percentage is shown — this is not the kind of thing that has
          a total to be a fraction of.
        </p>
      ) : (
        <>
          <p className="lead">
            {current} <span className="fine">of {target}</span>
          </p>
          <div
            className="meter-track"
            role="img"
            aria-label={`${String(percent)} percent of ${target}`}
          >
            <div className="meter-fill" style={{ width: `${String(percent)}%` }} />
          </div>
          <p className="value">{percent}%</p>
        </>
      )}
      {change === undefined ? null : <p className="fine">{change}</p>}
      <Declarations spec={spec} />
    </figure>
  );
}

/**
 * A stage path.
 *
 * Position is conveyed by the word "current" and by a border, never by colour alone
 * (`UX-002`). There is deliberately no percentage anywhere: the whole reason a ladder
 * is a ladder is that its rungs are not 14% apart (`OWN-053`).
 */
export function StagePath({
  spec,
  label,
  stages,
  currentIndex,
}: {
  readonly spec: VisualSpec;
  readonly label: string;
  readonly stages: readonly string[];
  readonly currentIndex: number | undefined;
}): React.JSX.Element {
  return (
    <figure className="figure">
      <p className="panel-label">{label}</p>
      <ol className="stages">
        {stages.map((stage, index) => (
          <li
            key={stage}
            className={`stage${index === currentIndex ? ' stage-current' : ''}`}
            {...(index === currentIndex ? { 'aria-current': 'step' as const } : {})}
          >
            <span className="stage-name">{stage}</span>
            {index === currentIndex ? <span className="fine">current</span> : null}
          </li>
        ))}
      </ol>
      {currentIndex === undefined ? (
        <p className="fine">Not assessed. That is a position on the path, not a gap in it.</p>
      ) : null}
      <Declarations spec={spec} />
    </figure>
  );
}

/**
 * An evidence summary.
 *
 * The honest answer when a number would mislead — and a first-class one. Sparse,
 * subjective, or conflicting evidence gets words and its uncertainty rather than a
 * chart implying a shape the data does not have (`OWN-054`, `XDS-066`).
 */
export function EvidenceSummary({
  spec,
  label,
  points,
}: {
  readonly spec: VisualSpec;
  readonly label: string;
  readonly points: readonly string[];
}): React.JSX.Element {
  return (
    <figure className="figure">
      <p className="panel-label">{label}</p>
      {points.length === 0 ? (
        <p className="body">
          Nothing has been recorded here yet. That is an absence of evidence, not evidence of
          absence.
        </p>
      ) : (
        <ul className="changes">
          {points.map((point) => (
            <li key={point}>
              <span className="fine">{point}</span>
            </li>
          ))}
        </ul>
      )}
      <Declarations spec={spec} />
    </figure>
  );
}
