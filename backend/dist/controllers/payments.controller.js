"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelPayment = exports.getPaymentsByInvoice = exports.getPayment = exports.processPayment = void 0;
const Payment_1 = require("../models/Payment");
/**
 * Create payment record (without terminal integration)
 */
const processPayment = async (req, res) => {
    try {
        const storeId = req.user?.storeId || null;
        const { invoiceId, amount, currency = 'SAR', paymentMethod, description } = req.body;
        // Validate required fields
        if (!invoiceId || !amount || !paymentMethod) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: invoiceId, amount, and paymentMethod are required',
            });
            return;
        }
        // Create payment record
        const payment = new Payment_1.Payment({
            invoiceId,
            storeId: storeId || null,
            amount,
            currency,
            paymentMethod,
            status: 'Approved', // Auto-approve since no terminal validation
            description: description || `Invoice ${invoiceId}`,
            processedAt: new Date(),
        });
        await payment.save();
        // Return response
        res.status(200).json({
            success: true,
            message: 'Payment recorded successfully',
            data: {
                payment: {
                    id: payment.id,
                    invoiceId: payment.invoiceId,
                    amount: payment.amount,
                    currency: payment.currency,
                    paymentMethod: payment.paymentMethod,
                    status: payment.status,
                    processedAt: payment.processedAt,
                },
            },
        });
    }
    catch (error) {
        console.error('Payment processing error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.processPayment = processPayment;
/**
 * Get payment by ID
 */
const getPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.user?.storeId || null;
        const payment = await Payment_1.Payment.findOne({
            _id: id,
            ...(storeId ? { storeId } : {}),
        });
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: { payment },
        });
    }
    catch (error) {
        console.error('Get payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.getPayment = getPayment;
/**
 * Get payments by invoice ID
 */
const getPaymentsByInvoice = async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const storeId = req.user?.storeId || null;
        const payments = await Payment_1.Payment.find({
            invoiceId,
            ...(storeId ? { storeId } : {}),
        }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: { payments },
        });
    }
    catch (error) {
        console.error('Get payments by invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.getPaymentsByInvoice = getPaymentsByInvoice;
/**
 * Cancel payment transaction
 */
const cancelPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const storeId = req.user?.storeId || null;
        const payment = await Payment_1.Payment.findOne({
            _id: id,
            ...(storeId ? { storeId } : {}),
        });
        if (!payment) {
            res.status(404).json({
                success: false,
                message: 'Payment not found',
            });
            return;
        }
        if (payment.status !== 'Pending') {
            res.status(400).json({
                success: false,
                message: `Cannot cancel payment with status: ${payment.status}`,
            });
            return;
        }
        // Update payment status
        payment.status = 'Cancelled';
        payment.processedAt = new Date();
        await payment.save();
        res.status(200).json({
            success: true,
            message: 'Payment cancelled successfully',
            data: { payment },
        });
    }
    catch (error) {
        console.error('Cancel payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
        });
    }
};
exports.cancelPayment = cancelPayment;
