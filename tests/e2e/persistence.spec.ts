import { expect, test, type Page } from '@playwright/test';

/**
 * Browser-backed persistence — Phase 2 gate evidence.
 *
 * These run against real IndexedDB in a real browser, driving the real application
 * layer. The unit tests use an in-memory shim, which cannot prove the thing the gate
 * actually asks for: that canonical data survives a genuine page reload.
 *
 * Records are built inline rather than imported, because this code is serialised
 * into the page. Values are neutral and synthetic (`PRIV-002`).
 */

const EPOCH = '2026-01-05T09:00:00.000Z';

function fixtureId(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

function anObservation(id: number, minutes: number): Record<string, unknown> {
  return {
    recordId: fixtureId(id),
    recordType: 'observation',
    schemaVersion: 1,
    occurredAt: EPOCH,
    recordedAt: EPOCH,
    localTime: { localIso: '2026-01-05T09:00:00', timeZone: 'UTC', utcOffsetMinutes: 0 },
    source: 'user-entry',
    provenance: { method: 'direct-report' },
    category: 'time-attention-capacity',
    attribute: 'available-minutes',
    value: { kind: 'duration', minutes },
  };
}

function aCorrection(id: number, supersedes: number, minutes: number): Record<string, unknown> {
  return {
    ...anObservation(id, minutes),
    recordType: 'observation-correction',
    source: 'user-correction',
    supersedesRecordId: fixtureId(supersedes),
    reason: 'Original entry double-counted a break',
  };
}

async function clearDatabase(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases
        .filter((entry) => entry.name === 'life-command-os')
        .map(
          (entry) =>
            new Promise<void>((resolve) => {
              const request = indexedDB.deleteDatabase(entry.name ?? '');
              request.onsuccess = () => {
                resolve();
              };
              request.onerror = () => {
                resolve();
              };
              request.onblocked = () => {
                resolve();
              };
            }),
        ),
    );
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
  await clearDatabase(page);
  await page.reload();
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
});

