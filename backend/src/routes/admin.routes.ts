import { Router } from 'express';
import {
  getStores,
  getStore,
  createStore,
  updateStore,
  deleteStore,
  renewSubscription,
  toggleStoreStatus,
  validateCreateStore,
  validateUpdateStore,
  validateRenewSubscription,
  getSettings,
  getSetting,
  updateSetting,
  validateUpdateSetting,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
// Note: Admin check is done via userId === 'admin' in the token
router.use(authenticate);

// Admin-only routes (check if user is admin)
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.userId === 'admin' && req.user?.role === 'Admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
  });
};

router.use(isAdmin);

// Store management routes
router.get('/stores', getStores);
router.get('/stores/:id', getStore);
router.post('/stores', validateCreateStore, createStore);
router.put('/stores/:id', validateUpdateStore, updateStore);
router.delete('/stores/:id', deleteStore);
router.post('/stores/:id/renew-subscription', validateRenewSubscription, renewSubscription);
router.patch('/stores/:id/status', toggleStoreStatus);

// Settings management routes
router.get('/settings', getSettings);
router.get('/settings/:key', getSetting);
router.put('/settings/:key', validateUpdateSetting, updateSetting);

export default router;

