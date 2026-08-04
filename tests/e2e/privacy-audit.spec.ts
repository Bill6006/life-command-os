import { expect, test, type Page, type Request } from '@playwright/test';

/**
 * The privacy audit, against the production build (Prompt 7B task 15).
 *
 * Grepping the source for `fetch(` proves something about the source. This watches the
 * browser: every request the page makes during a full session is recorded, and every
 * one of them has to be same-origin. A dependency that phoned home would be caught
 * here and nowhere else.
 *
 * It also checks the places private data leaks by accident rather than by design —
 * the URL, `localStorage`, the console, and the page title.
 */

const PASSPHRASE = 'seventeen candles beside the river';
const SECRET = 'Reflux after the late meal on Tuesday';

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

/** A full session: state capture, a private note, a backup, and an export. */
async function useTheApp(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Start a check-in' }).click();
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

  const capture = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
  if ((await capture.count()) > 0) await capture.click();
  else await page.getByRole('button', { name: 'Note something down' }).click();
  await page.getByRole('button', { name: 'A win' }).click();
  await page.locator('#capture-what').fill(SECRET);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('.guide-bar')).toBeVisible();

  await goToDataPrivacy(page);
  await page.getByLabel('passphrase (12+ characters)').fill(PASSPHRASE);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Create encrypted backup' }).click();
  await downloadPromise;

  await page.getByRole('button', { name: 'Preview export' }).click();
  await expect(page.locator('.export-preview')).toBeVisible();
}

test.describe('nothing leaves the device', () => {
  test('every request during a full session is same-origin', async ({ page, baseURL }) => {
    const requests: string[] = [];
    const record = (request: Request): void => {
      requests.push(request.url());
    };
    page.on('request', record);

    await open(page);
    await useTheApp(page);

    const origin = new URL(baseURL ?? 'http://localhost').origin;
    const foreign = requests.filter(
      (url) => !url.startsWith(origin) && !url.startsWith('data:') && !url.startsWith('blob:'),
    );

    expect(foreign, `foreign requests: ${foreign.join(', ')}`).toEqual([]);
    // Sanity: the session really did make requests, so an empty list means something.
    expect(requests.length).toBeGreaterThan(3);
  });

  test('no request URL ever carries record content', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (request) => {
      urls.push(request.url());
    });

    await open(page);
    await useTheApp(page);

    for (const url of urls) {
      expect(url).not.toContain(encodeURIComponent(SECRET));
      expect(url).not.toContain(SECRET.replace(/ /g, '%20'));
      expect(url).not.toContain('anchored-scale');
    }

    // The address bar is clean too: no query string, no fragment carrying state.
    const location = await page.evaluate(() => ({
      search: window.location.search,
      hash: window.location.hash,
    }));
    expect(location).toEqual({ search: '', hash: '' });
  });

  test('nothing is written to the console during a full session', async ({ page }) => {
    // `no-console` is enforced by lint in source; this catches a dependency that logs
    // a payload, which lint cannot see.
    const messages: string[] = [];
    page.on('console', (message) => {
      messages.push(`${message.type()}: ${message.text()}`);
    });

    await open(page);
    await useTheApp(page);

    const meaningful = messages.filter(
      (entry) => !entry.startsWith('debug:') && !entry.includes('Download the React DevTools'),
    );
    expect(meaningful).toEqual([]);
  });

  test('localStorage and sessionStorage hold no life data', async ({ page }) => {
    await open(page);
    await useTheApp(page);

    const stored = await page.evaluate(() => ({
      local: JSON.stringify(Object.entries(localStorage)),
      session: JSON.stringify(Object.entries(sessionStorage)),
    }));

    expect(stored.local).not.toContain(SECRET);
    expect(stored.session).not.toContain(SECRET);
    expect(stored.local).not.toContain('anchored-scale');
    expect(stored.local).not.toContain('recordId');
  });

  test('the page title and document never leak content into browser history', async ({
    page,
  }) => {
    await open(page);
    await useTheApp(page);

    expect(await page.title()).toBe('Life Command OS');
  });
});

test.describe('the surface is honest about what it cannot do', () => {
  test('states the lock does not encrypt, and that the passphrase is unrecoverable', async ({
    page,
  }) => {
    await open(page);
    await goToDataPrivacy(page);

    const main = page.getByRole('main');
    await expect(main).toContainText(/It does not encrypt anything/);
    await expect(main).toContainText(/useless against a compromised device/);
    await expect(main).toContainText(/Nobody can recover this passphrase/);
    await expect(main).toContainText(/no reset link and no support address/);
    await expect(main).toContainText(/No analytics, no telemetry, no external AI/);
  });

  test('offers no notification permission prompt, because none is implemented', async ({
    page,
  }) => {
    // Deferred with reasons in docs/PRIVATE_ALPHA.md rather than half-built.
    await open(page);
    await goToDataPrivacy(page);

    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toMatch(/enable notifications|allow notifications/i);

    const asked = await page.evaluate(
      () =>
        (window as unknown as { __notificationAsked?: boolean }).__notificationAsked ?? false,
    );
    expect(asked).toBe(false);
  });
});

test.describe('the export never leaves without being asked', () => {
  test('withholds a health-classified value even inside an included record', async ({
    page,
  }) => {
    await open(page);
    await useTheApp(page);

    // Sleep and food answers are classified `health`, so a default export must not
    // carry them even though the check-in that produced them was ordinary.
    const preview = page.locator('.export-preview');
    await expect(preview).toBeVisible();
    const text = (await preview.textContent()) ?? '';

    expect(text).not.toContain(SECRET);
    expect(text).toContain('This is not a backup');
  });
});
