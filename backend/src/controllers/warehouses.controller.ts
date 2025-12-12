import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getWarehouseModelForStore } from '../utils/warehouseModel';
import { findUserByIdAcrossStores } from '../utils/userModel';

export const validateCreateWarehouse = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Warehouse name is required')
    .isLength({ max: 120 })
    .withMessage('Warehouse name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address')
    .optional({ nullable: true })
    .isString()
    .withMessage('Address must be a string')
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('status')
    .optional({ nullable: true })
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be either Active or Inactive'),
];

export const validateUpdateWarehouse = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Warehouse name cannot be empty')
    .isLength({ max: 120 })
    .withMessage('Warehouse name cannot exceed 120 characters'),
  body('description')
    .optional({ nullable: true })
    .isString()
    .withMessage('Description must be a string')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address')
    .optional({ nullable: true })
    .isString()
    .withMessage('Address must be a string')
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('status')
    .optional({ nullable: true })
    .isIn(['Active', 'Inactive'])
    .withMessage('Status must be either Active or Inactive'),
];

export const createWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { name, description, address, status } = req.body;
  let storeId = req.user?.storeId || null;

  console.log('🔍 Create Warehouse - User info from token:', {
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
        console.log('✅ Create Warehouse - Found storeId from user record:', storeId);
      }
    } catch (error: any) {
      console.error('❌ Create Warehouse - Error fetching user:', error.message);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    console.error('❌ Create Warehouse - No storeId found for user');
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  try {
    console.log('🔍 Create Warehouse - Getting Warehouse model for storeId:', storeId);
    // Get store-specific Warehouse model
    let Warehouse;
    try {
      Warehouse = await getWarehouseModelForStore(storeId);
      console.log('✅ Create Warehouse - Warehouse model obtained');
    } catch (modelError: any) {
      console.error('❌ Create Warehouse - Error getting Warehouse model:', {
        message: modelError.message,
        stack: modelError.stack,
        storeId: storeId,
      });
      return res.status(400).json({
        success: false,
        message: modelError.message || 'Failed to access store warehouses. Please ensure your account is associated with a valid store.',
      });
    }

    // Check if warehouse with same name exists for this store
    const existingWarehouse = await Warehouse.findOne({ 
      name: name.trim(),
    });
    
    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse with this name already exists',
      });
    }

    const warehouse = await Warehouse.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      address: address?.trim() || undefined,
      status: status || 'Active',
    });

    console.log('✅ Create Warehouse - Warehouse created successfully:', warehouse._id);
    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      warehouse,
    });
  } catch (error: any) {
    console.error('❌ Create Warehouse - Error:', {
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
        message: 'Warehouse with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create warehouse. Please try again.',
    });
  }
});

export const getWarehouses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      warehouses: [],
    });
  }

  try {
    // Get store-specific Warehouse model
    const Warehouse = await getWarehouseModelForStore(storeId);
    
    // Get all warehouses from the store-specific collection
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });

    // Calculate product count for each warehouse
    // Note: This assumes products have a warehouseId field. If not, productCount will be 0.
    // You may need to adjust this based on your product schema.
    const warehousesWithCounts = await Promise.all(
      warehouses.map(async (warehouse) => {
        // TODO: Replace with actual product count query when product schema includes warehouseId
        // For now, we'll return 0 as productCount
        const productCount = 0; // Placeholder - implement actual count when product schema is ready
        
        const warehouseObj = warehouse.toJSON();
        return {
          ...warehouseObj,
          productCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Warehouses retrieved successfully',
      warehouses: warehousesWithCounts,
    });
  } catch (error: any) {
    console.error('Error fetching warehouses:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch warehouses. Please try again.',
      warehouses: [],
    });
  }
});

export const getWarehouseById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Warehouse = await getWarehouseModelForStore(storeId);
    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Calculate product count
    const productCount = 0; // Placeholder - implement actual count when product schema is ready

    res.status(200).json({
      success: true,
      message: 'Warehouse retrieved successfully',
      warehouse: {
        ...warehouse.toJSON(),
        productCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching warehouse:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch warehouse. Please try again.',
    });
  }
});

