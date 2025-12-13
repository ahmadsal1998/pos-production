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
  getProductByBarcode,
} from '../controllers/products.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All product routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

// IMPORTANT: Order matters! More specific routes must come before parameterized routes
router.get('/', getProducts);
router.get('/metrics', getProductMetrics);

// Barcode route must come before /:id route to avoid conflicts
// Adding logging middleware to debug route matching issues
router.get('/barcode/:barcode', (req, res, next) => {
  console.log('[Products Router] ✓ Barcode route matched');
  console.log('[Products Router] Path:', req.path);
  console.log('[Products Router] OriginalUrl:', req.originalUrl);
  console.log('[Products Router] Barcode param:', req.params.barcode);
  next();
}, getProductByBarcode);

router.post('/', validateCreateProduct, createProduct);
router.post('/import', upload.single('file'), importProducts);

// Parameterized routes must come last
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

