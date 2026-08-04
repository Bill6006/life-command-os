import {
  Actions,
  EffectsTable,
  EvidenceTag,
  Panel,
  ReasonTrace,
} from '../../components/primitives';
import type { EpisodeResult } from '../../../intelligence';
import {
  categoryLabel,
  confidenceLabel,
  evidenceText,
  freshnessLabel,
  isKnownValue,
  trajectoryLabel,
} from '../../view-models/present';

/**
 * The Now surface — Console (ADR-0008), driven by real engine output.
 *
 * **Every word of substance here comes from `EpisodeResult`.** The component chooses
 * layout and labels; it never composes a conclusion, a confidence, or a reason. If
 * the engine abstains, this surface says so — it has no fallback content to fill the
 * gap with, deliberately.
 *
 * **The decision always leads** (ADR-0008 rule 1), and **five panels maximum**
 * (rule 2), in every state.
 */

export type NowView = 'decision' | 'what-changed' | 'weekly-direction';

/**
 * Presentation modes that are not an engine result.
 *
 * `loading`, `empty`, and `error` are now driven by real storage: reading IndexedDB,
 * finding it genuinely empty, and failing to read it. `recovery` is driven by a real
 * failed write. `locked` is the one that is still only a design state — there is no
 * lock to be in until Prompt 7B builds one, and pretending otherwise would be the
 * kind of claim this product is not allowed to make.
 */
export type InterfaceState = 'engine' | 'loading' | 'empty' | 'error' | 'locked' | 'recovery';

interface NowProps {
  readonly episode: EpisodeResult;
  readonly view: NowView;
  readonly interfaceState: InterfaceState;
  readonly offline: boolean;
  readonly onOpenChanges: () => void;
  readonly onOpenWeekly: () => void;
  readonly onOpenDirection: () => void;
  readonly onBack: () => void;
  /** Phase 6: the response controls now write canonical records. */
  readonly onRespond: (label: string) => void;
  readonly onWeeklyRespond: (label: string) => void;
  readonly onOpenGuide: () => void;
  readonly onQuickCapture: () => void;
  readonly onRecordOutcome: () => void;
  readonly guideEntry: string;
  readonly openEpisodeCount: number;
  readonly busy: boolean;
  readonly errorDetail?: string | undefined;
  readonly onRetry?: (() => void) | undefined;
}

