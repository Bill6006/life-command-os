import { expect, test, type Page } from '@playwright/test';

/**
 * Fatherhood on the exact production build, from a genuinely fresh profile.
 *
 * **No test bridge and no seeding.** Everything here is created by using the app: the
 * area is switched on from Manage Areas, its questions are answered through Update This
 * Area, and a moment is written through Quick Capture.
 *
 * The last test is the one that matters most. It reads every rendered word on the
 * deployed artifact and asserts that no percentage, no grade, and no assessment
 * vocabulary about a child can appear — on the build the owner actually uses, rather
 * than on a fixture.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Fatherhood and child development';

async function open(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
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

const manageAreas = (page: Page) => page.getByRole('region', { name: 'Manage areas' });
const panel = (page: Page) => page.getByRole('region', { name: AREA });

async function switchOn(page: Page): Promise<void> {
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${AREA.toLowerCase()}` })
    .click();
  await expect(panel(page)).toBeVisible();
}

async function openCapture(page: Page): Promise<void> {
  const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
  if ((await bar.count()) > 0) {
    await bar.click();
  } else {
    await page.getByRole('button', { name: 'Note something down' }).click();
  }
  await expect(page.getByRole('main')).toContainText('What kind of thing was it?');
}

async function recordCount(page: Page): Promise<number> {
  await goTo(page, 'Data & Privacy');
  const stored = await page
    .getByRole('region', { name: 'Storage' })
    .locator('.kv-row', { hasText: 'Records stored' })
    .locator('dd')
    .textContent();
  await goTo(page, 'Direction');
  return Number(stored ?? '0');
}

test.describe('the area works end to end on a fresh profile', () => {
  test('switches on, answers its own questions, and survives a reload', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    await expect(panel(page)).toContainText('What did I practise, and what did I notice?');

    /* --- its own questions, including the milestone one --------------------- */
    await panel(page).getByRole('button', { name: 'Update this area' }).click();
    const main = page.getByRole('main');
    await expect(main).toContainText('Did you spend time together since last time?');

    let sawMilestone = false;
    for (let step = 0; step < 12; step += 1) {
      const text = (await main.textContent()) ?? '';
      if (text.includes('Have you seen her do this?')) sawMilestone = true;
      const choice = page.locator('.scale-step').first();
      if ((await choice.count()) > 0) await choice.click();
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
    const save = page.getByRole('button', { name: 'Save and close' });
    if ((await save.count()) > 0) await save.click();
    await expect(manageAreas(page)).toBeVisible();
    expect(sawMilestone).toBe(true);

    const after = await recordCount(page);
    expect(after).toBeGreaterThan(0);

    /* --- reload ------------------------------------------------------------- */
    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toBeVisible();
    expect(await recordCount(page)).toBe(after);
  });

  test('keeps a moment through Quick Capture, once and only once', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    await goTo(page, 'Now');
    await openCapture(page);
    await page.getByRole('button', { name: 'A moment with my daughter' }).click();
    await page.locator('#capture-what').fill('Sang the whole song in the car');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // One event, appearing on Timeline and inside the area — never entered twice.
    await goTo(page, 'Timeline');
    await expect(page.getByRole('main')).toContainText('Sang the whole song in the car');
    await expect(
      page.getByRole('main').getByText('Sang the whole song in the car'),
    ).toHaveCount(1);

    await goTo(page, 'Direction');
    await expect(panel(page)).toContainText('Moments kept');
  });

  test('disables without losing anything, and restores on re-enable', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    await goTo(page, 'Now');
    await openCapture(page);
    await page.getByRole('button', { name: 'A moment with my daughter' }).click();
    await page.locator('#capture-what').fill('Built a tower of four bricks');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await goTo(page, 'Direction');

    const before = await recordCount(page);

    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();
    await expect(panel(page)).toHaveCount(0);
    // One record more: the decision. Nothing removed.
    expect(await recordCount(page)).toBe(before + 1);

    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toHaveCount(0);

    await switchOn(page);
    await expect(panel(page)).toContainText('Moments kept');
    await goTo(page, 'Timeline');
    await expect(page.getByRole('main')).toContainText('Built a tower of four bricks');
  });
});

test.describe('nothing about a child is graded, on the shipped build', () => {
  test('shows no percentage, no score, and no assessment vocabulary', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    for (const forbidden of [
      'percentile',
      'developmental age',
      'age equivalent',
      'on track',
      'delayed',
      'disorder',
      'diagnos',
      'child score',
      'normal range',
      'bad parent',
      'neglect',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }

    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(panel(page)).toContainText('No percentage is shown here');
  });

  test('Now stays compact and mentions no area', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('fatherhood and child development');
    expect(text).not.toContain('manage areas');
  });

  test('no horizontal overflow with the panel on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

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
