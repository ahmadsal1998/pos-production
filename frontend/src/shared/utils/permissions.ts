import { ScreenPermission } from '@/shared/types';

/**
 * Maps route paths to their required permissions
 * If a route requires multiple permissions, the user needs at least one of them (OR logic)
 * For routes that require multiple specific permissions (AND logic), use an array of arrays
 */
export const routePermissions: Record<string, ScreenPermission | ScreenPermission[]> = {
  // Dashboard
  '/': 'dashboard',
  
  // Products
  '/products': 'products',
  '/products/list': 'products',
  '/products/management': 'products',
  '/products/add-multi-unit': 'products',
  '/products/categories': 'categories',
  '/products/brands': 'brands',
  '/products/:id': 'products',
  
  // Sales
  '/sales': 'salesToday',
  '/sales/today': 'salesToday',
  '/sales/history': 'salesHistory',
  '/sales/refunds': 'refunds',
  
  // POS
  '/pos/1': 'posRetail',
  '/pos/2': 'posWholesale',
  
  // Financial
  '/purchases': 'purchases',
  '/financial/purchases': 'purchases',
  '/expenses': 'expenses',
  '/financial/expenses': 'expenses',
  '/cheques': 'purchases', // Assuming cheques are part of purchases
  '/financial/cheques': 'purchases',
  '/financial/payment-methods': 'preferences',
  
  // User Management
  '/users': 'users',
  '/user-management/users': 'users',
  '/preferences': 'preferences',
  '/user-management/preferences': 'preferences',
};

/**
 * Check if a user has access to a route
 * Admin users have access to all routes
 * Manager users have access to user management routes
 */
export const hasRoutePermission = (
  routePath: string,
  userPermissions: ScreenPermission[] | undefined,
  userRole: string | undefined
): boolean => {
  // Admin users have access to everything
  if (userRole === 'Admin') {
    return true;
  }

  // Manager users have access to user management routes
  if (userRole === 'Manager') {
    if (routePath === '/users' || routePath === '/user-management/users') {
      return true;
    }
  }

  // If user has no permissions, deny access
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  // Normalize the route path (remove query params and hash)
  const normalizedPath = routePath.split('?')[0].split('#')[0];
  
  // Get required permissions for this route
  const requiredPermission = routePermissions[normalizedPath];
  
  // If route doesn't require specific permission, allow access (default behavior)
  if (!requiredPermission) {
    return true;
  }

  // Handle array of permissions (OR logic - user needs at least one)
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(permission => 
      userPermissions.includes(permission)
    );
  }

  // Single permission required
  return userPermissions.includes(requiredPermission);
};

/**
 * Normalize route path for matching
 * Converts dynamic routes like /products/123 to /products/:id
 */
export const normalizeRoutePath = (path: string): string => {
  // Remove query params and hash
  let normalized = path.split('?')[0].split('#')[0];
  
  // Replace dynamic segments with their pattern
  // This is a simple implementation - you may need to enhance based on your route patterns
  normalized = normalized.replace(/\/products\/[^/]+$/, '/products/:id');
  
  return normalized;
};
