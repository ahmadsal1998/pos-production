import { Router } from 'express';
import {
  addPointsAfterSale,
  getCustomerPoints,
  getCustomerPointsHistory,
  payWithPoints,
  validateAddPoints,
  validatePayWithPoints,
} from '../controllers/points.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All points routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

// Add points after sale (store operation)
router.post('/add', validateAddPoints, addPointsAfterSale);

// Get customer points balance and history
// Routes without path params (using query params) must come BEFORE routes with path params
// This ensures /customer/history matches before /customer/:customerId
router.get('/customer/history', getCustomerPointsHistory);
router.get('/customer', getCustomerPoints);
// Routes with path parameters come after
router.get('/customer/:customerId/history', getCustomerPointsHistory);
router.get('/customer/:customerId', getCustomerPoints);

// Pay with points
router.post('/pay', validatePayWithPoints, payWithPoints);

export default router;

