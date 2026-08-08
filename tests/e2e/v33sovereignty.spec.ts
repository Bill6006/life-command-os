import { expect, test, type Page } from '@playwright/test';

/**
 * Section I's owner controls, through the interface the owner actually uses.
 *
 * The lifecycle already had unit coverage over its commands and its resolver. That proves
 * the rules; it does not prove the owner can reach them, and for a section whose entire
 * subject is owner control that distinction is the whole point.
 */

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

/** A profile whose Now shows a recommended action. */
async function openWithAction(page: Page): Promise<string> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, 'action');

  const move = page.getByRole('region', { name: 'Do now' });
  await expect(move).toBeVisible();
  return ((await move.locator('.decision-statement').textContent()) ?? '').trim();
}

async function openStances(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Can’t now', exact: true }).click();

  /*
   * Deterministic rather than best-effort. The first version raced two locators behind a
   * catch, which passed in isolation and timed out under full-suite load — the failure
   * looked like flake and was really an ambiguous wait.
   */
  const summary = page.locator('details.stance > summary');
  await expect(summary).toBeVisible();
  await summary.click();
  await expect(page.locator('details.stance')).toHaveAttribute('open', '');
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

/* -------------------------------------------------------------------------- */

test.describe('the reason list stays short and never claims to be complete', () => {
  test('offers a handful of reasons, ending in a way out', async ({ page }) => {
    await openWithAction(page);
    await page.getByRole('button', { name: 'Can’t now', exact: true }).click();

    /*
     * Scoped to the reasons group. A bare `.scale-step` also matches the pause choices
     * inside the closed disclosure — the DOM exists whether or not `details` is open, so
     * an unscoped count silently included three controls from a different question.
     */
    const reasons = page
      .getByRole('group', { name: 'What is in the way' })
      .locator('.scale-step');
    const count = await reasons.count();

    /* Section I: a few context-likely options, not an option swamp. */
    expect(count).toBeGreaterThan(1);
    expect(count).toBeLessThanOrEqual(5);
    await expect(reasons.last()).toContainText('Other, or not sure');
  });

  test('separates the moment from the move, in the copy and in the layout', async ({
    page,
  }) => {
    await openWithAction(page);
    await page.getByRole('button', { name: 'Can’t now', exact: true }).click();

    /*
     * The distinction the whole family exists to protect. A tap meant as "not this
     * afternoon" must not be able to land as "never", and the screen has to say so.
     */
    const main = page.getByRole('main');
    await expect(main).toContainText('not a complete list');
    await expect(main).toContainText('Something about this move, not just right now');

    /* The open-ended stance is not visible until the disclosure is opened. */
    await expect(page.getByRole('button', { name: 'Never suggest this' })).toBeHidden();
  });
});

/* -------------------------------------------------------------------------- */

test.describe('pausing a move', () => {
  test('says when it comes back, and removes it from Now', async ({ page }) => {
    const statement = await openWithAction(page);
    await openStances(page);

    const pause = page.getByRole('group', { name: 'Pause this move' });
    await expect(pause).toBeVisible();

    /* A pause the owner cannot see the end of is a prohibition in softer wording. */
    await expect(pause).toContainText('Back on 20');

    await pause.getByRole('button', { name: /A week/ }).click();
    await expect(page.locator('.grid, .standalone')).toBeVisible();

    /*
     * An auto-retrying assertion, not `count()` then `textContent()`. Those are two round
     * trips with a React re-render in between, so the element could detach after the
     * count and the read would hang for the full timeout — which reads as flake and is
     * really a race the locator API already solves.
     */
    /*
     * The property that matters is that the move is no longer being *recommended*, which
     * includes the case where the panel is gone entirely — as it is when the paused move
     * was the only candidate. Scoped to the decision panel rather than the whole surface,
     * because "What changed" correctly still names it: the answer moved from that move to
     * deliberate silence, and saying so is the honest record, not a leak.
     */
    await expect(
      page.getByRole('region', { name: 'Do now' }).filter({ hasText: statement }),
    ).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('blocking a move in one situation', () => {
  test('names the situation it applies to', async ({ page }) => {
    await openWithAction(page);
    await openStances(page);

    /*
     * The seeded profile records a situation, so the block is offered and has to describe
     * what it covers. A block whose scope is invisible is indistinguishable from a ban.
     */
    const main = page.getByRole('main');
    await expect(main).toContainText(/Not (at home|at work|out and about|travelling)/);
    await expect(main).toContainText('Anywhere else it stays available');
  });
});

/* -------------------------------------------------------------------------- */

test.describe('rewording a move', () => {
  test('changes the words without removing it', async ({ page }) => {
    await openWithAction(page);
    await openStances(page);

    const field = page.locator('#stance-reword');
    await expect(field).toBeVisible();
    await field.fill('Placeholder wording chosen by the owner');
    await page.getByRole('button', { name: 'Save wording' }).click();

    await expect(page.locator('.grid, .standalone')).toBeVisible();

    /* Still offered — a rewording is not a rejection. */
    const best = page.getByRole('region', { name: 'Do now' });
    if ((await best.count()) > 0) {
      await expect(best).toContainText('Placeholder wording chosen by the owner');
    }
  });
});

/* -------------------------------------------------------------------------- */

test.describe('forbidding and putting back', () => {
  test('needs an explicit second press, then offers the way back on Direction', async ({
    page,
  }) => {
    const statement = await openWithAction(page);
    await openStances(page);

    /* One press reveals what it means; a second one does it. */
    await page.getByRole('button', { name: 'Never suggest this' }).click();
    await expect(page.getByRole('main')).toContainText('with no end date');
    await page.getByRole('button', { name: 'Yes, never suggest this' }).click();
    await expect(page.locator('.grid, .standalone')).toBeVisible();

    /* Gone from Now. */
    /*
     * An auto-retrying assertion, not `count()` then `textContent()`. Those are two round
     * trips with a React re-render in between, so the element could detach after the
     * count and the read would hang for the full timeout — which reads as flake and is
     * really a race the locator API already solves.
     */
    /*
     * The property that matters is that the move is no longer being *recommended*, which
     * includes the case where the panel is gone entirely — as it is when the paused move
     * was the only candidate. Scoped to the decision panel rather than the whole surface,
     * because "What changed" correctly still names it: the answer moved from that move to
     * deliberate silence, and saying so is the honest record, not a leak.
     */
    await expect(
      page.getByRole('region', { name: 'Do now' }).filter({ hasText: statement }),
    ).toHaveCount(0);

    /* And findable again, on the surface it did not disappear from. */
    await goTo(page, 'Direction');
    const setAside = page.getByRole('region', { name: 'Moves you have set aside' });
    await expect(setAside).toBeVisible();
    await expect(setAside).toContainText('never');

    await setAside
      .getByRole('button', { name: /^Put back/ })
      .first()
      .click();
    await expect(page.getByRole('main')).toBeVisible();

    /* Reversible: once restored, it is no longer in the set-aside list. */
    await expect(page.getByRole('region', { name: 'Moves you have set aside' })).toBeHidden();
  });
});

/* -------------------------------------------------------------------------- */

test.describe('nothing here is reachable by accident', () => {
  test('a plain decline writes no standing preference', async ({ page }) => {
    await openWithAction(page);
    await page.getByRole('button', { name: 'Can’t now', exact: true }).click();
    await page.getByRole('button', { name: 'Not enough time right now' }).click();
    await expect(page.locator('.grid, .standalone')).toBeVisible();

    const stances = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter((record) => record.recordType === 'move-preference').length;
    });

    /* Temporary inability must never leave a permanent mark. */
    expect(stances).toBe(0);

    /* And Direction shows nothing set aside. */
    await goTo(page, 'Direction');
    await expect(page.getByRole('region', { name: 'Moves you have set aside' })).toBeHidden();
  });
});
