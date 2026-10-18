import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import './index.css';
import App from './App.tsx';
import { store } from './store';
import { registerSW } from 'virtual:pwa-register';
import { NATIVE_BUILD } from './platform/platform';

// Register the service worker. The native apps have their files in the package and update with it.
if (!NATIVE_BUILD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('New content available. Reload to update?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
