"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_controller_1 = require("../controllers/products.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const router = (0, express_1.Router)();
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
router.use(auth_middleware_1.authenticate);
router.use(storeIsolation_middleware_1.requireStoreAccess);
// IMPORTANT: Order matters! More specific routes must come before parameterized routes
router.get('/', products_controller_1.getProducts);
router.get('/metrics', products_controller_1.getProductMetrics);
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
}, products_controller_1.getProductByBarcode);
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
}, products_controller_1.getProductByBarcode);
router.post('/', products_controller_1.validateCreateProduct, products_controller_1.createProduct);
router.post('/import', products_controller_1.upload.single('file'), products_controller_1.importProducts);
// Parameterized routes must come last
router.get('/:id', (req, res, next) => {
    // Log if /:id route is matching a barcode request (this should NOT happen)
    if (req.params.id && req.params.id.includes('barcode') || req.path.includes('barcode')) {
        console.error('[Products Router] ⚠️⚠️⚠️ WARNING: /:id route matched a barcode request! ⚠️⚠️⚠️');
        console.error('[Products Router] This means /barcode/:barcode route was NOT matched first');
        console.error('[Products Router] ID param:', req.params.id);
        console.error('[Products Router] Path:', req.path);
        console.error('[Products Router] OriginalUrl:', req.originalUrl);
    }
    next();
}, products_controller_1.getProduct);
router.put('/:id', products_controller_1.updateProduct);
router.delete('/:id', products_controller_1.deleteProduct);
exports.default = router;
