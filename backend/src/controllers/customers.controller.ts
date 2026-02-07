import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getCustomerPaymentModelForStore } from '../utils/customerPaymentModel';
import { getCustomerModelForStore } from '../utils/customerModel';
import { getSaleModelForStore } from '../utils/saleModel';
import User from '../models/User';
import { log } from '../utils/logger';
import {
  parsePaginationQuery,
  buildPaginationMeta,
  MAX_PAGE_SIZE,
  MAX_PAGE_SIZE_LIGHT,
} from '../types/pagination';

export const validateCreateCustomer = [
  body('name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Customer name cannot exceed 200 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('previousBalance')
    .optional({ nullable: true })
    .isFloat()
    .withMessage('Previous balance must be a valid number'),
];

export const createCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { name, phone, address, previousBalance = 0 } = req.body;
  let storeId = req.user?.storeId || null;

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      log.error('Error fetching user', error);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();

    // Get trial-aware Customer model
    const Customer = await getCustomerModelForStore(storeId);

    // Check if customer with same phone exists for this store
    const existingCustomer = await Customer.findOne({ 
      storeId: normalizedStoreId,
      phone: phone.trim(),
    });
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists',
      });
    }

    // Use phone as name if name is not provided
    const customerName = name?.trim() || phone.trim();

    const customer = await Customer.create({
      storeId: normalizedStoreId,
      name: customerName,
      phone: phone.trim(),
      address: address?.trim() || undefined,
      previousBalance: previousBalance || 0,
    });

    // If initial balance is set, create a payment record to track it in the statement
    if (previousBalance && previousBalance !== 0) {
      try {
        const CustomerPayment = getCustomerPaymentModelForStore(storeId);
        
        // Determine voucher type and payment amount:
        // Journal Voucher (سند قيد): previousBalance is positive (customer owes) → payment amount should be negative (debt transaction)
        // Receipt Voucher (سند قبض): previousBalance is negative (customer has credit) → payment amount should be positive (payment transaction)
        // The payment amount sign is opposite to previousBalance because:
        // - previousBalance > 0 means customer owes (debt) → transaction should be negative (debit)
        // - previousBalance < 0 means customer has credit → transaction should be positive (credit)
        const isJournalVoucher = previousBalance > 0;
        const paymentAmount = isJournalVoucher ? -Math.abs(previousBalance) : Math.abs(previousBalance);
        const voucherType = isJournalVoucher ? 'Journal Voucher' : 'Receipt Voucher';
        
        await CustomerPayment.create({
          customerId: (customer._id as mongoose.Types.ObjectId).toString(),
          storeId: normalizedStoreId,
          date: customer.createdAt, // Use customer creation date
          amount: paymentAmount, // Negative for Journal Voucher, positive for Receipt Voucher
          method: 'Cash', // Default method for initial balance
          invoiceId: null,
          notes: `رصيد أولي - ${isJournalVoucher ? 'سند قيد' : 'سند قبض'}`,
        });
      } catch (paymentError: any) {
        // Log error but don't fail customer creation if payment record creation fails
        log.error('Error creating initial balance payment record', paymentError);
        // Continue with customer creation even if payment record fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: {
        customer: {
          id: (customer._id as mongoose.Types.ObjectId).toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          previousBalance: customer.previousBalance,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export const getCustomers = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      data: { items: [], pagination: buildPaginationMeta(1, 50, 0), customers: [] },
    });
  }

  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const searchTerm = (req.query.search as string)?.trim() || '';
    const lightParam = (req.query.light as string)?.toLowerCase();
    const light = lightParam === 'true' || lightParam === '1' || lightParam === 'yes';

    const maxLimit = light ? MAX_PAGE_SIZE_LIGHT : MAX_PAGE_SIZE;
    const { page, limit, skip } = parsePaginationQuery(req.query as { page?: string; limit?: string }, maxLimit);

    const Customer = await getCustomerModelForStore(storeId);

    const queryFilter: any = { storeId: normalizedStoreId };

    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.replace(/\s+/g, ' ').trim();
      const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      queryFilter.$or = [
        { name: { $regex: escapedSearchTerm, $options: 'i' } },
        { phone: { $regex: escapedSearchTerm, $options: 'i' } },
        { address: { $regex: escapedSearchTerm, $options: 'i' } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Customer.countDocuments(queryFilter),
    ]);

    const mapCustomer = (c: any) => ({
      id: (c._id as mongoose.Types.ObjectId).toString(),
      name: c.name,
      phone: c.phone,
      ...(light ? {} : { address: c.address, previousBalance: c.previousBalance, createdAt: c.createdAt, updatedAt: c.updatedAt }),
    });

    const items = customers.map(mapCustomer);
    const pagination = buildPaginationMeta(page, limit, total);

    res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: {
        items,
        pagination,
        customers: items,
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export const getCustomerById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Get trial-aware Customer model
    const Customer = await getCustomerModelForStore(storeId);
    
    // Find customer by ID and storeId to ensure store isolation
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: {
        customer: {
          id: (customer._id as mongoose.Types.ObjectId).toString(),
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          previousBalance: customer.previousBalance,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export const validateUpdateCustomer = [
  body('name')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Customer name cannot exceed 200 characters'),
  body('phone')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number cannot exceed 20 characters'),
  body('address')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('previousBalance')
    .optional({ nullable: true })
    .isFloat()
    .withMessage('Previous balance must be a valid number'),
];

export const updateCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { id } = req.params;
  const { name, phone, address, previousBalance } = req.body;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();

    // Get trial-aware Customer model
    const Customer = await getCustomerModelForStore(storeId);

    // Find customer by ID and storeId to ensure store isolation
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check if phone is being updated and if it conflicts with another customer
    if (phone && phone.trim() !== customer.phone) {
      const existingCustomer = await Customer.findOne({
        storeId: normalizedStoreId,
        phone: phone.trim(),
        _id: { $ne: id },
      });

      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this phone number already exists',
        });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name?.trim() || phone?.trim() || customer.phone;
    }
    if (phone !== undefined) {
      updateData.phone = phone.trim();
      // If name is not provided but phone is updated, use phone as name
      if (!name && !customer.name) {
        updateData.name = phone.trim();
      }
    }
    if (address !== undefined) {
      updateData.address = address?.trim() || undefined;
    }
    if (previousBalance !== undefined) {
      updateData.previousBalance = previousBalance || 0;
    }

    // Update customer
    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: id, storeId: normalizedStoreId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        customer: {
          id: (updatedCustomer._id as mongoose.Types.ObjectId).toString(),
          name: updatedCustomer.name,
          phone: updatedCustomer.phone,
          address: updatedCustomer.address,
          previousBalance: updatedCustomer.previousBalance,
          createdAt: updatedCustomer.createdAt,
          updatedAt: updatedCustomer.updatedAt,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export const deleteCustomer = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();

    // Get trial-aware Customer model
    const Customer = await getCustomerModelForStore(storeId);

    // Find customer by ID and storeId to ensure store isolation
    const customer = await Customer.findOne({
      _id: id,
      storeId: normalizedStoreId,
    });

    // If customer doesn't exist, treat as already deleted (idempotent delete)
    // This ensures consistency: if the customer is already gone from server,
    // we return success so the client can sync its local state
    if (!customer) {
      return res.status(200).json({
        success: true,
        message: 'Customer already deleted or not found',
      });
    }

    // Delete customer
    await Customer.deleteOne({ _id: id, storeId: normalizedStoreId });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
});

