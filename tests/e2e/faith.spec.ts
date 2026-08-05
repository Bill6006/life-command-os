import { expect, test, type Page } from '@playwright/test';

/**
 * Prompt 8F gate evidence: faith and meaning, on screen.
 *
 * Almost every assertion is an absence. No suggested value, no starter practice, no
 * chart, no percentage, no streak, and no response of any kind to someone writing down
 * that this is hard.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Faith and meaning';

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
  await expect(page.getByRole('region', { name: 'What matters' })).toBeVisible();
}

test.describe('the panel holds his words and has no view', () => {
  test('shows what he wrote, and says it has no opinion about it', async ({ page }) => {
    await openArea(page, 'faith-enabled');

    await expect(panel(page)).toContainText(
      'Where am I acting in line with what I say matters?',
    );
    await expect(panel(page)).toContainText('Being someone my family can rely on');
    await expect(panel(page)).toContainText('has no view on any of it');
  });

  test('records both refusals, with different reasons', async ({ page }) => {
    await openArea(page, 'faith-enabled');

    await expect(panel(page)).toContainText('How am I doing at this?');
    await expect(panel(page)).toContainText('how you are doing at your faith');

    await expect(panel(page)).toContainText('Which of these am I best at?');
    await expect(panel(page)).toContainText('would read as the one you are failing at');
  });

  test('draws no chart, no percentage, and no streak', async ({ page }) => {
    for (const scenario of ['faith-enabled', 'faith-repair', 'faith-struggle']) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      expect(text, scenario).not.toMatch(/\b\d{1,3}%/);
      expect(text, scenario).not.toContain('streak');
      expect(text, scenario).not.toContain('days in a row');
      await expect(page.getByRole('meter')).toHaveCount(0);
      await expect(page.getByRole('progressbar')).toHaveCount(0);
    }
  });

  test('claims no authority and grades nothing, in any state', async ({ page }) => {
    for (const scenario of ['faith-enabled', 'faith-repair', 'faith-struggle']) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      for (const forbidden of [
        'god wants',
        'scripture says',
        'sinful',
        'righteous',
        'spiritual maturity',
        'faith score',
        'lukewarm',
        'you should pray',
        'backslid',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  test('offers a quiet practice at two minutes, in his words', async ({ page }) => {
    await openArea(page, 'faith-enabled');
    await expect(panel(page)).toContainText('Two minutes of: Write to someone');
    await expect(panel(page)).toContainText('Optional move in faith and meaning');
  });

  test('offers a repair he named, without interpreting it', async ({ page }) => {
    await openArea(page, 'faith-repair');
    await expect(panel(page)).toContainText('Do the thing you decided to put right');

    const text = ((await panel(page).textContent()) ?? '').toLowerCase();
    for (const forbidden of ['you were wrong', 'you owe', 'apologise because', 'guilt']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });
});

test.describe('the area page starts blank on purpose', () => {
  test('offers an empty box and no suggestions', async ({ page }) => {
    await openPage(page, 'faith-enabled');

    for (const section of [
      'What matters',
      'Why it matters',
      'Things you do about it',
      'For someone else',
      'Something to put right',
      'How this is going',
    ]) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }

    // Nothing anywhere proposes a value or a practice to adopt.
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    for (const suggestion of ['for example', 'such as', 'try adding', 'popular', 'suggested']) {
      expect(text, suggestion).not.toContain(suggestion);
    }
  });

  test('records an occasion against one practice without touching another', async ({
    page,
  }) => {
    await openPage(page, 'faith-enabled');

    const practices = page.getByRole('region', { name: 'Things you do about it' });
    await practices
      .getByRole('group', { name: /^Record an occasion of Write to someone/ })
      .getByRole('button', { name: 'Did it' })
      .click();

    await expect(practices).toContainText('1 occasion recorded');
    await expect(page.getByRole('main')).not.toContainText('Question 1 of');
  });

  test('lets him name something in his own words', async ({ page }) => {
    await openPage(page, 'faith-enabled');

    const matters = page.getByRole('region', { name: 'What matters' });
    await matters.locator('textarea').fill('Placeholder value written by the owner');
    await matters.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByRole('region', { name: 'What matters' })).toContainText(
      'Placeholder value written by the owner',
    );
  });

  test('still offers the guided flow', async ({ page }) => {
    await openPage(page, 'faith-enabled');
    await page.getByRole('button', { name: 'Take me through it instead' }).click();
    await expect(page.getByRole('main')).toContainText('Question 1 of');
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openPage(page, 'faith-enabled');

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

test.describe('doubt is recorded and left alone', () => {
  test('is behind a control, and says nothing reads it', async ({ page }) => {
    await openPage(page, 'faith-enabled');

    const section = page.getByRole('region', { name: 'How this is going' });
    await expect(section).toContainText('Nothing reads this');
    await expect(section.locator('textarea')).toHaveCount(0);
    await expect(section.getByRole('button', { name: 'Write something down' })).toBeVisible();

    await section.getByRole('button', { name: 'Write something down' }).click();
    await expect(section.locator('textarea')).toHaveCount(1);
  });

  test('changes nothing on the panel when one exists', async ({ page }) => {
    await openArea(page, 'faith-struggle');

    // The panel is silent about it, and offers nothing because of it.
    await expect(panel(page)).toContainText('No optional move here right now');
    const text = ((await panel(page).textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('placeholder struggle entry');
    expect(text).not.toContain('doubt');
  });

  test('never reaches a daily check-in', async ({ page }) => {
    await openArea(page, 'faith-struggle');
    await goTo(page, 'Now');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toContain('Placeholder struggle entry');
      expect(text).not.toContain('how this is going');
      expect(text).not.toContain('put right');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });

  test('is not offered in Quick Capture until switched on', async ({ page }) => {
    await openArea(page, 'faith-enabled');
    await goTo(page, 'Now');

    const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
    if ((await bar.count()) > 0) {
      await bar.click();
    } else {
      await page.getByRole('button', { name: 'Note something down' }).click();
    }
    await expect(
      page.getByRole('button', { name: 'Something about how this is going' }),
    ).toHaveCount(0);
  });
});

test.describe('faith never crowds Now', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'faith-repair');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('faith and meaning');
    expect(text).not.toContain('apologise properly');
  });
});
