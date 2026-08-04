import { useId, type ReactNode } from 'react';
import type { DisplayEffect, EvidenceKind } from '../view-models/present';

/**
 * Console primitives (ADR-0008).
 *
 * The panel is the whole design language, so it lives in one place. ADR-0008 rule 3
 * says every panel answers a named question — the `label` prop is required, and a
 * panel without one cannot be constructed.
 */

export interface PanelProps {
  readonly label: string;
  readonly children: ReactNode;
  /** `decision` gets the only accent treatment on the surface. */
  readonly tone?: 'default' | 'decision' | 'attention' | 'quiet';
  readonly wide?: boolean;
}

export function Panel({
  label,
  children,
  tone = 'default',
  wide = false,
}: PanelProps): React.JSX.Element {
  const labelId = useId();
  return (
    <section
      className={`panel panel-${tone}${wide ? ' panel-wide' : ''}`}
      aria-labelledby={labelId}
    >
      <h2 className="panel-label" id={labelId}>
        {label}
      </h2>
      {children}
    </section>
  );
}

/**
 * Observed versus inferred.
 *
 * The word is always rendered and the border style differs (solid versus dashed),
 * so the distinction survives without colour (`UX-002`).
 */
export function EvidenceTag({ kind }: { kind: EvidenceKind }): React.JSX.Element {
  return <span className={`tag tag-${kind}`}>{kind}</span>;
}

/**
 * Predicted effects.
 *
 * Benefits and costs share one table and are never netted into a single figure —
 * the tradeoff is the information.
 */
export function EffectsTable({
  effects,
}: {
  effects: readonly DisplayEffect[];
}): React.JSX.Element {
  return (
    <table className="effects">
      <caption className="panel-label">Expected effects</caption>
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
  );
}

export function ReasonTrace({ reasons }: { reasons: readonly string[] }): React.JSX.Element {
  return (
    <ol className="reason">
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ol>
  );
}

export interface ActionsProps {
  /** Spells out `| undefined` because the project uses `exactOptionalPropertyTypes`. */
  readonly primary?: string | undefined;
  readonly secondary: readonly string[];
  /** Phase 6: these controls now write canonical records. */
  readonly onPrimary?: (() => void) | undefined;
  readonly onSecondary?: ((label: string) => void) | undefined;
  readonly busy?: boolean | undefined;
}

/**
 * Response controls.
 *
 * At most one primary action ever renders. There is no shape here that could hold a
 * ranked list of competing recommendations (`PROD-005`).
 *
 * `busy` disables the whole set while a write is in flight, because a control that
 * can be pressed twice would write the same episode twice — and an append-oriented
 * store would keep both.
 */
export function Actions({
  primary,
  secondary,
  onPrimary,
  onSecondary,
  busy = false,
}: ActionsProps): React.JSX.Element {
  return (
    <div className="actions">
      {primary === undefined ? null : (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={onPrimary}>
          {primary}
        </button>
      )}
      {secondary.map((action) => (
        <button
          type="button"
          className="btn btn-secondary"
          key={action}
          disabled={busy}
          onClick={
            onSecondary === undefined
              ? undefined
              : () => {
                  onSecondary(action);
                }
          }
        >
          {action}
        </button>
      ))}
    </div>
  );
}

export function KeyValues({
  entries,
}: {
  entries: readonly { readonly label: string; readonly value: string }[];
}): React.JSX.Element {
  return (
    <dl className="kv">
      {entries.map((entry) => (
        <div className="kv-row" key={entry.label}>
          <dt>{entry.label}</dt>
          <dd className="value">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
