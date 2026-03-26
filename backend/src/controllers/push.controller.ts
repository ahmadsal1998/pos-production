import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import PushSubscription from '../models/PushSubscription';
import { getVapidPublicKey, pushNotificationService } from '../services/pushNotification.service';

/** Public: browser needs the VAPID public key to subscribe (safe to expose). */
export const getVapidPublicKeyHandler = asyncHandler(async (_req, res: Response) => {
  const key = getVapidPublicKey();
  if (!key) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications are not configured on the server.',
    });
  }
  return res.status(200).json({
    success: true,
    data: { publicKey: key },
  });
});

/**
 * Register or refresh this device's push subscription for the authenticated store.
 * Body: { subscription: PushSubscriptionJSON } (from registration.pushManager.subscribe)
 */
export const subscribePush = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(403).json({
      success: false,
      message: 'A store account is required to receive sale notifications.',
    });
  }

  if (!pushNotificationService.isConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Push notifications are not configured on the server.',
    });
  }

  const sub = req.body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;

  if (!endpoint || typeof endpoint !== 'string' || !p256dh || !auth) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription payload. Expected subscription.endpoint and subscription.keys (p256dh, auth).',
    });
  }

  const normalizedStoreId = storeId.toLowerCase().trim();
  const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 512) : undefined;

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      storeId: normalizedStoreId,
      endpoint,
      keys: { p256dh, auth },
      userAgent,
    },
    { upsert: true, new: true }
  );

  return res.status(200).json({
    success: true,
    message: 'Push subscription saved for this store.',
  });
});

/** Remove this device's subscription (e.g. user disabled notifications). */
export const unsubscribePush = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(403).json({
      success: false,
      message: 'A store account is required.',
    });
  }

  const endpoint = req.body?.endpoint;
  if (!endpoint || typeof endpoint !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'endpoint is required.',
    });
  }

  const normalizedStoreId = storeId.toLowerCase().trim();
  const result = await PushSubscription.deleteOne({
    endpoint,
    storeId: normalizedStoreId,
  });

  return res.status(200).json({
    success: true,
    message: result.deletedCount ? 'Subscription removed.' : 'No matching subscription.',
  });
});
