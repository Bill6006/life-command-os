import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 8 gate evidence: Command Core on screen.
 *
 * The weekly scan, the synthesis, the deep review, and the AI review instructions — plus
 * the two things that must remain true now that seven domains feed one decision: Now still
 * shows exactly one thing, and a daily check-in is still not a checklist.
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

async function open(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
}

test.describe('the weekly scan shows every area at once', () => {
  test('gives one row per switched-on area, with a way into each', async ({ page }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Review');

    const scan = page.getByRole('list', { name: 'Weekly domain scan' });
    await expect(scan).toBeVisible();
    await expect(scan.getByRole('listitem')).not.toHaveCount(0);
    await expect(scan.getByRole('button', { name: 'Open' }).first()).toBeVisible();
  });

  test('says plainly that quiet areas are shown rather than hidden', async ({ page }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Review');

    await expect(page.getByRole('main')).toContainText(
      'Every switched-on area appears, including the ones with nothing to say',
    );
  });

  test('opens the area page from a scan row', async ({ page }) => {
    await open(page, 'home-repeated-friction');
    await goTo(page, 'Review');

    await page
      .getByRole('list', { name: 'Weekly domain scan' })
      .getByRole('button', { name: 'Open' })
      .first()
      .click();

    await expect(page.getByRole('region', { name: 'What got in the way' })).toBeVisible();
  });

  test('shows nothing to scan on a profile with no areas on', async ({ page }) => {
    await open(page, 'areas-all-off');
    await goTo(page, 'Review');
    await expect(page.getByRole('main')).toContainText('None yet');
  });
});

test.describe('the review is useful without a scorecard', () => {
  test('renders no percentage, rating, or ranking', async ({ page }) => {
    for (const scenario of ['faith-enabled', 'home-repeated-friction', 'money-figures-on']) {
      await open(page, scenario);
      await goTo(page, 'Review');

      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, scenario).not.toMatch(/\b\d{1,3}%/);
      for (const forbidden of ['overall score', 'life score', 'ranked', 'out of 10']) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
      await expect(page.getByRole('meter')).toHaveCount(0);
    }
  });

  test('says it holds no total or rating', async ({ page }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Review');
    await expect(page.getByRole('main')).toContainText('No total, no rating');
  });

  test('quotes nothing sensitive the owner wrote', async ({ page }) => {
    for (const scenario of ['faith-struggle', 'money-decision-settled', 'emotional-private']) {
      await open(page, scenario);
      await goTo(page, 'Review');

      const text = (await page.getByRole('main').textContent()) ?? '';
      for (const secret of [
        'Placeholder struggle entry',
        'Placeholder decision written by the owner',
        'Placeholder private entry',
      ]) {
        expect(text, `${scenario}: ${secret}`).not.toContain(secret);
      }
    }
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'faith-enabled');
    await goTo(page, 'Review');

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

test.describe('the AI review instructions are produced, never sent', () => {
  test('offer Brief and Balanced by default, and say nothing is sent anywhere', async ({
    page,
  }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Data & Privacy');

    const panel = page.getByRole('region', { name: 'Ask an AI to review it' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('makes no network call');

    await expect(
      panel
        .getByRole('group', { name: 'Review length' })
        .getByRole('button', { name: /Brief/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      panel
        .getByRole('group', { name: 'Coaching intensity' })
        .getByRole('button', { name: 'Balanced' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('carry the structure, the prohibitions, and the privacy disclosure', async ({
    page,
  }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Data & Privacy');

    const panel = page.getByRole('region', { name: 'Ask an AI to review it' });
    await panel.getByRole('button', { name: 'Show review instructions' }).click();

    const text = await panel.locator('#review-prompt').inputValue();
    expect(text).toContain('1. Bottom line');
    expect(text).toContain('8. Missing information that could change your conclusion');
    expect(text).toContain('Do not assert a cause');
    expect(text).toContain('Do not produce a score');
    expect(text).toContain('High, Medium, or Low');
    expect(text).toContain('Privacy classes included');
  });

  test('keep the prohibitions identical on Hard Coach', async ({ page }) => {
    await open(page, 'faith-enabled');
    await goTo(page, 'Data & Privacy');

    const panel = page.getByRole('region', { name: 'Ask an AI to review it' });
    await panel
      .getByRole('group', { name: 'Coaching intensity' })
      .getByRole('button', { name: 'Hard Coach' })
      .click();
    await panel.getByRole('button', { name: 'Show review instructions' }).click();

    const text = await panel.locator('#review-prompt').inputValue();
    expect(text).toContain('Do not assert a cause');
    expect(text).toContain('never about the person');
    expect(text).toContain('Do not be angry, shaming');
  });
});

test.describe('one decision still, with seven areas feeding it', () => {
  test('Now shows exactly one thing and stays within five panels', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'faith-enabled');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    // One primary decision, never a list of alternatives.
    await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(
      (await page.getByRole('button', { name: 'Start' }).count()) > 0 ? 1 : 0,
    );
  });

  test('a daily check-in is still not a checklist of seven areas', async ({ page }) => {
    await open(page, 'faith-enabled');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    let steps = 0;
    for (let index = 0; index < 8; index += 1) {
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      steps += 1;
      await next.click();
    }
    expect(steps).toBeLessThanOrEqual(5);
    await expect(main).not.toContainText('Money on your mind');
  });
});
