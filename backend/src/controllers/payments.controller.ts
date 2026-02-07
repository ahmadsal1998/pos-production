import { Response, NextFunction } from 'express';
import { Payment, IPayment } from '../models/Payment';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { log } from '../utils/logger';

/**
 * Create payment record (without terminal integration)
 */
export const processPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
    const payment = new Payment({
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
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get payment by ID
 */
export const getPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;

    const payment = await Payment.findOne({
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
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get payments by invoice ID
 */
export const getPaymentsByInvoice = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.user?.storeId || null;

    const payments = await Payment.find({
      invoiceId,
      ...(storeId ? { storeId } : {}),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { payments },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Cancel payment transaction
 */
export const cancelPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;

    const payment = await Payment.findOne({
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
  } catch (error: any) {
    next(error);
  }
});


