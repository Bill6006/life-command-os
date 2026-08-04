/**
 * Narrows away `undefined` with a failure that names what was missing.
 *
 * Preferred over `!` because a test that silently proceeds on a missing fixture
 * reports the wrong failure — you get a confusing assertion error three lines later
 * instead of "no prompt called state:energy".
 */
export function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`Test fixture missing: ${what}`);
  return value;
}
