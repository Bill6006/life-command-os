import { defineConfig, devices } from '@playwright/test';

/**
 * Critical browser tests (Phase 1 task 3).
 *
 * These run against the *built* application served by `vite preview`, not the dev
 * server, because the service worker, precache manifest, and repository base path
 * only behave correctly in a production build — which is exactly what the Phase 1
 * gate asks us to prove.
 *
 * Chromium only for now. The full browser matrix is a Phase 10 release requirement;
 * running it every commit today would cost CI time without producing new evidence.
 */
/**
 * Two builds are served, not one.
 *
 * The regression suite needs to seed a known corpus, which needs the test bridge —
 * and the test bridge is absent from production builds, because Prompt 7B requires it
 * gone from the private alpha. Rather than weaken one requirement to satisfy the
 * other, both builds are served: the suite drives the bridge build, and
 * `production-recovery.spec.ts` drives the **production** build through the real
 * interface only, which is where fresh-profile recovery is proved.
 */
const E2E_PORT = 4173;
const PRODUCTION_PORT = 4174;
const E2E_URL = `http://localhost:${String(E2E_PORT)}/life-command-os/`;
const PRODUCTION_URL = `http://localhost:${String(PRODUCTION_PORT)}/life-command-os/`;

const PRODUCTION_SPEC =
  /(production-recovery|production-areas|production-fatherhood|production-learning-map|production-emotional|production-faith|production-home|production-money|production-command-core|privacy-audit)\.spec\.ts/;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  workers: 1,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: PRODUCTION_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: E2E_URL },
    },
    {
      // A representative phone viewport, since the gate requires phone verification.
      name: 'mobile-chromium',
      testIgnore: PRODUCTION_SPEC,
      use: { ...devices['Pixel 7'], baseURL: E2E_URL },
    },
    {
      // The exact production artifact: no test bridge, no seeding, real UI only.
      name: 'production-chromium',
      testMatch: PRODUCTION_SPEC,
      use: { ...devices['Pixel 7'], baseURL: PRODUCTION_URL },
    },
  ],

  webServer: [
    {
      command: `npm run build:e2e && npm run preview:e2e -- --port ${String(E2E_PORT)} --strictPort`,
      url: E2E_URL,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
    {
      command: `npm run build && npm run preview -- --port ${String(PRODUCTION_PORT)} --strictPort`,
      url: PRODUCTION_URL,
      reuseExistingServer: process.env['CI'] === undefined,
      timeout: 180_000,
    },
  ],
});
