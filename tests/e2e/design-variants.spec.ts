import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 pre-selection gate evidence.
 *
 * These check the constraints that hold for **all three** variants, so the owner is
 * choosing between compositions that each already satisfy the Constitution rather
 * than between one compliant option and two that would have to be fixed later.
 *
 * What these deliberately do **not** check: whether the ten-second comprehension
 * test passes, or which variant is better. Those are the owner's judgement, made
 * against the live build on their own device. A test cannot make that call.
 */

const VARIANTS = [
  { letter: 'A', name: 'Briefing' },
  { letter: 'B', name: 'Console' },
  { letter: 'C', name: 'Focus' },
] as const;

const DESTINATIONS = ['Now', 'Timeline', 'Direction', 'Commitments', 'More'];

async function openVariant(page: Page, letter: string): Promise<void> {
  await page.goto('./');
  await page.getByRole('button', { name: `Open ${letter}` }).click();
  await expect(page.locator('.variant-overlay')).toBeVisible();
}

test.describe('the design gallery', () => {
  test('offers exactly three variants of the primary surface', async ({ page }) => {
    await page.goto('./');

    const openButtons = page.getByRole('button', { name: /^Open [ABC]$/ });
    await expect(openButtons).toHaveCount(3);
  });

  test('states each variant’s risk, not only its idea', async ({ page }) => {
    await page.goto('./');

    // A comparison that only lists strengths is not a comparison.
    await expect(page.getByText('Its risk:')).toHaveCount(3);
  });
});

for (const variant of VARIANTS) {
  test.describe(`variant ${variant.letter} — ${variant.name}`, () => {
    test('communicates the full ten-second payload', async ({ page }) => {
      await openVariant(page, variant.letter);
      const body = (await page.locator('.variant-stage').textContent()) ?? '';

      // Current state, and observed versus inferred distinguishable in words.
      expect(body).toContain('40 minutes');
      expect(body.toLowerCase()).toContain('observed');
      expect(body.toLowerCase()).toContain('inferred');

      // What materially changed, and why the answer changed.
      expect(body).toContain('Commitment One completed');
      expect(body).toMatch(/nothing worth suggesting/i);

      // Trajectory and the untreated path.
      expect(body.toLowerCase()).toContain('declining');
      expect(body).toMatch(/Goal One passes its window/i);

      // One best move, with its minimum version and stopping point.
      expect(body).toContain('Activity One');
      expect(body).toMatch(/Ten minutes still counts/i);
      expect(body).toMatch(/18:25/);

      // Benefits and costs together, never netted.
      expect(body.toLowerCase()).toContain('benefit');
      expect(body.toLowerCase()).toContain('cost');
      expect(body.toLowerCase()).toContain('cross-domain');
      expect(body.toLowerCase()).toContain('uncertain');
      expect(body.toLowerCase()).toContain('delayed');

      // North Star relevance, confidence, and a reason trace.
      expect(body).toMatch(/North Star|Moves toward it/i);
      expect(body).toContain('Early signal');
      expect(body).toMatch(/No protected context is active/i);
    });

    test('shows one best move and no alternatives to choose between', async ({ page }) => {
      await openVariant(page, variant.letter);
      const stage = page.locator('.variant-stage');

      // Exactly one primary action. `PROD-005` fails visibly if a second appears.
      await expect(stage.getByRole('button', { name: 'Start', exact: true })).toHaveCount(1);

      const body = (await stage.textContent()) ?? '';
      expect(body).not.toMatch(
        /alternative|other option|instead you could|option 2|2nd choice/i,
      );

      // Only one action is named. A runner-up would mean a comparison surface.
      expect((body.match(/Activity One/g) ?? []).length).toBeGreaterThanOrEqual(1);
      expect(body).not.toContain('Activity Two');
    });

    test('renders deliberate silence as a conclusion, not an empty screen', async ({
      page,
    }) => {
      await openVariant(page, variant.letter);
      await page.getByRole('button', { name: 'action', exact: true }).click();

      const stage = page.locator('.variant-stage');
      const body = (await stage.textContent()) ?? '';

      expect(body).toMatch(
        /Nothing requires attention right now|No action is worth interrupting/i,
      );
      // Silence still explains itself and still offers a way back in.
      expect(body).toMatch(/not long enough|nothing has changed|picture has not moved/i);
      await expect(stage.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0);
    });

    test('excludes every prohibited primary-surface construct', async ({ page }) => {
      await openVariant(page, variant.letter);
      const stage = page.locator('.variant-stage');
      const body = (await stage.textContent()) ?? '';

      // UX-009: no overall Life Score, and no numerical category score at all —
      // the score gate cannot be satisfied honestly by a synthetic prototype.
      expect(body).not.toMatch(/life score|overall score|out of 100|\b\d{1,3}\s*\/\s*100\b/i);
      expect(body).not.toMatch(/\b\d{1,3}%\s*(score|health|rating)/i);

      // UX-011.
      expect(body).not.toMatch(/streak|day streak|🔥/i);
      expect(body).not.toMatch(/all systems operational|systems normal|everything looks good/i);

      // No gauges, rings, meters, or progress bars.
      await expect(stage.getByRole('meter')).toHaveCount(0);
      await expect(stage.getByRole('progressbar')).toHaveCount(0);

      // No decorative imagery of any kind — no AI brain, no illustration.
      await expect(stage.locator('img, svg, canvas')).toHaveCount(0);
    });

    test('keeps mobile navigation to five destinations', async ({ page }) => {
      await openVariant(page, variant.letter);
      const stage = page.locator('.variant-stage');

      // Variant C holds its navigation behind a menu button; open it first.
      const menuButton = stage.getByRole('button', { name: 'Menu', exact: true });
      if ((await menuButton.count()) > 0) await menuButton.click();

      const nav = stage.getByRole('navigation', { name: 'Main' });
      await expect(nav).toBeVisible();

      const items = await nav.getByRole('button').allTextContents();
      expect(items).toEqual(DESTINATIONS);
      expect(items.length).toBeLessThanOrEqual(5);
    });

    test('meets touch-target and no-horizontal-scroll budgets at 375px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await openVariant(page, variant.letter);

      // UX-005: no sideways scrolling anywhere in a normal phone flow.
      // Offenders are reported by selector so a failure says what to fix.
      const overflowing = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.variant-stage *')]
          .map((el) => ({
            selector: `${el.tagName.toLowerCase()}.${el.className.split(' ')[0] ?? ''}`,
            overflowBy: el.scrollWidth - el.clientWidth,
          }))
          .filter((entry) => entry.overflowBy > 0),
      );
      expect(overflowing).toEqual([]);

      const documentOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(documentOverflow).toBeLessThanOrEqual(0);

      // UX-005: interactive targets are at least 44x44 CSS pixels.
      const undersized = await page.evaluate(() => {
        const stage = document.querySelector('.variant-stage');
        if (stage === null) return [];
        return [...stage.querySelectorAll<HTMLElement>('button, summary, a')]
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return {
              selector: `${el.tagName.toLowerCase()}.${el.className.split(' ')[0] ?? ''}`,
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            };
          })
          .filter((entry) => entry.h > 0 && (entry.h < 44 || entry.w < 44));
      });
      expect(undersized).toEqual([]);
    });

    test('remains usable at 200 percent text zoom', async ({ page }) => {
      await openVariant(page, variant.letter);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });

      // The decision must survive the zoom, and still not scroll sideways.
      const stage = page.locator('.variant-stage');
      await expect(stage).toContainText(/Activity One|Nothing requires attention/);

      const horizontal = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontal).toBeLessThanOrEqual(0);
    });
  });
}
