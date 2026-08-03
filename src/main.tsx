import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './ui/features/shell/AppShell';
import './ui/styles/base.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root was not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
);
