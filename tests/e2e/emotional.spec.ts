import { expect, test, type Page } from '@playwright/test';

/**
 * Prompt 8E gate evidence: emotional state, social, and relationships, on screen.
 *
 * The assertions that matter are what never appears: a person, a rating, an
 * interpretation, and — above all — anything protected on a surface the owner did not
 * open himself.
 */

const PHONE = { width: 375, height: 812 };
const AREA = 'Emotional state and relationships';

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

const panel = (page: Page) => page.getByRole('region', { name: AREA });

/**
 * Opens the card's detail (`V33-015`, v3.3 B6).
 *
 * Direction shows a compact summary and keeps the rest behind `More`, one area open at a
 * time. Tests about the full panel contract open it, as the owner does.
 */
async function expandPanel(page: Page): Promise<void> {
  /*
   * Wait for the card, then click if it is there. A bare `count()` returns 0 while the
   * panel is still rendering — after a reload, for instance — and the guard then silently
   * skipped the click, so the test read a collapsed card and blamed the content. The wait
   * is tolerant rather than an assertion, because some callers reach here with the area
   * deliberately switched off, where no panel is the correct state.
   */
  await panel(page)
    .waitFor({ state: 'visible', timeout: 5000 })
    .catch(() => undefined);
  const more = panel(page).getByRole('button', { name: 'More detail', exact: true });
  if ((await more.count()) > 0) await more.click();
}

async function openArea(page: Page, scenario: string): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
  await goTo(page, 'Direction');
  await expect(panel(page)).toBeVisible();
  await expandPanel(page);
}

async function openPage(page: Page, scenario: string): Promise<void> {
  await openArea(page, scenario);
  await panel(page).getByRole('button', { name: 'Update this area' }).click();
  await expect(page.getByRole('region', { name: 'Connection' })).toBeVisible();
}

