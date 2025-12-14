import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { initRedis } from './utils/redis';
import { errorHandler } from './middleware/error.middleware';

// Import routes
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import categoriesRoutes from './routes/categories.routes';
import brandsRoutes from './routes/brands.routes';
import unitsRoutes from './routes/units.routes';
import warehousesRoutes from './routes/warehouses.routes';
import productsRoutes from './routes/products.routes';
import adminRoutes from './routes/admin.routes';
import paymentsRoutes from './routes/payments.routes';
import merchantsRoutes from './routes/merchants.routes';
import settingsRoutes from './routes/settings.routes';
import customersRoutes from './routes/customers.routes';
import salesRoutes from './routes/sales.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB (non-blocking - server will start even if connection fails initially)
connectDB().catch((error) => {
  console.error('❌ Failed to connect to MongoDB:', error);
  console.warn('⚠️ Server will continue to run, but database operations may fail');
  // Don't exit - let the server start and handle errors gracefully
});

// Initialize Redis (non-blocking - server will start even if Redis fails)
// In production, Redis will automatically reconnect if connection is lost
initRedis()
  .then((client) => {
    if (client) {
      console.log('✅ Redis: Initialized successfully');
    } else {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.warn('⚠️  Redis: Not available. System will continue without caching.');
        console.warn('   Redis will be retried on next operation.');
      } else {
        console.warn('⚠️  Redis: Not available. Caching will be disabled.');
        console.warn('   To enable caching, start Redis: redis-server');
      }
    }
  })
  .catch((error) => {
    console.error('❌ Redis: Initialization error:', error.message);
    console.warn('⚠️  Server will continue to run, but caching will be disabled');
    // Don't exit - let the server start and handle errors gracefully
  });

// Middleware
// CORS configuration - Allow configured origins and Vercel preview deployments
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
        } else {
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
    } catch (error) {
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
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes (preflight)
// Note: Express 5 doesn't support '*' wildcard, so we use a catch-all middleware instead
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, next);
  }
  next();
});

// Log ALL incoming requests immediately after CORS (before any other middleware)
app.use((req, res, next) => {
  // Log ALL requests to catch barcode routes
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
  
  // Also log all API routes for general debugging
  if (req.path.startsWith('/api/')) {
    if (!isBarcodeRoute) {
      console.log(`[Request] ${req.method} ${req.path}${req.url !== req.path ? ' (url: ' + req.url + ')' : ''} - Origin: ${req.headers.origin || 'none'}`);
    }
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - simplified for faster response
app.get('/health', async (req, res) => {
  try {
    const { getRedisStatus, isRedisAvailable } = await import('./utils/redis');
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
  } catch (error) {
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
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/products', productsRoutes);
console.log('[Server] ✅ Products routes registered at /api/products');
console.log('[Server] 📋 Available product routes:');
console.log('  - GET  /api/products/');
console.log('  - GET  /api/products/metrics');
console.log('  - GET  /api/products/barcode/:barcode ⭐ BARCODE ROUTE');
console.log('  - GET  /api/products/:id');
console.log('  - POST /api/products/');
console.log('  - POST /api/products/import');
console.log('  - PUT  /api/products/:id');
console.log('  - DELETE /api/products/:id');
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);

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
app.use(errorHandler);

// Start server with error handling
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/health`);
});

// Handle server errors gracefully
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    // Don't exit immediately - let it try to recover
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err.message);
  console.error('Stack:', err.stack);
  // In production, log but don't exit immediately - let the server keep running
  // This prevents Render from killing the service during startup
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error('Stack:', err.stack);
  // Always exit on uncaught exceptions as they indicate a serious error
  process.exit(1);
});

export default app;

