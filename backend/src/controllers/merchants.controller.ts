import { Response } from 'express';
import { Merchant, IMerchant } from '../models/Merchant';
import Store from '../models/Store';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * Get all merchants
 */
export const getMerchants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const storeId = req.user?.storeId;
    const query: any = {};
    
    // If user has a storeId, filter by store
    if (storeId && req.user?.role !== 'Admin') {
      query.storeId = storeId;
    }

    const merchants = await Merchant.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: { merchants },
    });
  } catch (error: any) {
    console.error('Get merchants error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Get merchant by ID
 */
export const getMerchant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;

    const query: any = { _id: id };
    if (storeId && req.user?.role !== 'Admin') {
      query.storeId = storeId;
    }

    const merchant = await Merchant.findOne(query);

    if (!merchant) {
      res.status(404).json({
        success: false,
        message: 'Merchant not found',
      });
      return;
    }

    // Get terminals from the merchant's store (if merchant has a store)
    let terminals: any[] = [];
    if (merchant.storeId) {
      const store = await Store.findOne({ storeId: merchant.storeId.toLowerCase() });
      if (store && store.terminals && store.terminals.length > 0) {
        terminals = store.terminals.map((term) => ({
          ...term.toObject(),
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
  } catch (error: any) {
    console.error('Get merchant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Create new merchant
 */
export const createMerchant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const existingMerchant = await Merchant.findOne({ merchantId: merchantId.toUpperCase() });
    if (existingMerchant) {
      res.status(400).json({
        success: false,
        message: 'Merchant ID already exists',
      });
      return;
    }

    const merchant = new Merchant({
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
  } catch (error: any) {
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

/**
 * Update merchant
 */
export const updateMerchant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, merchantId, description, status } = req.body;
    const storeId = req.user?.storeId;

    const query: any = { _id: id };
    if (storeId && req.user?.role !== 'Admin') {
      query.storeId = storeId;
    }

    const merchant = await Merchant.findOne(query);

    if (!merchant) {
      res.status(404).json({
        success: false,
        message: 'Merchant not found',
      });
      return;
    }

    // Update fields
    if (name) merchant.name = name;
    if (merchantId) {
      // Check if new merchant ID already exists (if changed)
      if (merchantId.toUpperCase() !== merchant.merchantId) {
        const existingMerchant = await Merchant.findOne({ merchantId: merchantId.toUpperCase() });
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
    if (description !== undefined) merchant.description = description;
    if (status) merchant.status = status;

    await merchant.save();

    res.status(200).json({
      success: true,
      message: 'Merchant updated successfully',
      data: { merchant },
    });
  } catch (error: any) {
    console.error('Update merchant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

/**
 * Delete merchant
 */
export const deleteMerchant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;

    const query: any = { _id: id };
    if (storeId && req.user?.role !== 'Admin') {
      query.storeId = storeId;
    }

    const merchant = await Merchant.findOne(query);

    if (!merchant) {
      res.status(404).json({
        success: false,
        message: 'Merchant not found',
      });
      return;
    }

    // Check if merchant's store has terminals (if merchant has a store)
    if (merchant.storeId) {
      const store = await Store.findOne({ storeId: merchant.storeId.toLowerCase() });
      if (store && store.terminals && store.terminals.length > 0) {
        // Count terminals that use this merchant's MID
        const terminalCount = store.terminals.filter(
          (t) => t.merchantIdMid?.toUpperCase() === merchant.merchantId.toUpperCase()
        ).length;
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
  } catch (error: any) {
    console.error('Delete merchant error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

