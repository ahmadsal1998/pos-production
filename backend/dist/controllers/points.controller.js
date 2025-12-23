"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePayWithPoints = exports.validateAddPoints = exports.payWithPoints = exports.getCustomerPointsHistory = exports.getCustomerPoints = exports.addPointsAfterSale = void 0;
const express_validator_1 = require("express-validator");
const error_middleware_1 = require("../middleware/error.middleware");
const PointsTransaction_1 = __importDefault(require("../models/PointsTransaction"));
const PointsBalance_1 = __importDefault(require("../models/PointsBalance"));
const PointsSettings_1 = __importDefault(require("../models/PointsSettings"));
const StorePointsAccount_1 = __importDefault(require("../models/StorePointsAccount"));
const GlobalCustomer_1 = __importDefault(require("../models/GlobalCustomer"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Store_1 = __importDefault(require("../models/Store"));
const logger_1 = require("../utils/logger");
/**
 * Add points to a customer after a sale
 * This is called by stores after completing a sale
 * Points are global and can be redeemed at any store
 */
exports.addPointsAfterSale = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const earningStoreId = req.user?.storeId || null;
    if (!earningStoreId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required',
        });
    }
    const { invoiceNumber, customerId, purchaseAmount, pointsPercentage } = req.body;
    if (!invoiceNumber || !customerId || !purchaseAmount || purchaseAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Invoice number, customer ID, and valid purchase amount are required',
        });
    }
    try {
        // Get store-specific customer
        const customer = await Customer_1.default.findOne({ storeId: earningStoreId, _id: customerId });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found',
            });
        }
        // Get or create global customer
        const globalCustomer = await GlobalCustomer_1.default.getOrCreateGlobalCustomer(earningStoreId, String(customer._id), customer.name, customer.phone, undefined // email not available in Customer model
        );
        // Get points settings (store-specific or global)
        let settings = await PointsSettings_1.default.findOne({ storeId: earningStoreId });
        if (!settings) {
            settings = await PointsSettings_1.default.findOne({ storeId: 'global' });
            if (!settings) {
                // Create default global settings
                settings = await PointsSettings_1.default.create({
                    storeId: 'global',
                    userPointsPercentage: 5,
                    companyProfitPercentage: 2,
                    defaultThreshold: 10000,
                });
            }
        }
        // Use provided percentage or default from settings
        const effectivePercentage = pointsPercentage || settings.userPointsPercentage;
        // Calculate points
        const points = Math.floor((purchaseAmount * effectivePercentage) / 100);
        if (points <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Purchase amount is too small to earn points',
            });
        }
        // Check minimum purchase amount if set
        if (settings.minPurchaseAmount && purchaseAmount < settings.minPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ${settings.minPurchaseAmount} is required to earn points`,
            });
        }
        // Check max points per transaction if set
        const finalPoints = settings.maxPointsPerTransaction
            ? Math.min(points, settings.maxPointsPerTransaction)
            : points;
        // Calculate expiration date if points expiration is enabled
        let expiresAt;
        if (settings.pointsExpirationDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + settings.pointsExpirationDays);
        }
        // Get points value per point (default 0.01 = $0.01 per point)
        const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
        const pointsValue = finalPoints * pointsValuePerPoint;
        // Create transaction
        const transaction = await PointsTransaction_1.default.create({
            globalCustomerId: globalCustomer.globalCustomerId,
            customerName: globalCustomer.name,
            earningStoreId: earningStoreId.toLowerCase(),
            invoiceNumber,
            transactionType: 'earned',
            points: finalPoints,
            purchaseAmount,
            pointsPercentage: effectivePercentage,
            pointsValue,
            description: `Points earned from purchase at ${earningStoreId} (Invoice: ${invoiceNumber})`,
            expiresAt,
        });
        // Update or create global points balance
        const balance = await PointsBalance_1.default.findOneAndUpdate({ globalCustomerId: globalCustomer.globalCustomerId }, {
            $inc: {
                totalPoints: finalPoints,
                availablePoints: finalPoints,
                lifetimeEarned: finalPoints,
            },
            $set: {
                customerName: globalCustomer.name,
                customerPhone: globalCustomer.phone,
                customerEmail: globalCustomer.email,
                lastTransactionDate: new Date(),
            },
            $setOnInsert: {
                globalCustomerId: globalCustomer.globalCustomerId,
                // customerName, customerPhone, customerEmail are in $set (applies to both insert and update)
                // totalPoints, availablePoints, lifetimeEarned are handled by $inc (creates field with increment value if doesn't exist)
                pendingPoints: 0,
                lifetimeSpent: 0,
            },
        }, { upsert: true, new: true });
        // Update store points account (for accounting)
        let storeAccount = await StorePointsAccount_1.default.findOne({ storeId: earningStoreId.toLowerCase() });
        if (storeAccount) {
            storeAccount.totalPointsIssued += finalPoints;
            storeAccount.totalPointsValueIssued += pointsValue;
            storeAccount.recalculate();
            await storeAccount.save();
        }
        else {
            // Create new store points account
            const store = await Store_1.default.findOne({ storeId: earningStoreId.toLowerCase() });
            storeAccount = await StorePointsAccount_1.default.create({
                storeId: earningStoreId.toLowerCase(),
                storeName: store?.name || 'Unknown Store',
                totalPointsIssued: finalPoints,
                totalPointsRedeemed: 0,
                pointsValuePerPoint,
                totalPointsValueIssued: pointsValue,
                totalPointsValueRedeemed: 0,
            });
            storeAccount.recalculate();
            await storeAccount.save();
        }
        res.status(200).json({
            success: true,
            message: 'Points added successfully',
            data: {
                transaction: {
                    id: transaction._id,
                    points: finalPoints,
                    purchaseAmount,
                    pointsPercentage: effectivePercentage,
                    pointsValue,
                },
                balance: {
                    totalPoints: balance.totalPoints,
                    availablePoints: balance.availablePoints,
                },
            },
        });
    }
    catch (error) {
        logger_1.log.error('Error adding points', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to add points',
        });
    }
});
/**
 * Get customer points balance (global, works from any store)
 * Can be called with customerId (store-specific) or globalCustomerId (phone/email)
 */
exports.getCustomerPoints = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Support both query parameters and path parameters
    const customerIdFromPath = req.params.customerId;
    const { customerId, globalCustomerId, phone, email } = req.query;
    // Use path parameter if no query parameter provided
    const effectiveCustomerId = customerId || customerIdFromPath;
    let globalCustomerIdToUse = null;
    try {
        // If globalCustomerId provided, use it directly
        if (globalCustomerId && typeof globalCustomerId === 'string') {
            globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
        }
        // If phone provided, use it as globalCustomerId
        else if (phone && typeof phone === 'string') {
            globalCustomerIdToUse = phone.toLowerCase().trim();
        }
        // If email provided, use it as globalCustomerId
        else if (email && typeof email === 'string') {
            globalCustomerIdToUse = email.toLowerCase().trim();
        }
        // If customerId provided, get global customer
        else if (effectiveCustomerId && typeof effectiveCustomerId === 'string') {
            const userRole = req.user?.role;
            const storeId = req.user?.storeId || null;
            // Admin can access without storeId, but store users need storeId
            if (userRole !== 'Admin' && !storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required when using customerId',
                });
            }
            // For admin, try to find customer in any store; for store users, use their storeId
            const targetStoreId = userRole === 'Admin' ? null : storeId;
            const customerQuery = { _id: effectiveCustomerId };
            if (targetStoreId) {
                customerQuery.storeId = targetStoreId;
            }
            const customer = await Customer_1.default.findOne(customerQuery);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found',
                });
            }
            // Get customer's storeId (from customer record, not from user context)
            const customerStoreId = customer.storeId || targetStoreId || storeId;
            if (!customerStoreId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required for customer lookup',
                });
            }
            // Get or create global customer
            const globalCustomer = await GlobalCustomer_1.default.getOrCreateGlobalCustomer(customerStoreId, String(customer._id), customer.name, customer.phone);
            globalCustomerIdToUse = globalCustomer.globalCustomerId;
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Either customerId, globalCustomerId, phone, or email is required',
            });
        }
        if (!globalCustomerIdToUse) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine global customer ID',
            });
        }
        const balance = await PointsBalance_1.default.findOne({ globalCustomerId: globalCustomerIdToUse });
        // Get points value per point from settings
        const storeId = req.user?.storeId || null;
        let settings = null;
        if (storeId) {
            settings = await PointsSettings_1.default.findOne({ storeId: storeId.toLowerCase() });
        }
        if (!settings) {
            settings = await PointsSettings_1.default.findOne({ storeId: 'global' });
        }
        // If no settings found, use default value
        const pointsValuePerPoint = settings?.pointsValuePerPoint || 0.01;
        if (!balance) {
            return res.status(200).json({
                success: true,
                data: {
                    balance: {
                        globalCustomerId: globalCustomerIdToUse,
                        totalPoints: 0,
                        availablePoints: 0,
                        lifetimeEarned: 0,
                        lifetimeSpent: 0,
                    },
                    pointsValuePerPoint,
                },
            });
        }
        res.status(200).json({
            success: true,
            data: {
                balance: {
                    id: balance._id,
                    globalCustomerId: balance.globalCustomerId,
                    customerName: balance.customerName,
                    totalPoints: balance.totalPoints,
                    availablePoints: balance.availablePoints,
                    lifetimeEarned: balance.lifetimeEarned,
                    lifetimeSpent: balance.lifetimeSpent,
                    lastTransactionDate: balance.lastTransactionDate,
                },
                pointsValuePerPoint,
            },
        });
    }
    catch (error) {
        logger_1.log.error('Error getting customer points', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customer points',
        });
    }
});
/**
 * Get customer points transaction history (global, across all stores)
 */
exports.getCustomerPointsHistory = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    // Support both query parameters and path parameters
    const customerIdFromPath = req.params.customerId;
    const { customerId, globalCustomerId, phone, email } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    // Use path parameter if no query parameter provided
    const effectiveCustomerId = customerId || customerIdFromPath;
    let globalCustomerIdToUse = null;
    try {
        // Determine global customer ID (same logic as getCustomerPoints)
        if (globalCustomerId && typeof globalCustomerId === 'string') {
            globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
        }
        else if (phone && typeof phone === 'string') {
            globalCustomerIdToUse = phone.toLowerCase().trim();
        }
        else if (email && typeof email === 'string') {
            globalCustomerIdToUse = email.toLowerCase().trim();
        }
        else if (effectiveCustomerId && typeof effectiveCustomerId === 'string') {
            const userRole = req.user?.role;
            const storeId = req.user?.storeId || null;
            // Admin can access without storeId, but store users need storeId
            if (userRole !== 'Admin' && !storeId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required when using customerId',
                });
            }
            // For admin, try to find customer in any store; for store users, use their storeId
            const targetStoreId = userRole === 'Admin' ? null : storeId;
            const customerQuery = { _id: effectiveCustomerId };
            if (targetStoreId) {
                customerQuery.storeId = targetStoreId;
            }
            const customer = await Customer_1.default.findOne(customerQuery);
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found',
                });
            }
            // Get customer's storeId (from customer record, not from user context)
            const customerStoreId = customer.storeId || targetStoreId || storeId;
            if (!customerStoreId) {
                return res.status(400).json({
                    success: false,
                    message: 'Store ID is required for customer lookup',
                });
            }
            const globalCustomer = await GlobalCustomer_1.default.getOrCreateGlobalCustomer(customerStoreId, String(customer._id), customer.name, customer.phone);
            globalCustomerIdToUse = globalCustomer.globalCustomerId;
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Either customerId, globalCustomerId, phone, or email is required',
            });
        }
        if (!globalCustomerIdToUse) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine global customer ID',
            });
        }
        const transactions = await PointsTransaction_1.default.find({ globalCustomerId: globalCustomerIdToUse })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        const total = await PointsTransaction_1.default.countDocuments({ globalCustomerId: globalCustomerIdToUse });
        res.status(200).json({
            success: true,
            data: {
                transactions,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            },
        });
    }
    catch (error) {
        logger_1.log.error('Error getting customer points history', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get customer points history',
        });
    }
});
/**
 * Pay with points (deduct points from customer balance)
 * Points can be redeemed at any store, regardless of where they were earned
 */
exports.payWithPoints = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array(),
        });
    }
    const redeemingStoreId = req.user?.storeId || null;
    if (!redeemingStoreId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required',
        });
    }
    const { customerId, globalCustomerId, phone, email, points, invoiceNumber, description } = req.body;
    if (!points || points <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Valid points amount is required',
        });
    }
    try {
        // Determine global customer ID
        let globalCustomerIdToUse = null;
        if (globalCustomerId) {
            globalCustomerIdToUse = globalCustomerId.toLowerCase().trim();
        }
        else if (phone) {
            globalCustomerIdToUse = phone.toLowerCase().trim();
        }
        else if (email) {
            globalCustomerIdToUse = email.toLowerCase().trim();
        }
        else if (customerId) {
            const customer = await Customer_1.default.findOne({ storeId: redeemingStoreId, _id: customerId });
            if (!customer) {
                return res.status(404).json({
                    success: false,
                    message: 'Customer not found',
                });
            }
            const globalCustomer = await GlobalCustomer_1.default.getOrCreateGlobalCustomer(redeemingStoreId, String(customer._id), customer.name, customer.phone);
            globalCustomerIdToUse = globalCustomer.globalCustomerId;
        }
        else {
            return res.status(400).json({
                success: false,
                message: 'Either customerId, globalCustomerId, phone, or email is required',
            });
        }
        if (!globalCustomerIdToUse) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine global customer ID',
            });
        }
        // Get global points balance
        const balance = await PointsBalance_1.default.findOne({ globalCustomerId: globalCustomerIdToUse });
        if (!balance || balance.availablePoints < points) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient points balance',
                data: {
                    availablePoints: balance?.availablePoints || 0,
                    requestedPoints: points,
                },
            });
        }
        // Get points value per point
        const settings = await PointsSettings_1.default.findOne({ storeId: redeemingStoreId }) ||
            await PointsSettings_1.default.findOne({ storeId: 'global' }) ||
            await PointsSettings_1.default.create({ storeId: 'global', userPointsPercentage: 5, companyProfitPercentage: 2, defaultThreshold: 10000 });
        const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
        const pointsValue = points * pointsValuePerPoint;
        // Create transaction
        const transaction = await PointsTransaction_1.default.create({
            globalCustomerId: globalCustomerIdToUse,
            customerName: balance.customerName,
            redeemingStoreId: redeemingStoreId.toLowerCase(),
            invoiceNumber,
            transactionType: 'spent',
            points: -points, // Negative for spent
            pointsValue,
            description: description || `Points used for payment at ${redeemingStoreId}${invoiceNumber ? ` (Invoice: ${invoiceNumber})` : ''}`,
        });
        // Update balance
        balance.totalPoints -= points;
        balance.availablePoints -= points;
        balance.lifetimeSpent += points;
        balance.lastTransactionDate = new Date();
        await balance.save();
        // Update store points account (for accounting)
        let storeAccount = await StorePointsAccount_1.default.findOne({ storeId: redeemingStoreId.toLowerCase() });
        if (storeAccount) {
            storeAccount.totalPointsRedeemed += points;
            storeAccount.totalPointsValueRedeemed += pointsValue;
            storeAccount.recalculate();
            await storeAccount.save();
        }
        else {
            // Create new store points account if it doesn't exist
            const store = await Store_1.default.findOne({ storeId: redeemingStoreId.toLowerCase() });
            storeAccount = await StorePointsAccount_1.default.create({
                storeId: redeemingStoreId.toLowerCase(),
                storeName: store?.name || 'Unknown Store',
                totalPointsIssued: 0,
                totalPointsRedeemed: points,
                pointsValuePerPoint,
                totalPointsValueIssued: 0,
                totalPointsValueRedeemed: pointsValue,
            });
            storeAccount.recalculate();
            await storeAccount.save();
        }
        res.status(200).json({
            success: true,
            message: 'Points deducted successfully',
            data: {
                transaction: {
                    id: transaction._id,
                    points: -points,
                    pointsValue,
                },
                balance: {
                    totalPoints: balance.totalPoints,
                    availablePoints: balance.availablePoints,
                },
            },
        });
    }
    catch (error) {
        logger_1.log.error('Error paying with points', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process points payment',
        });
    }
});
// Validation middleware
exports.validateAddPoints = [
    (0, express_validator_1.body)('invoiceNumber').trim().notEmpty().withMessage('Invoice number is required'),
    (0, express_validator_1.body)('customerId').trim().notEmpty().withMessage('Customer ID is required'),
    (0, express_validator_1.body)('purchaseAmount').isFloat({ min: 0.01 }).withMessage('Purchase amount must be a positive number'),
    (0, express_validator_1.body)('pointsPercentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Points percentage must be between 0 and 100'),
];
exports.validatePayWithPoints = [
    (0, express_validator_1.body)('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
    (0, express_validator_1.body)('customerId').optional().trim(),
    (0, express_validator_1.body)('globalCustomerId').optional().trim(),
    (0, express_validator_1.body)('phone').optional().trim(),
    (0, express_validator_1.body)('email').optional().trim().isEmail().withMessage('Email must be valid'),
    (0, express_validator_1.body)('invoiceNumber').optional().trim(),
    (0, express_validator_1.body)('description').optional().trim(),
];
