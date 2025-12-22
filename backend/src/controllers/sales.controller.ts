import { Response, Request } from 'express';
import { ISale } from '../models/Sale';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { getSaleModelForStore } from '../utils/saleModel';
import { getProductModelForStore } from '../utils/productModel';
import { invalidateAllProductBarcodeCaches } from '../utils/productCache';
import Settings from '../models/Settings';
import { getBusinessDateFilterRange } from '../utils/businessDate';
import { log } from '../utils/logger';

/**
 * Helper function to generate the next invoice number for a store
 * Uses efficient aggregation query to find max invoice number
 */
async function generateNextInvoiceNumber(Sale: any, storeId: string): Promise<string> {
  const normalizedStoreId = storeId.toLowerCase().trim();
  
  try {
    // Use aggregation to efficiently find the maximum invoice number
    // Get all invoice numbers for this store, then process in memory for compatibility
    const sales = await Sale.find({ storeId: normalizedStoreId })
      .select('invoiceNumber')
      .lean()
      .limit(10000); // Reasonable limit to prevent memory issues
    
    let maxNumber = 0;
    
    // Extract numeric part from invoice numbers (format: INV-1, INV-2, etc.)
    for (const sale of sales) {
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
    return `INV-${nextNumber}`;
  } catch (error) {
    log.error('[Sales Controller] Error generating invoice number, using fallback', error);
    // Fallback: return a timestamp-based invoice number if query fails
    const timestamp = Date.now();
    return `INV-${timestamp}`;
  }
}

/**
 * Get the next sequential invoice number
 * Uses aggregation for better performance
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
  const nextInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
  
  // Extract number for response
  const match = nextInvoiceNumber.match(/^INV-(\d+)$/);
  const number = match ? parseInt(match[1], 10) : 1;

  res.status(200).json({
    success: true,
    message: 'Next invoice number retrieved successfully',
    data: {
      invoiceNumber: nextInvoiceNumber,
      number: number,
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

  // Fetch cost prices for items if not provided
  // This ensures accurate net profit calculation
  const Product = await getProductModelForStore(storeId);
  const itemsWithCostPrice = await Promise.all(
    items.map(async (item: any) => {
      // If costPrice is already provided, use it
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

      // Otherwise, fetch from product
      let costPrice = 0;
      try {
        const productId = String(item.productId);
        // Try to find product by _id (ObjectId) or by id field
        const mongoose = (await import('mongoose')).default;
        let product = null;

        if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
          product = await Product.findOne({
            _id: productId,
            storeId: storeId.toLowerCase(),
          }).select('costPrice').lean();
        }

        if (!product) {
          // Try finding by custom id field
          product = await Product.findOne({
            id: productId,
            storeId: storeId.toLowerCase(),
          }).select('costPrice').lean();
        }

        if (product) {
          costPrice = product.costPrice || 0;
        }
      } catch (error) {
        log.warn(`[Sales Controller] Failed to fetch cost price for product ${item.productId}`, error);
        // Continue with costPrice = 0 if fetch fails
      }

      return {
        productId: String(item.productId),
        productName: item.productName || item.name || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || (item.total || 0),
        costPrice: costPrice,
        unit: item.unit || 'قطعة',
        discount: item.discount || 0,
        conversionFactor: item.conversionFactor || 1,
      };
    })
  );

  // Normalize storeId
  const normalizedStoreId = storeId.toLowerCase().trim();
  
  // Create sale record with retry logic for duplicate invoice numbers
  let currentInvoiceNumber = invoiceNumber;
  let retryCount = 0;
  const maxRetries = 3;
  let sale: any = null;

  while (retryCount < maxRetries) {
    try {
      // Check if invoice number already exists for this store (before attempting save)
      const existingSale = await Sale.findOne({
        invoiceNumber: currentInvoiceNumber,
        storeId: normalizedStoreId,
      });

      if (existingSale) {
        // Invoice number exists, generate a new one
        log.warn(`[Sales Controller] Invoice number ${currentInvoiceNumber} already exists, generating new number`);
        currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
        retryCount++;
        continue;
      }

      // Create sale record with current invoice number
      sale = new Sale({
        invoiceNumber: currentInvoiceNumber,
        storeId: normalizedStoreId,
        date: date ? new Date(date) : new Date(),
        customerId: customerId || null,
        customerName,
        items: itemsWithCostPrice,
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

      // Attempt to save
      await sale.save();
      
      // Success - break out of retry loop
      break;
    } catch (error: any) {
      // Check if this is a duplicate key error (E11000)
      if (error.code === 11000) {
        // Duplicate key error - generate new invoice number and retry
        log.warn(`[Sales Controller] Duplicate key error for invoice ${currentInvoiceNumber}, generating new number`);
        currentInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Max retries reached
          throw new Error(`Failed to create sale after ${maxRetries} attempts: Unable to generate unique invoice number`);
        }
        // Continue to retry
        continue;
      } else {
        // Different error - rethrow
        throw error;
      }
    }
  }

  if (!sale) {
    throw new Error('Failed to create sale: Unable to save after retries');
  }

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
  const { startDate, endDate, customerId, status, paymentMethod, seller, storeId: queryStoreId, page = 1, limit = 100 } = req.query;

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
  let query: any = {};
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

  if (seller && seller !== 'all') {
    query.seller = seller;
  }

  // Get business day start time and timezone settings for date filtering
  // Use modelStoreId (which is always available) to retrieve settings
  // This ensures settings are retrieved even for admin queries without a specific storeId
  let businessDayStartTime: string | undefined;
  let businessDayTimezone: string | undefined;
  
  // Determine which storeId to use for settings retrieval
  const settingsStoreId = targetStoreId || modelStoreId;
  
  if (settingsStoreId) {
    const [businessDaySetting, timezoneSetting] = await Promise.all([
      Settings.findOne({
        storeId: settingsStoreId,
        key: 'businessdaystarttime'
      }),
      Settings.findOne({
        storeId: settingsStoreId,
        key: 'businessdaytimezone'
      })
    ]);
    if (businessDaySetting && businessDaySetting.value) {
      businessDayStartTime = businessDaySetting.value;
    }
    if (timezoneSetting && timezoneSetting.value) {
      businessDayTimezone = timezoneSetting.value;
    }
  }

  // Track if we're using date filtering and if we should try fallback
  let usingDateFilter = false;
  let businessDateQuery: any = null;
  
  if (startDate || endDate) {
    usingDateFilter = true;
    // Use business date filtering instead of calendar date filtering
    // This now uses timezone-aware calculations to properly handle business days
    
    const { start, end } = getBusinessDateFilterRange(
      startDate as string | null,
      endDate as string | null,
      businessDayStartTime,
      businessDayTimezone
    );
    
    // Store the business date query for potential fallback
    businessDateQuery = { ...query };
    businessDateQuery.date = {};
    if (start) {
      businessDateQuery.date.$gte = start;
    }
    if (end) {
      businessDateQuery.date.$lte = end;
    }
    
    query.date = businessDateQuery.date;
  }

  // Calculate pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 100;
  const skip = (pageNum - 1) * limitNum;
  
  // Execute query with business date filtering
  let [sales, total] = await Promise.all([
    Sale.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Sale.countDocuments(query),
  ]);
  
  // If business date filtering returned 0 results but we have date filters,
  // try simple calendar date filtering as a fallback
  if (usingDateFilter && total === 0 && (startDate || endDate)) {
    // Build calendar query preserving all other filters (storeId, customerId, status, etc.)
    const calendarQuery: any = {};
    
    // Copy all non-date filters from the original query
    Object.keys(query).forEach(key => {
      if (key !== 'date') {
        calendarQuery[key] = query[key];
      }
    });
    
    // Apply simple calendar date filtering
    calendarQuery.date = {};
    if (startDate) {
      const startDateObj = new Date(startDate as string);
      startDateObj.setHours(0, 0, 0, 0);
      calendarQuery.date.$gte = startDateObj;
    }
    if (endDate) {
      const endDateObj = new Date(endDate as string);
      endDateObj.setHours(23, 59, 59, 999);
      calendarQuery.date.$lte = endDateObj;
    }
    
    // Retry query with calendar date filtering
    const [calendarSales, calendarTotal] = await Promise.all([
      Sale.find(calendarQuery)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments(calendarQuery),
    ]);
    
    if (calendarTotal > 0) {
      log.warn('[Sales Controller] Business date filtering returned 0 results, using calendar date filtering fallback');
      sales = calendarSales;
      total = calendarTotal;
      query = calendarQuery; // Update query for consistency
    }
  }

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
 * Get sales summary/statistics (fast aggregation query)
 * Returns summary metrics without loading all sales data
 */
export const getSalesSummary = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, storeId: queryStoreId } = req.query;

  // Determine which storeId to use
  let targetStoreId: string | null = null;
  
  if (userRole === 'Admin') {
    if (queryStoreId) {
      targetStoreId = (queryStoreId as string).toLowerCase().trim();
    }
  } else {
    if (!userStoreId) {
      return res.status(400).json({
        success: false,
        message: 'Store ID is required to access sales',
      });
    }
    targetStoreId = userStoreId.toLowerCase().trim();
  }

  // Get unified Sale model
  let modelStoreId = userStoreId || targetStoreId;
  if (!modelStoreId) {
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
  
  const Sale = await getSaleModelForStore(modelStoreId);

  // Build query (same as getSales but without pagination)
  const query: any = {};
  if (targetStoreId) {
    query.storeId = targetStoreId;
  }

  if (customerId) {
    // Validate customerId is not 'all' or empty string
    const customerIdStr = String(customerId).trim();
    if (customerIdStr && customerIdStr !== 'all' && customerIdStr !== '') {
      query.customerId = customerIdStr;
    }
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

  // Get business day start time and timezone settings for date filtering
  let businessDayStartTime: string | undefined;
  let businessDayTimezone: string | undefined;
  const settingsStoreId = targetStoreId || modelStoreId;
  
  if (settingsStoreId) {
    const [businessDaySetting, timezoneSetting] = await Promise.all([
      Settings.findOne({
        storeId: settingsStoreId,
        key: 'businessdaystarttime'
      }),
      Settings.findOne({
        storeId: settingsStoreId,
        key: 'businessdaytimezone'
      })
    ]);
    if (businessDaySetting && businessDaySetting.value) {
      businessDayStartTime = businessDaySetting.value;
    }
    if (timezoneSetting && timezoneSetting.value) {
      businessDayTimezone = timezoneSetting.value;
    }
  }

  if (startDate || endDate) {
    const { start, end } = getBusinessDateFilterRange(
      startDate as string | null,
      endDate as string | null,
      businessDayStartTime,
      businessDayTimezone
    );
    
    query.date = {};
    if (start) {
      query.date.$gte = start;
    }
    if (end) {
      query.date.$lte = end;
    }
  }

  // Sanitize query to prevent CastErrors - ensure all values are in correct format
  const sanitizedQuery: any = {};
  if (query.storeId) {
    sanitizedQuery.storeId = String(query.storeId).toLowerCase().trim();
  }
  if (query.customerId) {
    sanitizedQuery.customerId = String(query.customerId).trim();
  }
  if (query.status) {
    sanitizedQuery.status = String(query.status).trim();
  }
  if (query.paymentMethod) {
    sanitizedQuery.paymentMethod = String(query.paymentMethod).toLowerCase().trim();
  }
  if (query.date) {
    // Ensure date range is valid
    if (query.date.$gte && query.date.$gte instanceof Date) {
      sanitizedQuery.date = { ...query.date };
    } else if (query.date.$gte || query.date.$lte) {
      sanitizedQuery.date = {};
      if (query.date.$gte) {
        sanitizedQuery.date.$gte = query.date.$gte instanceof Date ? query.date.$gte : new Date(query.date.$gte);
      }
      if (query.date.$lte) {
        sanitizedQuery.date.$lte = query.date.$lte instanceof Date ? query.date.$lte : new Date(query.date.$lte);
      }
    }
  }

  // Use MongoDB aggregation for fast summary calculation
  const summaryPipeline: any[] = [
    { $match: sanitizedQuery },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$total' },
        totalPayments: { $sum: '$paidAmount' },
        invoiceCount: { $sum: 1 },
        creditSales: {
          $sum: {
            $cond: [{ $eq: ['$paymentMethod', 'credit'] }, '$total', 0]
          }
        },
      }
    }
  ];

  let summaryResult: any[] = [];
  try {
    summaryResult = await Sale.aggregate(summaryPipeline);
  } catch (aggregationError: any) {
    log.error('[Sales Controller] Error in aggregation pipeline', aggregationError, {
      query: sanitizedQuery,
      originalQuery: query,
    });
    // If aggregation fails, return empty summary instead of failing the request
    summaryResult = [];
  }

  const summary = summaryResult[0] || {
    totalSales: 0,
    totalPayments: 0,
    invoiceCount: 0,
    creditSales: 0,
  };

  // Calculate net profit: totalSales - totalCost
  // Use efficient aggregation with product lookup
  // If calculation fails, return 0 without failing the entire request
  let netProfit = 0;
  try {
    const Product = await getProductModelForStore(modelStoreId);

    // First, get all unique product IDs from sales items (efficient)
    // Use sanitizedQuery to ensure consistency and prevent CastErrors
    const productIdsPipeline: any[] = [
      { $match: sanitizedQuery },
      { $unwind: '$items' },
      { $group: { _id: '$items.productId' } }
    ];

    const productIdsResult = await Sale.aggregate(productIdsPipeline);
    // Handle both ObjectId and string productIds
    const productIds = productIdsResult
      .map((p: any) => p._id)
      .filter(Boolean)
      .map((id: any) => {
        // Convert ObjectId to string if needed
        return id.toString ? id.toString() : String(id);
      });

    if (productIds.length > 0) {
      // Import mongoose for ObjectId conversion
      const mongoose = (await import('mongoose')).default;
      
      // Safely convert string IDs to ObjectIds for query (only valid ObjectIds)
      const objectIdProductIds: any[] = [];
      const stringProductIds: string[] = [];
      
      productIds.forEach((id: string) => {
        if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
          try {
            objectIdProductIds.push(new mongoose.Types.ObjectId(id));
          } catch (e) {
            // If ObjectId creation fails, treat as string
            stringProductIds.push(id);
          }
        } else {
          // Not a valid ObjectId format, treat as string
          stringProductIds.push(id);
        }
      });

      // Build query conditions - handle both ObjectId and string/number IDs
      const queryConditions: any[] = [];
      
      if (objectIdProductIds.length > 0) {
        queryConditions.push({ _id: { $in: objectIdProductIds } });
      }
      
      if (stringProductIds.length > 0) {
        // For non-ObjectId IDs, try to find by custom 'id' field if it exists
        // Don't query _id with strings as it will cause CastError
        queryConditions.push({ id: { $in: stringProductIds } });
      }

      // Fetch products in batch (fast)
      // If no valid conditions, skip product lookup (net profit will be 0)
      let products: any[] = [];
      if (queryConditions.length > 0) {
        try {
          // Additional validation: ensure all ObjectIds are valid before querying
          const validObjectIdConditions = objectIdProductIds.filter((oid: any) => {
            try {
              return oid && oid.toString && oid.toString().length === 24;
            } catch {
              return false;
            }
          });
          
          const finalQueryConditions: any[] = [];
          if (validObjectIdConditions.length > 0) {
            finalQueryConditions.push({ _id: { $in: validObjectIdConditions } });
          }
          if (stringProductIds.length > 0) {
            finalQueryConditions.push({ id: { $in: stringProductIds } });
          }
          
          if (finalQueryConditions.length > 0) {
            products = await Product.find({
              storeId: (targetStoreId || modelStoreId).toLowerCase(),
              $or: finalQueryConditions
            }).select('_id id costPrice').lean();
          }
        } catch (queryError: any) {
          log.error('[Sales Controller] Error querying products for net profit', queryError, {
            queryConditions,
            stack: queryError.stack
          });
          // If query fails, products array stays empty, net profit will be 0
        }
      }

      // Create cost price map for fast lookup (support both ObjectId and string keys)
      // Store multiple ID variants for each product to ensure matching
      const costPriceMap = new Map<string, number>();
      products.forEach((p: any) => {
        const costPrice = p.costPrice || 0;
        const idObj = p._id || p.id;
        
        if (idObj) {
          // Store multiple ID format variants for flexible matching
          const idStr = idObj.toString ? idObj.toString() : String(idObj);
          costPriceMap.set(idStr, costPrice);
          
          // Also store as ObjectId string if it's an ObjectId
          if (idObj.toString && idObj.toString().length === 24) {
            costPriceMap.set(idObj.toString(), costPrice);
          }
          
          // Store numeric version if applicable
          if (typeof idObj === 'number' || !isNaN(Number(idStr))) {
            costPriceMap.set(String(Number(idStr)), costPrice);
          }
        }
      });

      // Calculate total cost in memory (simpler and efficient)
      // Use sanitizedQuery to ensure consistency and prevent CastErrors
      // Note: We need to select 'total' field to detect returns by sign
      const salesWithItems = await Sale.find(sanitizedQuery).select('items isReturn total').lean();
      let totalCost = 0;
      
      salesWithItems.forEach((sale: any) => {
        // Detect return by checking isReturn flag OR by negative total
        // This ensures we catch returns even if isReturn flag is missing
        const saleIsReturn = sale.isReturn || (sale.total && sale.total < 0);
        
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item: any) => {
            // Use actual quantity (negative for returns, positive for sales)
            // This ensures correct cost calculation for returns
            const quantity = item.quantity || 0;
            const absQuantity = Math.abs(quantity);
            
            // Detect return at item level: sale is return OR quantity is negative
            // This provides multiple layers of detection for accuracy
            const isReturn = saleIsReturn || quantity < 0;
            
            // First, try to use costPrice stored in the sale item (fastest and most accurate)
            if (item.costPrice !== undefined && item.costPrice !== null) {
              const itemCost = (item.costPrice || 0) * absQuantity;
              // For returns, subtract cost (we're getting the cost back, so it reduces our cost)
              // For sales, add cost (we're spending the cost, so it increases our cost)
              totalCost += isReturn ? -itemCost : itemCost;
              return;
            }
            
            // Fallback: Look up cost price from product map (for backward compatibility with old sales)
            const itemProductId = item.productId;
            if (!itemProductId) return;
            
            // Try multiple ID formats for matching
            const productIdVariants = [
              String(itemProductId),
              itemProductId.toString ? itemProductId.toString() : String(itemProductId),
              typeof itemProductId === 'number' ? String(itemProductId) : null
            ].filter(Boolean) as string[];
            
            // Find matching cost price from map
            let costPrice = 0;
            for (const variant of productIdVariants) {
              if (costPriceMap.has(variant)) {
                costPrice = costPriceMap.get(variant)!;
                break;
              }
            }
            
            const itemCost = costPrice * absQuantity;
            // For returns, subtract cost (we're getting the cost back, so it reduces our cost)
            // For sales, add cost (we're spending the cost, so it increases our cost)
            totalCost += isReturn ? -itemCost : itemCost;
          });
        }
      });

      // Net profit = Total Sales (which includes negative returns) - Total Cost (which includes negative returns)
      // This formula correctly handles both sales and returns
      netProfit = (summary.totalSales || 0) - totalCost;
    }
  } catch (error: any) {
    log.error('[Sales Controller] Error calculating net profit', error);
    // If net profit calculation fails, set to 0 (don't fail the whole request)
    // This ensures summary still returns successfully even if net profit can't be calculated
    netProfit = 0;
  }

  res.status(200).json({
    success: true,
    message: 'Sales summary retrieved successfully',
    data: {
      totalSales: summary.totalSales || 0,
      totalPayments: summary.totalPayments || 0,
      invoiceCount: summary.invoiceCount || 0,
      creditSales: summary.creditSales || 0,
      remainingAmount: (summary.totalSales || 0) - (summary.totalPayments || 0),
      netProfit: netProfit,
    },
  });
});

