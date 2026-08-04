import { spawnSync } from 'node:child_process';

/**
 * Builds the bundle the end-to-end suite drives.
 *
 * It differs from the production build in exactly one way: `LCOS_TEST_BRIDGE=1` makes
 * `__TEST_BRIDGE__` true, so the diagnostics module is included and the tests can seed
 * a known corpus into IndexedDB. Everything else — the base path, the service worker,
 * the minification — is identical.
 *
 * It goes to a separate directory so the production build can be served at the same
 * time. Fresh-profile recovery is proved against *that* one, through the real
 * interface, with no bridge present.
 *
 * A shell script would have done this on a Unix machine. This is a Node script because
 * the repository is developed on Windows, where `VAR=1 command` is a syntax error.
 */
import { fileURLToPath } from 'node:url';

// The binary is located on disk rather than through `require.resolve`, because Vite's
// package exports do not expose the CLI entry point, and rather than shelled out to
// `npx`, which needs `shell: true` on Windows and then drags quoting rules into
// something that does not need them.
const vite = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));

const result = spawnSync(
  process.execPath,
  [vite, 'build', '--outDir', 'dist-e2e', '--emptyOutDir'],
  {
    stdio: 'inherit',
    env: { ...process.env, LCOS_TEST_BRIDGE: '1' },
  },
);

process.exit(result.status ?? 1);
