import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/app/store';
import { hasRoutePermission, normalizeRoutePath } from '@/shared/utils/permissions';

interface PermissionProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string | string[]; // Optional: can override route-based permission check
}

/**
 * PermissionProtectedRoute component that checks both authentication and permissions.
 * If user is not authenticated, redirects to /login.
 * If user is authenticated but lacks required permission, redirects to first allowed route or /pos/1.
 */
export const PermissionProtectedRoute: React.FC<PermissionProtectedRouteProps> = ({ 
  children, 
  requiredPermission 
}) => {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Admin users have access to everything
  if (user?.role === 'Admin') {
    return <>{children}</>;
  }

  // Manager users have access to user management routes
  if (user?.role === 'Manager' && (location.pathname === '/users' || location.pathname === '/user-management/users')) {
    return <>{children}</>;
  }

  // Check permissions
  const userPermissions = user?.permissions || [];
  const routePath = normalizeRoutePath(location.pathname);
  
  // Use provided permission or check route-based permission
  let hasAccess = true;
  
  if (requiredPermission) {
    // Check provided permission(s)
    if (Array.isArray(requiredPermission)) {
      hasAccess = requiredPermission.some(perm => 
        userPermissions.includes(perm as any)
      );
    } else {
      hasAccess = userPermissions.includes(requiredPermission as any);
    }
  } else {
    // Check route-based permission
    hasAccess = hasRoutePermission(
      routePath,
      userPermissions,
      user?.role
    );
  }

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development' && !hasAccess) {
    console.log('[PermissionProtectedRoute] Access denied:', {
      path: location.pathname,
      normalizedPath: routePath,
      userRole: user?.role,
      userPermissions,
      requiredPermission,
      hasAccess
    });
  }

  if (!hasAccess) {
    // Redirect to first available route based on permissions
    // Priority: Dashboard > POS Retail > POS Wholesale > Dashboard as fallback
    let redirectPath = '/'; // Default fallback to homepage
    
    if (userPermissions.includes('dashboard')) {
      redirectPath = '/';
    } else if (userPermissions.includes('posRetail')) {
      redirectPath = '/pos/1';
    } else if (userPermissions.includes('posWholesale')) {
      redirectPath = '/pos/2';
    } else if (userPermissions.length > 0) {
      // If user has any permission, try to find their first allowed route
      const firstPermission = userPermissions[0];
      if (firstPermission === 'posRetail') redirectPath = '/pos/1';
      else if (firstPermission === 'posWholesale') redirectPath = '/pos/2';
      else if (firstPermission === 'dashboard') redirectPath = '/';
    }

    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};
