import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/app/store';
import { shouldUseManualPushSubscription } from '@/lib/push/platform';
import { registerSalePushNotifications } from '@/lib/push/registerSalePush';
import EnableSaleNotificationsPrompt from '@/features/pwa/EnableSaleNotificationsPrompt';

/**
 * Desktop / Android: after a store user signs in, registers Web Push automatically (delayed).
 * iOS: push registration must use a user gesture — see {@link EnableSaleNotificationsPrompt}.
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
    if (shouldUseManualPushSubscription()) {
      return;
    }
    if (ranForSession.current) return;
    ranForSession.current = true;

    const id = window.setTimeout(() => {
      registerSalePushNotifications({ requestPermission: true }).catch(() => {});
    }, 2500);

    return () => clearTimeout(id);
  }, [isAuthenticated, storeId]);

  return <EnableSaleNotificationsPrompt />;
};

export default SalePushNotificationsSetup;
