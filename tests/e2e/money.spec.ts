import { expect, test, type Page } from '@playwright/test';

/**
 * Prompt 8H gate evidence: money, on screen.
 *
 * The two things worth proving here are the percentage that finally appears and the one
 * that still does not, and that neither depends on the app saying anything unkind.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Money';

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

const panel = (page: Page) => page.getByRole('region', { name: AREA, exact: true });

/**
 * Opens the card's detail (`V33-015`, v3.3 B6).
 *
 * Direction shows a compact summary — condition, what is in the way, one move, two
 * metrics — and keeps everything else behind `More`, one area open at a time. Tests about
 * the full panel contract open it, as the owner does.
 */
async function expandPanel(page: Page): Promise<void> {
  /*
   * Wait for the card, then click if it is there. A bare `count()` returns 0 while the
   * panel is still rendering — after a reload, for instance — and the guard then silently
   * skipped the click, so the test read a collapsed card and blamed the content. The wait
   * is tolerant rather than an assertion, because some callers reach here with the area
   * deliberately switched off, where no panel is the correct state.
   */
  await panel(page)
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => undefined);
  const more = panel(page).getByRole('button', { name: 'More detail', exact: true });
  if ((await more.count()) > 0) await more.click();
}

async function openArea(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
  await goTo(page, 'Direction');
  await expect(panel(page)).toBeVisible();
  await expandPanel(page);
}

async function openPage(page: Page, scenario: string): Promise<void> {
  await openArea(page, scenario);
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(page.getByRole('region', { name: 'Last looked' })).toBeVisible();
}

const SCENARIOS = [
  'money-pressure-no-figures',
  'money-figures-on',
  'money-not-looked',
  'money-thin-cover',
  'money-decision-settled',
];

test.describe('the percentage that appears, and the one that does not', () => {
  test('draws a real meter once amounts are switched on', async ({ page }) => {
    await openArea(page, 'money-figures-on');

    await expect(panel(page)).toContainText('How far along is the thing I named?');
    await expect(panel(page)).toContainText('56%');
    await expect(panel(page)).toContainText('only percentage in this product');
  });

  test('refuses the same meter with no amounts, and says why', async ({ page }) => {
    await openArea(page, 'money-pressure-no-figures');

    await expect(panel(page)).toContainText('How far along is the thing I named?');
    await expect(panel(page)).toContainText('No current value is known'.toLowerCase());
    await expect(panel(page)).toContainText('everything else in this area works without them');
  });

  test('shows a percentage nowhere else, in any state', async ({ page }) => {
    for (const scenario of SCENARIOS) {
      if (scenario === 'money-figures-on') continue;
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, scenario).not.toMatch(/\b\d{1,3}%/);
    }
  });

  test('puts cover on a ladder with no percentage', async ({ page }) => {
    await openArea(page, 'money-thin-cover');

    await expect(panel(page)).toContainText('How long could I cover things?');
    await expect(panel(page)).toContainText('Under a week');
    await expect(panel(page)).toContainText('without implying you should be at the end of it');
  });

  test('refuses to chart pressure against cover', async ({ page }) => {
    await openArea(page, 'money-pressure-no-figures');

    await expect(panel(page)).toContainText('Which matters more right now');
    await expect(panel(page)).toContainText('bars would claim the heights mean the same thing');
  });
});

test.describe('it never moralises, in any state', () => {
  test('uses no shaming, scoring, or budgeting vocabulary', async ({ page }) => {
    for (const scenario of SCENARIOS) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      for (const forbidden of [
        'overspending',
        'bad with money',
        'financial discipline',
        'frivolous',
        'irresponsible',
        'avoidance',
        'in denial',
        'net worth',
        'credit score',
        'budget',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  test('offers two minutes when he says he has not looked', async ({ page }) => {
    await openArea(page, 'money-not-looked');

    await expect(panel(page)).toContainText('Look at one number for two minutes');
    await expect(panel(page)).toContainText('Not looked at recently, by your own account');
  });

  test('says nothing at all to somebody whose cover is thin', async ({ page }) => {
    await openArea(page, 'money-thin-cover');

    await expect(panel(page)).not.toContainText('Optional move in money');
    // The reading is still shown. Withholding advice is not hiding facts.
    await expect(panel(page)).toContainText('under a week');
  });
});

test.describe('the area page keeps amounts behind a decision', () => {
  test('shows every section, with amounts switched off and explained', async ({ page }) => {
    await openPage(page, 'money-pressure-no-figures');

    for (const section of [
      'Last looked',
      'On your mind',
      'Cover',
      'What it is for',
      'A decision you are weighing',
      'Amounts',
    ]) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }

    const amounts = page.getByRole('region', { name: 'Amounts' });
    await expect(amounts).toContainText('Switched off');
    await expect(amounts).toContainText('works without a single number');
    await expect(amounts.locator('input')).toHaveCount(0);
  });

  test('offers the figure fields only after switching amounts on', async ({ page }) => {
    await openPage(page, 'money-pressure-no-figures');

    const amounts = page.getByRole('region', { name: 'Amounts' });
    await amounts.getByRole('button', { name: 'Switch amounts on' }).click();

    await expect(page.getByRole('region', { name: 'Amounts' }).locator('input')).toHaveCount(3);
  });

  test('records a pressure reading and a cover band', async ({ page }) => {
    await openPage(page, 'money-not-looked');

    await page
      .getByRole('region', { name: 'Cover' })
      .getByRole('button', { name: 'A few weeks' })
      .click();
    await expect(
      page.getByRole('region', { name: 'Cover' }).getByRole('button', { name: 'A few weeks' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page
      .getByRole('region', { name: 'On your mind' })
      .getByRole('button', { name: 'A bit' })
      .click();
    await expect(
      page.getByRole('region', { name: 'On your mind' }).getByRole('button', { name: 'A bit' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('takes a decision in his own words', async ({ page }) => {
    await openPage(page, 'money-not-looked');

    const section = page.getByRole('region', { name: 'A decision you are weighing' });
    await section.locator('textarea').fill('Placeholder decision written by the owner');
    await section.getByRole('button', { name: 'Write it down' }).click();

    await expect(
      page.getByRole('region', { name: 'A decision you are weighing' }),
    ).toContainText('You are weighing: Placeholder decision written by the owner');
  });

  test('still offers the guided flow', async ({ page }) => {
    await openPage(page, 'money-pressure-no-figures');
    await page.getByRole('button', { name: 'Take me through it instead' }).click();
    await expect(page.getByRole('main')).toContainText('Question 1 of');
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openPage(page, 'money-figures-on');

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

test.describe('money never crowds Now', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'money-figures-on');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('what is the pressure, and what would reduce it');
  });

  test('puts no money question into a daily check-in', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'money-figures-on');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = ((await main.textContent()) ?? '').toLowerCase();
      expect(text).not.toContain('money on your mind');
      expect(text).not.toContain('when did you last look');
      expect(text).not.toContain('if money stopped coming in');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });

  test('keeps the decision he wrote off the front page', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'money-decision-settled');

    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toContain('Placeholder decision written by the owner');
  });
});
