/**
 * Quiet build metadata (Phase 1 task 10, OPS-002).
 *
 * This exists so the owner can confirm that the build they are looking at on the
 * GitHub Pages preview is the gate-approved commit. It belongs under About or More.
 * It must never become a primary-surface "system status" panel — normal operational
 * state consumes no dedicated panel (UX-011, Product Constitution §12.11).
 */
export interface BuildInfo {
  readonly planVersion: string;
  readonly phase: string;
  readonly commit: string;
  readonly builtAt: string;
}

export const buildInfo: BuildInfo = {
  planVersion: __BUILD_PLAN_VERSION__,
  phase: __BUILD_PHASE__,
  commit: __BUILD_COMMIT__,
  builtAt: __BUILD_TIME__,
};

/** Short commit form for display. Full value stays available for exact verification. */
export function shortCommit(commit: string): string {
  return commit === 'unknown' ? commit : commit.slice(0, 7);
}
