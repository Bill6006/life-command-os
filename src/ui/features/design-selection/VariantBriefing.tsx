import type { Scenario } from './scenario';

/**
 * Variant A — **Briefing**.
 *
 * Hierarchy: linear and narrative. Reads top to bottom like a short written
 * briefing, so the situation arrives before the answer does.
 * Density: low. Generous line-height, one idea per band.
 * Typography: large tight headline, comfortable body prose, small-caps section marks.
 * Surface: mostly flat bands separated by hairlines; exactly one elevated block —
 * the move — so elevation means "this is the decision" and nothing else.
 * Navigation: persistent bottom tab bar, five destinations.
 * Expression: complete sentences, calm, human.
 */
export function VariantBriefing({ scenario }: { scenario: Scenario }): React.JSX.Element {
  const { decision } = scenario;

  return (
    <div className="vA">
      <header className="vA-head">
        <p className="vA-clock">{scenario.clock}</p>
        <h1 className="vA-headline">{scenario.headline}</h1>
      </header>

      <main className="vA-main">
        <section className="vA-band" aria-labelledby="a-changed">
          <h2 className="vA-mark" id="a-changed">
            What changed
          </h2>
          {scenario.whatChanged.map((change) => (
            <p className="vA-change" key={change.change}>
              <strong>{change.change}</strong> — {change.detail}.{' '}
              <span className="vA-when">{change.when}</span>
            </p>
          ))}
          <p className="vA-why">{scenario.whyTheAnswerChanged}</p>
        </section>

        <section className="vA-band" aria-labelledby="a-now">
          <h2 className="vA-mark" id="a-now">
            Right now
          </h2>
          <dl className="vA-readings">
            {scenario.readings.map((reading) => (
              <div className="vA-reading" key={reading.label}>
                <dt>{reading.label}</dt>
                <dd>
                  <span className="vA-value">{reading.value}</span>
                  <span className={`vA-tag vA-tag-${reading.evidence}`}>
                    {reading.evidence}
                  </span>
                  <span className="vA-basis">{reading.basis}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="vA-band" aria-labelledby="a-path">
          <h2 className="vA-mark" id="a-path">
            If nothing changes
          </h2>
          <p className="vA-path">{scenario.untreatedPath.summary}</p>
          <p className="vA-fine">
            {scenario.trajectory.question}: {scenario.trajectory.direction} —{' '}
            {scenario.trajectory.detail}. {scenario.trajectory.confidence}.{' '}
            {scenario.trajectory.freshness}.
          </p>
          <p className="vA-fine">
            Assumes: {scenario.untreatedPath.assumptions.join('; ')}.{' '}
            {scenario.untreatedPath.uncertainty}
          </p>
        </section>

        {decision.kind === 'action' ? (
          <section className="vA-move" aria-labelledby="a-move">
            <h2 className="vA-mark vA-mark-light" id="a-move">
              The move
            </h2>
            <p className="vA-moveStatement">
              {decision.statement}, {decision.duration}
            </p>
            <p className="vA-moveFine">
              {decision.minimumVersion}. {decision.stoppingPoint}.
            </p>

            <ul className="vA-effects">
              {decision.effects.map((effect) => (
                <li key={`${effect.category}-${effect.note}`} className="vA-effect">
                  <span className={`vA-dir vA-dir-${effect.direction}`}>
                    {effect.direction === 'positive'
                      ? 'Benefit'
                      : effect.direction === 'negative'
                        ? 'Cost'
                        : 'Neutral'}
                  </span>
                  <span className="vA-effectBody">
                    <strong>{effect.category}</strong> — {effect.note}
                    <span className="vA-effectMeta">
                      {effect.magnitude !== 'unknown' ? `${effect.magnitude}, ` : ''}
                      {effect.timing}
                      {effect.crossDomain ? ', cross-domain' : ''}
                      {effect.uncertain ? ', uncertain' : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <p className="vA-northStar">
              <strong>North Star:</strong> {decision.northStar.relevance} — “
              {decision.northStar.statement}”
            </p>

            <p className="vA-confidence">
              <strong>{decision.confidence}.</strong> {decision.confidenceWhy}
            </p>

            <details className="vA-reason">
              <summary>Why this</summary>
              <ol>
                {decision.reasonTrace.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ol>
            </details>

            <div className="vA-actions">
              <button type="button" className="vA-primary">
                {decision.primaryAction}
              </button>
              {decision.secondaryActions.map((action) => (
                <button type="button" className="vA-secondary" key={action}>
                  {action}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="vA-move vA-move-quiet" aria-labelledby="a-move">
            <h2 className="vA-mark vA-mark-light" id="a-move">
              The call
            </h2>
            <p className="vA-moveStatement">{decision.statement}</p>
            <p className="vA-moveFine">{decision.rationale}</p>
            <p className="vA-confidence">
              <strong>{decision.confidence}.</strong> {decision.confidenceWhy}
            </p>
            <details className="vA-reason">
              <summary>Why this</summary>
              <ol>
                {decision.reasonTrace.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ol>
            </details>
            <p className="vA-nextCheck">{decision.nextCheck}</p>
            <div className="vA-actions">
              {decision.secondaryActions.map((action) => (
                <button type="button" className="vA-secondary" key={action}>
                  {action}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="vA-tabs" aria-label="Main">
        {['Now', 'Timeline', 'Direction', 'Commitments', 'More'].map((tab) => (
          <button
            type="button"
            key={tab}
            className="vA-tab"
            {...(tab === 'Now' ? { 'aria-current': 'page' as const } : {})}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
