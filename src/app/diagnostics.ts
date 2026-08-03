import { writeRecord, writeRecords } from '../application/commands/writeRecord';
import { exportBackup, restoreBackup } from '../application/commands/backupCommands';
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
import { SCHEMA_VERSION } from '../infrastructure/database/connection';

/**
 * Browser diagnostics bridge — **temporary, and scheduled for removal in Phase 3.**
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
 * **Removal trigger:** when Phase 3 delivers the Data & Privacy surface, the
 * browser tests move to driving the real interface and this module is deleted.
 */

export interface DiagnosticsBridge {
  readonly schemaVersion: number;
  writeRecord: typeof writeRecord;
  writeRecords: typeof writeRecords;
  listAllRecords: typeof listAllRecords;
  listCurrentRecords: typeof listCurrentRecords;
  readSupersessionChain: typeof readSupersessionChain;
  exportBackup: () => Promise<string>;
  restoreBackup: typeof restoreBackup;
  getProjection: (name: ProjectionName) => Promise<unknown>;
  rebuildAllProjections: () => Promise<void>;
  dropAllProjections: typeof dropAllProjections;
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
    exportBackup: () => exportBackup(new Date()),
    restoreBackup,
    getProjection: (name) => getProjection(name, new Date()),
    rebuildAllProjections: () => rebuildAllProjections(new Date()),
    dropAllProjections,
  };
}
