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
 * Middleware to validate that a storeId in request body/params matches the requester's storeId
 * 
 * This prevents non-admin users from accessing or modifying data from other stores
 * 
 * @param field - The field name to check (default: 'storeId')
 * @param location - Where to check ('body', 'params', or 'query')
 */
export const validateStoreAccess = (
  field: string = 'storeId',
  location: 'body' | 'params' | 'query' = 'body'
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;

    // Admin users bypass validation
    if (requesterRole === 'Admin') {
      return next();
    }

    // Non-admin users must have a storeId
    if (!requesterStoreId) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Store ID is required for non-admin users.',
      });
      return;
    }

    // Get the storeId from the specified location
    const source = location === 'body' ? req.body : location === 'params' ? req.params : req.query;
    const providedStoreId = source?.[field];

    // If storeId is provided, it must match the requester's storeId
    if (providedStoreId && providedStoreId.toLowerCase() !== requesterStoreId.toLowerCase()) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You can only access data from your own store.',
      });
      return;
    }

    // If storeId is not provided but should be, set it to requester's storeId
    if (!providedStoreId && location === 'body') {
      req.body[field] = requesterStoreId.toLowerCase();
    }

    next();
  };
};

