import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } = useRegisterSW({
    onNeedRefresh: () => {},
    onOfflineReady: () => {},
  });

  useEffect(() => {
    // Check if already installed (standalone or display-mode standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show install banner after a short delay so the app has loaded
      const shown = sessionStorage.getItem('pwa-install-banner-shown');
      if (!shown) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    sessionStorage.setItem('pwa-install-banner-shown', 'true');
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa-install-banner-shown', 'true');
  };

  if (isInstalled) return null;

  return (
    <>
      {/* Add to Home Screen / Install banner */}
      {showInstallBanner && deferredPrompt && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[9999] rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:border-orange-800 dark:bg-gray-800 sm:left-auto sm:right-4 sm:max-w-sm"
          role="dialog"
          aria-label="Install app"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 dark:text-white">Install POS Hub</p>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                Install on your device to use like an app and work offline.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleInstall}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
                >
                  Install
                </button>
                <button
                  type="button"
                  onClick={dismissInstall}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissInstall}
              className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* New content available - refresh prompt */}
      {(needRefresh || offlineReady) && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[9999] rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:left-auto sm:right-4 sm:max-w-sm"
          role="dialog"
          aria-label="Update available"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {offlineReady ? 'App ready to use offline.' : 'New content available.'}
            </p>
            <div className="flex gap-2">
              {needRefresh && (
                <button
                  type="button"
                  onClick={() => updateServiceWorker(true)}
                  className="rounded-lg bg-orange-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
                >
                  Refresh
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setNeedRefresh(false);
                  setOfflineReady(false);
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallPrompt;
