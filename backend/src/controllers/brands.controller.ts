import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getBrandModelForStore } from '../utils/brandModel';
import { findUserByIdAcrossStores } from '../utils/userModel';

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

  console.log('🔍 Create Brand - User info from token:', {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    storeId: storeId,
  });

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await findUserByIdAcrossStores(req.user.userId, req.user.storeId || undefined);
      if (user && user.storeId) {
        storeId = user.storeId;
        console.log('✅ Create Brand - Found storeId from user record:', storeId);
      }
    } catch (error: any) {
      console.error('❌ Create Brand - Error fetching user:', error.message);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    console.error('❌ Create Brand - No storeId found for user');
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  try {
    console.log('🔍 Create Brand - Getting Brand model for storeId:', storeId);
    // Get store-specific Brand model
    let Brand;
    try {
      Brand = await getBrandModelForStore(storeId);
      console.log('✅ Create Brand - Brand model obtained');
    } catch (modelError: any) {
      console.error('❌ Create Brand - Error getting Brand model:', {
        message: modelError.message,
        stack: modelError.stack,
        storeId: storeId,
      });
      return res.status(400).json({
        success: false,
        message: modelError.message || 'Failed to access store brands. Please ensure your account is associated with a valid store.',
      });
    }

    const trimmedName = name.trim();

    // Check if brand with same name exists for this store
    const existingBrand = await Brand.findOne({ 
      name: trimmedName,
    });
    
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: 'Brand with this name already exists',
      });
    }

    const brand = await Brand.create({
      name: trimmedName,
      description: description?.trim() || undefined,
    });

    console.log('✅ Create Brand - Brand created successfully:', brand._id);
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      brand,
    });
  } catch (error: any) {
    console.error('❌ Create Brand - Error:', {
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
    // Get store-specific Brand model
    const Brand = await getBrandModelForStore(storeId);
    
    // Get all brands from the store-specific collection
    const brands = await Brand.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Brands retrieved successfully',
      brands,
    });
  } catch (error: any) {
    console.error('Error fetching brands:', error);
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
    // Get store-specific Brand model
    const Brand = await getBrandModelForStore(storeId);
    
    // Get all brands from the store-specific collection
    const brands = await Brand.find().sort({ createdAt: -1 });

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
    console.error('Error exporting brands:', error);
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

  // Get store-specific Brand model once
  let BrandModel;
  try {
    BrandModel = await getBrandModelForStore(storeId);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to access store brands. Please ensure you are logged in as a store user.',
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length,
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Store access error' })),
      brands: [],
    });
  }

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
      let existing = await BrandModel.findOne({ name });
      if (!existing) {
        existing = await BrandModel.findOne({
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
        await BrandModel.create({
          name,
          description: description || undefined,
        });
        created += 1;
      }
    }

    // Get all brands from the store-specific collection
    const brands = await BrandModel.find().sort({ createdAt: -1 });

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
    console.error('Error importing brands:', error);
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

