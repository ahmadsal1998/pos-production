import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import Store from '../models/Store';
import Settings from '../models/Settings';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { determineDatabaseForStore } from '../utils/databaseManager';
import { createStoreCollections } from '../utils/storeCollections';
import { getUserModel, findUserAcrossStores } from '../utils/userModel';
import { reactivateStore } from '../utils/subscriptionManager';

// Get all stores
export const getStores = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const stores = await Store.find().sort({ storeNumber: 1 });

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

    const { 
      name, 
      storeId, 
      prefix, 
      createDefaultAdmin, 
      defaultAdminEmail, 
      defaultAdminPassword, 
      defaultAdminName,
      subscriptionDuration, // e.g., '1month', '2months', '1year', '2years'
      subscriptionEndDate, // Manual date selection (ISO string)
    } = req.body;

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

    // Calculate subscription end date
    let endDate: Date;
    const startDate = new Date();

    if (subscriptionEndDate) {
      // Manual date selection
      endDate = new Date(subscriptionEndDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription end date format',
        });
      }
      // Ensure end date is in the future
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'Subscription end date must be in the future',
        });
      }
    } else if (subscriptionDuration) {
      // Predefined duration
      const durationMap: { [key: string]: number } = {
        '1month': 1,
        '2months': 2,
        '1year': 12,
        '2years': 24,
      };

      const months = durationMap[subscriptionDuration];
      if (!months) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription duration. Valid options: 1month, 2months, 1year, 2years',
        });
      }

      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
    } else {
      // Default to 1 month if nothing specified
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    // Determine which database this store should be assigned to
    const databaseId = await determineDatabaseForStore(Store);
    
    console.log(`📊 Assigning new store "${name}" to database ${databaseId}`);

    // Generate the next sequential store number
    const lastStore = await Store.findOne().sort({ storeNumber: -1 });
    const nextStoreNumber = lastStore ? lastStore.storeNumber + 1 : 1;

    // Create store with databaseId and subscription info
    const store = await Store.create({
      storeNumber: nextStoreNumber,
      name,
      storeId: storeId.toLowerCase(),
      prefix: prefix.toLowerCase(),
      databaseId,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      isActive: true, // Store starts as active
    });

    // Create collections for the new store in the assigned database
    try {
      await createStoreCollections(prefix.toLowerCase(), databaseId, store.storeId.toLowerCase());
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
        
        // Check if username or email already exists across all stores
        const existingUser = await findUserAcrossStores({
          $or: [
            { username: defaultUsername.toLowerCase() },
            { email: defaultAdminEmail.toLowerCase() }
          ]
        });

        if (!existingUser) {
          // Get the user model for this store's collection
          const userModel = await getUserModel(store.storeId.toLowerCase());
          
          defaultAdmin = await userModel.create({
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
            storeId: store.storeId.toLowerCase(), // Associate user with store's storeId (canonical identifier)
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
    const { 
      name, 
      email, 
      phone, 
      address, 
      city, 
      country 
    } = req.body;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Update store fields (storeId and prefix should not be changed)
    if (name) store.name = name;
    if (email !== undefined) store.email = email || undefined;
    if (phone !== undefined) store.phone = phone || undefined;
    if (address !== undefined) store.address = address || undefined;
    if (city !== undefined) store.city = city || undefined;
    if (country !== undefined) store.country = country || undefined;

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

// Renew store subscription
export const renewSubscription = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { subscriptionDuration, subscriptionEndDate } = req.body;

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    // Calculate new subscription end date
    let endDate: Date;
    const startDate = new Date();

    if (subscriptionEndDate) {
      // Manual date selection
      endDate = new Date(subscriptionEndDate);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription end date format',
        });
      }
      if (endDate <= startDate) {
        return res.status(400).json({
          success: false,
          message: 'Subscription end date must be in the future',
        });
      }
    } else if (subscriptionDuration) {
      // Predefined duration
      const durationMap: { [key: string]: number } = {
        '1month': 1,
        '2months': 2,
        '1year': 12,
        '2years': 24,
      };

      const months = durationMap[subscriptionDuration];
      if (!months) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription duration. Valid options: 1month, 2months, 1year, 2years',
        });
      }

      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either subscriptionDuration or subscriptionEndDate is required',
      });
    }

    // Update subscription
    store.subscriptionStartDate = startDate;
    store.subscriptionEndDate = endDate;
    store.isActive = true; // Activate store when renewing
    await store.save();

    res.status(200).json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        store,
      },
    });
  }
);

// Activate or deactivate store
export const toggleStoreStatus = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    store.isActive = isActive;
    await store.save();

    res.status(200).json({
      success: true,
      message: `Store ${isActive ? 'activated' : 'deactivated'} successfully`,
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
  body('subscriptionDuration')
    .optional()
    .isIn(['1month', '2months', '1year', '2years'])
    .withMessage('Subscription duration must be one of: 1month, 2months, 1year, 2years'),
  body('subscriptionEndDate')
    .optional()
    .isISO8601()
    .withMessage('Subscription end date must be a valid ISO 8601 date'),
];

// Validation middleware for update store
export const validateUpdateStore = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Store name must be between 2 and 100 characters'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim(),
  body('address')
    .optional()
    .trim(),
  body('city')
    .optional()
    .trim(),
  body('country')
    .optional()
    .trim(),
];

// Validation middleware for renew subscription
export const validateRenewSubscription = [
  body('subscriptionDuration')
    .optional()
    .isIn(['1month', '2months', '1year', '2years'])
    .withMessage('Subscription duration must be one of: 1month, 2months, 1year, 2years'),
  body('subscriptionEndDate')
    .optional()
    .isISO8601()
    .withMessage('Subscription end date must be a valid ISO 8601 date'),
];

// Get all settings
export const getSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const settings = await Settings.find().sort({ key: 1 });
    
    // Convert array to object for easier access
    const settingsObject: Record<string, string> = {};
    settings.forEach(setting => {
      settingsObject[setting.key] = setting.value;
    });

    res.status(200).json({
      success: true,
      data: {
        settings: settingsObject,
        settingsList: settings,
      },
    });
  }
);

// Get single setting by key
export const getSetting = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { key } = req.params;

    const setting = await Settings.findOne({ key: key.toLowerCase() });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        setting,
      },
    });
  }
);

// Update or create setting
export const updateSetting = asyncHandler(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { key } = req.params;
    const { value, description } = req.body;

    // Use upsert to create if doesn't exist, update if exists
    const setting = await Settings.findOneAndUpdate(
      { key: key.toLowerCase() },
      {
        value: value.trim(),
        description: description?.trim() || undefined,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'Setting updated successfully',
      data: {
        setting,
      },
    });
  }
);

// Validation middleware for update setting
export const validateUpdateSetting = [
  body('value')
    .notEmpty()
    .withMessage('Setting value is required')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Setting value must be between 1 and 500 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

