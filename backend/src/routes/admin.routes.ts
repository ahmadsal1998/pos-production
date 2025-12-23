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
  getTrialAccountsPurgeReport,
  purgeAllTrialAccounts,
  purgeSpecificTrialAccountEndpoint,
  getPointsSettings,
  updatePointsSettings,
  validatePointsSettings,
} from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication
// Note: Only system admin (userId === 'admin' from .env credentials) can access these routes
// Store owners/users with role 'Admin' cannot access system admin routes
router.use(authenticate);

// Admin-only routes (check if user is system admin)
// Only users with userId === 'admin' (from ADMIN_USERNAME/ADMIN_PASSWORD) can access
const isAdmin = (req: any, res: any, next: any) => {
  // Strict check: only system admin (userId === 'admin') can access
  // Store admins have role 'Admin' but userId is their MongoDB ID, not 'admin'
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

// Points settings management routes
router.get('/points-settings', getPointsSettings);
router.put('/points-settings', validatePointsSettings, updatePointsSettings);

// Trial account purge routes
router.get('/trial-accounts/purge-report', getTrialAccountsPurgeReport);
router.post('/trial-accounts/purge', purgeAllTrialAccounts);
router.post('/trial-accounts/:storeId/purge', purgeSpecificTrialAccountEndpoint);

export default router;

