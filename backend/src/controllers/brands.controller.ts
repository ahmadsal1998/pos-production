import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import Brand from '../models/Brand';
import User from '../models/User';
import { log } from '../utils/logger';

export const validateCreateBrand = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ max: 120 })
    .withMessage('Brand name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

export const createBrand = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

  log.debug('Create Brand - User info from token', {
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
        log.debug('Create Brand - Found storeId from user record', { storeId });
      }
    } catch (error: any) {
      log.error('Create Brand - Error fetching user', error);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    log.warn('Create Brand - No storeId found for user');
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();

    const trimmedName = name.trim();

    // Check if brand with same name exists for this store
    const existingBrand = await Brand.findOne({ 
      storeId: normalizedStoreId,
      name: trimmedName,
    });
    
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists',
      });
    }

    const brand = await Brand.create({
      storeId: normalizedStoreId,
      name: trimmedName,
      description: description?.trim() || undefined,
    });

    log.debug('Create Brand - Brand created successfully', { brandId: brand._id });
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      brand,
    });
  } catch (error: any) {
    log.error('Create Brand - Error', error, { storeId });
    
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
        message: 'Brand with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create brand. Please try again.',
    });
  }
});

export const getBrands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      brands: [],
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Get all brands for this store from unified collection
    const brands = await Brand.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      brands,
    });
  } catch (error: any) {
    log.error('Error fetching brands', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch brands. Please try again.',
      brands: [],
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

export const exportBrands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
    
    // Get all brands for this store from unified collection
    const brands = await Brand.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    const headers = ['name', 'description', 'createdAt'];
    const rows = brands.map((brand) => [
      escapeCsvValue(brand.name),
      escapeCsvValue(brand.description ?? ''),
      escapeCsvValue(brand.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const utf8WithBom = `\uFEFF${csvContent}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="brands-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error: any) {
    log.error('Error exporting brands', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export brands. Please try again.',
    });
  }
});

export const importBrands = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
      const rawName = getValue(row, 'name', 'brand', 'brand name', 'اسم العلامة');
      const name = rawName.trim();

      if (!name) {
        errors.push({ row: index + 1, message: 'Name is required' });
        continue;
      }

      const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();

      // Find existing brand for this store
      let existing = await Brand.findOne({ 
        storeId: normalizedStoreId,
        name 
      });
      if (!existing) {
        existing = await Brand.findOne({
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
        await Brand.create({
          storeId: normalizedStoreId,
          name,
          description: description || undefined,
        });
        created += 1;
      }
    }

    // Get all brands for this store from unified collection
    const brands = await Brand.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Brands imported successfully',
      summary: {
        created,
        updated,
        failed: errors.length,
      },
      errors,
      brands,
    });
  } catch (error: any) {
    log.error('Error importing brands', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import brands. Please try again.',
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length,
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Import error' })),
      brands: [],
    });
  }
});

