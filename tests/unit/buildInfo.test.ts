import { describe, expect, it } from 'vitest';
import { buildInfo, shortCommit } from '../../src/app/buildInfo';

/** OPS-002: the owner must be able to confirm which commit a preview was built from. */
describe('build metadata', () => {
  it('exposes the four fields required for deployed-commit verification', () => {
    expect(buildInfo.planVersion).toBe('2.6 Lean Execution');
    expect(buildInfo.phase).toBe('Phase 1 (test)');
    expect(buildInfo.commit).toHaveLength(40);
    expect(buildInfo.builtAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('shortens a commit for display', () => {
    expect(shortCommit('a2dc5a4d0e6056ddd0f2fc7c3bfaae7f355ab080')).toBe('a2dc5a4');
  });

  it('passes through an unknown commit rather than inventing one', () => {
    // Missing information never becomes a plausible-looking value.
    expect(shortCommit('unknown')).toBe('unknown');
  });
});
