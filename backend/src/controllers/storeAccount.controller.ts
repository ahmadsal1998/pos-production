import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import StoreAccount from '../models/StoreAccount';
import Store from '../models/Store';
import { log } from '../utils/logger';

/**
 * Get all store accounts (Admin only)
 */
export const getStoreAccounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;

  if (userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  try {
    const accounts = await StoreAccount.find().sort({ dueBalance: -1 });

    res.status(200).json({
      success: true,
      data: {
        accounts,
      },
    });
  } catch (error: any) {
    log.error('Error getting store accounts', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get store accounts',
    });
  }
});

/**
 * Get single store account
 */
export const getStoreAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;

  // Admin can view any account, store users can only view their own
  const query: any = {};
  if (userRole !== 'Admin') {
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required',
      });
    }
    query.storeId = storeId.toLowerCase();
  } else {
    query.storeId = id.toLowerCase();
  }

  try {
    const account = await StoreAccount.findOne(query);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        account,
      },
    });
  } catch (error: any) {
    log.error('Error getting store account', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get store account',
    });
  }
});

/**
 * Update store account threshold (Admin only)
 */
export const updateStoreAccountThreshold = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const userRole = req.user?.role;

  if (userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  const { storeId } = req.params;
  const { threshold } = req.body;

  if (!storeId || !threshold || threshold < 0) {
    return res.status(400).json({
      success: false,
      message: 'Store ID and valid threshold are required',
    });
  }

  try {
    const account = await StoreAccount.findOne({ storeId: storeId.toLowerCase() });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found',
      });
    }

    account.threshold = threshold;
    
    // If new threshold is higher than current due balance and account is paused, unpause it
    if (account.isPaused && account.dueBalance < threshold) {
      account.isPaused = false;
      account.pausedAt = undefined;
      account.pausedReason = undefined;

      // Reactivate store
      await Store.findOneAndUpdate(
        { storeId: storeId.toLowerCase() },
        { isActive: true }
      );
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: 'Store account threshold updated successfully',
      data: {
        account,
      },
    });
  } catch (error: any) {
    log.error('Error updating store account threshold', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update store account threshold',
    });
  }
});

/**
 * Make payment to store account (Admin only)
 */
export const makePaymentToStore = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const userRole = req.user?.role;

  if (userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  const { storeId } = req.params;
  const { amount, description } = req.body;

  if (!storeId || !amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Store ID and valid payment amount are required',
    });
  }

  try {
    const account = await StoreAccount.findOne({ storeId: storeId.toLowerCase() });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found',
      });
    }

    // Update account
    const paymentAmount = Math.min(amount, account.dueBalance); // Don't overpay
    account.totalPaid += paymentAmount;
    account.dueBalance -= paymentAmount;
    account.lastPaymentDate = new Date();
    account.lastPaymentAmount = paymentAmount;

    // If account was paused and due balance is now below threshold, unpause it
    if (account.isPaused && account.dueBalance < account.threshold) {
      account.isPaused = false;
      account.pausedAt = undefined;
      account.pausedReason = undefined;

      // Reactivate store
      await Store.findOneAndUpdate(
        { storeId: storeId.toLowerCase() },
        { isActive: true }
      );
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        account: {
          id: account._id,
          storeId: account.storeId,
          totalEarned: account.totalEarned,
          totalPaid: account.totalPaid,
          dueBalance: account.dueBalance,
          isPaused: account.isPaused,
          lastPaymentDate: account.lastPaymentDate,
          lastPaymentAmount: account.lastPaymentAmount,
        },
        payment: {
          amount: paymentAmount,
          description,
        },
      },
    });
  } catch (error: any) {
    log.error('Error making payment to store', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process payment',
    });
  }
});

/**
 * Manually pause/unpause store account (Admin only)
 */
export const toggleStoreAccountStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;

  if (userRole !== 'Admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.',
    });
  }

  const { storeId } = req.params;
  const { isPaused, reason } = req.body;

  if (!storeId || typeof isPaused !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Store ID and isPaused status are required',
    });
  }

  try {
    const account = await StoreAccount.findOne({ storeId: storeId.toLowerCase() });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Store account not found',
      });
    }

    account.isPaused = isPaused;
    if (isPaused) {
      account.pausedAt = new Date();
      account.pausedReason = reason || 'Manually paused by admin';
      
      // Deactivate store
      await Store.findOneAndUpdate(
        { storeId: storeId.toLowerCase() },
        { isActive: false }
      );
    } else {
      account.pausedAt = undefined;
      account.pausedReason = undefined;
      
      // Reactivate store
      await Store.findOneAndUpdate(
        { storeId: storeId.toLowerCase() },
        { isActive: true }
      );
    }

    await account.save();

    res.status(200).json({
      success: true,
      message: `Store account ${isPaused ? 'paused' : 'unpaused'} successfully`,
      data: {
        account,
      },
    });
  } catch (error: any) {
    log.error('Error toggling store account status', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to toggle store account status',
    });
  }
});

// Validation middleware
export const validateUpdateThreshold = [
  body('threshold').isFloat({ min: 0 }).withMessage('Threshold must be a non-negative number'),
];

export const validateMakePayment = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be a positive number'),
  body('description').optional().trim(),
];

