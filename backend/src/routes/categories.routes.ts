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

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All category routes require authentication
router.use(authenticate);

router.get('/', getCategories);
router.post('/', validateCreateCategory, createCategory);
router.get('/export', exportCategories);
router.post('/import', upload.single('file'), importCategories);

export default router;

