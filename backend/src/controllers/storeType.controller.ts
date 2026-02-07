import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import StoreType from '../models/StoreType';
import Store from '../models/Store';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

export const getStoreTypes = asyncHandler(
  async (_req: AuthenticatedRequest, res: Response, _next: NextFunction) => {
    let count = await StoreType.countDocuments();
    if (count === 0) {
      await StoreType.insertMany([
        { name: 'Restaurant', description: 'مطعم' },
        { name: 'Supermarket', description: 'سوبرماركت' },
        { name: 'Pharmacy', description: 'صيدلية' },
      ]);
    }
    const types = await StoreType.find().sort({ name: 1 }).lean();
    const storeTypes = types.map((t: any) => ({
      id: t._id?.toString(),
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
    res.status(200).json({ success: true, data: { storeTypes } });
  }
);

export const createStoreType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { name, description } = req.body;
    const escaped = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await StoreType.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Store type with this name already exists' });
    }
    const doc = await StoreType.create({ name: name.trim(), description: description?.trim() || undefined });
    const d = doc.toJSON ? (doc as any).toJSON() : doc;
    res.status(201).json({
      success: true,
      message: 'Store type created',
      data: { storeType: { id: d.id || doc._id?.toString(), name: doc.name, description: doc.description } },
    });
  }
);

export const updateStoreType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { id } = req.params;
    const { name, description } = req.body;
    const existing = await StoreType.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Store type not found' });
    }
    if (name !== undefined) {
      const escaped = String(name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameConflict = await StoreType.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escaped}$`, 'i') },
      });
      if (nameConflict) {
        return res.status(400).json({ success: false, message: 'Store type with this name already exists' });
      }
      existing.name = String(name).trim();
    }
    if (description !== undefined) existing.description = description?.trim() || undefined;
    await existing.save();
    res.status(200).json({
      success: true,
      message: 'Store type updated',
      data: {
        storeType: {
          id: existing._id?.toString(),
          name: existing.name,
          description: existing.description,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      },
    });
  }
);

export const deleteStoreType = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const st = await StoreType.findById(id);
    if (!st) {
      return res.status(404).json({ success: false, message: 'Store type not found' });
    }
    const used = await Store.countDocuments({ storeTypeId: id });
    if (used > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${used} store(s) use this type. Reassign or remove them first.`,
      });
    }
    await StoreType.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Store type deleted' });
  }
);

export const validateCreateStoreType = [
  body('name').notEmpty().withMessage('Name is required').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];

export const validateUpdateStoreType = [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim().isLength({ max: 500 }),
];
