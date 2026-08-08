import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 6 Prompt 7A gate evidence: the controls are real.
 *
 * Everything here drives the interface the owner uses — no scenario picker, no
 * injected view models — and then **reloads the page** before asserting. That reload
 * is the whole point. A control that appears to work until you refresh is the exact
 * failure this phase exists to close.
 */

const PHONE = { width: 375, height: 812 };

async function seed(page: Page, scenario: string): Promise<void> {
  // The bridge is loaded by a dynamic import, so it may not exist on first paint.
  await page.waitForFunction(() => globalThis.__lifeCommandOsDiagnostics !== undefined);
  const issues = await page.evaluate(async (scenarioId) => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    await bridge.resetLocalData();
    if (scenarioId === '') return [];
    return (await bridge.seedScenario(scenarioId)).issues;
  }, scenario);
  expect(issues, `seeding ${scenario}`).toEqual([]);
  await page.reload();
  await expect(page.locator('.grid, .standalone')).toBeVisible();
}

async function open(page: Page, scenario = 'action'): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
  await seed(page, scenario);
}

/**
 * Waits for a write made *inside a flow* to commit.
 *
 * The shell leaves the guide, decline, outcome, or capture surface only after the
 * transaction has committed and the records have been re-read — so the guide bar,
 * which exists only on the console, reappearing is a genuine settle signal.
 *
 * **It is not a settle signal for a write made from the console**, because the guide
 * bar never went away. Those need something that only exists after the write; see
 * `settledOnConsole`. Getting this wrong is what made one test pass alone and fail
 * under parallel load.
 */
async function settled(page: Page): Promise<void> {
  await expect(page.locator('.guide-bar')).toBeVisible();
}

/**
 * Waits for a write made from the console itself.
 *
 * The follow-up control renders only when an open decision episode exists, so it
 * cannot appear until the execution has actually been stored and re-read.
 */
async function settledOnConsole(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: /Record outcome/ })).toBeVisible();
}

/** Record types currently in local storage. Read through the application layer. */
async function storedTypes(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const bridge = globalThis.__lifeCommandOsDiagnostics;
    if (bridge === undefined) throw new Error('Test bridge is not installed');
    const records = await bridge.listAllRecords();
    return records.map((record) => record.recordType);
  });
}

test.describe('the scenario picker is gone from the owner experience', () => {
  test('no scenario selector exists anywhere on the page', async ({ page }) => {
    await open(page);

    expect(await page.locator('#scenario').count()).toBe(0);
    expect(await page.locator('.proto').count()).toBe(0);

    // And nothing else offers a menu of synthetic states either.
    const selects = await page.locator('select').count();
    expect(selects).toBe(0);
  });
});

test.describe('Start writes a real decision episode', () => {
  test('persists the recommendation, the execution, and survives a reload', async ({
    page,
  }) => {
    await open(page);
    expect(await storedTypes(page)).not.toContain('recommendation');

    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await settledOnConsole(page);

    const types = await storedTypes(page);
    expect(types).toContain('candidate-action');
    expect(types).toContain('recommendation');
    expect(types).toContain('execution');

    // Reload: the open loop is still there, offered as a follow-up rather than lost.
    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();
    await expect(page.getByRole('button', { name: /Record outcome/ })).toBeVisible();
  });
});

test.describe('Can’t Now creates a constraint', () => {
  test('offers only circumstances, and changes what happens next', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Can’t now', exact: true }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText('What is in the way?');
    await expect(main).toContainText(/not recorded as evidence that the suggestion was wrong/i);

    // No reason on the list blames the owner.
    const reasons = (await page.locator('.scale-choices .scale-step').allTextContents()).join(
      ' ',
    );
    expect(reasons.toLowerCase()).not.toMatch(/lazy|excuse|procrastinat|discipline|failed/);

    await page.getByRole('button', { name: 'Not enough time' }).click();
    await settled(page);

    const types = await storedTypes(page);
    expect(types).toContain('execution');
    expect(types).toContain('context-snapshot');

    // The constraint took effect: free time is now unresolved, so the engine's honest
    // response is to ask how much there is rather than to suggest into the dark.
    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();
    await expect(page.getByRole('main')).toContainText(/How many minutes are genuinely free/i);
  });
});

