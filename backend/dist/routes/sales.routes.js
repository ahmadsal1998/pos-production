"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sales_controller_1 = require("../controllers/sales.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
// All sales routes require authentication and store access
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
router.get('/next-invoice-number', sales_controller_1.getNextInvoiceNumber);
router.post('/', sales_controller_1.createSale);
router.post('/return', sales_controller_1.processReturn);
router.get('/', sales_controller_1.getSales);
router.get('/:id', sales_controller_1.getSale);
router.put('/:id', sales_controller_1.updateSale);
router.delete('/:id', sales_controller_1.deleteSale);
exports.default = router;
