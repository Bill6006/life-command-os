/**
 * Vitest setup.
 *
 * happy-dom is deliberately absent: no unit test needs a DOM today, and real DOM
 * behaviour is proved in a real browser by Playwright. What unit tests do need is
 * IndexedDB, which Node does not provide.
 */
import 'fake-indexeddb/auto';

/**
 * Build-time constants are injected by Vite's `define` in a real build. Their types
 * come from src/vite-env.d.ts; this only supplies values so modules that read them
 * can be unit tested. Assigned rather than declared, to avoid redeclaring the
 * ambient `const` bindings.
 */
Object.assign(globalThis, {
  __BUILD_PLAN_VERSION__: '2.6 Lean Execution',
  __BUILD_PHASE__: 'Phase 1 (test)',
  __BUILD_COMMIT__: '0'.repeat(40),
  __BUILD_TIME__: '2026-01-01T00:00:00.000Z',
});
