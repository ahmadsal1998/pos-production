import { Navigate, useLocation } from 'react-router-dom';
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
 * 
 * Also handles "Other" store type users - redirects them to /pos/simple if they try to access other routes.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user, subscriptionStatus, checkSubscriptionStatus } = useAuthStore();
  const location = useLocation();

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

  // If user has "Other" store type, only allow access to /pos/simple
  // This check is here as a fallback, but StoreTypeProtectedRoute should handle it
  // Check case-insensitively in case of any casing issues
  const isOtherStoreType = user && user.storeTypeName && 
    user.storeTypeName.toLowerCase().trim() === 'other';
  
  if (isOtherStoreType && location.pathname !== '/pos/simple') {
    // Use window.location for immediate redirect to prevent any rendering
    if (typeof window !== 'undefined') {
      window.location.href = '/pos/simple';
      return null;
    }
    return <Navigate to="/pos/simple" replace />;
  }

  return <>{children}</>;
};

