import { expect, test } from '@playwright/test';

/**
 * Phase 1 gate evidence.
 *
 * Proves: the shell renders and navigates; assets, manifest, and service worker
 * resolve under the repository base path; the application starts offline from the
 * cached build; IndexedDB opens in a real browser; and no life-domain feature or
 * intelligence has leaked into the foundation.
 */

test.describe('application shell', () => {
  test('renders the shell under the repository base path', async ({ page }) => {
    await page.goto('./');

    await expect(
      page.getByRole('heading', { name: 'Life Command OS', level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();
  });

  test('navigates between views and marks the current one', async ({ page }) => {
    await page.goto('./');

    const foundation = page.getByRole('button', { name: 'Foundation' });
    const about = page.getByRole('button', { name: 'About' });

    await expect(foundation).toHaveAttribute('aria-current', 'page');
    await expect(about).not.toHaveAttribute('aria-current', 'page');

    await about.click();

    await expect(page.getByRole('heading', { name: 'Build', level: 2 })).toBeVisible();
    await expect(about).toHaveAttribute('aria-current', 'page');
  });

  test('shows build metadata under About, not on the primary surface', async ({ page }) => {
    await page.goto('./');

    // UX-011: build metadata is quiet. It must not occupy the opening surface.
    // `exact` matters: without it, "Build" also matches the region labelled
    // "What this build actually proves".
    const build = page.getByRole('region', { name: 'Build', exact: true });
    await expect(build).toBeHidden();

    await page.getByRole('button', { name: 'About' }).click();
    await expect(build).toBeVisible();

    // OPS-002: the four fields the owner needs to verify a deployed preview.
    await expect(build.getByText('Plan version')).toBeVisible();
    await expect(build.getByText('2.6 Lean Execution')).toBeVisible();
    await expect(build.getByText('Phase 1', { exact: true })).toBeVisible();
    await expect(build.getByText('Built')).toBeVisible();
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

  test('exposes no life-domain feature or intelligence yet', async ({ page }) => {
    await page.goto('./');
    const body = (await page.locator('body').textContent()) ?? '';

    // Prohibited constructs, none of which may ever reach the primary surface
    // (UX-009, UX-011). The shell is allowed to *say* it has no recommendation —
    // what it may not do is present one the structured engine did not produce,
    // because there is no engine yet.
    expect(body).not.toMatch(/life score/i);
    expect(body).not.toMatch(/streak/i);
    expect(body).not.toMatch(/all systems operational/i);

    // No decision affordance exists: the only controls are the two nav buttons.
    const buttons = await page.getByRole('button').allTextContents();
    expect(buttons).toEqual(['Foundation', 'About']);

    // No score rings, gauges, meters, or progress indicators.
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
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

    // Every declared icon must actually exist, or installation silently degrades.
    for (const icon of manifest.icons) {
      const iconResponse = await request.get(new URL(icon.src, response.url()).toString());
      expect(iconResponse.ok(), `icon missing: ${icon.src}`).toBe(true);
    }
  });

  test('starts from the cached build with the network offline', async ({ page, context }) => {
    await page.goto('./');

    // Wait for the service worker to control the page, otherwise the reload below
    // would test nothing.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 30_000,
    });

    await context.setOffline(true);
    try {
      await page.reload();

      // The gate requirement: a full cold start with no network at all.
      await expect(
        page.getByRole('heading', { name: 'Life Command OS', level: 1 }),
      ).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Sections' })).toBeVisible();

      // Styles and script both came from the precache, not just the HTML shell.
      const styled = await page
        .locator('body')
        .evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(styled).toBe('rgb(7, 17, 31)');
    } finally {
      await context.setOffline(false);
    }
  });

  test('surfaces offline as actionable status, and stays quiet otherwise', async ({
    page,
    context,
  }) => {
    await page.goto('./');

    // UX-011 / master plan §34.4: a normal operational state consumes no panel.
    // There is deliberately no "all systems operational" counterpart to this.
    await expect(page.getByRole('status')).toBeEmpty();

    await context.setOffline(true);
    try {
      await expect(page.getByRole('status')).toContainText('Offline');
    } finally {
      await context.setOffline(false);
    }

    await expect(page.getByRole('status')).toBeEmpty();
  });
});

test.describe('storage foundation', () => {
  /**
   * Scope note, deliberately narrow: this proves the *platform preconditions* the
   * canonical store depends on. It does not exercise src/infrastructure/database,
   * which the shell has no reason to open in Phase 1 — there is nothing to store.
   * Browser-backed persistence of canonical records is Phase 2 gate evidence.
   */
  test('provides a secure context with usable IndexedDB from the Pages origin', async ({
    page,
  }) => {
    await page.goto('./');

    const environment = await page.evaluate(() => ({
      secure: window.isSecureContext,
      available: typeof indexedDB !== 'undefined',
    }));

    // IndexedDB durability guarantees are weaker outside a secure context, and the
    // service worker would not register at all.
    expect(environment).toEqual({ secure: true, available: true });

    // A round trip through the real (non-shimmed) browser implementation.
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
