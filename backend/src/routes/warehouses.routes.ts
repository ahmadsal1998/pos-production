import { Router } from 'express';
import multer from 'multer';
import {
  createWarehouse,
  exportWarehouses,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
  importWarehouses,
  validateCreateWarehouse,
  validateUpdateWarehouse,
} from '../controllers/warehouses.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All warehouse routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getWarehouses);
router.get('/export', exportWarehouses);
router.get('/:id', getWarehouseById);
router.post('/', validateCreateWarehouse, createWarehouse);
router.put('/:id', validateUpdateWarehouse, updateWarehouse);
router.delete('/:id', deleteWarehouse);
router.post('/import', upload.single('file'), importWarehouses);

export default router;

