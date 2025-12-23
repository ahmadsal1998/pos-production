"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storePointsAccount_controller_1 = require("../controllers/storePointsAccount.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All store points account routes require authentication
router.use(auth_middleware_1.authenticate);
// Get all store points accounts (Admin: all accounts, Store owners: their own account only)
router.get('/', storePointsAccount_controller_1.getAllStorePointsAccounts);
// Get single store points account (Admin can view any, store users can view their own)
router.get('/:id', storePointsAccount_controller_1.getStorePointsAccount);
// Get store points transactions (Admin can view any, store users can view their own)
// Note: For store owners, the :id parameter is ignored and their own storeId from JWT is used
router.get('/:id/transactions', storePointsAccount_controller_1.getStorePointsTransactions);
exports.default = router;
