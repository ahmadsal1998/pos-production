import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  validateCreateCustomer,
  createCustomerPayment,
  getCustomerPayments,
  validateCreateCustomerPayment,
} from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All customer routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validateCreateCustomer, createCustomer);

// Customer payment routes
router.get('/payments/list', getCustomerPayments);
router.post('/payments', validateCreateCustomerPayment, createCustomerPayment);

export default router;

