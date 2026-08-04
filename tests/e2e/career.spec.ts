import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 7 Prompt 8C gate evidence: Career, Azure, and learning, on screen.
 *
 * The thing being checked here is a gap: what the owner would say about themselves
 * versus what their records would back up. It has to be legible without being an
 * accusation, which is why the wording assertions matter as much as the numbers.
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

const careerPanel = (page: Page) => page.getByRole('region', { name: 'Career and learning' });

async function openCareer(page: Page, scenario: string): Promise<void> {
  await open(page, scenario);
  await goTo(page, 'Direction');
  await expect(careerPanel(page)).toBeVisible();
}

test.describe('the career panel', () => {
  test('leads with the decision question and the exact next step', async ({ page }) => {
    await openCareer(page, 'career-interrupted');

    const panel = careerPanel(page);
    await expect(panel).toContainText('What is the exact next step, and what is blocking it?');
    await expect(panel).toContainText('Trajectory:');
    await expect(panel).toContainText('Active bottleneck');
    // The owner's own words, unedited.
    await expect(panel).toContainText('Finish the identity module walkthrough');
  });

  test('hosts no course content and shows no second task board', async ({ page }) => {
    for (const scenario of ['career-no-next-step', 'career-proven-claim']) {
      await openCareer(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();

      for (const forbidden of [
        'lesson',
        'curriculum',
        'syllabus',
        'chapter',
        'watch the video',
        'due date',
        'to-do',
        'checklist',
        'assignment',
        'quiz score',
        'percent complete on',
      ]) {
        expect(text, `${scenario}: ${forbidden}`).not.toContain(forbidden);
      }
      // No per-item completion controls: this is not a task list with a tick column.
      await expect(page.getByRole('checkbox')).toHaveCount(0);
    }
  });
});

test.describe('a claim and what stands behind it', () => {
  test('shows an unsupported claim as claimed, not as false and not as true', async ({
    page,
  }) => {
    await openCareer(page, 'career-unsupported-claim');
    const panel = careerPanel(page);

    await expect(panel).toContainText('hub-and-spoke network');
    await expect(panel).toContainText('nothing behind');

    // Never asserted either way, and never graded.
    const text = ((await panel.textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('unproven');
    expect(text).not.toContain('false');
    expect(text).not.toContain('overstated');
    expect(text).not.toContain('exaggerat');
    expect(text).not.toMatch(/beginner|novice|expert|intermediate level/);
  });

  test('draws the meter it earned, where health drew words', async ({ page }) => {
    await openCareer(page, 'career-unsupported-claim');
    const panel = careerPanel(page);

    await expect(panel).toContainText('What you could show');
    await expect(panel).toContainText('How much of what I would say could I show?');
    await expect(panel).toContainText('out of claims made');

    // Earned, so it is drawn — not filed under the refusal heading.
    const meterSection = panel.locator('figure', { hasText: 'What you could show' });
    await expect(meterSection).not.toContainText('Not shown here');
  });

  test('names the specific next proof rather than "study more"', async ({ page }) => {
    await openCareer(page, 'career-unsupported-claim');
    const panel = careerPanel(page);

    // The next piece of proof, named: one study session would put something behind it.
    await expect(panel).toContainText(/next: one study session on this topic/i);

    // The move itself proposes the smallest thing that would demonstrate the claim.
    // Scoped to the move: the stage path's declaration legitimately contains the
    // phrase "study more", because that is the thing it says it is not doing.
    const move = panel
      .locator('p.panel-label', { hasText: 'Optional move' })
      .locator('xpath=following-sibling::p[1]');
    await expect(move).toContainText(/smallest thing that would prove/i);
    expect(((await move.textContent()) ?? '').toLowerCase()).not.toContain('study more');
  });

  test('walks the ladder to the top when real work backs the claim', async ({ page }) => {
    await openCareer(page, 'career-proven-claim');
    const panel = careerPanel(page);

    await expect(panel).toContainText('What the evidence supports');
    await expect(panel).toContainText('Used it for real');

    // Position is on the top rung, and it is marked for assistive technology too —
    // never by colour alone.
    const rung = panel.locator('li[aria-current="step"]');
    await expect(rung).toHaveCount(1);
    await expect(rung).toContainText('Used it for real');

    // A ladder, deliberately without a percentage: the rungs are not evenly spaced.
    const text = (await panel.textContent()) ?? '';
    expect(text).not.toMatch(/\b\d{1,3}% (complete|through|of the way)/);
  });

  test('the rung comes from evidence, so nothing on screen offers to set it', async ({
    page,
  }) => {
    await openCareer(page, 'career-proven-claim');

    const buttons = await careerPanel(page).getByRole('button').allTextContents();
    for (const label of buttons) {
      expect(label.toLowerCase()).not.toMatch(/rate|set level|self.assess|mark as/);
    }
  });
});

test.describe('barriers, without a verdict about the person', () => {
  test('names what recurs and refuses to say why', async ({ page }) => {
    await openCareer(page, 'career-recurring-barrier');
    const panel = careerPanel(page);

    await expect(panel).toContainText('recurring obstacle');
    await expect(panel).toContainText('says what recurs, not why');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    for (const forbidden of [
      'procrastinat',
      'perfectionis',
      'fear',
      'afraid',
      'lazy',
      'avoidance',
      'you tend to',
      'you always',
      'discipline',
      'motivation problem',
    ]) {
      expect(text, forbidden).not.toContain(forbidden);
    }
  });

  test('offers resumption after an interruption, not a fresh start', async ({ page }) => {
    await openCareer(page, 'career-interrupted');
    const panel = careerPanel(page);

    await expect(panel).toContainText('Pick up where you stopped');
    await expect(panel).toContainText(/answer on Now still comes first/);
  });
});

test.describe('Update This Area, for career', () => {
  test('asks career questions only, and offers Unsure throughout', async ({ page }) => {
    await openCareer(page, 'career-no-next-step');
    await careerPanel(page).getByRole('button', { name: 'Update this area' }).click();

    const main = page.getByRole('main');
    await expect(main).toContainText('Update this area');

    let sawBarrier = false;
    for (let step = 0; step < 10; step += 1) {
      const text = (await main.textContent()) ?? '';
      if (text.includes('What was in the way?')) sawBarrier = true;

      // Nothing from the morning check-in, and nothing from another area.
      expect(text).not.toContain('How many minutes are genuinely free');
      expect(text).not.toContain('Is anything physical getting in the way');

      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
    expect(sawBarrier).toBe(true);
  });

  test('the morning check-in is unchanged by career being switched on', async ({ page }) => {
    await open(page, 'career-no-next-step');
    await page.locator('.guide-bar').getByRole('button', { name: 'Open' }).click();

    const main = page.getByRole('main');
    for (let step = 0; step < 6; step += 1) {
      const text = (await main.textContent()) ?? '';
      expect(text).not.toContain('What was in the way?');
      expect(text).not.toContain('What is the exact next step');
      expect(text).not.toContain('What came back without looking it up');
      const next = page.getByRole('button', { name: 'Next', exact: true });
      if ((await next.count()) === 0) break;
      await next.click();
    }
  });
});

test.describe('career never crowds the decision surface', () => {
  test('Now stays within five panels and names no area', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await open(page, 'career-unsupported-claim');

    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
    const first = await page.locator('.grid > .panel').first().getAttribute('class');
    expect(first).toMatch(/panel-(decision|quiet)/);

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('career and learning');
    expect(text).not.toContain('optional move');
  });

  test('no horizontal overflow with the career panel on a phone', async ({ page }) => {
    await page.setViewportSize(PHONE);
    await openCareer(page, 'career-proven-claim');

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

test.describe('a Work Win is one event', () => {
  test('reaches Timeline, Learning, and the career panel from a single record', async ({
    page,
  }) => {
    await open(page, 'career-proven-claim');

    const wins = await page.evaluate(async () => {
      const bridge = globalThis.__lifeCommandOsDiagnostics;
      if (bridge === undefined) throw new Error('Test bridge is not installed');
      const records = await bridge.listAllRecords();
      return records.filter(
        (record) =>
          'attribute' in record && record.attribute === 'capture:career-and-learning:work-win',
      ).length;
    });
    expect(wins).toBe(1);

    await goTo(page, 'Timeline');
    await expect(page.getByRole('main')).toContainText(
      'Migrated the reporting service without downtime',
    );

    await goTo(page, 'Direction');
    await expect(careerPanel(page)).toContainText('Used it for real');
  });
});
