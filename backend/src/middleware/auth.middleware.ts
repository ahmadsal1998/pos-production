import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthTokenPayload } from '../types/auth.types';
import { checkAndUpdateStoreSubscription } from '../utils/subscriptionManager';
import { log } from '../utils/logger';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: AuthTokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Enhanced logging for barcode routes (development only)
    const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
    if (isBarcodeRoute) {
      log.debug('[Auth Middleware] BARCODE ROUTE - Authentication check', {
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method,
        hasAuthHeader: !!req.headers.authorization,
      });
    }
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (isBarcodeRoute) {
        log.warn('[Auth Middleware] BARCODE ROUTE - Missing or invalid auth header');
      }
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = verifyToken(token);
      req.user = decoded;

      if (isBarcodeRoute) {
        log.debug('[Auth Middleware] BARCODE ROUTE - Token verified', {
          userId: decoded.userId,
          storeId: decoded.storeId,
          role: decoded.role,
        });
      }

      // Check subscription status for store users (not admins)
      if (decoded.storeId && decoded.role !== 'Admin') {
        try {
          const subscriptionStatus = await checkAndUpdateStoreSubscription(decoded.storeId);
          
          if (!subscriptionStatus.isActive || subscriptionStatus.subscriptionExpired) {
            if (isBarcodeRoute) {
              log.warn('[Auth Middleware] BARCODE ROUTE - Subscription expired');
            }
            res.status(403).json({
              success: false,
              message: 'Your store subscription has expired. Please renew your subscription to regain access.',
              code: 'SUBSCRIPTION_EXPIRED',
              subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
            });
            return;
          }
        } catch (error: any) {
          // If store not found, log but continue (shouldn't happen in normal flow)
              log.error(`Error checking subscription for store ${decoded.storeId}`, error);
        }
      }

      if (isBarcodeRoute) {
        log.debug('[Auth Middleware] BARCODE ROUTE - Authentication passed, calling next()');
      }
      next();
    } catch (error: any) {
      // Enhanced error logging for debugging
      const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
      log.error('[Auth Middleware] Token verification failed', error, {
        tokenLength: token.length,
        jwtSecretSet: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        isBarcodeRoute,
        path: req.path,
      });
      
      if (isBarcodeRoute) {
        log.warn('[Auth Middleware] BARCODE ROUTE - Authentication failed');
      }
      
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired token.',
      });
      return;
    }
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
    return;
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

