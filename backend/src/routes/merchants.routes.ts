import express from 'express';
import {
  getMerchants,
  getMerchant,
  createMerchant,
  updateMerchant,
  deleteMerchant,
} from '../controllers/merchants.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Merchant routes
router.get('/', getMerchants);
router.get('/:id', getMerchant);
router.post('/', createMerchant);
router.put('/:id', updateMerchant);
router.delete('/:id', deleteMerchant);

export default router;

