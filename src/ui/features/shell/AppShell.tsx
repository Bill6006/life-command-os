import { useEffect, useMemo, useState } from 'react';
import { NowSurface, type InterfaceState, type NowView } from '../now/NowSurface';
import { TimelineSurface } from '../timeline/TimelineSurface';
import { DirectionSurface } from '../direction/DirectionSurface';
import { CommitmentsSurface } from '../commitments/CommitmentsSurface';
import { LearningSurface } from '../learning/LearningSurface';
import { DataPrivacySurface } from '../data-privacy/DataPrivacySurface';
import { SCENARIOS, scenarioById } from '../../../app/scenarios';
import { runEpisode } from '../../../intelligence';
import '../../design-system/console.css';

/**
 * The Console shell (ADR-0008), now driven by the intelligence engine.
 *
 * Six logical destinations. **Five persistent on mobile** — Learning and Data &
 * Privacy live under More, per `UX-010` — and all six on the desktop rail.
 *
 * **The Phase 3 prototype state switcher is gone.** It has been replaced by a
 * scenario picker, which is a materially different thing: it selects a set of
 * synthetic *records*, and the engine computes the state, forecast, effects,
 * recommendation, and confidence from them. Nothing on screen is hand-written any
 * more. Four interface states the engine cannot produce — loading, error, locked,
 * recovery — remain selectable and are grouped separately and labelled as such;
 * lock and recovery become real in Phase 6.
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

const INTERFACE_STATES: readonly { id: InterfaceState; label: string }[] = [
  { id: 'loading', label: 'Loading' },
  { id: 'error', label: 'Error' },
  { id: 'locked', label: 'Locked (Phase 6)' },
  { id: 'recovery', label: 'Recovery (Phase 6)' },
];

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
  const [scenarioId, setScenarioId] = useState<string>('action');
  const [interfaceState, setInterfaceState] = useState<InterfaceState>('engine');
  const [nowView, setNowView] = useState<NowView>('decision');
  const [moreOpen, setMoreOpen] = useState(false);
  const offline = useIsOffline();

  const scenario = useMemo(() => scenarioById(scenarioId), [scenarioId]);

  // Deterministic: the same scenario at the same instant always yields the same episode.
  const episode = useMemo(
    () => runEpisode(scenario.records, new Date(scenario.nowIso)),
    [scenario],
  );

  const go = (next: Destination): void => {
    setDestination(next);
    setNowView('decision');
    setMoreOpen(false);
  };

  const activeLabel =
    [...PRIMARY, ...UNDER_MORE].find((entry) => entry.id === destination)?.label ?? 'Now';

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      {/*
        Scenario scaffolding, not state scaffolding. It chooses which synthetic
        records the engine reasons over. Removed when the owner is entering real
        records in Phase 6.
      */}
      <div className="proto">
        <label className="proto-label" htmlFor="scenario">
          scenario
        </label>
        <select
          id="scenario"
          className="proto-select"
          value={interfaceState === 'engine' ? scenarioId : interfaceState}
          onChange={(event) => {
            const value = event.target.value;
            const uiState = INTERFACE_STATES.find((entry) => entry.id === value);
            if (uiState === undefined) {
              setScenarioId(value);
              setInterfaceState('engine');
            } else {
              setInterfaceState(uiState.id);
            }
            setDestination('now');
            setNowView('decision');
          }}
        >
          <optgroup label="Evidence — the engine computes these">
            {SCENARIOS.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Interface states — not engine output">
            {INTERFACE_STATES.map((entry) => (
              <option value={entry.id} key={entry.id}>
                {entry.label}
              </option>
            ))}
          </optgroup>
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
              {destination === 'now' && interfaceState === 'engine'
                ? episode.clock
                : activeLabel}
            </span>
            <h1 className="headline">{destination === 'now' ? 'Now' : activeLabel}</h1>
          </header>

          {destination === 'now' ? (
            <NowSurface
              episode={episode}
              view={nowView}
              interfaceState={interfaceState}
              offline={offline}
              onOpenChanges={() => {
                setNowView('what-changed');
              }}
              onOpenWeekly={() => {
                setNowView('weekly-direction');
              }}
              onOpenDirection={() => {
                go('direction');
              }}
              onBack={() => {
                setNowView('decision');
              }}
            />
          ) : null}
          {destination === 'timeline' ? <TimelineSurface records={scenario.records} /> : null}
          {destination === 'direction' ? (
            <DirectionSurface episode={episode} records={scenario.records} />
          ) : null}
          {destination === 'commitments' ? (
            <CommitmentsSurface records={scenario.records} />
          ) : null}
          {destination === 'learning' ? <LearningSurface records={scenario.records} /> : null}
          {destination === 'data-privacy' ? (
            <DataPrivacySurface records={scenario.records} />
          ) : null}
        </main>
      </div>
    </>
  );
}
