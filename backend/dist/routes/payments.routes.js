"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payments_controller_1 = require("../controllers/payments.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_middleware_1.authenticate);
// Payment processing routes
router.post('/process', payments_controller_1.processPayment);
router.get('/:id', payments_controller_1.getPayment);
router.get('/invoice/:invoiceId', payments_controller_1.getPaymentsByInvoice);
router.post('/:id/cancel', payments_controller_1.cancelPayment);
exports.default = router;
