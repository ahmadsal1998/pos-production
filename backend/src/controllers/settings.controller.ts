import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getStoreSettingsModel } from '../models/Settings';
import Store from '../models/Store';

async function loadStoreContext(req: AuthenticatedRequest, res: Response) {
  const storeId = req.user?.storeId;
  if (!storeId) {
    res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
    return null;
  }

  const store = await Store.findOne({ storeId: storeId.toLowerCase() }).lean();
  if (!store) {
    res.status(404).json({
      success: false,
      message: 'Store not found for the current user.',
    });
    return null;
  }

  return store;
}

/**
 * Get store-specific setting
 * Store users can access their own store settings
 */
export const getStoreSetting = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { key } = req.params;
    const store = await loadStoreContext(req, res);
    if (!store) return;

    const settingsModel = await getStoreSettingsModel(store.prefix, store.databaseId);
    const setting = await settingsModel.findOne({ key: key.toLowerCase() });

    res.status(200).json({
      success: true,
      data: {
        setting,
      },
    });
  }
);

/**
 * Update or create store-specific setting
 * Store users can update their own store settings
 */
export const updateStoreSetting = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
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
    const store = await loadStoreContext(req, res);
    if (!store) return;

    // Coerce value/description to strings safely
    const valueString = value !== undefined && value !== null ? String(value).trim() : '';
    const descriptionString =
      description !== undefined && description !== null ? String(description).trim() : undefined;

    // Use upsert to create if doesn't exist, update if exists
    const settingsModel = await getStoreSettingsModel(store.prefix, store.databaseId);
    const setting = await settingsModel.findOneAndUpdate(
      { key: key.toLowerCase() },
      {
        value: valueString,
        description: descriptionString || undefined,
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

/**
 * Get all store-specific settings
 */
export const getStoreSettings = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const store = await loadStoreContext(req, res);
    if (!store) return;

    const settingsModel = await getStoreSettingsModel(store.prefix, store.databaseId);
    const settings = await settingsModel.find().sort({ key: 1 });

    // Convert array to object for easier access
    const settingsObject: Record<string, string> = {};
    settings.forEach((setting) => {
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

// Validation middleware for update setting
export const validateUpdateStoreSetting = [
  body('value')
    .optional({ nullable: true, checkFalsy: false })
    .customSanitizer((v) => (v === undefined || v === null ? '' : String(v).trim()))
    .isLength({ min: 0, max: 500 })
    .withMessage('Setting value must be at most 500 characters'),
  body('description')
    .optional()
    .customSanitizer((v) => (v === undefined || v === null ? undefined : String(v).trim()))
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
];

