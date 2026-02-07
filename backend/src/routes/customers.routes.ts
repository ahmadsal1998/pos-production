import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  getCustomerAccountsSummary,
  validateCreateCustomer,
  updateCustomer,
  validateUpdateCustomer,
  deleteCustomer,
  createCustomerPayment,
  getCustomerPayments,
  validateCreateCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment,
  validateUpdateCustomerPayment,
} from '../controllers/customers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All customer routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getCustomers);
router.get('/accounts/summary', getCustomerAccountsSummary);
router.get('/:id', getCustomerById);
router.post('/', validateCreateCustomer, createCustomer);
router.put('/:id', validateUpdateCustomer, updateCustomer);
router.delete('/:id', deleteCustomer);

// Customer payment routes
router.get('/payments/list', getCustomerPayments);
router.post('/payments', validateCreateCustomerPayment, createCustomerPayment);
router.put('/payments/:id', validateUpdateCustomerPayment, updateCustomerPayment);
router.delete('/payments/:id', deleteCustomerPayment);

export default router;

