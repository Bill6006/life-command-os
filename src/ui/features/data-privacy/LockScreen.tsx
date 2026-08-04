import { useState } from 'react';

/**
 * The lock screen.
 *
 * Its copy is the important part. A lock screen implies a vault, and this one is a
 * curtain — so it says so, here, where the owner is deciding how much to trust it,
 * rather than in a settings page they will read once.
 */
export function LockScreen({
  onUnlock,
}: {
  readonly onUnlock: (passphrase: string) => Promise<boolean>;
}): React.JSX.Element {
  const [passphrase, setPassphrase] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="standalone">
      <p className="panel-label">Locked</p>
      <p className="standalone-headline">Enter your passphrase</p>
      <p className="fine">
        This keeps your records off the screen. It does not encrypt them — anyone with this
        device unlocked can read them another way. If you have forgotten it, you have lost
        nothing: the lock can be turned off from Data &amp; Privacy on a fresh session.
      </p>
      <p className="field">
        <label className="fine" htmlFor="lock-entry">
          passphrase
        </label>
        <input
          id="lock-entry"
          className="field-input"
          type="password"
          autoComplete="current-password"
          value={passphrase}
          onChange={(event) => {
            setPassphrase(event.target.value);
            setFailed(false);
          }}
        />
      </p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true);
              const ok = await onUnlock(passphrase);
              setFailed(!ok);
              setPassphrase('');
              setBusy(false);
            })();
          }}
        >
          Unlock
        </button>
      </div>
      {failed ? <p className="fine why">That passphrase did not match.</p> : null}
    </div>
  );
}
