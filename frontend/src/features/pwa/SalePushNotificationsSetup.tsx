import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store';
import { registerSalePushNotifications } from '@/lib/push/registerSalePush';

/**
 * After a store user signs in, registers Web Push so the backend can notify this device when a sale is saved.
 * Runs once per login session; safe to call multiple times (server upserts by endpoint).
 */
const SalePushNotificationsSetup = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeId = useAuthStore((s) => s.user?.storeId);
  const ranForSession = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !storeId) {
      ranForSession.current = false;
      return;
    }
    if (ranForSession.current) return;
    ranForSession.current = true;

    const id = window.setTimeout(() => {
      registerSalePushNotifications().catch(() => {});
    }, 2500);

    return () => clearTimeout(id);
  }, [isAuthenticated, storeId]);

  return null;
};

export default SalePushNotificationsSetup;
