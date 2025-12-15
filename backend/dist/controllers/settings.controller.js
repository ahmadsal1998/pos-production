"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUpdateStoreSetting = exports.getStoreSettings = exports.updateStoreSetting = exports.getStoreSetting = void 0;
const express_validator_1 = require("express-validator");
const error_middleware_1 = require("../middleware/error.middleware");
const Settings_1 = __importDefault(require("../models/Settings"));
/**
 * Get store-specific setting
 * Store users can access their own store settings
 */
exports.getStoreSetting = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { key } = req.params;
    const storeId = req.user?.storeId;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    const setting = await Settings_1.default.findOne({
        storeId: storeId.toLowerCase(),
        key: key.toLowerCase()
    });
    res.status(200).json({
        success: true,
        data: {
            setting,
        },
    });
});
/**
 * Update or create store-specific setting
 * Store users can update their own store settings
 */
exports.updateStoreSetting = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { key } = req.params;
    const { value, description } = req.body;
    const storeId = req.user?.storeId;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    // Coerce value/description to strings safely
    const valueString = value !== undefined && value !== null ? String(value).trim() : '';
    const descriptionString = description !== undefined && description !== null ? String(description).trim() : undefined;
    // Use upsert to create if doesn't exist, update if exists
    const setting = await Settings_1.default.findOneAndUpdate({
        storeId: storeId.toLowerCase(),
        key: key.toLowerCase()
    }, {
        storeId: storeId.toLowerCase(),
        key: key.toLowerCase(),
        value: valueString,
        description: descriptionString || undefined,
    }, {
        new: true,
        upsert: true,
        runValidators: true,
    });
    res.status(200).json({
        success: true,
        message: 'Setting updated successfully',
        data: {
            setting,
        },
    });
});
/**
 * Get all store-specific settings
 */
exports.getStoreSettings = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    const settings = await Settings_1.default.find({
        storeId: storeId.toLowerCase()
    }).sort({ key: 1 });
    // Convert array to object for easier access
    const settingsObject = {};
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
});
// Validation middleware for update setting
exports.validateUpdateStoreSetting = [
    (0, express_validator_1.body)('value')
        .optional({ nullable: true, checkFalsy: false })
        .customSanitizer((v) => (v === undefined || v === null ? '' : String(v).trim()))
        .isLength({ min: 0, max: 500 })
        .withMessage('Setting value must be at most 500 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .customSanitizer((v) => (v === undefined || v === null ? undefined : String(v).trim()))
        .isLength({ max: 500 })
        .withMessage('Description must be at most 500 characters'),
];
