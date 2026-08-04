import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './ui/features/shell/AppShell';

// Tokens first: the reset and every component style reference them.
import './ui/design-system/tokens.css';
import './ui/styles/base.css';

/**
 * The browser test bridge is **absent from production builds** (Prompt 7B task 18).
 *
 * `__TEST_BRIDGE__` is a compile-time constant, so this collapses to `if (false)` and
 * the import is dropped from the bundle entirely — the diagnostics module, the
 * scenario corpus, and the reset helper all go with it. That is removal rather than
 * concealment, and a test asserts the production output contains no trace of it.
 */
if (__TEST_BRIDGE__) {
  void import('./app/diagnostics').then((module) => {
    module.installDiagnosticsBridge();
  });
}

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
