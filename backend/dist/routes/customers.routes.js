"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customers_controller_1 = require("../controllers/customers.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
// All customer routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/', customers_controller_1.getCustomers);
router.get('/:id', customers_controller_1.getCustomerById);
router.post('/', customers_controller_1.validateCreateCustomer, customers_controller_1.createCustomer);
router.put('/:id', customers_controller_1.validateUpdateCustomer, customers_controller_1.updateCustomer);
router.delete('/:id', customers_controller_1.deleteCustomer);
// Customer payment routes
router.get('/payments/list', customers_controller_1.getCustomerPayments);
router.post('/payments', customers_controller_1.validateCreateCustomerPayment, customers_controller_1.createCustomerPayment);
exports.default = router;
