import { Router } from 'express';
import {
  getStorePointsAccount,
  getAllStorePointsAccounts,
  getStorePointsTransactions,
} from '../controllers/storePointsAccount.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All store points account routes require authentication
router.use(authenticate);

// Get all store points accounts (Admin: all accounts, Store owners: their own account only)
router.get('/', getAllStorePointsAccounts);

// Get single store points account (Admin can view any, store users can view their own)
router.get('/:id', getStorePointsAccount);

// Get store points transactions (Admin can view any, store users can view their own)
// Note: For store owners, the :id parameter is ignored and their own storeId from JWT is used
router.get('/:id/transactions', getStorePointsTransactions);

export default router;

