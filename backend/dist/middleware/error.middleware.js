"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    // Mongoose validation error
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const errorMessages = Object.values(err.errors).map((e) => e.message);
        message = errorMessages.join(', ');
        statusCode = 400;
    }
    // Mongoose duplicate key error
    if (err.code === 11000) {
        const keyPattern = err.keyPattern || {};
        const keyValue = err.keyValue || {};
        // Check if this is a sales collection duplicate with invoiceNumber
        // The index is { storeId: 1, invoiceNumber: 1 }, so we need to check for invoiceNumber in the pattern
        if (keyPattern.invoiceNumber !== undefined && keyPattern.storeId !== undefined) {
            // This is a duplicate invoice number for the same store
            const invoiceNumber = keyValue.invoiceNumber || 'unknown';
            message = `Invoice number ${invoiceNumber} already exists for this store`;
            statusCode = 409; // Conflict status code is more appropriate
        }
        else {
            // Generic duplicate key error - use first field
            const field = Object.keys(keyPattern)[0];
            message = `${field} already exists`;
            statusCode = 400;
        }
    }
    // Mongoose cast error (invalid ObjectId)
    if (err instanceof mongoose_1.default.Error.CastError) {
        message = 'Invalid ID format';
        statusCode = 400;
    }
    // Log error (warn and error levels are always logged in production)
    logger_1.log.error('API Error', err, { statusCode, message });
    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
// Async handler wrapper to catch errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
