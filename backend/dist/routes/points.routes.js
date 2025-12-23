"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const points_controller_1 = require("../controllers/points.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
// All points routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
// Add points after sale (store operation)
router.post('/add', points_controller_1.validateAddPoints, points_controller_1.addPointsAfterSale);
// Get customer points balance and history
// Routes without path params (using query params) must come BEFORE routes with path params
// This ensures /customer/history matches before /customer/:customerId
router.get('/customer/history', points_controller_1.getCustomerPointsHistory);
router.get('/customer', points_controller_1.getCustomerPoints);
// Routes with path parameters come after
router.get('/customer/:customerId/history', points_controller_1.getCustomerPointsHistory);
router.get('/customer/:customerId', points_controller_1.getCustomerPoints);
// Pay with points
router.post('/pay', points_controller_1.validatePayWithPoints, points_controller_1.payWithPoints);
exports.default = router;