test.describe('the panel', () => {
  test('reads what happened, and rates nothing', async ({ page }) => {
    await openArea(page, 'emotional-enabled');

    await expect(panel(page)).toContainText(
      'What is interfering, and what connection is available?',
    );
    await expect(panel(page)).toContainText('Contact recorded on');
    await expect(panel(page)).toContainText('never rates a relationship');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}%/);
    await expect(page.getByRole('meter')).toHaveCount(0);
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('records why no percentage is shown', async ({ page }) => {
    await openArea(page, 'emotional-enabled');
    await expect(panel(page)).toContainText('How are my relationships doing?');
    await expect(panel(page)).toContainText('No percentage is shown here');
    await expect(panel(page)).toContainText('grade for a quiet fortnight');
  });

  test('offers repair once something has settled, and says nothing about them', async ({
    page,
  }) => {
    await openArea(page, 'emotional-unresolved');
    await expect(panel(page)).toContainText('once things are calm');

    const text = ((await panel(page).textContent()) ?? '').toLowerCase();
    for (const forbidden of [
      'they probably',
      'they were',
      'toxic',
      'gaslighting',
      'avoidant',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  test('says nothing when there is nothing to interrupt for', async ({ page }) => {
    await openArea(page, 'emotional-quiet');
    await expect(panel(page)).toContainText('No optional move here right now');
  });

  test('uses no clinical or blaming language, in any state', async ({ page }) => {
    for (const scenario of ['emotional-enabled', 'emotional-unresolved', 'emotional-quiet']) {
      await openArea(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      for (const forbidden of [
        'depress',
        'diagnos',
        'attachment style',
        'trauma response',
        'toxic',
        'self-sabotage',
        'you always',
        'should have',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});

test.describe('the area page', () => {
  test('shows every section at once, with structured controls', async ({ page }) => {
    await openPage(page, 'emotional-enabled');

    for (const section of [
      'Connection',
      'What you practised',
      'Boundaries',
      'Conflict and repair',
      'After a knock-back',
      'Private patterns',
      'Where sensitive topics may appear',
    ]) {
      await expect(page.getByRole('region', { name: section })).toBeVisible();
    }

    // No sequence, and nothing that demands typing.
    await expect(page.getByRole('main')).not.toContainText('Question 1 of');
    await expect(
      page.getByRole('region', { name: 'Connection' }).locator('textarea'),
    ).toHaveCount(0);
  });

  test('records one thing without walking any other', async ({ page }) => {
    await openPage(page, 'emotional-enabled');

    await page
      .getByRole('region', { name: 'What you practised' })
      .getByRole('button', { name: 'Made a plan with someone' })
      .click();

    // Still on the page, nothing else asked.
    await expect(page.getByRole('region', { name: 'Connection' })).toBeVisible();
    await expect(page.getByRole('main')).not.toContainText('Question 1 of');
  });

  test('still offers the guided flow', async ({ page }) => {
    await openPage(page, 'emotional-enabled');
    await page.getByRole('button', { name: 'Take me through it instead' }).click();
    await expect(page.getByRole('main')).toContainText('Question 1 of');
  });

  test('no horizontal overflow on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openPage(page, 'emotional-enabled');

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

test.describe('private patterns stay private', () => {
  test('are off, silent, and offer no note until switched on', async ({ page }) => {
    await openPage(page, 'emotional-enabled');

    const section = page.getByRole('region', { name: 'Private patterns' });
    await expect(section).toContainText('Switched off. Nothing is recorded');
    await expect(section.locator('textarea')).toHaveCount(0);
    await expect(
      section.getByRole('button', { name: 'Switch private patterns on' }),
    ).toBeVisible();
  });

  test('offer a note once on, and still no permission anywhere', async ({ page }) => {
    await openPage(page, 'emotional-enabled');

    const section = page.getByRole('region', { name: 'Private patterns' });
    await section.getByRole('button', { name: 'Switch private patterns on' }).click();
    await expect(section.locator('textarea')).toHaveCount(1);

    // Every surface is still denied.
    const permissions = page.getByRole('region', { name: 'Where sensitive topics may appear' });
    const pressed = await permissions
      .getByRole('button')
      .evaluateAll(
        (nodes) => nodes.filter((node) => node.getAttribute('aria-pressed') === 'true').length,
      );
    expect(pressed).toBe(0);
  });

  test('never reach a daily check-in', async ({ page }) => {
    await openArea(page, 'emotional-private');
    await goTo(page, 'Now');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toContain('Placeholder private note');
      expect(text).not.toContain('keep a note of');
      expect(text).not.toContain('unresolved with someone');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });

  test('are not offered in Quick Capture until switched on', async ({ page }) => {
    await openArea(page, 'emotional-enabled');
    await goTo(page, 'Now');

    const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
    if ((await bar.count()) > 0) {
      await bar.click();
    } else {
      await page.getByRole('button', { name: 'Note something down' }).click();
    }
    await expect(page.getByRole('button', { name: 'A private note' })).toHaveCount(0);
  });

  test('are offered in Quick Capture once the topic is on', async ({ page }) => {
    await openArea(page, 'emotional-private');
    await goTo(page, 'Now');

    const bar = page.locator('.capture-bar').getByRole('button', { name: 'Note it down' });
    if ((await bar.count()) > 0) {
      await bar.click();
    } else {
      await page.getByRole('button', { name: 'Note something down' }).click();
    }
    await expect(page.getByRole('button', { name: 'A private note' })).toBeVisible();
  });

  test('stay out of the readable export until the export surface is granted', async ({
    page,
  }) => {
    await openArea(page, 'emotional-private');
    await goTo(page, 'Data & Privacy');

    // Include the most private class explicitly, then preview.
    await page.getByRole('button', { name: 'private-pattern', exact: true }).click();
    await page.getByRole('button', { name: 'Preview export' }).click();

    const main = page.getByRole('main');
    await expect(main).not.toContainText('Placeholder private note');
  });
});

test.describe('emotional content never crowds Now', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();
    await seed(page, 'emotional-unresolved');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('emotional state and relationships');
    expect(text).not.toContain('unresolved with someone');
  });
});
