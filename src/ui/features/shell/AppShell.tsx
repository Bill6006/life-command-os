import { useEffect, useState } from 'react';
import { buildInfo, shortCommit } from '../../../app/buildInfo';

/**
 * Phase 1 application shell.
 *
 * Its only job is to make rendering, navigation, installability, and offline
 * startup verifiable. It contains no life-domain feature and no intelligence:
 * there is nothing to recommend yet, and inventing a placeholder recommendation
 * would violate both the greenfield boundary and LEAN-001.
 *
 * The real destinations (Now, Timeline, Direction, Commitments, Learning,
 * Data & Privacy) arrive in Phase 3 after the owner selects a command surface.
 */

type View = 'foundation' | 'about';

const VIEWS: readonly { id: View; label: string }[] = [
  { id: 'foundation', label: 'Foundation' },
  { id: 'about', label: 'About' },
];

/** Reports offline state. Operational status stays quiet unless actionable. */
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

function FoundationView(): React.JSX.Element {
  return (
    <>
      <section className="panel" aria-labelledby="what-this-is">
        <h2 id="what-this-is">This is a foundation, not the product</h2>
        <p>
          Life Command OS is a private, local-first personal decision-intelligence system. It is
          being built in gated phases, and this build is the Phase 2 canonical model.
        </p>
        <p>
          There is no intelligence here yet, and nothing on this screen is a recommendation. The
          decision surface is designed in Phase 3 and becomes useful in Phase 4.
        </p>
      </section>

      <section className="panel" aria-labelledby="what-exists">
        <h2 id="what-exists">What this build actually proves</h2>
        <ul>
          <li>The application installs and starts offline from a cached shell.</li>
          <li>
            Assets, manifest, and service worker resolve correctly under the Pages base path.
          </li>
          <li>
            Twenty canonical record families validate, and a record cannot be stored as a
            different kind of thing than it is.
          </li>
          <li>
            Corrections append and supersede, so the earlier value stays readable instead of
            being overwritten.
          </li>
          <li>Canonical records survive reload, and derived views can be rebuilt from them.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="what-is-stored">
        <h2 id="what-is-stored">Nothing personal is stored</h2>
        <p>
          This build holds no life data, and the repository behind it contains synthetic content
          only. Entering meaningful private data is not safe until Phase 6 proves encrypted
          backup and fresh-profile recovery.
        </p>
      </section>
    </>
  );
}

function AboutView(): React.JSX.Element {
  return (
    <>
      <section className="panel" aria-labelledby="build-heading">
        <h2 id="build-heading">Build</h2>
        <p>Use this to confirm that the deployed preview matches the gate-approved commit.</p>
        <dl className="meta">
          <dt>Plan version</dt>
          <dd>{buildInfo.planVersion}</dd>
          <dt>Phase</dt>
          <dd>{buildInfo.phase}</dd>
          <dt>Commit</dt>
          <dd>
            <abbr title={buildInfo.commit}>{shortCommit(buildInfo.commit)}</abbr>
          </dd>
          <dt>Built</dt>
          <dd>{buildInfo.builtAt}</dd>
        </dl>
      </section>

      <section className="panel" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Data and privacy</h2>
        <ul>
          <li>All data stays on this device. There is no server and no account.</li>
          <li>No analytics, no telemetry, no external AI.</li>
          <li>The repository and this hosted build contain synthetic content only.</li>
        </ul>
      </section>
    </>
  );
}

export function AppShell(): React.JSX.Element {
  const [view, setView] = useState<View>('foundation');
  const offline = useIsOffline();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <div className="app">
        <header className="masthead">
          <h1>Life Command OS</h1>
          <p>Private, local-first decision intelligence</p>
        </header>

        <nav className="nav" aria-label="Sections">
          {VIEWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setView(entry.id);
              }}
              {...(view === entry.id ? { 'aria-current': 'page' as const } : {})}
            >
              {entry.label}
            </button>
          ))}
        </nav>

        <main className="main" id="main" tabIndex={-1}>
          {/* Announced to screen readers because it changes the meaning of what is shown. */}
          <div role="status" aria-live="polite">
            {offline ? (
              <p className="notice">
                <span className="notice-label">Offline</span>
                <span>
                  You are working from the cached build. Nothing is lost — this application does
                  not need a network connection.
                </span>
              </p>
            ) : null}
          </div>

          {view === 'foundation' ? <FoundationView /> : <AboutView />}
        </main>

        <footer className="footer">
          <p>
            {buildInfo.phase} · {buildInfo.planVersion} · {shortCommit(buildInfo.commit)}
          </p>
        </footer>
      </div>
    </>
  );
}
