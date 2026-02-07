import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/store';

interface StoreTypeProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * StoreTypeProtectedRoute component that restricts "Other" store type users
 * to only access the simple POS page (/pos/simple).
 * If an "Other" store type user tries to access any other route, they are redirected to /pos/simple.
 */
export const StoreTypeProtectedRoute: React.FC<StoreTypeProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // If not authenticated, let ProtectedRoute handle it
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  // If user has "Other" store type, only allow access to /pos/simple
  // Check case-insensitively in case of any casing issues
  const isOtherStoreType = user.storeTypeName && 
    user.storeTypeName.toLowerCase().trim() === 'other';
  
  if (isOtherStoreType) {
    // Allow access to simple POS page
    if (location.pathname === '/pos/simple') {
      return <>{children}</>;
    }
    // Immediately redirect all other routes to simple POS
    // Use window.location for immediate redirect to prevent any rendering
    if (typeof window !== 'undefined') {
      window.location.href = '/pos/simple';
      return null; // Return null while redirecting
    }
    
    return <Navigate to="/pos/simple" replace />;
  }

  // For non-"Other" store types, allow access
  return <>{children}</>;
};
