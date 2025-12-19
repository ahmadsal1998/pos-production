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
} from '../controllers/sales.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

// All sales routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/next-invoice-number', getNextInvoiceNumber);
router.post('/', createSale);
router.post('/return', processReturn);
router.get('/summary', getSalesSummary);
router.get('/', getSales);
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

export default router;
