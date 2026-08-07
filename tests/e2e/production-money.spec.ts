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
 * Money on the production build, in an isolated context.
 *
 * No test bridge and no seeding: every record below is created by pressing the controls an
 * owner would press, into a throwaway profile. Nothing is deleted and no existing profile
 * is touched.
 *
 * The journey that matters here is the one the plan's scope boundary describes: use the
 * whole area without ever entering a figure, then switch amounts on and watch the only
 * percentage in the product appear — and nothing else change.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Money';

/* Synthetic throughout. */
const DECISION = 'Placeholder decision written by the owner';
const PURPOSE = 'Placeholder purpose written by the owner';
const NOTE = 'Placeholder free text written by the owner';

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
  await expect(page.getByRole('region', { name: 'Last looked' })).toBeVisible();
}

async function choose(page: Page, section: string, option: string): Promise<void> {
  await page
    .getByRole('region', { name: section })
    .getByRole('button', { name: option })
    .click();
}

test.describe('the whole area works without a figure, on the shipped build', () => {
  test('records pressure, cover, and what it is for, and survives a reload', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    await choose(page, 'Last looked', 'This week');
    await choose(page, 'On your mind', 'Noticeable');
    await choose(page, 'Cover', 'A month or two');

    const purpose = page.getByRole('region', { name: 'What it is for' });
    await purpose.locator('textarea').fill(PURPOSE);
    await purpose.getByRole('button', { name: 'Write it down' }).click();
    await expect(page.getByRole('region', { name: 'What it is for' })).toContainText(PURPOSE);

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('Noticeable on your mind');
    await expect(panel(page)).toContainText('a month or two of cover');

    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toContainText('Noticeable on your mind');
  });

  test('refuses the percentage while amounts are off, and says why', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await choose(page, 'On your mind', 'Noticeable');
    await choose(page, 'Cover', 'A few weeks');
    await page.getByRole('button', { name: 'Done' }).click();

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    await expect(panel(page)).toContainText('How far along is the thing I named?');
    await expect(panel(page)).toContainText('everything else in this area works without them');
    await expect(page.getByRole('meter')).toHaveCount(0);
  });

  test('puts cover on a ladder and refuses to chart it against pressure', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await choose(page, 'On your mind', 'Heavy');
    await choose(page, 'Cover', 'Several months');
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(panel(page)).toContainText('How long could I cover things?');
    await expect(panel(page)).toContainText('Which matters more right now');
    await expect(panel(page)).toContainText('bars would claim the heights mean the same thing');
    await expect(panel(page)).toContainText('the cover is the more durable fact');
  });
});

test.describe('amounts are a second decision, on the shipped build', () => {
  test('are off by default, and the page says what turning them on does', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const amounts = page.getByRole('region', { name: 'Amounts' });
    await expect(amounts).toContainText('Switched off');
    await expect(amounts).toContainText('works without a single number');
    await expect(amounts.locator('input')).toHaveCount(0);
  });

  test('produce the only percentage in the product once switched on', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const amounts = page.getByRole('region', { name: 'Amounts' });
    await amounts.getByRole('button', { name: 'Switch amounts on' }).click();

    await page
      .getByRole('region', { name: 'Amounts' })
      .locator('#money-unit')
      .fill('towards it');
    await page.getByRole('region', { name: 'Amounts' }).locator('#money-target').fill('7500');
    await page.getByRole('region', { name: 'Amounts' }).locator('#money-current').fill('4200');
    await page
      .getByRole('region', { name: 'Amounts' })
      .getByRole('button', { name: 'Save these' })
      .click();

    await expect(page.getByRole('region', { name: 'Amounts' })).toContainText('4200 of 7500');

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('56%');
    await expect(panel(page)).toContainText('only percentage in this product');
  });

  test('switching them off hides the figures and deletes nothing', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const amounts = () => page.getByRole('region', { name: 'Amounts' });
    await amounts().getByRole('button', { name: 'Switch amounts on' }).click();
    await amounts().locator('#money-unit').fill('towards it');
    await amounts().locator('#money-target').fill('7500');
    await amounts().locator('#money-current').fill('4200');
    await amounts().getByRole('button', { name: 'Save these' }).click();
    await expect(amounts()).toContainText('4200 of 7500');

    await amounts().getByRole('button', { name: 'Switch amounts off' }).click();
    await expect(amounts()).toContainText('Switched off');

    await page.getByRole('button', { name: 'Done' }).click();
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);

    // And back on: the figures are still there, because switching off deleted nothing.
    await openArea(page);
    await amounts().getByRole('button', { name: 'Switch amounts on' }).click();
    await expect(amounts()).toContainText('4200 of 7500');
  });
});

test.describe('it never moralises, on the shipped build', () => {
  test('offers two minutes when he says he has been putting it off', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await choose(page, 'Last looked', 'I have been putting it off');
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(panel(page)).toContainText('Look at one number for two minutes');
    await expect(panel(page)).toContainText('Not looked at recently, by your own account');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    for (const forbidden of [
      'overspending',
      'bad with money',
      'financial discipline',
      'irresponsible',
      'avoidance',
      'in denial',
      'net worth',
      'credit score',
      'budget',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  test('says nothing at all when cover is thin', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await choose(page, 'Last looked', 'This week');
    await choose(page, 'On your mind', 'A bit');
    await choose(page, 'Cover', 'Under a week');
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(panel(page)).not.toContainText('Optional move in money');
    // The reading is still shown plainly. Withholding advice is not hiding facts.
    await expect(panel(page)).toContainText('under a week of cover');
  });

  test('keeps a decision and a note off the front page', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const decision = page.getByRole('region', { name: 'A decision you are weighing' });
    await decision.locator('textarea').fill(DECISION);
    await decision.getByRole('button', { name: 'Write it down' }).click();
    await page.getByRole('button', { name: 'Done' }).click();

    await goTo(page, 'Now');
    await expect(page.getByRole('main')).not.toContainText(DECISION);

    const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
    if ((await bar.count()) > 0) {
      await bar.click();
    } else {
      await page.getByRole('button', { name: 'Note something down' }).click();
    }
    await page.getByRole('button', { name: 'Something about money' }).click();
    await page.getByRole('main').locator('textarea').fill(NOTE);
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByRole('main')).not.toContainText(NOTE);
  });
});

test.describe('the area stays in its place', () => {
  test('Now stays compact and asks nothing about money', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('money on your mind');
    expect(text).not.toContain('if money stopped coming in');
  });

  test('disable and re-enable without losing anything', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await choose(page, 'On your mind', 'Heavy');
    await page.getByRole('button', { name: 'Done' }).click();

    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();

    /*
     * The *domain* panel is gone. A category summary named "Money" remains, as one does for
     * every switched-off area — checking the region name alone stopped distinguishing the
     * two once the Phase 8 repair pass reverted the "Money & pressure" label workaround.
     * The update control is the unambiguous marker: only a domain panel carries one. The
     * area's question is not — Manage Areas prints it as the subtitle of every switchable
     * area, switched on or not.
     */
    await expect(page.getByRole('button', { name: 'Update this area' })).toHaveCount(0);

    await switchOn(page);
    await expect(panel(page)).toContainText('Heavy on your mind');
  });

  test('no horizontal overflow with the area page on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await page
      .getByRole('region', { name: 'Amounts' })
      .getByRole('button', { name: 'Switch amounts on' })
      .click();

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
