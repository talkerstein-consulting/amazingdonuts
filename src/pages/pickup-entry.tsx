import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import PickupPage from './PickupPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PickupPage />
  </StrictMode>
);
