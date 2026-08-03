import {
  Actions,
  EffectsTable,
  EvidenceTag,
  Panel,
  ReasonTrace,
} from '../../components/primitives';
import type { ActionDecision, NowState, Situation } from '../../view-models/prototype';

/**
 * The Now surface — Console (ADR-0008).
 *
 * **The decision always leads.** On every viewport and in every state the first
 * panel is the answer: one best move, one high-value question, or deliberate
 * silence. The panels describing the situation follow it. A layout where the answer
 * sits below the evidence is the Briefing variant, which was not selected.
 *
 * **Five panels maximum** (ADR-0008 rule 2). More panels is precisely how a console
 * becomes a widget wall. Anything further belongs in a destination.
 */

interface NowProps {
  readonly state: NowState;
  readonly onOpenChanges: () => void;
  readonly onOpenDirection: () => void;
}

function SituationPanels({
  situation,
  onOpenChanges,
  onOpenDirection,
}: {
  situation: Situation;
  onOpenChanges: () => void;
  onOpenDirection: () => void;
}): React.JSX.Element {
  return (
    <>
      <Panel label="State">
        {/*
          Two columns, not three. The evidence tag cannot wrap, so giving it its own
          column forces the table wider than a phone at 200% zoom. Pairing it with
          the value is also the truer reading: the tag qualifies that number, it is
          not an independent field.
        */}
        <table className="readings">
          <tbody>
            {situation.readings.map((reading) => (
              <tr key={reading.label}>
                <th scope="row">{reading.label}</th>
                <td>
                  <span className="value">{reading.value}</span>{' '}
                  <EvidenceTag kind={reading.evidence} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="fine">{situation.readings[1]?.basis}</p>
      </Panel>

      <Panel label="What changed">
        <ul className="changes">
          {situation.whatChanged.map((change) => (
            <li key={change.change}>
              <span className="change-main">{change.change}</span>
              <span className="fine">
                {change.detail} · {change.when} · altered the {change.altered}
              </span>
            </li>
          ))}
        </ul>
        <p className="fine why">{situation.whyTheAnswerChanged}</p>
        <button type="button" className="btn btn-link" onClick={onOpenChanges}>
          See everything that changed
        </button>
      </Panel>

      <Panel label="Trajectory">
        <p className="lead lead-term">{situation.trajectory.direction}</p>
        <p className="fine">{situation.trajectory.question}</p>
        <p className="value series">{situation.trajectory.detail}</p>
        <p className="fine">
          {situation.trajectory.confidence} · {situation.trajectory.freshness}
        </p>
        <button type="button" className="btn btn-link" onClick={onOpenDirection}>
          All categories
        </button>
      </Panel>

      <Panel label={`If untreated · ${situation.untreatedPath.horizon}`}>
        <p className="body">{situation.untreatedPath.summary}</p>
        {situation.untreatedPath.assumptions.length > 0 ? (
          <p className="fine">Assumes: {situation.untreatedPath.assumptions.join('; ')}.</p>
        ) : null}
        <p className="fine">{situation.untreatedPath.uncertainty}</p>
      </Panel>
    </>
  );
}

function DecisionPanel({ decision }: { decision: ActionDecision }): React.JSX.Element {
  return (
    <Panel label="Best move" tone="decision" wide>
      <p className="decision-statement">
        {decision.statement} <span className="value">· {decision.duration}</span>
      </p>
      <p className="fine">
        Min: {decision.minimumVersion} · Stop: {decision.stoppingPoint}
      </p>

      <EffectsTable effects={decision.effects} />

      <dl className="kv">
        <div className="kv-row">
          <dt>North Star</dt>
          <dd>
            {decision.northStar.relevance} — {decision.northStar.statement}
          </dd>
        </div>
        <div className="kv-row">
          <dt>Confidence</dt>
          <dd>
            {decision.confidence} — {decision.confidenceWhy}
          </dd>
        </div>
        <div className="kv-row">
          <dt>Because</dt>
          <dd>
            <ReasonTrace reasons={decision.reasonTrace} />
          </dd>
        </div>
      </dl>

      <Actions primary={decision.primaryAction} secondary={decision.secondaryActions} />
    </Panel>
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
  state,
  onOpenChanges,
  onOpenDirection,
}: NowProps): React.JSX.Element {
  switch (state.kind) {
    case 'loading':
      return (
        <Standalone label="Loading" headline="Reading local records…">
          <p className="fine">
            Nothing is being fetched from a network. This is on-device only.
          </p>
        </Standalone>
      );

    case 'empty':
      return (
        <Standalone label="Nothing recorded yet" headline="There is nothing to work from yet">
          <p className="fine">
            Record one observation — how much time is free, or what you just finished — and the
            surface has something to reason about. You are not asked to rank anything or to say
            what matters most.
          </p>
          <Actions primary="Record something" secondary={['What this needs']} />
        </Standalone>
      );

    case 'locked':
      return (
        <Standalone label="Locked" headline="This device session is locked">
          <p className="fine">
            Records stay on this device either way. The lock keeps them off the screen; it does
            not encrypt the local database, and it cannot protect against someone with access to
            the device itself.
          </p>
          <Actions primary="Unlock" secondary={[]} />
        </Standalone>
      );

    case 'error':
      return (
        <Standalone label="Problem" headline={state.summary}>
          <p className="fine">{state.detail}</p>
          <Actions primary="Retry" secondary={['Open Data & Privacy']} />
        </Standalone>
      );

    case 'recovery':
      return (
        <Standalone label="Recovery" headline={state.summary}>
          <p className="fine">{state.detail}</p>
          <Actions primary={state.options[0] ?? 'Retry'} secondary={state.options.slice(1)} />
        </Standalone>
      );

    case 'silence':
      return (
        <div className="grid">
          {/* Silence is a conclusion and leads exactly like any other answer. */}
          <Panel label="Call" tone="quiet" wide>
            <p className="decision-statement">{state.statement}</p>
            <p className="body">{state.rationale}</p>
            <dl className="kv">
              <div className="kv-row">
                <dt>Confidence</dt>
                <dd>
                  {state.confidence} — {state.confidenceWhy}
                </dd>
              </div>
              <div className="kv-row">
                <dt>Because</dt>
                <dd>
                  <ReasonTrace reasons={state.reasonTrace} />
                </dd>
              </div>
              <div className="kv-row">
                <dt>Next look</dt>
                <dd>{state.nextCheck}</dd>
              </div>
            </dl>
            <Actions secondary={state.secondaryActions} />
          </Panel>
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );

    case 'insufficient-evidence':
      return (
        <div className="grid">
          <Panel label="Call" tone="quiet" wide>
            <p className="decision-statement">{state.statement}</p>
            <p className="fine">
              This is not a failure state. Guessing from four-day-old evidence would be worse
              than saying so.
            </p>
            <ul className="changes">
              {state.missing.map((item) => (
                <li key={item}>
                  <span className="change-main">{item}</span>
                </li>
              ))}
            </ul>
            <p className="body">{state.wouldHelp}</p>
            <Actions primary="Record available time" secondary={['Not now']} />
          </Panel>
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );

    case 'question':
      return (
        <div className="grid">
          <Panel label="One question" tone="decision" wide>
            <p className="decision-statement">{state.prompt}</p>
            <p className="body">{state.whyItMatters}</p>
            <p className="fine">Could change: {state.couldChange.join(' · ')}</p>
            <Actions primary={state.answers[0]} secondary={state.answers.slice(1)} />
          </Panel>
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );

    case 'weekly-direction':
      return (
        <div className="grid">
          <Panel label={`Weekly direction · ${state.weekOf}`} tone="decision" wide>
            <p className="decision-statement">{state.proposal}</p>
            <p className="fine">
              Proposed by the system. Confirm, adjust, or choose a quiet week — you are not
              being asked to invent a priority.
            </p>
            <dl className="kv">
              <div className="kv-row">
                <dt>Based on</dt>
                <dd>
                  <ReasonTrace reasons={state.basedOn} />
                </dd>
              </div>
              <div className="kv-row">
                <dt>Confidence</dt>
                <dd>{state.confidence}</dd>
              </div>
              <div className="kv-row">
                <dt>Last week</dt>
                <dd>{state.lastWeek}</dd>
              </div>
            </dl>
            <Actions primary={state.responses[0]} secondary={state.responses.slice(1)} />
          </Panel>
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );

    case 'what-changed':
      return (
        <div className="grid">
          <Panel label="Everything that changed" tone="decision" wide>
            <p className="fine">{state.since}</p>
            <ul className="changes">
              {state.situation.whatChanged.map((change) => (
                <li key={change.change}>
                  <span className="change-main">{change.change}</span>
                  <span className="fine">
                    {change.detail} · {change.when} · altered the {change.altered}
                  </span>
                </li>
              ))}
            </ul>
            <p className="body why">{state.situation.whyTheAnswerChanged}</p>
            <p className="panel-label">Deliberately unchanged</p>
            <ul className="changes">
              {state.unchanged.map((item) => (
                <li key={item}>
                  <span className="fine">{item}</span>
                </li>
              ))}
            </ul>
            <Actions secondary={['Back to Now']} />
          </Panel>
        </div>
      );

    case 'offline':
      return (
        <div className="grid">
          {/*
            A banner, not a panel. Actionable status must not consume one of the five
            panel slots (ADR-0008 rule 2), and offline changes nothing about the
            answer — everything here is on-device, so the surface says so rather than
            degrading.
          */}
          <p className="banner" role="status">
            <span className="banner-label">Offline</span>
            <span>Working from the cached build. The answer below is unaffected.</span>
          </p>
          <DecisionPanel decision={state.decision} />
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );

    case 'action':
    case 'mixed-effects':
      return (
        <div className="grid">
          <DecisionPanel decision={state.decision} />
          <SituationPanels
            situation={state.situation}
            onOpenChanges={onOpenChanges}
            onOpenDirection={onOpenDirection}
          />
        </div>
      );
  }
}
