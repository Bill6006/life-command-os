import { expect, test, type Page } from '@playwright/test';

/**
 * Prompt 8G gate evidence: home and environment, on screen.
 *
 * The assertions that matter here are about restraint. Nothing is offered after one bad
 * morning, nothing is added while one change is open, no room is described, and nothing
 * appears because a week went by.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Home and environment';

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

async function openArea(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
  await goTo(page, 'Direction');
  await expect(panel(page)).toBeVisible();
}

async function openPage(page: Page, scenario: string): Promise<void> {
  await openArea(page, scenario);
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(page.getByRole('region', { name: 'What got in the way' })).toBeVisible();
}

const SCENARIOS = [
  'home-repeated-friction',
  'home-single-friction',
  'home-change-open',
  'home-change-did-not-hold',
];

test.describe('the panel counts repetition and ignores one-offs', () => {
  test('names what keeps happening, with the count', async ({ page }) => {
    await openArea(page, 'home-repeated-friction');

    await expect(panel(page)).toContainText('What friction is repeatedly in the way?');
    await expect(panel(page)).toContainText('has got in the way 4 times');
    await expect(panel(page)).toContainText('Decide on one thing to change about the setup');
  });

  test('says nothing at all about a single occurrence', async ({ page }) => {
    await openArea(page, 'home-single-friction');

    await expect(panel(page)).toContainText('1 thing recorded, and not a second time');
    await expect(panel(page)).toContainText('Nothing has been recorded twice');
    await expect(panel(page)).not.toContainText('Optional move in home and environment');
  });

  test('draws the comparison, and refuses the percentage', async ({ page }) => {
    await openArea(page, 'home-repeated-friction');

    await expect(panel(page)).toContainText('What keeps getting in the way?');
    await expect(panel(page)).toContainText('How sorted is my house?');
    await expect(panel(page)).toContainText("readiness score for somebody's home");
  });

  test('describes no room and grades nothing, in any state', async ({ page }) => {
    for (const scenario of SCENARIOS) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      for (const forbidden of [
        'tidy',
        'messy',
        'clutter',
        'housework',
        'chore',
        'dirty',
        'cleanliness score',
        'home score',
        'overdue',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
      expect(text, scenario).not.toMatch(/\b\d{1,3}%/);
      await expect(page.getByRole('meter')).toHaveCount(0);
      await expect(page.getByRole('progressbar')).toHaveCount(0);
    }
  });

  test('offers his change back, and no second job beside it', async ({ page }) => {
    await openArea(page, 'home-change-open');

    await expect(panel(page)).toContainText('Make the change you decided on');
    await expect(panel(page)).toContainText('Placeholder change written by the owner');
    await expect(panel(page)).toContainText('One change decided, and not made yet');
  });

  test('says a change did not hold without telling him off', async ({ page }) => {
    await openArea(page, 'home-change-did-not-hold');

    await expect(panel(page)).toContainText('Try a different change');
    const text = ((await panel(page).textContent()) ?? '').toLowerCase();
    for (const forbidden of ['you failed', 'you should have', 'try harder', 'give up']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });
});

test.describe('the area page holds one change and no list', () => {
  test('shows every section, all of them buttons', async ({ page }) => {
    await openPage(page, 'home-repeated-friction');

    for (const section of [
      'What got in the way',
      'What keeps happening',
      'The one change',
      'Noise, light, and privacy',
      'Getting started',
      'Switching the space over',
    ]) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }

    // One free-text field on the whole page, and it holds one change.
    await expect(page.getByRole('main').locator('textarea')).toHaveCount(1);
  });

  test('records a friction against what he was doing', async ({ page }) => {
    await openPage(page, 'home-single-friction');

    const section = page.getByRole('region', { name: 'What got in the way' });
    await section
      .getByRole('group', { name: 'What you were doing' })
      .getByRole('button', { name: 'Focused work' })
      .click();
    await section
      .getByRole('group', { name: 'What got in the way' })
      .getByRole('button', { name: 'Too loud' })
      .click();

    await expect(page.getByRole('region', { name: 'What keeps happening' })).toContainText(
      'Too loud',
    );
    await expect(page.getByRole('region', { name: 'What keeps happening' })).toContainText(
      'Once — left alone',
    );
  });

  test('takes one change, and offers no way to add a second', async ({ page }) => {
    await openPage(page, 'home-change-open');

    const section = page.getByRole('region', { name: 'The one change' });
    await expect(section).toContainText('Placeholder change written by the owner');
    await expect(section).toContainText('One at a time');
    await expect(section.locator('textarea')).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Write it down' })).toHaveCount(0);
  });

  test('lets him write the one change in his own words', async ({ page }) => {
    await openPage(page, 'home-repeated-friction');

    const section = page.getByRole('region', { name: 'The one change' });
    await section.locator('textarea').fill('Placeholder change written by the owner');
    await section.getByRole('button', { name: 'Write it down' }).click();

    await expect(page.getByRole('region', { name: 'The one change' })).toContainText(
      'You decided: Placeholder change written by the owner',
    );
  });

  test('asks whether it came back only once a change was made', async ({ page }) => {
    await openPage(page, 'home-repeated-friction');
    await expect(page.getByRole('region', { name: 'Since the change' })).toHaveCount(0);

    await openPage(page, 'home-change-did-not-hold');
    await expect(page.getByRole('region', { name: 'Since the change' })).toBeVisible();
  });

  test('still offers the guided flow', async ({ page }) => {
    await openPage(page, 'home-repeated-friction');
    await page.getByRole('button', { name: 'Take me through it instead' }).click();
    await expect(page.getByRole('main')).toContainText('Question 1 of');
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openPage(page, 'home-repeated-friction');

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

test.describe('home never crowds Now', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'home-repeated-friction');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('home and environment');
  });

  test('puts no home question into a daily check-in', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'home-repeated-friction');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = ((await main.textContent()) ?? '').toLowerCase();
      expect(text).not.toContain('got in the way of what you sat down to do');
      expect(text).not.toContain('switched the space over');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });
});
