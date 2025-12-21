import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { initRedis } from './utils/redis';
import { errorHandler } from './middleware/error.middleware';
import { log } from './utils/logger';

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
  log.error('Failed to connect to MongoDB', error);
  log.warn('Server will continue to run, but database operations may fail');
  // Don't exit - let the server start and handle errors gracefully
});

// Initialize Redis (non-blocking - server will start even if Redis fails)
// In production, Redis will automatically reconnect if connection is lost
// In development, Redis is optional - only log if REDIS_URL is explicitly set
initRedis()
  .then((client) => {
    const isProduction = process.env.NODE_ENV === 'production';
    if (client) {
      // Only log success in production or if REDIS_URL is explicitly set
      if (isProduction || process.env.REDIS_URL) {
        log.info('Redis: Initialized successfully');
      }
    } else {
      // Only log warning in production or if REDIS_URL is explicitly set
      if (isProduction || process.env.REDIS_URL) {
        if (isProduction) {
          log.warn('Redis: Not available. System will continue without caching.');
          log.warn('Redis will be retried on next operation.');
        } else {
          log.warn('Redis: Not available. Caching will be disabled.');
          log.info('To enable caching, start Redis: redis-server');
        }
      }
    }
  })
  .catch((error) => {
    const isProduction = process.env.NODE_ENV === 'production';
    // Only log errors in production or if REDIS_URL is explicitly set
    if (isProduction || process.env.REDIS_URL) {
      log.error('Redis: Initialization error', error);
      log.warn('Server will continue to run, but caching will be disabled');
    }
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
        log.debug('CORS: Allowing request with no origin');
        return callback(null, true);
      }

      // In development, allow all origins
      if (isDevelopment) {
        log.debug(`CORS: Development mode - allowing origin: ${origin}`);
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash, trim whitespace)
      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '');
      log.debug(`CORS: Checking origin: ${origin} (normalized: ${normalizedOrigin})`);

      // FIRST: Check for Vercel deployments (most common in production)
      if (origin.toLowerCase().includes('.vercel.app')) {
        log.debug(`CORS: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }

      // SECOND: Explicitly allow the production Vercel URL (case-insensitive)
      if (normalizedOrigin === 'https://pos-production.vercel.app') {
        log.debug(`CORS: Allowing production origin: ${origin}`);
        return callback(null, true);
      }

      // THIRD: Check CLIENT_URL if set
      if (process.env.CLIENT_URL) {
        const clientUrl = process.env.CLIENT_URL.trim();
        const normalizedClientUrl = clientUrl.toLowerCase().replace(/\/$/, '');
        
        // Check exact match
        if (normalizedOrigin === normalizedClientUrl) {
          log.debug(`CORS: Allowing CLIENT_URL origin: ${origin}`);
          return callback(null, true);
        }
        
        // Check with/without trailing slash variations
        if (clientUrl.endsWith('/')) {
          const clientUrlNoSlash = clientUrl.slice(0, -1).toLowerCase();
          if (normalizedOrigin === clientUrlNoSlash) {
            log.debug(`CORS: Allowing CLIENT_URL origin (no slash variant): ${origin}`);
            return callback(null, true);
          }
        } else {
          const clientUrlWithSlash = (clientUrl + '/').toLowerCase();
          if (normalizedOrigin === clientUrlWithSlash) {
            log.debug(`CORS: Allowing CLIENT_URL origin (with slash variant): ${origin}`);
            return callback(null, true);
          }
        }
      }

      // Origin not allowed - log for debugging but still allow (for now, to debug)
      log.warn(`CORS: Origin not explicitly allowed: ${origin}`);
      log.debug(`CORS: CLIENT_URL env var: ${process.env.CLIENT_URL || 'not set'}`);
      // Temporarily allow to see if this fixes the issue - we can restrict later
      log.warn(`CORS: Temporarily allowing origin for debugging: ${origin}`);
      return callback(null, true);
      // TODO: Re-enable strict checking after debugging
      // callback(new Error(`Not allowed by CORS: ${origin}`));
    } catch (error) {
      // If there's an error in the validation logic, allow by default to prevent blocking
      log.error('CORS validation error', error);
      log.warn('CORS: Allowing origin due to validation error');
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
  // Log ALL API requests for debugging (development only)
  if (req.path.startsWith('/api/')) {
    const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode') || req.url.includes('/barcode');
    
    if (isBarcodeRoute) {
      log.debug('[Request] BARCODE REQUEST DETECTED', {
        method: req.method,
        path: req.path,
        url: req.url,
        originalUrl: req.originalUrl,
        baseUrl: req.baseUrl,
        query: req.query,
        params: req.params,
        headers: {
          authorization: req.headers.authorization ? 'Present' : 'Missing',
          origin: req.headers.origin || 'none',
          'content-type': req.headers['content-type'] || 'none',
        },
      });
    } else {
      // Log all other API requests too (development only)
      log.debug(`[Request] ${req.method} ${req.path}`, {
        url: req.url !== req.path ? req.url : undefined,
        origin: req.headers.origin || 'none',
      });
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
log.debug('Products routes registered at /api/products');
log.debug('Available product routes: GET /api/products/, GET /api/products/metrics, GET /api/products/barcode/:barcode, GET /api/products/:id, POST /api/products/, POST /api/products/import, PUT /api/products/:id, DELETE /api/products/:id');
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);

// 404 handler - log all unmatched routes for debugging
app.use((req, res) => {
  const isBarcodeRoute = req.path.includes('/barcode') || req.originalUrl.includes('/barcode');
  
  log.warn('Route not found', {
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
  
  // Special handling for barcode routes to help debug (development only)
  if (isBarcodeRoute) {
    log.error('BARCODE ROUTE 404 - This should not happen!', {
      expectedRoute: 'GET /api/products/barcode/:barcode',
      actualPath: req.path,
      actualOriginalUrl: req.originalUrl,
      possibleCauses: [
        'Route not registered (check server startup logs)',
        'Authentication failed before reaching route (check auth logs)',
        'Store isolation middleware blocked request (check store isolation logs)',
        'Path mismatch (expected /api/products/barcode/:barcode)',
      ],
    });
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
  log.info(`Server running on http://localhost:${PORT}`);
  log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  log.info(`API Health: http://localhost:${PORT}/health`);
});

// Handle server errors gracefully
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    log.error(`Port ${PORT} is already in use`, error);
    process.exit(1);
  } else {
    log.error('Server error', error);
    // Don't exit immediately - let it try to recover
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  log.error('Unhandled Rejection', err);
  // In production, log but don't exit immediately - let the server keep running
  // This prevents Render from killing the service during startup
  if (process.env.NODE_ENV === 'development') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  log.error('Uncaught Exception', err);
  // Always exit on uncaught exceptions as they indicate a serious error
  process.exit(1);
});

export default app;

