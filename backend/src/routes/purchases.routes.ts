import { Router } from 'express';
import {
  getNextPoNumberHandler,
  getPurchases,
  getPurchaseById,
  createPurchase,
  validateCreatePurchase,
  updatePurchase,
  validateUpdatePurchase,
} from '../controllers/purchases.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

router.use(authenticate);
router.use(requireStoreAccess);

router.get('/next-po-number', getNextPoNumberHandler);
router.get('/', getPurchases);
router.get('/:id', getPurchaseById);
router.post('/', validateCreatePurchase, createPurchase);
router.put('/:id', validateUpdatePurchase, updatePurchase);

export default router;
