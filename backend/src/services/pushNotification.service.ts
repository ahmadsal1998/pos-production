/**
 * Web Push (VAPID) delivery for store-scoped notifications.
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in environment.
 */

import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription';
import { log } from '../utils/logger';

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:support@localhost').trim();
  if (!publicKey || !privateKey) {
    log.warn('[Push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set; push notifications are disabled.');
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  const k = process.env.VAPID_PUBLIC_KEY?.trim();
  return k || null;
}

export const pushNotificationService = {
  isConfigured(): boolean {
    return !!(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
  },

  /**
   * Notify all registered devices for this store (background push via service worker).
   */
  async notifySaleCompleted(storeId: string, invoiceNumber: string): Promise<void> {
    if (!ensureVapid()) return;

    const normalizedStoreId = storeId.toLowerCase().trim();
    const subs = await PushSubscription.find({ storeId: normalizedStoreId }).lean();
    if (!subs.length) return;

    const payload = JSON.stringify({
      title: 'Sale completed successfully',
      body: `Invoice ${invoiceNumber} was saved.`,
      tag: `sale-${invoiceNumber}`,
      data: { url: '/' },
    });

    for (const sub of subs) {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
      };
      try {
        await webpush.sendNotification(pushSub, payload, {
          TTL: 60,
          urgency: 'high',
        });
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
        }
        log.warn('[Push] sendNotification failed', { endpoint: sub.endpoint?.slice(0, 48), code, message: err?.message });
      }
    }
  },
};
