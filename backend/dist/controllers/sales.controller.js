"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicInvoice = exports.processReturn = exports.deleteSale = exports.updateSale = exports.getSale = exports.getSalesSummary = exports.getSales = exports.createSale = exports.getNextInvoiceNumber = exports.getCurrentInvoiceNumber = void 0;
const error_middleware_1 = require("../middleware/error.middleware");
const saleModel_1 = require("../utils/saleModel");
const productModel_1 = require("../utils/productModel");
const productCache_1 = require("../utils/productCache");
const Settings_1 = __importDefault(require("../models/Settings"));
const businessDate_1 = require("../utils/businessDate");
const logger_1 = require("../utils/logger");
const Sequence_1 = __importDefault(require("../models/Sequence"));
/**
 * Helper function to get the current max invoice number from existing sales
 * Used to initialize or sync the sequence counter
 */
async function getMaxInvoiceNumberFromSales(Sale, storeId) {
    const normalizedStoreId = storeId.toLowerCase().trim();
    try {
        // Get all invoice numbers for this store
        const sales = await Sale.find({ storeId: normalizedStoreId })
            .select('invoiceNumber')
            .lean()
            .limit(10000); // Reasonable limit to prevent memory issues
        let maxNumber = 0;
        // Extract numeric part from invoice numbers (format: INV-1, INV-2, etc.)
        for (const sale of sales) {
            const invoiceNumber = sale.invoiceNumber || '';
            // Match INV- followed by digits
            const match = invoiceNumber.match(/^INV-(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > maxNumber) {
                    maxNumber = num;
                }
            }
        }
        return maxNumber;
    }
    catch (error) {
        logger_1.log.error('[Sales Controller] Error getting max invoice number from sales', error);
        return 0;
    }
}
/**
 * Helper function to generate the next invoice number atomically
 * Uses MongoDB's atomic findOneAndUpdate to prevent race conditions
 * CRITICAL: Always syncs with actual max invoice number to prevent skipping numbers
 */
async function generateNextInvoiceNumber(Sale, storeId) {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const sequenceType = 'invoiceNumber';
    try {
        // CRITICAL: Always get the actual max invoice number from the database first
        // This ensures we never skip numbers even if the sequence counter is out of sync
        const maxExistingNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
        // Try to get or create sequence
        let sequence = await Sequence_1.default.findOne({
            storeId: normalizedStoreId,
            sequenceType,
        });
        if (!sequence) {
            // Sequence doesn't exist - create it with the max existing number
            sequence = await Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, {
                $setOnInsert: { value: maxExistingNumber } // Set to max existing number
            }, {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            });
            if (!sequence) {
                throw new Error('Failed to create sequence');
            }
        }
        // CRITICAL: Sync sequence with actual max invoice number if it's out of sync
        // If sequence is behind actual invoices, update it
        // If sequence is ahead of actual invoices (due to failed attempts or deletions), sync it down
        if (sequence.value < maxExistingNumber) {
            // Sequence is behind - update it to match actual max
            logger_1.log.warn(`[Sales Controller] Sequence value (${sequence.value}) is behind actual max invoice number (${maxExistingNumber}). Syncing sequence.`);
            sequence = await Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $set: { value: maxExistingNumber } }, { new: true });
            if (!sequence) {
                throw new Error('Failed to sync sequence');
            }
        }
        else if (sequence.value > maxExistingNumber) {
            // Sequence is ahead - sync it down to match actual max
            // This prevents skipping numbers when invoices were deleted or failed
            logger_1.log.warn(`[Sales Controller] Sequence value (${sequence.value}) is ahead of actual max invoice number (${maxExistingNumber}). Syncing sequence down.`);
            sequence = await Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $set: { value: maxExistingNumber } }, { new: true });
            if (!sequence) {
                throw new Error('Failed to sync sequence');
            }
        }
        // Now increment the sequence (which is guaranteed to be in sync with actual invoices)
        sequence = await Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $inc: { value: 1 } }, { new: true });
        if (!sequence) {
            throw new Error('Failed to increment sequence');
        }
        return `INV-${sequence.value}`;
    }
    catch (error) {
        logger_1.log.error('[Sales Controller] Error generating invoice number atomically, falling back to max-based generation', error);
        // Fallback: use max-based generation if sequence fails
        try {
            const maxNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
            const nextNumber = maxNumber + 1;
            // Try to update sequence for next time (don't wait for it)
            Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $set: { value: nextNumber } }, { upsert: true }).catch(() => {
                // Ignore errors in fallback sequence update
            });
            return `INV-${nextNumber}`;
        }
        catch (fallbackError) {
            logger_1.log.error('[Sales Controller] Fallback invoice number generation also failed', fallbackError);
            // Last resort: timestamp-based (should rarely happen)
            const timestamp = Date.now();
            return `INV-${timestamp}`;
        }
    }
}
/**
 * Get the current invoice number without incrementing
 * Used for displaying the current invoice number on page load
 * CRITICAL: Always syncs with actual max invoice number to ensure accuracy
 */
