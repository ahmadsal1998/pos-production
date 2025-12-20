"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const subscriptionManager_1 = require("../utils/subscriptionManager");
const authenticate = async (req, res, next) => {
    try {
        // Enhanced logging for barcode routes
        const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
        if (isBarcodeRoute) {
            console.log('[Auth Middleware] 🔍 BARCODE ROUTE - Authentication check:', {
                path: req.path,
                originalUrl: req.originalUrl,
                method: req.method,
                hasAuthHeader: !!req.headers.authorization,
                authHeaderPrefix: req.headers.authorization?.substring(0, 20) || 'none',
            });
        }
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            if (isBarcodeRoute) {
                console.error('[Auth Middleware] ❌ BARCODE ROUTE - Missing or invalid auth header');
            }
            res.status(401).json({
                success: false,
                message: 'Authentication required. Please provide a valid token.',
            });
            return;
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = (0, jwt_1.verifyToken)(token);
            req.user = decoded;
            if (isBarcodeRoute) {
                console.log('[Auth Middleware] ✅ BARCODE ROUTE - Token verified:', {
                    userId: decoded.userId,
                    storeId: decoded.storeId,
                    role: decoded.role,
                });
            }
            // Check subscription status for store users (not admins)
            if (decoded.storeId && decoded.role !== 'Admin') {
                try {
                    const subscriptionStatus = await (0, subscriptionManager_1.checkAndUpdateStoreSubscription)(decoded.storeId);
                    if (!subscriptionStatus.isActive || subscriptionStatus.subscriptionExpired) {
                        if (isBarcodeRoute) {
                            console.error('[Auth Middleware] ❌ BARCODE ROUTE - Subscription expired');
                        }
                        res.status(403).json({
                            success: false,
                            message: 'Your store subscription has expired. Please renew your subscription to regain access.',
                            code: 'SUBSCRIPTION_EXPIRED',
                            subscriptionEndDate: subscriptionStatus.subscriptionEndDate,
                        });
                        return;
                    }
                }
                catch (error) {
                    // If store not found, log but continue (shouldn't happen in normal flow)
                    console.error(`Error checking subscription for store ${decoded.storeId}:`, error.message);
                }
            }
            if (isBarcodeRoute) {
                console.log('[Auth Middleware] ✅ BARCODE ROUTE - Authentication passed, calling next()');
            }
            next();
        }
        catch (error) {
            // Enhanced error logging for debugging
            const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
            console.error('[Auth Middleware] Token verification failed:', {
                error: error.message,
                tokenLength: token.length,
                tokenPrefix: token.substring(0, 20) + '...',
                jwtSecretSet: !!process.env.JWT_SECRET,
                jwtSecretLength: process.env.JWT_SECRET?.length || 0,
                nodeEnv: process.env.NODE_ENV,
                isBarcodeRoute,
                path: req.path,
            });
            if (isBarcodeRoute) {
                console.error('[Auth Middleware] ❌ BARCODE ROUTE - Authentication failed');
            }
            res.status(401).json({
                success: false,
                message: error.message || 'Invalid or expired token.',
            });
            return;
        }
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: 'Authentication failed.',
        });
        return;
    }
};
exports.authenticate = authenticate;
// Role-based authorization middleware
const authorize = (...roles) => {
    return (req, res, next) => {
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
exports.authorize = authorize;
