import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 gate evidence — the Console shell (ADR-0008).
 *
 * The owner's constraint on the selected variant is the thing most of these guard:
 * *preserve the compact high-information style, but do not drift into a crowded
 * generic dashboard.* That failure is gradual, so it is checked mechanically rather
 * than left to taste — panel counts, prohibited constructs, and the rule that the
 * decision always leads.
 */

const STATES = [
  'action',
  'silence',
  'insufficient-evidence',
  'question',
  'what-changed',
  'mixed-effects',
  'weekly-direction',
  'loading',
  'empty',
  'offline',
  'error',
  'locked',
  'recovery',
] as const;

/** States that present an answer, and must therefore lead with it. */
const ANSWER_STATES = [
  'action',
  'silence',
  'insufficient-evidence',
  'question',
  'mixed-effects',
  'weekly-direction',
  'offline',
] as const;

const DESTINATIONS = ['Now', 'Timeline', 'Direction', 'Commitments'];

async function selectState(page: Page, state: string): Promise<void> {
  await page.selectOption('#proto-state', state);
}

async function open(page: Page): Promise<void> {
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
}

/**
 * Navigates to a destination from wherever it lives on this viewport.
 *
 * Learning and Data & Privacy sit behind More on a phone and directly on the
 * desktop rail, which is the whole point of `UX-010` — so the helper has to cope
 * with both rather than assuming one.
 */
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

test.describe('all thirteen interaction states', () => {
  for (const state of STATES) {
    test(`renders the ${state} state`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') consoleErrors.push(m.text());
      });

      await open(page);
      await selectState(page, state);

      const main = page.getByRole('main');
      await expect(main).toBeVisible();
      const text = (await main.textContent()) ?? '';
      expect(text.trim().length).toBeGreaterThan(40);
      expect(consoleErrors).toEqual([]);
    });
  }
});

test.describe('the decision always leads (ADR-0008 rule 1)', () => {
  for (const state of ANSWER_STATES) {
    test(`${state}: the answer is the first thing on the surface`, async ({ page }) => {
      await open(page);
      await selectState(page, state);

      // The first panel is the answer, not the evidence that produced it.
      const firstPanelClass = await page
        .locator('.grid > .panel')
        .first()
        .getAttribute('class');
      expect(firstPanelClass).toMatch(/panel-(decision|quiet)/);

      // And it begins within the first viewport at the owner's device size.
      const top = await page
        .locator('.grid > .panel')
        .first()
        .evaluate((el) => el.getBoundingClientRect().top);
      expect(top).toBeLessThan(812);
    });
  }

  test('Now never exceeds five panels (ADR-0008 rule 2)', async ({ page }) => {
    await open(page);
    for (const state of STATES) {
      await selectState(page, state);
      const panels = await page.locator('.grid > .panel').count();
      expect(panels, `${state} rendered ${String(panels)} panels`).toBeLessThanOrEqual(5);
    }
  });

  test('actionable status is a banner, never one of the five panels', async ({ page }) => {
    await open(page);
    await selectState(page, 'offline');

    await expect(page.locator('.banner')).toContainText('Offline');
    const panels = await page.locator('.grid > .panel').count();
    expect(panels).toBeLessThanOrEqual(5);
  });
});

test.describe('one best move, never a menu', () => {
  for (const state of ANSWER_STATES) {
    test(`${state}: at most one primary action`, async ({ page }) => {
      await open(page);
      await selectState(page, state);

      const primaries = await page.locator('.btn-primary').count();
      expect(primaries).toBeLessThanOrEqual(1);

      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text).not.toMatch(/alternative|other option|instead you could|ranked|2nd choice/);
    });
  }

  test('silence is a conclusion with no action to take', async ({ page }) => {
    await open(page);
    await selectState(page, 'silence');

    await expect(page.getByRole('main')).toContainText('Nothing requires attention right now');
    await expect(page.getByRole('main')).toContainText('Next look');
    expect(await page.locator('.btn-primary').count()).toBe(0);
  });

  test('a declined recommendation is not treated as evidence about it', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Timeline', exact: true }).click();
    await expect(page.getByRole('main')).toContainText(
      /Not treated as evidence about the recommendation/i,
    );
  });
});

