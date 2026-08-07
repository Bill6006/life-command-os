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
 * Emotional state and relationships on the production build, in an isolated context.
 *
 * No test bridge, no seeding, nothing deleted. The journey is the owner's: switch the
 * area on, record what happened, switch Private Patterns on, write something, and then
 * check the two things that matter most — that it stays out of the export until he
 * separately allows it, and that nothing about it reaches a screen he did not open.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Emotional state and relationships';

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
const privateSection = (page: Page) => page.getByRole('region', { name: 'Private patterns' });
const permissions = (page: Page) =>
  page.getByRole('region', { name: 'Where sensitive topics may appear' });

async function switchOn(page: Page): Promise<void> {
  await openAreaDrawer(page);
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${AREA.toLowerCase()}` })
    .click();
  await expect(panel(page)).toBeVisible();
}

async function openArea(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(page.getByRole('region', { name: 'Connection' })).toBeVisible();
}

const NOTE = 'Placeholder private entry';

async function writePrivateNote(page: Page): Promise<void> {
  const section = privateSection(page);
  await section.getByRole('button', { name: 'Switch private patterns on' }).click();
  await section.locator('textarea').fill(NOTE);
  await section.getByRole('button', { name: 'Save privately' }).click();
}

test.describe('the whole journey, on the shipped build', () => {
  test('switch on, record, and survive a reload', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    await page
      .getByRole('region', { name: 'Connection' })
      .getByRole('button', { name: 'In person' })
      .click();
    await page
      .getByRole('region', { name: 'What you practised' })
      .getByRole('button', { name: 'Started a conversation' })
      .click();

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('Contact recorded on');

    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toContainText('Contact recorded on');
  });

  test('disable and re-enable without losing anything', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await page
      .getByRole('region', { name: 'Connection' })
      .getByRole('button', { name: 'A call or video' })
      .click();
    await page.getByRole('button', { name: 'Done' }).click();

    await openAreaDrawer(page);
    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();
    await expect(panel(page)).toHaveCount(0);

    await switchOn(page);
    await expect(panel(page)).toContainText('Contact recorded on');
  });
});

test.describe('private patterns, on the shipped build', () => {
  test('are off until switched on, and permit nothing when they are', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    await expect(privateSection(page)).toContainText('Switched off');
    await writePrivateNote(page);

    // Recorded, and still permitted on no surface at all.
    const pressed = await permissions(page)
      .getByRole('button')
      .evaluateAll(
        (nodes) => nodes.filter((node) => node.getAttribute('aria-pressed') === 'true').length,
      );
    expect(pressed).toBe(0);
  });

  test('stay out of the export until the export surface is granted', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await writePrivateNote(page);

    /* --- included by class, and still withheld ----------------------------- */
    await goTo(page, 'Data & Privacy');
    await page.getByRole('button', { name: 'private-pattern', exact: true }).click();
    await page.getByRole('button', { name: 'Preview export' }).click();
    await expect(page.getByRole('main')).not.toContainText(NOTE);

    /* --- grant the export surface, and only then ---------------------------- */
    await goTo(page, 'Direction');
    await openArea(page);
    await permissions(page)
      .getByRole('group', { name: /^Where private patterns/ })
      .getByRole('button', { name: 'The readable export' })
      .click();

    await goTo(page, 'Data & Privacy');
    await page.getByRole('button', { name: 'private-pattern', exact: true }).click();
    await page.getByRole('button', { name: 'Preview export' }).click();
    await expect(page.getByRole('main')).toContainText(NOTE);
  });

  test('never appear on a surface the owner did not open', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await writePrivateNote(page);
    await page.getByRole('button', { name: 'Done' }).click();

    // Not on the panel, not on Direction at all.
    await expect(page.getByRole('main')).not.toContainText(NOTE);

    // Not on Now, and not in a check-in.
    await goTo(page, 'Now');
    await expect(page.getByRole('main')).not.toContainText(NOTE);

    const guide = page.locator('.guide-bar').getByRole('button', { name: 'Open' });
    if ((await guide.count()) > 0) {
      await guide.click();
      const main = page.getByRole('main');
      for (let step = 0; step < 6; step += 1) {
        await expect(main).not.toContainText(NOTE);
        const next = page.getByRole('button', { name: 'Next', exact: true });
        if ((await next.count()) === 0) break;
        await next.click();
      }
    }
  });
});

test.describe('nothing here is graded, on the shipped build', () => {
  test('renders no score, percentage, or rating of anyone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    for (const forbidden of [
      'depress',
      'diagnos',
      'attachment style',
      'toxic',
      'relationship score',
      'connection score',
      'wellbeing score',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('Now stays compact and names no area', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('emotional state and relationships');
  });

  test('no horizontal overflow with the area page on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

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
