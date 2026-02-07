import { Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import StorePointsAccount from '../models/StorePointsAccount';
import PointsTransaction from '../models/PointsTransaction';
import Store from '../models/Store';
import { log } from '../utils/logger';

/**
 * Get store points account (Admin can view any, store users can view their own)
 */
export const getStorePointsAccount = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;

  const query: any = {};
  if (userRole !== 'Admin' && req.user?.userId !== 'admin') {
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

  const account = await StorePointsAccount.findOne(query);

  if (!account) {
    return res.status(200).json({
      success: true,
      data: {
        account: {
          storeId: query.storeId,
          totalPointsIssued: 0,
          totalPointsRedeemed: 0,
          netPointsBalance: 0,
          totalPointsValueIssued: 0,
          totalPointsValueRedeemed: 0,
          netFinancialBalance: 0,
          amountOwed: 0,
        },
      },
    });
  }

  res.status(200).json({
    success: true,
    data: {
      account: {
        id: account._id,
        storeId: account.storeId,
        storeName: account.storeName,
        totalPointsIssued: account.totalPointsIssued,
        totalPointsRedeemed: account.totalPointsRedeemed,
        netPointsBalance: account.netPointsBalance,
        pointsValuePerPoint: account.pointsValuePerPoint,
        totalPointsValueIssued: account.totalPointsValueIssued,
        totalPointsValueRedeemed: account.totalPointsValueRedeemed,
        netFinancialBalance: account.netFinancialBalance,
        amountOwed: account.amountOwed,
        lastUpdated: account.lastUpdated,
      },
    },
  });
});

/**
 * Get all store points accounts
 * - Admin users: Can view all accounts
 * - Store owners: Can only view their own store's account
 */
export const getAllStorePointsAccounts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const isSystemAdmin = req.user?.userId === 'admin';

  let accounts;

  if (userRole === 'Admin' && isSystemAdmin) {
    accounts = await StorePointsAccount.find().sort({ amountOwed: -1 });
  } else {
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required. Please ensure you are logged in as a store user.',
      });
    }

    const account = await StorePointsAccount.findOne({ 
      storeId: storeId.toLowerCase() 
    });

    if (!account) {
      const storeInfo = await Store.findOne({ storeId: storeId.toLowerCase() });
      accounts = [{
        storeId: storeId.toLowerCase(),
        storeName: storeInfo?.name || 'Unknown Store',
        totalPointsIssued: 0,
        totalPointsRedeemed: 0,
        netPointsBalance: 0,
        pointsValuePerPoint: 0.01,
        totalPointsValueIssued: 0,
        totalPointsValueRedeemed: 0,
        netFinancialBalance: 0,
        amountOwed: 0,
        lastUpdated: new Date(),
      }];
    } else {
      accounts = [account];
    }
  }

  res.status(200).json({
    success: true,
    data: {
      accounts,
    },
  });
});

/**
 * Get store points transaction summary (Admin or store user)
 */
export const getStorePointsTransactions = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userRole = req.user?.role;
  const storeId = req.user?.storeId || null;
  const { id } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const { transactionType, startDate, endDate } = req.query;

  // Determine store ID
  let targetStoreId: string;
  if (userRole === 'Admin' || req.user?.userId === 'admin') {
    targetStoreId = id.toLowerCase();
  } else {
    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required',
      });
    }
    targetStoreId = storeId.toLowerCase();
  }

  const query: any = {
    $or: [
      { earningStoreId: targetStoreId },
      { redeemingStoreId: targetStoreId },
    ],
  };

  if (transactionType) {
    query.transactionType = transactionType;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {
      query.createdAt.$gte = new Date(startDate as string);
    }
    if (endDate) {
      query.createdAt.$lte = new Date(endDate as string);
    }
  }

  const transactions = await PointsTransaction.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await PointsTransaction.countDocuments(query);

  const issuedTransactions = await PointsTransaction.find({
    earningStoreId: targetStoreId,
    transactionType: 'earned',
  });
  const redeemedTransactions = await PointsTransaction.find({
    redeemingStoreId: targetStoreId,
    transactionType: 'spent',
  });

  const totalIssued = issuedTransactions.reduce((sum, t) => sum + t.points, 0);
  const totalRedeemed = Math.abs(redeemedTransactions.reduce((sum, t) => sum + t.points, 0));
  const totalIssuedValue = issuedTransactions.reduce((sum, t) => sum + (t.pointsValue || 0), 0);
  const totalRedeemedValue = redeemedTransactions.reduce((sum, t) => sum + (t.pointsValue || 0), 0);

  res.status(200).json({
    success: true,
    data: {
      transactions,
      summary: {
        totalIssued,
        totalRedeemed,
        netPointsBalance: totalIssued - totalRedeemed,
        totalIssuedValue,
        totalRedeemedValue,
        netFinancialBalance: totalIssuedValue - totalRedeemedValue,
        amountOwed: Math.abs(totalIssuedValue - totalRedeemedValue),
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

