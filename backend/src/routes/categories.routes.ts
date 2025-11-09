import { Router } from 'express';
import multer from 'multer';
import {
  createCategory,
  exportCategories,
  getCategories,
  importCategories,
  validateCreateCategory,
} from '../controllers/categories.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getCategories);
router.post('/', validateCreateCategory, createCategory);
router.get('/export', exportCategories);
router.post('/import', upload.single('file'), importCategories);

export default router;

