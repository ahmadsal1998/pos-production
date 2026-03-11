/**
 * Sales service: business logic for invoice numbers, create sale, stock updates.
 * Controllers handle HTTP (validation, call service, format response).
 */

import { log } from '../utils/logger';
import Sequence, { ISequence } from '../models/Sequence';
import { getSaleModelForStore } from '../utils/saleModel';
import { getProductModelForStore } from '../utils/productModel';
import { invalidateAllProductBarcodeCaches } from '../utils/productCache';
import { ProductDocument } from '../models/Product';

/** Exported for use by sales controller in processReturn / createSimpleSale */
export function convertQuantityToMainUnits(
  product: ProductDocument | null,
  unitName: string | undefined,
  quantity: number
): number {
  if (!product || !unitName || quantity <= 0) return quantity;

  const normalizedUnit = unitName.toLowerCase().trim();
  const targetUnit = product.units?.find(
    (u) => !!u.unitName && u.unitName.toLowerCase() === normalizedUnit
  );

  if (!targetUnit) return quantity;

  const hasHierarchicalUnits = product.units?.some(
    (u: any) => u.order !== undefined || u.unitsInPrevious !== undefined
  );

  if (hasHierarchicalUnits) {
    const targetUnitOrder =
      (targetUnit as any).order ??
      product.units?.findIndex((u: any) => u.unitName === targetUnit.unitName) ??
      0;
    const mainUnit = product.units?.find((u: any) => u.order === 0) || product.units?.[0];
    if (!mainUnit || targetUnitOrder === 0) return quantity;

    let conversionFactor = 1;
    const sortedUnits = [...(product.units || [])].sort(
      (a: any, b: any) => (a.order ?? 999) - (b.order ?? 999)
    );
    const targetUnitIndex = sortedUnits.findIndex(
      (u: any) => u.unitName?.toLowerCase() === normalizedUnit
    );
    if (targetUnitIndex > 0) {
      for (let i = targetUnitIndex; i > 0; i--) {
        const currentUnit = sortedUnits[i] as any;
        conversionFactor *= currentUnit.unitsInPrevious || 1;
      }
    }
    return quantity / conversionFactor;
  }

  const conversionFactor = targetUnit.conversionFactor || 1;
  return conversionFactor > 1 ? quantity / conversionFactor : quantity;
}

/** Exported for use by sales controller in processReturn / createSimpleSale */
/** Max invoice number is computed per store (sales filtered by storeId). Uses aggregation for speed (index-friendly). */
export async function getMaxInvoiceNumberFromSales(Sale: any, storeId: string): Promise<number> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  try {
    const invNull = { $ifNull: ['$invoiceNumber', ''] };
    const pipeline: any[] = [
      { $match: { storeId: normalizedStoreId } },
      {
        $addFields: {
          invNum: {
            $let: {
              vars: {
                seq: { $regexFind: { input: invNull, regex: /^INV-(\d+)$/ } },
                legacy: { $regexMatch: { input: invNull, regex: /^INV-\d+-/ } },
              },
              in: {
                $cond: [
                  { $ne: ['$$seq', null] },
                  { $toInt: { $arrayElemAt: ['$$seq.captures', 0] } },
                  { $cond: ['$$legacy', 1000000, 0] },
                ],
              },
            },
          },
        },
      },
      { $group: { _id: null, maxNumber: { $max: '$invNum' } } },
    ];
    const result = await Sale.aggregate(pipeline);
    return result[0]?.maxNumber ?? 0;
  } catch (error) {
    log.error('[Sales Service] Error getting max invoice number from sales', error);
    return 0;
  }
}