test.describe('the guides', () => {
  test('ask one question at a time and stay within the budget', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);

    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText(/Question 1 of/);
    await expect(main).toContainText(/within the 5-response budget/);

    // Exactly one question is primary at any moment.
    expect(await page.locator('.decision-statement').count()).toBe(1);
  });

  test('nothing is preselected, and a skipped question stores nothing', async ({ page }) => {
    await open(page);
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    // No anchor starts pressed. An untouched control is Unknown, not a midpoint.
    expect(await page.locator('.scale-step[aria-pressed="true"]').count()).toBe(0);
    await expect(page.getByRole('main')).toContainText(/Nothing is selected until you pick/);

    const before = (await storedTypes(page)).length;
    await page.getByRole('button', { name: 'Skip this' }).click();
    await page.getByRole('button', { name: 'Stop here' }).click();
    await settled(page);

    // One new record: the session. No placeholder observation was invented.
    const after = await storedTypes(page);
    expect(after.length).toBe(before + 1);
    expect(after.filter((type) => type === 'guide-session')).toHaveLength(1);
  });

  test('an answered scale survives a reload and is not asked again', async ({ page }) => {
    await open(page);
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    // Answer the first question, then close the guide.
    await page.locator('.scale-step').first().click();
    await page.getByRole('button', { name: 'Stop here' }).click();
    await settled(page);

    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();

    const types = await storedTypes(page);
    expect(types).toContain('guide-session');
    expect(types).toContain('observation');

    const stored = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter(
        (record) =>
          record.recordType === 'observation' &&
          (record as { attribute?: string }).attribute?.startsWith('state:') === true,
      );
    });
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0]).toMatchObject({
      value: { kind: 'anchored-scale', scaleVersion: 1 },
    });
  });

  test('never asks why, what caused it, whether it worked, or how it felt', async ({
    page,
  }) => {
    await open(page);

    for (const entry of ['Open'] as const) {
      await page.locator('.guide-bar').getByRole('button', { name: entry }).click();

      // Walk the whole guide, reading every question it puts on screen.
      for (let step = 0; step < 8; step += 1) {
        const text = (await page.getByRole('main').textContent()) ?? '';
        expect(text).not.toMatch(/why (did|do|are|were|was|is) you\b/i);
        expect(text).not.toMatch(/what caused/i);
        expect(text).not.toMatch(/did (this|that|it) (work|help)\b/i);
        expect(text).not.toMatch(/how did (this|that|it) make you feel/i);

        const next = page.getByRole('button', { name: 'Next', exact: true });
        if ((await next.count()) === 0) break;
        await next.click();
      }
    }
  });

  test('offers no length control, because length is not the owner’s to set', async ({
    page,
  }) => {
    /*
     * `15 min / 30 min / 45 min / Full` used to sit at the foot of every guide, mapping to
     * a question count. It is gone: how much a check-in asks follows decision value,
     * coverage, and existing evidence, none of which the owner is placed to predict.
     */
    await open(page);
    await page.locator('.guide-bar').getByRole('button', { name: /^Open/ }).click();
    await expect(page.getByRole('main')).toContainText(/Question 1 of/);

    for (const label of ['15 min', '30 min', '45 min', 'Full']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
    }
    await expect(page.locator('.depth-step')).toHaveCount(0);
  });
});

test.describe('recording what happened', () => {
  test('asks observable questions and leaves the outcome unresolved without one', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await settledOnConsole(page);
    await page.getByRole('button', { name: /Record outcome/ }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText('Did you finish it?');
    await expect(main).toContainText('About how long did you continue?');
    await expect(main).toContainText('Is the original problem still getting in the way?');
    await expect(main).toContainText(/never counted as “no effect”/);

    // Save with nothing observable answered.
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await settled(page);
    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();

    const outcome = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.find((record) => record.recordType === 'outcome');
    });
    expect(outcome).toMatchObject({ result: { status: 'unresolved' } });
  });
});

