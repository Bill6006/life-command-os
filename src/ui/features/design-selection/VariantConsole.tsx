import type { Scenario } from './scenario';

/**
 * Variant B — **Console**.
 *
 * Hierarchy: parallel panels rather than a narrative. State, change, trajectory,
 * and untreated path sit side by side; the move is the widest panel.
 * Density: high. Everything above the fold on desktop, one short scroll on a phone.
 * Typography: compact. Monospace values, small-caps labels, tight leading.
 * Surface: layered bordered panels with label rails — an instrument reading.
 * Navigation: segmented control on a phone, left rail on desktop. Five destinations.
 * Expression: terse and labelled. Facts before sentences.
 */
export function VariantConsole({ scenario }: { scenario: Scenario }): React.JSX.Element {
  const { decision } = scenario;

  return (
    <div className="vB">
      <div className="vB-shell">
        <nav className="vB-nav" aria-label="Main">
          <p className="vB-brand">LCOS</p>
          {['Now', 'Timeline', 'Direction', 'Commitments', 'More'].map((tab) => (
            <button
              type="button"
              key={tab}
              className="vB-navItem"
              {...(tab === 'Now' ? { 'aria-current': 'page' as const } : {})}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="vB-body">
          <header className="vB-head">
            <span className="vB-clock">{scenario.clock}</span>
            <h1 className="vB-headline">{scenario.headline}</h1>
          </header>

          <div className="vB-grid">
            <section className="vB-panel" aria-labelledby="b-state">
              <h2 className="vB-label" id="b-state">
                State
              </h2>
              <table className="vB-table">
                <tbody>
                  {scenario.readings.map((reading) => (
                    <tr key={reading.label}>
                      <th scope="row">{reading.label}</th>
                      <td className="vB-num">{reading.value}</td>
                      <td>
                        <span className={`vB-tag vB-tag-${reading.evidence}`}>
                          {reading.evidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="vB-fine">{scenario.readings[1]?.basis}</p>
            </section>

            <section className="vB-panel" aria-labelledby="b-changed">
              <h2 className="vB-label" id="b-changed">
                Changed
              </h2>
              <ul className="vB-list">
                {scenario.whatChanged.map((change) => (
                  <li key={change.change}>
                    <span className="vB-listMain">{change.change}</span>
                    <span className="vB-fine">
                      {change.detail} · {change.when}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="vB-fine vB-why">{scenario.whyTheAnswerChanged}</p>
            </section>

            <section className="vB-panel" aria-labelledby="b-traj">
              <h2 className="vB-label" id="b-traj">
                Trajectory
              </h2>
              <p className="vB-big">{scenario.trajectory.direction}</p>
              <p className="vB-fine">{scenario.trajectory.question}</p>
              <p className="vB-num vB-series">{scenario.trajectory.detail}</p>
              <p className="vB-fine">
                {scenario.trajectory.confidence} · {scenario.trajectory.freshness}
              </p>
            </section>

            <section className="vB-panel" aria-labelledby="b-untreated">
              <h2 className="vB-label" id="b-untreated">
                If untreated · {scenario.untreatedPath.horizon}
              </h2>
              <p className="vB-panelBody">{scenario.untreatedPath.summary}</p>
              <p className="vB-fine">
                Assumes: {scenario.untreatedPath.assumptions.join('; ')}.{' '}
                {scenario.untreatedPath.uncertainty}
              </p>
            </section>

            {decision.kind === 'action' ? (
              <section className="vB-panel vB-move" aria-labelledby="b-move">
                <h2 className="vB-label vB-label-accent" id="b-move">
                  Move
                </h2>
                <p className="vB-moveStatement">
                  {decision.statement} <span className="vB-num">· {decision.duration}</span>
                </p>
                <p className="vB-fine">
                  Min: {decision.minimumVersion} · Stop: {decision.stoppingPoint}
                </p>

                <table className="vB-effects">
                  <caption className="vB-label">Expected effects</caption>
                  <thead>
                    <tr>
                      <th scope="col">Category</th>
                      <th scope="col">Effect</th>
                      <th scope="col">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decision.effects.map((effect) => (
                      <tr key={`${effect.category}-${effect.note}`}>
                        <th scope="row">{effect.category}</th>
                        <td>
                          <span className={`vB-dir vB-dir-${effect.direction}`}>
                            {effect.direction === 'positive'
                              ? '+ benefit'
                              : effect.direction === 'negative'
                                ? '− cost'
                                : '= neutral'}
                          </span>
                          {effect.magnitude !== 'unknown' ? ` ${effect.magnitude}` : ''}
                          {effect.uncertain ? ' · uncertain' : ''}
                        </td>
                        <td>
                          {effect.timing}
                          {effect.crossDomain ? ' · cross-domain' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <dl className="vB-kv">
                  <dt>North Star</dt>
                  <dd>
                    {decision.northStar.relevance} — {decision.northStar.statement}
                  </dd>
                  <dt>Confidence</dt>
                  <dd>
                    {decision.confidence} — {decision.confidenceWhy}
                  </dd>
                  <dt>Because</dt>
                  <dd>
                    <ol className="vB-reason">
                      {decision.reasonTrace.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ol>
                  </dd>
                </dl>

                <div className="vB-actions">
                  <button type="button" className="vB-primary">
                    {decision.primaryAction}
                  </button>
                  {decision.secondaryActions.map((action) => (
                    <button type="button" className="vB-secondary" key={action}>
                      {action}
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="vB-panel vB-move vB-move-quiet" aria-labelledby="b-move">
                <h2 className="vB-label vB-label-accent" id="b-move">
                  Call
                </h2>
                <p className="vB-moveStatement">{decision.statement}</p>
                <p className="vB-panelBody">{decision.rationale}</p>
                <dl className="vB-kv">
                  <dt>Confidence</dt>
                  <dd>
                    {decision.confidence} — {decision.confidenceWhy}
                  </dd>
                  <dt>Because</dt>
                  <dd>
                    <ol className="vB-reason">
                      {decision.reasonTrace.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ol>
                  </dd>
                  <dt>Next look</dt>
                  <dd>{decision.nextCheck}</dd>
                </dl>
                <div className="vB-actions">
                  {decision.secondaryActions.map((action) => (
                    <button type="button" className="vB-secondary" key={action}>
                      {action}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
