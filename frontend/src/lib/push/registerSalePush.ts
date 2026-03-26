import { apiClient, getApiBaseUrl, getApiErrorMessage } from '@/lib/api/client';

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

/** Visible in Safari → Develop / Web Inspector on device (and desktop) for diagnosing iOS push issues. */
function pushLog(step: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.info('[SalePush]', step, detail);
  } else {
    console.info('[SalePush]', step);
  }
}

async function fetchVapidPublicKey(): Promise<{ key: string | null; fetchError?: string }> {
  try {
    const base = getApiBaseUrl().replace(/\/$/, '');
    const url = `${base}/push/vapid-public-key`;
    pushLog('fetch VAPID key', { url });
    const res = await fetch(url);
    if (!res.ok) {
      return { key: null, fetchError: `VAPID endpoint HTTP ${res.status}` };
    }
    const json = await res.json();
    if (!json.success || !json.data?.publicKey) {
      return { key: null, fetchError: 'Server did not return a VAPID public key' };
    }
    return { key: json.data.publicKey as string };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { key: null, fetchError: msg };
  }
}

/**
 * Registers the PWA service worker (vite-plugin-pwa) and returns when `navigator.serviceWorker.ready` resolves.
 */
export async function ensureServiceWorkerReadyForPush(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    const { registerSW } = await import('virtual:pwa-register');
    await registerSW({ immediate: true });
    pushLog('registerSW(immediate) done');
  } catch (e) {
    pushLog('registerSW skipped or failed', { error: String(e) });
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    pushLog('navigator.serviceWorker.ready', {
      hasActive: !!reg.active,
      hasInstalling: !!reg.installing,
      hasWaiting: !!reg.waiting,
    });
    return reg;
  } catch (e) {
    pushLog('serviceWorker.ready failed', { error: String(e) });
    return null;
  }
}

/**
 * Waits until a controlling service worker is **activated** (required before `pushManager.subscribe` on iOS).
 * Handles installing/waiting lifecycles and polls until `active` exists or timeout.
 */
export async function waitForActiveServiceWorkerForPush(options?: {
  maxMs?: number;
  intervalMs?: number;
}): Promise<ServiceWorkerRegistration | null> {
  const maxMs = options?.maxMs ?? 20000;
  const intervalMs = options?.intervalMs ?? 120;

  await ensureServiceWorkerReadyForPush();

  const start = Date.now();

  const waitForInstallingToActivate = (reg: ServiceWorkerRegistration): Promise<void> => {
    const sw = reg.installing || reg.waiting;
    if (!sw) return Promise.resolve();
    return new Promise((resolve) => {
      const onState = () => {
        if (sw.state === 'activated' || sw.state === 'redundant') {
          sw.removeEventListener('statechange', onState);
          resolve();
        }
      };
      sw.addEventListener('statechange', onState);
      if (sw.state === 'activated') {
        sw.removeEventListener('statechange', onState);
        resolve();
      }
    });
  };

  while (Date.now() - start < maxMs) {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.ready.catch(() => null);
    }
    if (!reg) {
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }

    if (reg.installing || reg.waiting) {
      pushLog('SW installing/waiting', {
        installing: !!reg.installing,
        waiting: !!reg.waiting,
      });
      await waitForInstallingToActivate(reg);
    }

    if (reg.active?.state === 'activated') {
      pushLog('SW active (ready for push)', { scriptURL: reg.active.scriptURL });
      return reg;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  const finalReg = await navigator.serviceWorker.getRegistration();
  pushLog('waitForActiveServiceWorkerForPush timeout', {
    hasRegistration: !!finalReg,
    hasActive: !!finalReg?.active,
  });
  return finalReg?.active ? finalReg : null;
}

export type RegisterSalePushResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'unsupported'
        | 'not_configured'
        | 'denied'
        | 'no_subscription'
        | 'error'
        | 'permission_pending'
        | 'api_error';
      /** User-facing or developer detail */
      message?: string;
      httpStatus?: number;
    };