test.describe('quick capture', () => {
  test('writes one canonical event that survives a reload', async ({ page }) => {
    await open(page);

    await page.locator('.capture-bar').getByRole('button', { name: 'Note it down' }).click();
    await page.getByRole('button', { name: 'A win' }).click();
    await page.locator('#capture-what').fill('Finished the migration script');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await settled(page);

    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();

    const captured = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter(
        (record) =>
          record.recordType === 'observation' &&
          (record as { attribute?: string }).attribute?.startsWith('capture:') === true,
      );
    });

    // One event, once. Not one per surface it appears on.
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({ privacy: 'note' });
  });
});

test.describe('the weekly direction', () => {
  test('offers Confirm, Adjust, Snooze, and Skip, and records the answer', async ({ page }) => {
    await open(page, 'weekly-direction');
    await page.getByRole('button', { name: 'This week’s direction' }).click();

    const main = page.getByRole('main');
    /*
     * The card names the kind before the proposal now (v3.3 B4), so a quiet week reads as
     * a choice rather than as the app having nothing to say.
     */
    await expect(main).toContainText(/One focus|Deliberately quiet/);
    await expect(main).toContainText('Minimum win');
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Snooze', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip', exact: true })).toBeVisible();
    await expect(main).toContainText(/Neither is counted against you anywhere/i);

    await page.getByRole('button', { name: 'Snooze', exact: true }).click();
    await settled(page);

    await page.reload();
    await expect(page.locator('.grid')).toBeVisible();

    const stored = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter((record) => record.recordType === 'weekly-direction');
    });
    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored)).toMatch(/"response":"snoozed"/);
    expect(JSON.stringify(stored)).not.toMatch(/missed|failed|overdue|streak/i);
  });
});

test.describe('Data & Privacy tells the truth about the owner’s own records', () => {
  test('does not call real entries synthetic, and is honest about what is missing', async ({
    page,
  }) => {
    await open(page);

    const direct = page
      .getByRole('button', { name: 'Data & Privacy', exact: true })
      .filter({ visible: true });
    if ((await direct.count()) === 0) {
      await page.getByRole('button', { name: 'More', exact: true }).click();
    }
    await page
      .getByRole('button', { name: 'Data & Privacy', exact: true })
      .filter({ visible: true })
      .first()
      .click();

    const main = page.getByRole('main');
    const text = (await main.textContent()) ?? '';

    // The records on this device are the owner's. Calling them synthetic would be
    // false in the one place where being trusted matters most.
    expect(text).not.toMatch(/synthetic scenario records/i);

    // Records exist and no backup has been taken, so the surface says so first —
    // above everything else on the page, and marked as needing action now.
    await expect(main).toContainText(/You have records on this device and no backup/i);
    await expect(main).toContainText('Act now');

    // And the standing promises still hold.
    await expect(main).toContainText(/Nobody can recover this passphrase/i);
    await expect(main).toContainText(/no delete control/i);
  });
});

test.describe('accessibility of the new controls', () => {
  test('every capture control meets the 44 x 44 target on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const undersized = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '.shell button, .shell input, .shell textarea',
        ),
      ]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
            w: Math.round(rect.width),
            h: Math.round(rect.height),
          };
        })
        .filter((entry) => entry.h > 0 && (entry.h < 44 || entry.w < 44)),
    );
    expect(undersized).toEqual([]);
  });

  test('no horizontal overflow while capturing', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page);

    for (const step of ['guide', 'capture', 'decline'] as const) {
      if (step === 'guide') {
        await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();
      }
      if (step === 'capture') {
        await page.reload();
        await expect(page.locator('.grid')).toBeVisible();
        await page
          .locator('.capture-bar')
          .getByRole('button', { name: 'Note it down' })
          .click();
      }
      if (step === 'decline') {
        await page.reload();
        await expect(page.locator('.grid')).toBeVisible();
        await page.getByRole('button', { name: 'Can’t now', exact: true }).click();
      }

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
      expect(offenders, step).toEqual([]);
    }
  });
});
