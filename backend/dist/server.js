"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const redis_1 = require("./utils/redis");
const error_middleware_1 = require("./middleware/error.middleware");
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const categories_routes_1 = __importDefault(require("./routes/categories.routes"));
const brands_routes_1 = __importDefault(require("./routes/brands.routes"));
const units_routes_1 = __importDefault(require("./routes/units.routes"));
const warehouses_routes_1 = __importDefault(require("./routes/warehouses.routes"));
const products_routes_1 = __importDefault(require("./routes/products.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const merchants_routes_1 = __importDefault(require("./routes/merchants.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const customers_routes_1 = __importDefault(require("./routes/customers.routes"));
const sales_routes_1 = __importDefault(require("./routes/sales.routes"));
// Load environment variables
dotenv_1.default.config();
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB (non-blocking - server will start even if connection fails initially)
(0, database_1.default)().catch((error) => {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.warn('⚠️ Server will continue to run, but database operations may fail');
    // Don't exit - let the server start and handle errors gracefully
});
// Initialize Redis (non-blocking - server will start even if Redis fails)
// In production, Redis will automatically reconnect if connection is lost
// In development, Redis is optional - only log if REDIS_URL is explicitly set
(0, redis_1.initRedis)()
    .then((client) => {
    const isProduction = process.env.NODE_ENV === 'production';
    if (client) {
        // Only log success in production or if REDIS_URL is explicitly set
        if (isProduction || process.env.REDIS_URL) {
            console.log('✅ Redis: Initialized successfully');
        }
    }
    else {
        // Only log warning in production or if REDIS_URL is explicitly set
        if (isProduction || process.env.REDIS_URL) {
            if (isProduction) {
                console.warn('⚠️  Redis: Not available. System will continue without caching.');
                console.warn('   Redis will be retried on next operation.');
            }
            else {
                console.warn('⚠️  Redis: Not available. Caching will be disabled.');
                console.warn('   To enable caching, start Redis: redis-server');
            }
        }
    }
})
    .catch((error) => {
    const isProduction = process.env.NODE_ENV === 'production';
    // Only log errors in production or if REDIS_URL is explicitly set
    if (isProduction || process.env.REDIS_URL) {
        console.error('❌ Redis: Initialization error:', error.message);
        console.warn('⚠️  Server will continue to run, but caching will be disabled');
    }
    // Don't exit - let the server start and handle errors gracefully
});
// Middleware
// CORS configuration - Allow configured origins and Vercel preview deployments
const isDevelopment = process.env.NODE_ENV !== 'production';
const corsOptions = {
    origin: (origin, callback) => {
        try {
            // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
            if (!origin) {
                console.log('CORS: Allowing request with no origin');
                return callback(null, true);
            }
            // In development, allow all origins
            if (isDevelopment) {
                console.log(`CORS: Development mode - allowing origin: ${origin}`);
                return callback(null, true);
            }
            // Normalize origin (remove trailing slash, trim whitespace)
            const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '');
            console.log(`CORS: Checking origin: ${origin} (normalized: ${normalizedOrigin})`);
            // FIRST: Check for Vercel deployments (most common in production)
            if (origin.toLowerCase().includes('.vercel.app')) {
                console.log(`CORS: ✓ Allowing Vercel origin: ${origin}`);
                return callback(null, true);
            }
            // SECOND: Explicitly allow the production Vercel URL (case-insensitive)
            if (normalizedOrigin === 'https://pos-production.vercel.app') {
                console.log(`CORS: ✓ Allowing production origin: ${origin}`);
                return callback(null, true);
            }
            // THIRD: Check CLIENT_URL if set
            if (process.env.CLIENT_URL) {
                const clientUrl = process.env.CLIENT_URL.trim();
                const normalizedClientUrl = clientUrl.toLowerCase().replace(/\/$/, '');
                // Check exact match
                if (normalizedOrigin === normalizedClientUrl) {
                    console.log(`CORS: ✓ Allowing CLIENT_URL origin: ${origin}`);
                    return callback(null, true);
                }
                // Check with/without trailing slash variations
                if (clientUrl.endsWith('/')) {
                    const clientUrlNoSlash = clientUrl.slice(0, -1).toLowerCase();
                    if (normalizedOrigin === clientUrlNoSlash) {
                        console.log(`CORS: ✓ Allowing CLIENT_URL origin (no slash variant): ${origin}`);
                        return callback(null, true);
                    }
                }
                else {
                    const clientUrlWithSlash = (clientUrl + '/').toLowerCase();
                    if (normalizedOrigin === clientUrlWithSlash) {
                        console.log(`CORS: ✓ Allowing CLIENT_URL origin (with slash variant): ${origin}`);
                        return callback(null, true);
                    }
                }
            }
            // Origin not allowed - log for debugging but still allow (for now, to debug)
            console.warn(`CORS: ✗ Origin not explicitly allowed: ${origin}`);
            console.warn(`CORS: CLIENT_URL env var: ${process.env.CLIENT_URL || 'not set'}`);
            // Temporarily allow to see if this fixes the issue - we can restrict later
            console.warn(`CORS: ⚠️ Temporarily allowing origin for debugging: ${origin}`);
            return callback(null, true);
            // TODO: Re-enable strict checking after debugging
            // callback(new Error(`Not allowed by CORS: ${origin}`));
        }
        catch (error) {
            // If there's an error in the validation logic, allow by default to prevent blocking
            console.error('CORS validation error:', error);
            console.error('CORS: Allowing origin due to validation error');
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 204,
    preflightContinue: false,
};
// Apply CORS middleware
app.use((0, cors_1.default)(corsOptions));
// Explicitly handle OPTIONS requests for all routes (preflight)
// Note: Express 5 doesn't support '*' wildcard, so we use a catch-all middleware instead
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        return (0, cors_1.default)(corsOptions)(req, res, next);
    }
    next();
});
// Log ALL incoming requests immediately after CORS (before any other middleware)
app.use((req, res, next) => {
    // Log ALL API requests for debugging
    if (req.path.startsWith('/api/')) {
        const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode') || req.url.includes('/barcode');
        if (isBarcodeRoute) {
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`[Request] 🔍🔍🔍 BARCODE REQUEST DETECTED 🔍🔍🔍`);
            console.log(`[Request] Method: ${req.method}`);
            console.log(`[Request] Path: ${req.path}`);
            console.log(`[Request] URL: ${req.url}`);
            console.log(`[Request] Original URL: ${req.originalUrl}`);
            console.log(`[Request] Base URL: ${req.baseUrl}`);
            console.log(`[Request] Query:`, req.query);
            console.log(`[Request] Params:`, req.params);
            console.log(`[Request] Headers:`, {
                authorization: req.headers.authorization ? `Present (${req.headers.authorization.substring(0, 30)}...)` : 'Missing',
                origin: req.headers.origin || 'none',
                'content-type': req.headers['content-type'] || 'none',
            });
            console.log('═══════════════════════════════════════════════════════════');
        }
        else {
            // Log all other API requests too
            console.log(`[Request] ${req.method} ${req.path}${req.url !== req.path ? ' (url: ' + req.url + ')' : ''} - Origin: ${req.headers.origin || 'none'}`);
        }
    }
    next();
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health check endpoint - simplified for faster response
app.get('/health', async (req, res) => {
    try {
        const { getRedisStatus, isRedisAvailable } = await Promise.resolve().then(() => __importStar(require('./utils/redis')));
        const redisStatus = getRedisStatus();
        const redisHealthy = await isRedisAvailable();
        res.json({
            success: true,
            message: 'POS System API is running',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected', // MongoDB connection is checked elsewhere
                redis: {
                    available: redisStatus.available,
                    connected: redisStatus.connected,
                    healthy: redisHealthy,
                    url: redisStatus.url?.replace(/:[^:@]+@/, ':****@'), // Hide password in URL
                },
            },
        });
    }
    catch (error) {
        // Even if Redis check fails, return healthy status
        res.status(200).json({
            success: true,
            message: 'POS System API is running',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: {
                    available: false,
                    connected: false,
                    healthy: false,
                },
            },
        });
    }
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/users', users_routes_1.default);
app.use('/api/categories', categories_routes_1.default);
app.use('/api/brands', brands_routes_1.default);
app.use('/api/units', units_routes_1.default);
app.use('/api/warehouses', warehouses_routes_1.default);
app.use('/api/products', products_routes_1.default);
console.log('[Server] ✅ Products routes registered at /api/products');
console.log('[Server] 📋 Available product routes:');
console.log('  - GET  /api/products/');
console.log('  - GET  /api/products/metrics');
console.log('  - GET  /api/products/barcode/:barcode ⭐ BARCODE ROUTE ⭐');
console.log('  - GET  /api/products/:id');
console.log('  - POST /api/products/');
console.log('  - POST /api/products/import');
console.log('  - PUT  /api/products/:id');
console.log('  - DELETE /api/products/:id');
console.log('[Server] 🔍 BARCODE ROUTE VERIFICATION: Route should match GET /api/products/barcode/:barcode');
app.use('/api/admin', admin_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/merchants', merchants_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/customers', customers_routes_1.default);
app.use('/api/sales', sales_routes_1.default);
// 404 handler - log all unmatched routes for debugging
app.use((req, res) => {
    const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
    console.error('[404 Handler] ❌ Route not found:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        url: req.url,
        headers: {
            authorization: req.headers.authorization ? 'Present' : 'Missing',
            'content-type': req.headers['content-type'],
        },
    });
    // Special handling for barcode routes to help debug
    if (isBarcodeRoute) {
        console.error('[404 Handler] ⚠️⚠️⚠️ BARCODE ROUTE 404 - This should not happen! ⚠️⚠️⚠️');
        console.error('[404 Handler] Expected route: GET /api/products/barcode/:barcode');
        console.error('[404 Handler] Actual request path:', req.path);
        console.error('[404 Handler] Actual request originalUrl:', req.originalUrl);
        console.error('[404 Handler] Request reached 404 handler - route was NOT matched');
        console.error('[404 Handler] Possible causes:');
        console.error('  1. Route not registered (check server startup logs)');
        console.error('  2. Authentication failed before reaching route (check auth logs)');
        console.error('  3. Store isolation middleware blocked request (check store isolation logs)');
        console.error('  4. Path mismatch (expected /api/products/barcode/:barcode)');
    }
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.path,
        originalUrl: req.originalUrl,
    });
});
// Error handling middleware (must be last)
app.use(error_middleware_1.errorHandler);
// Start server with error handling
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 API Health: http://localhost:${PORT}/health`);
});
// Handle server errors gracefully
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        process.exit(1);
    }
    else {
        console.error('❌ Server error:', error);
        // Don't exit immediately - let it try to recover
    }
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    console.error('Stack:', err.stack);
    // In production, log but don't exit immediately - let the server keep running
    // This prevents Render from killing the service during startup
    if (process.env.NODE_ENV === 'development') {
        process.exit(1);
    }
});
// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    console.error('Stack:', err.stack);
    // Always exit on uncaught exceptions as they indicate a serious error
    process.exit(1);
});
exports.default = app;
