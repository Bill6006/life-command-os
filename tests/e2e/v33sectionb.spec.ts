import { expect, test, type Page } from '@playwright/test';

/**
 * Section B, the surfaces finished in this pass: B3, B4, B6, B8, B9.
 *
 * Written against interaction rather than initial render. The uncontrolled `<details>`
 * defect that shipped earlier in this pass looked perfect on first paint and broke the
 * moment anything was written — so where a control has state, these drive a real write and
 * check the state afterwards.
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

async function open(page: Page, scenario?: string): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  if (scenario !== undefined) await seed(page, scenario);
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

/** Nothing on any surface may scroll the page sideways on a phone. */
async function noSidewaysScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

/* -------------------------------------------------------------------------- */

test.describe('B3 · supporting minimum wins never become a task list', () => {
  test('keeps one move dominant and offers at most three asides', async ({ page }) => {
    await open(page, 'action');

    const move = page.getByRole('region', { name: 'Do now' });
    await expect(move).toBeVisible();

    /* Exactly one decision statement. A second would be a second recommendation. */
    await expect(move.locator('.decision-statement')).toHaveCount(1);

    const wins = move.locator('.supporting-list li');
    expect(await wins.count()).toBeLessThanOrEqual(3);

    /* And if any are shown, they are framed as spare room, not as work owed. */
    if ((await wins.count()) > 0) {
      await expect(move.locator('.supporting-label')).toContainText('If there is room');
    }
  });

  test('offers no asides at all on a fresh profile', async ({ page }) => {
    await open(page);
    /* Nothing recorded means nothing to fit around. Zero is the normal case. */
    await expect(page.locator('.supporting-list')).toHaveCount(0);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('B4 · weekly direction says what it is and what it costs', () => {
  async function openWeekly(page: Page): Promise<void> {
    await page.getByRole('button', { name: 'This week’s direction' }).first().click();
    await expect(page.getByRole('region', { name: /Weekly direction/ })).toBeVisible();
  }

  test('names the kind, the floor, and what to protect', async ({ page }) => {
    await open(page, 'weekly-direction');
    await openWeekly(page);

    const card = page.getByRole('region', { name: /Weekly direction/ });
    await expect(card).toContainText(/One focus|Deliberately quiet/);
    await expect(card).toContainText('Minimum win');
    await expect(card).toContainText('Protect');
    await expect(card).toContainText(/evidence|confidence/i);
  });

  test('offers all four controls, and says when snooze returns', async ({ page }) => {
    await open(page, 'weekly-direction');
    await openWeekly(page);

    const card = page.getByRole('region', { name: /Weekly direction/ });
    for (const label of ['Confirm', 'Set a direction instead', 'Snooze', 'Skip']) {
      await expect(card.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    /* A snooze whose return date is invisible is indistinguishable from a dismissal. */
    await expect(card).toContainText(/Snooze asks again on \d{4}-\d{2}-\d{2}/);
    await expect(card).toContainText('Skip records only that you skipped it');
  });

  test('keeps details collapsed until asked for', async ({ page }) => {
    await open(page, 'weekly-direction');
    await openWeekly(page);

    const why = page.locator('.why-this');
    await expect(why).toBeVisible();
    await expect(why).not.toHaveAttribute('open', '');

    await why.locator('summary').click();
    await expect(why).toHaveAttribute('open', '');
    await expect(why).toContainText('Last week');
  });

  test('Confirm actually records something and returns to Now', async ({ page }) => {
    await open(page, 'weekly-direction');
    await openWeekly(page);

    const before = await countRecords(page, 'weekly-direction');
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.locator('.grid, .standalone')).toBeVisible();

    /* Visibly functional means a write happened, not that the button moved. */
    expect(await countRecords(page, 'weekly-direction')).toBeGreaterThan(before);
  });

  test('a deliberately quiet week is offered as a choice, not a shrug', async ({ page }) => {
    await open(page, 'quiet-week');
    await openWeekly(page);

    const card = page.getByRole('region', { name: /Weekly direction/ });
    await expect(card).toContainText('Deliberately quiet');
    await expect(card).toContainText('not for lack of an idea');
    /* And it gets the same say over it as a focus week does. */
    await expect(card.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
  });
});

async function countRecords(page: Page, recordType: string): Promise<number> {
  return page.evaluate(async (type) => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    const records = await bridge.listAllRecords();
    return records.filter((record) => record.recordType === type).length;
  }, recordType);
}

/* -------------------------------------------------------------------------- */

test.describe('B6 · Direction is compact and opens one area at a time', () => {
  test('shows the decision-useful lines and keeps the rest collapsed', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const area = page.getByRole('region', { name: 'Career and learning' });
    await expect(area).toBeVisible();

    /* Condition, what is in the way, and a move-or-no-move. */
    await expect(area).toContainText('In the way');
    await expect(area).toContainText(/Optional move|No optional move/);

    /* The detail is not on the page until asked for. */
    await expect(area.locator('.domain-detail')).toHaveCount(0);
    await expect(area.getByRole('button', { name: 'More detail' })).toBeVisible();
  });

  test('opening one area closes whichever was open', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');

    const jump = page.getByRole('navigation', { name: 'Jump to an area' });
    await expect(jump).toBeVisible();

    const buttons = jump.getByRole('button');
    const count = await buttons.count();
    test.skip(count < 2, 'needs at least two areas to prove exclusivity');

    await buttons.nth(0).click();
    await expect(page.locator('.domain-detail')).toHaveCount(1);

    await buttons.nth(1).click();
    /* Still exactly one — opening the second closed the first. */
    await expect(page.locator('.domain-detail')).toHaveCount(1);
  });

  test('does not scroll sideways on a phone with every area on', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Direction');
    await noSidewaysScroll(page);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('B8 · Review is a compact summary with real badges', () => {
  test('badges freshness and quiet rather than running them into a sentence', async ({
    page,
  }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Review');

    const scan = page.getByRole('list', { name: 'Weekly domain scan' });
    await expect(scan).toBeVisible();

    /* At least one row carries a badge, and badges carry their own word. */
    const badges = scan.locator('.badge');
    expect(await badges.count()).toBeGreaterThan(0);
    await expect(badges.first()).toHaveText(/Fresh|Ageing|Stale|Quiet/);
  });

  test('keeps text and controls apart on a phone', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Review');
    await noSidewaysScroll(page);

    /* Every control in a scan row is a real target. */
    const boxes = await page
      .getByRole('list', { name: 'Weekly domain scan' })
      .getByRole('button')
      .evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().height)),
      );
    expect(boxes.length).toBeGreaterThan(0);
    for (const height of boxes) expect(height).toBeGreaterThanOrEqual(44);
  });

  test('shows no score, percentage, or grade anywhere', async ({ page }) => {
    await open(page, 'domain-enabled');
    await goTo(page, 'Review');

    const text = (await page.getByRole('main').innerText()).toLowerCase();
    expect(text).not.toMatch(/\b\d{1,3}\s?%/);
    expect(text).not.toMatch(/\bscore\b|\bgrade\b|\bout of 10\b/);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('B9 · Learning leads with what was learned', () => {
  test('opens with the summary, not with a chart', async ({ page }) => {
    await open(page, 'action');
    await goTo(page, 'Learning');

    const summary = page.getByRole('region', { name: 'What has been learned' });
    await expect(summary).toBeVisible();

    /* It is the first panel on the surface. */
    const first = page.getByRole('main').locator('.panel').first();
    await expect(first).toContainText('What has been learned');
  });

  test('draws no charts at all on a fresh profile', async ({ page }) => {
    await open(page);
    await goTo(page, 'Learning');

    /*
     * A chart of nothing implies a finding was looked for and found. A profile with no
     * records has none, so there are no figures — and no panel claiming otherwise.
     */
    await expect(page.getByRole('main').locator('figure')).toHaveCount(0);
  });

  test('says so plainly on a sparse profile that has records but no findings', async ({
    page,
  }) => {
    /*
     * The case a fresh profile cannot cover: enough recorded for the surface to render,
     * not enough for anything to have been learned. This is where an empty chart would
     * previously have appeared.
     */
    await open(page, 'one-question');
    await goTo(page, 'Learning');

    await expect(page.getByRole('region', { name: 'What has been learned' })).toContainText(
      'Nothing yet',
    );
    await expect(page.getByRole('main').locator('figure')).toHaveCount(0);
  });

  test('keeps any finding it does have collapsed', async ({ page }) => {
    await open(page, 'action');
    await goTo(page, 'Learning');

    const findings = page.locator('.finding-detail');
    for (let index = 0; index < (await findings.count()); index += 1) {
      await expect(findings.nth(index)).not.toHaveAttribute('open', '');
    }
  });

  test('does not scroll sideways on a phone', async ({ page }) => {
    await open(page, 'action');
    await goTo(page, 'Learning');
    await noSidewaysScroll(page);
  });
});
