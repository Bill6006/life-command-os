import { useState } from 'react';
import type { Scenario } from './scenario';

/**
 * Variant C — **Focus**.
 *
 * Hierarchy: one dominant answer. The decision fills the first viewport; the
 * situation that produced it sits underneath, folded away.
 * Density: very low above the fold, complete underneath. Progressive disclosure is
 * the organising idea rather than a convenience.
 * Typography: large decision type, small quiet labels, wide letter-spacing on marks.
 * Surface: quiet canvas, a single strongly elevated decision card, flat disclosure
 * rows beneath it.
 * Navigation: minimal — a compact header menu holding all five destinations, so the
 * decision keeps the whole viewport.
 * Expression: decisive and short. One thing at a time.
 *
 * The risk this variant carries, stated plainly for the comparison: folding the
 * evidence away is exactly what the Constitution warns against when it says useful
 * intelligence must be visible rather than buried. Whether the fold lands on the
 * right side of that line is the thing to judge.
 */
export function VariantFocus({ scenario }: { scenario: Scenario }): React.JSX.Element {
  const { decision } = scenario;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="vC">
      <header className="vC-head">
        <span className="vC-clock">{scenario.clock}</span>
        <button
          type="button"
          className="vC-menuButton"
          aria-expanded={menuOpen}
          onClick={() => {
            setMenuOpen((open) => !open);
          }}
        >
          Menu
        </button>
      </header>

      {menuOpen ? (
        <nav className="vC-menu" aria-label="Main">
          {['Now', 'Timeline', 'Direction', 'Commitments', 'More'].map((tab) => (
            <button
              type="button"
              key={tab}
              className="vC-menuItem"
              {...(tab === 'Now' ? { 'aria-current': 'page' as const } : {})}
            >
              {tab}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="vC-main">
        {decision.kind === 'action' ? (
          <section className="vC-card" aria-labelledby="c-move">
            <p className="vC-eyebrow">Best move now</p>
            <h1 className="vC-statement" id="c-move">
              {decision.statement}
            </h1>
            <p className="vC-duration">{decision.duration}</p>
            <p className="vC-min">
              {decision.minimumVersion}. {decision.stoppingPoint}.
            </p>

            <ul className="vC-chips">
              {decision.effects.map((effect) => (
                <li
                  key={`${effect.category}-${effect.note}`}
                  className={`vC-chip vC-chip-${effect.direction}`}
                >
                  <span className="vC-chipKind">
                    {effect.direction === 'positive'
                      ? 'Benefit'
                      : effect.direction === 'negative'
                        ? 'Cost'
                        : 'Neutral'}
                  </span>
                  <span className="vC-chipText">
                    {effect.category}
                    {effect.crossDomain ? ' · cross-domain' : ''}
                    {effect.uncertain ? ' · uncertain' : ''}
                    {effect.timing === 'delayed' ? ' · delayed' : ''}
                  </span>
                </li>
              ))}
            </ul>

            <p className="vC-confidence">
              {decision.confidence} · {decision.northStar.relevance} on your North Star
            </p>

            <button type="button" className="vC-primary">
              {decision.primaryAction}
            </button>
            <div className="vC-secondaries">
              {decision.secondaryActions.map((action) => (
                <button type="button" className="vC-secondary" key={action}>
                  {action}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="vC-card vC-card-quiet" aria-labelledby="c-move">
            <p className="vC-eyebrow">Right now</p>
            <h1 className="vC-statement" id="c-move">
              {scenario.headline}
            </h1>
            <p className="vC-min">{decision.rationale}</p>
            <p className="vC-confidence">
              {decision.confidence} · {decision.nextCheck}
            </p>
            <div className="vC-secondaries">
              {decision.secondaryActions.map((action) => (
                <button type="button" className="vC-secondary" key={action}>
                  {action}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="vC-folds">
          <details className="vC-fold" open>
            <summary>
              <span className="vC-foldTitle">What changed</span>
              <span className="vC-foldHint">{scenario.whatChanged[0]?.when}</span>
            </summary>
            <div className="vC-foldBody">
              {scenario.whatChanged.map((change) => (
                <p key={change.change}>
                  <strong>{change.change}</strong> — {change.detail}
                </p>
              ))}
              <p className="vC-quiet">{scenario.whyTheAnswerChanged}</p>
            </div>
          </details>

          <details className="vC-fold">
            <summary>
              <span className="vC-foldTitle">Right now</span>
              <span className="vC-foldHint">
                {scenario.readings[0]?.value} free · capacity {scenario.readings[1]?.value}
              </span>
            </summary>
            <div className="vC-foldBody">
              {scenario.readings.map((reading) => (
                <p key={reading.label}>
                  <span className="vC-readingLabel">{reading.label}</span>
                  <strong>{reading.value}</strong>{' '}
                  <span className={`vC-tag vC-tag-${reading.evidence}`}>
                    {reading.evidence}
                  </span>
                  <span className="vC-quiet"> — {reading.basis}</span>
                </p>
              ))}
            </div>
          </details>

          <details className="vC-fold">
            <summary>
              <span className="vC-foldTitle">If nothing changes</span>
              <span className="vC-foldHint">{scenario.trajectory.direction}</span>
            </summary>
            <div className="vC-foldBody">
              <p>{scenario.untreatedPath.summary}</p>
              <p className="vC-quiet">
                {scenario.trajectory.question}: {scenario.trajectory.detail}.{' '}
                {scenario.trajectory.confidence}. {scenario.trajectory.freshness}.
              </p>
              <p className="vC-quiet">
                Assumes: {scenario.untreatedPath.assumptions.join('; ')}.{' '}
                {scenario.untreatedPath.uncertainty}
              </p>
            </div>
          </details>

          <details className="vC-fold">
            <summary>
              <span className="vC-foldTitle">Why this</span>
              <span className="vC-foldHint">{decision.confidence}</span>
            </summary>
            <div className="vC-foldBody">
              <ol className="vC-reason">
                {decision.reasonTrace.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ol>
              <p className="vC-quiet">{decision.confidenceWhy}</p>
              {decision.kind === 'action' ? (
                <p className="vC-quiet">North Star — “{decision.northStar.statement}”</p>
              ) : null}
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
