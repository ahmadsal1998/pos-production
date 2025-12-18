import { Response } from 'express';
import { ISale } from '../models/Sale';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { getSaleModelForStore } from '../utils/saleModel';
import { getProductModelForStore } from '../utils/productModel';
import { invalidateAllProductBarcodeCaches } from '../utils/productCache';

/**
 * Get the next sequential invoice number
 */
export const getNextInvoiceNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to get invoice number',
    });
  }

  // Get unified Sale model (all stores use same collection)
  const Sale = await getSaleModelForStore(storeId);

  // Get all sales for this store to find the highest invoice number
  const allSales = await Sale.find({ storeId: storeId.toLowerCase() }).select('invoiceNumber').lean();
  
  let maxNumber = 0;
  
  // Extract numeric part from invoice numbers (format: INV-1, INV-2, etc.)
  for (const sale of allSales) {
    const invoiceNumber = sale.invoiceNumber || '';
    // Match INV- followed by digits
    const match = invoiceNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Next invoice number is maxNumber + 1
  const nextNumber = maxNumber + 1;
  const nextInvoiceNumber = `INV-${nextNumber}`;

  res.status(200).json({
    success: true,
    message: 'Next invoice number retrieved successfully',
    data: {
      invoiceNumber: nextInvoiceNumber,
      number: nextNumber,
    },
  });
});

/**
 * Create a new sale/invoice
 */
