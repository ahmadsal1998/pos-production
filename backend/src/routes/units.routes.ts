import { Router } from 'express';
import multer from 'multer';
import {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
  exportUnits,
  importUnits,
  validateCreateUnit,
  validateUpdateUnit
} from '../controllers/units.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireStoreAccess } from '../middleware/storeIsolation.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All unit routes require authentication and store access
router.use(authenticate);
router.use(requireStoreAccess);

router.get('/', getUnits);
router.get('/:id', getUnitById);
router.post('/', validateCreateUnit, createUnit);
router.put('/:id', validateUpdateUnit, updateUnit);
router.delete('/:id', deleteUnit);
router.get('/export', exportUnits);
router.post('/import', upload.single('file'), importUnits);

export default router;

