import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CareersPage from './CareersPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CareersPage />
  </StrictMode>
);