exports.getCurrentInvoiceNumber = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to get invoice number',
        });
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    const normalizedStoreId = storeId.toLowerCase().trim();
    const sequenceType = 'invoiceNumber';
    try {
        // CRITICAL: Always get the actual max invoice number from the database first
        // This ensures we return the correct current invoice number even if sequence is out of sync
        const maxNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
        // Get current sequence value without incrementing
        const sequence = await Sequence_1.default.findOne({
            storeId: normalizedStoreId,
            sequenceType,
        });
        // Sync sequence with actual max if it exists and is out of sync
        if (sequence) {
            if (sequence.value < maxNumber) {
                // Sequence is behind - update it (but don't wait for it)
                Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $set: { value: maxNumber } }).catch(() => {
                    // Ignore errors in background sync
                });
            }
            else if (sequence.value > maxNumber) {
                // Sequence is ahead - sync it down (but don't wait for it)
                Sequence_1.default.findOneAndUpdate({ storeId: normalizedStoreId, sequenceType }, { $set: { value: maxNumber } }).catch(() => {
                    // Ignore errors in background sync
                });
            }
        }
        // Always return based on actual max invoice number, not sequence
        const currentInvoiceNumber = `INV-${maxNumber + 1}`;
        res.status(200).json({
            success: true,
            message: 'Current invoice number retrieved successfully',
            data: {
                invoiceNumber: currentInvoiceNumber,
                number: maxNumber + 1,
            },
        });
    }
    catch (error) {
        logger_1.log.error('[Sales Controller] Error getting current invoice number', error);
        // Fallback: get from existing sales
        try {
            const maxNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
            const currentInvoiceNumber = `INV-${maxNumber + 1}`;
            res.status(200).json({
                success: true,
                message: 'Current invoice number retrieved successfully',
                data: {
                    invoiceNumber: currentInvoiceNumber,
                    number: maxNumber + 1,
                },
            });
        }
        catch (fallbackError) {
            logger_1.log.error('[Sales Controller] Fallback current invoice number retrieval also failed', fallbackError);
            res.status(200).json({
                success: true,
                message: 'Current invoice number retrieved successfully',
                data: {
                    invoiceNumber: 'INV-1',
                    number: 1,
                },
            });
        }
    }
});
/**
 * Get the next sequential invoice number (increments the sequence)
 * Use this only when a sale is actually being completed
 */
exports.getNextInvoiceNumber = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to get invoice number',
        });
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    const nextInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
    // Extract number for response
    const match = nextInvoiceNumber.match(/^INV-(\d+)$/);
    const number = match ? parseInt(match[1], 10) : 1;
    res.status(200).json({
        success: true,
        message: 'Next invoice number retrieved successfully',
        data: {
            invoiceNumber: nextInvoiceNumber,
            number: number,
        },
    });
});
/**
 * Create a new sale/invoice
 */