export const updateWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const { name, description, address, status } = req.body;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Warehouse = await getWarehouseModelForStore(storeId);
    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // Check if name is being changed and if it conflicts with existing warehouse
    if (name && name.trim() !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({ 
        name: name.trim(),
        _id: { $ne: id },
      });
      
      if (existingWarehouse) {
        return res.status(400).json({
          success: false,
          message: 'Warehouse with this name already exists',
        });
      }
    }

    // Update warehouse fields
    if (name !== undefined) warehouse.name = name.trim();
    if (description !== undefined) warehouse.description = description?.trim() || undefined;
    if (address !== undefined) warehouse.address = address?.trim() || undefined;
    if (status !== undefined) warehouse.status = status;

    await warehouse.save();

    // Calculate product count
    const productCount = 0; // Placeholder - implement actual count when product schema is ready

    res.status(200).json({
      success: true,
      message: 'Warehouse updated successfully',
      warehouse: {
        ...warehouse.toJSON(),
        productCount,
      },
    });
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    
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
        message: 'Warehouse with this name already exists',
      });
    }
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update warehouse. Please try again.',
    });
  }
});

export const deleteWarehouse = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Warehouse = await getWarehouseModelForStore(storeId);
    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found',
      });
    }

    // TODO: Check if warehouse has products before deleting
    // For now, we'll allow deletion but you may want to add a check:
    // const productCount = await Product.countDocuments({ warehouseId: id });
    // if (productCount > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Cannot delete warehouse. It contains ${productCount} product(s).`,
    //   });
    // }

    await Warehouse.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Warehouse deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting warehouse:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete warehouse. Please try again.',
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

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const exportWarehouses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Warehouse = await getWarehouseModelForStore(storeId);
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });

    const headers = ['name', 'description', 'address', 'status', 'createdAt'];
    const rows = warehouses.map((warehouse) => [
      escapeCsvValue(warehouse.name),
      escapeCsvValue(warehouse.description ?? ''),
      escapeCsvValue(warehouse.address ?? ''),
      escapeCsvValue(warehouse.status),
      escapeCsvValue(warehouse.createdAt.toISOString()),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const utf8WithBom = `\uFEFF${csvContent}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="warehouses-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error: any) {
    console.error('Error exporting warehouses:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to export warehouses. Please try again.',
    });
  }
});

export const importWarehouses = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const file = req.file;
  const storeId = req.user?.storeId || null;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'CSV file is required',
    });
  }

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

  let WarehouseModel;
  try {
    WarehouseModel = await getWarehouseModelForStore(storeId);
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to access store warehouses. Please ensure you are logged in as a store user.',
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length,
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Store access error' })),
      warehouses: [],
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
      const name = getValue(row, 'name', 'warehouse', 'warehouse name', 'اسم المستودع', 'warehousename').trim();

      if (!name) {
        errors.push({ row: index + 1, message: 'Name is required' });
        continue;
      }

      const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();
      const address = getValue(row, 'address', 'location', 'عنوان').trim();
      const status = getValue(row, 'status', 'state', 'حالة').trim() || 'Active';

      let existing = await WarehouseModel.findOne({ name });
      if (!existing) {
        existing = await WarehouseModel.findOne({
          name: {
            $regex: new RegExp(`^${escapeRegex(name)}$`, 'i'),
          },
        });
      }

      if (existing) {
        existing.name = name;
        if (description) {
          existing.description = description;
        }
        if (address) {
          existing.address = address;
        }
        if (status === 'Active' || status === 'Inactive') {
          existing.status = status;
        }
        await existing.save();
        updated += 1;
      } else {
        await WarehouseModel.create({
          name,
          description: description || undefined,
          address: address || undefined,
          status: status === 'Active' || status === 'Inactive' ? status : 'Active',
        });
        created += 1;
      }
    }

    const warehouses = await WarehouseModel.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Warehouses imported successfully',
      summary: {
        created,
        updated,
        failed: errors.length,
      },
      errors,
      warehouses,
    });
  } catch (error: any) {
    console.error('Error importing warehouses:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import warehouses. Please try again.',
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length,
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Import error' })),
      warehouses: [],
    });
  }
});

