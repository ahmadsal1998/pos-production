import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  validateCreateProduct,
  importProducts,
  upload,
  getProductMetrics,
} from '../controllers/products.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All product routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getProducts);
router.get('/metrics', getProductMetrics);
router.post('/', validateCreateProduct, createProduct);
router.post('/import', upload.single('file'), importProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

