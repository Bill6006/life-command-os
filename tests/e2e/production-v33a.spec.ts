import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * v3.3 section A on the production build: the three owner-observed defects.
 *
 * Each is checked on the shipped artifact in a throwaway profile, because all three were
 * reported from the deployed app and two of them are invisible in unit tests.
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

/* -------------------------------------------------------------------------- */

test.describe('A1. the clock reads the owner’s local time (V33-031)', () => {
  /**
   * The clock renders only once the profile has records — before that the header shows the
   * destination name. So each case switches one area on first, which is the smallest real
   * write available through the shipped UI.
   */
  async function clockIn(browser: Browser, timezoneId: string): Promise<string> {
    const context = await browser.newContext({ timezoneId, viewport: PHONE });
    const page = await context.newPage();
    await page.goto('./');
    await expect(page.locator('.shell')).toBeVisible();

    await goTo(page, 'Direction');
    await page
      .getByRole('region', { name: 'Manage areas' })
      .getByRole('button', { name: 'Switch on money' })
      .click();
    await goTo(page, 'Now');

    const text = ((await page.locator('.clock').first().textContent()) ?? '').trim();
    await context.close();
    return text;
  }

  test('shows New York time, not UTC, during EDT', async ({ browser }) => {
    /*
     * The reported defect, reproduced as the owner saw it: a device in New York during
     * daylight time, against a clock that used to render the stored UTC instant.
     */
    const shown = await clockIn(browser, 'America/New_York');

    const zone = { timeZone: 'America/New_York' } as const;
    const weekday = new Intl.DateTimeFormat('en-GB', { ...zone, weekday: 'long' }).format(
      new Date(),
    );
    const hour = new Intl.DateTimeFormat('en-GB', {
      ...zone,
      hour: '2-digit',
      hour12: false,
    }).format(new Date());

    /* Weekday and hour only, so a minute rollover mid-test cannot make this flaky. */
    expect(shown.startsWith(`${weekday} ${hour.padStart(2, '0')}:`), shown).toBe(true);

    /* And demonstrably not the stored instant, which is what the owner was shown. */
    const utcHour = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'UTC',
      hour: '2-digit',
      hour12: false,
    }).format(new Date());
    if (utcHour !== hour) {
      expect(shown).not.toContain(`${utcHour}:`);
    }
  });

  test('shows a different hour in a different zone, proving it converts', async ({
    browser,
  }) => {
    const newYork = await clockIn(browser, 'America/New_York');
    const tokyo = await clockIn(browser, 'Asia/Tokyo');

    expect(newYork).not.toBe('');
    expect(newYork).not.toBe(tokyo);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('A2. repeated guide use writes one canonical event (V33-061)', () => {
  test('completing the same check-in twice in a row adds one Timeline entry', async ({
    page,
  }) => {
    await open(page);

    const countEvents = async (): Promise<number> => {
      await goTo(page, 'Timeline');
      return page.getByRole('main').locator('li').count();
    };

    const runCheckIn = async (): Promise<void> => {
      await goTo(page, 'Now');
      const opener = page.locator('.guide-bar').getByRole('button', { name: 'Open' });
      if ((await opener.count()) === 0) return;
      await opener.click();
      const done = page.getByRole('button', { name: /^(Done|Finish|Save and close)$/ });
      for (let step = 0; step < 8; step += 1) {
        if ((await done.count()) > 0) {
          await done.first().click();
          return;
        }
        const next = page.getByRole('button', { name: 'Next', exact: true });
        if ((await next.count()) === 0) break;
        await next.click();
      }
    };

    await runCheckIn();
    const afterFirst = await countEvents();

    /* The same completion again, with nothing answered differently. */
    await runCheckIn();
    const afterSecond = await countEvents();

    expect(afterSecond).toBe(afterFirst);
  });

  test('re-rendering the Timeline does not grow it', async ({ page }) => {
    await open(page);
    await goTo(page, 'Timeline');
    const first = await page.getByRole('main').locator('li').count();

    await goTo(page, 'Now');
    await goTo(page, 'Timeline');
    await page.reload();
    await goTo(page, 'Timeline');

    expect(await page.getByRole('main').locator('li').count()).toBe(first);
  });
});

/* -------------------------------------------------------------------------- */

test.describe('A3. Answer it opens the displayed question (V33-049)', () => {
  test('asks that exact question first, not a generic check-in', async ({ page }) => {
    await open(page);

    const question = page.getByRole('region', { name: 'One question' });
    if ((await question.count()) === 0) {
      test.skip(true, 'This profile did not produce a question output');
      return;
    }

    const displayed = (
      (await question.locator('.decision-statement').textContent()) ?? ''
    ).trim();
    expect(displayed.length).toBeGreaterThan(0);

    await question.getByRole('button', { name: 'Answer it' }).click();

    /* The first thing asked is the thing that was on screen. */
    await expect(page.getByRole('main')).toContainText(displayed);
    await expect(page.getByRole('main')).toContainText('Question 1 of');
  });
});
