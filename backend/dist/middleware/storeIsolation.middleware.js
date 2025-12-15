"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStoreAccess = exports.sanitizeStoreId = exports.requireStoreAccess = void 0;
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
const requireStoreAccess = (req, res, next) => {
    const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
    if (isBarcodeRoute) {
        console.log('[Store Isolation] 🔍 BARCODE ROUTE - Store access check:', {
            path: req.path,
            role: req.user?.role,
            storeId: req.user?.storeId,
        });
    }
    const requesterRole = req.user?.role;
    const requesterStoreId = req.user?.storeId;
    // Admin users bypass store restrictions
    if (requesterRole === 'Admin') {
        if (isBarcodeRoute) {
            console.log('[Store Isolation] ✅ BARCODE ROUTE - Admin user, bypassing store restrictions');
        }
        return next();
    }
    // Non-admin users must have a storeId
    if (!requesterStoreId) {
        if (isBarcodeRoute) {
            console.error('[Store Isolation] ❌ BARCODE ROUTE - Missing storeId');
        }
        res.status(403).json({
            success: false,
            message: 'Access denied. Store ID is required. Please ensure your account is associated with a store.',
        });
        return;
    }
    // Store the requester's storeId in the request for use in controllers
    req.user = {
        ...req.user,
        storeId: requesterStoreId.toLowerCase(),
    };
    if (isBarcodeRoute) {
        console.log('[Store Isolation] ✅ BARCODE ROUTE - Store access granted, calling next()');
    }
    next();
};
exports.requireStoreAccess = requireStoreAccess;
/**
 * Middleware to STRICTLY enforce JWT-only storeId extraction
 *
 * CRITICAL SECURITY: This middleware REMOVES any storeId from request body/params/query
 * and ensures storeId ONLY comes from JWT token. This prevents storeId manipulation attacks.
 *
 * @param field - The field name to sanitize (default: 'storeId')
 * @param location - Where to sanitize ('body', 'params', or 'query')
 */
const sanitizeStoreId = (field = 'storeId', location = 'body') => {
    return (req, res, next) => {
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
exports.sanitizeStoreId = sanitizeStoreId;
/**
 * Legacy middleware - kept for backward compatibility
 * @deprecated Use sanitizeStoreId instead
 */
exports.validateStoreAccess = exports.sanitizeStoreId;
