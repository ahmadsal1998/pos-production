"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importWarehouses = exports.exportWarehouses = exports.deleteWarehouse = exports.updateWarehouse = exports.getWarehouseById = exports.getWarehouses = exports.createWarehouse = exports.validateUpdateWarehouse = exports.validateCreateWarehouse = void 0;
const express_validator_1 = require("express-validator");
const sync_1 = require("csv-parse/sync");
const error_middleware_1 = require("../middleware/error.middleware");
const warehouseModel_1 = require("../utils/warehouseModel");
const User_1 = __importDefault(require("../models/User"));
const logger_1 = require("../utils/logger");
exports.validateCreateWarehouse = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty()
        .withMessage('Warehouse name is required')
        .isLength({ max: 120 })
        .withMessage('Warehouse name cannot exceed 120 characters'),
    (0, express_validator_1.body)('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('address')
        .optional({ nullable: true })
        .isString()
        .withMessage('Address must be a string')
        .isLength({ max: 500 })
        .withMessage('Address cannot exceed 500 characters'),
    (0, express_validator_1.body)('status')
        .optional({ nullable: true })
        .isIn(['Active', 'Inactive'])
        .withMessage('Status must be either Active or Inactive'),
];
exports.validateUpdateWarehouse = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .notEmpty()
        .withMessage('Warehouse name cannot be empty')
        .isLength({ max: 120 })
        .withMessage('Warehouse name cannot exceed 120 characters'),
    (0, express_validator_1.body)('description')
        .optional({ nullable: true })
        .isString()
        .withMessage('Description must be a string')
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    (0, express_validator_1.body)('address')
        .optional({ nullable: true })
        .isString()
        .withMessage('Address must be a string')
        .isLength({ max: 500 })
        .withMessage('Address cannot exceed 500 characters'),
    (0, express_validator_1.body)('status')
        .optional({ nullable: true })
        .isIn(['Active', 'Inactive'])
        .withMessage('Status must be either Active or Inactive'),
];
exports.createWarehouse = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const { name, description, address, status } = req.body;
    let storeId = req.user?.storeId || null;
    logger_1.log.debug('Create Warehouse - User info from token', {
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
                logger_1.log.debug('Create Warehouse - Found storeId from user record', { storeId });
            }
        }
        catch (error) {
            logger_1.log.error('Create Warehouse - Error fetching user', error);
        }
    }
    // Store users must have a storeId
    if (!storeId) {
        logger_1.log.warn('Create Warehouse - No storeId found for user');
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
        });
    }
    try {
        logger_1.log.debug('Create Warehouse - Getting Warehouse model for storeId', { storeId });
        // Get store-specific Warehouse model
        let Warehouse;
        try {
            Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
            logger_1.log.debug('Create Warehouse - Warehouse model obtained');
        }
        catch (modelError) {
            logger_1.log.error('Create Warehouse - Error getting Warehouse model', {
                message: modelError.message,
                stack: modelError.stack,
                storeId: storeId,
            });
            return res.status(400).json({
                success: false,
                message: modelError.message || 'Failed to access store warehouses. Please ensure your account is associated with a valid store.',
            });
        }
        // Normalize storeId
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Check if warehouse with same name exists for this store
        const existingWarehouse = await Warehouse.findOne({
            storeId: normalizedStoreId,
            name: name.trim(),
        });
        if (existingWarehouse) {
            return res.status(400).json({
                success: false,
                message: 'Warehouse with this name already exists',
            });
        }
        const warehouse = await Warehouse.create({
            storeId: normalizedStoreId,
            name: name.trim(),
            description: description?.trim() || undefined,
            address: address?.trim() || undefined,
            status: status || 'Active',
        });
        logger_1.log.debug('Create Warehouse - Warehouse created successfully', { warehouseId: warehouse._id });
        res.status(201).json({
            success: true,
            message: 'Warehouse created successfully',
            warehouse,
        });
    }
    catch (error) {
        logger_1.log.error('Create Warehouse - Error', {
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
                message: 'Warehouse with this name already exists',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to create warehouse. Please try again.',
        });
    }
});
exports.getWarehouses = (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
        // Normalize storeId
        const normalizedStoreId = storeId.toLowerCase().trim();
        // Get unified Warehouse model
        const Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
        // Get all warehouses for this store
        const warehouses = await Warehouse.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
        // Calculate product count for each warehouse
        // Note: This assumes products have a warehouseId field. If not, productCount will be 0.
        // You may need to adjust this based on your product schema.
        const warehousesWithCounts = await Promise.all(warehouses.map(async (warehouse) => {
            // TODO: Replace with actual product count query when product schema includes warehouseId
            // For now, we'll return 0 as productCount
            const productCount = 0; // Placeholder - implement actual count when product schema is ready
            const warehouseObj = warehouse.toJSON();
            return {
                ...warehouseObj,
                productCount,
            };
        }));
        res.status(200).json({
            success: true,
            message: 'Warehouses retrieved successfully',
            warehouses: warehousesWithCounts,
        });
    }
    catch (error) {
        logger_1.log.error('Error fetching warehouses', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch warehouses. Please try again.',
            warehouses: [],
        });
    }
});
exports.getWarehouseById = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        const Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
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
    }
    catch (error) {
        logger_1.log.error('Error fetching warehouse', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch warehouse. Please try again.',
        });
    }
});
exports.updateWarehouse = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
        // Normalize storeId
        const normalizedStoreId = storeId.toLowerCase().trim();
        const Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
        const warehouse = await Warehouse.findOne({
            _id: id,
            storeId: normalizedStoreId
        });
        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found',
            });
        }
        // Check if name is being changed and if it conflicts with existing warehouse
        if (name && name.trim() !== warehouse.name) {
            const existingWarehouse = await Warehouse.findOne({
                storeId: normalizedStoreId,
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
        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found',
            });
        }
        // Check if name is being changed and if it conflicts with existing warehouse
        if (name && name.trim() !== warehouse.name) {
            const existingWarehouse = await Warehouse.findOne({
                storeId: normalizedStoreId,
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
        if (name !== undefined)
            warehouse.name = name.trim();
        if (description !== undefined)
            warehouse.description = description?.trim() || undefined;
        if (address !== undefined)
            warehouse.address = address?.trim() || undefined;
        if (status !== undefined)
            warehouse.status = status;
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
    }
    catch (error) {
        logger_1.log.error('Error updating warehouse', error);
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
                message: 'Warehouse with this name already exists',
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update warehouse. Please try again.',
        });
    }
});
exports.deleteWarehouse = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId
        const normalizedStoreId = storeId.toLowerCase().trim();
        const Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
        const warehouse = await Warehouse.findOne({
            _id: id,
            storeId: normalizedStoreId
        });
        if (!warehouse) {
            return res.status(404).json({
                success: false,
                message: 'Warehouse not found',
            });
        }
        // TODO: Check if warehouse has products before deleting
        // For now, we'll allow deletion but you may want to add a check:
        // const productCount = await Product.countDocuments({ warehouseId: id, storeId: normalizedStoreId });
        // if (productCount > 0) {
        //   return res.status(400).json({
        //     success: false,
        //     message: `Cannot delete warehouse. It contains ${productCount} product(s).`,
        //   });
        // }
        await Warehouse.deleteOne({ _id: id, storeId: normalizedStoreId });
        res.status(200).json({
            success: true,
            message: 'Warehouse deleted successfully',
        });
    }
    catch (error) {
        logger_1.log.error('Error deleting warehouse', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to delete warehouse. Please try again.',
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
exports.exportWarehouses = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required. Please ensure you are logged in as a store user.',
        });
    }
    try {
        // Normalize storeId
        const normalizedStoreId = storeId.toLowerCase().trim();
        const Warehouse = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
        const warehouses = await Warehouse.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
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
        res.setHeader('Content-Disposition', `attachment; filename="warehouses-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.status(200).send(utf8WithBom);
    }
    catch (error) {
        logger_1.log.error('Error exporting warehouses', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to export warehouses. Please try again.',
        });
    }
});
exports.importWarehouses = (0, error_middleware_1.asyncHandler)(async (req, res) => {
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
    let WarehouseModel;
    try {
        WarehouseModel = await (0, warehouseModel_1.getWarehouseModelForStore)(storeId);
    }
    catch (error) {
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
            const name = getValue(row, 'name', 'warehouse', 'warehouse name', 'اسم المستودع', 'warehousename').trim();
            if (!name) {
                errors.push({ row: index + 1, message: 'Name is required' });
                continue;
            }
            const description = getValue(row, 'description', 'details', 'desc', 'وصف').trim();
            const address = getValue(row, 'address', 'location', 'عنوان').trim();
            const status = getValue(row, 'status', 'state', 'حالة').trim() || 'Active';
            // Normalize storeId
            const normalizedStoreId = storeId.toLowerCase().trim();
            let existing = await WarehouseModel.findOne({
                storeId: normalizedStoreId,
                name
            });
            if (!existing) {
                existing = await WarehouseModel.findOne({
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
                if (address) {
                    existing.address = address;
                }
                if (status === 'Active' || status === 'Inactive') {
                    existing.status = status;
                }
                await existing.save();
                updated += 1;
            }
            else {
                await WarehouseModel.create({
                    storeId: normalizedStoreId,
                    name,
                    description: description || undefined,
                    address: address || undefined,
                    status: status === 'Active' || status === 'Inactive' ? status : 'Active',
                });
                created += 1;
            }
        }
        const normalizedStoreId = storeId.toLowerCase().trim();
        const warehouses = await WarehouseModel.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
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
    }
    catch (error) {
        logger_1.log.error('Error importing warehouses', error);
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
