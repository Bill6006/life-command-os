import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 gate evidence, kept green — now against real engine output.
 *
 * Every constraint the Console was selected under still holds, but nothing on screen
 * is hand-written any more: the picker chooses synthetic *records* and the engine
 * computes the rest. Where Phase 3 asserted that a prototype rendered a state, these
 * assert that the engine produced it.
 *
 * The owner's constraint on the selected variant is what most of these guard:
 * *preserve the compact high-information style, but do not drift into a crowded
 * generic dashboard.* That failure is gradual, so it is checked mechanically.
 */

/** Every scenario the picker offers. The engine computes each one. */
const SCENARIOS = [
  'action',
  'cold-start',
  'sparse-evidence',
  'stale-evidence',
  'contradictory-evidence',
  'protected-time',
  'overload',
  'silence',
  'one-question',
  'stable-state',
  'competing-commitments',
  'mixed-effects',
  'material-change',
  'changed-context',
  'weekly-direction',
  'quiet-week',
  // Phase 5 — the learning loop.
  'learning-loop',
  'declined',
  'partial-execution',
  'missing-outcome',
  'misleading-correlation',
  'context-change-learning',
  'forecast-accuracy',
  'weekly-continuity',
  'return-after-absence',
] as const;

/** Presentation modes the engine cannot produce. Lock and recovery become real in Phase 6. */
const INTERFACE_STATES = ['loading', 'error', 'locked', 'recovery'] as const;

const DESTINATIONS = ['Now', 'Timeline', 'Direction', 'Commitments'];

async function select(page: Page, value: string): Promise<void> {
  await page.selectOption('#scenario', value);
}

async function open(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
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

test.describe('every scenario and interface state renders', () => {
  for (const scenario of SCENARIOS) {
    test(`engine renders the ${scenario} scenario`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });

      await open(page);
      await select(page, scenario);

      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      expect(((await main.textContent()) ?? '').trim().length).toBeGreaterThan(40);
      expect(errors).toEqual([]);
    });
  }

  for (const state of INTERFACE_STATES) {
    test(`renders the ${state} interface state`, async ({ page }) => {
      await open(page);
      await select(page, state);
      expect(
        ((await page.getByRole('main').textContent()) ?? '').trim().length,
      ).toBeGreaterThan(40);
    });
  }
});

