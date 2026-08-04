import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 7 Prompt 8D gate evidence: Fatherhood and child development, on screen.
 *
 * The assertions that matter here are absences. No percentage about a child, no grade,
 * no milestone question in a daily flow, and no word that would turn a father's notes
 * into an assessment.
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

async function open(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
}

/** Opens Quick Capture from whichever entry the current surface offers. */
async function openCapture(page: Page): Promise<void> {
  const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
  if ((await bar.count()) > 0) {
    await bar.click();
  } else {
    await page.getByRole('button', { name: 'Note something down' }).click();
  }
  await expect(page.getByRole('main')).toContainText('What kind of thing was it?');
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

const panel = (page: Page) =>
  page.getByRole('region', { name: 'Fatherhood and child development' });

async function openArea(page: Page, scenario: string): Promise<void> {
  await open(page, scenario);
  await goTo(page, 'Direction');
  await expect(panel(page)).toBeVisible();
}

test.describe('the fatherhood panel', () => {
  test('shows the shared contract with no number that grades anyone', async ({ page }) => {
    await openArea(page, 'fatherhood-enabled');

    await expect(panel(page)).toContainText('What did I practise, and what did I notice?');
    await expect(panel(page)).toContainText('Trajectory:');
    await expect(panel(page)).toContainText('needing less help than last time');

    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toMatch(/\b\d{1,3}%/);
    expect(text).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('records why no percentage is shown, rather than just omitting one', async ({
    page,
  }) => {
    await openArea(page, 'fatherhood-enabled');

    await expect(panel(page)).toContainText('How far along is she?');
    await expect(panel(page)).toContainText('No percentage is shown here');
    await expect(panel(page)).toContainText('would be a score for a child');
  });

  test('shows one skill on its ladder, marked for assistive technology', async ({ page }) => {
    await openArea(page, 'fatherhood-enabled');

    await expect(panel(page)).toContainText('How much help does');
    const rung = panel(page).locator('li[aria-current="step"]');
    await expect(rung).toHaveCount(1);
    await expect(rung).toContainText('Doing sometimes');
  });

  test('never uses assessment or blame language, in any state', async ({ page }) => {
    for (const scenario of ['fatherhood-enabled', 'fatherhood-concern', 'fatherhood-quiet']) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      for (const forbidden of [
        'percentile',
        'on track',
        'delayed',
        'diagnos',
        'developmental age',
        'normal range',
        'bad parent',
        'should have',
        'neglect',
        'failed to',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
    }
  });

  test('names the checklist and its version beside each answer', async ({ page }) => {
    await openArea(page, 'fatherhood-enabled');
    await expect(panel(page)).toContainText('General guidance (built in)');
    await expect(panel(page)).toContainText('2026-08');
  });
});

test.describe('the safety boundary', () => {
  test('stops having a view when something noticed has not gone away', async ({ page }) => {
    await openArea(page, 'fatherhood-concern');

    await expect(panel(page)).toContainText('health visitor or GP');

    // Scoped to this panel: the rule is about what this domain says. Ordinary copy
    // elsewhere on Direction legitimately contains phrases like "could be".
    const text = ((await panel(page).textContent()) ?? '').toLowerCase();
    for (const forbidden of ['could be', 'sounds like', 'may indicate', 'symptom of']) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  test('says nothing at all when there is nothing to interrupt for', async ({ page }) => {
    await openArea(page, 'fatherhood-quiet');
    await expect(panel(page)).toContainText('No optional move here right now');
  });
});

test.describe('Update This Area, for fatherhood', () => {
  test('asks its own questions and never lengthens the morning', async ({ page }) => {
    await openArea(page, 'fatherhood-enabled');
    await panel(page).getByRole('button', { name: 'Update this area' }).click();

    /*
     * Since Prompt 8D.2 this opens the scan-friendly map. The guided one-question-at-a-
     * time flow is still here and still owns the same questions — it is now reached from
     * the map, for an owner who would rather be led than scan.
     */
    await expect(
      page.getByRole('region', { name: 'Child development and learning map' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Take me through it instead' }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText('Update this area');
    await expect(main).toContainText('Did you spend time together since last time?');

    let sawMilestone = false;
    for (let step = 0; step < 10; step += 1) {
      const text = (await main.textContent()) ?? '';
      if (text.includes('Have you seen her do this?')) sawMilestone = true;
      expect(text).not.toContain('How many minutes are genuinely free');
      expect(text).not.toContain('Have you studied or practised');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
    expect(sawMilestone).toBe(true);
  });

  test('the morning check-in never asks about a milestone', async ({ page }) => {
    await open(page, 'fatherhood-enabled');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toContain('Have you seen her do this?');
      expect(text).not.toContain('How much help did she need');
      expect(text).not.toContain('Did you spend time together');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });
});

test.describe('Quick Capture offers the moment only when the area is on', () => {
  test('offers it once fatherhood is switched on', async ({ page }) => {
    await open(page, 'fatherhood-enabled');
    await openCapture(page);

    await expect(page.getByRole('button', { name: 'A moment with my daughter' })).toBeVisible();
  });

  test('does not offer it when the area is off', async ({ page }) => {
    await open(page, 'career-proven-claim');
    await openCapture(page);

    await expect(page.getByRole('button', { name: 'A moment with my daughter' })).toHaveCount(
      0,
    );
  });

  test('writes one record that reaches Timeline and the panel', async ({ page }) => {
    await open(page, 'fatherhood-enabled');
    await openCapture(page);
    await page.getByRole('button', { name: 'A moment with my daughter' }).click();
    await page.locator('#capture-what').fill('She put both shoes on the right feet');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.locator('.guide-bar')).toBeVisible();

    const stored = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter(
        (record) =>
          'attribute' in record &&
          typeof record.attribute === 'string' &&
          record.attribute.startsWith('capture:fatherhood:'),
      );
    });
    // One new record beside the one the scenario seeded. Never two for one event.
    expect(stored).toHaveLength(2);
    expect(JSON.stringify(stored)).toContain('"privacy":"child"');

    await goTo(page, 'Timeline');
    await expect(page.getByRole('main')).toContainText('She put both shoes on the right feet');
  });
});

test.describe('fatherhood never crowds the decision surface', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'fatherhood-concern');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('fatherhood and child development');
    expect(text).not.toContain('areas of life');
    expect(text).not.toContain('optional move');
  });

  test('no horizontal overflow with the panel on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openArea(page, 'fatherhood-enabled');

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
