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

export type RegisterSalePushResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not_configured' | 'denied' | 'no_subscription' | 'error' };

/**
 * Registers the service worker (if needed), requests notification permission,
 * subscribes to Web Push with the server VAPID key, and POSTs the subscription to the API
 * scoped to the current store (JWT).
 */
export async function registerSalePushNotifications(): Promise<RegisterSalePushResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    return { ok: false, reason: 'not_configured' };
  }

  const registration = await navigator.serviceWorker.ready;

  let permission = Notification.permission;
  if (permission === 'default') {
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
