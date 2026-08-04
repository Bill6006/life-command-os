import { writeRecord, writeRecords } from '../application/commands/writeRecord';
import { applyRestore, createEncryptedBackup } from '../application/commands/recoveryCommands';
import {
  listAllRecords,
  listCurrentRecords,
  readSupersessionChain,
} from '../application/queries/readRecords';
import {
  dropAllProjections,
  getProjection,
  rebuildAllProjections,
  type ProjectionName,
} from '../application/projections';
import { SCHEMA_VERSION, openDatabase } from '../infrastructure/database/connection';
import { replaceAllRecords } from '../infrastructure/database/recordRepository';
import { SCENARIOS, scenarioById, shiftScenario } from './scenarios';

/**
 * Browser test bridge — **absent from every production build.**
 *
 * `__TEST_BRIDGE__` is a compile-time constant, false in production, so the dynamic
 * import in `main.tsx` folds to `if (false)` and this module — along with the whole
 * synthetic scenario corpus — is dropped from the bundle. A test reads the built
 * artifact off disk and fails if any trace of it survives. That is removal rather than
 * concealment, which is what Prompt 7B task 18 asks for.
 *
 * The end-to-end suite builds with the flag set so it can seed a known corpus.
 * Fresh-profile recovery is proved separately, against the production build, through
 * the real interface only — see `tests/e2e/production-recovery.spec.ts`.
 *
 * Why this exists:
 *   The Phase 2 gate requires evidence that canonical data survives a real reload
 *   and a real restore *in a browser*. Phase 2 has no user interface — the command
 *   surface is designed in Phase 3 — so there is no other way to drive the
 *   application layer inside a page. Manipulating IndexedDB directly from the test
 *   would prove that the browser works, not that this codebase does.
 *
 * Why a smaller implementation is insufficient:
 *   A narrower hook (say, only a record count) could not demonstrate the restore
 *   round trip or supersession resolution, which are both explicit gate criteria.
 *
 * Security note: this adds no capability that a script on this origin does not
 * already have. Any code able to call these functions could read and write the same
 * IndexedDB database directly. There is no server, no account, and no secret here.
 *
 * **Removal history.** The original trigger said "when Phase 3 delivers the Data &
 * Privacy surface", which was wrong: Phase 3's Data & Privacy was a static synthetic
 * view and could not exercise real storage. It moved to Phase 6, then to Prompt 7B —
 * and 7B removed it from the shipped product rather than deleting the file, because
 * the browser suite still needs a way to establish a known corpus, and doing that
 * through a compile-time-stripped module is better than doing it by poking IndexedDB
 * from the test, which would prove the browser works rather than that this code does.
 */

export interface DiagnosticsBridge {
  readonly schemaVersion: number;
  writeRecord: typeof writeRecord;
  writeRecords: typeof writeRecords;
  listAllRecords: typeof listAllRecords;
  listCurrentRecords: typeof listCurrentRecords;
  readSupersessionChain: typeof readSupersessionChain;
  createEncryptedBackup: (passphrase: string) => ReturnType<typeof createEncryptedBackup>;
  applyRestore: (raw: string, passphrase: string) => ReturnType<typeof applyRestore>;
  getProjection: (name: ProjectionName) => Promise<unknown>;
  rebuildAllProjections: () => Promise<void>;
  dropAllProjections: typeof dropAllProjections;
  /** Scenario ids available to the browser tests. Not offered to the owner anywhere. */
  readonly scenarioIds: readonly string[];
  /** Writes one synthetic scenario into local storage. Test-only. */
  seedScenario: (scenarioId: string) => Promise<{ ok: boolean; issues: readonly string[] }>;
  /**
   * Empties local storage so a test can start from a known corpus. Test-only, and
   * deliberately **not** a delete control: it is unreachable from the interface, and
   * deletion semantics for owner data remain undecided.
   */
  resetLocalData: () => Promise<void>;
}

declare global {
  var __lifeCommandOsDiagnostics: DiagnosticsBridge | undefined;
}

export function installDiagnosticsBridge(): void {
  globalThis.__lifeCommandOsDiagnostics = {
    schemaVersion: SCHEMA_VERSION,
    writeRecord,
    writeRecords,
    listAllRecords,
    listCurrentRecords,
    readSupersessionChain,
    createEncryptedBackup: (passphrase) => createEncryptedBackup(passphrase, new Date()),
    applyRestore: (raw, passphrase) => applyRestore(raw, passphrase, new Date()),
    getProjection: (name) => getProjection(name, new Date()),
    rebuildAllProjections: () => rebuildAllProjections(new Date()),
    dropAllProjections,
    scenarioIds: SCENARIOS.map((scenario) => scenario.id),
    seedScenario: async (scenarioId) => {
      // Shifted onto the current clock: the app reads the real time now, so a corpus
      // frozen at its authoring anchor would read as a months-long absence.
      const scenario = shiftScenario(scenarioById(scenarioId), new Date());
      const results = await writeRecords(scenario.records);
      const failed = results.filter((result) => !result.ok);
      return { ok: failed.length === 0, issues: failed.flatMap((result) => result.issues) };
    },
    resetLocalData: async () => {
      const database = await openDatabase();
      await replaceAllRecords(database, []);
      await dropAllProjections();
    },
  };
}
