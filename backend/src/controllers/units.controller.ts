import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import Unit from '../models/Unit';
import User from '../models/User';

export const validateCreateUnit = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Unit name is required')
    .isLength({ max: 120 })
    .withMessage('Unit name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

export const validateUpdateUnit = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Unit name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Unit name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

export const createUnit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { name, description } = req.body;
  let storeId = req.user?.storeId || null;

  console.log('🔍 Create Unit - User info from token:', {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    storeId: storeId,
  });

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
        console.log('✅ Create Unit - Found storeId from user record:', storeId);
      }
    } catch (error: any) {
      console.error('❌ Create Unit - Error fetching user:', error.message);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    console.error('❌ Create Unit - No storeId found for user');
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();

    const trimmedName = name.trim();

    // Check if unit with same name exists for this store
    const existingUnit = await Unit.findOne({ 
      storeId: normalizedStoreId,
      name: trimmedName,
    });
    
    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this name already exists',
      });
    }

    const unit = await Unit.create({
      storeId: normalizedStoreId,
      name: trimmedName,
      description: description?.trim() || undefined,
    });

    console.log('✅ Create Unit - Unit created successfully:', unit._id);
    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      unit,
    });
  } catch (error: any) {
    console.error('❌ Create Unit - Error:', {
      message: error.message,
      stack: error.stack,
      storeId: storeId,
      name: error.name,
      code: error.code,
    });
    
    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(', ') || 'Validation error',
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create unit. Please try again.',
    });
  }
});

export const getUnits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      units: [],
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Get all units for this store from unified collection
    const units = await Unit.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Units retrieved successfully',
      units,
    });
  } catch (error: any) {
    console.error('Error fetching units:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch units. Please try again.',
      units: [],
    });
  }
});

export const getUnitById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Find unit by ID and storeId to ensure store isolation
    const unit = await Unit.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unit retrieved successfully',
      unit,
    });
  } catch (error: any) {
    console.error('Error fetching unit:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch unit. Please try again.',
    });
  }
});

export const updateUnit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const { name, description } = req.body;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Find unit by ID and storeId to ensure store isolation
    const unit = await Unit.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    // Check if name is being changed and if new name already exists
    if (name && name.trim() !== unit.name) {
      const existingUnit = await Unit.findOne({ 
        storeId: normalizedStoreId,
        name: name.trim(),
        _id: { $ne: id }
      });
      
      if (existingUnit) {
        return res.status(400).json({
          success: false,
          message: 'Unit with this name already exists',
        });
      }
    }

    if (name !== undefined) unit.name = name.trim();
    if (description !== undefined) unit.description = description?.trim() || undefined;

    await unit.save();

    res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      unit,
    });
  } catch (error: any) {
    console.error('Error updating unit:', error);
    
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(', ') || 'Validation error',
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Unit with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update unit. Please try again.',
    });
  }
});

export const deleteUnit = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Find unit by ID and storeId to ensure store isolation
    const unit = await Unit.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    await Unit.deleteOne({ _id: id, storeId: normalizedStoreId });

    res.status(200).json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting unit:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete unit. Please try again.',
    });
  }
});

const escapeCsvValue = (value: string): string => {
  const stringValue = value ?? '';
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const normalizeHeaderKey = (key: string): string =>
  key.replace(/^\uFEFF/, '').trim().toLowerCase();

export const exportUnits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Get all units for this store from unified collection
    const units = await Unit.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    const headers = ['name', 'description', 'createdAt'];
    const rows = units.map((unit) => [
      escapeCsvValue(unit.name),
      escapeCsvValue(unit.description ?? ''),
      escapeCsvValue(unit.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const utf8WithBom = `\uFEFF${csvContent}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="units-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error: any) {
    console.error('Error exporting units:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export units. Please try again.',
    });
  }
});

export const importUnits = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  const storeId = req.user?.storeId || null;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'CSV file is required',
    });
  }

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  const fileContent = file.buffer.toString('utf-8');

  let records: Array<Record<string, string>>;
  try {
    const sanitizedContent = fileContent.replace(/^\uFEFF/, '');
    records = parse(sanitizedContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid CSV format',
    });
  }

  let created = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  // Normalize records first
  const normalizedRecords = records.map((record) => {
    const normalized: Record<string, string> = {};
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = normalizeHeaderKey(key);
      if (!normalizedKey) {
        return;
      }
      normalized[normalizedKey] =
        typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
    });
    return normalized;
  });

  // Normalize storeId to lowercase for consistency
  const normalizedStoreId = storeId.toLowerCase().trim();

  const getValue = (row: Record<string, string>, ...keys: string[]): string => {
    for (const key of keys) {
      const normalizedKey = normalizeHeaderKey(key);
      if (row[normalizedKey]) {
        return row[normalizedKey];
      }
    }
    return '';
  };

  try {
    for (let index = 0; index < normalizedRecords.length; index += 1) {
      const row = normalizedRecords[index];
      const rawName = getValue(row, 'name', 'unit', 'unit name', 'اسم الوحدة');
      const name = rawName.trim();

      if (!name) {
        errors.push({ row: index + 1, message: 'Name is required' });
        continue;
      }

      const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();

      // Find existing unit for this store
      let existing = await Unit.findOne({ 
        storeId: normalizedStoreId,
        name 
      });
      if (!existing) {
        existing = await Unit.findOne({
          storeId: normalizedStoreId,
          name: {
            $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          },
        });
      }

      if (existing) {
        existing.description = description || existing.description;
        await existing.save();
        updated += 1;
      } else {
        await Unit.create({
          storeId: normalizedStoreId,
          name,
          description: description || undefined,
        });
        created += 1;
      }
    }

    // Get all units for this store from unified collection
    const units = await Unit.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Units imported successfully',
      summary: {
        created,
        updated,
        failed: errors.length,
      },
      errors,
      units,
    });
  } catch (error: any) {
    console.error('Error importing units:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import units. Please try again.',
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length,
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Import error' })),
      units: [],
    });
  }
});

