import { useEffect, useState } from 'react';
import { NowSurface } from '../now/NowSurface';
import { TimelineSurface } from '../timeline/TimelineSurface';
import { DirectionSurface } from '../direction/DirectionSurface';
import { CommitmentsSurface } from '../commitments/CommitmentsSurface';
import { LearningSurface } from '../learning/LearningSurface';
import { DataPrivacySurface } from '../data-privacy/DataPrivacySurface';
import { NOW_STATES, NOW_STATE_KINDS, type NowStateKind } from '../../view-models/prototype';
import '../../design-system/console.css';

/**
 * The Console shell (ADR-0008).
 *
 * Six logical destinations. **Five persistent on mobile** — Learning and Data &
 * Privacy live under More, per `UX-010` — and all six on the desktop rail, which has
 * the room.
 *
 * The prototype state switcher is temporary scaffolding, styled deliberately unlike
 * the product so it cannot be mistaken for part of it. Phase 3 must demonstrate
 * thirteen interaction states and there is no engine to produce them; it is removed
 * when Phase 4 makes the states real.
 */

type Destination =
  'now' | 'timeline' | 'direction' | 'commitments' | 'learning' | 'data-privacy';

const PRIMARY: readonly { id: Destination; label: string }[] = [
  { id: 'now', label: 'Now' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'direction', label: 'Direction' },
  { id: 'commitments', label: 'Commitments' },
];

const UNDER_MORE: readonly { id: Destination; label: string }[] = [
  { id: 'learning', label: 'Learning' },
  { id: 'data-privacy', label: 'Data & Privacy' },
];

const STATE_LABELS: Record<NowStateKind, string> = {
  action: 'Action',
  silence: 'Deliberate silence',
  'insufficient-evidence': 'Insufficient evidence',
  question: 'One question',
  'what-changed': 'What changed',
  'mixed-effects': 'Mixed effects',
  'weekly-direction': 'Weekly direction',
  loading: 'Loading',
  empty: 'Empty',
  offline: 'Offline',
  error: 'Error',
  locked: 'Locked',
  recovery: 'Recovery',
};

function useIsOffline(): boolean {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const goOffline = (): void => {
      setOffline(true);
    };
    const goOnline = (): void => {
      setOffline(false);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);
  return offline;
}

export function AppShell(): React.JSX.Element {
  const [destination, setDestination] = useState<Destination>('now');
  const [stateKind, setStateKind] = useState<NowStateKind>('action');
  const [moreOpen, setMoreOpen] = useState(false);
  const offline = useIsOffline();

  // Genuine offline is shown by the Now surface's offline composition rather than a
  // separate chrome banner, so there is one place that says it and one only.
  const effectiveState: NowStateKind =
    offline && stateKind === 'action' ? 'offline' : stateKind;

  const go = (next: Destination): void => {
    setDestination(next);
    setMoreOpen(false);
  };

  const activeLabel =
    [...PRIMARY, ...UNDER_MORE].find((entry) => entry.id === destination)?.label ?? 'Now';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      {/* Temporary Phase 3 scaffolding. Removed when Phase 4 makes the states real. */}
      <div className="proto">
        <label className="proto-label" htmlFor="proto-state">
          prototype state
        </label>
        <select
          id="proto-state"
          className="proto-select"
          value={stateKind}
          onChange={(event) => {
            setStateKind(event.target.value as NowStateKind);
            setDestination('now');
          }}
        >
          {NOW_STATE_KINDS.map((kind) => (
            <option value={kind} key={kind}>
              {STATE_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>

      <div className="shell">
        <nav className="rail" aria-label="Main">
          <p className="rail-brand">LCOS</p>
          {PRIMARY.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className="rail-item"
              onClick={() => {
                go(entry.id);
              }}
              {...(destination === entry.id ? { 'aria-current': 'page' as const } : {})}
            >
              {entry.label}
            </button>
          ))}

          {/* On mobile this is the fifth persistent destination; on desktop the
              two entries below it are shown directly and this button is hidden. */}
          <button
            type="button"
            className="rail-item rail-more"
            aria-expanded={moreOpen}
            onClick={() => {
              setMoreOpen((open) => !open);
            }}
            {...(UNDER_MORE.some((entry) => entry.id === destination)
              ? { 'aria-current': 'page' as const }
              : {})}
          >
            More
          </button>

          {UNDER_MORE.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className="rail-item rail-secondary"
              onClick={() => {
                go(entry.id);
              }}
              {...(destination === entry.id ? { 'aria-current': 'page' as const } : {})}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        {moreOpen ? (
          <div className="more-sheet">
            {UNDER_MORE.map((entry) => (
              <button
                type="button"
                key={entry.id}
                className="more-item"
                onClick={() => {
                  go(entry.id);
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        ) : null}

        <main className="body" id="main" tabIndex={-1}>
          <header className="head">
            <span className="clock">
              {destination === 'now' && 'situation' in NOW_STATES[effectiveState]
                ? (NOW_STATES[effectiveState] as { situation: { clock: string } }).situation
                    .clock
                : activeLabel}
            </span>
            <h1 className="headline">{destination === 'now' ? 'Now' : activeLabel}</h1>
          </header>

          {destination === 'now' ? (
            <NowSurface
              state={NOW_STATES[effectiveState]}
              onOpenChanges={() => {
                setStateKind('what-changed');
              }}
              onOpenDirection={() => {
                go('direction');
              }}
            />
          ) : null}
          {destination === 'timeline' ? <TimelineSurface /> : null}
          {destination === 'direction' ? <DirectionSurface /> : null}
          {destination === 'commitments' ? <CommitmentsSurface /> : null}
          {destination === 'learning' ? <LearningSurface /> : null}
          {destination === 'data-privacy' ? <DataPrivacySurface /> : null}
        </main>
      </div>
    </>
  );
}
