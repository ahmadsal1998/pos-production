"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCategories = exports.exportCategories = exports.getCategories = exports.createCategory = exports.validateCreateCategory = void 0;
const express_validator_1 = require("express-validator");
const sync_1 = require("csv-parse/sync");
const error_middleware_1 = require("../middleware/error.middleware");
const Category_1 = __importDefault(require("../models/Category"));
const User_1 = __importDefault(require("../models/User"));
exports.validateCreateCategory = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ max: 120 })
        .withMessage('Category name cannot exceed 120 characters'),
    (0, express_validator_1.body)('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
];
exports.createCategory = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { name, description } = req.body;
    let storeId = req.user?.storeId || null;
    console.log('🔍 Create Category - User info from token:', {
        userId: req.user?.userId,
        email: req.user?.email,
        role: req.user?.role,
        storeId: storeId,
    });
    // If storeId is not in token, try to get it from the user record
    if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
        try {
            const user = await User_1.default.findById(req.user.userId);
            if (user && user.storeId) {
                storeId = user.storeId;
                console.log('✅ Create Category - Found storeId from user record:', storeId);
            }
        }
        catch (error) {
            console.error('❌ Create Category - Error fetching user:', error.message);
        }
    }
    // Store users must have a storeId
    if (!storeId) {
        console.error('❌ Create Category - No storeId found for user');
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Check if category with same name exists for this store
        const existingCategory = await Category_1.default.findOne({
            storeId: normalizedStoreId,
            name: name.trim(),
        });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists',
            });
        }
        const category = await Category_1.default.create({
            storeId: normalizedStoreId,
            name: name.trim(),
            description: description?.trim() || undefined,
        });
        console.log('✅ Create Category - Category created successfully:', category._id);
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category,
        });
    }
    catch (error) {
        console.error('❌ Create Category - Error:', {
            message: error.message,
            stack: error.stack,
            storeId: storeId,
            name: error.name,
            code: error.code,
        });
        // Handle specific mongoose errors
        if (error.name === 'ValidationError') {
            const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
            return res.status(400).json({
                success: false,
                message: errorMessages.join(', ') || 'Validation error',
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Category with this name already exists',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create category. Please try again.',
        });
    }
});
exports.getCategories = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
            categories: [],
        });
    }
    try {
        // Normalize storeId to lowercase for consistency
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Get all categories for this store from unified collection
        const categories = await Category_1.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Categories retrieved successfully',
            categories,
        });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch categories. Please try again.',
            categories: [],
        });
    }
});
const escapeCsvValue = (value) => {
    const stringValue = value ?? '';
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};
const normalizeHeaderKey = (key) => key.replace(/^\uFEFF/, '').trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.exportCategories = (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
        // Get all categories for this store from unified collection
        const categories = await Category_1.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
        const headers = ['name', 'description', 'imageUrl', 'createdAt'];
        const rows = categories.map((category) => [
            escapeCsvValue(category.name),
            escapeCsvValue(category.description ?? ''),
            escapeCsvValue(category.imageUrl ?? ''),
            escapeCsvValue(category.createdAt.toISOString()),
        ]);
        const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
        const utf8WithBom = `\uFEFF${csvContent}`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="categories-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.status(200).send(utf8WithBom);
    }
    catch (error) {
        console.error('Error exporting categories:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to export categories. Please try again.',
        });
    }
});
exports.importCategories = (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
    let records;
    try {
        const sanitizedContent = fileContent.replace(/^\uFEFF/, '');
        records = (0, sync_1.parse)(sanitizedContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid CSV format',
        });
    }
    let created = 0;
    let updated = 0;
    const errors = [];
    // Normalize records first
    const normalizedRecords = records.map((record) => {
        const normalized = {};
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
    const getValue = (row, ...keys) => {
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
            const name = getValue(row, 'name', 'category', 'category name', 'اسم الفئة', 'categoryname').trim();
            if (!name) {
                errors.push({ row: index + 1, message: 'Name is required' });
                continue;
            }
            const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();
            const imageUrl = getValue(row, 'imageurl', 'image url', 'image', 'صورة').trim();
            // Find existing category for this store
            let existing = await Category_1.default.findOne({
                storeId: normalizedStoreId,
                name
            });
            if (!existing) {
                existing = await Category_1.default.findOne({
                    storeId: normalizedStoreId,
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
                if (imageUrl) {
                    existing.imageUrl = imageUrl;
                }
                await existing.save();
                updated += 1;
            }
            else {
                await Category_1.default.create({
                    storeId: normalizedStoreId,
                    name,
                    description: description || undefined,
                    imageUrl: imageUrl || undefined,
                });
                created += 1;
            }
        }
        // Get all categories for this store from unified collection
        const categories = await Category_1.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: 'Categories imported successfully',
            summary: {
                created,
                updated,
                failed: errors.length,
            },
            errors,
            categories,
        });
    }
    catch (error) {
        console.error('Error importing categories:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to import categories. Please try again.',
            summary: {
                created: 0,
                updated: 0,
                failed: normalizedRecords.length,
            },
            errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: 'Import error' })),
            categories: [],
        });
    }
});
