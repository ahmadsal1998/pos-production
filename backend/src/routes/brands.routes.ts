import { Router } from 'express';
import multer from 'multer';
import {
  createBrand,
  exportBrands,
  getBrands,
  importBrands,
  validateCreateBrand
} from '../controllers/brands.controller';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', getBrands);
router.post('/', validateCreateBrand, createBrand);
router.get('/export', exportBrands);
router.post('/import', upload.single('file'), importBrands);

export default router;

