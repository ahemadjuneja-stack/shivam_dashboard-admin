import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Clear old local storage blobs to prevent QuotaExceededError
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shivam-wholesale-pc-') && key !== 'shivam-wholesale-pc-v9') {
      localStorage.removeItem(key);
    }
  }
} catch (e) {
  console.error("Local storage cleanup failed", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