export const createSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to create a sale',
    });
  }
  
  const {
    invoiceNumber,
    date,
    customerId,
    customerName,
    items,
    subtotal,
    totalItemDiscount = 0,
    invoiceDiscount = 0,
    tax = 0,
    total,
    paidAmount,
    remainingAmount,
    paymentMethod,
    status,
    seller,
    isReturn = false, // Flag to indicate if this is a return invoice
  } = req.body;

  // Validate required fields
  if (!invoiceNumber || !customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: invoiceNumber, customerName, and items are required',
    });
  }

  // For return invoices, allow negative values; for regular sales, require positive
  if (isReturn) {
    // Return invoices can have negative totals (they represent refunds)
    if (total === undefined || total === null) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required',
      });
    }
  } else {
    // Regular sales must have positive totals
    if (!total || total < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required and must be positive',
      });
    }
  }

  // Validate payment method
  const validPaymentMethods = ['cash', 'card', 'credit'];
  const normalizedPaymentMethod = paymentMethod?.toLowerCase();
  if (!normalizedPaymentMethod || !validPaymentMethods.includes(normalizedPaymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`,
    });
  }

  // Determine status if not provided
  let saleStatus = status;
  if (!saleStatus) {
    if (remainingAmount <= 0) {
      saleStatus = 'completed';
    } else if (paidAmount > 0) {
      saleStatus = 'partial_payment';
    } else {
      saleStatus = 'pending';
    }
  }

  // Get unified Sale model (all stores use same collection)
  const Sale = await getSaleModelForStore(storeId);

  // Check if invoice number already exists for this store
  // Invoice numbers must be unique per store
  const existingSale = await Sale.findOne({
    invoiceNumber,
    storeId: storeId.toLowerCase().trim(),
  });

  if (existingSale) {
    return res.status(409).json({
      success: false,
      message: `Invoice number ${invoiceNumber} already exists`,
    });
  }

  // Create sale record
  const sale = new Sale({
    invoiceNumber,
    storeId: storeId,
    date: date ? new Date(date) : new Date(),
    customerId: customerId || null,
    customerName,
    items: items.map((item: any) => ({
      productId: String(item.productId),
      productName: item.productName || item.name || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.total || 0),
      unit: item.unit || 'قطعة',
      discount: item.discount || 0,
      conversionFactor: item.conversionFactor || 1,
    })),
    subtotal: subtotal || 0,
    totalItemDiscount: totalItemDiscount || 0,
    invoiceDiscount: invoiceDiscount || 0,
    tax: tax || 0,
    total,
    paidAmount: paidAmount || 0,
    remainingAmount: remainingAmount || (total - (paidAmount || 0)),
    paymentMethod: normalizedPaymentMethod,
    status: saleStatus,
    seller: seller || 'Unknown',
  });

  await sale.save();

  // Return response
  res.status(201).json({
    success: true,
    message: 'Sale created successfully',
    data: {
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
    },
  });
});

/**
 * Get all sales with optional filters
 */
export const getSales = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, storeId: queryStoreId, page = 1, limit = 100 } = req.query;

  // Determine which storeId to use
  let targetStoreId: string | null = null;
  
  // Admin users can query any store via storeId query parameter, or all stores if not specified
  if (userRole === 'Admin') {
    if (queryStoreId) {
      targetStoreId = (queryStoreId as string).toLowerCase().trim();
    }
    // If no storeId in query, admin can see all stores (no storeId filter)
  } else {
    // Non-admin users must have a storeId and can only query their own store
    if (!userStoreId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required to access sales',
      });
    }
    targetStoreId = userStoreId.toLowerCase().trim();
  }

  // Get unified Sale model (all stores use same collection)
  // Use user's storeId or targetStoreId for model access (model is unified, but we validate store exists)
  let modelStoreId = userStoreId || targetStoreId;
  if (!modelStoreId) {
    // For admin querying all stores, we still need a storeId to get the model
    // Use the first available store or a default
    const Store = (await import('../models/Store')).default;
    const firstStore = await Store.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: 'No stores available',
      });
    }
    modelStoreId = firstStore.storeId || firstStore.prefix;
  }
  
  // Get the unified Sale model (all stores use the same collection)
  const Sale = await getSaleModelForStore(modelStoreId);

  // Build query - filter by storeId if specified (for non-admin or admin with storeId filter)
  const query: any = {};
  if (targetStoreId) {
    query.storeId = targetStoreId;
  }

  if (customerId) {
    query.customerId = customerId;
  }

  if (status) {
    query.status = status;
  }

  if (paymentMethod) {
    let paymentMethodStr: string;
    if (typeof paymentMethod === 'string') {
      paymentMethodStr = paymentMethod;
    } else if (Array.isArray(paymentMethod) && paymentMethod.length > 0) {
      paymentMethodStr = String(paymentMethod[0]);
    } else {
      paymentMethodStr = String(paymentMethod);
    }
    query.paymentMethod = paymentMethodStr.toLowerCase();
  }

  // Get business day start time setting for date filtering
  let businessDayStartTime: string | undefined;
  if (targetStoreId) {
    const Settings = (await import('../models/Settings')).default;
    const businessDaySetting = await Settings.findOne({
      storeId: targetStoreId,
      key: 'businessdaystarttime'
    });
    if (businessDaySetting && businessDaySetting.value) {
      businessDayStartTime = businessDaySetting.value;
    }
  }

  if (startDate || endDate) {
    // Use business date filtering instead of calendar date filtering
    const { getBusinessDateFilterRange } = await import('../utils/businessDate');
    const { start, end } = getBusinessDateFilterRange(
      startDate as string | null,
      endDate as string | null,
      businessDayStartTime
    );
    
    query.date = {};
    if (start) {
      query.date.$gte = start;
    }
    if (end) {
      query.date.$lte = end;
    }
  }

  // Calculate pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 100;
  const skip = (pageNum - 1) * limitNum;

  // Execute query
  const [sales, total] = await Promise.all([
    Sale.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Sale.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    message: 'Sales retrieved successfully',
    data: {
      sales,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalSales: total,
        limit: limitNum,
        hasNextPage: pageNum * limitNum < total,
        hasPreviousPage: pageNum > 1,
      },
    },
  });
});

/**
 * Get a single sale by ID
 */
export const getSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to access sales',
    });
  }

  // Get unified Sale model (all stores use same collection)
  const Sale = await getSaleModelForStore(storeId);

  // Find sale by ID and ensure it belongs to the user's store
  const sale = await Sale.findOne({
    _id: id,
    storeId: storeId.toLowerCase().trim(),
  });

  if (!sale) {
    return res.status(404).json({
      success: false,
      message: 'Sale not found',
    });
  }

  res.status(200).json({
    success: true,
    data: { sale },
  });
});

/**
 * Update a sale
 */
export const updateSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to update sales',
    });
  }

  // Get unified Sale model (all stores use same collection)
  const Sale = await getSaleModelForStore(storeId);

  // Find sale by ID and ensure it belongs to the user's store
  const sale = await Sale.findOne({
    _id: id,
    storeId: storeId.toLowerCase().trim(),
  });

  if (!sale) {
    return res.status(404).json({
      success: false,
      message: 'Sale not found',
    });
  }

  // Update allowed fields
  const allowedUpdates = [
    'paidAmount',
    'remainingAmount',
    'status',
    'paymentMethod',
  ];

  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      (sale as any)[field] = req.body[field];
    }
  });

  await sale.save();

  res.status(200).json({
    success: true,
    message: 'Sale updated successfully',
    data: { sale },
  });
});

/**
 * Delete a sale
 */
export const deleteSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to delete sales',
    });
  }

  // Get unified Sale model (all stores use same collection)
  const Sale = await getSaleModelForStore(storeId);

  // Find and delete sale by ID, ensuring it belongs to the user's store
  const sale = await Sale.findOneAndDelete({
    _id: id,
    storeId: storeId.toLowerCase().trim(),
  });

  if (!sale) {
    return res.status(404).json({
      success: false,
      message: 'Sale not found',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Sale deleted successfully',
  });
});

/**
 * Process a return transaction
 * This endpoint:
 * 1. Increases product stock by returned quantities
 * 2. Creates a new "Returns" invoice containing the returned items (does NOT modify original invoice)
 * 3. Links the return invoice to the original invoice (optional)
 */
export const processReturn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to process returns',
    });
  }

  const {
    originalInvoiceId, // Optional - for linking purposes
    returnItems, // Array of items being returned: { productId, quantity, unitPrice, etc. }
    reason,
    refundMethod = 'cash',
    seller,
    customerName, // Customer name from frontend
    customerId, // Customer ID from frontend
  } = req.body;

  // Validate required fields
  if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: returnItems are required',
    });
  }

  // Get models
  const Sale = await getSaleModelForStore(storeId);
  const Product = await getProductModelForStore(storeId);

  // Find the original invoice if provided (for validation and linking)
  let originalInvoice = null;
  if (originalInvoiceId) {
    originalInvoice = await Sale.findOne({
      _id: originalInvoiceId,
      storeId: storeId.toLowerCase().trim(),
    });
    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: 'Original invoice not found',
      });
    }
  }

  // Validate refund method
  const validRefundMethods = ['cash', 'card', 'credit'];
  const normalizedRefundMethod = refundMethod?.toLowerCase();
  if (!normalizedRefundMethod || !validRefundMethods.includes(normalizedRefundMethod)) {
    return res.status(400).json({
      success: false,
      message: `Refund method must be one of: ${validRefundMethods.join(', ')}`,
    });
  }

  // Process return items: update stock
  const stockUpdates: Array<{ productId: string; quantity: number; success: boolean; error?: string }> = [];
  const processedReturnItems: any[] = [];

  for (const returnItem of returnItems) {
    const { productId, quantity: returnQuantity } = returnItem;
    
    if (!productId || !returnQuantity || returnQuantity <= 0) {
      stockUpdates.push({
        productId: productId || 'unknown',
        quantity: returnQuantity || 0,
        success: false,
        error: 'Invalid return item: productId and quantity are required',
      });
      continue;
    }

    // If original invoice is provided, validate the return item exists in it
    if (originalInvoice) {
      const originalItem = originalInvoice.items.find(
        item => String(item.productId) === String(productId)
      );

      if (!originalItem) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: 'Product not found in original invoice',
        });
        continue;
      }

      // Validate return quantity doesn't exceed original quantity
      if (returnQuantity > originalItem.quantity) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: `Return quantity (${returnQuantity}) exceeds original quantity (${originalItem.quantity})`,
        });
        continue;
      }
    }

    // Update stock - increase by return quantity
    try {
      const product = await Product.findById(productId);
      if (!product) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: 'Product not found in database',
        });
        continue;
      }

      // Get conversion factor from return item or original invoice item
      let conversionFactor = returnItem.conversionFactor || 1;
      if (originalInvoice) {
        const originalItem = originalInvoice.items.find(
          item => String(item.productId) === String(productId)
        );
        if (originalItem?.conversionFactor) {
          conversionFactor = originalItem.conversionFactor;
        }
      }

      // Calculate stock increase considering conversion factors
      let stockIncrease = returnQuantity;
      
      if (conversionFactor > 1) {
        // If returning in sub-units, convert to base units
        stockIncrease = Math.ceil(returnQuantity / conversionFactor);
      }

      const currentStock = product.stock || 0;
      const newStock = currentStock + stockIncrease;

      const updatedProduct = await Product.findByIdAndUpdate(productId, { stock: newStock }, { new: true });
      
      // Invalidate product cache to ensure POS shows updated quantity
      if (updatedProduct && storeId) {
        await invalidateAllProductBarcodeCaches(storeId, updatedProduct);
      }
      
      stockUpdates.push({
        productId,
        quantity: returnQuantity,
        success: true,
      });

      // Prepare return item for the return invoice
      // Use prices from return item if provided, otherwise from original invoice
      let unitPrice = returnItem.unitPrice;
      let discount = returnItem.discount || 0;
      let productName = returnItem.productName || product.name;
      let unit = returnItem.unit || 'قطعة';

      if (originalInvoice) {
        const originalItem = originalInvoice.items.find(
          item => String(item.productId) === String(productId)
        );
        if (originalItem) {
          unitPrice = unitPrice || originalItem.unitPrice;
          discount = discount || originalItem.discount || 0;
          productName = productName || originalItem.productName;
          unit = unit || originalItem.unit || 'قطعة';
        }
      }

      processedReturnItems.push({
        productId: String(productId),
        productName: productName,
        quantity: returnQuantity,
        unitPrice: unitPrice || 0,
        totalPrice: (unitPrice - discount) * returnQuantity,
        unit: unit,
        discount: discount,
        conversionFactor: conversionFactor,
      });
    } catch (error: any) {
      console.error(`Error updating stock for product ${productId}:`, error);
      stockUpdates.push({
        productId,
        quantity: returnQuantity,
        success: false,
        error: error.message || 'Failed to update stock',
      });
    }
  }

  // Check if all stock updates succeeded
  const failedStockUpdates = stockUpdates.filter(update => !update.success);
  if (failedStockUpdates.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some stock updates failed',
      errors: failedStockUpdates,
    });
  }

  // Check if we have any processed return items
  if (processedReturnItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No valid return items to process',
    });
  }

  // Calculate return invoice totals (will be made negative)
  const returnSubtotal = processedReturnItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const returnTotalItemDiscount = processedReturnItems.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  
  // Calculate tax rate (use from original invoice if available, otherwise 0)
  let taxRate = 0;
  if (originalInvoice && originalInvoice.tax > 0 && originalInvoice.subtotal > 0) {
    const originalTaxableAmount = originalInvoice.subtotal - (originalInvoice.invoiceDiscount || 0);
    if (originalTaxableAmount > 0) {
      taxRate = originalInvoice.tax / originalTaxableAmount;
    }
  }
  
  const returnTaxableAmount = returnSubtotal;
  const returnTax = returnTaxableAmount * taxRate;
  const returnTotal = returnTaxableAmount + returnTax;

  // Determine customer info: use from request, then original invoice, then default
  const finalCustomerName = customerName || originalInvoice?.customerName || 'عميل نقدي';
  const finalCustomerId = customerId || originalInvoice?.customerId || null;

  // Get next sequential invoice number for return (using same format as regular invoices)
  const allSales = await Sale.find({ storeId: storeId.toLowerCase() }).select('invoiceNumber').lean();
  let maxNumber = 0;
  
  // Extract numeric part from invoice numbers (format: INV-1, INV-2, etc.)
  for (const sale of allSales) {
    const invNumber = sale.invoiceNumber || '';
    // Match INV- followed by digits
    const match = invNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  // Next invoice number is maxNumber + 1 (returns use same sequential format)
  const nextNumber = maxNumber + 1;
  const returnInvoiceNumber = `INV-${nextNumber}`;
  
  const returnSale = new Sale({
    invoiceNumber: returnInvoiceNumber,
    storeId: storeId,
    date: new Date(),
    customerId: finalCustomerId,
    customerName: finalCustomerName,
    items: processedReturnItems.map(item => ({
      ...item,
      totalPrice: -item.totalPrice, // Make item totals negative
    })),
    subtotal: -returnSubtotal, // Negative for returns
    totalItemDiscount: -returnTotalItemDiscount, // Negative for returns
    invoiceDiscount: 0,
    tax: -returnTax, // Negative for returns
    total: -returnTotal, // Negative for returns
    paidAmount: -returnTotal, // Negative (refund amount)
    remainingAmount: 0,
    paymentMethod: normalizedRefundMethod,
    status: 'completed',
    seller: seller || originalInvoice?.seller || 'System',
    originalInvoiceId: originalInvoiceId || null, // Optional link to original invoice
    isReturn: true,
  });

  await returnSale.save();

  res.status(201).json({
    success: true,
    message: 'Return processed successfully',
    data: {
      returnInvoice: {
        id: returnSale.id,
        invoiceNumber: returnSale.invoiceNumber,
        invoiceName: 'Returns',
        originalInvoiceId: originalInvoiceId || null,
        date: returnSale.date,
        customerName: returnSale.customerName,
        customerId: returnSale.customerId,
        total: returnSale.total,
        items: returnSale.items,
        subtotal: returnSale.subtotal,
        totalItemDiscount: returnSale.totalItemDiscount,
        invoiceDiscount: returnSale.invoiceDiscount,
        tax: returnSale.tax,
        paidAmount: returnSale.paidAmount,
      },
      stockUpdates,
    },
  });
});
