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
const PORT = 4173;
const BASE_URL = `http://localhost:${String(PORT)}/life-command-os/`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] === undefined ? 0 : 1,
  workers: 1,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // A representative phone viewport, since the gate requires phone verification.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    command: `npm run preview -- --port ${String(PORT)} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 120_000,
  },
});
