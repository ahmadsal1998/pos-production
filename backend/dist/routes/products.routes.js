"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_controller_1 = require("../controllers/products.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const storeIsolation_middleware_1 = require("../middleware/storeIsolation.middleware");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Debug middleware to log all requests to products router (development only)
router.use((req, res, next) => {
    if (req.path.includes('barcode') || req.originalUrl.includes('barcode')) {
        logger_1.log.debug('[Products Router] Incoming request', {
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
// CRITICAL: This route must be registered before /:id to prevent route conflicts
router.get('/barcode/:barcode', async (req, res, next) => {
    logger_1.log.debug('[Products Router] Barcode route MATCHED', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        url: req.url,
        barcode: req.params.barcode,
        params: req.params,
    });
    next();
}, products_controller_1.getProductByBarcode);
router.post('/', products_controller_1.validateCreateProduct, products_controller_1.createProduct);
router.post('/import', products_controller_1.upload.single('file'), products_controller_1.importProducts);
// Parameterized routes must come last
router.get('/:id', (req, res, next) => {
    // Log if /:id route is matching a barcode request (this should NOT happen)
    if (req.params.id && req.params.id.includes('barcode') || req.path.includes('barcode')) {
        logger_1.log.error('[Products Router] WARNING: /:id route matched a barcode request!', {
            message: 'This means /barcode/:barcode route was NOT matched first',
            idParam: req.params.id,
            path: req.path,
            originalUrl: req.originalUrl,
        });
    }
    next();
}, products_controller_1.getProduct);
router.put('/:id', products_controller_1.updateProduct);
router.delete('/:id', products_controller_1.deleteProduct);
exports.default = router;
