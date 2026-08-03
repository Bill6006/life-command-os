import { useId } from 'react';
import type { TrendSeries } from '../view-models/present';

/**
 * The one trend graph required by Phase 3 (`UX-003`).
 *
 * Every obligation from the graph policy is enforced by the type rather than left
 * to the author: the series must carry its question, metric definition, time
 * window, observed-versus-inferred status, missing-data treatment, uncertainty, and
 * an accessible text summary. A chart that cannot state those cannot be built.
 *
 * The missing week is the important detail. It is drawn as a **gap** — the line
 * breaks — and never as a zero. A chart that plots absent evidence at the bottom of
 * the axis is telling the user something false about their life.
 */
export function TrendChart({ series }: { series: TrendSeries }): React.JSX.Element {
  const titleId = useId();
  const descId = useId();

  const width = 640;
  const height = 180;
  const padX = 34;
  const padY = 18;

  const values = series.points.flatMap((point) => (point.value === null ? [] : [point.value]));
  const max = Math.max(...values, 1);
  const min = 0;

  const stepX = series.points.length > 1 ? (width - padX * 2) / (series.points.length - 1) : 0;

  const toX = (index: number): number => padX + index * stepX;
  const toY = (value: number): number =>
    height - padY - ((value - min) / (max - min)) * (height - padY * 2);

  // Split into unbroken runs so the gap is a genuine break in the line.
  const runs: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  series.points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length > 0) runs.push(current);
      current = [];
    } else {
      current.push({ index, value: point.value });
    }
  });
  if (current.length > 0) runs.push(current);

  /*
   * Every gap is marked, not just the first. Drawing one band when five weeks are
   * missing would imply the rest carried evidence — which is the same lie as
   * plotting them at zero, told more quietly.
   */
  const gapIndexes = series.points.flatMap((point, index) =>
    point.value === null ? [index] : [],
  );

  return (
    <figure className="chart">
      <figcaption className="chart-caption">
        <p className="chart-question">{series.question}</p>
        <p className="chart-meta">
          {series.metric} · {series.window} · {series.evidence}
        </p>
      </figcaption>

      <div className="chart-plot">
        <svg
          viewBox={`0 0 ${String(width)} ${String(height)}`}
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          preserveAspectRatio="none"
        >
          <title id={titleId}>{series.question}</title>
          <desc id={descId}>{series.textSummary}</desc>

          {/* Baseline and top gridline only. More would be decoration. */}
          <line
            x1={padX}
            y1={toY(min)}
            x2={width - padX}
            y2={toY(min)}
            className="chart-axis"
          />
          <line
            x1={padX}
            y1={toY(max)}
            x2={width - padX}
            y2={toY(max)}
            className="chart-grid"
          />

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
              points={run
                .map((p) => `${String(toX(p.index))},${String(toY(p.value))}`)
                .join(' ')}
              fill="none"
            />
          ))}

          {series.points.map((point, index) =>
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
            {series.unit}
          </text>
          <text x={padX - 6} y={toY(min) + 4} className="chart-tick" textAnchor="end">
            0
          </text>
        </svg>

        <ol className="chart-labels">
          {series.points.map((point) => (
            <li key={point.label} className={point.value === null ? 'chart-label-gap' : ''}>
              {point.label}
            </li>
          ))}
        </ol>
      </div>

      {/*
        The text summary is visible, not only in the SVG description. A chart whose
        meaning is available only to screen readers has been designed twice, badly.
      */}
      <p className="chart-summary">{series.textSummary}</p>
      <p className="chart-fine">{series.missingDataTreatment}</p>
      <p className="chart-fine">{series.uncertainty}</p>
    </figure>
  );
}
