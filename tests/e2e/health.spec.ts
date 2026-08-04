import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 7 Prompt 8B gate evidence: Health, recovery, and energy, on screen.
 *
 * The interesting assertions are the absences. No percentage, no meter, no streak, no
 * sentence that interprets a symptom — and, when something has been in the way for
 * weeks, no health advice at all.
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

const healthPanel = (page: Page) =>
  page.getByRole('region', { name: 'Health, recovery, and energy' });

test.describe('the health panel', () => {
  test('shows the shared contract and a recovery chart, with no score anywhere', async ({
    page,
  }) => {
    await open(page, 'health-enabled');
    await goTo(page, 'Direction');

    const panel = healthPanel(page);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('What is my capacity today, and what protects it?');
    await expect(panel).toContainText('Trajectory:');
    await expect(panel).toContainText('Active bottleneck');
    await expect(panel).toContainText('Physical energy');
    await expect(panel).toContainText('Mental energy');

    // The recovery chart states its own missing-data rule.
    await expect(panel).toContainText('Is recovery holding up, or slipping?');
    await expect(panel).toContainText('never plotted as a bad night');

    // No percentage, no meter, no progress bar — anywhere on the surface.
    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text.toLowerCase()).not.toMatch(/health score|recovery score|readiness index/);
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('records why a meter was refused rather than just omitting one', async ({ page }) => {
    await open(page, 'health-enabled');
    await goTo(page, 'Direction');

    await expect(healthPanel(page)).toContainText('No meter is shown here');
    await expect(healthPanel(page)).toContainText('invented precision');
  });

  test('never grades the person, in any state', async ({ page }) => {
    for (const scenario of ['health-enabled', 'health-constrained', 'health-stale']) {
      await open(page, scenario);
      await goTo(page, 'Direction');
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, scenario).not.toMatch(
        /lazy|neglect|poor self|should have|discipline|failed/,
      );
      expect(text, scenario).not.toMatch(/streak|days in a row|keep it up/);
    }
  });
});

test.describe('the safety boundary, on screen', () => {
  test('defers to a person after weeks, and diagnoses nothing', async ({ page }) => {
    await open(page, 'health-persistent');
    await goTo(page, 'Direction');

    const panel = healthPanel(page);
    await expect(panel).toContainText('Worth raising with someone qualified');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    // Not one word of interpretation about what it might be.
    for (const forbidden of [
      'diagnos',
      'treat',
      'medication',
      'dose',
      'supplement',
      'could be',
      'sounds like',
      'symptom of',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  test('proposes only stopping while something is significantly in the way', async ({
    page,
  }) => {
    await open(page, 'health-constrained');
    await goTo(page, 'Direction');

    const panel = healthPanel(page);
    await expect(panel).toContainText('Stop for ten minutes away from a screen');
    await expect(panel).toContainText(/answer on Now still comes first/);
  });
});

test.describe('Update This Area', () => {
  test('asks only health questions, and never lengthens the morning', async ({ page }) => {
    await open(page, 'health-enabled');
    await goTo(page, 'Direction');

    await healthPanel(page).getByRole('button', { name: 'Update this area' }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText('Update this area');
    await expect(main).toContainText('Is anything physical getting in the way right now?');

    // Walk it and confirm nothing from the daily check-in appears.
    for (let step = 0; step < 8; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toContain('How many minutes are genuinely free');
      expect(text).not.toContain('Energy right now');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });

  test('the morning check-in is unchanged by health being switched on', async ({ page }) => {
    await open(page, 'health-enabled');

    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();
    const main = page.getByRole('main');

    for (let step = 0; step < 6; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toMatch(/Is anything physical getting in the way/);
      expect(text).not.toMatch(/Have you had much to drink/);
      expect(text).not.toMatch(/Physical energy right now/);
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });
});

test.describe('health never crowds the decision surface', () => {
  test('Now stays compact and mentions no domain', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'health-constrained');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const first = await page.locator('.grid > .panel').first().getAttribute('class');
    expect(first).toMatch(/panel-(decision|quiet)/);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('areas of life');
    expect(text).not.toContain('optional move');
  });

  test('declining a health action records a constraint like any other', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'health-constrained');

    // Whatever won the comparison, Can't Now behaves identically.
    await page.getByRole('button', { name: 'Can’t now', exact: true }).click();
    await expect(page.getByRole('main')).toContainText('What is in the way?');
    await page.getByRole('button', { name: 'Not enough time' }).click();
    await expect(page.locator('.guide-bar')).toBeVisible();

    const types = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      return (await bridge.listAllRecords()).map((record) => record.recordType);
    });
    expect(types).toContain('execution');
    expect(types).toContain('context-snapshot');
  });

  test('no horizontal overflow with the health panel on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'health-enabled');
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
