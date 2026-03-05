import { Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import User from '../models/User';
import Sequence from '../models/Sequence';
import { getSupplierModelForStore } from '../utils/supplierModel';
import { getPurchaseModelForStore } from '../utils/purchaseModel';
import { getSupplierPaymentModelForStore } from '../utils/supplierPaymentModel';
import { getProductModelForStore } from '../utils/productModel';
import { invalidateAllProductBarcodeCaches } from '../utils/productCache';
import { log } from '../utils/logger';

const PO_SEQUENCE_TYPE = 'poNumber';

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

async function getNextPoNumber(storeId: string): Promise<string> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  const Purchase = await getPurchaseModelForStore(storeId);
  const existing = await Purchase.find({ storeId: normalizedStoreId }).select('poNumber').lean().limit(5000);
  let maxNum = 0;
  const re = /^PO-(\d+)$/;
  for (const p of existing) {
    const m = (p.poNumber || '').match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  let seq = await Sequence.findOne({ storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE });
  if (!seq) {
    seq = await Sequence.findOneAndUpdate(
      { storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE },
      { $setOnInsert: { value: maxNum } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  if (seq!.value < maxNum) {
    await Sequence.findOneAndUpdate(
      { storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE },
      { $set: { value: maxNum } }
    );
  }
  seq = await Sequence.findOneAndUpdate(
    { storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE },
    { $inc: { value: 1 } },
    { new: true }
  );
  return `PO-${seq!.value}`;
}

/** Sync Sequence after using a specific PO number (e.g. from frontend) so next getNextPoNumber is sequential. */
async function syncPoSequenceAfterUse(storeId: string, usedNumber: number): Promise<void> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  let seq = await Sequence.findOne({ storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE });
  if (!seq) {
    await Sequence.findOneAndUpdate(
      { storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE },
      { $setOnInsert: { value: usedNumber } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    return;
  }
  if (seq.value < usedNumber) {
    await Sequence.findOneAndUpdate(
      { storeId: normalizedStoreId, sequenceType: PO_SEQUENCE_TYPE },
      { $set: { value: usedNumber } }
    );
  }
}

export const getNextPoNumberHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const poNumber = await getNextPoNumber(storeId);
  res.status(200).json({ success: true, data: { poNumber } });
});

export const getPurchases = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(200).json({ success: true, data: { purchases: [] } });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const supplierId = (req.query.supplierId as string)?.trim();
  const status = (req.query.status as string)?.trim();
  const Purchase = await getPurchaseModelForStore(storeId);
  const query: any = { storeId: normalizedStoreId };
  if (supplierId) query.supplierId = supplierId;
  if (status && ['Pending', 'Completed', 'Cancelled'].includes(status)) query.status = status;
  const purchases = await Purchase.find(query).sort({ purchaseDate: -1, createdAt: -1 }).lean();
  res.status(200).json({
    success: true,
    data: {
      purchases: (purchases as any[]).map((p: any) => ({
        id: (p._id ?? p.id)?.toString?.() ?? '',
        poNumber: p.poNumber,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        items: p.items ?? [],
        subtotal: p.subtotal,
        discount: p.discount,
        tax: p.tax,
        totalAmount: p.totalAmount,
        paidAmount: p.paidAmount,
        remainingAmount: p.remainingAmount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        purchaseDate: p.purchaseDate,
        chequeDetails: p.chequeDetails,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    },
  });
});

export const getPurchaseById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
  }
  const Purchase = await getPurchaseModelForStore(storeId);
  const p = await Purchase.findOne({ _id: new mongoose.Types.ObjectId(id), storeId: normalizedStoreId }).lean();
  if (!p) {
    return res.status(404).json({ success: false, message: 'Purchase not found.' });
  }
  const purchase = p as any;
  res.status(200).json({
    success: true,
    data: {
      purchase: {
        id: purchase._id.toString(),
        poNumber: purchase.poNumber,
        supplierId: purchase.supplierId,
        supplierName: purchase.supplierName,
        items: purchase.items,
        subtotal: purchase.subtotal,
        discount: purchase.discount,
        tax: purchase.tax,
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.paidAmount,
        remainingAmount: purchase.remainingAmount,
        paymentMethod: purchase.paymentMethod,
        status: purchase.status,
        purchaseDate: purchase.purchaseDate,
        chequeDetails: purchase.chequeDetails,
        notes: purchase.notes,
        createdAt: purchase.createdAt,
        updatedAt: purchase.updatedAt,
      },
    },
  });
});

export const validateCreatePurchase = [
  body('supplierId').trim().notEmpty().withMessage('Supplier ID is required'),
  body('supplierName').trim().notEmpty().withMessage('Supplier name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').trim().notEmpty(),
  body('items.*.productName').trim().notEmpty(),
  body('items.*.quantity').isFloat({ min: 0.001 }),
  body('items.*.unitCost').isFloat({ min: 0 }),
  body('items.*.totalCost').isFloat({ min: 0 }),
  body('items.*.sellingPrice').optional().isFloat({ min: 0 }),
  body('items.*.quantityInMainUnit').optional().isFloat({ min: 0 }),
  body('subtotal').isFloat({ min: 0 }),
  body('totalAmount').isFloat({ min: 0 }),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('paymentMethod').isIn(['Cash', 'Bank Transfer', 'Credit', 'Cheque']),
  body('purchaseDate').optional().isISO8601(),
  body('discount').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  body('chequeDetails').optional().isObject(),
  body('poNumber').optional().trim(),
];

export const createPurchase = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const {
    supplierId,
    supplierName,
    items,
    subtotal,
    discount = 0,
    tax = 0,
    totalAmount,
    paidAmount = 0,
    paymentMethod,
    purchaseDate,
    notes,
    chequeDetails,
    poNumber: requestedPo,
  } = req.body;

  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const status = remainingAmount <= 0 ? 'Completed' : 'Pending';

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const Purchase = await getPurchaseModelForStore(storeId);
    const Product = await getProductModelForStore(storeId);
    const SupplierPayment = getSupplierPaymentModelForStore();

    let poNumber: string;
    const trimmedPo = typeof requestedPo === 'string' ? requestedPo.trim() : '';
    if (trimmedPo && /^PO-\d+$/.test(trimmedPo)) {
      const existing = await Purchase.findOne({ storeId: normalizedStoreId, poNumber: trimmedPo }).session(session);
      if (!existing) {
        poNumber = trimmedPo;
        const num = parseInt(trimmedPo.replace(/^PO-/, ''), 10);
        if (!isNaN(num)) await syncPoSequenceAfterUse(storeId, num);
      } else {
        poNumber = await getNextPoNumber(storeId);
      }
    } else {
      poNumber = await getNextPoNumber(storeId);
    }

    const purchaseDoc = {
      storeId: normalizedStoreId,
      poNumber,
      supplierId: supplierId.trim(),
      supplierName: supplierName.trim(),
      items: items.map((i: any) => ({
        productId: String(i.productId),
        productName: i.productName || '',
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        totalCost: Number(i.totalCost),
        unit: i.unit || 'قطعة',
        ...(i.sellingPrice != null && Number(i.sellingPrice) >= 0 ? { sellingPrice: Number(i.sellingPrice) } : {}),
        ...(i.quantityInMainUnit != null && Number(i.quantityInMainUnit) >= 0 ? { quantityInMainUnit: Number(i.quantityInMainUnit) } : {}),
      })),
      subtotal: Number(subtotal),
      discount: Number(discount),
      tax: Number(tax),
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      remainingAmount,
      paymentMethod,
      status,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      notes: notes?.trim() || undefined,
      chequeDetails: chequeDetails || undefined,
    };

    const [purchase] = await Purchase.create([purchaseDoc], { session });
    const purchaseId = (purchase._id as mongoose.Types.ObjectId).toString();

    for (const item of items) {
      const productId = String(item.productId);
      const displayQty = Number(item.quantity);
      const quantityInMain = item.quantityInMainUnit != null && Number(item.quantityInMainUnit) >= 0
        ? Number(item.quantityInMainUnit)
        : displayQty;
      const itemTotalCost = Number(item.totalCost);
      const sellingPriceFromItem = item.sellingPrice != null && Number(item.sellingPrice) >= 0 ? Number(item.sellingPrice) : null;
      if (!productId || quantityInMain <= 0) continue;
      const query: any = { storeId: normalizedStoreId };
      if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
        query._id = new mongoose.Types.ObjectId(productId);
      } else {
        query.$or = [{ barcode: productId }, { name: productId }];
      }
      const product = await Product.findOne(query).session(session).lean();
      if (!product) {
        log.warn(`[Purchase] Product not found for stock update: ${productId}`);
        continue;
      }
      const oldStock = Number((product as any).stock) || 0;
      const oldCost = Number((product as any).costPrice) || 0;
      const totalQtyMain = oldStock + quantityInMain;
      const newAverageCost = totalQtyMain > 0
        ? (oldStock * oldCost + itemTotalCost) / totalQtyMain
        : (itemTotalCost / quantityInMain) || 0;
      const setFields: Record<string, number> = { costPrice: newAverageCost };
      if (sellingPriceFromItem !== null) setFields.price = sellingPriceFromItem;
      const updateResult = await Product.findOneAndUpdate(
        query,
        { $inc: { stock: quantityInMain }, $set: setFields },
        { new: true, session }
      );
      if (updateResult) {
        await invalidateAllProductBarcodeCaches(storeId, updateResult);
      }
    }

    // Payment at purchase is stored only on Purchase.paidAmount; do not create SupplierPayment
    // here so supplier summary and statement are not double-counted. Statement uses paidAmount from purchase.

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Purchase invoice created successfully',
      data: {
        purchase: {
          id: purchaseId,
          poNumber: purchase.poNumber,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          items: purchase.items,
          subtotal: purchase.subtotal,
          discount: purchase.discount,
          tax: purchase.tax,
          totalAmount: purchase.totalAmount,
          paidAmount: purchase.paidAmount,
          remainingAmount: purchase.remainingAmount,
          paymentMethod: purchase.paymentMethod,
          status: purchase.status,
          purchaseDate: purchase.purchaseDate,
          chequeDetails: purchase.chequeDetails,
          notes: purchase.notes,
          createdAt: purchase.createdAt,
          updatedAt: purchase.updatedAt,
        },
      },
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    log.error('[Purchase] Create failed', err);
    throw err;
  }
});

