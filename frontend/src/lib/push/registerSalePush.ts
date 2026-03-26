import { apiClient, getApiBaseUrl } from '@/lib/api/client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  const base = getApiBaseUrl().replace(/\/$/, '');
  const url = `${base}/push/vapid-public-key`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.success || !json.data?.publicKey) return null;
  return json.data.publicKey as string;
}

/**
 * Ensures the PWA service worker is registered and active (required before push on iOS).
 * Uses the same registration entry as vite-plugin-pwa when available.
 */
export async function ensureServiceWorkerReadyForPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const { registerSW } = await import('virtual:pwa-register');
    await registerSW({ immediate: true });
  } catch {
    // Tests or non-Vite env: rely on existing registration
  }

  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export type RegisterSalePushResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unsupported' | 'not_configured' | 'denied' | 'no_subscription' | 'error' | 'permission_pending';
    };

export type RegisterSalePushOptions = {
  /**
   * If false, never calls `Notification.requestPermission()` (use after user already granted in a click handler).
   * If true (default), requests permission when still "default" (OK for desktop/Android auto flow).
   */
  requestPermission?: boolean;
};

/**
 * Subscribes to Web Push and POSTs the subscription (scoped to store via JWT).
 * Call `requestPermission` from a **direct user gesture** on iOS before or use {@link subscribeSalePushFromUserGesture}.
 */
export async function registerSalePushNotifications(
  options: RegisterSalePushOptions = {}
): Promise<RegisterSalePushResult> {
  const requestPermission = options.requestPermission !== false;

  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const registration = await ensureServiceWorkerReadyForPush();
  if (!registration?.active) {
    return { ok: false, reason: 'no_subscription' };
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'not_configured' };
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    if (!requestPermission) {
      return { ok: false, reason: 'permission_pending' };
    }
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch {
      return { ok: false, reason: 'no_subscription' };
    }
  }

  try {
    await apiClient.post('push/subscribe', { subscription: subscription.toJSON() });
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * iOS-safe flow: run inside an `onClick` handler.
 * Request permission first (keeps the user gesture), then activate SW, then subscribe — same as Apple’s recommended order for Web Push on iOS.
 */
export async function subscribeSalePushFromUserGesture(): Promise<RegisterSalePushResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  await ensureServiceWorkerReadyForPush();

  return registerSalePushNotifications({ requestPermission: false });
}
