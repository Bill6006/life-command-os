import { useCallback, useEffect, useRef, useState } from 'react';
import { buildInfo, shortCommit } from '../../../app/buildInfo';
import { KeyValues, Panel } from '../../components/primitives';
import { PRIVACY_CLASSES, type PrivacyClass } from '../../../domain/records';
import {
  applyRestore,
  createEncryptedBackup,
  dryRunRestore,
  inspectBackup,
  listRestorePoints,
  rollbackToSnapshot,
  MINIMUM_PASSPHRASE_LENGTH,
  type RestorePlan,
  type SnapshotSummary,
} from '../../../application/commands/recoveryCommands';
import {
  disableLock,
  enableLock,
  isLockEnabled,
  MINIMUM_LOCK_LENGTH,
} from '../../../application/commands/appLock';
import {
  readStorageHealth,
  recordBackupTaken,
  requestPersistentStorage,
  type StorageHealth,
} from '../../../application/queries/storageHealth';
import {
  DEFAULT_INCLUDED_CLASSES,
  exportForAi,
  RANGE_LABELS,
  type ExportRange,
  type ExportResult,
} from '../../../application/queries/aiExport';

/**
 * Data & Privacy — the real surface (Prompt 7B task 8).
 *
 * The order of this page is an argument. Health issues come first because they are
 * the only thing here that is ever urgent. Backup comes before restore because the
 * owner needs one before they need the other. The AI export is last and is separated
 * by a heading that says what it is not, because the one mistake with permanent
 * consequences is mistaking a readable summary for a recovery package.
 *
 * There is **no delete control**, by owner instruction. Deletion semantics remain
 * undecided: append-oriented storage preserves corrected values, so correcting and
 * deleting cannot be the same operation, and shipping a control before deciding what
 * it means would be worse than not having one (ADR-0005).
 */

type Busy = 'none' | 'backup' | 'dry-run' | 'restore' | 'rollback' | 'export' | 'lock';

