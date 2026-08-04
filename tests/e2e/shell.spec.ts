import { expect, test, type Page } from '@playwright/test';

/**
 * Platform evidence — carried forward from Phase 1 and kept green.
 *
 * These prove the things that have nothing to do with which design was selected:
 * the base path, the manifest, offline startup, and the secure context IndexedDB
 * needs. Phase 3's own gate evidence lives in `console-shell.spec.ts`.
 */

/**
 * Puts a known corpus in local storage and reloads.
 *
 * From Phase 6 the app reads what is stored rather than a chosen scenario, so a test
 * that wants a decision on screen has to write the records that produce one.
 */
async function seed(page: Page, scenario = 'action'): Promise<void> {
  // The bridge is loaded by a dynamic import, so it may not exist on first paint.
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
  const issues = await page.evaluate(async (scenarioId) => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    await bridge.resetLocalData();
    return (await bridge.seedScenario(scenarioId)).issues;
  }, scenario);
  expect(issues).toEqual([]);
  await page.reload();
  await expect(page.locator('.grid, .standalone')).toBeVisible();
}

test.describe('application shell', () => {
  test('renders under the repository base path', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { name: 'Now', level: 1 })).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  });

  test('loads every asset without a console or network error', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    page.on('requestfailed', (request) => {
      problems.push(`request failed: ${request.url()}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) {
        problems.push(`http ${String(response.status())}: ${response.url()}`);
      }
    });

    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('keeps build metadata quiet, under Data & Privacy', async ({ page }) => {
    await page.goto('./');

    // UX-011: build metadata must not occupy the opening surface.
    await expect(page.getByRole('main')).not.toContainText('Plan version');

    // Behind More on a phone, directly on the rail on desktop.
    const direct = page
      .getByRole('button', { name: 'Data & Privacy', exact: true })
      .filter({ visible: true });
    if ((await direct.count()) === 0) {
      await page.getByRole('button', { name: 'More', exact: true }).click();
    }
    await page
      .getByRole('button', { name: 'Data & Privacy', exact: true })
      .filter({ visible: true })
      .first()
      .click();

    // OPS-002: the four fields needed to verify a deployed preview.
    const main = page.getByRole('main');
    await expect(main).toContainText('Plan version');
    await expect(main).toContainText('3.0 Final');
    await expect(main).toContainText('Phase 7');
    await expect(main).toContainText('Built');
  });
});

test.describe('installability and offline startup', () => {
  test('serves a valid manifest scoped to the repository base path', async ({
    page,
    request,
  }) => {
    await page.goto('./');

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();

    const response = await request.get(new URL(href ?? '', page.url()).toString());
    expect(response.ok()).toBe(true);

    const manifest = (await response.json()) as {
      name: string;
      start_url: string;
      scope: string;
      icons: { src: string; sizes: string }[];
    };

    expect(manifest.name).toBe('Life Command OS');
    expect(manifest.start_url).toContain('/life-command-os/');
    expect(manifest.scope).toContain('/life-command-os/');
    expect(manifest.icons.map((icon) => icon.sizes)).toContain('512x512');

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(new URL(icon.src, response.url()).toString());
      expect(iconResponse.ok(), `icon missing: ${icon.src}`).toBe(true);
    }
  });

  test('starts from the cached build with the network offline', async ({ page, context }) => {
    await page.goto('./');
    await seed(page);

    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 30_000,
    });

    await context.setOffline(true);
    try {
      await page.reload();

      await expect(page.getByRole('heading', { name: 'Now', level: 1 })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();

      // Styles came from the precache too, not just the HTML shell.
      const styled = await page
        .locator('body')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(styled).toBe('rgb(7, 17, 31)');

      // Offline changes nothing about the answer, which is the point. The engine
      // computed this on-device, so there is nothing for a network to affect.
      await expect(page.getByRole('main')).toContainText('Best move');
      await expect(page.getByRole('main')).toContainText('Goal One');
    } finally {
      await context.setOffline(false);
    }
  });

  /**
   * Split from the cold-start test deliberately. Emulated offline does not reliably
   * flip `navigator.onLine` for a document that loads *while already* offline, so
   * folding both into one test would make a real assertion depend on an emulation
   * detail. Going offline on a live page is the case the banner actually serves.
   */
  test('surfaces offline as actionable status when the connection drops', async ({
    page,
    context,
  }) => {
    await page.goto('./');
    await seed(page);
    await expect(page.locator('.banner')).toHaveCount(0);

    await context.setOffline(true);
    try {
      await expect(page.locator('.banner')).toContainText('Offline');
      // Still a banner, never one of the five panels (ADR-0008 rule 2).
      expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    } finally {
      await context.setOffline(false);
    }

    await expect(page.locator('.banner')).toHaveCount(0);
  });
});

test.describe('storage foundation', () => {
  test('provides a secure context with usable IndexedDB from the Pages origin', async ({
    page,
  }) => {
    await page.goto('./');

    const environment = await page.evaluate(() => ({
      secure: window.isSecureContext,
      available: typeof indexedDB !== 'undefined',
    }));
    expect(environment).toEqual({ secure: true, available: true });

    const roundTrip = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('phase1-precondition-probe', 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore('probe', { keyPath: 'key' });
        };
        request.onsuccess = () => {
          resolve(request.result);
        };
        request.onerror = () => {
          reject(new Error('open failed'));
        };
      });

      const value = await new Promise<unknown>((resolve, reject) => {
        const tx = database.transaction('probe', 'readwrite');
        tx.objectStore('probe').put({ key: 'k', value: 'synthetic' });
        tx.oncomplete = () => {
          const read = database.transaction('probe', 'readonly').objectStore('probe').get('k');
          read.onsuccess = () => {
            resolve(read.result);
          };
          read.onerror = () => {
            reject(new Error('read failed'));
          };
        };
        tx.onerror = () => {
          reject(new Error('write failed'));
        };
      });

      database.close();
      indexedDB.deleteDatabase('phase1-precondition-probe');
      return value;
    });

    expect(roundTrip).toEqual({ key: 'k', value: 'synthetic' });
  });
});