/**
 * Get a single sale by ID
 */
export const getSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
  const mongoose = (await import('mongoose')).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

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

  // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
  const mongoose = (await import('mongoose')).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

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

  // Validate ID format - prevent route conflicts (e.g., "summary" being treated as ID)
  const mongoose = (await import('mongoose')).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

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
      log.error(`Error updating stock for product ${productId}`, error);
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
  // Use the helper function to ensure consistency and prevent duplicates
  const returnInvoiceNumber = await generateNextInvoiceNumber(Sale, storeId);
  
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

/**
 * Public endpoint to get invoice by invoice number (no authentication required)
 * Used for QR code invoice viewing
 */
export const getPublicInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { invoiceNumber, storeId } = req.query;

  if (!invoiceNumber || typeof invoiceNumber !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Invoice number is required',
    });
  }

  try {
    // Normalize invoice number (trim whitespace)
    const normalizedInvoiceNumber = invoiceNumber.trim();
    
    let Sale: any;
    
    // If storeId is provided, use it to get the model
    if (storeId && typeof storeId === 'string') {
      Sale = await getSaleModelForStore(storeId.toLowerCase().trim());
    } else {
      // Otherwise, get model from first available store
      const Store = (await import('../models/Store')).default;
      const firstStore = await Store.findOne().lean();
      if (!firstStore) {
        return res.status(400).json({
          success: false,
          message: 'No stores available',
        });
      }
      const modelStoreId = firstStore.storeId || firstStore.prefix;
      Sale = await getSaleModelForStore(modelStoreId);
    }

    // Build query with normalized invoice number
    const query: any = { invoiceNumber: normalizedInvoiceNumber };
    if (storeId && typeof storeId === 'string') {
      query.storeId = storeId.toLowerCase().trim();
    }

    log.debug('[getPublicInvoice] Searching for invoice:', { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });

    // Find invoice by invoice number
    const sale = await Sale.findOne(query).lean();

    if (!sale) {
      log.warn('[getPublicInvoice] Invoice not found:', { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    log.debug('[getPublicInvoice] Invoice found:', { invoiceNumber: sale.invoiceNumber, saleId: sale._id });

    // Return invoice data
    res.status(200).json({
      success: true,
      data: {
        sale: {
          id: sale._id,
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customerName: sale.customerName,
          customerId: sale.customerId,
          items: sale.items,
          subtotal: sale.subtotal,
          totalItemDiscount: sale.totalItemDiscount,
          invoiceDiscount: sale.invoiceDiscount,
          tax: sale.tax,
          total: sale.total,
          totalAmount: sale.total,
          paidAmount: sale.paidAmount,
          remainingAmount: sale.remainingAmount,
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          seller: sale.seller,
          originalInvoiceId: sale.originalInvoiceId,
          isReturn: sale.isReturn,
        },
      },
    });
  } catch (error: any) {
    log.error('Error fetching public invoice:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice',
    });
  }
});
