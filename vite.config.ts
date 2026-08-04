/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * OPS-002: the application is served from a GitHub Pages project site, so every
 * asset, manifest, and service-worker path must resolve under this base. Dev uses
 * the same base deliberately, so base-path mistakes fail locally instead of only
 * on the deployed preview.
 */
const BASE_PATH = '/life-command-os/';

/** Quiet build metadata (Phase 1 task 10). Surfaced under About, never on a primary surface. */
function resolveCommit(): string {
  // GitHub Actions provides the exact deployed commit; fall back to local git.
  const fromCi = process.env['GITHUB_SHA'];
  if (fromCi !== undefined && fromCi !== '') return fromCi;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precaching the built shell is what makes the offline gate demonstrable.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: `${BASE_PATH}index.html`,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Life Command OS',
        short_name: 'Life Command',
        description: 'A private, local-first personal decision-intelligence system.',
        id: BASE_PATH,
        start_url: BASE_PATH,
        scope: BASE_PATH,
        display: 'standalone',
        orientation: 'portrait-primary',
        // Luminous Dark Command Surface canvas (UX-001).
        theme_color: '#07111F',
        background_color: '#07111F',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  define: {
    __BUILD_PLAN_VERSION__: JSON.stringify('3.0 Final'),
    __BUILD_PHASE__: JSON.stringify('Phase 6 (Prompt 7A)'),
    __BUILD_COMMIT__: JSON.stringify(resolveCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    // Node environment is sufficient today: the only unit-tested code is storage and
    // build metadata. Real DOM behaviour is verified in a real browser by Playwright,
    // so a DOM shim would add a dependency without adding evidence (LEAN-005).
    // Phase 3 introduces component tests and the DOM environment they need.
    environment: 'node',
    globals: false,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts'],
  },
});
