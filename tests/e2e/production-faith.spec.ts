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
 * Faith and meaning on the production build, in an isolated context.
 *
 * No test bridge and no seeding: everything below is typed in through the same controls
 * the owner uses, into a throwaway profile. Nothing is deleted and no existing profile is
 * touched.
 *
 * The journey is the one that matters for this area — switch it on, find it empty, write
 * something into it, record an occasion against it, and then check the refusals held on
 * the shipped artifact rather than only in a unit test.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Faith and meaning';

/* Synthetic throughout. Nothing here is anybody's actual value or practice. */
const VALUE = 'Placeholder value written by the owner';
const PRACTICE = 'Placeholder practice written by the owner';
const REPAIR = 'Placeholder repair written by the owner';
const STRUGGLE = 'Placeholder struggle entry';

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
  await expect(page.getByRole('region', { name: 'What matters' })).toBeVisible();
}

/** Types a statement into one of the free-text sections and submits it. */
async function nameIt(
  page: Page,
  section: string,
  label: string,
  statement: string,
): Promise<void> {
  const region = page.getByRole('region', { name: section });
  await region.locator('textarea').first().fill(statement);
  await region.getByRole('button', { name: label, exact: true }).click();
}

test.describe('the whole journey, on the shipped build', () => {
  test('starts empty, takes his words, and survives a reload', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);

    // Nothing has been named, and nothing is proposed.
    await expect(panel(page)).toContainText('Nothing has been recorded here yet');
    await openArea(page);
    await expect(page.getByRole('region', { name: 'What matters' })).toContainText(
      'Nothing written down yet',
    );

    await nameIt(page, 'What matters', 'Add', VALUE);
    await nameIt(page, 'Things you do about it', 'Add something you do', PRACTICE);
    await expect(page.getByRole('region', { name: 'Things you do about it' })).toContainText(
      'Nothing recorded against this yet',
    );

    await page
      .getByRole('region', { name: 'Things you do about it' })
      /*
       * Exact, because this test deliberately creates a second practice whose name starts
       * with the first one's. A substring match resolves to both and the click is a coin
       * toss — it passed in isolation and failed in the full run, which is the signature.
       */
      .getByRole('group', { name: `Record an occasion of ${PRACTICE}`, exact: true })
      .getByRole('button', { name: 'Did it' })
      .click();
    await expect(page.getByRole('region', { name: 'Things you do about it' })).toContainText(
      '1 occasion recorded',
    );

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText(VALUE);

    await page.reload();
    await goTo(page, 'Direction');
    await expect(panel(page)).toContainText(VALUE);
  });

  test('switching the area off keeps every word, and switching it back on returns them', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await nameIt(page, 'What matters', 'Add', VALUE);
    await page.getByRole('button', { name: 'Done' }).click();

    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();
    await expect(panel(page)).toHaveCount(0);

    await switchOn(page);
    await expect(panel(page)).toContainText(VALUE);
  });

  test('holds a repair he named, and offers it back discreetly', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await nameIt(page, 'Something to put right', 'Write it down', REPAIR);
    await expect(page.getByRole('region', { name: 'Something to put right' })).toContainText(
      REPAIR,
    );

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(panel(page)).toContainText('Do the thing you decided to put right');

    /*
     * The words themselves stay on the page he opened. A repair describes something that
     * went wrong with another person, so it does not travel to the front page with the
     * suggestion — found on the browser build during Prompt 8F.
     */
    await goTo(page, 'Now');
    await expect(page.getByRole('main')).not.toContainText(REPAIR);
  });
});

test.describe('the refusals hold on the shipped build', () => {
  test('suggests no value and no practice, anywhere on the page', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    for (const suggestion of ['for example', 'such as', 'try adding', 'popular', 'suggested']) {
      expect(text, suggestion).not.toContain(suggestion);
    }
    for (const authority of ['pray', 'scripture', 'church', 'worship', 'meditat', 'tithe']) {
      expect(text, authority).not.toContain(authority);
    }
  });

  test('records both refusals on the panel, with different reasons', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    /*
     * The comparison refusal only has something to refuse once there are two practices to
     * rank, which is the point of it: the evidence becomes sufficient and the chart is
     * still not drawn.
     */
    await nameIt(page, 'Things you do about it', 'Add something you do', PRACTICE);
    await nameIt(page, 'Things you do about it', 'Add something you do', `${PRACTICE} two`);
    await page
      .getByRole('region', { name: 'Things you do about it' })
      /*
       * Exact, because this test deliberately creates a second practice whose name starts
       * with the first one's. A substring match resolves to both and the click is a coin
       * toss — it passed in isolation and failed in the full run, which is the signature.
       */
      .getByRole('group', { name: `Record an occasion of ${PRACTICE}`, exact: true })
      .getByRole('button', { name: 'Did it' })
      .click();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(panel(page)).toContainText('How am I doing at this?');
    await expect(panel(page)).toContainText('how you are doing at your faith');
    await expect(panel(page)).toContainText('Which of these am I best at?');
    await expect(panel(page)).toContainText('would read as the one you are failing at');
  });

  test('draws no meter, percentage, streak, or grade', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await nameIt(page, 'What matters', 'Add', VALUE);
    await nameIt(page, 'Things you do about it', 'Add something you do', PRACTICE);
    await page.getByRole('button', { name: 'Done' }).click();

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    for (const forbidden of [
      'streak',
      'days in a row',
      'spiritual maturity',
      'faith score',
      'lukewarm',
      'backslid',
      'sinful',
      'righteous',
      'god wants',
      'you should pray',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });
});

test.describe('doubt is recorded and left alone, on the shipped build', () => {
  test('is written down, changes nothing, and reaches no other screen', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);

    const section = page.getByRole('region', { name: 'How this is going' });
    await expect(section).toContainText('Nothing reads this');
    await section.getByRole('button', { name: 'Write something down' }).click();
    await section.locator('textarea').fill(STRUGGLE);
    await section.getByRole('button', { name: 'Keep this' }).click();
    await expect(section).toContainText('Nothing has been done with any of them');

    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('main')).not.toContainText(STRUGGLE);

    await goTo(page, 'Now');
    await expect(page.getByRole('main')).not.toContainText(STRUGGLE);

    const guide = page.locator('.guide-bar').getByRole('button', { name: 'Open' });
    if ((await guide.count()) > 0) {
      await guide.click();
      const main = page.getByRole('main');
      for (let step = 0; step < 6; step += 1) {
        await expect(main).not.toContainText(STRUGGLE);
        const next = page.getByRole('button', { name: 'Next', exact: true });
        if ((await next.count()) === 0) break;
        await next.click();
      }
    }
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
    expect(text).not.toContain('faith and meaning');
  });

  test('no horizontal overflow with the area page on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openArea(page);
    await nameIt(page, 'What matters', 'Add', VALUE);
    await nameIt(page, 'Things you do about it', 'Add something you do', PRACTICE);

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
