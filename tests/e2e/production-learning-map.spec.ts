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
 * The learning map on the exact production build, in an isolated context.
 *
 * **No test bridge, no seeding, and nothing deleted.** Every record here is created by
 * using the app, in a browser context Playwright creates and throws away. That last
 * point is a rule now rather than a preference: verification must never clear an
 * owner's IndexedDB, because during Prompt 8D's verification it did, and a profile with
 * no backup lost what was in it.
 *
 * The whole owner journey runs end to end: enable, scan, update, build up evidence,
 * approve a progression, change the age band, reload, disable, re-enable.
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
const map = (page: Page) =>
  page.getByRole('region', { name: 'Child development and learning map' });
const row = (page: Page, label: string) => page.locator('li.skill', { hasText: label });

async function switchOn(page: Page): Promise<void> {
  await openAreaDrawer(page);
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${AREA.toLowerCase()}` })
    .click();
  await expect(panel(page)).toBeVisible();
}

async function openMap(page: Page): Promise<void> {
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(map(page)).toBeVisible();
}

/** Records one occasion for a skill, from the map. */
async function recordOccasion(page: Page, label: string, level: string): Promise<void> {
  const target = row(page, label);
  const update = target.getByRole('button', { name: 'Update' });
  if ((await update.count()) > 0) await update.click();
  await target
    .getByRole('group', { name: /^What you saw for/ })
    .getByRole('button', { name: level })
    .click();
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

test.describe('the whole journey, on the shipped build', () => {
  test('enable, scan, update, progress, change band, reload, disable, restore', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openMap(page);

    /* --- scan: all six sections, everything relevant at once ---------------- */
    for (const section of [
      'Language and early reading',
      'Numbers and thinking',
      'Motor skills',
      'Social and emotional skills',
      'Independence and practical life',
      'Creativity and play',
    ]) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }
    expect(await page.locator('li.skill').count()).toBeGreaterThan(8);

    /* --- update one skill, without walking any other ------------------------ */
    const target = row(page, 'Taking turns in a game');
    await target.getByRole('button', { name: 'Update' }).click();
    await target
      .getByRole('group', { name: /^Level for/ })
      .getByRole('button', { name: 'Needs support' })
      .click();
    await expect(row(page, 'Taking turns in a game')).toContainText('Needs support');

    /* --- three occasions, and only then a suggestion ------------------------ */
    await recordOccasion(page, 'Taking turns in a game', 'Doing sometimes');
    await expect(row(page, 'Taking turns in a game')).not.toContainText('Suggestion: move to');

    await recordOccasion(page, 'Taking turns in a game', 'Doing sometimes');
    await recordOccasion(page, 'Taking turns in a game', 'Doing sometimes');

    /*
     * Three occasions on one day is one occasion. The rule needs two separate days, so
     * the suggestion correctly stays away — proved live rather than only in a unit test.
     */
    await expect(row(page, 'Taking turns in a game')).not.toContainText('Suggestion: move to');

    const beforeBand = await recordCount(page);
    expect(beforeBand).toBeGreaterThan(0);

    /* --- change the age band: adds, never removes --------------------------- */
    await openMap(page);
    await map(page)
      .getByRole('group', { name: 'Current age band' })
      .getByRole('button', { name: 'Around 4–5 years' })
      .click();

    const kept = row(page, 'Taking turns in a game');
    await expect(kept).toContainText('kept from an earlier age band');
    await expect(kept).toContainText('Needs support');
    await expect(row(page, 'Recognising her own name written down')).toBeVisible();
    // One record more: the band decision. Nothing was removed.
    expect(await recordCount(page)).toBe(beforeBand + 1);

    /* --- reload -------------------------------------------------------------- */
    await page.reload();
    await goTo(page, 'Direction');
    await openMap(page);
    await expect(row(page, 'Taking turns in a game')).toContainText('Needs support');

    /* --- disable, then restore ---------------------------------------------- */
    await map(page).getByRole('button', { name: 'Done' }).click();
    const beforeOff = await recordCount(page);

    await openAreaDrawer(page);
    await manageAreas(page)
      .getByRole('button', { name: `Switch off ${AREA.toLowerCase()}` })
      .click();
    await expect(panel(page)).toHaveCount(0);
    expect(await recordCount(page)).toBe(beforeOff + 1);

    await switchOn(page);
    await openMap(page);
    await expect(row(page, 'Taking turns in a game')).toContainText('Needs support');
  });

  test('a suggestion arrives across separate days, and only moves on approval', async ({
    page,
  }) => {
    /*
     * The clock is advanced between occasions rather than mocked around the rule.
     *
     * Three entries in one sitting is one occasion, and the rule is deliberately strict
     * about that — so proving approval on the shipped build means genuinely being on a
     * different day. Everything else here is the real interface writing real records.
     */
    await page.clock.install({ time: new Date('2026-09-01T18:00:00Z') });
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openMap(page);

    const label = 'Waiting a moment before getting something';
    const target = row(page, label);
    await target.getByRole('button', { name: 'Update' }).click();
    await target
      .getByRole('group', { name: /^Level for/ })
      .getByRole('button', { name: 'Practising with daddy' })
      .click();

    /* Two occasions on the first evening. */
    await recordOccasion(page, label, 'Needs support');
    await recordOccasion(page, label, 'Needs support');
    await expect(row(page, label)).not.toContainText('Suggestion: move to');

    /* A third, two days later. */
    await page.clock.setFixedTime(new Date('2026-09-03T18:00:00Z'));
    await recordOccasion(page, label, 'Needs support');

    const suggested = row(page, label);
    await expect(suggested).toContainText('Suggestion: move to');
    await expect(suggested).toContainText('separate days');
    await expect(suggested).toContainText('nothing changes unless you say so');
    // Still where the owner put it. The suggestion changed nothing by existing.
    await expect(suggested).toContainText('Practising with daddy');

    /* Approve: exactly one rung. */
    await suggested.getByRole('button', { name: 'Approve progression' }).click();

    // Scoped to the row's summary — the expanded controls legitimately list every rung.
    const summary = row(page, label).locator('.skill-main');
    await expect(summary).toContainText('Needs support');
    await expect(summary).not.toContainText('Doing sometimes');
    await expect(row(page, label)).not.toContainText('Suggestion: move to');
  });
});

test.describe('nothing about a child is graded, on the shipped build', () => {
  test('renders no score, grade, percentage, ranking, or comparison', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openMap(page);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    for (const forbidden of [
      'percentile',
      'developmental age',
      'age equivalent',
      'on track',
      'delayed',
      'diagnos',
      'child score',
      'ranking',
      'than other children',
      'normal range',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('stores no birth date and shows no child name', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openMap(page);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/date of birth|birthday|born on|d\.o\.b/);
    // The map refers to her generically until the owner privately says otherwise.
    await expect(map(page)).toContainText('Current age band');
  });

  test('Now stays compact and mentions no area', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await goTo(page, 'Now');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('child development and learning map');
    expect(text).not.toContain('fatherhood and child development');
  });

  test('reports plan version 3.2 in build evidence', async ({ page }) => {
    await open(page);
    await goTo(page, 'Data & Privacy');
    await expect(page.getByRole('main')).toContainText('3.2 Coverage and Learning Map');
  });

  test('no horizontal overflow with the full map on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page);
    await openMap(page);

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
