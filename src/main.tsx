import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import LenisProvider from './components/LenisProvider';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LenisProvider>
      <App />
    </LenisProvider>
  </StrictMode>,
);
