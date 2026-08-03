import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installDiagnosticsBridge } from './app/diagnostics';
import { AppShell } from './ui/features/shell/AppShell';

// Tokens first: the reset and every component style reference them.
import './ui/design-system/tokens.css';
import './ui/styles/base.css';

// Temporary; removed when the interface can exercise storage directly.
installDiagnosticsBridge();

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
