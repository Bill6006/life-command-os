/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Quiet build metadata injected at build time by vite.config.ts (Phase 1 task 10). */
declare const __BUILD_PLAN_VERSION__: string;
declare const __BUILD_PHASE__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

/** False in every production build. See the note in vite.config.ts. */
declare const __TEST_BRIDGE__: boolean;
