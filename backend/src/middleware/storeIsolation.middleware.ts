import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';

/**
 * Middleware to enforce store-level isolation for non-admin users
 * 
 * This middleware ensures that:
 * - Non-admin users must have a storeId
 * - Non-admin users can only access their own store's data
 * - Admin users bypass store restrictions
 * 
 * Usage: Add this middleware to routes that need store-level isolation
 */
export const requireStoreAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requesterRole = req.user?.role;
  const requesterStoreId = req.user?.storeId;

  // Admin users bypass store restrictions
  if (requesterRole === 'Admin') {
    return next();
  }

  // Non-admin users must have a storeId
  if (!requesterStoreId) {
    res.status(403).json({
      success: false,
      message: 'Access denied. Store ID is required. Please ensure your account is associated with a store.',
    });
    return;
  }

  // Store the requester's storeId in the request for use in controllers
  req.user = {
    ...req.user!,
    storeId: requesterStoreId.toLowerCase(),
  };

  next();
};

/**
 * Middleware to STRICTLY enforce JWT-only storeId extraction
 * 
 * CRITICAL SECURITY: This middleware REMOVES any storeId from request body/params/query
 * and ensures storeId ONLY comes from JWT token. This prevents storeId manipulation attacks.
 * 
 * @param field - The field name to sanitize (default: 'storeId')
 * @param location - Where to sanitize ('body', 'params', or 'query')
 */
export const sanitizeStoreId = (
  field: string = 'storeId',
  location: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Admin users bypass sanitization (they can access all stores)
    if (requesterRole === 'Admin') {
      return next();
    }

    // Non-admin users must have a storeId from JWT
    if (!requesterStoreId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Store ID is required for non-admin users.',
      });
      return;
    }

    // CRITICAL: Remove storeId from request to prevent manipulation
    const source = location === 'body' ? req.body : location === 'params' ? req.params : req.query;
    if (source && source[field]) {
      // Log security warning if storeId was provided in request
      console.warn(`[SECURITY] storeId provided in ${location}.${field} - removing for user ${req.user?.userId}`);
      delete source[field];
    }

    next();
  };
};

/**
 * Legacy middleware - kept for backward compatibility
 * @deprecated Use sanitizeStoreId instead
 */
export const validateStoreAccess = sanitizeStoreId;

