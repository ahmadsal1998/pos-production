"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMerchant = exports.updateMerchant = exports.createMerchant = exports.getMerchant = exports.getMerchants = void 0;
const Merchant_1 = require("../models/Merchant");
const Store_1 = __importDefault(require("../models/Store"));
const logger_1 = require("../utils/logger");
/**
 * Get all merchants
 */
const getMerchants = async (req, res) => {
    try {
        const storeId = req.user?.storeId;
        const query = {};
        // If user has a storeId, filter by store
        if (storeId && req.user?.role !== 'Admin') {
            query.storeId = storeId;
        }
        const merchants = await Merchant_1.Merchant.find(query).sort({ name: 1 });
        res.status(200).json({
            success: true,
            data: { merchants },
        });
    }
    catch (error) {
        logger_1.log.error('Get merchants error', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.getMerchants = getMerchants;
/**
 * Get merchant by ID
 */
const getMerchant = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.user?.storeId;
        const query = { _id: id };
        if (storeId && req.user?.role !== 'Admin') {
            query.storeId = storeId;
        }
        const merchant = await Merchant_1.Merchant.findOne(query);
        if (!merchant) {
            res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
            return;
        }
        // Get terminals from the merchant's store (if merchant has a store)
        let terminals = [];
        if (merchant.storeId) {
            const store = await Store_1.default.findOne({ storeId: merchant.storeId.toLowerCase() });
            if (store && store.terminals && store.terminals.length > 0) {
                terminals = store.terminals.map((term) => ({
                    ...term,
                    storeId: store.storeId,
                    id: term._id?.toString() || '',
                }));
            }
        }
        res.status(200).json({
            success: true,
            data: {
                merchant,
                terminals,
            },
        });
    }
    catch (error) {
        logger_1.log.error('Get merchant error', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.getMerchant = getMerchant;
/**
 * Create new merchant
 */
const createMerchant = async (req, res) => {
    try {
        const { name, merchantId, storeId, description, status } = req.body;
        const userStoreId = req.user?.storeId;
        // Validate required fields
        if (!name || !merchantId) {
            res.status(400).json({
                success: false,
                message: 'Name and Merchant ID (MID) are required',
            });
            return;
        }
        // Non-admin users can only create merchants for their store
        if (req.user?.role !== 'Admin') {
            if (!userStoreId) {
                res.status(403).json({
                    success: false,
                    message: 'Access denied. Store ID is required.',
                });
                return;
            }
            req.body.storeId = userStoreId;
        }
        // Check if merchant ID already exists
        const existingMerchant = await Merchant_1.Merchant.findOne({ merchantId: merchantId.toUpperCase() });
        if (existingMerchant) {
            res.status(400).json({
                success: false,
                message: 'Merchant ID already exists',
            });
            return;
        }
        const merchant = new Merchant_1.Merchant({
            name,
            merchantId: merchantId.toUpperCase(),
            storeId: storeId || userStoreId || null,
            description,
            status: status || 'Active',
        });
        await merchant.save();
        res.status(201).json({
            success: true,
            message: 'Merchant created successfully',
            data: { merchant },
        });
    }
    catch (error) {
        console.error('Create merchant error:', error);
        if (error.code === 11000) {
            res.status(400).json({
                success: false,
                message: 'Merchant ID already exists',
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.createMerchant = createMerchant;
/**
 * Update merchant
 */
const updateMerchant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, merchantId, description, status } = req.body;
        const storeId = req.user?.storeId;
        const query = { _id: id };
        if (storeId && req.user?.role !== 'Admin') {
            query.storeId = storeId;
        }
        const merchant = await Merchant_1.Merchant.findOne(query);
        if (!merchant) {
            res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
            return;
        }
        // Update fields
        if (name)
            merchant.name = name;
        if (merchantId) {
            // Check if new merchant ID already exists (if changed)
            if (merchantId.toUpperCase() !== merchant.merchantId) {
                const existingMerchant = await Merchant_1.Merchant.findOne({ merchantId: merchantId.toUpperCase() });
                if (existingMerchant) {
                    res.status(400).json({
                        success: false,
                        message: 'Merchant ID already exists',
                    });
                    return;
                }
                merchant.merchantId = merchantId.toUpperCase();
            }
        }
        if (description !== undefined)
            merchant.description = description;
        if (status)
            merchant.status = status;
        await merchant.save();
        res.status(200).json({
            success: true,
            message: 'Merchant updated successfully',
            data: { merchant },
        });
    }
    catch (error) {
        console.error('Update merchant error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.updateMerchant = updateMerchant;
/**
 * Delete merchant
 */
const deleteMerchant = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.user?.storeId;
        const query = { _id: id };
        if (storeId && req.user?.role !== 'Admin') {
            query.storeId = storeId;
        }
        const merchant = await Merchant_1.Merchant.findOne(query);
        if (!merchant) {
            res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
            return;
        }
        // Check if merchant's store has terminals (if merchant has a store)
        if (merchant.storeId) {
            const store = await Store_1.default.findOne({ storeId: merchant.storeId.toLowerCase() });
            if (store && store.terminals && store.terminals.length > 0) {
                // Count terminals that use this merchant's MID
                const terminalCount = store.terminals.filter((t) => t.merchantIdMid?.toUpperCase() === merchant.merchantId.toUpperCase()).length;
                if (terminalCount > 0) {
                    res.status(400).json({
                        success: false,
                        message: `Cannot delete merchant. ${terminalCount} terminal(s) in store '${merchant.storeId}' use this merchant's MID.`,
                    });
                    return;
                }
            }
        }
        await merchant.deleteOne();
        res.status(200).json({
            success: true,
            message: 'Merchant deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete merchant error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.deleteMerchant = deleteMerchant;
