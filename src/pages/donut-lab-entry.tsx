import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DonutLabPage from './DonutLabPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DonutLabPage />
  </StrictMode>
);
