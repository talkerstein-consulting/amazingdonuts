import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ShopPage from './ShopPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShopPage />
  </StrictMode>
);
