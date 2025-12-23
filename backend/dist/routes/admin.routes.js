"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All admin routes require authentication
// Note: Only system admin (userId === 'admin' from .env credentials) can access these routes
// Store owners/users with role 'Admin' cannot access system admin routes
router.use(auth_middleware_1.authenticate);
// Admin-only routes (check if user is system admin)
// Only users with userId === 'admin' (from ADMIN_USERNAME/ADMIN_PASSWORD) can access
const isAdmin = (req, res, next) => {
    // Strict check: only system admin (userId === 'admin') can access
    // Store admins have role 'Admin' but userId is their MongoDB ID, not 'admin'
    if (req.user?.userId === 'admin' && req.user?.role === 'Admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
    });
};
router.use(isAdmin);
// Store management routes
router.get('/stores', admin_controller_1.getStores);
router.get('/stores/:id', admin_controller_1.getStore);
router.post('/stores', admin_controller_1.validateCreateStore, admin_controller_1.createStore);
router.put('/stores/:id', admin_controller_1.validateUpdateStore, admin_controller_1.updateStore);
router.delete('/stores/:id', admin_controller_1.deleteStore);
router.post('/stores/:id/renew-subscription', admin_controller_1.validateRenewSubscription, admin_controller_1.renewSubscription);
router.patch('/stores/:id/status', admin_controller_1.toggleStoreStatus);
// Settings management routes
router.get('/settings', admin_controller_1.getSettings);
router.get('/settings/:key', admin_controller_1.getSetting);
router.put('/settings/:key', admin_controller_1.validateUpdateSetting, admin_controller_1.updateSetting);
// Points settings management routes
router.get('/points-settings', admin_controller_1.getPointsSettings);
router.put('/points-settings', admin_controller_1.validatePointsSettings, admin_controller_1.updatePointsSettings);
// Trial account purge routes
router.get('/trial-accounts/purge-report', admin_controller_1.getTrialAccountsPurgeReport);
router.post('/trial-accounts/purge', admin_controller_1.purgeAllTrialAccounts);
router.post('/trial-accounts/:storeId/purge', admin_controller_1.purgeSpecificTrialAccountEndpoint);
exports.default = router;
