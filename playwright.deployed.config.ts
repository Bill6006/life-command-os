import { defineConfig, devices } from '@playwright/test';

/**
 * Verification against the **deployed** build, in an isolated browser context.
 *
 * Same specs as the production project, pointed at GitHub Pages instead of a local
 * preview, and started with no server of its own. Every test gets a fresh Playwright
 * context, so this proves the deployed artifact works from a genuinely new profile
 * **without going near the owner's browser storage** — which is what Master Plan v3.2
 * Part V now makes a stop condition, after Prompt 8D's verification cleared an
 * IndexedDB to obtain a fresh profile and destroyed the records in it.
 *
 * Run explicitly, after a deploy has landed:
 *
 *   npx playwright test --config playwright.deployed.config.ts
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch:
    /(production-learning-map|production-areas|production-emotional|production-faith)\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: 'https://bill6006.github.io/life-command-os/',
    trace: 'off',
  },
  projects: [{ name: 'deployed-chromium' }],
});
