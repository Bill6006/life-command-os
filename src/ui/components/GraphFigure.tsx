import { useId } from 'react';
import type { ComparisonGraph, Graph, TrendGraph } from '../../intelligence';

/**
 * Renders any engine graph, enforcing the graph policy for both kinds (`UX-003`).
 *
 * Every graph states its question, metric, window, evidence basis, missing-data
 * treatment, uncertainty, and a **visible** text summary — not one hidden in an SVG
 * description where only a screen reader would find it.
 *
 * Two rules the drawing itself obeys:
 *   - a period with no evidence is a **gap**, never a zero;
 *   - a zero-value bar still renders its label and its zero, because "none of these"
 *     is information and silently dropping the row would flatter the picture.
 */
export function GraphFigure({ graph }: { graph: Graph }): React.JSX.Element {
  return (
    <figure className="chart">
      <figcaption className="chart-caption">
        <p className="chart-question">{graph.question}</p>
        <p className="chart-meta">
          {graph.metric} · {graph.window} · {graph.evidence}
        </p>
      </figcaption>

      {graph.kind === 'trend' ? <TrendPlot graph={graph} /> : <ComparisonPlot graph={graph} />}

      <p className="chart-summary">{graph.textSummary}</p>
      <p className="chart-fine">{graph.missingDataTreatment}</p>
      <p className="chart-fine">{graph.uncertainty}</p>
    </figure>
  );
}

function TrendPlot({ graph }: { graph: TrendGraph }): React.JSX.Element {
  const titleId = useId();
  const descId = useId();

  const width = 640;
  const height = 180;
  const padX = 34;
  const padY = 18;

  const values = graph.points.flatMap((point) => (point.value === null ? [] : [point.value]));
  const max = Math.max(...values, 1);
  const stepX = graph.points.length > 1 ? (width - padX * 2) / (graph.points.length - 1) : 0;

  const toX = (index: number): number => padX + index * stepX;
  const toY = (value: number): number => height - padY - (value / max) * (height - padY * 2);

  // Unbroken runs, so a gap is a genuine break in the line rather than a dip.
  const runs: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  graph.points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push({ index, value: point.value });
    }
  });
  if (current.length > 0) runs.push(current);

  const gapIndexes = graph.points.flatMap((point, index) =>
    point.value === null ? [index] : [],
  );

  return (
    <div className="chart-plot">
      <svg
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="none"
      >
        <title id={titleId}>{graph.question}</title>
        <desc id={descId}>{graph.textSummary}</desc>

        <line x1={padX} y1={toY(0)} x2={width - padX} y2={toY(0)} className="chart-axis" />
        <line x1={padX} y1={toY(max)} x2={width - padX} y2={toY(max)} className="chart-grid" />

        {gapIndexes.map((gapIndex) => (
          <rect
            key={`gap-${String(gapIndex)}`}
            x={toX(gapIndex) - stepX / 2}
            y={padY}
            width={stepX}
            height={height - padY * 2}
            className="chart-gap"
          />
        ))}

        {runs.map((run) => (
          <polyline
            key={`run-${String(run[0]?.index ?? 0)}`}
            className="chart-line"
            points={run.map((p) => `${String(toX(p.index))},${String(toY(p.value))}`).join(' ')}
            fill="none"
          />
        ))}

        {graph.points.map((point, index) =>
          point.value === null ? null : (
            <circle
              key={point.label}
              cx={toX(index)}
              cy={toY(point.value)}
              r={3}
              className="chart-point"
            />
          ),
        )}

        <text x={padX - 6} y={toY(max) + 4} className="chart-tick" textAnchor="end">
          {max}
          {graph.unit}
        </text>
        <text x={padX - 6} y={toY(0) + 4} className="chart-tick" textAnchor="end">
          0
        </text>
      </svg>

      <ol className="chart-labels">
        {graph.points.map((point) => (
          <li key={point.label} className={point.value === null ? 'chart-label-gap' : ''}>
            {point.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Horizontal bars as a definition list rather than an SVG.
 *
 * For counts of a handful of categories this is more legible, reflows at 200% zoom
 * without special handling, and is readable by a screen reader as ordinary
 * structured content — no accessible-description workaround needed.
 */
function ComparisonPlot({ graph }: { graph: ComparisonGraph }): React.JSX.Element {
  const max = Math.max(...graph.bars.map((bar) => bar.value), 1);

  return (
    <dl className="bars">
      {graph.bars.map((bar) => (
        <div className="bar-row" key={bar.label}>
          <dt>
            {bar.label}
            <span className="effect-note">{bar.note}</span>
          </dt>
          <dd>
            <span className="bar-value value">{bar.value}</span>
            <span className="bar-track" aria-hidden="true">
              <span
                className={`bar-fill bar-${bar.tone}`}
                style={{ width: `${String(Math.round((bar.value / max) * 100))}%` }}
              />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
