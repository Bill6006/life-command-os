import { expect, test, type Page } from '@playwright/test';

/**
 * Opens the Manage areas drawer (`V33-016`, v3.3 B7).
 *
 * The panel leads with a count and keeps its switches behind a disclosure, because
 * management is rare and deliberate while Direction's job is showing what is going on.
 * Anything reaching for a switch opens it first, exactly as the owner does.
 */
async function openAreaDrawer(page: Page): Promise<void> {
  const drawer = page
    .getByRole('region', { name: 'Manage areas' })
    .locator('details.areas-drawer');
  if ((await drawer.count()) === 0) return;
  if (await drawer.evaluate((node: HTMLDetailsElement) => node.open)) return;
  await drawer.locator('summary').click();
}

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
    // No domain panel, and nothing that only makes sense once one is on.
    await expect(page.getByRole('region', { name: 'Areas of life' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Career and learning' })).toHaveCount(0);
    await expect(main).not.toContainText('Look at one area');
    // The control that would switch one on is there, and it is the only mention.
    await expect(page.getByRole('region', { name: 'Manage areas' })).toBeVisible();
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
    /* Renamed with the compact card: the summary says what is in the way (B6). */
    await expect(panel).toContainText('In the way');
    // Every panel on screen has a working way to update its area. That is a guarantee
    // now rather than a flag: a panel exists only for an area the owner could switch
    // on, and switching on requires the questions to exist.
    await expect(panel.getByRole('button', { name: 'Update this area' })).toHaveCount(1);

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

    const panel = page.getByRole('region', { name: 'Health, recovery, and energy' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Deprioritised/);
    await expect(panel).toContainText(/deliberately silent/);
    await expect(panel).toContainText(/Nothing has been deleted/);
    // Silent means no move, ever.
    await expect(panel).not.toContainText('Optional move');
  });

  test('an area that is off has no panel, only a row in Manage areas', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    // Every area is named in Manage areas — built or not.
    const manage = page.getByRole('region', { name: 'Manage areas' });
    await expect(manage).toContainText('Fatherhood and child development');
    await expect(manage).toContainText('Faith and meaning');

    /*
     * None of them has a panel here. Matched exactly, because a switched-off *domain*
     * and its *category* overview are different things with similar names: the
     * fatherhood category is active and shows its shared summary, while the domain
     * panel appears only once the owner switches the area on.
     */
    for (const label of [
      'Fatherhood and child development',
      'Faith and meaning',
      'Home and environment',
    ]) {
      await expect(page.getByRole('region', { name: label, exact: true })).toHaveCount(0);
    }
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

  test('the control reports the state each area is actually in', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const manage = page.getByRole('region', { name: 'Manage areas' });
    await openAreaDrawer(page);
    // Career is enabled and health is deprioritised in this scenario — both are on,
    // so both offer to switch off rather than on.
    for (const label of ['career and learning', 'health, recovery, and energy']) {
      const button = manage.getByRole('button', { name: `Switch off ${label}` });
      await expect(button).toHaveCount(1);
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }
  });

  test('switching an area off from the control removes its panel', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    await expect(page.getByRole('region', { name: 'Career and learning' })).toBeVisible();
    await openAreaDrawer(page);
    await page
      .getByRole('region', { name: 'Manage areas' })
      .getByRole('button', { name: 'Switch off career and learning' })
      .click();

    await expect(page.getByRole('region', { name: 'Career and learning' })).toHaveCount(0);

    // The records it was reading are all still in storage.
    const kept = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return {
        goals: records.filter((record) => record.recordType === 'goal').length,
        preferences: records.filter((record) => record.recordType === 'domain-preference')
          .length,
      };
    });
    expect(kept.goals).toBeGreaterThan(0);
    // Two decisions from the scenario, and the one just made. None replaced in place.
    expect(kept.preferences).toBe(3);
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
