import { useState } from 'react';
import { Panel } from '../../components/primitives';
import type { DomainPanel } from '../../../intelligence';

/**
 * Manual Domain Focus — the shell (Prompt 8A task 7, `OWN-004`).
 *
 * The owner asks to look at one area. They get that area's best move, **labelled as
 * their choice**, and the answer on Now does not move.
 *
 * That label is the entire feature. Without it, choosing a domain and receiving a
 * recommendation is indistinguishable from the system recommending it — except the
 * system did not judge it best, it judged it best *within a constraint the owner
 * imposed*. Making that visible at the moment of deciding is the difference between a
 * focus tool and a way to get the app to agree with you.
 */
export function ManualFocusView({
  panels,
}: {
  readonly panels: readonly DomainPanel[];
}): React.JSX.Element | null {
  const focusable = panels.filter((panel) => panel.state === 'enabled');
  const [focused, setFocused] = useState<string | undefined>(undefined);

  if (focusable.length === 0) return null;

  const selected = focusable.find((panel) => panel.domainId === focused);

  return (
    <Panel label="Look at one area" wide>
      <p className="fine">
        Your choice, not a change of priority. The answer on Now stays exactly where it is.
      </p>
      <div className="scale scale-choices" role="group" aria-label="Focus on one area">
        {focusable.map((panel) => (
          <button
            type="button"
            key={panel.domainId}
            className={`scale-step${focused === panel.domainId ? ' scale-step-on' : ''}`}
            aria-pressed={focused === panel.domainId}
            onClick={() => {
              setFocused(focused === panel.domainId ? undefined : panel.domainId);
            }}
          >
            <span className="scale-label">{panel.label}</span>
          </button>
        ))}
      </div>

      {selected === undefined ? null : selected.move === undefined ? (
        <p className="body">
          Nothing in {selected.label.toLowerCase()} is eligible right now. That is an answer,
          not an empty screen.
        </p>
      ) : (
        <>
          <p className="decision-statement">{selected.move.candidate.statement}</p>
          <p className="fine why">
            You asked for {selected.label.toLowerCase()}. This is the best move inside that area
            — chosen by you, not ranked above the answer on Now.
          </p>
        </>
      )}
    </Panel>
  );
}
