import { expect, test, type Page } from '@playwright/test';

/**
 * Fresh-profile recovery, on the exact production build (Prompt 7B task 20).
 *
 * **This file uses no test bridge.** It cannot: the production bundle does not contain
 * one. Every record here is created by clicking through the interface, the backup is
 * made from the Data & Privacy screen, and the restore happens in a browser context
 * with no shared storage — a genuinely fresh profile, the way it would be on a new
 * phone or after clearing the browser.
 *
 * That is the difference between this file and the rest of the suite, and it is the
 * whole point. A recovery path proved through a test-only hook proves that the hook
 * works. This proves the thing the owner will actually do at two in the morning when
 * their phone is gone.
 */

const PASSPHRASE = 'seventeen candles beside the river';

async function open(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await expect(page.locator('.grid, .standalone')).toBeVisible();
}

async function goToDataPrivacy(page: Page): Promise<void> {
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
  await expect(page.getByRole('main')).toContainText('Private local use');
}

/** Creates a few records the only way an owner can: by using the app. */
async function enterSomeRecords(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Start a check-in' }).click();

  // Answer every question the guide offers, then save.
  for (let step = 0; step < 6; step += 1) {
    const scale = page.locator('.scale-step').first();
    if ((await scale.count()) > 0) await scale.click();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    if ((await next.count()) === 0) break;
    await next.click();
  }
  const save = page.getByRole('button', { name: 'Save and close' });
  if ((await save.count()) > 0) await save.click();
  await expect(page.locator('.guide-bar, .standalone')).toBeVisible();

  // And one Quick Capture, so a `note`-classified record exists too.
  const capture = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
  if ((await capture.count()) > 0) {
    await capture.click();
  } else {
    await page.getByRole('button', { name: 'Note something down' }).click();
  }
  await page.getByRole('button', { name: 'A win' }).click();
  await page.locator('#capture-what').fill('Finished the recovery drill');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.guide-bar')).toBeVisible();

  await goToDataPrivacy(page);
  const stored = await page
    .getByRole('region', { name: 'Storage' })
    .locator('.kv-row', { hasText: 'Records stored' })
    .locator('dd')
    .textContent();
  return Number(stored ?? '0');
}

test.describe('the production build carries no test bridge', () => {
  test('exposes no diagnostics hook and no scenario seeding', async ({ page }) => {
    await open(page);

    const exposed = await page.evaluate(() => ({
      bridge: typeof (globalThis as Record<string, unknown>)['__lifeCommandOsDiagnostics'],
      selectors: document.querySelectorAll('select').length,
      proto: document.querySelectorAll('.proto').length,
    }));

    expect(exposed).toEqual({ bridge: 'undefined', selectors: 0, proto: 0 });
  });

  test('ships no scenario text in the bundle at all', async () => {
    // A static audit of the artifact on disk. Not merely unreachable — absent: the
    // dynamic import folds to `if (false)`, and the diagnostics module and the whole
    // synthetic corpus go with it.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const assets = path.resolve('dist/assets');
    const files = (await fs.readdir(assets)).filter((name) => name.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);

    for (const name of files) {
      const body = await fs.readFile(path.join(assets, name), 'utf8');
      expect(body, name).not.toContain('__lifeCommandOsDiagnostics');
      expect(body, name).not.toContain('seedScenario');
      expect(body, name).not.toContain('resetLocalData');
      // A line of scenario prose. If the corpus were bundled, this would be in it.
      expect(body, name).not.toContain('A belief forms');
    }

    // And no separate chunk for it either.
    expect(files.some((name) => name.includes('diagnostics'))).toBe(false);
  });
});

