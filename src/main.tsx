import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import BrandComponentsDemo from './components/brand/BrandComponentsDemo';

const showBrand = new URLSearchParams(location.search).has('brand');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{showBrand ? <BrandComponentsDemo /> : <App />}</StrictMode>
);
