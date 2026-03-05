import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import { getSupplierModelForStore } from '../utils/supplierModel';
import { getSupplierPaymentModelForStore } from '../utils/supplierPaymentModel';
import { getPurchaseModelForStore } from '../utils/purchaseModel';
import { log } from '../utils/logger';

const getStoreId = async (req: AuthenticatedRequest): Promise<string | null> => {
  let storeId = req.user?.storeId || null;
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await User.findById(req.user.userId);
      if (user?.storeId) storeId = user.storeId;
    } catch (e: any) {
      log.error('Error fetching user for storeId', e);
    }
  }
  return storeId;
};

export const validateCreateSupplier = [
  body('name').trim().notEmpty().withMessage('Supplier name is required').isLength({ max: 200 }),
  body('contactPerson').optional().trim().isLength({ max: 200 }),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 255 }).withMessage('Email must be at most 255 characters'),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('previousBalance').optional().isFloat().withMessage('Previous balance must be a number'),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const createSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const Supplier = await getSupplierModelForStore(storeId);
  const SupplierPayment = getSupplierPaymentModelForStore();
  const { name, contactPerson, email, phone, address, previousBalance = 0, notes } = req.body;
  const supplier = await Supplier.create({
    storeId: normalizedStoreId,
    name: name?.trim(),
    contactPerson: contactPerson?.trim() || undefined,
    email: email?.trim() || undefined,
    phone: phone?.trim() || undefined,
    address: address?.trim() || undefined,
    previousBalance: Number(previousBalance) || 0,
    notes: notes?.trim() || undefined,
  });

  // Opening balance as transaction (same as customer): record in SupplierPayment so statement shows it
  const prevBal = Number(previousBalance) || 0;
  if (prevBal !== 0) {
    try {
      const isJournalVoucher = prevBal > 0; // سند قيد = we owe supplier
      const paymentAmount = isJournalVoucher ? -Math.abs(prevBal) : Math.abs(prevBal);
      await SupplierPayment.create({
        supplierId: (supplier._id as mongoose.Types.ObjectId).toString(),
        storeId: normalizedStoreId,
        date: supplier.createdAt,
        amount: paymentAmount,
        method: 'Cash',
        notes: `رصيد أولي - ${isJournalVoucher ? 'سند قيد' : 'سند قبض'}`,
      });
    } catch (paymentError: any) {
      log.error('Error creating supplier opening balance payment record', paymentError);
    }
  }

  res.status(201).json({
    success: true,
    message: 'Supplier created successfully',
    data: {
      supplier: {
        id: (supplier._id as mongoose.Types.ObjectId).toString(),
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        previousBalance: supplier.previousBalance,
        notes: supplier.notes,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    },
  });
});

export const getSuppliers = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.', data: { suppliers: [] } });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const searchTerm = (req.query.search as string)?.trim() || '';
  const Supplier = await getSupplierModelForStore(storeId);
  const query: any = { storeId: normalizedStoreId };
  if (searchTerm) {
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escaped, $options: 'i' } },
      { phone: { $regex: escaped, $options: 'i' } },
      { contactPerson: { $regex: escaped, $options: 'i' } },
    ];
  }
  const suppliers = await Supplier.find(query).sort({ createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: {
      suppliers: suppliers.map((s: any) => ({
        id: s._id.toString(),
        name: s.name,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        previousBalance: s.previousBalance ?? 0,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    },
  });
});

export const getSupplierById = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { id } = req.params;
  const Supplier = await getSupplierModelForStore(storeId);
  const supplier = await Supplier.findOne({ _id: id, storeId: normalizedStoreId }).lean();
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' });
  }
  const s = supplier as any;
  res.status(200).json({
    success: true,
    data: {
      supplier: {
        id: s._id.toString(),
        name: s.name,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        previousBalance: s.previousBalance ?? 0,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      },
    },
  });
});