export const validateCreateCustomerPayment = [
  body('customerId')
    .trim()
    .notEmpty()
    .withMessage('Customer ID is required'),
  body('amount')
    .isFloat()
    .custom((value) => {
      if (value === 0) {
        throw new Error('Payment amount cannot be zero');
      }
      return true;
    })
    .withMessage('Payment amount cannot be zero'),
  body('method')
    .isIn(['Cash', 'Bank Transfer', 'Cheque'])
    .withMessage('Payment method must be Cash, Bank Transfer, or Cheque'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('invoiceId')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

export const createCustomerPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const { customerId, amount, method, date, invoiceId, notes } = req.body;
  let storeId = req.user?.storeId || null;

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      log.error('Error fetching user', error);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    // Get trial-aware Customer model
    const Customer = await getCustomerModelForStore(storeId);
    
    // Verify customer exists and belongs to this store
    const customer = await Customer.findOne({
      _id: customerId,
      storeId: normalizedStoreId,
    });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Get Customer Payment model (unified collection in admin_db, filtered by storeId)
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);

    // Create payment record with normalized storeId
    const payment = await CustomerPayment.create({
      customerId: customerId.trim(),
      storeId: normalizedStoreId, // Use normalized storeId for consistency
      date: date ? new Date(date) : new Date(),
      amount: parseFloat(amount),
      method: method,
      invoiceId: invoiceId?.trim() || null,
      notes: notes?.trim() || null,
    });

    res.status(201).json({
      success: true,
      message: 'Customer payment created successfully',
      data: {
        payment: {
          id: (payment._id as mongoose.Types.ObjectId).toString(),
          customerId: payment.customerId,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          invoiceId: payment.invoiceId,
          notes: payment.notes,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get customer account summaries (totals per customer) using aggregation.
 * Returns lightweight summary rows only - no full payment/sale documents.
 * Use this for the customer accounts list to avoid timeouts and heavy payloads.
 */
export const getCustomerAccountsSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required.',
      data: { summaries: [] },
    });
  }

  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const Customer = await getCustomerModelForStore(storeId);
    const Sale = await getSaleModelForStore(storeId);
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);

    const [customers, salesByCustomer, paymentsByCustomer] = await Promise.all([
      Customer.find({ storeId: normalizedStoreId })
        .select('_id name phone address previousBalance')
        .lean(),
      Sale.aggregate([
        { $match: { storeId: normalizedStoreId } },
        {
          $group: {
            _id: '$customerId',
            totalRemainingFromSales: { $sum: '$remainingAmount' },
            totalPaidAtSale: { $sum: '$paidAmount' },
            totalPurchases: { $sum: '$total' },
          },
        },
      ]),
      CustomerPayment.aggregate([
        { $match: { storeId: normalizedStoreId } },
        {
          $group: {
            _id: '$customerId',
            receiptTotal: { $sum: { $cond: [{ $gt: ['$amount', 0] }, '$amount', 0] } },
            journalTotal: { $sum: { $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0] } },
            receiptExclInitial: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ['$amount', 0] },
                      { $not: { $regexMatch: { input: { $ifNull: ['$notes', ''] }, regex: 'رصيد أولي' } } },
                    ],
                  },
                  '$amount',
                  0,
                ],
              },
            },
            journalExclInitial: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$amount', 0] },
                      { $not: { $regexMatch: { input: { $ifNull: ['$notes', ''] }, regex: 'رصيد أولي' } } },
                    ],
                  },
                  { $abs: '$amount' },
                  0,
                ],
              },
            },
            lastPaymentDate: { $max: '$date' },
          },
        },
      ]),
    ]);

    const salesMap = new Map<string | null, { totalRemainingFromSales: number; totalPaidAtSale: number; totalPurchases: number }>();
    salesByCustomer.forEach((row: any) => {
      salesMap.set(row._id || null, {
        totalRemainingFromSales: row.totalRemainingFromSales ?? 0,
        totalPaidAtSale: row.totalPaidAtSale ?? 0,
        totalPurchases: row.totalPurchases ?? 0,
      });
    });
    const paymentsMap = new Map<string | null, { receiptTotal: number; journalTotal: number; receiptExclInitial: number; journalExclInitial: number; lastPaymentDate: Date | null }>();
    paymentsByCustomer.forEach((row: any) => {
      paymentsMap.set(row._id || null, {
        receiptTotal: row.receiptTotal ?? 0,
        journalTotal: row.journalTotal ?? 0,
        receiptExclInitial: row.receiptExclInitial ?? 0,
        journalExclInitial: row.journalExclInitial ?? 0,
        lastPaymentDate: row.lastPaymentDate ?? null,
      });
    });

    const summaries = customers.map((c: any) => {
      const id = c._id.toString();
      const sales = salesMap.get(id) || { totalRemainingFromSales: 0, totalPaidAtSale: 0, totalPurchases: 0 };
      const pay = paymentsMap.get(id) || { receiptTotal: 0, journalTotal: 0, receiptExclInitial: 0, journalExclInitial: 0, lastPaymentDate: null };
      const totalSales = sales.totalPurchases + pay.journalTotal;
      const totalPaid = sales.totalPaidAtSale + pay.receiptTotal;
      // Balance = Total Debt - Total Payments
      // If Total Debt > Total Payments → Debit (مدين). If Total Payments > Total Debt → Credit (دائن)
      const balance = totalSales - totalPaid;
      return {
        customerId: id,
        customerName: c.name || '',
        address: c.address,
        totalSales,
        totalPaid,
        balance,
        lastPaymentDate: pay.lastPaymentDate ? new Date(pay.lastPaymentDate).toISOString() : null,
      };
    });

    res.status(200).json({
      success: true,
      message: 'Customer account summaries fetched successfully',
      data: { summaries },
    });
  } catch (error: any) {
    next(error);
  }
});

