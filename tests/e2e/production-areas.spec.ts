import { expect, test, type Page } from '@playwright/test';

/**
 * Manage Areas, on the exact production build, from a genuinely fresh profile.
 *
 * **No test bridge and no seeding** — the production bundle contains neither. Every
 * record here is created by using the app, and every area is switched on by pressing
 * the control an owner would press.
 *
 * This file exists because the previous gate was reported GREEN on evidence that could
 * not have caught the problem: two finished domain slices passed every test against a
 * seeded corpus while being unreachable on the shipped build, because nothing in the
 * application wrote the record that makes a domain visible. Seeded state answers "does
 * the panel render". Only this answers "can the owner get to it".
 */

const PHONE = { width: 375, height: 812 };

const AREAS = {
  health: 'Health, recovery, and energy',
  career: 'Career and learning',
  fatherhood: 'Fatherhood and child development',
  emotional: 'Emotional state and relationships',
  faith: 'Faith and meaning',
} as const;

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
const areaPanel = (page: Page, label: string) => page.getByRole('region', { name: label });

async function switchOn(page: Page, label: string): Promise<void> {
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${label.toLowerCase()}` })
    .click();
  await expect(areaPanel(page, label)).toBeVisible();
}

async function switchOff(page: Page, label: string): Promise<void> {
  await manageAreas(page)
    .getByRole('button', { name: `Switch off ${label.toLowerCase()}` })
    .click();
  await expect(areaPanel(page, label)).toHaveCount(0);
}

/** How many records storage holds, read from Data & Privacy. */
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

/** Answers one area's own questions through its panel button. */
async function updateArea(page: Page, label: string): Promise<void> {
  await areaPanel(page, label).getByRole('button', { name: 'Update this area' }).click();
  const main = page.getByRole('main');
  await expect(main).toContainText('Update this area');

  for (let step = 0; step < 12; step += 1) {
    const scale = page.locator('.scale-step').first();
    if ((await scale.count()) > 0) await scale.click();
    const next = page.getByRole('button', { name: 'Next', exact: true });
    if ((await next.count()) === 0) break;
    await next.click();
  }

  const save = page.getByRole('button', { name: 'Save and close' });
  if ((await save.count()) > 0) await save.click();

  // Saving returns to the surface the guide was opened from, which is this one.
  await expect(manageAreas(page)).toBeVisible();
}

test.describe('a fresh profile can reach every built area', () => {
  test('offers exactly the five that exist, and names the two that do not', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');

    const manage = manageAreas(page);
    await expect(manage).toBeVisible();

    // Five switches, and only five.
    const switchable = manage.getByRole('button', { name: /^Switch (on|off) / });
    await expect(switchable).toHaveCount(5);
    for (const label of Object.values(AREAS)) {
      await expect(manage).toContainText(label);
    }

    // The other two are named honestly and carry no control at all.
    const notYet = manage.getByRole('list', { name: 'Areas that are not built yet' });
    for (const label of ['Home and environment', 'Money']) {
      await expect(notYet).toContainText(label);
    }
    await expect(notYet.getByRole('button')).toHaveCount(0);

    // And nothing is switched on to begin with.
    await expect(areaPanel(page, AREAS.health)).toHaveCount(0);
    await expect(areaPanel(page, AREAS.career)).toHaveCount(0);
  });

  test('switches both on, updates each, and keeps them after a reload', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');

    /* --- on ---------------------------------------------------------------- */
    await switchOn(page, AREAS.health);
    await switchOn(page, AREAS.career);

    // Each panel answers its own question and offers its own update.
    await expect(areaPanel(page, AREAS.health)).toContainText(
      'What is my capacity today, and what protects it?',
    );
    await expect(areaPanel(page, AREAS.career)).toContainText(
      'What is the exact next step, and what is blocking it?',
    );

    /* --- update ------------------------------------------------------------ */
    const beforeUpdates = await recordCount(page);
    await updateArea(page, AREAS.health);
    await updateArea(page, AREAS.career);

    const afterUpdates = await recordCount(page);
    expect(afterUpdates).toBeGreaterThan(beforeUpdates);

    /* --- reload ------------------------------------------------------------ */
    await page.reload();
    await expect(page.locator('.shell')).toBeVisible();
    await goTo(page, 'Direction');

    await expect(areaPanel(page, AREAS.health)).toBeVisible();
    await expect(areaPanel(page, AREAS.career)).toBeVisible();
    expect(await recordCount(page)).toBe(afterUpdates);
  });

  test('switches one off without losing anything, and restores it', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');

    await switchOn(page, AREAS.health);
    await updateArea(page, AREAS.health);

    const withEvidence = (
      await areaPanel(page, AREAS.health).locator('.kv-row').allTextContents()
    ).join(' | ');
    expect(withEvidence.length).toBeGreaterThan(0);
    const before = await recordCount(page);

    /* --- off: the panel goes, the records do not --------------------------- */
    await switchOff(page, AREAS.health);
    const afterOff = await recordCount(page);
    // Exactly one record more: the decision itself. Nothing was removed.
    expect(afterOff).toBe(before + 1);

    await page.reload();
    await goTo(page, 'Direction');
    await expect(areaPanel(page, AREAS.health)).toHaveCount(0);
    await expect(manageAreas(page)).toContainText(AREAS.health);

    /* --- on again: the same reading comes back ----------------------------- */
    await switchOn(page, AREAS.health);
    const restored = (
      await areaPanel(page, AREAS.health).locator('.kv-row').allTextContents()
    ).join(' | ');
    expect(restored).toBe(withEvidence);

    await page.reload();
    await goTo(page, 'Direction');
    await expect(areaPanel(page, AREAS.health)).toBeVisible();
  });

  test('says plainly that switching off deletes nothing', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');

    await expect(manageAreas(page)).toContainText('deletes nothing');
    await expect(manageAreas(page)).toContainText('switching it back on shows it again');
  });
});

test.describe('the decision surface is unchanged by any of it', () => {
  test('Now stays compact and names no area, with both switched on', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, AREAS.health);
    await switchOn(page, AREAS.career);

    await goTo(page, 'Now');
    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('manage areas');
    expect(text).not.toContain('areas of life');
    expect(text).not.toContain('optional move');
  });

  test('no horizontal overflow with the control on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, AREAS.career);

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

  test('every switch is a comfortable tap target', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');

    const boxes = await manageAreas(page)
      .getByRole('button')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          return { h: Math.round(rect.height), w: Math.round(rect.width) };
        }),
      );

    expect(boxes.length).toBe(5);
    for (const box of boxes) {
      expect(box.h).toBeGreaterThanOrEqual(44);
      expect(box.w).toBeGreaterThanOrEqual(44);
    }
  });
});