export const validateUpdateSupplier = [
  body('name').optional().trim().isLength({ max: 200 }),
  body('contactPerson').optional().trim().isLength({ max: 200 }),
  body('email').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
  body('phone').optional().trim().isLength({ max: 20 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('previousBalance').optional().isFloat(),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const updateSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { id } = req.params;
  const Supplier = await getSupplierModelForStore(storeId);
  const updateData: any = {};
  const { name, contactPerson, email, phone, address, previousBalance, notes } = req.body;
  if (name !== undefined) updateData.name = name?.trim();
  if (contactPerson !== undefined) updateData.contactPerson = contactPerson?.trim() || undefined;
  if (email !== undefined) updateData.email = email?.trim() || undefined;
  if (phone !== undefined) updateData.phone = phone?.trim() || undefined;
  if (address !== undefined) updateData.address = address?.trim() || undefined;
  if (previousBalance !== undefined) updateData.previousBalance = Number(previousBalance) || 0;
  if (notes !== undefined) updateData.notes = notes?.trim() || undefined;
  const updated = await Supplier.findOneAndUpdate(
    { _id: id, storeId: normalizedStoreId },
    updateData,
    { new: true, runValidators: true }
  ).lean();
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' });
  }
  const s = updated as any;
  res.status(200).json({
    success: true,
    message: 'Supplier updated successfully',
    data: {
      supplier: {
        id: s._id.toString(),
        name: s.name,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        previousBalance: s.previousBalance ?? 0,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      },
    },
  });
});

export const deleteSupplier = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { id } = req.params;
  const Supplier = await getSupplierModelForStore(storeId);
  const deleted = await Supplier.findOneAndDelete({ _id: id, storeId: normalizedStoreId });
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' });
  }
  res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
});

/** Supplier account summaries: total purchases, total paid, balance per supplier */
export const getSupplierAccountsSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.', data: { summaries: [] } });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const Supplier = await getSupplierModelForStore(storeId);
  const Purchase = await getPurchaseModelForStore(storeId);
  const SupplierPayment = getSupplierPaymentModelForStore();

  const [suppliers, purchasesAgg, paymentsAgg] = await Promise.all([
    Supplier.find({ storeId: normalizedStoreId }).select('_id name previousBalance address').lean(),
    Purchase.aggregate([
      { $match: { storeId: normalizedStoreId, status: { $ne: 'Cancelled' } } },
      { $group: { _id: '$supplierId', totalPurchases: { $sum: '$totalAmount' }, totalPaidAtPurchase: { $sum: '$paidAmount' } } },
    ]),
    SupplierPayment.aggregate([
      { $match: { storeId: normalizedStoreId } },
      { $group: { _id: '$supplierId', totalPaid: { $sum: '$amount' }, lastPaymentDate: { $max: '$date' } } },
    ]),
  ]);

  const purchaseMap = new Map<string, { totalPurchases: number; totalPaidAtPurchase: number }>();
  purchasesAgg.forEach((r: any) => {
    purchaseMap.set(r._id, { totalPurchases: r.totalPurchases ?? 0, totalPaidAtPurchase: r.totalPaidAtPurchase ?? 0 });
  });
  const paymentMap = new Map<string, { totalPaid: number; lastPaymentDate: Date | null }>();
  paymentsAgg.forEach((r: any) => {
    paymentMap.set(r._id, { totalPaid: r.totalPaid ?? 0, lastPaymentDate: r.lastPaymentDate ?? null });
  });

  const summaries = suppliers.map((s: any) => {
    const id = s._id.toString();
    const pur = purchaseMap.get(id) || { totalPurchases: 0, totalPaidAtPurchase: 0 };
    const pay = paymentMap.get(id) || { totalPaid: 0, lastPaymentDate: null };
    const totalPurchases = pur.totalPurchases;
    const totalPaid = pur.totalPaidAtPurchase + pay.totalPaid;
    // Balance from transactions only (opening balance is stored as SupplierPayment with negative/positive amount)
    const balance = totalPurchases - totalPaid;
    return {
      supplierId: id,
      supplierName: s.name || '',
      address: s.address,
      previousBalance: s.previousBalance ?? 0,
      totalPurchases,
      totalPaid,
      balance,
      lastPaymentDate: pay.lastPaymentDate ? new Date(pay.lastPaymentDate).toISOString() : null,
    };
  });

  res.status(200).json({
    success: true,
    data: { summaries },
  });
});