export type RegisterSalePushOptions = {
  requestPermission?: boolean;
};

async function completePushSubscription(
  registration: ServiceWorkerRegistration
): Promise<RegisterSalePushResult> {
  if (!registration.active) {
    return {
      ok: false,
      reason: 'no_subscription',
      message: 'Service worker is not active yet. Tap Enable again in a moment.',
    };
  }

  const { key: publicKey, fetchError } = await fetchVapidPublicKey();
  if (!publicKey) {
    pushLog('VAPID key missing', { fetchError });
    return {
      ok: false,
      reason: 'not_configured',
      message: fetchError
        ? `Could not load notification keys (${fetchError}). Check API URL and network.`
        : 'Sale alerts are not configured on the server.',
    };
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      pushLog('pushManager.subscribe starting');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      pushLog('pushManager.subscribe OK', { endpoint: subscription.endpoint?.slice(0, 48) + '…' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog('pushManager.subscribe failed', { message: msg });
      return {
        ok: false,
        reason: 'no_subscription',
        message:
          'Could not create a push subscription. If this persists, close the app fully and reopen from the Home Screen, then tap Enable again.',
      };
    }
  } else {
    pushLog('using existing push subscription');
  }

  const payload = subscription.toJSON();
  try {
    pushLog('POST /push/subscribe', { hasAuth: !!localStorage.getItem('auth-token') });
    await apiClient.post('push/subscribe', { subscription: payload });
    pushLog('POST /push/subscribe success');
    return { ok: true };
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { message?: string } } };
    const status = err.response?.status;
    const serverMsg = err.response?.data?.message;
    const msg = getApiErrorMessage(e, 'Could not save notification subscription.');
    pushLog('POST /push/subscribe failed', {
      httpStatus: status,
      message: serverMsg || msg,
    });
    if (status === 401) {
      return {
        ok: false,
        reason: 'api_error',
        httpStatus: status,
        message: 'Session expired. Sign out and sign in again, then tap Enable.',
      };
    }
    if (status === 403) {
      return {
        ok: false,
        reason: 'api_error',
        httpStatus: status,
        message: serverMsg || 'Not allowed to register notifications for this account.',
      };
    }
    return {
      ok: false,
      reason: 'error',
      httpStatus: status,
      message: msg,
    };
  }
}

/**
 * Subscribes to Web Push and POSTs the subscription (scoped to store via JWT).
 */
export async function registerSalePushNotifications(
  options: RegisterSalePushOptions = {}
): Promise<RegisterSalePushResult> {
  const requestPermission = options.requestPermission !== false;

  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const registration = await waitForActiveServiceWorkerForPush({ maxMs: 20000 });
  if (!registration?.active) {
    return {
      ok: false,
      reason: 'no_subscription',
      message: 'Service worker is still starting. Wait a few seconds and try again.',
    };
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

  return completePushSubscription(registration);
}

/**
 * iOS: run inside `onClick`. Requests permission in the same handler chain as the tap, then waits for an **active** SW, then subscribes + POST.
 * Retrying the button is enough — no full page refresh required.
 */
export async function subscribeSalePushFromUserGesture(): Promise<RegisterSalePushResult> {
  pushLog('subscribeSalePushFromUserGesture: tap');

  if (typeof window === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  pushLog('Notification.permission after prompt', { permission });

  if (permission !== 'granted') {
    return { ok: false, reason: 'denied' };
  }

  const registration = await waitForActiveServiceWorkerForPush({ maxMs: 25000, intervalMs: 100 });
  if (!registration?.active) {
    return {
      ok: false,
      reason: 'no_subscription',
      message:
        'The app is still loading in the background. Tap Enable notifications again in a few seconds—you do not need to refresh the page.',
    };
  }

  return completePushSubscription(registration);
}
