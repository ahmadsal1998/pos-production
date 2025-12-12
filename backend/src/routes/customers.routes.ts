import { Router } from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  validateCreateCustomer,
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

export default router;

