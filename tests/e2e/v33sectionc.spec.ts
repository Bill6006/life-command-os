import { expect, test, type Page } from '@playwright/test';

/**
 * Section C on the real surface — recording a direction (`AT33-010`, `AT33-011`).
 *
 * ## Why this exists
 *
 * The engine has read the North Star since Phase 4 and, until this pass, the owner had no
 * way to write one: Direction rendered "No North Star recorded yet." beside no control that
 * could change that. A unit test can prove the command works. Only a browser test can prove
 * a person can reach it.
 *
 * ## Written against a fresh profile on purpose
 *
 * This project has already shipped a white screen on the first button a new owner touches,
 * because every seeded test skipped past the empty state. Recording a direction *is* the
 * empty-state path, so these start with nothing and type.
 */

const PHONE = { width: 375, height: 812 };

async function openFresh(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();

  /* A genuinely empty profile — no scenario seeded. */
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
  await page.evaluate(async () => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    await bridge.resetLocalData();
  });
  await page.reload();
  await expect(page.locator('.shell')).toBeVisible();
}

async function goToDirection(page: Page): Promise<void> {
  const direct = page
    .getByRole('button', { name: 'Direction', exact: true })
    .filter({ visible: true });
  if ((await direct.count()) === 0) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
  }
  await page
    .getByRole('button', { name: 'Direction', exact: true })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'Your direction' })).toBeVisible();
}

/* -------------------------------------------------------------------------- */

test.describe('C · a fresh profile can record a direction', () => {
  test('AT33-010: offers compact controls without hunting through panels', async ({ page }) => {
    await openFresh(page);
    await goToDirection(page);

    const panel = page.getByRole('region', { name: 'Your direction' });
    await expect(panel.getByRole('button', { name: 'Set a North Star' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Add a goal' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Add a commitment' })).toBeVisible();

    /* Closed by default: a profile that already has one spends no height on the form. */
    await expect(panel.getByLabel('What is this all for?')).toHaveCount(0);
  });

  test('AT33-010: records a North Star and shows it back', async ({ page }) => {
    await openFresh(page);
    await goToDirection(page);

    const panel = page.getByRole('region', { name: 'Your direction' });
    await panel.getByRole('button', { name: 'Set a North Star' }).click();

    const field = panel.getByLabel('What is this all for?');
    await expect(field).toBeVisible();
    await field.fill('Be steady enough to be present');
    await panel.getByRole('button', { name: 'Save' }).click();

    /* Auto-retrying, because the write goes through storage and a recompute. */
    await expect(panel).toContainText('Be steady enough to be present');
    /* And the form closes rather than sitting open with stale text in it. */
    await expect(panel.getByLabel('What is this all for?')).toHaveCount(0);
  });

  test('AT33-011: a revision keeps the earlier version visible with its dates', async ({
    page,
  }) => {
    await openFresh(page);
    await goToDirection(page);

    const panel = page.getByRole('region', { name: 'Your direction' });

    await panel.getByRole('button', { name: 'Set a North Star' }).click();
    await panel.getByLabel('What is this all for?').fill('The first thing that mattered');
    await panel.getByRole('button', { name: 'Save' }).click();
    await expect(panel).toContainText('The first thing that mattered');

    /* Revising writes a new version rather than editing the old one. */
    await panel.getByRole('button', { name: 'Revise it' }).click();
    await panel.getByLabel('What is this all for?').fill('What matters now');
    await panel.getByRole('button', { name: 'Save' }).click();

    await expect(panel).toContainText('What matters now');

    /* The old one is still there, behind a disclosure, with the window it was in force. */
    const history = panel.getByText(/Earlier versions/);
    await expect(history).toBeVisible();
    await history.click();
    await expect(panel).toContainText('The first thing that mattered');
  });

  test('AT33-010: records a goal without a wizard', async ({ page }) => {
    await openFresh(page);
    await goToDirection(page);

    const panel = page.getByRole('region', { name: 'Your direction' });
    await panel.getByRole('button', { name: 'Add a goal' }).click();

    await panel.getByLabel('What are you working towards?').fill('Finish the write-up');
    await panel.getByRole('button', { name: 'Save' }).click();

    /*
     * It reaches the area's own list, which is the proof it was actually recorded.
     * `exact` matters: "Is anything actually moving" also contains the words North Star,
     * and a substring match resolved to two panels.
     */
    await expect(page.getByRole('region', { name: 'North Star', exact: true })).toContainText(
      'Finish the write-up',
    );
  });

  test('AT33-054: the direction controls meet the touch-target budget', async ({ page }) => {
    await openFresh(page);
    await goToDirection(page);

    const panel = page.getByRole('region', { name: 'Your direction' });
    await panel.getByRole('button', { name: 'Set a North Star' }).click();

    /*
     * Measured through the locator rather than a raw selector: `Panel` names itself with
     * `aria-labelledby`, so `[aria-label=...]` matches nothing and the check would have
     * silently passed on an empty list.
     */
    const controls = panel.locator('button, input, textarea, select');
    const undersized: string[] = [];
    for (let index = 0; index < (await controls.count()); index += 1) {
      const box = await controls.nth(index).boundingBox();
      if (box !== null && box.height < 44) {
        undersized.push(`${String(index)}:${String(Math.round(box.height))}`);
      }
    }
    expect(undersized).toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
