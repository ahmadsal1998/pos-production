import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AuthTokenPayload } from '../types/auth.types';
import { checkAndUpdateStoreSubscription } from '../utils/subscriptionManager';

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
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

      // Check subscription status for store users (not admins)
      if (decoded.storeId && decoded.role !== 'Admin') {
        try {
          const subscriptionStatus = await checkAndUpdateStoreSubscription(decoded.storeId);
          
          if (!subscriptionStatus.isActive || subscriptionStatus.subscriptionExpired) {
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
          console.error(`Error checking subscription for store ${decoded.storeId}:`, error.message);
        }
      }

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
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