/** Get payments for a supplier (or all) for statement */
export const getSupplierPayments = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.', data: { payments: [] } });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const supplierId = (req.query.supplierId as string)?.trim();
  const SupplierPayment = getSupplierPaymentModelForStore();
  const query: any = { storeId: normalizedStoreId };
  if (supplierId) query.supplierId = supplierId;
  const payments = await SupplierPayment.find(query).sort({ date: -1, createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: {
      payments: payments.map((p: any) => ({
        id: p._id.toString(),
        supplierId: p.supplierId,
        purchaseId: p.purchaseId,
        date: p.date,
        amount: p.amount,
        method: p.method,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    },
  });
});

/** Add a standalone payment to supplier (positive = we pay = credit; negative = journal = debit) */
export const validateAddSupplierPayment = [
  body('supplierId').trim().notEmpty().withMessage('Supplier ID is required'),
  body('amount')
    .isFloat()
    .custom((value) => value !== 0)
    .withMessage('Amount cannot be zero'),
  body('method').isIn(['Cash', 'Bank Transfer', 'Cheque']).withMessage('Invalid method'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('purchaseId').optional().trim(),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const validateUpdateSupplierPayment = [
  body('amount')
    .optional()
    .isFloat()
    .custom((value) => value === undefined || value !== 0)
    .withMessage('Payment amount cannot be zero'),
  body('method').optional().isIn(['Cash', 'Bank Transfer', 'Cheque']).withMessage('Invalid method'),
  body('date').optional().isISO8601().withMessage('Invalid date'),
  body('purchaseId').optional().trim(),
  body('notes').optional().trim().isLength({ max: 1000 }),
];

export const addSupplierPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { supplierId, amount, method, date, purchaseId, notes } = req.body;
  const SupplierPayment = getSupplierPaymentModelForStore();
  const payment = await SupplierPayment.create({
    storeId: normalizedStoreId,
    supplierId: supplierId.trim(),
    amount: Number(amount),
    method,
    date: date ? new Date(date) : new Date(),
    purchaseId: purchaseId?.trim() || undefined,
    notes: notes?.trim() || undefined,
  });
  res.status(201).json({
    success: true,
    message: 'Payment recorded successfully',
    data: {
      payment: {
        id: (payment._id as mongoose.Types.ObjectId).toString(),
        supplierId: payment.supplierId,
        purchaseId: payment.purchaseId,
        date: payment.date,
        amount: payment.amount,
        method: payment.method,
        notes: payment.notes,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
    },
  });
});

export const updateSupplierPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const paymentId = req.params.id;
  if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: 'Valid payment ID is required' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { amount, method, date, purchaseId, notes } = req.body;
  const SupplierPayment = getSupplierPaymentModelForStore();
  const existing = await SupplierPayment.findOne({
    _id: new mongoose.Types.ObjectId(paymentId),
    storeId: normalizedStoreId,
  }).lean();
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Payment not found or access denied' });
  }
  const updateFields: Record<string, unknown> = {};
  if (amount !== undefined) updateFields.amount = parseFloat(amount);
  if (method !== undefined) updateFields.method = method;
  if (date !== undefined) updateFields.date = new Date(date);
  if (purchaseId !== undefined) updateFields.purchaseId = purchaseId?.trim() || undefined;
  if (notes !== undefined) updateFields.notes = notes?.trim() || null;
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields to update' });
  }
  const updated = await SupplierPayment.findByIdAndUpdate(
    paymentId,
    { $set: updateFields },
    { new: true, runValidators: true }
  ).lean();
  res.status(200).json({
    success: true,
    message: 'Supplier payment updated successfully',
    data: {
      payment: {
        id: (updated as any)._id.toString(),
        supplierId: (updated as any).supplierId,
        purchaseId: (updated as any).purchaseId,
        date: (updated as any).date,
        amount: (updated as any).amount,
        method: (updated as any).method,
        notes: (updated as any).notes,
        createdAt: (updated as any).createdAt,
        updatedAt: (updated as any).updatedAt,
      },
    },
  });
});

export const deleteSupplierPayment = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const paymentId = req.params.id;
  if (!paymentId || !mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({ success: false, message: 'Valid payment ID is required' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const SupplierPayment = getSupplierPaymentModelForStore();
  const existing = await SupplierPayment.findOne({
    _id: new mongoose.Types.ObjectId(paymentId),
    storeId: normalizedStoreId,
  }).lean();
  if (!existing) {
    return res.status(404).json({ success: false, message: 'Payment not found or access denied' });
  }
  await SupplierPayment.deleteOne({ _id: new mongoose.Types.ObjectId(paymentId), storeId: normalizedStoreId });
  res.status(200).json({ success: true, message: 'Supplier payment deleted successfully' });
});