function SituationPanels({
  episode,
  onOpenChanges,
  onOpenDirection,
}: {
  episode: EpisodeResult;
  onOpenChanges: () => void;
  onOpenDirection: () => void;
}): React.JSX.Element {
  const { state, trajectory, forecast, whatChanged } = episode;

  return (
    <>
      <Panel label="State">
        <table className="readings">
          <tbody>
            {state.readings.map((reading) => (
              <tr key={reading.label}>
                <th scope="row">{reading.label}</th>
                <td>
                  <span className={isKnownValue(reading.value) ? 'value' : 'value absent'}>
                    {evidenceText(reading.value)}
                  </span>{' '}
                  <EvidenceTag kind={reading.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fine">
          {state.readings[1]?.basis} · {freshnessLabel(state.readings[0]?.freshness ?? 'none')}
        </p>
        {state.contradictions.length > 0 ? (
          <p className="fine why">
            Conflicting records on {state.contradictions.map((c) => c.attribute).join(', ')}.
            Left unresolved — it lowers confidence rather than being decided for you.
          </p>
        ) : null}
        {state.unknowns.length > 0 ? (
          <p className="fine">Not known: {state.unknowns.join('; ')}.</p>
        ) : null}
      </Panel>

      <Panel label="What changed">
        {whatChanged.changes.length === 0 ? (
          <p className="body">{whatChanged.why}</p>
        ) : (
          <ul className="changes">
            {whatChanged.changes.map((change) => (
              <li key={`${change.change}-${change.when}`}>
                <span className="change-main">{change.change}</span>
                <span className="fine">
                  {change.detail === '' ? '' : `${change.detail} · `}
                  {change.when} · altered the {change.altered}
                </span>
              </li>
            ))}
          </ul>
        )}
        {whatChanged.changes.length > 0 ? <p className="fine why">{whatChanged.why}</p> : null}
        <button type="button" className="btn btn-link" onClick={onOpenChanges}>
          See everything that changed
        </button>
      </Panel>

      <Panel label="Trajectory">
        <p className="lead lead-term">{trajectoryLabel(trajectory.direction)}</p>
        <p className="fine">{trajectory.question}</p>
        <p className="value series">{trajectory.detail}</p>
        <p className="fine">
          {confidenceLabel(trajectory.confidence)} · {freshnessLabel(trajectory.freshness)}
        </p>
        <button type="button" className="btn btn-link" onClick={onOpenDirection}>
          All categories
        </button>
      </Panel>

      <Panel label={`If untreated · ${forecast.horizon.label}`}>
        {forecast.projection.status === 'known' ? (
          <p className="body">{forecast.projection.value.summary}</p>
        ) : (
          <p className="body">
            No projection —{' '}
            {forecast.projection.status === 'unknown'
              ? (forecast.projection.reason ?? 'not enough evidence')
              : forecast.projection.status}
            .
          </p>
        )}
        {forecast.assumptions.length > 0 ? (
          <p className="fine">Assumes: {forecast.assumptions.join('; ')}.</p>
        ) : null}
        <p className="fine">{forecast.uncertainty}</p>
      </Panel>
    </>
  );
}

function Standalone({
  label,
  headline,
  children,
}: {
  label: string;
  headline: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="standalone">
      <p className="panel-label">{label}</p>
      <p className="standalone-headline">{headline}</p>
      {children}
    </div>
  );
}

export function NowSurface({
  episode,
  view,
  interfaceState,
  offline,
  onOpenChanges,
  onOpenWeekly,
  onOpenDirection,
  onBack,
  onRespond,
  onWeeklyRespond,
  onOpenGuide,
  onQuickCapture,
  onRecordOutcome,
  guideEntry,
  openEpisodeCount,
  busy,
  errorDetail,
  onRetry,
}: NowProps): React.JSX.Element {
  /* --- States that are not an engine result -------------------------------- */
  if (interfaceState === 'loading') {
    return (
      <Standalone label="Loading" headline="Reading local records…">
        <p className="fine">Nothing is being fetched from a network. This is on-device only.</p>
      </Standalone>
    );
  }

  if (interfaceState === 'empty') {
    return (
      <Standalone
        label="Nothing recorded yet"
        headline="There is nothing here, and that is fine"
      >
        <p className="body">
          This app starts empty on purpose. There is no questionnaire and no setup — it will ask
          you one thing at a time, and only when the answer could change something.
        </p>
        <p className="fine">
          Everything you enter stays on this device — there is no server and no account. Take an
          encrypted backup from Data &amp; Privacy once you have put something real in, and open
          it once to check the passphrase works. Nobody can recover that passphrase for you.
        </p>
        <Actions
          primary="Start a check-in"
          secondary={['Note something down']}
          busy={busy}
          onPrimary={onOpenGuide}
          onSecondary={onQuickCapture}
        />
      </Standalone>
    );
  }

  if (interfaceState === 'error') {
    return (
      <Standalone label="Problem" headline="Could not read local records">
        <p className="fine">
          The local database did not respond. Nothing was written, and nothing has been lost.
          Retrying is safe.
        </p>
        {errorDetail === undefined ? null : <p className="fine why">{errorDetail}</p>}
        <Actions primary="Retry" secondary={[]} busy={busy} onPrimary={onRetry} />
      </Standalone>
    );
  }

  if (interfaceState === 'locked') {
    return (
      <Standalone label="Locked" headline="This device session is locked">
        <p className="fine">
          Records stay on this device either way. The lock keeps them off the screen; it does
          not encrypt the local database, and it cannot protect against someone with access to
          the device itself.
        </p>
        <Actions primary="Unlock" secondary={[]} busy={busy} onPrimary={onRetry} />
      </Standalone>
    );
  }

  if (interfaceState === 'recovery') {
    return (
      <Standalone label="Recovery" headline="A write did not complete">
        <p className="fine">
          The last change did not finish committing, so it was not applied. Your existing
          records are intact and unchanged — the write was rejected as a whole rather than
          half-applied.
        </p>
        {errorDetail === undefined ? null : <p className="fine why">{errorDetail}</p>}
        <Actions primary="Back to Now" secondary={[]} busy={busy} onPrimary={onRetry} />
      </Standalone>
    );
  }

  /* --- Views reachable from the decision ---------------------------------- */
  if (view === 'what-changed') {
    return (
      <div className="grid">
        <Panel label="Everything that changed" tone="decision" wide>
          <p className="fine">{episode.whatChanged.since}</p>
          {episode.whatChanged.changes.length === 0 ? (
            <p className="body">{episode.whatChanged.why}</p>
          ) : (
            <>
              <ul className="changes">
                {episode.whatChanged.changes.map((change) => (
                  <li key={`${change.change}-${change.when}`}>
                    <span className="change-main">{change.change}</span>
                    <span className="fine">
                      {change.detail === '' ? '' : `${change.detail} · `}
                      {change.when} · altered the {change.altered}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="body why">{episode.whatChanged.why}</p>
            </>
          )}
          {episode.whatChanged.unchanged.length > 0 ? (
            <>
              <p className="panel-label">Deliberately unchanged</p>
              <ul className="changes">
                {episode.whatChanged.unchanged.map((item) => (
                  <li key={item}>
                    <span className="fine">{item}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="actions">
            <button type="button" className="btn btn-secondary" onClick={onBack}>
              Back to Now
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  if (view === 'weekly-direction') {
    const weekly = episode.weeklyDirection;
    return (
      <div className="grid">
        <Panel label={`Weekly direction · ${weekly.weekOf}`} tone="decision" wide>
          <p className="decision-statement">{weekly.proposal}</p>
          <p className="fine">
            Proposed by the system. Confirm, adjust, or choose a quiet week — you are not being
            asked to invent a priority.
          </p>
          <dl className="kv">
            <div className="kv-row">
              <dt>Based on</dt>
              <dd>
                <ReasonTrace reasons={weekly.basedOn} />
              </dd>
            </div>
            <div className="kv-row">
              <dt>Confidence</dt>
              <dd>
                {confidenceLabel(weekly.confidence)} — {weekly.confidence.why}
              </dd>
            </div>
            <div className="kv-row">
              <dt>Last week</dt>
              <dd>{weekly.lastWeek}</dd>
            </div>
          </dl>
          <Actions
            primary={weekly.responses[0]}
            secondary={weekly.responses.slice(1)}
            busy={busy}
            onPrimary={() => {
              onWeeklyRespond(weekly.responses[0] ?? 'Confirm');
            }}
            onSecondary={onWeeklyRespond}
          />
          <p className="fine">
            Snoozing asks again later. Skipping records only that you skipped it. Neither is
            counted against you anywhere.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-link" onClick={onBack}>
              Back to Now
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  /* --- The engine's single output ----------------------------------------- */
  const { output } = episode;

  const banner = offline ? (
    <p className="banner" role="status">
      <span className="banner-label">Offline</span>
      <span>Working from the cached build. The answer below is unaffected.</span>
    </p>
  ) : null;

  /*
   * Returning after a gap. A banner, not a panel, and deliberately not a backlog:
   * nothing here counts missed days or asks the user to catch up. What absence
   * actually costs is fresh evidence, so that is what it reports.
   */
  const { absence } = episode.learning;
  const returnBanner = absence.returning ? (
    <p className="banner banner-quiet" role="status">
      <span className="banner-label">Welcome back</span>
      <span>
        {absence.summary} {absence.rebuildingNote}
        {absence.expiredPredictions.length > 0
          ? ` ${String(absence.expiredPredictions.length)} earlier prediction${absence.expiredPredictions.length === 1 ? '' : 's'} expired unobserved rather than counting against anything.`
          : ''}
      </span>
    </p>
  ) : null;

  const situation = (
    <SituationPanels
      episode={episode}
      onOpenChanges={onOpenChanges}
      onOpenDirection={onOpenDirection}
    />
  );

  /*
   * Guide entry and Quick Capture are bars, not panels, deliberately. Blueprint §5.3
   * wants both on Now; ADR-0008 rule 2 caps Now at five panels. Making them controls
   * satisfies both instead of trading one off against the other.
   */
  const guideBar = (
    <p className="guide-bar" role="status">
      <span className="banner-label">Check in</span>
      <span>{guideEntry}</span>
      <button type="button" className="btn btn-link" onClick={onOpenGuide} disabled={busy}>
        Open
      </button>
    </p>
  );

  const captureBar = (
    <div className="capture-bar">
      <span className="panel-label">Record something</span>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onQuickCapture}
        disabled={busy}
      >
        Note it down
      </button>
      {openEpisodeCount > 0 ? (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRecordOutcome}
          disabled={busy}
        >
          {`Record outcome (${String(openEpisodeCount)})`}
        </button>
      ) : null}
    </div>
  );

  if (output.kind === 'action') {
    return (
      <div className="grid">
        {banner}
        {returnBanner}
        {guideBar}
        <Panel label="Best move" tone="decision" wide>
          <p className="decision-statement">
            {output.candidate.statement}{' '}
            <span className="value">· {String(output.candidate.durationMinutes)} min</span>
          </p>
          <p className="fine">
            Min: {output.candidate.minimumVersion} · Stop: {output.candidate.stoppingPoint}
          </p>

          <EffectsTable
            effects={output.effects.map((effect) => ({
              ...effect,
              category: categoryLabel(effect.category),
            }))}
          />

          <dl className="kv">
            {output.northStar === undefined ? null : (
              <div className="kv-row">
                <dt>North Star</dt>
                <dd>
                  {output.northStar.relevance} — {output.northStar.statement}
                </dd>
              </div>
            )}
            <div className="kv-row">
              <dt>Confidence</dt>
              <dd>
                {confidenceLabel(output.confidence)} — {output.confidence.why}
              </dd>
            </div>
            <div className="kv-row">
              <dt>Because</dt>
              <dd>
                <ReasonTrace reasons={output.reasonTrace} />
              </dd>
            </div>
          </dl>

          <Actions
            primary={output.primaryAction}
            secondary={output.secondaryActions}
            busy={busy}
            onPrimary={() => {
              onRespond(output.primaryAction);
            }}
            onSecondary={onRespond}
          />
          <p className="fine">
            Starting records that you began. Declining records why you could not — it changes
            what is suggested next and is never read as evidence about the suggestion.
          </p>
          <button type="button" className="btn btn-link" onClick={onOpenWeekly}>
            This week’s direction
          </button>
        </Panel>
        {situation}
        {captureBar}
      </div>
    );
  }

  if (output.kind === 'question') {
    return (
      <div className="grid">
        {banner}
        {returnBanner}
        {guideBar}
        <Panel label="One question" tone="decision" wide>
          <p className="decision-statement">{output.prompt}</p>
          <p className="body">{output.whyItMatters}</p>
          <p className="fine">Could change: {output.couldChange.join(' · ')}</p>
          <Actions
            primary="Answer it"
            secondary={['Not now']}
            busy={busy}
            onPrimary={onOpenGuide}
            onSecondary={() => {
              onBack();
            }}
          />
          <button type="button" className="btn btn-link" onClick={onOpenWeekly}>
            This week’s direction
          </button>
        </Panel>
        {situation}
        {captureBar}
      </div>
    );
  }

  if (output.kind === 'insufficient-evidence') {
    return (
      <div className="grid">
        {banner}
        {returnBanner}
        {guideBar}
        <Panel label="Call" tone="quiet" wide>
          <p className="decision-statement">{output.statement}</p>
          <p className="fine">
            This is not a failure state. Guessing from evidence this thin would be worse than
            saying so.
          </p>
          <ul className="changes">
            {output.missing.map((item) => (
              <li key={item}>
                <span className="change-main">{item}</span>
              </li>
            ))}
          </ul>
          <p className="body">{output.wouldHelp}</p>
          <Actions
            primary="Start a check-in"
            secondary={['Note something down']}
            busy={busy}
            onPrimary={onOpenGuide}
            onSecondary={onQuickCapture}
          />
          <button type="button" className="btn btn-link" onClick={onOpenWeekly}>
            This week’s direction
          </button>
        </Panel>
        {situation}
        {captureBar}
      </div>
    );
  }

  return (
    <div className="grid">
      {banner}
      {returnBanner}
      {guideBar}
      <Panel label="Call" tone="quiet" wide>
        <p className="decision-statement">{output.statement}</p>
        <p className="body">{output.rationale}</p>
        <dl className="kv">
          <div className="kv-row">
            <dt>Confidence</dt>
            <dd>
              {confidenceLabel(output.confidence)} — {output.confidence.why}
            </dd>
          </div>
          <div className="kv-row">
            <dt>Because</dt>
            <dd>
              <ReasonTrace reasons={output.reasonTrace} />
            </dd>
          </div>
          <div className="kv-row">
            <dt>Next look</dt>
            <dd>{output.nextCheck}</dd>
          </div>
        </dl>
        <Actions
          secondary={output.secondaryActions}
          busy={busy}
          onSecondary={(label) => {
            if (label === 'Something changed') onOpenGuide();
            else onOpenChanges();
          }}
        />
        <button type="button" className="btn btn-link" onClick={onOpenWeekly}>
          This week’s direction
        </button>
      </Panel>
      {situation}
      {captureBar}
    </div>
  );
}
