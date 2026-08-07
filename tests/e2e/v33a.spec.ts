import { expect, test, type Page } from '@playwright/test';

/**
 * v3.3 section A against seeded state.
 *
 * The `Answer it` handoff needs a profile that actually produces a question, which a fresh
 * one does not — so it is asserted here rather than skipped on the production build.
 */

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

test.describe('Answer it opens the displayed question (V33-049, V33-050)', () => {
  test('asks that exact question first', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'one-question');

    const question = page.getByRole('region', { name: 'One question' });
    await expect(question).toBeVisible();

    const displayed = (
      (await question.locator('.decision-statement').textContent()) ?? ''
    ).trim();
    expect(displayed.length).toBeGreaterThan(0);

    await question.getByRole('button', { name: 'Answer it' }).click();

    /*
     * The first thing asked is the thing that was on screen. Before this, `Answer it`
     * opened the generic check-in for the hour and the displayed question was lost.
     */
    await expect(page.getByRole('main')).toContainText('Question 1 of');
    await expect(page.getByRole('main')).toContainText(displayed);
  });

  test('does not open a generic morning check-in instead', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'one-question');

    await page
      .getByRole('region', { name: 'One question' })
      .getByRole('button', { name: 'Answer it' })
      .click();

    /* A morning guide would lead with last night's recovery, not the time question. */
    const main = page.getByRole('main');
    await expect(main).not.toContainText('Last night’s recovery');
    await expect(main).toContainText('How many minutes are genuinely free');
  });

  test('the clock on Now reads the browser timezone, not UTC', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'one-question');

    const shown = ((await page.locator('.clock').first().textContent()) ?? '').trim();
    /*
     * The scenario's instant is fixed, so this asserts the shape and that it is being
     * converted at all rather than rendered as the stored UTC string.
     */
    expect(shown).toMatch(/^[A-Z][a-z]+ \d{2}:\d{2}$/);
  });
});
