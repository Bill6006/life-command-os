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
 * Command Core on the production build, in an isolated context.
 *
 * No test bridge and no seeding. A fresh profile switches areas on through the real
 * control and then checks the two Phase 8 promises that only mean anything on the shipped
 * artifact: every switched-on area appears on the weekly scan, and the review instructions
 * exist without anything being sent anywhere.
 */

const PHONE = { width: 375, height: 812 };

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

async function switchOn(page: Page, area: string): Promise<void> {
  await openAreaDrawer(page);
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${area.toLowerCase()}` })
    .click();
}

test.describe('the weekly scan on the shipped build', () => {
  test('shows a row for every area switched on, and none for the rest', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');
    await switchOn(page, 'Home and environment');
    await switchOn(page, 'Money');

    await goTo(page, 'Review');
    const rows = page.getByRole('list', { name: 'Weekly domain scan' }).getByRole('listitem');
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: 'Faith and meaning' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Money' })).toHaveCount(1);
    await expect(rows.filter({ hasText: 'Career' })).toHaveCount(0);
  });

  test('shows an area switched on with nothing in it rather than hiding it', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Money');
    await goTo(page, 'Review');

    const rows = page.getByRole('list', { name: 'Weekly domain scan' }).getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Nothing recorded yet');
  });

  test('says there is nothing to scan before anything is switched on', async ({ page }) => {
    await open(page);
    await goTo(page, 'Review');
    await expect(page.getByRole('main')).toContainText('None yet');
  });

  test('renders no percentage or score anywhere', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Home and environment');
    await goTo(page, 'Review');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    for (const forbidden of ['life score', 'overall score', 'ranked']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('main')).toContainText('No total, no rating');
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');
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

test.describe('the review instructions on the shipped build', () => {
  test('are produced locally, with the privacy disclosure filled in', async ({ page }) => {
    await open(page);
    await goTo(page, 'Data & Privacy');

    const panel = page.getByRole('region', { name: 'Ask an AI to review it' });
    await expect(panel).toContainText('makes no network call');
    await panel.getByRole('button', { name: 'Show review instructions' }).click();

    const text = await panel.locator('#review-prompt').inputValue();
    expect(text).toContain('Privacy classes included: general');
    expect(text).toContain('Do not assert a cause');
    expect(text).toContain('Absent is not zero');
  });

  test('make no network request when the instructions are built', async ({ page }) => {
    /*
     * The strongest form of "the app produces the prompt and never calls anything": watch
     * the wire while the owner builds one.
     */
    await open(page);
    await goTo(page, 'Data & Privacy');

    const external: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.startsWith('http://localhost') && !url.startsWith('data:')) external.push(url);
    });

    const panel = page.getByRole('region', { name: 'Ask an AI to review it' });
    await panel
      .getByRole('group', { name: 'Coaching intensity' })
      .getByRole('button', { name: 'Hard Coach' })
      .click();
    await panel.getByRole('button', { name: 'Show review instructions' }).click();
    await expect(panel.locator('#review-prompt')).toBeVisible();

    expect(external).toEqual([]);
  });
});

test.describe('Now is unchanged by any of it', () => {
  test('stays compact with every area switched on', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    for (const area of [
      'Health, recovery, and energy',
      'Career and learning',
      'Fatherhood and child development',
      'Emotional state and relationships',
      'Faith and meaning',
      'Home and environment',
      'Money',
    ]) {
      await switchOn(page, area);
    }

    await goTo(page, 'Now');
    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('money on your mind');
    expect(text).not.toContain('if money stopped coming in');
  });
});
