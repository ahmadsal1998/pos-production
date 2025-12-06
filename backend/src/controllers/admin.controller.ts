import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Store from '../models/Store';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { determineDatabaseForStore } from '../utils/databaseManager';
import { createStoreCollections } from '../utils/storeCollections';

// Get all stores
export const getStores = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const stores = await Store.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        stores,
      },
    });
  }
);

// Get single store
export const getStore = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        store,
      },
    });
  }
);

// Create new store
export const createStore = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, storeId, prefix, createDefaultAdmin, defaultAdminEmail, defaultAdminPassword, defaultAdminName } = req.body;

    // Check if storeId already exists
    const existingStoreById = await Store.findOne({ storeId: storeId.toLowerCase() });
    if (existingStoreById) {
      return res.status(400).json({
        success: false,
        message: 'Store ID already exists',
      });
    }

    // Check if prefix already exists
    const existingStoreByPrefix = await Store.findOne({ prefix: prefix.toLowerCase() });
    if (existingStoreByPrefix) {
      return res.status(400).json({
        success: false,
        message: 'Store prefix already exists',
      });
    }

    // Determine which database this store should be assigned to
    const databaseId = await determineDatabaseForStore(Store);
    
    console.log(`📊 Assigning new store "${name}" to database ${databaseId}`);

    // Create store with databaseId
    const store = await Store.create({
      name,
      storeId: storeId.toLowerCase(),
      prefix: prefix.toLowerCase(),
      databaseId,
    });

    // Create collections for the new store in the assigned database
    try {
      await createStoreCollections(prefix.toLowerCase(), databaseId);
      console.log(`✅ Successfully created all collections for store ${prefix} in database ${databaseId}`);
    } catch (error: any) {
      console.error(`❌ Error creating collections for store ${prefix}:`, error.message);
      // Continue even if collection creation fails - store is already created
      // Collections will be created automatically when first document is inserted
    }

    // Optionally create a default store admin user
    let defaultAdmin = null;
    if (createDefaultAdmin && defaultAdminEmail && defaultAdminPassword) {
      try {
        // Generate a default username if not provided
        const defaultUsername = defaultAdminEmail.split('@')[0] + '_' + prefix;
        
        // Check if username already exists
        const existingUser = await User.findOne({
          $or: [
            { username: defaultUsername.toLowerCase() },
            { email: defaultAdminEmail.toLowerCase() }
          ]
        });

        if (!existingUser) {
          defaultAdmin = await User.create({
            fullName: defaultAdminName || `Store Admin - ${name}`,
            username: defaultUsername.toLowerCase(),
            email: defaultAdminEmail.toLowerCase(),
            password: defaultAdminPassword,
            role: 'Manager',
            permissions: [
              'dashboard',
              'products',
              'categories',
              'brands',
              'purchases',
              'expenses',
              'salesToday',
              'salesHistory',
              'posRetail',
              'posWholesale',
              'refunds',
              'preferences',
              'users',
            ],
            status: 'Active',
            storeId: prefix.toLowerCase(), // Associate user with store prefix
          });
        }
      } catch (error: any) {
        console.error('Error creating default admin user:', error);
        // Continue even if user creation fails - store is already created
      }
    }

    res.status(201).json({
      success: true,
      message: 'Store created successfully',
      data: {
        store,
        defaultAdmin: defaultAdmin ? {
          id: defaultAdmin._id.toString(),
          username: defaultAdmin.username,
          email: defaultAdmin.email,
          fullName: defaultAdmin.fullName,
        } : null,
      },
    });
  }
);

// Update store
export const updateStore = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name } = req.body;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Update store name (storeId and prefix should not be changed)
    store.name = name;
    await store.save();

    res.status(200).json({
      success: true,
      message: 'Store updated successfully',
      data: {
        store,
      },
    });
  }
);

// Delete store
export const deleteStore = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Delete store
    await Store.findByIdAndDelete(id);

    // Optionally delete collections (commented out for safety)
    // const db = mongoose.connection.db;
    // if (db) {
    //   const collections = [
    //     `${store.prefix}_products`,
    //     `${store.prefix}_orders`,
    //     `${store.prefix}_customers`,
    //   ];
    //   for (const collectionName of collections) {
    //     try {
    //       await db.dropCollection(collectionName);
    //     } catch (error) {
    //       console.error(`Error dropping collection ${collectionName}:`, error);
    //     }
    //   }
    // }

    res.status(200).json({
      success: true,
      message: 'Store deleted successfully',
    });
  }
);

// Validation middleware for create store
export const validateCreateStore = [
  body('name')
    .notEmpty()
    .withMessage('Store name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Store name must be between 2 and 100 characters'),
  body('storeId')
    .notEmpty()
    .withMessage('Store ID is required')
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Store ID must contain only lowercase letters, numbers, and underscores'),
  body('prefix')
    .notEmpty()
    .withMessage('Store prefix is required')
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9_]+$/)
    .withMessage('Prefix must contain only lowercase letters, numbers, and underscores'),
  body('createDefaultAdmin')
    .optional()
    .isBoolean()
    .withMessage('createDefaultAdmin must be a boolean'),
  body('defaultAdminEmail')
    .optional()
    .isEmail()
    .withMessage('Default admin email must be a valid email')
    .normalizeEmail(),
  body('defaultAdminPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Default admin password must be at least 6 characters'),
  body('defaultAdminName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Default admin name must be between 2 and 100 characters'),
];

// Validation middleware for update store
export const validateUpdateStore = [
  body('name')
    .notEmpty()
    .withMessage('Store name is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Store name must be between 2 and 100 characters'),
];

