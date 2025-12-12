import { Router } from 'express';
import {
  getStoreSettings,
  getStoreSetting,
  updateStoreSetting,
  validateUpdateStoreSetting,
} from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All settings routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

// Get all store settings
router.get('/', getStoreSettings);

// Get single setting by key
router.get('/:key', getStoreSetting);

// Update or create setting
router.put('/:key', validateUpdateStoreSetting, updateStoreSetting);

export default router;

