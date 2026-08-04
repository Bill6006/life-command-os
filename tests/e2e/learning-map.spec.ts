import { expect, test, type Page } from '@playwright/test';

/**
 * Prompt 8D.2 gate evidence: the Child Development and Learning Map, on screen.
 *
 * The point of the screen is speed — everything relevant visible at once, one thing
 * updated without touching the rest. The point of these tests is what it refuses to do
 * with that reach: nothing moves without the owner, nothing is removed, and no number
 * describes his daughter.
 */

const PHONE = { width: 375, height: 812 };

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

const SECTIONS = [
  'Language and early reading',
  'Numbers and thinking',
  'Motor skills',
  'Social and emotional skills',
  'Independence and practical life',
  'Creativity and play',
];

/** Opens the map the way the owner does: Direction, the panel, Update this area. */
async function openMap(page: Page, scenario = 'fatherhood-learning-map'): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
  await goTo(page, 'Direction');
  await page
    .getByRole('region', { name: 'Fatherhood and child development' })
    .getByRole('button', { name: 'Update this area' })
    .click();
  await expect(
    page.getByRole('region', { name: 'Child development and learning map' }),
  ).toBeVisible();
}

const row = (page: Page, label: string) => page.locator('li.skill', { hasText: label });

test.describe('the map is complete and fast to scan', () => {
  test('shows all six sections at once', async ({ page }) => {
    await openMap(page);
    for (const section of SECTIONS) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }
  });

  test('shows every currently relevant skill together, without a sequence', async ({
    page,
  }) => {
    await openMap(page);

    // Many rows, one page, and no "Question 1 of n" anywhere.
    const rows = page.locator('li.skill');
    expect(await rows.count()).toBeGreaterThan(8);
    await expect(page.getByRole('main')).not.toContainText('Question 1 of');
    await expect(page.getByRole('main')).toContainText('leave the rest alone');
  });

  test('highlights only what needs attention', async ({ page }) => {
    await openMap(page);

    const highlighted = page.locator('li.skill-highlighted');
    const all = page.locator('li.skill');
    expect(await highlighted.count()).toBeLessThan(await all.count());

    await expect(row(page, 'Taking turns in a game')).toContainText('Possible progression');
  });

  test('updates one skill without walking any other', async ({ page }) => {
    await openMap(page);

    const target = row(page, 'Naming what she is feeling');
    await target.getByRole('button', { name: 'Update' }).click();
    await target
      .getByRole('group', { name: /^Level for/ })
      .getByRole('button', { name: 'Doing often' })
      .click();

    // Straight back to the map, with that one row changed and nothing else asked.
    await expect(row(page, 'Naming what she is feeling')).toContainText('Doing often');
    await expect(page.getByRole('main')).not.toContainText('Question 1 of');
  });

  test('needs no typing at all', async ({ page }) => {
    await openMap(page);

    const target = row(page, 'Taking turns in a game');
    await target.getByRole('button', { name: 'Update' }).click();

    // Every control is a button; the only text field is explicitly optional.
    const notes = target.locator('textarea');
    await expect(notes).toHaveCount(1);
    await expect(target).toContainText('optional');
    expect(await target.getByRole('button').count()).toBeGreaterThan(10);
  });
});

test.describe('progression is suggested, approved, and never assumed', () => {
  test('offers four responses and states what it rests on', async ({ page }) => {
    await openMap(page);
    const target = row(page, 'Taking turns in a game');

    await expect(target).toContainText('Suggestion: move to');
    await expect(target).toContainText('separate days');
    await expect(target).toContainText('nothing changes unless you say so');

    for (const label of [
      'Approve progression',
      'Keep current level',
      'Review evidence',
      'Not now',
    ]) {
      await expect(target.getByRole('button', { name: label })).toHaveCount(1);
    }
  });

  test('moves exactly one rung when approved', async ({ page }) => {
    await openMap(page);
    const target = row(page, 'Taking turns in a game');
    await expect(target).toContainText('Needs support');

    await target.getByRole('button', { name: 'Approve progression' }).click();

    await expect(row(page, 'Taking turns in a game')).toContainText('Doing sometimes');
    // One rung, not two — "doing often" was in the evidence and is not where she landed.
    await expect(row(page, 'Taking turns in a game')).not.toContainText('Doing often');
  });

  test('changes nothing when the owner keeps the current level', async ({ page }) => {
    await openMap(page);
    await row(page, 'Taking turns in a game')
      .getByRole('button', { name: 'Keep current level' })
      .click();

    await expect(row(page, 'Taking turns in a game')).toContainText('Needs support');

    const levels = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter(
        (record) => 'attribute' in record && record.attribute === 'father:skill:taking-turns',
      ).length;
    });
    // Still the single level the scenario seeded. Declining recorded nothing.
    expect(levels).toBe(1);
  });
});

test.describe('age bands add and never remove', () => {
  test('brings new skills into view and keeps what was recorded', async ({ page }) => {
    await openMap(page);
    await expect(row(page, 'Taking turns in a game')).toBeVisible();

    await page
      .getByRole('group', { name: 'Current age band' })
      .getByRole('button', { name: 'Around 4–5 years' })
      .click();

    // The skill left the band, kept its level, and says so.
    const kept = row(page, 'Taking turns in a game');
    await expect(kept).toBeVisible();
    await expect(kept).toContainText('kept from an earlier age band');
    await expect(kept).toContainText('Needs support');

    // And something new arrived.
    await expect(row(page, 'Recognising her own name written down')).toBeVisible();
  });

  test('says plainly that nothing is removed', async ({ page }) => {
    await openMap(page);
    await expect(
      page.getByRole('region', { name: 'Child development and learning map' }),
    ).toContainText('Nothing is removed');
  });
});

test.describe('what the map never shows', () => {
  test('renders no grade, score, percentage, ranking, or comparison', async ({ page }) => {
    await openMap(page);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    for (const forbidden of [
      'percentile',
      'score',
      'grade',
      'ranking',
      'compared with',
      'than other children',
      'other children her age',
      'on track',
      'delayed',
      'average for',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('keeps official milestones out of the personal map', async ({ page }) => {
    await openMap(page);
    const text = (await page.getByRole('main').textContent()) ?? '';

    expect(text).not.toContain('Have you seen her do this?');
    expect(text).not.toContain('Was doing it, not now');
    expect(text.toLowerCase()).not.toContain('checklist');
  });

  test('still offers the guided flow for someone who would rather be led', async ({ page }) => {
    await openMap(page);
    await page.getByRole('button', { name: 'Take me through it instead' }).click();

    await expect(page.getByRole('main')).toContainText('Question 1 of');
    await expect(page.getByRole('main')).toContainText(
      'Did you spend time together since last time?',
    );
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
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
