/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: (string | { url: string; revision: string | null })[];
};

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

try {
  const handler = createHandlerBoundToURL('/index.html');
  registerRoute(new NavigationRoute(handler, { denylist: [/^\/api\//] }));
} catch {
  // Dev or empty precache: navigation fallback not bound
}

registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 10,
    plugins: [],
  })
);

self.addEventListener('push', (event: PushEvent) => {
  let payload: { title?: string; body?: string; tag?: string; data?: { url?: string } } = {};
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch {
    const t = event.data?.text();
    payload = { title: 'POS Point Hub', body: t || 'Sale completed successfully' };
  }
  const title = payload.title || 'POS Point Hub';
  const body = payload.body || 'Sale completed successfully';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: payload.tag || 'sale-notification',
      data: payload.data,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  const url = data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return (client as WindowClient).focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
      return undefined;
    })
  );
});
