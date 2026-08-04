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
 * **From Phase 6 Prompt 7A these are the owner's real records**, not a synthetic
 * scenario. The copy on this surface changed with them: a page that told the owner
 * their own entries were synthetic would be false in the one place where being
 * trusted matters most. Backup, restore, and lock arrive in Prompt 7B, and until they
 * do this surface says so first, before anything else.
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
          Anything you enter is written to this device and nowhere else — but there is no
          encrypted backup and no tested recovery yet. If this browser profile is lost, so is
          everything in it. Both are built next, and until they pass, keep to things you could
          afford to lose.
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
          These are the canonical records stored on this device. Records are appended, never
          overwritten, so a correction adds to the history rather than replacing it — which is
          why this count only ever grows.
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
              The repository and this build ship no personal data. The app starts empty;
              everything in it came from you.
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
          The development export writes a plain, unencrypted JSON file that declares itself
          unencrypted, so it cannot be mistaken for the encrypted backup Prompt 7B introduces.
          It is not yet a recovery package, and this surface will not call it one.
        </p>
        <Actions secondary={['Export records (unencrypted)']} />
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
