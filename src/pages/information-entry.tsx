import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import InformationPage from './InformationPage';

createRoot(document.getElementById('root')!).render(<StrictMode><InformationPage /></StrictMode>);