exports.createSale = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to create a sale',
        });
    }
    const { invoiceNumber, date, customerId, customerName, items, subtotal, totalItemDiscount = 0, invoiceDiscount = 0, tax = 0, total, paidAmount, remainingAmount, paymentMethod, status, seller, isReturn = false, // Flag to indicate if this is a return invoice
     } = req.body;
    // Track the invoice number requested by the client so we can report if it was auto-adjusted
    const requestedInvoiceNumber = invoiceNumber;
    // Validate required fields
    if (!invoiceNumber || !customerName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: invoiceNumber, customerName, and items are required',
        });
    }
    // For return invoices, allow negative values; for regular sales, require positive
    if (isReturn) {
        // Return invoices can have negative totals (they represent refunds)
        if (total === undefined || total === null) {
            return res.status(400).json({
                success: false,
                message: 'Total amount is required',
            });
        }
    }
    else {
        // Regular sales must have positive totals
        if (!total || total < 0) {
            return res.status(400).json({
                success: false,
                message: 'Total amount is required and must be positive',
            });
        }
    }
    // Validate payment method
    const validPaymentMethods = ['cash', 'card', 'credit'];
    const normalizedPaymentMethod = paymentMethod?.toLowerCase();
    if (!normalizedPaymentMethod || !validPaymentMethods.includes(normalizedPaymentMethod)) {
        return res.status(400).json({
            success: false,
            message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`,
        });
    }
    // Determine status if not provided
    let saleStatus = status;
    if (!saleStatus) {
        if (remainingAmount <= 0) {
            saleStatus = 'completed';
        }
        else if (paidAmount > 0) {
            saleStatus = 'partial_payment';
        }
        else {
            saleStatus = 'pending';
        }
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    // Note: Invoice number conflict checking is handled inside the retry loop below
    // This allows proper differentiation between duplicate content vs different content
    // and prevents infinite error loops by providing clear error responses
    // Fetch cost prices for items if not provided
    // This ensures accurate net profit calculation
    const Product = await (0, productModel_1.getProductModelForStore)(storeId);
    const itemsWithCostPrice = await Promise.all(items.map(async (item) => {
        // If costPrice is already provided, use it
        if (item.costPrice !== undefined && item.costPrice !== null) {
            return {
                productId: String(item.productId),
                productName: item.productName || item.name || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || (item.total || 0),
                costPrice: Number(item.costPrice) || 0,
                unit: item.unit || 'قطعة',
                discount: item.discount || 0,
                conversionFactor: item.conversionFactor || 1,
            };
        }
        // Otherwise, fetch from product
        let costPrice = 0;
        try {
            const productId = String(item.productId);
            // Try to find product by _id (ObjectId) or by id field
            const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
            let product = null;
            if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
                product = await Product.findOne({
                    _id: productId,
                    storeId: storeId.toLowerCase(),
                }).select('costPrice').lean();
            }
            if (!product) {
                // Try finding by custom id field
                product = await Product.findOne({
                    id: productId,
                    storeId: storeId.toLowerCase(),
                }).select('costPrice').lean();
            }
            if (product) {
                costPrice = product.costPrice || 0;
            }
        }
        catch (error) {
            logger_1.log.warn(`[Sales Controller] Failed to fetch cost price for product ${item.productId}`, error);
            // Continue with costPrice = 0 if fetch fails
        }
        return {
            productId: String(item.productId),
            productName: item.productName || item.name || '',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice || (item.total || 0),
            costPrice: costPrice,
            unit: item.unit || 'قطعة',
            discount: item.discount || 0,
            conversionFactor: item.conversionFactor || 1,
        };
    }));
    // Normalize storeId
    const normalizedStoreId = storeId.toLowerCase().trim();
    // CRITICAL: Duplicate detection logic
    // IMPORTANT: We ONLY block true duplicates (same invoice number + same content)
    // We do NOT check customer or products separately - same customer can buy same products in different invoices
    // Each invoice with a unique invoice number is allowed, regardless of customer or product content
    // Create sale record with retry logic for duplicate invoice numbers
    let currentInvoiceNumber = invoiceNumber;
    let retryCount = 0;
    const maxRetries = 3;
    let sale = null;
    while (retryCount < maxRetries) {
        try {
            // Check if invoice number already exists for this store (before attempting save)
            const existingSale = await Sale.findOne({
                invoiceNumber: currentInvoiceNumber,
                storeId: normalizedStoreId,
            });
            if (existingSale) {
                // Invoice number already exists - generate a new one and retry
                // Only rule: invoice numbers must be unique
                logger_1.log.warn(`[Sales Controller] Invoice number ${currentInvoiceNumber} already exists. Generating new invoice number.`);
                currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
                retryCount++;
                if (retryCount >= maxRetries) {
                    return res.status(409).json({
                        success: false,
                        message: `تعارض رقم الفاتورة: استمر التعارض بعد ${maxRetries} محاولات. رقم الفاتورة: ${currentInvoiceNumber}`,
                        data: {
                            duplicateInvoiceNumber: existingSale.invoiceNumber,
                            duplicateInvoiceId: existingSale.id,
                            errorType: 'invoice_number_conflict',
                        },
                    });
                }
                continue;
            }
            // Create sale record with current invoice number
            sale = new Sale({
                invoiceNumber: currentInvoiceNumber,
                storeId: normalizedStoreId,
                date: date ? new Date(date) : new Date(),
                customerId: customerId || null,
                customerName,
                items: itemsWithCostPrice,
                subtotal: subtotal || 0,
                totalItemDiscount: totalItemDiscount || 0,
                invoiceDiscount: invoiceDiscount || 0,
                tax: tax || 0,
                total,
                paidAmount: paidAmount || 0,
                remainingAmount: remainingAmount || (total - (paidAmount || 0)),
                paymentMethod: normalizedPaymentMethod,
                status: saleStatus,
                seller: seller || 'Unknown',
            });
            // Attempt to save
            await sale.save();
            // Success - break out of retry loop
            break;
        }
        catch (error) {
            // Check if this is a duplicate key error (E11000)
            if (error.code === 11000) {
                // Duplicate key error - generate new invoice number and retry
                logger_1.log.warn(`[Sales Controller] Duplicate key error for invoice ${currentInvoiceNumber}, generating new number`);
                currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
                retryCount++;
                if (retryCount >= maxRetries) {
                    // Max retries reached
                    throw new Error(`Failed to create sale after ${maxRetries} attempts: Unable to generate unique invoice number`);
                }
                // Continue to retry
                continue;
            }
            else {
                // Different error - rethrow
                throw error;
            }
        }
    }
    if (!sale) {
        throw new Error('Failed to create sale: Unable to save after retries');
    }
    // Return response
    res.status(201).json({
        success: true,
        message: 'Sale created successfully',
        data: {
            sale: {
                id: sale.id,
                invoiceNumber: sale.invoiceNumber,
                date: sale.date,
                customerName: sale.customerName,
                customerId: sale.customerId,
                total: sale.total,
                paidAmount: sale.paidAmount,
                remainingAmount: sale.remainingAmount,
                paymentMethod: sale.paymentMethod,
                status: sale.status,
                seller: sale.seller,
                items: sale.items,
                subtotal: sale.subtotal,
                totalItemDiscount: sale.totalItemDiscount,
                invoiceDiscount: sale.invoiceDiscount,
                tax: sale.tax,
            },
            meta: {
                requestedInvoiceNumber,
                finalInvoiceNumber: sale.invoiceNumber,
                invoiceAutoAdjusted: sale.invoiceNumber !== requestedInvoiceNumber,
            },
        },
    });
});
/**
 * Get all sales with optional filters
 */
exports.getSales = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userStoreId = req.user?.storeId || null;
    const userRole = req.user?.role || null;
    const { startDate, endDate, customerId, status, paymentMethod, seller, storeId: queryStoreId, page = 1, limit = 100 } = req.query;
    // Determine which storeId to use
    let targetStoreId = null;
    // Admin users can query any store via storeId query parameter, or all stores if not specified
    if (userRole === 'Admin') {
        if (queryStoreId) {
            targetStoreId = queryStoreId.toLowerCase().trim();
        }
        // If no storeId in query, admin can see all stores (no storeId filter)
    }
    else {
        // Non-admin users must have a storeId and can only query their own store
        if (!userStoreId) {
            return res.status(400).json({
                success: false,
                message: 'Store ID is required to access sales',
            });
        }
        targetStoreId = userStoreId.toLowerCase().trim();
    }
    // Get unified Sale model (all stores use same collection)
    // Use user's storeId or targetStoreId for model access (model is unified, but we validate store exists)
    let modelStoreId = userStoreId || targetStoreId;
    if (!modelStoreId) {
        // For admin querying all stores, we still need a storeId to get the model
        // Use the first available store or a default
        const Store = (await Promise.resolve().then(() => __importStar(require('../models/Store')))).default;
        const firstStore = await Store.findOne().lean();
        if (!firstStore) {
            return res.status(400).json({
                success: false,
                message: 'No stores available',
            });
        }
        modelStoreId = firstStore.storeId || firstStore.prefix;
    }
    // Get the unified Sale model (all stores use the same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(modelStoreId);
    // Build query - filter by storeId if specified (for non-admin or admin with storeId filter)
    let query = {};
    if (targetStoreId) {
        query.storeId = targetStoreId;
    }
    if (customerId) {
        query.customerId = customerId;
    }
    if (status) {
        query.status = status;
    }
    if (paymentMethod) {
        let paymentMethodStr;
        if (typeof paymentMethod === 'string') {
            paymentMethodStr = paymentMethod;
        }
        else if (Array.isArray(paymentMethod) && paymentMethod.length > 0) {
            paymentMethodStr = String(paymentMethod[0]);
        }
        else {
            paymentMethodStr = String(paymentMethod);
        }
        query.paymentMethod = paymentMethodStr.toLowerCase();
    }
    if (seller && seller !== 'all') {
        query.seller = seller;
    }
    // Get business day start time and timezone settings for date filtering
    // Use modelStoreId (which is always available) to retrieve settings
    // This ensures settings are retrieved even for admin queries without a specific storeId
    let businessDayStartTime;
    let businessDayTimezone;
    // Determine which storeId to use for settings retrieval
    const settingsStoreId = targetStoreId || modelStoreId;
    if (settingsStoreId) {
        const [businessDaySetting, timezoneSetting] = await Promise.all([
            Settings_1.default.findOne({
                storeId: settingsStoreId,
                key: 'businessdaystarttime'
            }),
            Settings_1.default.findOne({
                storeId: settingsStoreId,
                key: 'businessdaytimezone'
            })
        ]);
        if (businessDaySetting && businessDaySetting.value) {
            businessDayStartTime = businessDaySetting.value;
        }
        if (timezoneSetting && timezoneSetting.value) {
            businessDayTimezone = timezoneSetting.value;
        }
    }
    // Track if we're using date filtering and if we should try fallback
    let usingDateFilter = false;
    let businessDateQuery = null;
    if (startDate || endDate) {
        usingDateFilter = true;
        // Use business date filtering instead of calendar date filtering
        // This now uses timezone-aware calculations to properly handle business days
        const { start, end } = (0, businessDate_1.getBusinessDateFilterRange)(startDate, endDate, businessDayStartTime, businessDayTimezone);
        // Store the business date query for potential fallback
        businessDateQuery = { ...query };
        businessDateQuery.date = {};
        if (start) {
            businessDateQuery.date.$gte = start;
        }
        if (end) {
            businessDateQuery.date.$lte = end;
        }
        query.date = businessDateQuery.date;
    }
    // Calculate pagination
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 100;
    const skip = (pageNum - 1) * limitNum;
    // Execute query with business date filtering
    // Sort by date descending (most recent first)
    let [sales, total] = await Promise.all([
        Sale.find(query)
            .sort({ date: -1 }) // Sort by date descending (most recent first)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Sale.countDocuments(query),
    ]);
    // If business date filtering returned 0 results but we have date filters,
    // try simple calendar date filtering as a fallback
    if (usingDateFilter && total === 0 && (startDate || endDate)) {
        // Build calendar query preserving all other filters (storeId, customerId, status, etc.)
        const calendarQuery = {};
        // Copy all non-date filters from the original query
        Object.keys(query).forEach(key => {
            if (key !== 'date') {
                calendarQuery[key] = query[key];
            }
        });
        // Apply simple calendar date filtering
        calendarQuery.date = {};
        if (startDate) {
            const startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            calendarQuery.date.$gte = startDateObj;
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);
            calendarQuery.date.$lte = endDateObj;
        }
        // Retry query with calendar date filtering
        const [calendarSales, calendarTotal] = await Promise.all([
            Sale.find(calendarQuery)
                .sort({ date: -1 }) // Sort by date descending (most recent first)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Sale.countDocuments(calendarQuery),
        ]);
        if (calendarTotal > 0) {
            logger_1.log.warn('[Sales Controller] Business date filtering returned 0 results, using calendar date filtering fallback');
            sales = calendarSales;
            total = calendarTotal;
            query = calendarQuery; // Update query for consistency
        }
    }
    res.status(200).json({
        success: true,
        message: 'Sales retrieved successfully',
        data: {
            sales,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(total / limitNum),
                totalSales: total,
                limit: limitNum,
                hasNextPage: pageNum * limitNum < total,
                hasPreviousPage: pageNum > 1,
            },
        },
    });
});
/**
 * Get sales summary/statistics (fast aggregation query)
 * Returns summary metrics without loading all sales data
 */
exports.getSalesSummary = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userStoreId = req.user?.storeId || null;
    const userRole = req.user?.role || null;
    const { startDate, endDate, customerId, status, paymentMethod, storeId: queryStoreId } = req.query;
    // Determine which storeId to use
    let targetStoreId = null;
    if (userRole === 'Admin') {
        if (queryStoreId) {
            targetStoreId = queryStoreId.toLowerCase().trim();
        }
    }
    else {
        if (!userStoreId) {
            return res.status(400).json({
                success: false,
                message: 'Store ID is required to access sales',
            });
        }
        targetStoreId = userStoreId.toLowerCase().trim();
    }
    // Get unified Sale model
    let modelStoreId = userStoreId || targetStoreId;
    if (!modelStoreId) {
        const Store = (await Promise.resolve().then(() => __importStar(require('../models/Store')))).default;
        const firstStore = await Store.findOne().lean();
        if (!firstStore) {
            return res.status(400).json({
                success: false,
                message: 'No stores available',
            });
        }
        modelStoreId = firstStore.storeId || firstStore.prefix;
    }
    const Sale = await (0, saleModel_1.getSaleModelForStore)(modelStoreId);
    // Build query (same as getSales but without pagination)
    const query = {};
    if (targetStoreId) {
        query.storeId = targetStoreId;
    }
    if (customerId) {
        // Validate customerId is not 'all' or empty string
        const customerIdStr = String(customerId).trim();
        if (customerIdStr && customerIdStr !== 'all' && customerIdStr !== '') {
            query.customerId = customerIdStr;
        }
    }
    if (status) {
        query.status = status;
    }
    if (paymentMethod) {
        let paymentMethodStr;
        if (typeof paymentMethod === 'string') {
            paymentMethodStr = paymentMethod;
        }
        else if (Array.isArray(paymentMethod) && paymentMethod.length > 0) {
            paymentMethodStr = String(paymentMethod[0]);
        }
        else {
            paymentMethodStr = String(paymentMethod);
        }
        query.paymentMethod = paymentMethodStr.toLowerCase();
    }
    // Get business day start time and timezone settings for date filtering
    let businessDayStartTime;
    let businessDayTimezone;
    const settingsStoreId = targetStoreId || modelStoreId;
    if (settingsStoreId) {
        const [businessDaySetting, timezoneSetting] = await Promise.all([
            Settings_1.default.findOne({
                storeId: settingsStoreId,
                key: 'businessdaystarttime'
            }),
            Settings_1.default.findOne({
                storeId: settingsStoreId,
                key: 'businessdaytimezone'
            })
        ]);
        if (businessDaySetting && businessDaySetting.value) {
            businessDayStartTime = businessDaySetting.value;
        }
        if (timezoneSetting && timezoneSetting.value) {
            businessDayTimezone = timezoneSetting.value;
        }
    }
    if (startDate || endDate) {
        const { start, end } = (0, businessDate_1.getBusinessDateFilterRange)(startDate, endDate, businessDayStartTime, businessDayTimezone);
        query.date = {};
        if (start) {
            query.date.$gte = start;
        }
        if (end) {
            query.date.$lte = end;
        }
    }
    // Sanitize query to prevent CastErrors - ensure all values are in correct format
    const sanitizedQuery = {};
    if (query.storeId) {
        sanitizedQuery.storeId = String(query.storeId).toLowerCase().trim();
    }
    if (query.customerId) {
        sanitizedQuery.customerId = String(query.customerId).trim();
    }
    if (query.status) {
        sanitizedQuery.status = String(query.status).trim();
    }
    if (query.paymentMethod) {
        sanitizedQuery.paymentMethod = String(query.paymentMethod).toLowerCase().trim();
    }
    if (query.date) {
        // Ensure date range is valid
        if (query.date.$gte && query.date.$gte instanceof Date) {
            sanitizedQuery.date = { ...query.date };
        }
        else if (query.date.$gte || query.date.$lte) {
            sanitizedQuery.date = {};
            if (query.date.$gte) {
                sanitizedQuery.date.$gte = query.date.$gte instanceof Date ? query.date.$gte : new Date(query.date.$gte);
            }
            if (query.date.$lte) {
                sanitizedQuery.date.$lte = query.date.$lte instanceof Date ? query.date.$lte : new Date(query.date.$lte);
            }
        }
    }
    // Use MongoDB aggregation for fast summary calculation
    const summaryPipeline = [
        { $match: sanitizedQuery },
        {
            $group: {
                _id: null,
                totalSales: { $sum: '$total' },
                totalPayments: { $sum: '$paidAmount' },
                invoiceCount: { $sum: 1 },
                creditSales: {
                    $sum: {
                        $cond: [{ $eq: ['$paymentMethod', 'credit'] }, '$total', 0]
                    }
                },
            }
        }
    ];
    let summaryResult = [];
    try {
        summaryResult = await Sale.aggregate(summaryPipeline);
    }
    catch (aggregationError) {
        logger_1.log.error('[Sales Controller] Error in aggregation pipeline', aggregationError, {
            query: sanitizedQuery,
            originalQuery: query,
        });
        // If aggregation fails, return empty summary instead of failing the request
        summaryResult = [];
    }
    const summary = summaryResult[0] || {
        totalSales: 0,
        totalPayments: 0,
        invoiceCount: 0,
        creditSales: 0,
    };
    // Calculate net profit: totalSales - totalCost
    // Use efficient aggregation with product lookup
    // If calculation fails, return 0 without failing the entire request
    let netProfit = 0;
    try {
        const Product = await (0, productModel_1.getProductModelForStore)(modelStoreId);
        // First, get all unique product IDs from sales items (efficient)
        // Use sanitizedQuery to ensure consistency and prevent CastErrors
        const productIdsPipeline = [
            { $match: sanitizedQuery },
            { $unwind: '$items' },
            { $group: { _id: '$items.productId' } }
        ];
        const productIdsResult = await Sale.aggregate(productIdsPipeline);
        // Handle both ObjectId and string productIds
        const productIds = productIdsResult
            .map((p) => p._id)
            .filter(Boolean)
            .map((id) => {
            // Convert ObjectId to string if needed
            return id.toString ? id.toString() : String(id);
        });
        if (productIds.length > 0) {
            // Import mongoose for ObjectId conversion
            const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
            // Safely convert string IDs to ObjectIds for query (only valid ObjectIds)
            const objectIdProductIds = [];
            const stringProductIds = [];
            productIds.forEach((id) => {
                if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
                    try {
                        objectIdProductIds.push(new mongoose.Types.ObjectId(id));
                    }
                    catch (e) {
                        // If ObjectId creation fails, treat as string
                        stringProductIds.push(id);
                    }
                }
                else {
                    // Not a valid ObjectId format, treat as string
                    stringProductIds.push(id);
                }
            });
            // Build query conditions - handle both ObjectId and string/number IDs
            const queryConditions = [];
            if (objectIdProductIds.length > 0) {
                queryConditions.push({ _id: { $in: objectIdProductIds } });
            }
            if (stringProductIds.length > 0) {
                // For non-ObjectId IDs, try to find by custom 'id' field if it exists
                // Don't query _id with strings as it will cause CastError
                queryConditions.push({ id: { $in: stringProductIds } });
            }
            // Fetch products in batch (fast)
            // If no valid conditions, skip product lookup (net profit will be 0)
            let products = [];
            if (queryConditions.length > 0) {
                try {
                    // Additional validation: ensure all ObjectIds are valid before querying
                    const validObjectIdConditions = objectIdProductIds.filter((oid) => {
                        try {
                            return oid && oid.toString && oid.toString().length === 24;
                        }
                        catch {
                            return false;
                        }
                    });
                    const finalQueryConditions = [];
                    if (validObjectIdConditions.length > 0) {
                        finalQueryConditions.push({ _id: { $in: validObjectIdConditions } });
                    }
                    if (stringProductIds.length > 0) {
                        finalQueryConditions.push({ id: { $in: stringProductIds } });
                    }
                    if (finalQueryConditions.length > 0) {
                        products = await Product.find({
                            storeId: (targetStoreId || modelStoreId).toLowerCase(),
                            $or: finalQueryConditions
                        }).select('_id id costPrice').lean();
                    }
                }
                catch (queryError) {
                    logger_1.log.error('[Sales Controller] Error querying products for net profit', queryError, {
                        queryConditions,
                        stack: queryError.stack
                    });
                    // If query fails, products array stays empty, net profit will be 0
                }
            }
            // Create cost price map for fast lookup (support both ObjectId and string keys)
            // Store multiple ID variants for each product to ensure matching
            const costPriceMap = new Map();
            products.forEach((p) => {
                const costPrice = p.costPrice || 0;
                const idObj = p._id || p.id;
                if (idObj) {
                    // Store multiple ID format variants for flexible matching
                    const idStr = idObj.toString ? idObj.toString() : String(idObj);
                    costPriceMap.set(idStr, costPrice);
                    // Also store as ObjectId string if it's an ObjectId
                    if (idObj.toString && idObj.toString().length === 24) {
                        costPriceMap.set(idObj.toString(), costPrice);
                    }
                    // Store numeric version if applicable
                    if (typeof idObj === 'number' || !isNaN(Number(idStr))) {
                        costPriceMap.set(String(Number(idStr)), costPrice);
                    }
                }
            });
            // Calculate total cost in memory (simpler and efficient)
            // Use sanitizedQuery to ensure consistency and prevent CastErrors
            // Note: We need to select 'total' field to detect returns by sign
            const salesWithItems = await Sale.find(sanitizedQuery).select('items isReturn total').lean();
            let totalCost = 0;
            salesWithItems.forEach((sale) => {
                // Detect return by checking isReturn flag OR by negative total
                // This ensures we catch returns even if isReturn flag is missing
                const saleIsReturn = sale.isReturn || (sale.total && sale.total < 0);
                if (sale.items && Array.isArray(sale.items)) {
                    sale.items.forEach((item) => {
                        // Use actual quantity (negative for returns, positive for sales)
                        // This ensures correct cost calculation for returns
                        const quantity = item.quantity || 0;
                        const absQuantity = Math.abs(quantity);
                        // Detect return at item level: sale is return OR quantity is negative
                        // This provides multiple layers of detection for accuracy
                        const isReturn = saleIsReturn || quantity < 0;
                        // First, try to use costPrice stored in the sale item (fastest and most accurate)
                        if (item.costPrice !== undefined && item.costPrice !== null) {
                            const itemCost = (item.costPrice || 0) * absQuantity;
                            // For returns, subtract cost (we're getting the cost back, so it reduces our cost)
                            // For sales, add cost (we're spending the cost, so it increases our cost)
                            totalCost += isReturn ? -itemCost : itemCost;
                            return;
                        }
                        // Fallback: Look up cost price from product map (for backward compatibility with old sales)
                        const itemProductId = item.productId;
                        if (!itemProductId)
                            return;
                        // Try multiple ID formats for matching
                        const productIdVariants = [
                            String(itemProductId),
                            itemProductId.toString ? itemProductId.toString() : String(itemProductId),
                            typeof itemProductId === 'number' ? String(itemProductId) : null
                        ].filter(Boolean);
                        // Find matching cost price from map
                        let costPrice = 0;
                        for (const variant of productIdVariants) {
                            if (costPriceMap.has(variant)) {
                                costPrice = costPriceMap.get(variant);
                                break;
                            }
                        }
                        const itemCost = costPrice * absQuantity;
                        // For returns, subtract cost (we're getting the cost back, so it reduces our cost)
                        // For sales, add cost (we're spending the cost, so it increases our cost)
                        totalCost += isReturn ? -itemCost : itemCost;
                    });
                }
            });
            // Net profit = Total Sales (which includes negative returns) - Total Cost (which includes negative returns)
            // This formula correctly handles both sales and returns
            netProfit = (summary.totalSales || 0) - totalCost;
        }
    }
    catch (error) {
        logger_1.log.error('[Sales Controller] Error calculating net profit', error);
        // If net profit calculation fails, set to 0 (don't fail the whole request)
        // This ensures summary still returns successfully even if net profit can't be calculated
        netProfit = 0;
    }
    res.status(200).json({
        success: true,
        message: 'Sales summary retrieved successfully',
        data: {
            totalSales: summary.totalSales || 0,
            totalPayments: summary.totalPayments || 0,
            invoiceCount: summary.invoiceCount || 0,
            creditSales: summary.creditSales || 0,
            remainingAmount: (summary.totalSales || 0) - (summary.totalPayments || 0),
            netProfit: netProfit,
        },
    });
});
/**
 * Get a single sale by ID
 */
exports.getSale = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
    const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
    }
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to access sales',
        });
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    // Find sale by ID and ensure it belongs to the user's store
    const sale = await Sale.findOne({
        _id: id,
        storeId: storeId.toLowerCase().trim(),
    });
    if (!sale) {
        return res.status(404).json({
            success: false,
            message: 'Sale not found',
        });
    }
    res.status(200).json({
        success: true,
        data: { sale },
    });
});
/**
 * Update a sale
 */
exports.updateSale = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
    const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
    }
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to update sales',
        });
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    // Find sale by ID and ensure it belongs to the user's store
    const sale = await Sale.findOne({
        _id: id,
        storeId: storeId.toLowerCase().trim(),
    });
    if (!sale) {
        return res.status(404).json({
            success: false,
            message: 'Sale not found',
        });
    }
    // Update allowed fields
    const allowedUpdates = [
        'paidAmount',
        'remainingAmount',
        'status',
        'paymentMethod',
    ];
    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
            sale[field] = req.body[field];
        }
    });
    await sale.save();
    res.status(200).json({
        success: true,
        message: 'Sale updated successfully',
        data: { sale },
    });
});
/**
 * Delete a sale
 */
exports.deleteSale = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
    const mongoose = (await Promise.resolve().then(() => __importStar(require('mongoose')))).default;
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format',
        });
    }
    // Store users must have a storeId
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to delete sales',
        });
    }
    // Get unified Sale model (all stores use same collection)
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    // Find and delete sale by ID, ensuring it belongs to the user's store
    const sale = await Sale.findOneAndDelete({
        _id: id,
        storeId: storeId.toLowerCase().trim(),
    });
    if (!sale) {
        return res.status(404).json({
            success: false,
            message: 'Sale not found',
        });
    }
    res.status(200).json({
        success: true,
        message: 'Sale deleted successfully',
    });
});
/**
 * Process a return transaction
 * This endpoint:
 * 1. Increases product stock by returned quantities
 * 2. Creates a new "Returns" invoice containing the returned items (does NOT modify original invoice)
 * 3. Links the return invoice to the original invoice (optional)
 */
exports.processReturn = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const storeId = req.user?.storeId || null;
    if (!storeId) {
        return res.status(400).json({
            success: false,
            message: 'Store ID is required to process returns',
        });
    }
    const { originalInvoiceId, // Optional - for linking purposes
    returnItems, // Array of items being returned: { productId, quantity, unitPrice, etc. }
    reason, refundMethod = 'cash', seller, customerName, // Customer name from frontend
    customerId, // Customer ID from frontend
     } = req.body;
    // Validate required fields
    if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Missing required fields: returnItems are required',
        });
    }
    // Get models
    const Sale = await (0, saleModel_1.getSaleModelForStore)(storeId);
    const Product = await (0, productModel_1.getProductModelForStore)(storeId);
    // Find the original invoice if provided (for validation and linking)
    let originalInvoice = null;
    if (originalInvoiceId) {
        originalInvoice = await Sale.findOne({
            _id: originalInvoiceId,
            storeId: storeId.toLowerCase().trim(),
        });
        if (!originalInvoice) {
            return res.status(404).json({
                success: false,
                message: 'Original invoice not found',
            });
        }
    }
    // Validate refund method
    const validRefundMethods = ['cash', 'card', 'credit'];
    const normalizedRefundMethod = refundMethod?.toLowerCase();
    if (!normalizedRefundMethod || !validRefundMethods.includes(normalizedRefundMethod)) {
        return res.status(400).json({
            success: false,
            message: `Refund method must be one of: ${validRefundMethods.join(', ')}`,
        });
    }
    // Process return items: update stock
    const stockUpdates = [];
    const processedReturnItems = [];
    for (const returnItem of returnItems) {
        const { productId, quantity: returnQuantity } = returnItem;
        if (!productId || !returnQuantity || returnQuantity <= 0) {
            stockUpdates.push({
                productId: productId || 'unknown',
                quantity: returnQuantity || 0,
                success: false,
                error: 'Invalid return item: productId and quantity are required',
            });
            continue;
        }
        // If original invoice is provided, validate the return item exists in it
        if (originalInvoice) {
            const originalItem = originalInvoice.items.find(item => String(item.productId) === String(productId));
            if (!originalItem) {
                stockUpdates.push({
                    productId,
                    quantity: returnQuantity,
                    success: false,
                    error: 'Product not found in original invoice',
                });
                continue;
            }
            // Validate return quantity doesn't exceed original quantity
            if (returnQuantity > originalItem.quantity) {
                stockUpdates.push({
                    productId,
                    quantity: returnQuantity,
                    success: false,
                    error: `Return quantity (${returnQuantity}) exceeds original quantity (${originalItem.quantity})`,
                });
                continue;
            }
        }
        // Update stock - increase by return quantity
        try {
            const product = await Product.findById(productId);
            if (!product) {
                stockUpdates.push({
                    productId,
                    quantity: returnQuantity,
                    success: false,
                    error: 'Product not found in database',
                });
                continue;
            }
            // Get conversion factor from return item or original invoice item
            let conversionFactor = returnItem.conversionFactor || 1;
            if (originalInvoice) {
                const originalItem = originalInvoice.items.find(item => String(item.productId) === String(productId));
                if (originalItem?.conversionFactor) {
                    conversionFactor = originalItem.conversionFactor;
                }
            }
            // Calculate stock increase considering conversion factors
            let stockIncrease = returnQuantity;
            if (conversionFactor > 1) {
                // If returning in sub-units, convert to base units
                stockIncrease = Math.ceil(returnQuantity / conversionFactor);
            }
            const currentStock = product.stock || 0;
            const newStock = currentStock + stockIncrease;
            const updatedProduct = await Product.findByIdAndUpdate(productId, { stock: newStock }, { new: true });
            // Invalidate product cache to ensure POS shows updated quantity
            if (updatedProduct && storeId) {
                await (0, productCache_1.invalidateAllProductBarcodeCaches)(storeId, updatedProduct);
            }
            stockUpdates.push({
                productId,
                quantity: returnQuantity,
                success: true,
            });
            // Prepare return item for the return invoice
            // Use prices from return item if provided, otherwise from original invoice
            let unitPrice = returnItem.unitPrice;
            let discount = returnItem.discount || 0;
            let productName = returnItem.productName || product.name;
            let unit = returnItem.unit || 'قطعة';
            if (originalInvoice) {
                const originalItem = originalInvoice.items.find(item => String(item.productId) === String(productId));
                if (originalItem) {
                    unitPrice = unitPrice || originalItem.unitPrice;
                    discount = discount || originalItem.discount || 0;
                    productName = productName || originalItem.productName;
                    unit = unit || originalItem.unit || 'قطعة';
                }
            }
            processedReturnItems.push({
                productId: String(productId),
                productName: productName,
                quantity: returnQuantity,
                unitPrice: unitPrice || 0,
                totalPrice: (unitPrice - discount) * returnQuantity,
                unit: unit,
                discount: discount,
                conversionFactor: conversionFactor,
            });
        }
        catch (error) {
            logger_1.log.error(`Error updating stock for product ${productId}`, error);
            stockUpdates.push({
                productId,
                quantity: returnQuantity,
                success: false,
                error: error.message || 'Failed to update stock',
            });
        }
    }
    // Check if all stock updates succeeded
    const failedStockUpdates = stockUpdates.filter(update => !update.success);
    if (failedStockUpdates.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Some stock updates failed',
            errors: failedStockUpdates,
        });
    }
    // Check if we have any processed return items
    if (processedReturnItems.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid return items to process',
        });
    }
    // Calculate return invoice totals (will be made negative)
    const returnSubtotal = processedReturnItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const returnTotalItemDiscount = processedReturnItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
    // Calculate tax rate (use from original invoice if available, otherwise 0)
    let taxRate = 0;
    if (originalInvoice && originalInvoice.tax > 0 && originalInvoice.subtotal > 0) {
        const originalTaxableAmount = originalInvoice.subtotal - (originalInvoice.invoiceDiscount || 0);
        if (originalTaxableAmount > 0) {
            taxRate = originalInvoice.tax / originalTaxableAmount;
        }
    }
    const returnTaxableAmount = returnSubtotal;
    const returnTax = returnTaxableAmount * taxRate;
    const returnTotal = returnTaxableAmount + returnTax;
    // Determine customer info: use from request, then original invoice, then default
    const finalCustomerName = customerName || originalInvoice?.customerName || 'عميل نقدي';
    const finalCustomerId = customerId || originalInvoice?.customerId || null;
    // Get next sequential invoice number for return (using same format as regular invoices)
    // Use the helper function to ensure consistency and prevent duplicates
    const returnInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
    const returnSale = new Sale({
        invoiceNumber: returnInvoiceNumber,
        storeId: storeId,
        date: new Date(),
        customerId: finalCustomerId,
        customerName: finalCustomerName,
        items: processedReturnItems.map(item => ({
            ...item,
            totalPrice: -item.totalPrice, // Make item totals negative
        })),
        subtotal: -returnSubtotal, // Negative for returns
        totalItemDiscount: -returnTotalItemDiscount, // Negative for returns
        invoiceDiscount: 0,
        tax: -returnTax, // Negative for returns
        total: -returnTotal, // Negative for returns
        paidAmount: -returnTotal, // Negative (refund amount)
        remainingAmount: 0,
        paymentMethod: normalizedRefundMethod,
        status: 'completed',
        seller: seller || originalInvoice?.seller || 'System',
        originalInvoiceId: originalInvoiceId || null, // Optional link to original invoice
        isReturn: true,
    });
    await returnSale.save();
    res.status(201).json({
        success: true,
        message: 'Return processed successfully',
        data: {
            returnInvoice: {
                id: returnSale.id,
                invoiceNumber: returnSale.invoiceNumber,
                invoiceName: 'Returns',
                originalInvoiceId: originalInvoiceId || null,
                date: returnSale.date,
                customerName: returnSale.customerName,
                customerId: returnSale.customerId,
                total: returnSale.total,
                items: returnSale.items,
                subtotal: returnSale.subtotal,
                totalItemDiscount: returnSale.totalItemDiscount,
                invoiceDiscount: returnSale.invoiceDiscount,
                tax: returnSale.tax,
                paidAmount: returnSale.paidAmount,
            },
            stockUpdates,
        },
    });
});
/**
 * Public endpoint to get invoice by invoice number (no authentication required)
 * Used for QR code invoice viewing
 */
exports.getPublicInvoice = (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { invoiceNumber, storeId } = req.query;
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Invoice number is required',
        });
    }
    try {
        // Normalize invoice number (trim whitespace)
        const normalizedInvoiceNumber = invoiceNumber.trim();
        let Sale;
        // If storeId is provided, use it to get the model
        if (storeId && typeof storeId === 'string') {
            Sale = await (0, saleModel_1.getSaleModelForStore)(storeId.toLowerCase().trim());
        }
        else {
            // Otherwise, get model from first available store
            const Store = (await Promise.resolve().then(() => __importStar(require('../models/Store')))).default;
            const firstStore = await Store.findOne().lean();
            if (!firstStore) {
                return res.status(400).json({
                    success: false,
                    message: 'No stores available',
                });
            }
            const modelStoreId = firstStore.storeId || firstStore.prefix;
            Sale = await (0, saleModel_1.getSaleModelForStore)(modelStoreId);
        }
        // Build query with normalized invoice number
        const query = { invoiceNumber: normalizedInvoiceNumber };
        if (storeId && typeof storeId === 'string') {
            query.storeId = storeId.toLowerCase().trim();
        }
        logger_1.log.debug('[getPublicInvoice] Searching for invoice:', { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });
        // Find invoice by invoice number
        const sale = await Sale.findOne(query).lean();
        if (!sale) {
            logger_1.log.warn('[getPublicInvoice] Invoice not found:', { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });
            return res.status(404).json({
                success: false,
                message: 'Invoice not found',
            });
        }
        logger_1.log.debug('[getPublicInvoice] Invoice found:', { invoiceNumber: sale.invoiceNumber, saleId: sale._id });
        // Return invoice data
        res.status(200).json({
            success: true,
            data: {
                sale: {
                    id: sale._id,
                    invoiceNumber: sale.invoiceNumber,
                    date: sale.date,
                    customerName: sale.customerName,
                    customerId: sale.customerId,
                    items: sale.items,
                    subtotal: sale.subtotal,
                    totalItemDiscount: sale.totalItemDiscount,
                    invoiceDiscount: sale.invoiceDiscount,
                    tax: sale.tax,
                    total: sale.total,
                    totalAmount: sale.total,
                    paidAmount: sale.paidAmount,
                    remainingAmount: sale.remainingAmount,
                    paymentMethod: sale.paymentMethod,
                    status: sale.status,
                    seller: sale.seller,
                    originalInvoiceId: sale.originalInvoiceId,
                    isReturn: sale.isReturn,
                },
            },
        });
    }
    catch (error) {
        logger_1.log.error('Error fetching public invoice:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching invoice',
        });
    }
});
