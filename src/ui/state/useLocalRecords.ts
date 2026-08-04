import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CanonicalRecord } from '../../domain/records';
import { listAllRecords } from '../../application/queries/readRecords';
import { runEpisode, type EpisodeResult } from '../../intelligence';

/**
 * The application's one connection to real local data.
 *
 * Records are read from IndexedDB, the engine computes an episode from them, and the
 * surfaces render that. **Every conclusion on screen is derived from stored records**
 * — there is no other source, and after Phase 6 there is no synthetic fallback either.
 *
 * `refresh` is deliberately explicit rather than a subscription. Writes go through the
 * application layer, and the interface asks for the new truth once the transaction has
 * committed. A live query would render optimistically, which would mean showing a
 * value before it is durable — the one thing this codebase has refused to do since
 * Phase 2.
 */

export type LoadStatus = 'loading' | 'empty' | 'ready' | 'error';

export interface LocalRecordsState {
  readonly status: LoadStatus;
  readonly records: readonly CanonicalRecord[];
  readonly episode: EpisodeResult | undefined;
  readonly error: string | undefined;
  /** Set when a write did not commit. Drives the recovery surface. */
  readonly writeFailure: string | undefined;
  readonly now: Date;
  refresh: () => Promise<void>;
  reportWriteFailure: (detail: string | undefined) => void;
}

export function useLocalRecords(): LocalRecordsState {
  const [records, setRecords] = useState<readonly CanonicalRecord[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState<string | undefined>(undefined);
  const [writeFailure, setWriteFailure] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(() => new Date());

  const refresh = useCallback(async () => {
    try {
      const loaded = await listAllRecords();
      setRecords(loaded);
      setNow(new Date());
      setError(undefined);
      setStatus(loaded.length === 0 ? 'empty' : 'ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The local database did not respond');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /*
   * One engine run per load. `now` is captured with the records so the episode is a
   * consistent snapshot rather than shifting under a re-render.
   */
  const episode = useMemo(
    () => (records.length === 0 ? undefined : runEpisode(records, now)),
    [records, now],
  );

  return {
    status,
    records,
    episode,
    error,
    writeFailure,
    now,
    refresh,
    reportWriteFailure: setWriteFailure,
  };
}
