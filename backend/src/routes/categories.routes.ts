import { Router } from 'express';
import multer from 'multer';
import {
  createCategory,
  exportCategories,
  getCategories,
  importCategories,
  validateCreateCategory,
} from '../controllers/categories.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All category routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getCategories);
router.post('/', validateCreateCategory, createCategory);
router.get('/export', exportCategories);
router.post('/import', upload.single('file'), importCategories);

export default router;

