"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storeAccount_controller_1 = require("../controllers/storeAccount.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All store account routes require authentication
router.use(auth_middleware_1.authenticate);
// Admin-only routes
const isAdmin = (req, res, next) => {
    if (req.user?.userId === 'admin' && req.user?.role === 'Admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
    });
};
// Get all store accounts (Admin only)
router.get('/', isAdmin, storeAccount_controller_1.getStoreAccounts);
// Get single store account (Admin can view any, store users can view their own)
router.get('/:id', storeAccount_controller_1.getStoreAccount);
// Update store account threshold (Admin only)
router.put('/:storeId/threshold', isAdmin, storeAccount_controller_1.validateUpdateThreshold, storeAccount_controller_1.updateStoreAccountThreshold);
// Make payment to store (Admin only)
router.post('/:storeId/payment', isAdmin, storeAccount_controller_1.validateMakePayment, storeAccount_controller_1.makePaymentToStore);
// Toggle store account status (Admin only)
router.patch('/:storeId/status', isAdmin, storeAccount_controller_1.toggleStoreAccountStatus);
exports.default = router;
