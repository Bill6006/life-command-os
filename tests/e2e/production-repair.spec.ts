import { expect, test, type Page } from '@playwright/test';

/**
 * Opens the Manage areas drawer (`V33-016`, v3.3 B7).
 *
 * The panel leads with a count and keeps its switches behind a disclosure, because
 * management is rare and deliberate while Direction's job is showing what is going on.
 * Anything reaching for a switch opens it first, exactly as the owner does.
 */
async function openAreaDrawer(page: Page): Promise<void> {
  const drawer = page
    .getByRole('region', { name: 'Manage areas' })
    .locator('details.areas-drawer');
  if ((await drawer.count()) === 0) return;
  if (await drawer.evaluate((node: HTMLDetailsElement) => node.open)) return;
  await drawer.locator('summary').click();
}

/**
 * The Phase 8 repair pass, on the production build.
 *
 * Each block is one of the six items, checked where it actually has to hold: on the
 * shipped artifact, in a throwaway profile, driven through the controls an owner uses.
 */

const PHONE = { width: 375, height: 812 };

async function open(page: Page): Promise<void> {
  await page.setViewportSize(PHONE);
  await page.goto('./');
  await expect(page.locator('.shell')).toBeVisible();
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

const manageAreas = (page: Page) => page.getByRole('region', { name: 'Manage areas' });

async function switchOn(page: Page, area: string): Promise<void> {
  await openAreaDrawer(page);
  await manageAreas(page)
    .getByRole('button', { name: `Switch on ${area.toLowerCase()}` })
    .click();
}

/* -------------------------------------------------------------------------- */

test.describe('cadence narrows, and never offers a way to widen', () => {
  test('shows three options and no "more often"', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Money');

    const cadence = manageAreas(page).getByRole('group', { name: /^How often money/ });
    await expect(cadence).toBeVisible();
    await expect(cadence.getByRole('button')).toHaveCount(3);
    await expect(cadence.getByRole('button', { name: 'Normal' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const text = ((await manageAreas(page).textContent()) ?? '').toLowerCase();
    expect(text).not.toContain('more often');
    expect(text).not.toContain('remind me');
  });

  test('records a quieter cadence and says what it means', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Money');

    await openAreaDrawer(page);
    await manageAreas(page)
      .getByRole('group', { name: /^How often money/ })
      .getByRole('button', { name: 'Only when I open it' })
      .click();

    await expect(manageAreas(page)).toContainText('Never raised on its own');
    await expect(manageAreas(page)).toContainText('not counted as forgotten');

    await page.reload();
    await goTo(page, 'Direction');
    /* A reload is a fresh mount, so the drawer starts closed again — as it should. */
    await openAreaDrawer(page);
    await expect(
      manageAreas(page)
        .getByRole('group', { name: /^How often money/ })
        .getByRole('button', { name: 'Only when I open it' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('snoozes an area with an end and no debt', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');

    await manageAreas(page).getByRole('button', { name: 'Snooze for a fortnight' }).click();
    await expect(manageAreas(page)).toContainText('Snoozed until');
    await expect(manageAreas(page)).toContainText('Nothing is owed when it ends');
  });
});

/* -------------------------------------------------------------------------- */

test.describe('a faith practice is protected on Now', () => {
  test('offers the Now surface as a separate decision, denied by default', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');
    await page
      .getByRole('region', { name: 'Faith and meaning', exact: true })
      .getByRole('button', { name: 'Update this area' })
      .click();

    const permissions = page.getByRole('region', { name: 'Where sensitive topics may appear' });
    await expect(permissions).toBeVisible();

    const practice = permissions.getByRole('group', { name: /^Where practices/ });
    await expect(practice.getByRole('button', { name: 'The Now screen' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  test('shows only this area’s topics, not every area’s', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');
    await page
      .getByRole('region', { name: 'Faith and meaning', exact: true })
      .getByRole('button', { name: 'Update this area' })
      .click();

    const permissions = page.getByRole('region', { name: 'Where sensitive topics may appear' });
    const text = (await permissions.textContent()) ?? '';
    expect(text).toContain('Practices, in your words');
    expect(text).toContain('Doubt and struggle');
    // Money's and emotional's settings belong on their own pages.
    expect(text).not.toContain('Amounts and balances');
    expect(text).not.toContain('Private patterns');
  });

  test('grants the surface and keeps the grant', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Faith and meaning');
    await page
      .getByRole('region', { name: 'Faith and meaning', exact: true })
      .getByRole('button', { name: 'Update this area' })
      .click();

    await page
      .getByRole('region', { name: 'Where sensitive topics may appear' })
      .getByRole('group', { name: /^Where practices/ })
      .getByRole('button', { name: 'The Now screen' })
      .click();

    await expect(
      page
        .getByRole('region', { name: 'Where sensitive topics may appear' })
        .getByRole('group', { name: /^Where practices/ })
        .getByRole('button', { name: 'The Now screen' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});

/* -------------------------------------------------------------------------- */

test.describe('Direction shows each reading once', () => {
  test('renders no two panels with the same accessible name', async ({ page }) => {
    /*
     * The general form of the duplication. Prompt 8H worked around an exact collision by
     * renaming money's category label; this asserts the collision cannot occur at all.
     */
    await open(page);
    await goTo(page, 'Direction');
    for (const area of [
      'Health, recovery, and energy',
      'Career and learning',
      'Faith and meaning',
      'Home and environment',
      'Money',
    ]) {
      await switchOn(page, area);
    }

    /*
     * `Panel` labels its section with `aria-labelledby` pointing at the heading, so the
     * accessible name is the heading text rather than an `aria-label` attribute. Reading
     * the attribute returned empty strings and made the assertion look like a product
     * failure when it was a test failure.
     */
    const names = await page
      .getByRole('main')
      .getByRole('region')
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const labelledBy = node.getAttribute('aria-labelledby');
          const heading =
            labelledBy === null ? null : node.ownerDocument.getElementById(labelledBy);
          return (heading?.textContent ?? node.getAttribute('aria-label') ?? '').trim();
        }),
      );

    expect(new Set(names).size, `duplicate panel names: ${names.join(' | ')}`).toBe(
      names.length,
    );
  });

  test('keeps the full domain detail while removing the duplicate summary', async ({
    page,
  }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Money');

    const panel = page.getByRole('region', { name: 'Money', exact: true });
    await expect(panel).toContainText('What is the pressure, and what would reduce it?');
    /* Drivers live with the rest of the evidence, behind `More detail` (B6). */
    await panel.getByRole('button', { name: 'More detail', exact: true }).click();
    await expect(panel).toContainText('Principal drivers');
    await expect(panel).toContainText('Update this area');
  });

  test('still shows a category no domain covers', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await expect(
      page.getByRole('region', { name: 'Time, attention & capacity' }),
    ).toBeVisible();
  });
});

/* -------------------------------------------------------------------------- */

test.describe('Now stays one answer', () => {
  test('is compact with every area on and every cadence at normal', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    for (const area of [
      'Health, recovery, and energy',
      'Career and learning',
      'Fatherhood and child development',
      'Emotional state and relationships',
      'Faith and meaning',
      'Home and environment',
      'Money',
    ]) {
      await switchOn(page, area);
    }

    await goTo(page, 'Now');
    expect(await page.locator('.grid > .panel').count()).toBeLessThanOrEqual(5);
  });

  test('no horizontal overflow with the cadence controls on a phone', async ({ page }) => {
    await open(page);
    await goTo(page, 'Direction');
    await switchOn(page, 'Money');
    await switchOn(page, 'Faith and meaning');

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
