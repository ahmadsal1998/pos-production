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

// Debug middleware to log all requests to products router
router.use((req, res, next) => {
  if (req.path.includes('barcode') || req.originalUrl.includes('barcode')) {
    console.log('[Products Router] Incoming request:', {
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
// Using explicit route pattern to ensure it matches correctly
// CRITICAL: This route must be registered before /:id to prevent route conflicts
// Using regex pattern to ensure exact match and prevent /:id from matching
router.get(/^\/barcode\/(.+)$/, async (req, res, next) => {
  // Extract barcode from the matched groups
  const match = req.path.match(/^\/barcode\/(.+)$/);
  if (match) {
    req.params.barcode = match[1];
  }
  
  console.log('[Products Router] ✓✓✓✓✓ BARCODE ROUTE MATCHED (REGEX) ✓✓✓✓✓');
  console.log('[Products Router] Method:', req.method);
  console.log('[Products Router] Path:', req.path);
  console.log('[Products Router] OriginalUrl:', req.originalUrl);
  console.log('[Products Router] BaseUrl:', req.baseUrl);
  console.log('[Products Router] Url:', req.url);
  console.log('[Products Router] Barcode param:', req.params.barcode);
  console.log('[Products Router] All params:', req.params);
  next();
}, getProductByBarcode);

// Also keep the string route as fallback
router.get('/barcode/:barcode', async (req, res, next) => {
  console.log('[Products Router] ✓✓✓ Barcode route MATCHED (STRING) ✓✓✓');
  console.log('[Products Router] Method:', req.method);
  console.log('[Products Router] Path:', req.path);
  console.log('[Products Router] OriginalUrl:', req.originalUrl);
  console.log('[Products Router] BaseUrl:', req.baseUrl);
  console.log('[Products Router] Url:', req.url);
  console.log('[Products Router] Barcode param:', req.params.barcode);
  console.log('[Products Router] All params:', req.params);
  next();
}, getProductByBarcode);

router.post('/', validateCreateProduct, createProduct);
router.post('/import', upload.single('file'), importProducts);

// Parameterized routes must come last
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;