/** Next invoice number is generated per store (sequence is keyed by storeId + sequenceType). */
export async function generateNextInvoiceNumber(Sale: any, storeId: string): Promise<string> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  const sequenceType = 'invoiceNumber';

  try {
    const maxExistingNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
    let sequence: ISequence | null = await Sequence.findOne({
      storeId: normalizedStoreId,
      sequenceType,
    });

    if (!sequence) {
      sequence = await Sequence.findOneAndUpdate(
        { storeId: normalizedStoreId, sequenceType },
        { $setOnInsert: { value: maxExistingNumber } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (!sequence) throw new Error('Failed to create sequence');
    }

    if (sequence.value < maxExistingNumber) {
      sequence = await Sequence.findOneAndUpdate(
        { storeId: normalizedStoreId, sequenceType },
        { $set: { value: maxExistingNumber } },
        { new: true }
      );
      if (!sequence) throw new Error('Failed to sync sequence');
    } else if (sequence.value > maxExistingNumber) {
      sequence = await Sequence.findOneAndUpdate(
        { storeId: normalizedStoreId, sequenceType },
        { $set: { value: maxExistingNumber } },
        { new: true }
      );
      if (!sequence) throw new Error('Failed to sync sequence');
    }

    sequence = await Sequence.findOneAndUpdate(
      { storeId: normalizedStoreId, sequenceType },
      { $inc: { value: 1 } },
      { new: true }
    );
    if (!sequence) throw new Error('Failed to increment sequence');
    return `INV-${sequence.value}`;
  } catch (error: any) {
    log.error('[Sales Service] Error generating invoice number, falling back', error);
    try {
      const maxNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
      const nextNumber = maxNumber + 1;
      Sequence.findOneAndUpdate(
        { storeId: normalizedStoreId, sequenceType },
        { $set: { value: nextNumber } },
        { upsert: true }
      ).catch(() => {});
      return `INV-${nextNumber}`;
    } catch (fallbackError) {
      log.error('[Sales Service] Fallback invoice generation failed', fallbackError);
      return `INV-${Date.now()}`;
    }
  }
}

export interface GetCurrentInvoiceNumberResult {
  invoiceNumber: string;
  number: number;
}

export interface GetNextInvoiceNumberResult {
  invoiceNumber: string;
  number: number;
}

export interface CreateSaleInput {
  invoiceNumber: string;
  date?: string;
  customerId?: string;
  customerName: string;
  items: any[];
  subtotal?: number;
  totalItemDiscount?: number;
  invoiceDiscount?: number;
  tax?: number;
  total: number;
  paidAmount?: number;
  remainingAmount?: number;
  paymentMethod: string;
  status?: string;
  seller?: string;
  isReturn?: boolean;
  invoiceType?: 'retail' | 'wholesale';
}

export interface CreateSaleResult {
  sale: {
    id: string;
    invoiceNumber: string;
    date: Date;
    customerName: string;
    customerId?: string;
    total: number;
    paidAmount: number;
    remainingAmount: number;
    paymentMethod: string;
    status: string;
    seller: string;
    items: any[];
    subtotal: number;
    totalItemDiscount: number;
    invoiceDiscount: number;
    tax: number;
  };
  requestedInvoiceNumber: string;
  finalInvoiceNumber: string;
  invoiceAutoAdjusted: boolean;
}

const validPaymentMethods = ['cash', 'card', 'credit'];

export const salesService = {
  async getCurrentInvoiceNumber(storeId: string): Promise<GetCurrentInvoiceNumberResult> {
    const Sale = await getSaleModelForStore(storeId);
    const maxNumber = await getMaxInvoiceNumberFromSales(Sale, storeId);
    const normalizedStoreId = storeId.toLowerCase().trim();
    const sequenceType = 'invoiceNumber';

    const sequence = await Sequence.findOne({
      storeId: normalizedStoreId,
      sequenceType,
    });
    if (sequence) {
      if (sequence.value < maxNumber || sequence.value > maxNumber) {
        Sequence.findOneAndUpdate(
          { storeId: normalizedStoreId, sequenceType },
          { $set: { value: maxNumber } }
        ).catch(() => {});
      }
    }

    const number = maxNumber + 1;
    return { invoiceNumber: `INV-${number}`, number };
  },

  async getNextInvoiceNumber(storeId: string): Promise<GetNextInvoiceNumberResult> {
    const Sale = await getSaleModelForStore(storeId);
    const invoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
    const match = invoiceNumber.match(/^INV-(\d+)$/);
    const number = match ? parseInt(match[1], 10) : 1;
    return { invoiceNumber, number };
  },

  async createSale(storeId: string, body: CreateSaleInput): Promise<CreateSaleResult> {
    const Sale = await getSaleModelForStore(storeId);
    const Product = await getProductModelForStore(storeId);
    const normalizedStoreId = storeId.toLowerCase().trim();
    const normalizedPaymentMethod = (body.paymentMethod || '').toLowerCase();
    if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
      const err = new Error(`Payment method must be one of: ${validPaymentMethods.join(', ')}`) as any;
      err.code = 'INVALID_PAYMENT_METHOD';
      throw err;
    }

    let saleStatus = body.status;
    if (!saleStatus) {
      const remaining = body.remainingAmount ?? (body.total - (body.paidAmount ?? 0));
      if (remaining <= 0) saleStatus = 'completed';
      else if ((body.paidAmount ?? 0) > 0) saleStatus = 'partial_payment';
      else saleStatus = 'pending';
    }

    const itemsWithCostPrice = await Promise.all(
      body.items.map(async (item: any) => {
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
        let costPrice = 0;
        try {
          const mongoose = (await import('mongoose')).default;
          const productId = String(item.productId);
          let product = null;
          if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
            product = await Product.findOne({
              _id: productId,
              storeId: storeId.toLowerCase(),
            })
              .select('costPrice')
              .lean();
          }
          if (!product) {
            product = await Product.findOne({
              id: productId,
              storeId: storeId.toLowerCase(),
            })
              .select('costPrice')
              .lean();
          }
          if (product) costPrice = (product as any).costPrice || 0;
        } catch (e) {
          log.warn(`[Sales Service] Failed to fetch cost price for product ${item.productId}`, e);
        }
        return {
          productId: String(item.productId),
          productName: item.productName || item.name || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.total || 0),
          costPrice,
          unit: item.unit || 'قطعة',
          discount: item.discount || 0,
          conversionFactor: item.conversionFactor || 1,
        };
      })
    );

    const requestedInvoiceNumber = body.invoiceNumber;
    let currentInvoiceNumber = body.invoiceNumber;
    const maxRetries = 3;
    let retryCount = 0;
    let sale: any = null;

    while (retryCount < maxRetries) {
      // Duplicate check is per store: (storeId, invoiceNumber)
      const existingSale = await Sale.findOne({
        storeId: normalizedStoreId,
        invoiceNumber: currentInvoiceNumber,
      });

      if (existingSale) {
        currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
        retryCount++;
        if (retryCount >= maxRetries) {
          const err = new Error(
            `تعارض رقم الفاتورة: استمر التعارض بعد ${maxRetries} محاولات. رقم الفاتورة: ${currentInvoiceNumber}`
          ) as any;
          err.code = 'INVOICE_CONFLICT';
          err.duplicateInvoiceNumber = existingSale.invoiceNumber;
          err.duplicateInvoiceId = existingSale.id;
          throw err;
        }
        continue;
      }

      sale = new Sale({
        invoiceNumber: currentInvoiceNumber,
        storeId: normalizedStoreId,
        date: body.date ? new Date(body.date) : new Date(),
        customerId: body.customerId || null,
        customerName: body.customerName,
        items: itemsWithCostPrice,
        subtotal: body.subtotal || 0,
        totalItemDiscount: body.totalItemDiscount || 0,
        invoiceDiscount: body.invoiceDiscount || 0,
        tax: body.tax || 0,
        total: body.total,
        paidAmount: body.paidAmount || 0,
        remainingAmount: body.remainingAmount ?? body.total - (body.paidAmount || 0),
        paymentMethod: normalizedPaymentMethod,
        status: saleStatus,
        seller: body.seller || 'Unknown',
        invoiceType: body.invoiceType === 'wholesale' ? 'wholesale' : 'retail',
      });

      try {
        await sale.save();
        break;
      } catch (error: any) {
        if (error.code === 11000) {
          currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw new Error(
              `Failed to create sale after ${maxRetries} attempts: Unable to generate unique invoice number`
            );
          }
          continue;
        }
        throw error;
      }
    }

    if (!sale) {
      throw new Error('Failed to create sale: Unable to save after retries');
    }

    const isReturn = !!body.isReturn;
    if (body.items && body.items.length > 0) {
      for (const item of body.items) {
        const productId = item.productId;
        const itemQuantity = item.quantity;
        const itemUnit = item.unit;
        if (!productId || !itemQuantity || itemQuantity <= 0) continue;

        try {
          const mongoose = (await import('mongoose')).default;
          let product: any = null;
          if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
            product = await Product.findOne({
              _id: productId,
              storeId: storeId.toLowerCase(),
            });
          }
          if (!product) {
            product = await Product.findOne({
              id: productId,
              storeId: storeId.toLowerCase(),
            });
          }
          if (!product) {
            log.warn(`[Sales Service] Product not found for stock update: ${productId}`);
            continue;
          }

          const unit = itemUnit || 'قطعة';
          let stockChange: number;
          if (product.units && product.units.length > 0) {
            stockChange = convertQuantityToMainUnits(product, unit, itemQuantity);
          } else if (item.conversionFactor && item.conversionFactor > 1) {
            stockChange = itemQuantity / item.conversionFactor;
          } else {
            stockChange = itemQuantity;
          }

          const currentStock = product.stock || 0;
          const newStock = isReturn
            ? currentStock + stockChange
            : Math.max(0, currentStock - stockChange);

          await Product.findByIdAndUpdate(
            product._id,
            { stock: newStock },
            { new: true }
          );
          await invalidateAllProductBarcodeCaches(storeId, product);
        } catch (error: any) {
          log.error(`[Sales Service] Error updating stock for product ${productId}:`, error);
        }
      }
    }

    return {
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
      requestedInvoiceNumber,
      finalInvoiceNumber: sale.invoiceNumber,
      invoiceAutoAdjusted: sale.invoiceNumber !== requestedInvoiceNumber,
    };
  },

  /**
   * Update an existing sale: revert stock for old items, update document with new items/totals, apply stock for new items.
   */
  async updateSale(
    storeId: string,
    saleId: string,
    body: {
      items?: any[];
      subtotal?: number;
      totalItemDiscount?: number;
      invoiceDiscount?: number;
      tax?: number;
      total?: number;
      customerId?: string;
      customerName?: string;
      seller?: string;
      paidAmount?: number;
      remainingAmount?: number;
      paymentMethod?: string;
      status?: string;
      date?: string;
      invoiceType?: 'retail' | 'wholesale';
    }
  ): Promise<{ sale: any }> {
    const mongoose = (await import('mongoose')).default;
    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      const err = new Error('Invalid sale ID') as any;
      err.statusCode = 400;
      throw err;
    }

    const Sale = await getSaleModelForStore(storeId);
    const Product = await getProductModelForStore(storeId);
    const normalizedStoreId = storeId.toLowerCase().trim();

    const existing = await Sale.findOne({
      _id: new mongoose.Types.ObjectId(saleId),
      storeId: normalizedStoreId,
    });
    if (!existing) {
      const err = new Error('Sale not found') as any;
      err.statusCode = 404;
      throw err;
    }

    const existingSale = existing as any;
    const oldItems = existingSale.items || [];
    const isReturn = !!existingSale.isReturn;

    // 1. Revert stock for old items (reverse what create did: add back for normal sale, subtract for return)
    for (const item of oldItems) {
      const productId = item.productId;
      const itemQuantity = item.quantity;
      const itemUnit = item.unit;
      if (!productId || itemQuantity == null || itemQuantity <= 0) continue;
      try {
        let product: any = null;
        if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
          product = await Product.findOne({ _id: productId, storeId: normalizedStoreId });
        }
        if (!product) {
          product = await Product.findOne({ id: productId, storeId: normalizedStoreId });
        }
        if (!product) {
          log.warn(`[Sales Service] Update revert: product not found: ${productId}`);
          continue;
        }
        const unit = itemUnit || 'قطعة';
        let stockChange: number;
        if (product.units && product.units.length > 0) {
          stockChange = convertQuantityToMainUnits(product, unit, itemQuantity);
        } else if (item.conversionFactor && item.conversionFactor > 1) {
          stockChange = itemQuantity / item.conversionFactor;
        } else {
          stockChange = itemQuantity;
        }
        const currentStock = product.stock || 0;
        const newStock = isReturn
          ? Math.max(0, currentStock - stockChange)
          : currentStock + stockChange;
        await Product.findByIdAndUpdate(product._id, { stock: newStock }, { new: true });
        await invalidateAllProductBarcodeCaches(storeId, product);
      } catch (error: any) {
        log.error(`[Sales Service] Update revert stock error for ${productId}:`, error);
      }
    }

    // 2. If full body with items provided, update document with new items and totals
    const hasItems = body.items && Array.isArray(body.items) && body.items.length > 0;
    const normalizedPaymentMethod = ((body.paymentMethod ?? existingSale.paymentMethod) || 'cash').toLowerCase();
    if (!validPaymentMethods.includes(normalizedPaymentMethod)) {
      const err = new Error(`Payment method must be one of: ${validPaymentMethods.join(', ')}`) as any;
      err.code = 'INVALID_PAYMENT_METHOD';
      throw err;
    }

    let saleStatus = body.status ?? existingSale.status;
    if (body.remainingAmount !== undefined || body.paidAmount !== undefined) {
      const remaining = body.remainingAmount ?? (body.total ?? existingSale.total) - (body.paidAmount ?? existingSale.paidAmount ?? 0);
      if (remaining <= 0) saleStatus = 'completed';
      else if ((body.paidAmount ?? existingSale.paidAmount ?? 0) > 0) saleStatus = 'partial_payment';
      else saleStatus = 'pending';
    }

    const updateFields: any = {
      paidAmount: body.paidAmount !== undefined ? body.paidAmount : existingSale.paidAmount,
      remainingAmount: body.remainingAmount !== undefined ? body.remainingAmount : existingSale.remainingAmount,
      status: saleStatus,
      paymentMethod: normalizedPaymentMethod,
      updatedAt: new Date(),
    };
    if (body.customerId !== undefined) updateFields.customerId = body.customerId;
    if (body.customerName !== undefined) updateFields.customerName = body.customerName;
    if (body.seller !== undefined) updateFields.seller = body.seller;
    if (body.date !== undefined) updateFields.date = new Date(body.date);
    if (body.invoiceType !== undefined) updateFields.invoiceType = body.invoiceType === 'wholesale' ? 'wholesale' : 'retail';

    if (hasItems) {
      const itemsWithCostPrice = await Promise.all(
        (body.items as any[]).map(async (item: any) => {
          const costPrice = item.costPrice !== undefined && item.costPrice != null
            ? Number(item.costPrice)
            : 0;
          return {
            productId: String(item.productId),
            productName: item.productName || item.name || '',
            quantity: item.quantity || 0,
            unitPrice: item.unitPrice || 0,
            totalPrice: item.totalPrice ?? (item.total ?? 0),
            costPrice: costPrice || 0,
            unit: item.unit || 'قطعة',
            discount: item.discount || 0,
            conversionFactor: item.conversionFactor || 1,
          };
        })
      );
      updateFields.items = itemsWithCostPrice;
      updateFields.subtotal = body.subtotal ?? 0;
      updateFields.totalItemDiscount = body.totalItemDiscount ?? 0;
      updateFields.invoiceDiscount = body.invoiceDiscount ?? 0;
      updateFields.tax = body.tax ?? 0;
      updateFields.total = body.total ?? 0;
    }

    Object.assign(existingSale, updateFields);
    await existingSale.save();

    // 3. Apply stock for new items (if items were updated)
    if (hasItems && body.items && body.items.length > 0) {
      for (const item of body.items as any[]) {
        const productId = item.productId;
        const itemQuantity = item.quantity;
        const itemUnit = item.unit;
        if (!productId || !itemQuantity || itemQuantity <= 0) continue;
        try {
          let product: any = null;
          if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
            product = await Product.findOne({ _id: productId, storeId: normalizedStoreId });
          }
          if (!product) {
            product = await Product.findOne({ id: productId, storeId: normalizedStoreId });
          }
          if (!product) {
            log.warn(`[Sales Service] Update apply: product not found: ${productId}`);
            continue;
          }
          const unit = itemUnit || 'قطعة';
          let stockChange: number;
          if (product.units && product.units.length > 0) {
            stockChange = convertQuantityToMainUnits(product, unit, itemQuantity);
          } else if (item.conversionFactor && item.conversionFactor > 1) {
            stockChange = itemQuantity / item.conversionFactor;
          } else {
            stockChange = itemQuantity;
          }
          const currentStock = product.stock || 0;
          const newStock = isReturn
            ? currentStock + stockChange
            : Math.max(0, currentStock - stockChange);
          await Product.findByIdAndUpdate(product._id, { stock: newStock }, { new: true });
          await invalidateAllProductBarcodeCaches(storeId, product);
        } catch (error: any) {
          log.error(`[Sales Service] Update apply stock error for ${productId}:`, error);
        }
      }
    }

    return {
      sale: {
        id: existingSale._id.toString(),
        invoiceNumber: existingSale.invoiceNumber,
        date: existingSale.date,
        customerName: existingSale.customerName,
        customerId: existingSale.customerId,
        total: existingSale.total,
        paidAmount: existingSale.paidAmount,
        remainingAmount: existingSale.remainingAmount,
        paymentMethod: existingSale.paymentMethod,
        status: existingSale.status,
        seller: existingSale.seller,
        items: existingSale.items,
        subtotal: existingSale.subtotal,
        totalItemDiscount: existingSale.totalItemDiscount,
        invoiceDiscount: existingSale.invoiceDiscount,
        tax: existingSale.tax,
      },
    };
  },
};