test.describe('canonical persistence in a real browser', () => {
  test('opens the database at the current schema version', async ({ page }) => {
    const version = await page.evaluate(
      () => globalThis.__lifeCommandOsDiagnostics?.schemaVersion,
    );
    // Version 3 adds the snapshot store that makes a restore reversible.
    expect(version).toBe(3);
  });

  test('validates before writing, and writes nothing when validation fails', async ({
    page,
  }) => {
    const result = await page.evaluate(
      async (record) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        const write = await api?.writeRecord({ ...record, category: 'not-a-category' });
        const stored = await api?.listAllRecords();
        return { ok: write?.ok, count: stored?.length };
      },
      anObservation(1, 45),
    );

    expect(result.ok).toBe(false);
    expect(result.count).toBe(0);
  });

  /** Gate requirement: canonical data survives reload. */
  test('canonical records survive a full page reload', async ({ page }) => {
    await page.evaluate(
      async (record) => {
        await globalThis.__lifeCommandOsDiagnostics?.writeRecord(record);
      },
      anObservation(1, 45),
    );

    await page.reload();
    await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);

    const survived = await page.evaluate(async () => {
      const records = await globalThis.__lifeCommandOsDiagnostics?.listAllRecords();
      return records?.map((record) => (record as { recordId: string }).recordId);
    });

    expect(survived).toEqual([fixtureId(1)]);
  });

  /** Gate requirement: corrections preserve history. */
  test('a correction supersedes without destroying the original, across a reload', async ({
    page,
  }) => {
    await page.evaluate(
      async ([observation, correction]) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(observation);
        await api?.writeRecord(correction);
      },
      [anObservation(1, 45), aCorrection(2, 1, 30)] as const,
    );

    await page.reload();
    await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);

    const state = await page.evaluate(async () => {
      const api = globalThis.__lifeCommandOsDiagnostics;
      const all = await api?.listAllRecords();
      const current = await api?.listCurrentRecords();
      const chain = await api?.readSupersessionChain('00000000-0000-4000-8000-000000000002');
      return {
        allCount: all?.length,
        currentIds: current?.map((r) => (r as { recordId: string }).recordId),
        chainIds: chain?.map((r) => (r as { recordId: string }).recordId),
      };
    });

    expect(state.allCount).toBe(2);
    expect(state.currentIds).toEqual([fixtureId(2)]);
    expect(state.chainIds).toEqual([fixtureId(2), fixtureId(1)]);
  });

  test('refuses to overwrite an existing record', async ({ page }) => {
    const result = await page.evaluate(
      async (record) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(record);
        const second = await api?.writeRecord({ ...record, attribute: 'tampered' });
        const stored = await api?.listAllRecords();
        return {
          secondOk: second?.ok,
          count: stored?.length,
          attribute: (stored?.[0] as { attribute: string } | undefined)?.attribute,
        };
      },
      anObservation(1, 45),
    );

    expect(result.secondOk).toBe(false);
    expect(result.count).toBe(1);
    expect(result.attribute).toBe('available-minutes');
  });

  /**
   * Gate requirement: canonical data survives an encrypted round trip and a reload.
   *
   * The browser is where this has to be proved. `crypto.subtle` exists under Node too,
   * but the thing at risk is the combination — Web Crypto, IndexedDB, and a real page
   * lifecycle — and only one of those can be shimmed convincingly.
   */
  test('encrypts, restores, and survives a real reload', async ({ page }) => {
    const passphrase = 'seventeen candles beside the river';

    const backup = await page.evaluate(
      async ([[observation, correction], secret]) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(observation);
        await api?.writeRecord(correction);
        const result = await api?.createEncryptedBackup(secret);
        return result?.ok === true ? result.file : undefined;
      },
      [[anObservation(1, 45), aCorrection(2, 1, 30)], passphrase] as const,
    );

    expect(backup).toBeTruthy();
    // Encrypted on the way out: nothing legible about the records is in the file.
    expect(backup).toContain('"format": "life-command-os.backup"');
    expect(backup).not.toContain('available-minutes');
    expect(JSON.parse(backup ?? '{}')).toMatchObject({
      encrypted: true,
      approximateRecordCount: 2,
    });

    await clearDatabase(page);
    await page.reload();
    await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);

    const restored = await page.evaluate(
      async ([raw, secret]) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        const emptyCount = (await api?.listAllRecords())?.length;
        const result = await api?.applyRestore(raw, secret);
        const after = await api?.listAllRecords();
        return { emptyCount, ok: result?.ok, afterCount: after?.length };
      },
      [backup ?? '', passphrase] as const,
    );

    expect(restored.emptyCount).toBe(0);
    expect(restored.ok).toBe(true);
    expect(restored.afterCount).toBe(2);

    // And it is still there after another reload.
    await page.reload();
    await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
    const persisted = await page.evaluate(
      async () => (await globalThis.__lifeCommandOsDiagnostics?.listAllRecords())?.length,
    );
    expect(persisted).toBe(2);
  });

  test('a damaged backup is rejected without touching canonical state', async ({ page }) => {
    const result = await page.evaluate(
      async (record) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(record);
        const attempt = await api?.applyRestore('{ not json', 'seventeen candles');
        const after = await api?.listAllRecords();
        return { ok: attempt?.ok, count: after?.length };
      },
      anObservation(1, 45),
    );

    expect(result.ok).toBe(false);
    expect(result.count).toBe(1);
  });

  test('the wrong passphrase changes nothing', async ({ page }) => {
    const passphrase = 'seventeen candles beside the river';
    const result = await page.evaluate(
      async ([record, secret]) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(record);
        const backup = await api?.createEncryptedBackup(secret);
        const file = backup?.ok === true ? backup.file : '';
        const attempt = await api?.applyRestore(file, 'a completely different phrase');
        const after = await api?.listAllRecords();
        return {
          ok: attempt?.ok,
          rolledBack: attempt?.ok === false ? attempt.rolledBack : undefined,
          count: after?.length,
        };
      },
      [anObservation(1, 45), passphrase] as const,
    );

    expect(result.ok).toBe(false);
    // Nothing was opened, so nothing needed rolling back.
    expect(result.rolledBack).toBe(false);
    expect(result.count).toBe(1);
  });

  /** Gate requirement: projections can be deleted and rebuilt. */
  test('projections rebuild identically after being dropped', async ({ page }) => {
    const result = await page.evaluate(
      async (record) => {
        const api = globalThis.__lifeCommandOsDiagnostics;
        await api?.writeRecord(record);
        await api?.rebuildAllProjections();
        const before = await api?.getProjection('category-freshness');
        await api?.dropAllProjections();
        const after = await api?.getProjection('category-freshness');
        return { before: JSON.stringify(before), after: JSON.stringify(after) };
      },
      anObservation(1, 45),
    );

    expect(result.after).toBe(result.before);
    // A category with no evidence must not be reported as zero or as the epoch.
    expect(result.after).toContain('"status":"unknown"');
    expect(result.after).not.toContain('1970');
  });
});
