import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './lib/pwaUtils';
import { initSyncManager } from './lib/syncManager';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register service worker for PWA support
registerServiceWorker();

// Initialize offline sync manager (auto-flushes queue when back online)
initSyncManager();
