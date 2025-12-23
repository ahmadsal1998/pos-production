import { Router } from 'express';
import {
  getStoreAccounts,
  getStoreAccount,
  updateStoreAccountThreshold,
  makePaymentToStore,
  toggleStoreAccountStatus,
  validateUpdateThreshold,
  validateMakePayment,
} from '../controllers/storeAccount.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All store account routes require authentication
router.use(authenticate);

// Admin-only routes
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.userId === 'admin' && req.user?.role === 'Admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
  });
};

// Get all store accounts (Admin only)
router.get('/', isAdmin, getStoreAccounts);

// Get single store account (Admin can view any, store users can view their own)
router.get('/:id', getStoreAccount);

// Update store account threshold (Admin only)
router.put('/:storeId/threshold', isAdmin, validateUpdateThreshold, updateStoreAccountThreshold);

// Make payment to store (Admin only)
router.post('/:storeId/payment', isAdmin, validateMakePayment, makePaymentToStore);

// Toggle store account status (Admin only)
router.patch('/:storeId/status', isAdmin, toggleStoreAccountStatus);

export default router;

