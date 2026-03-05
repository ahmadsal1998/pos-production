import { Application } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import categoriesRoutes from './categories.routes';
import brandsRoutes from './brands.routes';
import unitsRoutes from './units.routes';
import warehousesRoutes from './warehouses.routes';
import productsRoutes from './products.routes';
import adminRoutes from './admin.routes';
import paymentsRoutes from './payments.routes';
import merchantsRoutes from './merchants.routes';
import settingsRoutes from './settings.routes';
import customersRoutes from './customers.routes';
import salesRoutes from './sales.routes';
import pointsRoutes from './points.routes';
import storeAccountRoutes from './storeAccount.routes';
import storePointsAccountRoutes from './storePointsAccount.routes';
import suppliersRoutes from './suppliers.routes';
import purchasesRoutes from './purchases.routes';
import { log } from '../utils/logger';

/**
 * Mount all API route modules on the Express app.
 * Keeps server.ts minimal and centralizes route registration.
 */
export function mountRoutes(app: Application): void {
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
  app.use('/api/points', pointsRoutes);
  app.use('/api/store-accounts', storeAccountRoutes);
  app.use('/api/store-points-accounts', storePointsAccountRoutes);
  app.use('/api/suppliers', suppliersRoutes);
  app.use('/api/purchases', purchasesRoutes);
}
