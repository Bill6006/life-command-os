import { buildInfo, shortCommit } from '../../../app/buildInfo';
import { Actions, KeyValues, Panel } from '../../components/primitives';
import { DATA_PRIVACY } from '../../view-models/prototype';

/**
 * Data & Privacy.
 *
 * Operational status appears **only when actionable** (`UX-011`). `DATA_PRIVACY.attention`
 * is empty in the prototype, so the attention panel does not render at all — there is
 * deliberately no "all systems operational" counterpart to it.
 *
 * There is **no delete control**, by owner instruction. Deletion semantics are still
 * undecided: append-oriented storage preserves corrected values, so correcting and
 * deleting cannot be the same operation, and shipping a control before deciding what
 * it means would be worse than not having one (ADR-0005).
 *
 * Storage figures here are synthetic. This surface is wired to real storage in
 * Phase 6, alongside encrypted backup and recovery.
 */
export function DataPrivacySurface(): React.JSX.Element {
  return (
    <div className="grid">
      {DATA_PRIVACY.attention.length > 0 ? (
        <Panel label="Needs attention" tone="attention" wide>
          <ul className="changes">
            {DATA_PRIVACY.attention.map((item) => (
              <li key={item.summary}>
                <span className="change-main">{item.summary}</span>
                <span className="fine">{item.detail}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel label="Not ready for private data" tone="attention" wide>
        <p className="lead">{DATA_PRIVACY.notReady.headline}</p>
        <p className="body">{DATA_PRIVACY.notReady.detail}</p>
      </Panel>

      <Panel label="Storage">
        <KeyValues entries={DATA_PRIVACY.storage} />
        <p className="fine">Synthetic figures. Wired to real storage in Phase 6.</p>
      </Panel>

      <Panel label="What leaves this device">
        <ul className="changes">
          {DATA_PRIVACY.facts.map((fact) => (
            <li key={fact}>
              <span className="fine">{fact}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="Export">
        <p className="fine">
          A development export writes a plain, unencrypted JSON file that declares itself
          unencrypted, so it cannot be mistaken for the encrypted backup Phase 6 introduces.
        </p>
        <Actions secondary={['Export synthetic records']} />
        <p className="fine why">
          There is no delete control here. Correcting a record and deleting it are different
          operations, and what deletion should mean has not been decided.
        </p>
      </Panel>

      <Panel label="Build">
        <KeyValues
          entries={[
            { label: 'Plan version', value: buildInfo.planVersion },
            { label: 'Phase', value: buildInfo.phase },
            { label: 'Commit', value: shortCommit(buildInfo.commit) },
            { label: 'Built', value: buildInfo.builtAt },
          ]}
        />
        <p className="fine">
          Use this to confirm the deployed preview matches the approved commit.
        </p>
      </Panel>
    </div>
  );
}
