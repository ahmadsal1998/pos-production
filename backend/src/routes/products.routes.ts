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
import { log } from '../utils/logger';

const router = Router();

// Debug middleware to log all requests to products router (development only)
router.use((req, res, next) => {
  if (req.path.includes('barcode') || req.originalUrl.includes('barcode')) {
    log.debug('[Products Router] Incoming request', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
    });
  }
  next();
});

// All product routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

// IMPORTANT: Order matters! More specific routes must come before parameterized routes
router.get('/', getProducts);
router.get('/metrics', getProductMetrics);

// Barcode route must come before /:id route to avoid conflicts
// CRITICAL: This route must be registered before /:id to prevent route conflicts
router.get('/barcode/:barcode', async (req, res, next) => {
  log.debug('[Products Router] Barcode route MATCHED', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    barcode: req.params.barcode,
    params: req.params,
  });
  next();
}, getProductByBarcode);

router.post('/', validateCreateProduct, createProduct);
router.post('/import', upload.single('file'), importProducts);

// Parameterized routes must come last
router.get('/:id', (req, res, next) => {
  // Log if /:id route is matching a barcode request (this should NOT happen)
  if (req.params.id && req.params.id.includes('barcode') || req.path.includes('barcode')) {
    log.error('[Products Router] WARNING: /:id route matched a barcode request!', {
      message: 'This means /barcode/:barcode route was NOT matched first',
      idParam: req.params.id,
      path: req.path,
      originalUrl: req.originalUrl,
    });
  }
  next();
}, getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