export const getCustomerPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = req.user?.storeId || null;
  const { customerId } = req.query;

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      data: {
        payments: [],
      },
    });
  }

  try {
    // Normalize storeId to lowercase for consistency
    const normalizedStoreId = storeId.toLowerCase().trim();
    
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);
    
    // Build query - always filter by storeId since we use a single collection
    const query: any = {
      storeId: normalizedStoreId, // Required: filter by storeId
    };
    if (customerId && typeof customerId === 'string') {
      query.customerId = customerId.trim();
    }

    const payments = await CustomerPayment.find(query)
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: 'Customer payments fetched successfully',
      data: {
        payments: payments.map(payment => ({
          id: payment._id.toString(),
          customerId: payment.customerId,
          date: payment.date,
          amount: payment.amount,
          method: payment.method,
          invoiceId: payment.invoiceId,
          notes: payment.notes,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        })),
      },
    });
  } catch (error: any) {
    next(error);
  }
});

// Validation for updating a customer payment (all fields optional except validation rules)
export const validateUpdateCustomerPayment = [
  body('amount')
    .optional()
    .isFloat()
    .custom((value) => {
      if (value !== undefined && value === 0) {
        throw new Error('Payment amount cannot be zero');
      }
      return true;
    })
    .withMessage('Payment amount cannot be zero'),
  body('method')
    .optional()
    .isIn(['Cash', 'Bank Transfer', 'Cheque'])
    .withMessage('Payment method must be Cash, Bank Transfer, or Cheque'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('invoiceId')
    .optional()
    .trim(),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

export const updateCustomerPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const paymentId = req.params.id;
  const { amount, method, date, invoiceId, notes } = req.body;
  let storeId = req.user?.storeId || null;

  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      log.error('Error fetching user', error);
    }
  }

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid payment ID is required',
    });
  }

  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);

    const existing = await CustomerPayment.findOne({
      _id: new mongoose.Types.ObjectId(paymentId),
      storeId: normalizedStoreId,
    }).lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or access denied',
      });
    }

    const oldValues = {
      amount: existing.amount,
      method: existing.method,
      date: existing.date,
      invoiceId: existing.invoiceId,
      notes: existing.notes,
    };

    const updateFields: Record<string, unknown> = {};
    if (amount !== undefined) updateFields.amount = parseFloat(amount);
    if (method !== undefined) updateFields.method = method;
    if (date !== undefined) updateFields.date = new Date(date);
    if (invoiceId !== undefined) updateFields.invoiceId = invoiceId?.trim() || null;
    if (notes !== undefined) updateFields.notes = notes?.trim() || null;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const updated = await CustomerPayment.findByIdAndUpdate(
      paymentId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    const userId = req.user?.userId?.toString() ?? 'unknown';
    log.info(
      `[CustomerPayment] Updated payment ${paymentId} by user ${userId}: old=${JSON.stringify(oldValues)} new=${JSON.stringify(updateFields)}`
    );

    res.status(200).json({
      success: true,
      message: 'Customer payment updated successfully',
      data: {
        payment: {
          id: updated._id.toString(),
          customerId: updated.customerId,
          date: updated.date,
          amount: updated.amount,
          method: updated.method,
          invoiceId: updated.invoiceId,
          notes: updated.notes,
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export const deleteCustomerPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const paymentId = req.params.id;
  let storeId = req.user?.storeId || null;

  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      log.error('Error fetching user', error);
    }
  }

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({
      success: false,
      message: 'Valid payment ID is required',
    });
  }

  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);

    const existing = await CustomerPayment.findOne({
      _id: new mongoose.Types.ObjectId(paymentId),
      storeId: normalizedStoreId,
    }).lean();

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or access denied',
      });
    }

    await CustomerPayment.deleteOne({ _id: new mongoose.Types.ObjectId(paymentId), storeId: normalizedStoreId });

    const userId = req.user?.userId?.toString() ?? 'unknown';
    log.info(
      `[CustomerPayment] Deleted payment ${paymentId} (customerId=${existing.customerId} amount=${existing.amount}) by user ${userId}`
    );

    res.status(200).json({
      success: true,
      message: 'Customer payment deleted successfully',
    });
  } catch (error: any) {
    next(error);
  }
});

