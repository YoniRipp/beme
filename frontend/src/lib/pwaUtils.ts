import { registerSW } from 'virtual:pwa-register';
import { FEATURE_FLAGS } from './featureFlags';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | undefined;

export function registerServiceWorker(): void {
  if (!FEATURE_FLAGS.PWA_ENABLED) {
    console.log('[PWA] Service worker registration skipped (feature flag disabled)');
    return;
  }

  if ('serviceWorker' in navigator) {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Dispatch event for UI to show a mobile-friendly update banner
        window.dispatchEvent(new CustomEvent('pwa:update-available'));
      },
      onOfflineReady() {
        console.log('[PWA] App ready to work offline');
      },
      onRegistered(registration) {
        console.log('[PWA] Service worker registered:', registration);
      },
      onRegisterError(error) {
        console.error('[PWA] Service worker registration failed:', error);
      },
    });
  }
}

export function applyUpdate(): void {
  updateSW?.(true);
}

export function unregisterServiceWorker(): Promise<void> {
  return new Promise((resolve) => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        Promise.all(registrations.map((r) => r.unregister())).then(() => {
          console.log('[PWA] All service workers unregistered');
          resolve();
        });
      });
    } else {
      resolve();
    }
  });
}

export function isPwaInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  );
}