export const validateUpdatePurchase = [
  body('supplierId').trim().notEmpty().withMessage('Supplier ID is required'),
  body('supplierName').trim().notEmpty().withMessage('Supplier name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').trim().notEmpty(),
  body('items.*.productName').trim().notEmpty(),
  body('items.*.quantity').isFloat({ min: 0.001 }),
  body('items.*.unitCost').isFloat({ min: 0 }),
  body('items.*.totalCost').isFloat({ min: 0 }),
  body('items.*.sellingPrice').optional().isFloat({ min: 0 }),
  body('items.*.quantityInMainUnit').optional().isFloat({ min: 0 }),
  body('subtotal').isFloat({ min: 0 }),
  body('totalAmount').isFloat({ min: 0 }),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('paymentMethod').isIn(['Cash', 'Bank Transfer', 'Credit', 'Cheque']),
  body('purchaseDate').optional().isISO8601(),
  body('discount').optional().isFloat({ min: 0 }),
  body('tax').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  body('chequeDetails').optional().isObject(),
];

export const updatePurchase = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const storeId = await getStoreId(req);
  if (!storeId) {
    return res.status(400).json({ success: false, message: 'Store ID is required.' });
  }
  const normalizedStoreId = storeId.toLowerCase().trim();
  const purchaseId = (req.params as any).id;
  if (!purchaseId || !mongoose.Types.ObjectId.isValid(purchaseId)) {
    return res.status(400).json({ success: false, message: 'Invalid purchase ID.' });
  }
  const {
    supplierId,
    supplierName,
    items,
    subtotal,
    discount = 0,
    tax = 0,
    totalAmount,
    paidAmount = 0,
    paymentMethod,
    purchaseDate,
    notes,
    chequeDetails,
  } = req.body;

  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const status = remainingAmount <= 0 ? 'Completed' : 'Pending';

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const Purchase = await getPurchaseModelForStore(storeId);
    const Product = await getProductModelForStore(storeId);

    const existing = await Purchase.findOne({
      _id: new mongoose.Types.ObjectId(purchaseId),
      storeId: normalizedStoreId,
    })
      .session(session)
      .lean();
    if (!existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Purchase not found.' });
    }

    const oldItems = (existing as any).items ?? [];
    for (const item of oldItems) {
      const productId = String(item.productId);
      const quantityInMain =
        item.quantityInMainUnit != null && Number(item.quantityInMainUnit) >= 0
          ? Number(item.quantityInMainUnit)
          : Number(item.quantity);
      if (!productId || quantityInMain <= 0) continue;
      const query: any = { storeId: normalizedStoreId };
      if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
        query._id = new mongoose.Types.ObjectId(productId);
      } else {
        query.$or = [{ barcode: productId }, { name: productId }];
      }
      await Product.findOneAndUpdate(query, { $inc: { stock: -quantityInMain } }, { session });
    }

    const purchaseDoc = {
      supplierId: supplierId.trim(),
      supplierName: supplierName.trim(),
      items: items.map((i: any) => ({
        productId: String(i.productId),
        productName: i.productName || '',
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        totalCost: Number(i.totalCost),
        unit: i.unit || 'قطعة',
        ...(i.sellingPrice != null && Number(i.sellingPrice) >= 0 ? { sellingPrice: Number(i.sellingPrice) } : {}),
        ...(i.quantityInMainUnit != null && Number(i.quantityInMainUnit) >= 0 ? { quantityInMainUnit: Number(i.quantityInMainUnit) } : {}),
      })),
      subtotal: Number(subtotal),
      discount: Number(discount),
      tax: Number(tax),
      totalAmount: Number(totalAmount),
      paidAmount: Number(paidAmount),
      remainingAmount,
      paymentMethod,
      status,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : (existing as any).purchaseDate,
      notes: notes?.trim() || undefined,
      chequeDetails: chequeDetails || undefined,
      updatedAt: new Date(),
    };

    const purchase = await Purchase.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(purchaseId), storeId: normalizedStoreId },
      { $set: purchaseDoc },
      { new: true, session }
    );
    if (!purchase) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Purchase not found.' });
    }

    // Sync supplier payment records with purchase payment type. Payment-at-purchase is stored only on
    // Purchase.paidAmount; SupplierPayment is for standalone vouchers. Remove any payment records
    // linked to this purchase so changing cash→credit correctly increases balance (we owe supplier).
    const SupplierPayment = getSupplierPaymentModelForStore();
    await SupplierPayment.deleteMany(
      { storeId: normalizedStoreId, purchaseId },
      { session }
    );

    for (const item of items) {
      const productId = String(item.productId);
      const displayQty = Number(item.quantity);
      const quantityInMain =
        item.quantityInMainUnit != null && Number(item.quantityInMainUnit) >= 0
          ? Number(item.quantityInMainUnit)
          : displayQty;
      const itemTotalCost = Number(item.totalCost);
      const sellingPriceFromItem =
        item.sellingPrice != null && Number(item.sellingPrice) >= 0 ? Number(item.sellingPrice) : null;
      if (!productId || quantityInMain <= 0) continue;
      const query: any = { storeId: normalizedStoreId };
      if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
        query._id = new mongoose.Types.ObjectId(productId);
      } else {
        query.$or = [{ barcode: productId }, { name: productId }];
      }
      const product = await Product.findOne(query).session(session).lean();
      if (!product) {
        log.warn(`[Purchase] Product not found for stock update: ${productId}`);
        continue;
      }
      const oldStock = Number((product as any).stock) || 0;
      const oldCost = Number((product as any).costPrice) || 0;
      const totalQtyMain = oldStock + quantityInMain;
      const newAverageCost =
        totalQtyMain > 0 ? (oldStock * oldCost + itemTotalCost) / totalQtyMain : itemTotalCost / quantityInMain || 0;
      const setFields: Record<string, number> = { costPrice: newAverageCost };
      if (sellingPriceFromItem !== null) setFields.price = sellingPriceFromItem;
      const updateResult = await Product.findOneAndUpdate(
        query,
        { $inc: { stock: quantityInMain }, $set: setFields },
        { new: true, session }
      );
      if (updateResult) {
        await invalidateAllProductBarcodeCaches(storeId, updateResult);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: 'Purchase invoice updated successfully',
      data: {
        purchase: {
          id: purchase._id.toString(),
          poNumber: purchase.poNumber,
          supplierId: purchase.supplierId,
          supplierName: purchase.supplierName,
          items: purchase.items,
          subtotal: purchase.subtotal,
          discount: purchase.discount,
          tax: purchase.tax,
          totalAmount: purchase.totalAmount,
          paidAmount: purchase.paidAmount,
          remainingAmount: purchase.remainingAmount,
          paymentMethod: purchase.paymentMethod,
          status: purchase.status,
          purchaseDate: purchase.purchaseDate,
          chequeDetails: purchase.chequeDetails,
          notes: purchase.notes,
          createdAt: purchase.createdAt,
          updatedAt: purchase.updatedAt,
        },
      },
    });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    log.error('[Purchase] Update failed', err);
    throw err;
  }
});
