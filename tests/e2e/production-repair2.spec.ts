import { expect, test, type Page } from '@playwright/test';

/**
 * The fresh-profile entry path, on the shipped build.
 *
 * This file exists because of a crash that 638 passing browser tests did not see. The
 * first-run panel is the one surface only a profile with zero records ever reaches, and
 * every seeded spec skips past it by definition. Its primary button handed React's click
 * event to a handler that had just gained an optional parameter, so the event arrived as a
 * prompt id, `promptById` threw, and the app rendered nothing at all — a white screen on
 * the very first thing a new owner touches.
 *
 * The type signature now makes that specific handoff a compile error. This watches the
 * behaviour anyway: no uncaught error, and a working guide, from a profile that has never
 * stored anything.
 */

/** Fails the test on the first uncaught error, wherever in the run it happens. */
function watchForCrashes(page: Page): { readonly errors: readonly string[] } {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { errors };
}

test.describe('a profile that has never stored anything', () => {
  test('opens a check-in from the first-run panel without crashing', async ({ page }) => {
    const crashes = watchForCrashes(page);

    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();

    /* The first-run panel, which only a profile with no records ever sees. */
    const start = page.getByRole('button', { name: 'Start a check-in' });
    await expect(start).toBeVisible();
    await start.click();

    /* A real question, not a blank document. */
    await expect(page.getByRole('main')).toContainText('Question 1 of');
    expect(crashes.errors).toEqual([]);
  });

  test('completes that check-in and returns to a rendered Now', async ({ page }) => {
    const crashes = watchForCrashes(page);

    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await page.getByRole('button', { name: 'Start a check-in' }).click();

    for (let step = 0; step < 12; step += 1) {
      const scale = page.locator('.scale-step').first();
      if ((await scale.count()) > 0) await scale.click();
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
    await page.getByRole('button', { name: 'Save and close' }).click();

    /* Back on Now, with the console rendered rather than an empty body. */
    await expect(page.locator('.guide-bar, .standalone')).toBeVisible();
    expect(crashes.errors).toEqual([]);
  });

  test('records something down from the first-run panel', async ({ page }) => {
    const crashes = watchForCrashes(page);

    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await page.getByRole('button', { name: 'Note something down' }).click();

    await expect(page.getByRole('main')).toContainText('What kind of thing was it?');
    expect(crashes.errors).toEqual([]);
  });
});
