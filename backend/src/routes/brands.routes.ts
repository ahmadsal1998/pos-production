import { Router } from 'express';
import multer from 'multer';
import {
  createBrand,
  exportBrands,
  getBrands,
  importBrands,
  validateCreateBrand
} from '../controllers/brands.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All brand routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getBrands);
router.post('/', validateCreateBrand, createBrand);
router.get('/export', exportBrands);
router.post('/import', upload.single('file'), importBrands);

export default router;

