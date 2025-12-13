import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
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

// Connect to MongoDB
connectDB();

// Middleware
// CORS configuration - Allow configured origins and Vercel preview deployments
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    try {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }

      // In development, allow all origins
      if (isDevelopment) {
        return callback(null, true);
      }

      // Normalize origin (remove trailing slash, trim whitespace)
      const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '');

      // Build allowed origins list
      const allowedOrigins: string[] = [];
      
      // Add CLIENT_URL if set
      if (process.env.CLIENT_URL) {
        const clientUrl = process.env.CLIENT_URL.trim();
        allowedOrigins.push(clientUrl);
        // Also add without trailing slash if it has one
        if (clientUrl.endsWith('/')) {
          allowedOrigins.push(clientUrl.slice(0, -1));
        } else {
          allowedOrigins.push(clientUrl + '/');
        }
      }

      // Allow any Vercel preview/production deployment (case-insensitive check)
      if (origin.toLowerCase().includes('.vercel.app')) {
        console.log(`CORS: Allowing Vercel origin: ${origin}`);
        return callback(null, true);
      }

      // Explicitly allow the production Vercel URL (case-insensitive)
      if (normalizedOrigin === 'https://pos-production.vercel.app') {
        console.log(`CORS: Allowing production origin: ${origin}`);
        return callback(null, true);
      }

      // Check if origin is in allowed list (exact match or with/without trailing slash)
      const normalizedAllowed = allowedOrigins.map(o => o.trim().toLowerCase().replace(/\/$/, ''));
      
      if (normalizedAllowed.includes(normalizedOrigin) || allowedOrigins.some(o => o.toLowerCase() === origin.toLowerCase())) {
        console.log(`CORS: Allowing configured origin: ${origin}`);
        return callback(null, true);
      }

      // Origin not allowed - log for debugging
      console.warn(`CORS: Origin not allowed: ${origin}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    } catch (error) {
      // If there's an error in the validation logic, deny by default but log the error
      console.error('CORS validation error:', error);
      callback(new Error('CORS validation failed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'POS System API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/warehouses', warehousesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/merchants', merchantsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Health: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('❌ Unhandled Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('❌ Uncaught Exception:', err.message);
  process.exit(1);
});

export default app;

