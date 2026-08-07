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
 * Home and environment on the production build, in an isolated context.
 *
 * No test bridge and no seeding: every record below is created by pressing the controls
 * an owner would press, into a throwaway profile. Nothing is deleted and no existing
 * profile is touched.
 *
 * The journey is the one that matters for this area: record the same friction twice on
 * the shipped artifact and watch the app stay silent after the first and speak after the
 * second. That is the boundary between this and a chore app, and it is worth proving on
 * the thing that actually ships rather than only against a seeded corpus.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Home and environment';

/* Synthetic throughout. */
const CHANGE = 'Placeholder change written by the owner';
const NOTE = 'Placeholder free text written by the owner';
const FRICTION = 'What I needed was somewhere else';

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
const panel = (page: Page) => page.getByRole('region', { name: AREA, exact: true });

async function switchOn(page: Page): Promise<void> {
  await openAreaDrawer(page);
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${AREA.toLowerCase()}` })
    .click();
  await expect(panel(page)).toBeVisible();
}

async function openArea(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(page.getByRole('region', { name: 'What got in the way' })).toBeVisible();
}

/** Records one friction, optionally saying what it interrupted. */
async function recordFriction(page: Page, purpose?: string): Promise<void> {
  const section = page.getByRole('region', { name: 'What got in the way' });
  if (purpose !== undefined) {
    await section
      .getByRole('group', { name: 'What you were doing' })
      .getByRole('button', { name: purpose })
      .click();
  }
  await section
    .getByRole('group', { name: 'What got in the way' })
    .getByRole('button', { name: FRICTION })
    .click();
}

test.describe('once is an event, twice is a pattern — on the shipped build', () => {
  test('stays silent after one, and offers a change after two', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    /* --- one ------------------------------------------------------------- */
    await recordFriction(page, 'Focused work');
    await expect(page.getByRole('region', { name: 'What keeps happening' })).toContainText(
      'Once — left alone',
    );

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('1 thing recorded, and not a second time');
    await expect(panel(page)).not.toContainText('Optional move in home and environment');

    /* --- two -------------------------------------------------------------- */
    await openArea(page);
    await recordFriction(page, 'Study');
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(panel(page)).toContainText('has got in the way 2 times');
    await expect(panel(page)).toContainText('Decide on one thing to change about the setup');
  });

  test('takes one change and survives a reload', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page);
    await recordFriction(page);

    const section = page.getByRole('region', { name: 'The one change' });
    await section.locator('textarea').fill(CHANGE);
    await section.getByRole('button', { name: 'Write it down' }).click();
    await expect(page.getByRole('region', { name: 'The one change' })).toContainText(CHANGE);

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('One change decided, and not made yet');

    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toContainText(CHANGE);
  });

  test('offers no way to add a second change while one is open', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page);
    await recordFriction(page);

    const section = page.getByRole('region', { name: 'The one change' });
    await section.locator('textarea').fill(CHANGE);
    await section.getByRole('button', { name: 'Write it down' }).click();

    // The only free-text field on the page is gone, and no control replaces it.
    await expect(page.getByRole('main').locator('textarea')).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'The one change' }).getByRole('button', {
        name: 'Write it down',
      }),
    ).toHaveCount(0);
  });

  test('measures the change by whether the same thing came back', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page);
    await recordFriction(page);

    const change = page.getByRole('region', { name: 'The one change' });
    await change.locator('textarea').fill(CHANGE);
    await change.getByRole('button', { name: 'Write it down' }).click();
    await page
      .getByRole('region', { name: 'The one change' })
      .getByRole('group', { name: 'Did you make the change?' })
      .getByRole('button', { name: 'Yes' })
      .click();

    const since = page.getByRole('region', { name: 'Since the change' });
    await expect(since).toBeVisible();
    await since.getByRole('button', { name: 'Still happening' }).click();

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('Try a different change');
    await expect(panel(page)).toContainText('still happening');
  });

  test('disable and re-enable without losing anything', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page);
    await recordFriction(page);
    await page.getByRole('button', { name: 'Done' }).click();

    await openAreaDrawer(page);
    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();
    await expect(panel(page)).toHaveCount(0);

    await switchOn(page);
    await expect(panel(page)).toContainText('has got in the way 2 times');
  });
});

test.describe('it describes no room, on the shipped build', () => {
  test('renders no cleaning, chore, or scoring vocabulary', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page, 'Focused work');
    await recordFriction(page, 'Study');
    await page.getByRole('button', { name: 'Done' }).click();

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
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
      'every week',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('refuses the percentage on the panel, with its reason', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    await expect(panel(page)).toContainText('How sorted is my house?');
    await expect(panel(page)).toContainText("readiness score for somebody's home");
  });
});

test.describe('the area stays in its place', () => {
  test('Now stays compact and names no area', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('home and environment');
  });

  test('keeps a free-text note off Now', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
    if ((await bar.count()) > 0) {
      await bar.click();
    } else {
      await page.getByRole('button', { name: 'Note something down' }).click();
    }

    await page.getByRole('button', { name: 'Something got in the way' }).click();
    await page.getByRole('main').locator('textarea').fill(NOTE);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    // Recorded, and not quoted on the front page.
    await expect(page.getByRole('main')).not.toContainText(NOTE);
  });

  test('no horizontal overflow with the area page on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await recordFriction(page, 'Focused work');

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
