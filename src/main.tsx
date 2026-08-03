import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installDiagnosticsBridge } from './app/diagnostics';
import { AppShell } from './ui/features/shell/AppShell';
import './ui/styles/base.css';

// Temporary; removed in Phase 3 once the real interface can exercise storage.
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