test.describe('the decision always leads (ADR-0008 rule 1)', () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario}: the answer is the first thing on the surface`, async ({ page }) => {
      await open(page);
      await select(page, scenario);

      const firstPanelClass = await page
        .locator('.grid > .panel')
        .first()
        .getAttribute('class');
      expect(firstPanelClass).toMatch(/panel-(decision|quiet)/);

      const top = await page
        .locator('.grid > .panel')
        .first()
        .evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeLessThan(812);
    });
  }

  test('Now never exceeds five panels (ADR-0008 rule 2)', async ({ page }) => {
    await open(page);
    for (const scenario of SCENARIOS) {
      await select(page, scenario);
      const panels = await page.locator('.grid > .panel').count();
      expect(panels, `${scenario} rendered ${String(panels)} panels`).toBeLessThanOrEqual(5);
    }
  });
});

test.describe('one best move, never a menu', () => {
  for (const scenario of SCENARIOS) {
    test(`${scenario}: at most one primary action`, async ({ page }) => {
      await open(page);
      await select(page, scenario);

      expect(await page.locator('.btn-primary').count()).toBeLessThanOrEqual(1);

      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      // Targets alternative-*listing* language. The bare word "ranked" is fine —
      // the question explains that it changes eligibility rather than ranking.
      expect(text).not.toMatch(
        /alternative|other option|instead you could|ranked list|ranked menu|2nd choice|option 2/,
      );
    });
  }

  test('a scenario with several candidates still shows exactly one', async ({ page }) => {
    await open(page);
    await select(page, 'competing-commitments');

    // The engine compared several candidates internally...
    expect(await page.locator('.btn-primary').count()).toBeLessThanOrEqual(1);
    // ...and the audit trail is not on screen.
    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).not.toMatch(/scored|rejected|runner-up/i);
  });

  test('silence is a conclusion with no action to take', async ({ page }) => {
    await open(page);
    await select(page, 'protected-time');

    await expect(page.getByRole('main')).toContainText('Nothing requires attention right now');
    await expect(page.getByRole('main')).toContainText('Next look');
    expect(await page.locator('.btn-primary').count()).toBe(0);
  });
});

test.describe('the engine, not the interface, produces the content', () => {
  test('abstains visibly when evidence is too thin', async ({ page }) => {
    await open(page);
    await select(page, 'sparse-evidence');

    const main = page.getByRole('main');
    await expect(main).toContainText(/No projection/i);
    await expect(main).toContainText(/Insufficient evidence/i);
  });

  test('cold start asks for nothing and ranks no domains', async ({ page }) => {
    await open(page);
    await select(page, 'cold-start');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).not.toMatch(/what matters most/);
    expect(text).not.toMatch(/most important (area|domain)/);
    await expect(page.getByRole('main')).toContainText(/not enough/i);
  });

  test('surfaces contradictions rather than resolving them', async ({ page }) => {
    await open(page);
    await select(page, 'contradictory-evidence');
    await expect(page.getByRole('main')).toContainText(/Conflicting records/i);
    await expect(page.getByRole('main')).toContainText(/Left\s+unresolved/i);
  });

  test('marks stale evidence as stale', async ({ page }) => {
    await open(page);
    await select(page, 'stale-evidence');
    await expect(page.getByRole('main')).toContainText(/Stale/i);
  });

  test('asks exactly one question when the answer changes eligibility', async ({ page }) => {
    await open(page);
    await select(page, 'one-question');

    await expect(page.getByRole('main')).toContainText(/How much time is actually free/i);
    await expect(page.getByRole('main')).toContainText(/Candidate eligibility/i);
  });

  test('explains what changed and why the answer moved', async ({ page }) => {
    await open(page);
    await select(page, 'material-change');

    await page.getByRole('button', { name: 'See everything that changed' }).click();
    await expect(page.getByRole('main')).toContainText('Everything that changed');
    await expect(page.getByRole('main')).toContainText(/altered the/i);
  });

  test('proposes a weekly direction the user can confirm or reject', async ({ page }) => {
    await open(page);
    await select(page, 'weekly-direction');
    await page.getByRole('button', { name: 'This week’s direction' }).click();

    await expect(page.getByRole('main')).toContainText(/Weekly direction/i);
    await expect(page.getByRole('main')).toContainText(/not being asked to invent a priority/i);
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
  });

  test('never claims strong personal evidence in this phase', async ({ page }) => {
    await open(page);
    for (const scenario of SCENARIOS) {
      await select(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, scenario).not.toContain('strong personal evidence');
    }
  });
});

test.describe('the learning loop is visible and honest (Phase 5)', () => {
  test('a belief appears only once it has been earned, with its evidence', async ({ page }) => {
    await open(page);
    await select(page, 'learning-loop');
    await goTo(page, 'Learning');

    const main = page.getByRole('main');
    await expect(main).toContainText(/Strong personal evidence/i);
    await expect(main).toContainText(/each predicted before it was observed/i);
    await expect(main).toContainText(/How it changed/i);
  });

  test('declining is shown as unresolved, never as a failure', async ({ page }) => {
    await open(page);
    await select(page, 'declined');
    await goTo(page, 'Learning');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).toContain('nothing has been learned yet');
    expect(text).toMatch(/not weak evidence/);
    expect(text).not.toMatch(/failed|missed|non-compliance|adherence/);
  });

  test('forecast accuracy and effectiveness are separate panels', async ({ page }) => {
    await open(page);
    await select(page, 'forecast-accuracy');
    await goTo(page, 'Learning');

    await expect(
      page.getByRole('region', { name: 'Forecast accuracy', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Recommendation effectiveness', exact: true }),
    ).toBeVisible();

    // The two panels state their independence. Whether a *combined figure* exists
    // is asserted against the engine data in `learning.test.ts`, which is the only
    // place it could — a phrase match here would flag honest prose that explains
    // why something is not a success rate.
    const text = (await page.getByRole('main').textContent()) ?? '';
    expect(text).toMatch(/separate question/i);
    expect(text).toMatch(/says nothing about whether any recommendation helped/i);
  });

  test('a suspended belief says it was paused, not deleted', async ({ page }) => {
    await open(page);
    await select(page, 'context-change-learning');
    await goTo(page, 'Learning');

    await expect(page.getByRole('main')).toContainText(/suspended/i);
    await expect(page.getByRole('main')).toContainText(/Suspended, not deleted/i);
  });

  test('returning after a gap carries no guilt and no backlog', async ({ page }) => {
    await open(page);
    await select(page, 'return-after-absence');

    await expect(page.locator('.banner-quiet')).toContainText(/Welcome back/i);
    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).toMatch(/not a problem to fix/);
    expect(text).not.toMatch(/missed|catch up|behind|streak|overdue/);
  });

  test('weekly direction is compared week over week without scoring', async ({ page }) => {
    await open(page);
    await select(page, 'weekly-continuity');
    await goTo(page, 'Learning');

    const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
    expect(text).toContain('carry forward');
    expect(text).toMatch(/nothing here is scored/);
    expect(text).not.toMatch(/failed|missed|compliance/);
  });
});

test.describe('prohibited constructs are absent everywhere', () => {
  test('no Life Score, category score, streak, or normal-state status panel', async ({
    page,
  }) => {
    await open(page);

    for (const scenario of SCENARIOS) {
      await select(page, scenario);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, scenario).not.toMatch(/life score|overall score|out of 100/);
      expect(text, scenario).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
      expect(text, scenario).not.toMatch(/streak/);
      expect(text, scenario).not.toMatch(/all systems operational|everything looks good/);
    }

    for (const destination of [...DESTINATIONS, 'Learning', 'Data & Privacy']) {
      await page.goto('./');
      await goTo(page, destination);

      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, destination).not.toMatch(/life score|overall score|out of 100/);
      expect(text, destination).not.toMatch(/streak/);
      expect(text, destination).not.toMatch(/all systems operational/);
      await expect(page.getByRole('meter'), destination).toHaveCount(0);
      await expect(page.getByRole('progressbar'), destination).toHaveCount(0);
    }
  });

  /**
   * Phase 5 adds more charts, so counting to one no longer expresses the rule. The
   * rule was never "at most one image" — it is "no decorative imagery". This is the
   * stronger form: every graphic must be a chart that names itself and states its
   * question.
   */
  test('every graphic is a named chart, and nothing is decorative', async ({ page }) => {
    await open(page);
    await select(page, 'learning-loop');

    for (const destination of ['Direction', 'Learning']) {
      await goTo(page, destination);

      // No raster or canvas imagery anywhere — those could only be decoration here.
      expect(await page.locator('main img, main canvas').count(), destination).toBe(0);

      const svgCount = await page.locator('main svg').count();
      const figureCount = await page.locator('main figure').count();
      expect(figureCount, destination).toBeGreaterThan(0);

      // Every SVG names itself and lives inside a figure that states its question.
      for (let index = 0; index < svgCount; index += 1) {
        const svg = page.locator('main svg').nth(index);
        await expect(svg, `${destination} svg ${String(index)}`).toHaveAttribute('role', 'img');
        await expect(svg.locator('title')).not.toBeEmpty();
      }

      for (let index = 0; index < figureCount; index += 1) {
        const figure = page.locator('main figure').nth(index);
        await expect(figure.locator('.chart-question')).not.toBeEmpty();
        await expect(figure.locator('.chart-summary')).not.toBeEmpty();
      }

      await page.goto('./');
      await select(page, 'learning-loop');
    }
  });

  test('no delete control exists anywhere', async ({ page }) => {
    await open(page);
    await goTo(page, 'Data & Privacy');

    const buttons = await page.getByRole('main').getByRole('button').allTextContents();
    expect(buttons.join(' ').toLowerCase()).not.toMatch(/delete|erase|wipe|remove all/);
    await expect(page.getByRole('main')).toContainText('no delete control');
  });
});

test.describe('navigation', () => {
  test('exposes exactly five persistent destinations on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    const visible = await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button')
      .filter({ visible: true })
      .allTextContents();

    expect(visible).toEqual([...DESTINATIONS, 'More']);
  });

  test('reaches Learning and Data & Privacy through More', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('button', { name: 'Learning', exact: true }).first().click();
    // The 'action' scenario has no executions, so nothing has been learned — and
    // the surface says exactly that rather than filling the space.
    await expect(page.getByRole('main')).toContainText('Nothing has been learned yet');
  });

  test('exposes all six destinations on desktop, without More', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page);

    const visible = await page
      .getByRole('navigation', { name: 'Main' })
      .getByRole('button')
      .filter({ visible: true })
      .allTextContents();

    expect(visible).toEqual([...DESTINATIONS, 'Learning', 'Data & Privacy']);
    expect(visible).not.toContain('More');
  });
});

test.describe('reachable within one interaction (UX-005)', () => {
  test('the full enabled-category overview, from Now', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'All categories' }).click();

    for (const category of [
      'Time, attention & capacity',
      'Direction & commitments',
      'Career, work & learning',
    ]) {
      await expect(page.getByRole('main')).toContainText(category);
    }
    await expect(page.getByRole('main')).toContainText('Trajectory:');
    await expect(page.getByRole('main')).toContainText('Principal drivers');
    await expect(page.getByRole('main')).toContainText('Would change it:');
  });

  test('the full What changed explanation, from Now', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'See everything that changed' }).click();
    await expect(page.getByRole('main')).toContainText('Everything that changed');
  });
});

test.describe('the chart states everything the graph policy requires (UX-003)', () => {
  test('question, metric, window, missing data, uncertainty, and a visible summary', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');

    // Direction carries several charts now, so scope to the trajectory one.
    const figure = page.locator('main figure').first();
    await expect(figure).toContainText('Is focused work recovering, or still declining?');
    await expect(figure).toContainText('summed per week');
    await expect(figure).toContainText('Last eight weeks');
    await expect(figure).toContainText('observed');
    await expect(figure).toContainText('never counted as zero');
  });

  test('weeks with no evidence are gaps, not plotted at zero', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');

    // The engine's series carries nulls for weeks without evidence; the chart
    // breaks the line rather than dropping to the axis, and marks *every* gap.
    // Scoped to the trajectory chart — Direction now renders several.
    const svg = page.locator('main figure').first().locator('svg');
    const points = await svg.locator('circle').count();
    const runs = await svg.locator('polyline').count();
    const gaps = await svg.locator('rect.chart-gap').count();

    expect(points).toBeGreaterThan(0);
    expect(runs).toBeGreaterThan(0);
    expect(gaps).toBeGreaterThan(0);

    // Eight weeks in the window, and every one is either a plotted point or a gap.
    expect(points + gaps).toBe(8);
  });
});

test.describe('interaction budgets at 375 x 812 (UX-005)', () => {
  test('no horizontal overflow in any scenario or destination', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    const check = async (label: string): Promise<void> => {
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('body *')]
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
              pastBy: Math.round(rect.right - document.documentElement.clientWidth),
            };
          })
          .filter((entry) => entry.pastBy > 1),
      );
      expect(offenders, label).toEqual([]);

      const doc = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(doc, label).toBeLessThanOrEqual(0);
    };

    for (const scenario of SCENARIOS) {
      await select(page, scenario);
      await check(`scenario: ${scenario}`);
    }

    for (const destination of DESTINATIONS) {
      await page.getByRole('button', { name: destination, exact: true }).click();
      await check(`destination: ${destination}`);
    }
  });

  test('every interactive target is at least 44 x 44', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    for (const destination of DESTINATIONS) {
      await page.getByRole('button', { name: destination, exact: true }).click();

      const undersized = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.shell button, .shell a, .shell summary')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
              w: Math.round(r.width),
              h: Math.round(r.height),
            };
          })
          .filter((e) => e.h > 0 && (e.h < 44 || e.w < 44)),
      );
      expect(undersized, destination).toEqual([]);
    }
  });

  test('remains usable at 200 percent text zoom', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });

    await expect(page.getByRole('main')).toContainText(/Goal One|Nothing requires attention/);

    const pastEdge = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .map((el) => ({
          selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
          pastBy: Math.round(el.getBoundingClientRect().right - limit),
        }))
        .filter((entry) => entry.pastBy > 1);
    });
    expect(pastEdge).toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('respond, adjust, or decline is reachable in two taps from Now', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    const actions = page.locator('.panel-decision .actions').first().getByRole('button');
    await expect(actions).toHaveCount(3);
    await expect(actions.nth(0)).toContainText('Start');
    await expect(actions.nth(2)).toContainText('Not now');
  });
});

test.describe('facts and inferences (UX-002)', () => {
  test('are labelled in words, not by colour alone', async ({ page }) => {
    await open(page);

    await expect(page.locator('.tag-observed').first()).toHaveText('observed');
    await expect(page.locator('.tag-inferred').first()).toHaveText('inferred');

    const styles = await page.evaluate(() => {
      const o = document.querySelector('.tag-observed');
      const i = document.querySelector('.tag-inferred');
      return {
        observed: o === null ? '' : getComputedStyle(o).borderStyle,
        inferred: i === null ? '' : getComputedStyle(i).borderStyle,
      };
    });
    expect(styles.observed).toBe('solid');
    expect(styles.inferred).toBe('dashed');
  });
});
