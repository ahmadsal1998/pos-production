import { Router } from 'express';
import {
  createSale,
  getSales,
  getSalesSummary,
  getSale,
  updateSale,
  deleteSale,
  processReturn,
  getNextInvoiceNumber,
  getCurrentInvoiceNumber,
  getPublicInvoice,
} from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// Public route (no authentication required) - must be before auth middleware
router.get('/public/invoice', getPublicInvoice);

// All other sales routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/current-invoice-number', getCurrentInvoiceNumber);
router.get('/next-invoice-number', getNextInvoiceNumber);
router.post('/', createSale);
router.post('/return', processReturn);
router.get('/summary', getSalesSummary);
router.get('/', getSales);
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
