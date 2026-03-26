import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/app/store';
import {
  isIosDevice,
  isStandalonePwa,
  shouldUseManualPushSubscription,
} from '@/lib/push/platform';
import {
  ensureServiceWorkerReadyForPush,
  subscribeSalePushFromUserGesture,
} from '@/lib/push/registerSalePush';

/** Session-only dismiss so a user who tapped "Not now" in Safari still sees the banner after opening from Home Screen. */
const DISMISS_SESSION_KEY = 'sale-push-ios-banner-dismissed';

/**
 * iOS (16.4+): Web Push requires Home Screen PWA + notification permission from a user gesture.
 * Shows an explicit "Enable Notifications" control; does not render on Android/desktop.
 */
const EnableSaleNotificationsPrompt = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeId = useAuthStore((s) => s.user?.storeId);

  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [alreadyEnabled, setAlreadyEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ios = shouldUseManualPushSubscription();
  const standalone = isStandalonePwa();

  // Warm service worker early so the tap handler only asks permission + subscribes.
  useEffect(() => {
    if (!isAuthenticated || !storeId || !ios) return;
    ensureServiceWorkerReadyForPush().catch(() => {});
  }, [isAuthenticated, storeId, ios]);

  // Hide if user already has an active push subscription for this profile.
  useEffect(() => {
    if (!isAuthenticated || !storeId || !ios) return;
    let cancelled = false;
    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled && sub && Notification.permission === 'granted') {
          setAlreadyEnabled(true);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, storeId, ios]);

  const handleEnable = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await subscribeSalePushFromUserGesture();
      if (result.ok) {
        setAlreadyEnabled(true);
      } else if (result.message) {
        setError(result.message);
      } else if (result.reason === 'denied') {
        setError('Notifications were blocked. Enable them in Settings → Safari → your site, or Settings → Notifications.');
      } else if (result.reason === 'not_configured') {
        setError('Sale alerts are not configured on the server yet.');
      } else if (result.reason === 'unsupported') {
        setError('vice does not support web push notifications.');
      } else {
        setError('Could not enable notifications. Tap Enable again in a few seconds, or sign in again if the problem continues.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
    } catch {
      // ignore
    }
    setDismissed(true);
  }, []);

  if (!ios || !isAuthenticated || !storeId) return null;
  if (dismissed || alreadyEnabled) return null;

  const showInstallFirst = isIosDevice() && !standalone;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[9998] rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg dark:border-amber-800 dark:bg-amber-950/90 sm:left-auto sm:right-4 sm:max-w-md"
      role="dialog"
      aria-label="Sale notifications"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-amber-50">Sale notifications (iPhone)</p>
          {showInstallFirst ? (
            <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
              Add POS Hub to your Home Screen first: tap <span className="font-medium">Share</span>, then{' '}
              <span className="font-medium">Add to Home Screen</span>. Open the app from the home icon, then enable
              notifications below.
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-100/90">
              Tap the button to allow alerts when a sale is saved. This is required on iPhone.
            </p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-700 dark:text-red-300" role="alert">
              {error}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading || showInstallFirst}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Enabling…' : 'Enable notifications'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-200/60 dark:text-amber-200 dark:hover:bg-amber-900"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EnableSaleNotificationsPrompt;