test.describe('fresh-profile recovery', () => {
  test('a backup made here restores exactly onto a profile that has never seen it', async ({
    page,
    browser,
  }) => {
    /* --- 1. Create real records through the interface ---------------------- */
    await open(page);
    const originalCount = await enterSomeRecords(page);
    expect(originalCount).toBeGreaterThan(1);

    /* --- 2. Take an encrypted backup, exactly as the owner would ------------ */
    await page.getByLabel('passphrase (12+ characters)').fill(PASSPHRASE);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Create encrypted backup' }).click();
    const download = await downloadPromise;

    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import('node:fs/promises');
    const file = await fs.readFile(path, 'utf8');

    // The file on disk is genuinely encrypted: no record content in it anywhere.
    expect(file).toContain('"format": "life-command-os.backup"');
    expect(file).not.toContain('Finished the recovery drill');
    expect(file).not.toContain('anchored-scale');

    await expect(page.getByRole('main')).toContainText(/encrypted\. Open it once/i);

    /* --- 3. A genuinely fresh profile: new context, no shared storage ------- */
    const freshContext = await browser.newContext();
    const fresh = await freshContext.newPage();
    try {
      await fresh.goto(page.url());
      await expect(fresh.locator('.shell')).toBeVisible();

      // It really is empty — this is a new owner's first sight of the app.
      await expect(fresh.getByRole('main')).toContainText(
        /There is nothing here, and that is fine/i,
      );

      await goToDataPrivacy(fresh);

      /* --- 4. Restore, with a dry run first ------------------------------- */
      await fresh.getByLabel('backup file').setInputFiles({
        name: 'life-command-os-backup.json',
        mimeType: 'application/json',
        buffer: Buffer.from(file, 'utf8'),
      });

      // The file describes itself before any passphrase is entered.
      await expect(fresh.getByRole('main')).toContainText(/AES-GCM-256, PBKDF2-SHA-256/);
      await expect(fresh.getByRole('main')).toContainText(/600,000 iterations/);

      // A wrong passphrase changes nothing and says so.
      await fresh.getByLabel('passphrase', { exact: true }).fill('the wrong passphrase');
      await fresh.getByRole('button', { name: 'Check this backup' }).click();
      await expect(fresh.getByRole('main')).toContainText(/Nothing has been changed/);

      await fresh.getByLabel('passphrase', { exact: true }).fill(PASSPHRASE);
      await fresh.getByRole('button', { name: 'Check this backup' }).click();

      // The dry run reports what would happen, and nothing has happened yet.
      await expect(fresh.getByRole('main')).toContainText('Records in the backup');
      await expect(
        fresh.locator('.kv-row', { hasText: 'Would be added' }).locator('dd'),
      ).toHaveText(String(originalCount));

      await fresh.getByRole('button', { name: 'Restore', exact: true }).click();
      await expect(fresh.getByRole('main')).toContainText(
        /Restored \d+ records and verified them against storage/,
      );

      /* --- 5. The records are really there, after a real reload ----------- */
      await fresh.reload();
      await expect(fresh.locator('.shell')).toBeVisible();
      await goToDataPrivacy(fresh);
      await expect(
        fresh
          .getByRole('region', { name: 'Storage' })
          .locator('.kv-row', { hasText: 'Records stored' })
          .locator('dd'),
      ).toHaveText(String(originalCount));

      // Including the capture, which proves content survived rather than just counts.
      await fresh.getByRole('button', { name: 'Timeline', exact: true }).click();
      await expect(fresh.getByRole('main')).toContainText('Finished the recovery drill');
    } finally {
      await freshContext.close();
    }
  });

  test('a corrupted backup is refused on a fresh profile without touching anything', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const fresh = await context.newPage();
    try {
      await fresh.goto('./');
      await expect(fresh.locator('.shell')).toBeVisible();
      await goToDataPrivacy(fresh);

      await fresh.getByLabel('backup file').setInputFiles({
        name: 'damaged.json',
        mimeType: 'application/json',
        buffer: Buffer.from('{ this is not a backup', 'utf8'),
      });

      await expect(fresh.getByRole('main')).toContainText(/not a Life Command OS backup/i);

      await fresh.getByLabel('passphrase', { exact: true }).fill(PASSPHRASE);
      await fresh.getByRole('button', { name: 'Check this backup' }).click();
      await expect(fresh.getByRole('main')).toContainText(/Nothing has been changed/);

      // Restore stays unavailable — there is no plan to apply.
      await expect(fresh.getByRole('button', { name: 'Restore', exact: true })).toBeDisabled();
    } finally {
      await context.close();
    }
  });
});

test.describe('the export is never mistaken for a backup', () => {
  test('says what it is not, and withholds sensitive classes by default', async ({ page }) => {
    await open(page);
    await enterSomeRecords(page);

    await page.getByRole('button', { name: 'Preview export' }).click();
    const main = page.getByRole('main');

    await expect(main).toContainText('Readable export — not a backup');
    await expect(main).toContainText(/This is not a backup/);
    await expect(main).toContainText(/cannot\s+restore anything/);

    // The Quick Capture is classified `note`, so it is withheld until asked for.
    const preview = page.locator('.export-preview');
    await expect(preview).toBeVisible();
    await expect(preview).not.toContainText('Finished the recovery drill');
    await expect(main).toContainText(/Records withheld/);

    // Explicitly include it, and it appears.
    await page.getByRole('button', { name: 'note', exact: true }).click();
    await page.getByRole('button', { name: 'Preview export' }).click();
    await expect(page.locator('.export-preview')).toContainText('Finished the recovery drill');
  });
});

test.describe('accessibility of the recovery surface', () => {
  test('no horizontal overflow and no undersized target on a phone', async ({ page }) => {
    await open(page);
    await goToDataPrivacy(page);
    await page.getByRole('button', { name: 'Preview export' }).click();

    const problems = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const overflowing = [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => Math.round(el.getBoundingClientRect().right - limit) > 1)
        .map((el) => el.tagName.toLowerCase());
      const undersized = [
        ...document.querySelectorAll<HTMLElement>('.shell button, .shell input'),
      ]
        .map((el) => el.getBoundingClientRect())
        .filter((rect) => rect.height > 0 && (rect.height < 44 || rect.width < 44)).length;
      return {
        overflowing,
        undersized,
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(problems.overflowing).toEqual([]);
    expect(problems.undersized).toBe(0);
    expect(problems.documentOverflow).toBeLessThanOrEqual(0);
  });
});
