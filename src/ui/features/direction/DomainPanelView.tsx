import { KeyValues, Panel } from '../../components/primitives';
import { EvidenceSummary, Meter, StagePath } from '../../components/visuals';
import type { VisualSpec } from '../../../intelligence/visuals/eligibility';
import { GraphFigure } from '../../components/GraphFigure';
import type { DomainPanel } from '../../../intelligence';
import { CAPABILITY_EFFECT_LABELS, CAPABILITY_LABELS } from '../../../domain/capabilities';
import { confidenceLabel, freshnessLabel, trajectoryLabel } from '../../view-models/present';

/**
 * One domain, rendered through the shared contract (Prompt 8A task 2).
 *
 * Every enabled domain uses this component. Not "should" — there is no other way to
 * render a domain, so an area of life cannot acquire its own layout, its own emphasis,
 * or its own quietly different standard of evidence.
 *
 * **There is no number here that could be read as a score.** Condition is a sentence,
 * trajectory is a word, confidence is one of four labels, and metrics are real
 * quantities the engine counted with their units attached. Seven of these panels side
 * by side is a summary; seven scores side by side is the wall the gate forbids.
 */
/**
 * One declared visual, drawn as whatever it earned.
 *
 * The kind is decided by the engine against the eligibility rules; this only draws the
 * decision. A meter reaches the screen as a meter when the evidence has a real
 * denominator, and as words when it does not — the component never makes that call.
 */
function DomainVisual({
  spec,
  label,
  points,
}: {
  readonly spec: VisualSpec;
  readonly label: string;
  readonly points: readonly string[];
}): React.JSX.Element {
  if (spec.data?.kind === 'meter') {
    return (
      <Meter
        spec={spec}
        label="What you could show"
        current={spec.data.current}
        target={spec.data.target}
        percent={spec.data.percent}
      />
    );
  }

  if (spec.data?.kind === 'stage-path') {
    return (
      <StagePath
        spec={spec}
        label="What the evidence supports"
        stages={spec.data.stages}
        currentIndex={spec.data.currentIndex}
      />
    );
  }

  return <EvidenceSummary spec={spec} label={label} points={points} />;
}

export function DomainPanelView({
  panel,
  onUpdate,
}: {
  readonly panel: DomainPanel;
  readonly onUpdate?: ((domainId: DomainPanel['domainId']) => void) | undefined;
}): React.JSX.Element {
  const quiet = panel.state === 'deprioritised';

  return (
    <Panel label={panel.label} tone={quiet ? 'quiet' : 'default'}>
      <p className="fine">{panel.question}</p>

      {quiet ? (
        <p className="fine why">
          Deprioritised. Readable, and deliberately silent — it will not suggest anything or ask
          you anything until you turn it back on. Nothing has been deleted.
        </p>
      ) : null}

      <p className="lead">{panel.condition}</p>
      <p className="fine">
        Trajectory: <strong>{trajectoryLabel(panel.trajectory)}</strong> ·{' '}
        {confidenceLabel(panel.confidence)} · {freshnessLabel(panel.freshness)}
      </p>

      <p className="fine why">{panel.northStarContribution}</p>

      {panel.drivers.length > 0 ? (
        <>
          <p className="panel-label">Principal drivers</p>
          <ul className="changes">
            {panel.drivers.map((driver) => (
              <li key={driver}>
                <span className="fine">{driver}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className="panel-label">Active bottleneck</p>
      <p className="body">
        {panel.bottleneck ??
          'Nothing identifiable is in the way right now — which is different from everything being fine.'}
      </p>

      {panel.whatChanged.length > 0 ? (
        <>
          <p className="panel-label">What changed</p>
          <ul className="changes">
            {panel.whatChanged.map((change) => (
              <li key={`${change.change}-${change.when}`}>
                <span className="change-main">{change.change}</span>
                <span className="fine">
                  {change.when} · altered the {change.altered}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {panel.metrics.length > 0 ? (
        <>
          <p className="panel-label">Metrics</p>
          <KeyValues entries={panel.metrics} />
        </>
      ) : null}

      {panel.capabilityEffects.length > 0 ? (
        <>
          <p className="panel-label">Capability effects</p>
          <ul className="changes">
            {panel.capabilityEffects.map((effect) => (
              <li key={`${effect.channel}-${effect.effect}`}>
                <span className="change-main">
                  {CAPABILITY_LABELS[effect.channel]} —{' '}
                  {CAPABILITY_EFFECT_LABELS[effect.effect]}
                </span>
                <span className="fine">
                  {effect.magnitude} · {effect.basis.replace(/-/g, ' ')}
                  {effect.crossDomain ? ' · reaches outside this area' : ''}
                </span>
              </li>
            ))}
          </ul>
          <p className="fine">
            Words, not numbers, and never combined into one. Calibrated estimates need evidence
            this has not got.
          </p>
        </>
      ) : null}

      {panel.move === undefined ? (
        <p className="fine why">
          No optional move here right now. The answer on Now is still the answer.
        </p>
      ) : (
        <>
          <p className="panel-label">Optional move</p>
          <p className="body">{panel.move.candidate.statement}</p>
          <p className="fine why">{panel.move.labelledAs}</p>
        </>
      )}

      {/*
        Every declared visual, in the form it earned, not just the first as a summary.

        A spec with no `data` is a declaration only. First position is the domain's
        evidence summary; anything after it is a representation that was **considered
        and refused**, shown with its reason so that the absence of a percentage is a
        decision on the page and not only in the record.
      */}
      {panel.visuals.map((spec, index) => (
        <DomainVisual
          key={spec.decisionQuestion}
          spec={spec}
          label={index === 0 ? 'Strongest evidence' : 'Not shown here'}
          points={index === 0 ? panel.strongestEvidence : []}
        />
      ))}

      {panel.graphs.map((graph) => (
        <GraphFigure graph={graph} key={graph.id} />
      ))}

      {onUpdate !== undefined && !quiet && panel.updateAvailable ? (
        <>
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                onUpdate(panel.domainId);
              }}
            >
              Update this area
            </button>
          </div>
          <p className="fine">
            One place owns updating this area, and it is this button. Nothing else asks you
            these questions — switching an area on never makes your morning longer.
          </p>
        </>
      ) : (
        <p className="fine">
          This area can be read but not yet updated — its own questions arrive with its slice.
          Nothing here is asked anywhere else in the meantime.
        </p>
      )}
    </Panel>
  );
}
