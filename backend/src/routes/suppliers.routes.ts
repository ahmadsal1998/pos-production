import { Router } from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierAccountsSummary,
  getSupplierPayments,
  addSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
  validateCreateSupplier,
  validateUpdateSupplier,
  validateAddSupplierPayment,
  validateUpdateSupplierPayment,
} from '../controllers/suppliers.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();

router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getSuppliers);
router.get('/accounts/summary', getSupplierAccountsSummary);
router.get('/payments', getSupplierPayments);
router.post('/payments', validateAddSupplierPayment, addSupplierPayment);
router.put('/payments/:id', validateUpdateSupplierPayment, updateSupplierPayment);
router.delete('/payments/:id', deleteSupplierPayment);
router.get('/:id', getSupplierById);
router.post('/', validateCreateSupplier, createSupplier);
router.put('/:id', validateUpdateSupplier, updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;
