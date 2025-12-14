import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  validateCreateCustomer,
  updateCustomer,
  validateUpdateCustomer,
  deleteCustomer,
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
router.put('/:id', validateUpdateCustomer, updateCustomer);
router.delete('/:id', deleteCustomer);

// Customer payment routes
router.get('/payments/list', getCustomerPayments);
router.post('/payments', validateCreateCustomerPayment, createCustomerPayment);

export default router;

