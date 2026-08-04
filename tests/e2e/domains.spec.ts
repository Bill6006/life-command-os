import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 7 Prompt 8A gate evidence: the shared domain framework, on screen.
 *
 * The gate is mostly about what must *not* appear. Now stays compact, no score wall
 * turns up on Direction, and a switched-on area cannot quietly promote its own move
 * above the single answer. Those failures are gradual — nobody decides to build a
 * score wall, it accretes — so they are checked mechanically.
 */

const PHONE = { width: 375, height: 812 };

async function seed(page: Page, scenario: string): Promise<void> {
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
  const issues = await page.evaluate(async (scenarioId) => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    await bridge.resetLocalData();
    return (await bridge.seedScenario(scenarioId)).issues;
  }, scenario);
  expect(issues, `seeding ${scenario}`).toEqual([]);
  await page.reload();
  await expect(page.locator('.grid, .standalone')).toBeVisible();
}

async function open(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
}

async function goTo(page: Page, destination: string): Promise<void> {
  const direct = page
    .getByRole('button', { name: destination, exact: true })
    .filter({ visible: true });
  if ((await direct.count()) === 0) {
    await page.getByRole('button', { name: 'More', exact: true }).click();
  }
  await page
    .getByRole('button', { name: destination, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}

test.describe('a switched-off framework changes nothing', () => {
  test('Direction shows no domain panel while every area is off', async ({ page }) => {
    await open(page, 'action');
    await goTo(page, 'Direction');

    const main = page.getByRole('main');
    await expect(main).not.toContainText('Areas of life');
    await expect(main).not.toContainText('Look at one area');
    // The category overview is untouched.
    await expect(main).toContainText('Career, work & learning');
  });
});

test.describe('one area switched on', () => {
  test('Now is exactly as compact as it was', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'domain-enabled');

    // ADR-0008 rule 2 still holds, and the decision still leads.
    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const first = await page.locator('.grid > .panel').first().getAttribute('class');
    expect(first).toMatch(/panel-(decision|quiet)/);

    // Nothing about a domain reaches Now at all.
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('areas of life');
    expect(text).not.toContain('optional move');
  });

  test('shows the full panel contract, and no score anywhere', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const panel = page.getByRole('region', { name: 'Career and learning' });
    await expect(panel).toBeVisible();

    await expect(panel).toContainText('What is the exact next step, and what is blocking it?');
    await expect(panel).toContainText('Trajectory:');
    await expect(panel).toContainText('Active bottleneck');
    // Career has no slice yet, so it is readable and not updatable — and says so
    // rather than offering a button that would open an empty guide.
    await expect(panel).toContainText('can be read but not yet updated');
    await expect(panel.getByRole('button', { name: 'Update this area' })).toHaveCount(0);

    // No score wall (`OWN-010`, gate). No percentage, no x/100, no meters.
    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text.toLowerCase()).not.toMatch(/life score|overall score|domain score/);
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('a deprioritised area is readable and says it is silent', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const panel = page.getByRole('region', { name: 'Money' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Deprioritised/);
    await expect(panel).toContainText(/deliberately silent/);
    await expect(panel).toContainText(/Nothing has been deleted/);
    // Silent means no move, ever.
    await expect(panel).not.toContainText('Optional move');
  });

  test('an area that is off does not appear at all', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const main = page.getByRole('main');
    // Five of the seven were never switched on.
    await expect(main).not.toContainText('Fatherhood');
    await expect(main).not.toContainText('Faith and meaning');
    await expect(main).not.toContainText('Home and environment');
  });

  test('manual focus is labelled as the owner’s choice', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const focus = page.getByRole('region', { name: 'Look at one area' });
    await expect(focus).toBeVisible();
    await expect(focus).toContainText(/Your choice, not a change of priority/);
    await expect(focus).toContainText(/The answer on Now stays exactly where it is/);

    // Only enabled areas can be focused. Deprioritised is silent here too.
    const buttons = await focus.getByRole('button').allTextContents();
    expect(buttons).toEqual(['Career and learning']);

    await focus.getByRole('button', { name: 'Career and learning' }).click();
    await expect(focus).toContainText(/an answer, not an empty screen/);
  });

  test('no horizontal overflow with a domain panel on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .map((el) => ({
          selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
          pastBy: Math.round(
            el.getBoundingClientRect().right - document.documentElement.clientWidth,
          ),
        }))
        .filter((entry) => entry.pastBy > 1),
    );
    expect(offenders).toEqual([]);
  });
});
