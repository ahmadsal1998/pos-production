import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/app/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute component that checks authentication status and subscription status.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated but subscription is expired, redirects to /subscription-expired.
 * If user is authenticated and subscription is active, renders the children.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, subscriptionStatus, checkSubscriptionStatus } = useAuthStore();

  // Check subscription status on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user && user.role !== 'Admin' && user.storeId) {
      // Check subscription status if not already checked or if it's expired
      if (!subscriptionStatus || subscriptionStatus.subscriptionExpired || !subscriptionStatus.isActive) {
        checkSubscriptionStatus();
      }
    }
  }, [isAuthenticated, user, subscriptionStatus, checkSubscriptionStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check subscription status for store users (not admins)
  if (user && user.role !== 'Admin' && user.storeId) {
    if (subscriptionStatus && (subscriptionStatus.subscriptionExpired || !subscriptionStatus.isActive)) {
      return <Navigate to="/subscription-expired" replace />;
    }
  }

  return <>{children}</>;
};

