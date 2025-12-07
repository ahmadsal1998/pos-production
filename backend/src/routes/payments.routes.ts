import express from 'express';
import {
  processPayment,
  getPayment,
  getPaymentsByInvoice,
  cancelPayment,
} from '../controllers/payments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Payment processing routes
router.post('/process', processPayment);
router.get('/:id', getPayment);
router.get('/invoice/:invoiceId', getPaymentsByInvoice);
router.post('/:id/cancel', cancelPayment);

export default router;