test.describe('prohibited constructs are absent everywhere', () => {
  test('no Life Score, category score, streak, or normal-state status panel', async ({
    page,
  }) => {
    await open(page);

    for (const state of STATES) {
      await selectState(page, state);
      const text = ((await page.getByRole('main').textContent()) ?? '').toLowerCase();
      expect(text, state).not.toMatch(/life score|overall score|out of 100/);
      expect(text, state).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
      expect(text, state).not.toMatch(/streak/);
      expect(text, state).not.toMatch(/all systems operational|everything looks good/);
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

  test('the only image on any surface is a chart that names itself', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Direction', exact: true }).click();

    // Decorative imagery is prohibited (UX-011). A chart is not decoration, but it
    // has to prove that by carrying an accessible name and living in a figure.
    const graphics = page.locator('main img, main svg, main canvas');
    const count = await graphics.count();
    expect(count).toBe(1);

    const svg = page.locator('main svg');
    await expect(svg).toHaveAttribute('role', 'img');
    await expect(svg.locator('title')).not.toBeEmpty();
    await expect(page.locator('main figure')).toHaveCount(1);
  });

  test('no delete control exists anywhere', async ({ page }) => {
    // Deletion semantics are undecided, so shipping the control would be worse than
    // not having it. Correcting and deleting are not the same operation (ADR-0005).
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

    // Every enabled category, with the six required elements and no score.
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
    await expect(page.getByRole('main')).toContainText('Deliberately unchanged');
  });
});

test.describe('the chart states everything the graph policy requires (UX-003)', () => {
  test('question, metric, window, missing data, uncertainty, and a visible summary', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Direction', exact: true }).click();

    const figure = page.locator('main figure');
    await expect(figure).toContainText('Is focused work recovering, or still declining?');
    await expect(figure).toContainText('summed per week');
    await expect(figure).toContainText('Last eight weeks');
    await expect(figure).toContainText('observed');
    await expect(figure).toContainText('is not counted as zero');
    await expect(figure).toContainText('carries no model uncertainty');
    await expect(figure).toContainText('One week has no evidence');
  });

  test('the missing week is drawn as a gap, not plotted at zero', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Direction', exact: true }).click();

    // Eight weeks, one without evidence: seven points and two separate line runs.
    expect(await page.locator('main svg circle').count()).toBe(7);
    expect(await page.locator('main svg polyline').count()).toBe(2);
    await expect(page.locator('main svg rect.chart-gap')).toHaveCount(1);
  });
});

test.describe('interaction budgets at 375 x 812 (UX-005)', () => {
  test('no horizontal overflow in any state or destination', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await open(page);

    const check = async (label: string): Promise<void> => {
      const offenders = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.shell *')]
          .map((el) => ({
            // `getAttribute`, not `className`: on SVG elements `className` is an
            // SVGAnimatedString, and the chart puts SVG inside the scanned subtree.
            selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
            overflowBy: el.scrollWidth - el.clientWidth,
          }))
          .filter((entry) => entry.overflowBy > 0),
      );
      expect(offenders, label).toEqual([]);

      const doc = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(doc, label).toBeLessThanOrEqual(0);
    };

    for (const state of STATES) {
      await selectState(page, state);
      await check(`state: ${state}`);
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
              // `getAttribute`, not `className`: on SVG elements `className` is an
              // SVGAnimatedString, and the chart puts SVG inside the scanned subtree.
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

    await expect(page.getByRole('main')).toContainText('Activity One');

    /*
     * Bounding boxes, not `scrollWidth`. An element can sit past the right edge of
     * the viewport without overflowing *itself*, and `body { overflow-x: hidden }`
     * would hide that while still clipping content the user needs — which is worse
     * than a scrollbar, not better.
     */
    const pastEdge = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      // Everything, including the prototype scaffolding — it is on the page, so it
      // is allowed to break the page, and excluding it would hide a real failure.
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return {
            selector: `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0] ?? ''}`,
            pastBy: Math.round(rect.right - limit),
          };
        })
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

    // One tap: they are on the opening surface already, no navigation needed.
    const actions = page.locator('.panel-decision .actions button');
    await expect(actions).toHaveCount(3);
    await expect(actions.nth(0)).toContainText('Start');
    await expect(actions.nth(2)).toContainText('Not now');
  });
});

test.describe('facts and inferences (UX-002)', () => {
  test('are labelled in words, not by colour alone', async ({ page }) => {
    await open(page);

    const observed = page.locator('.tag-observed').first();
    const inferred = page.locator('.tag-inferred').first();

    await expect(observed).toHaveText('observed');
    await expect(inferred).toHaveText('inferred');

    // And they differ structurally as well as chromatically.
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
