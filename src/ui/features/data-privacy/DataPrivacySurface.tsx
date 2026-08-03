import { buildInfo, shortCommit } from '../../../app/buildInfo';
import { Actions, KeyValues, Panel } from '../../components/primitives';
import type { CanonicalRecord } from '../../../domain/records';
import { CANONICAL_SCHEMA_VERSION } from '../../../application/queries/storageInfo';

/**
 * Data & Privacy.
 *
 * Operational status appears **only when actionable** (`UX-011`). There is
 * deliberately no "all systems operational" counterpart, so when nothing needs
 * attention this surface simply does not show an attention panel.
 *
 * There is **no delete control**, by owner instruction. Deletion semantics remain
 * undecided: append-oriented storage preserves corrected values, so correcting and
 * deleting cannot be the same operation, and shipping a control before deciding what
 * it means would be worse than not having one (ADR-0005).
 *
 * Storage is wired to real backup, restore, and lock in Phase 6.
 */
export function DataPrivacySurface({
  records,
}: {
  records: readonly CanonicalRecord[];
}): React.JSX.Element {
  return (
    <div className="grid">
      <Panel label="Not ready for private data" tone="attention" wide>
        <p className="lead">Not ready for private data yet</p>
        <p className="body">
          Encrypted backup and fresh-profile recovery are proven in Phase 6. Until then,
          entering meaningful private information is not safe.
        </p>
      </Panel>

      <Panel label="Storage">
        <KeyValues
          entries={[
            { label: 'Records in view', value: String(records.length) },
            { label: 'Schema version', value: String(CANONICAL_SCHEMA_VERSION) },
            { label: 'Encrypted at rest', value: 'No — Phase 6' },
          ]}
        />
        <p className="fine">
          These are the synthetic scenario records currently loaded, not a private database.
        </p>
      </Panel>

      <Panel label="What leaves this device">
        <ul className="changes">
          <li>
            <span className="fine">
              All data stays on this device. There is no server and no account.
            </span>
          </li>
          <li>
            <span className="fine">No analytics, no telemetry, no external AI.</span>
          </li>
          <li>
            <span className="fine">
              This build and the repository behind it contain synthetic content only.
            </span>
          </li>
          <li>
            <span className="fine">
              Every conclusion on Now was computed here, on this device, by local deterministic
              logic.
            </span>
          </li>
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