function download(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* -------------------------------------------------------------------------- */

function HealthPanel({
  health,
}: {
  health: StorageHealth | undefined;
}): React.JSX.Element | null {
  if (health === undefined || health.issues.length === 0) return null;
  return (
    <Panel label="Needs attention" tone="attention" wide>
      <ul className="changes">
        {health.issues.map((issue) => (
          <li key={issue.code}>
            <span className="change-main">{issue.message}</span>
            <span className="fine">
              {issue.severity === 'act-now' ? 'Act now' : 'Worth knowing'}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function PlanTable({ plan }: { plan: RestorePlan }): React.JSX.Element {
  return (
    <>
      <p className="fine">
        Made {new Date(plan.createdAt).toISOString().slice(0, 16).replace('T', ' ')} · written
        under storage schema {String(plan.storageSchemaVersion)}, this app reads{' '}
        {String(plan.currentSchemaVersion)}
      </p>
      <KeyValues
        entries={[
          { label: 'Records in the backup', value: String(plan.incomingCount) },
          { label: 'Records here now', value: String(plan.currentCount) },
          { label: 'Would be added', value: String(plan.added) },
          { label: 'Would be replaced', value: String(plan.retained) },
          { label: 'Would be removed', value: String(plan.removed) },
          {
            label: 'Fields this version does not understand',
            value: String(plan.quarantinedFieldCount),
          },
          { label: 'Privacy classes present', value: plan.privacyClasses.join(', ') },
        ]}
      />
      {plan.removed > 0 ? (
        <p className="fine why">
          {`Restoring replaces everything. ${String(plan.removed)} record${plan.removed === 1 ? '' : 's'} here now `}
          {plan.removed === 1 ? 'is' : 'are'} not in this backup and would be removed. A restore
          point is saved first, so this is reversible.
        </p>
      ) : (
        <p className="fine why">
          Nothing currently stored would be lost. A restore point is saved first regardless.
        </p>
      )}
    </>
  );
}

function ExportPanel({
  result,
  range,
  included,
  busy,
  onRange,
  onToggleClass,
  onGenerate,
  onDownload,
}: {
  result: ExportResult | undefined;
  range: ExportRange;
  included: readonly PrivacyClass[];
  busy: Busy;
  onRange: (range: ExportRange) => void;
  onToggleClass: (privacy: PrivacyClass) => void;
  onGenerate: () => void;
  onDownload: () => void;
}): React.JSX.Element {
  return (
    <Panel label="Readable export — not a backup" wide>
      <p className="body">
        A readable summary for thinking with, or for pasting somewhere else. It is deliberately
        incomplete, it is not encrypted, and <strong>it cannot restore anything</strong>. The
        recovery package is the encrypted backup above.
      </p>

      <p className="panel-label">Range</p>
      <div className="scale scale-choices" role="group" aria-label="Export range">
        {(['7d', '30d', '90d', 'all'] as const).map((kind) => (
          <button
            type="button"
            key={kind}
            className={`scale-step${range.kind === kind ? ' scale-step-on' : ''}`}
            aria-pressed={range.kind === kind}
            onClick={() => {
              onRange({ kind });
            }}
          >
            <span className="scale-label">{RANGE_LABELS[kind]}</span>
          </button>
        ))}
        <button
          type="button"
          className={`scale-step${range.kind === 'custom' ? ' scale-step-on' : ''}`}
          aria-pressed={range.kind === 'custom'}
          onClick={() => {
            const to = new Date();
            const from = new Date(to.getTime() - 180 * 24 * 60 * 60 * 1000);
            onRange({ kind: 'custom', fromIso: from.toISOString(), toIso: to.toISOString() });
          }}
        >
          <span className="scale-label">Custom (last 180 days)</span>
        </button>
      </div>

      <p className="panel-label">What to include</p>
      <p className="fine">
        Everything sensitive is excluded until you say otherwise. Unclassified records are
        treated as the most private class, so nothing is included by accident.
      </p>
      <div className="scale scale-choices" role="group" aria-label="Privacy classes to include">
        {PRIVACY_CLASSES.map((privacy) => (
          <button
            type="button"
            key={privacy}
            className={`scale-step${included.includes(privacy) ? ' scale-step-on' : ''}`}
            aria-pressed={included.includes(privacy)}
            onClick={() => {
              onToggleClass(privacy);
            }}
          >
            <span className="scale-label">{privacy}</span>
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-secondary"
          disabled={busy !== 'none'}
          onClick={onGenerate}
        >
          Preview export
        </button>
        {result === undefined ? null : (
          <button type="button" className="btn btn-secondary" onClick={onDownload}>
            Download export
          </button>
        )}
      </div>

      {result === undefined ? null : (
        <>
          <KeyValues
            entries={[
              { label: 'Records included', value: String(result.includedCount) },
              { label: 'Records withheld', value: String(result.withheldCount) },
              { label: 'Fields withheld', value: String(result.redactedFieldCount) },
            ]}
          />
          {result.withheldByClass.length > 0 ? (
            <p className="fine">
              Withheld:{' '}
              {result.withheldByClass
                .map((entry) => `${String(entry.count)} ${entry.privacy}`)
                .join(', ')}
              .
            </p>
          ) : null}
          <pre className="export-preview" aria-label="Export preview">
            {result.markdown}
          </pre>
        </>
      )}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */

export function DataPrivacySurface({
  recordCount,
}: {
  readonly recordCount: number;
}): React.JSX.Element {
  const [busy, setBusy] = useState<Busy>('none');
  const [health, setHealth] = useState<StorageHealth | undefined>(undefined);
  const [lockEnabled, setLockEnabled] = useState(false);

  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupMessage, setBackupMessage] = useState<string | undefined>(undefined);

  const [restoreFile, setRestoreFile] = useState<string | undefined>(undefined);
  const [restorePreview, setRestorePreview] = useState<string | undefined>(undefined);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [plan, setPlan] = useState<RestorePlan | undefined>(undefined);
  const [restoreMessage, setRestoreMessage] = useState<string | undefined>(undefined);

  const [snapshots, setSnapshots] = useState<readonly SnapshotSummary[]>([]);
  const [rollbackMessage, setRollbackMessage] = useState<string | undefined>(undefined);

  const [range, setRange] = useState<ExportRange>({ kind: '30d' });
  const [included, setIncluded] = useState<readonly PrivacyClass[]>([
    ...DEFAULT_INCLUDED_CLASSES,
  ]);
  const [exported, setExported] = useState<ExportResult | undefined>(undefined);

  const [lockPassphrase, setLockPassphrase] = useState('');
  const [lockMessage, setLockMessage] = useState<string | undefined>(undefined);

  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [nextHealth, nextSnapshots, nextLock] = await Promise.all([
      readStorageHealth(new Date()),
      listRestorePoints(),
      isLockEnabled(),
    ]);
    setHealth(nextHealth);
    setSnapshots(nextSnapshots);
    setLockEnabled(nextLock);
  }, []);

  /*
   * Reads storage state when the surface opens, and again whenever the record count
   * changes underneath it. The cancelled flag matters: these are three awaits deep,
   * and the owner can navigate away long before they finish.
   */
  useEffect(() => {
    // An object rather than a `let`: a boolean flipped inside the cleanup closure
    // gets narrowed to its initial literal, and the guard would be compiled away.
    const alive = { current: true };
    void (async () => {
      const [nextHealth, nextSnapshots, nextLock] = await Promise.all([
        readStorageHealth(new Date()),
        listRestorePoints(),
        isLockEnabled(),
      ]);
      if (!alive.current) return;
      setHealth(nextHealth);
      setSnapshots(nextSnapshots);
      setLockEnabled(nextLock);
    })();
    return () => {
      alive.current = false;
    };
  }, [recordCount]);

  return (
    <div className="grid">
      <HealthPanel health={health} />

      <Panel label="Private local use" tone="decision" wide>
        <p className="lead">Ready for private local use</p>
        <p className="body">
          Encrypted backup, verified restore, and rollback are implemented and tested. Before
          you rely on this, do one thing:{' '}
          <strong>take a backup and check you can open it</strong>. Everything here lives in one
          browser profile on one device, and a backup you have never opened is a hope rather
          than a copy.
        </p>
      </Panel>

      <Panel label="Backup" wide>
        <p className="body">
          Writes an encrypted file containing every record, its provenance, its privacy
          classification, and its corrections. Encrypted with AES-256-GCM using a key derived
          from your passphrase with PBKDF2-SHA-256 at{' '}
          {new Intl.NumberFormat('en-GB').format(600_000)} iterations.
        </p>
        <p className="fine why">
          <strong>
            Nobody can recover this passphrase — not you, not me, not Anthropic, not GitHub.
          </strong>{' '}
          There is no reset link and no support address. If you lose it, the backup is
          permanently unreadable, and that is a property of the design rather than an oversight.
          Use several unrelated words and write them down somewhere physical.
        </p>
        <p className="field">
          <label className="fine" htmlFor="backup-passphrase">
            passphrase ({MINIMUM_PASSPHRASE_LENGTH}+ characters)
          </label>
          <input
            id="backup-passphrase"
            className="field-input"
            type="password"
            autoComplete="new-password"
            value={backupPassphrase}
            onChange={(event) => {
              setBackupPassphrase(event.target.value);
            }}
          />
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== 'none'}
            onClick={() => {
              void (async () => {
                setBusy('backup');
                setBackupMessage(undefined);
                const result = await createEncryptedBackup(backupPassphrase, new Date());
                if (result.ok) {
                  download(result.filename, result.file, 'application/json');
                  await recordBackupTaken(new Date());
                  setBackupMessage(
                    `Saved ${result.filename} — ${String(result.recordCount)} records, encrypted. Open it once to confirm the passphrase works.`,
                  );
                  setBackupPassphrase('');
                  await refresh();
                } else {
                  setBackupMessage(result.reason);
                }
                setBusy('none');
              })();
            }}
          >
            Create encrypted backup
          </button>
        </div>
        {backupMessage === undefined ? null : <p className="fine">{backupMessage}</p>}
      </Panel>

      <Panel label="Restore" wide>
        <p className="body">
          Restoring <strong>replaces</strong> what is on this device. Nothing is written until
          you have seen exactly what would change, and a restore point is saved first so it can
          be undone.
        </p>

        <p className="field">
          <label className="fine" htmlFor="restore-file">
            backup file
          </label>
          <input
            id="restore-file"
            ref={fileInput}
            className="field-input"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPlan(undefined);
              setRestoreMessage(undefined);
              if (file === undefined) {
                setRestoreFile(undefined);
                setRestorePreview(undefined);
                return;
              }
              void file.text().then((text) => {
                setRestoreFile(text);
                const inspected = inspectBackup(text);
                setRestorePreview(
                  inspected.ok
                    ? `Format ${String(inspected.preview.formatVersion)} · made ${inspected.preview.createdAt.slice(0, 10)} · about ${String(inspected.preview.approximateRecordCount)} records · ${inspected.preview.cipher}, ${inspected.preview.kdf} at ${new Intl.NumberFormat('en-GB').format(inspected.preview.iterations)} iterations`
                    : inspected.message,
                );
              });
            }}
          />
        </p>
        {restorePreview === undefined ? null : <p className="fine">{restorePreview}</p>}

        <p className="field">
          <label className="fine" htmlFor="restore-passphrase">
            passphrase
          </label>
          <input
            id="restore-passphrase"
            className="field-input"
            type="password"
            autoComplete="current-password"
            value={restorePassphrase}
            onChange={(event) => {
              setRestorePassphrase(event.target.value);
            }}
          />
        </p>

        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy !== 'none' || restoreFile === undefined}
            onClick={() => {
              void (async () => {
                if (restoreFile === undefined) return;
                setBusy('dry-run');
                setRestoreMessage(undefined);
                const result = await dryRunRestore(restoreFile, restorePassphrase);
                if (result.ok) setPlan(result.plan);
                else {
                  setPlan(undefined);
                  setRestoreMessage(result.message);
                }
                setBusy('none');
              })();
            }}
          >
            Check this backup
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy !== 'none' || plan === undefined}
            onClick={() => {
              void (async () => {
                if (restoreFile === undefined) return;
                setBusy('restore');
                const result = await applyRestore(restoreFile, restorePassphrase, new Date());
                setRestoreMessage(
                  result.ok
                    ? `Restored ${String(result.restoredCount)} records and verified them against storage. A restore point was saved first.`
                    : result.message,
                );
                setPlan(undefined);
                setRestorePassphrase('');
                await refresh();
                setBusy('none');
              })();
            }}
          >
            Restore
          </button>
        </div>

        {plan === undefined ? null : <PlanTable plan={plan} />}
        {restoreMessage === undefined ? null : <p className="fine why">{restoreMessage}</p>}
      </Panel>

      <Panel label="Restore points" wide>
        <p className="fine">
          Saved automatically before each restore, so a restore can be undone. The five most
          recent are kept.
        </p>
        {snapshots.length === 0 ? (
          <p className="body">No restore points yet.</p>
        ) : (
          <ul className="changes">
            {snapshots.map((snapshot) => (
              <li key={snapshot.snapshotId}>
                <span className="change-main">
                  {snapshot.createdAt.slice(0, 16).replace('T', ' ')} ·{' '}
                  {String(snapshot.recordCount)} records
                </span>
                <span className="fine">{snapshot.reason}</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy !== 'none'}
                  onClick={() => {
                    void (async () => {
                      setBusy('rollback');
                      const result = await rollbackToSnapshot(snapshot.snapshotId);
                      setRollbackMessage(
                        result.ok
                          ? `Rolled back to ${String(result.restoredCount)} records.`
                          : result.message,
                      );
                      await refresh();
                      setBusy('none');
                    })();
                  }}
                >
                  Roll back to this
                </button>
              </li>
            ))}
          </ul>
        )}
        {rollbackMessage === undefined ? null : <p className="fine why">{rollbackMessage}</p>}
      </Panel>

      <Panel label="Application lock" wide>
        <p className="body">
          Keeps what is on screen off the screen until a passphrase is entered.
        </p>
        <p className="fine why">
          <strong>It does not encrypt anything.</strong> The records sit in this browser&rsquo;s
          storage in the clear, and anyone with the unlocked device and developer tools can read
          them without going near this lock. It is useful for a phone handed to someone or left
          on a desk, and useless against a compromised device. Forgetting this passphrase costs
          you nothing — the lock can be turned off from here.
        </p>
        <KeyValues entries={[{ label: 'Lock', value: lockEnabled ? 'On' : 'Off' }]} />
        {lockEnabled ? (
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy !== 'none'}
              onClick={() => {
                void (async () => {
                  setBusy('lock');
                  await disableLock();
                  setLockMessage('Lock turned off.');
                  await refresh();
                  setBusy('none');
                })();
              }}
            >
              Turn lock off
            </button>
          </div>
        ) : (
          <>
            <p className="field">
              <label className="fine" htmlFor="lock-passphrase">
                lock passphrase ({MINIMUM_LOCK_LENGTH}+ characters)
              </label>
              <input
                id="lock-passphrase"
                className="field-input"
                type="password"
                autoComplete="new-password"
                value={lockPassphrase}
                onChange={(event) => {
                  setLockPassphrase(event.target.value);
                }}
              />
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy !== 'none'}
                onClick={() => {
                  void (async () => {
                    setBusy('lock');
                    const result = await enableLock(lockPassphrase);
                    setLockMessage(result.ok ? 'Lock turned on.' : result.message);
                    setLockPassphrase('');
                    await refresh();
                    setBusy('none');
                  })();
                }}
              >
                Turn lock on
              </button>
            </div>
          </>
        )}
        {lockMessage === undefined ? null : <p className="fine">{lockMessage}</p>}
      </Panel>

      <ExportPanel
        result={exported}
        range={range}
        included={included}
        busy={busy}
        onRange={setRange}
        onToggleClass={(privacy) => {
          setIncluded((current) =>
            current.includes(privacy)
              ? current.filter((entry) => entry !== privacy)
              : [...current, privacy],
          );
          setExported(undefined);
        }}
        onGenerate={() => {
          void (async () => {
            setBusy('export');
            setExported(await exportForAi({ range, includeClasses: included }, new Date()));
            setBusy('none');
          })();
        }}
        onDownload={() => {
          if (exported !== undefined) {
            download(
              `life-command-os-export-${new Date().toISOString().slice(0, 10)}.md`,
              exported.markdown,
              'text/markdown',
            );
          }
        }}
      />

      <Panel label="Storage">
        <KeyValues
          entries={[
            { label: 'Records stored', value: String(health?.recordCount ?? recordCount) },
            { label: 'Schema version', value: String(health?.schemaVersion ?? 0) },
            { label: 'Restore points', value: String(health?.snapshotCount ?? 0) },
            {
              label: 'Last backup',
              value: health?.lastBackupAt?.slice(0, 10) ?? 'never',
            },
            {
              label: 'Browser persistence',
              value:
                health?.persistent === undefined
                  ? 'unknown'
                  : health.persistent
                    ? 'granted'
                    : 'not granted',
            },
          ]}
        />
        {health?.persistent === false ? (
          <div className="actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                void (async () => {
                  await requestPersistentStorage();
                  await refresh();
                })();
              }}
            >
              Ask the browser to keep this data
            </button>
          </div>
        ) : null}
        <p className="fine">
          Records are appended, never overwritten, so a correction adds to the history rather
          than replacing it — which is why this count only ever grows.
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
              A backup or export leaves only when you save the file and move it yourself.
            </span>
          </li>
        </ul>
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
