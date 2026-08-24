import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import BulkOrdersPage from './BulkOrdersPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BulkOrdersPage />
  </StrictMode>
);
