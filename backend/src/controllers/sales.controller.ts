import { Response, Request, NextFunction } from 'express';
import { ISale } from '../models/Sale';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { getSaleModelForStore } from '../utils/saleModel';
import { getProductModelForStore } from '../utils/productModel';
import { invalidateAllProductBarcodeCaches } from '../utils/productCache';
import Settings from '../models/Settings';
import { getBusinessDateFilterRange } from '../utils/businessDate';
import { log } from '../utils/logger';
import Store from '../models/Store';
import { getCustomerModelForStore } from '../utils/customerModel';
import { getCustomerPaymentModelForStore } from '../utils/customerPaymentModel';
import GlobalCustomer from '../models/GlobalCustomer';
import PointsSettings from '../models/PointsSettings';
import PointsBalance from '../models/PointsBalance';
import PointsTransaction from '../models/PointsTransaction';
import StorePointsAccount from '../models/StorePointsAccount';
import {
  salesService,
  convertQuantityToMainUnits,
  generateNextInvoiceNumber,
} from '../services/sales.service';

/**
 * Get the current invoice number without incrementing (HTTP layer).
 * Business logic lives in salesService.
 */
export const getCurrentInvoiceNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to get invoice number',
    });
  }
  const data = await salesService.getCurrentInvoiceNumber(storeId);
  return res.status(200).json({
    success: true,
    message: 'Current invoice number retrieved successfully',
    data: {
      invoiceNumber: data.invoiceNumber,
      number: data.number,
    },
  });
});

/**
 * Get the next sequential invoice number (HTTP layer).
 * Business logic lives in salesService.
 */
export const getNextInvoiceNumber = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to get invoice number',
    });
  }
  const data = await salesService.getNextInvoiceNumber(storeId);
  return res.status(200).json({
    success: true,
    message: 'Next invoice number retrieved successfully',
    data: {
      invoiceNumber: data.invoiceNumber,
      number: data.number,
    },
  });
});

/**
 * Create a new sale/invoice (HTTP layer: validation, call service, format response).
 * Business logic lives in salesService.
 */
export const createSale = asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const storeId = req.user?.storeId || null;
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
    isReturn = false,
    invoiceType,
  } = req.body;

  if (!invoiceNumber || !customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: invoiceNumber, customerName, and items are required',
    });
  }

  if (isReturn) {
    if (total === undefined || total === null) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required',
      });
    }
  } else {
    if (!total || total < 0) {
      return res.status(400).json({
        success: false,
        message: 'Total amount is required and must be positive',
      });
    }
  }

  try {
    const result = await salesService.createSale(storeId, {
      invoiceNumber,
      date,
      customerId,
      customerName,
      items,
      subtotal,
      totalItemDiscount,
      invoiceDiscount,
      tax,
      total,
      paidAmount,
      remainingAmount,
      paymentMethod,
      status,
      seller,
      isReturn,
      invoiceType,
    });

    return res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: {
        sale: result.sale,
        meta: {
          requestedInvoiceNumber: result.requestedInvoiceNumber,
          finalInvoiceNumber: result.finalInvoiceNumber,
          invoiceAutoAdjusted: result.invoiceAutoAdjusted,
        },
      },
    });
  } catch (error: any) {
    if (error.code === 'INVALID_PAYMENT_METHOD') {
      return next(new AppError(error.message, 400));
    }
    if (error.code === 'INVOICE_CONFLICT') {
      return next(new AppError(error.message, 409, {
        data: {
          duplicateInvoiceNumber: error.duplicateInvoiceNumber,
          duplicateInvoiceId: error.duplicateInvoiceId,
          errorType: 'invoice_number_conflict',
        },
      }));
    }
    next(error);
  }
});

/**
 * Get all sales with optional filters
 */
export const getSales = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, seller, storeId: queryStoreId, page = 1, limit = 100, search: searchParam } = req.query;

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
    const firstStore = await Store.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: 'No stores available',
      });
    }
    modelStoreId = firstStore.storeId;
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

  // Search by invoice number or customer name (optional)
  const search = typeof searchParam === 'string' ? searchParam.trim() : '';
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escaped, 'i');
    query.$or = [
      { invoiceNumber: searchRegex },
      { customerName: searchRegex },
    ];
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
  // When search is active, do not apply date filter so results are across all dates
  let usingDateFilter = false;
  let businessDateQuery: any = null;
  
  if ((startDate || endDate) && !search) {
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
  // Sort by invoice number descending (highest number first) using aggregation pipeline
  // This extracts the numeric part from invoice numbers for proper numeric sorting
  let sales: any[] = [];
  let total = 0;
  
  try {
    // Build aggregation pipeline to extract numeric part and sort
    const pipeline: any[] = [
      { $match: query }, // Apply all filters
      {
        $addFields: {
          // Extract numeric part from invoiceNumber (handles INV-123 format)
          invoiceNum: {
            $let: {
              vars: {
                matchResult: {
                  $regexFind: {
                    input: '$invoiceNumber',
                    regex: /^INV-(\d+)$/,
                  },
                },
              },
              in: {
                $cond: {
                  if: { $ne: ['$$matchResult', null] },
                  then: { $toInt: { $arrayElemAt: ['$$matchResult.captures', 0] } },
                  else: 0, // Fallback for legacy formats or invalid invoice numbers
                },
              },
            },
          },
        },
      },
      { $sort: { invoiceNum: -1 } }, // Sort by numeric invoice number descending
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          invoiceNum: 0, // Remove the temporary field from output
        },
      },
    ];
    
    // Execute aggregation for sales
    sales = await Sale.aggregate(pipeline);
    
    // Get total count separately
    total = await Sale.countDocuments(query);
  } catch (aggregationError: any) {
    // Fallback to simple string sorting if aggregation fails
    log.warn('[Sales Controller] Aggregation sorting failed, falling back to string sort:', aggregationError);
    [sales, total] = await Promise.all([
      Sale.find(query)
        .sort({ invoiceNumber: -1 }) // Sort by invoice number string descending
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Sale.countDocuments(query),
    ]);
  }
  
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
    // Use aggregation for proper numeric invoice number sorting
    let calendarSales: any[] = [];
    let calendarTotal = 0;
    
    try {
      const calendarPipeline: any[] = [
        { $match: calendarQuery },
        {
          $addFields: {
            invoiceNum: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: '$invoiceNumber',
                      regex: /^INV-(\d+)$/,
                    },
                  },
                },
                in: {
                  $cond: {
                    if: { $ne: ['$$matchResult', null] },
                    then: { $toInt: { $arrayElemAt: ['$$matchResult.captures', 0] } },
                    else: 0,
                  },
                },
              },
            },
          },
        },
        { $sort: { invoiceNum: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        { $project: { invoiceNum: 0 } },
      ];
      
      calendarSales = await Sale.aggregate(calendarPipeline);
      calendarTotal = await Sale.countDocuments(calendarQuery);
    } catch (calendarAggError: any) {
      // Fallback to string sorting
      log.warn('[Sales Controller] Calendar aggregation sorting failed, using string sort:', calendarAggError);
      [calendarSales, calendarTotal] = await Promise.all([
        Sale.find(calendarQuery)
          .sort({ invoiceNumber: -1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Sale.countDocuments(calendarQuery),
      ]);
    }
    
    if (calendarTotal > 0) {
      log.warn('[Sales Controller] Business date filtering returned 0 results, using calendar date filtering fallback');
      sales = calendarSales;
      total = calendarTotal;
      query = calendarQuery; // Update query for consistency
    }
  }

  const totalPages = Math.ceil(total / limitNum);
  res.status(200).json({
    success: true,
    message: 'Sales retrieved successfully',
    data: {
      sales,
      items: sales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        currentPage: pageNum,
        totalSales: total,
        hasNextPage: pageNum < totalPages,
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
    const firstStore = await Store.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: 'No stores available',
      });
    }
    modelStoreId = firstStore.storeId;
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
 * Update a sale. If body includes items array, performs full update (items, totals, stock).
 * Otherwise updates only payment-related fields.
 */
export const updateSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  const mongoose = (await import('mongoose')).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
    });
  }

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to update sales',
    });
  }

  const body = req.body as any;
  const hasFullUpdate = body.items && Array.isArray(body.items) && body.items.length > 0;

  if (hasFullUpdate) {
    try {
      const result = await salesService.updateSale(storeId, id, {
        items: body.items,
        subtotal: body.subtotal,
        totalItemDiscount: body.totalItemDiscount,
        invoiceDiscount: body.invoiceDiscount,
        tax: body.tax,
        total: body.total,
        customerId: body.customerId,
        customerName: body.customerName,
        seller: body.seller,
        paidAmount: body.paidAmount,
        remainingAmount: body.remainingAmount,
        paymentMethod: body.paymentMethod,
        status: body.status,
        date: body.date,
      });
      const updatedSale = result.sale as any;
      if ((updatedSale?.paidAmount ?? 0) <= 0) {
        const CustomerPayment = getCustomerPaymentModelForStore(storeId);
        const normalizedStoreId = (storeId || '').toLowerCase().trim();
        const invoiceIds = [id];
        if (updatedSale?.invoiceNumber) invoiceIds.push(String(updatedSale.invoiceNumber));
        await CustomerPayment.deleteMany({
          storeId: normalizedStoreId,
          invoiceId: { $in: invoiceIds },
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Sale updated successfully',
        data: { sale: result.sale },
      });
    } catch (error: any) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: error.message || 'Sale not found' });
      }
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message || 'Invalid request' });
      }
      throw error;
    }
  }

  // Payment-only update
  const Sale = await getSaleModelForStore(storeId);
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

  const allowedUpdates = ['paidAmount', 'remainingAmount', 'status', 'paymentMethod'];
  allowedUpdates.forEach((field) => {
    if (body[field] !== undefined) {
      (sale as any)[field] = body[field];
    }
  });

  await sale.save();

  // When sale is changed to credit (paidAmount 0), remove any customer payment records linked to this
  // invoice so the account statement shows only the debit (customer owes), not debit + credit.
  const saleAny = sale as any;
  const paidAmount = saleAny.paidAmount ?? 0;
  if (paidAmount <= 0) {
    const CustomerPayment = getCustomerPaymentModelForStore(storeId);
    const normalizedStoreId = (storeId || '').toLowerCase().trim();
    const invoiceIds = [id];
    if (saleAny.invoiceNumber) invoiceIds.push(String(saleAny.invoiceNumber));
    await CustomerPayment.deleteMany({
      storeId: normalizedStoreId,
      invoiceId: { $in: invoiceIds },
    });
  }

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

      // Calculate stock increase - convert quantity to main units
      let unit = returnItem.unit || 'قطعة';
      let stockIncrease: number;
      
      // Use hierarchical unit conversion if product has unit structure
      if (product.units && product.units.length > 0) {
        stockIncrease = convertQuantityToMainUnits(product, unit, returnQuantity);
      } else if (conversionFactor > 1) {
        // Fallback: use conversionFactor if no unit structure
        stockIncrease = returnQuantity / conversionFactor;
      } else {
        stockIncrease = returnQuantity;
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
      // unit is already declared above, reuse it

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
export const getPublicInvoice = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
      const firstStore = await Store.findOne().lean();
      if (!firstStore) {
        return res.status(400).json({
          success: false,
          message: 'No stores available',
        });
      }
      const modelStoreId = firstStore.storeId;
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
    next(error);
  }
});

/**
 * Simplified sale creation for "Other" store type
 * Creates a sale with just invoice amount and customer number
 * Automatically adds reward points if customer exists
 */
export const createSimpleSale = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;
  
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required to create a sale',
    });
  }
  
  const { invoiceAmount, customerNumber } = req.body;

  // Validate required fields
  if (!invoiceAmount || invoiceAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invoice amount is required and must be positive',
    });
  }

  // Normalize invoice amount
  const total = Number(invoiceAmount);
  const paidAmount = total; // Full payment for simple POS
  const remainingAmount = 0;
  const subtotal = total;
  const totalItemDiscount = 0;
  const invoiceDiscount = 0;
  const tax = 0;

  // Get unified Sale model
  const Sale = await getSaleModelForStore(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();

  // Generate invoice number
  const invoiceNumber = await generateNextInvoiceNumber(Sale, storeId);

  // Determine customer information
  let customerId: string | null = null;
  let customerName = 'Cash Customer';

  // Try to find customer by customerNumber (could be phone or customer ID)
  if (customerNumber) {
    try {
      const Customer = await getCustomerModelForStore(storeId);
      const mongoose = (await import('mongoose')).default;
      const trimmedCustomerNumber = customerNumber.trim();
      
      // Try to find by ID first (if it's a valid ObjectId)
      if (mongoose.Types.ObjectId.isValid(trimmedCustomerNumber) && trimmedCustomerNumber.length === 24) {
        const customerById = await Customer.findOne({
          _id: trimmedCustomerNumber,
          storeId: normalizedStoreId,
        });
        
        if (customerById) {
          customerId = String(customerById._id);
          customerName = customerById.name;
          log.info(`[Simple Sale] Found customer by ID: ${customerId}, name: ${customerName}`);
        }
      }
      
      // If not found by ID, try by phone
      if (!customerId) {
        const customerByPhone = await Customer.findOne({
          phone: trimmedCustomerNumber,
          storeId: normalizedStoreId,
        });
        
        if (customerByPhone) {
          customerId = String(customerByPhone._id);
          customerName = customerByPhone.name;
          log.info(`[Simple Sale] Found customer by phone: ${customerId}, name: ${customerName}`);
        } else {
          log.warn(`[Simple Sale] Customer not found with phone/ID: ${trimmedCustomerNumber} for store: ${normalizedStoreId}`);
        }
      }
    } catch (customerError: any) {
      log.error('[Simple Sale] Error looking up customer:', customerError);
      // Continue with sale even if customer lookup fails
    }
  }

  // Create sale with minimal item data
  // For "Other" store type, we create a single generic item representing the total
  // This is required because the Sale model requires at least one item
  const saleData = {
    invoiceNumber,
    storeId: normalizedStoreId,
    date: new Date(),
    customerId: customerId || null,
    customerName,
    items: [
      {
        productId: 'simple-pos-item',
        productName: 'مبيعات عامة', // General Sales
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
        costPrice: 0, // No cost tracking for simple POS
        unit: 'قطعة',
        discount: 0,
        conversionFactor: 1,
      },
    ],
    subtotal,
    totalItemDiscount,
    invoiceDiscount,
    tax,
    total,
    paidAmount,
    remainingAmount,
    paymentMethod: 'cash',
    status: 'completed' as const,
    seller: req.user?.userId || 'system',
    originalInvoiceId: null,
    isReturn: false,
  };

  // Create sale record
  const sale = await Sale.create(saleData);

  // Helper function to add points for a customer
  const addPointsForCustomer = async (
    globalCustomerId: string,
    customerName: string,
    customerPhone?: string
  ) => {
    try {
      log.info(`[Simple Sale] Attempting to add points for globalCustomerId: ${globalCustomerId}, invoice: ${invoiceNumber}, amount: ${total}`);

      // Get points settings
      let settings = await PointsSettings.findOne({ storeId: normalizedStoreId });
      if (!settings) {
        settings = await PointsSettings.findOne({ storeId: 'global' });
        if (!settings) {
          log.info('[Simple Sale] Creating default global points settings');
          settings = await PointsSettings.create({
            storeId: 'global',
            userPointsPercentage: 5,
            companyProfitPercentage: 2,
            defaultThreshold: 10000,
          });
        }
      }

      log.info(`[Simple Sale] Points settings - percentage: ${settings.userPointsPercentage}%, minPurchase: ${settings.minPurchaseAmount || 'none'}`);

      // Calculate points
      const pointsPercentage = settings.userPointsPercentage;
      const points = Math.floor((total * pointsPercentage) / 100);

      log.info(`[Simple Sale] Calculated points: ${points} (${pointsPercentage}% of ${total})`);

      if (points > 0) {
        // Check minimum purchase amount if set
        if (!settings.minPurchaseAmount || total >= settings.minPurchaseAmount) {
          // Check max points per transaction if set
          const finalPoints = settings.maxPointsPerTransaction 
            ? Math.min(points, settings.maxPointsPerTransaction)
            : points;

          log.info(`[Simple Sale] Final points to award: ${finalPoints}`);

          // Calculate expiration date if points expiration is enabled
          let expiresAt: Date | undefined;
          if (settings.pointsExpirationDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + settings.pointsExpirationDays);
          }

          // Get points value per point
          const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
          const pointsValue = finalPoints * pointsValuePerPoint;

          log.info(`[Simple Sale] Points value: ${pointsValue} (${finalPoints} points × ${pointsValuePerPoint})`);

          // Create transaction
          const transaction = await PointsTransaction.create({
            globalCustomerId: globalCustomerId,
            customerName: customerName,
            earningStoreId: normalizedStoreId,
            invoiceNumber,
            transactionType: 'earned',
            points: finalPoints,
            purchaseAmount: total,
            pointsPercentage,
            pointsValue,
            description: `Points earned from purchase at ${storeId} (Invoice: ${invoiceNumber})`,
            expiresAt,
          });
          
          log.info(`[Simple Sale] Points transaction created: ${transaction._id}`);

          // Update or create global points balance
          const balance = await PointsBalance.findOneAndUpdate(
            { globalCustomerId: globalCustomerId },
            {
              $inc: {
                totalPoints: finalPoints,
                availablePoints: finalPoints,
                lifetimeEarned: finalPoints,
              },
              $set: {
                customerName: customerName,
                customerPhone: customerPhone || undefined,
                lastTransactionDate: new Date(),
              },
              $setOnInsert: {
                globalCustomerId: globalCustomerId,
                pendingPoints: 0,
                lifetimeSpent: 0,
              },
            },
            { upsert: true, new: true }
          );
          
          log.info(`[Simple Sale] Points balance updated: total=${balance.totalPoints}, available=${balance.availablePoints}`);

          // Update store points account
          let storeAccount = await StorePointsAccount.findOne({ storeId: normalizedStoreId });
          if (storeAccount) {
            const oldIssued = storeAccount.totalPointsIssued;
            const oldValue = storeAccount.totalPointsValueIssued;
            
            storeAccount.totalPointsIssued += finalPoints;
            storeAccount.totalPointsValueIssued += pointsValue;
            storeAccount.recalculate();
            await storeAccount.save();
            
            log.info(`[Simple Sale] Store account updated: points issued ${oldIssued} → ${storeAccount.totalPointsIssued}, value ${oldValue} → ${storeAccount.totalPointsValueIssued}`);
          } else {
            const store = await Store.findOne({ storeId: normalizedStoreId });
            storeAccount = await StorePointsAccount.create({
              storeId: normalizedStoreId,
              storeName: store?.name || 'Unknown Store',
              totalPointsIssued: finalPoints,
              totalPointsRedeemed: 0,
              pointsValuePerPoint,
              totalPointsValueIssued: pointsValue,
              totalPointsValueRedeemed: 0,
            });
            storeAccount.recalculate();
            await storeAccount.save();
            
            log.info(`[Simple Sale] New store account created: ${storeAccount.storeId}, points issued: ${finalPoints}`);
          }
          
          log.info(`[Simple Sale] ✅ Successfully added ${finalPoints} points for globalCustomerId ${globalCustomerId}`);
          return { success: true, points: finalPoints };
        } else {
          log.warn(`[Simple Sale] Purchase amount ${total} is below minimum ${settings.minPurchaseAmount} - no points awarded`);
          return { success: false, reason: 'below_minimum' };
        }
      } else {
        log.warn(`[Simple Sale] Calculated points is 0 - no points awarded`);
        return { success: false, reason: 'zero_points' };
      }
    } catch (pointsError: any) {
      // Log error but don't fail the sale if points addition fails
      log.error('[Simple Sale] ❌ Error adding points:', pointsError);
      log.error('[Simple Sale] Error stack:', pointsError.stack);
      return { success: false, error: pointsError.message };
    }
  };

  // If customer exists in store, add reward points
  if (customerId) {
    try {
      log.info(`[Simple Sale] Customer found in store: ${customerId}, invoice: ${invoiceNumber}, amount: ${total}`);
      
      const Customer = await getCustomerModelForStore(storeId);
      const customer = await Customer.findById(customerId);
      
      if (!customer) {
        log.warn(`[Simple Sale] Customer not found with ID: ${customerId}`);
      } else {
        log.info(`[Simple Sale] Customer found: ${customer.name}, phone: ${customer.phone}`);
        
        // Get or create global customer
        const globalCustomer = await GlobalCustomer.getOrCreateGlobalCustomer(
          storeId,
          customerId,
          customer.name,
          customer.phone,
          undefined
        );
        
        log.info(`[Simple Sale] Global customer: ${globalCustomer.globalCustomerId}`);

        await addPointsForCustomer(
          globalCustomer.globalCustomerId,
          globalCustomer.name,
          globalCustomer.phone
        );
      }
    } catch (pointsError: any) {
      // Log error but don't fail the sale if points addition fails
      log.error('[Simple Sale] ❌ Error adding points to customer:', pointsError);
      log.error('[Simple Sale] Error stack:', pointsError.stack);
    }
  } 
  // If customer not found in store but phone number provided, try to add points using phone as globalCustomerId
  else if (customerNumber && customerNumber.trim()) {
    try {
      const trimmedPhone = customerNumber.trim();
      log.info(`[Simple Sale] Customer not found in store, but phone provided: ${trimmedPhone}. Attempting to add points using phone as globalCustomerId`);
      
      // Use phone number directly as globalCustomerId (normalized to lowercase)
      // The points system supports phone numbers directly as globalCustomerId
      const globalCustomerIdFromPhone = trimmedPhone.toLowerCase();
      
      // Try to find existing GlobalCustomer by phone to get customer name if available
      let customerNameToUse = 'Customer';
      const existingGlobalCustomer = await GlobalCustomer.findOne({ 
        globalCustomerId: globalCustomerIdFromPhone 
      });
      
      if (existingGlobalCustomer) {
        // Use existing global customer's name if available
        customerNameToUse = existingGlobalCustomer.name;
        log.info(`[Simple Sale] Found existing GlobalCustomer: ${existingGlobalCustomer.name}, phone: ${existingGlobalCustomer.phone}`);
      } else {
        log.info(`[Simple Sale] No existing GlobalCustomer found for phone: ${trimmedPhone}. Points will be added using phone as globalCustomerId. GlobalCustomer will be created when customer registers in a store.`);
      }
      
      // Add points using phone as globalCustomerId
      // The points system will create/update PointsBalance and PointsTransaction using the phone number
      await addPointsForCustomer(
        globalCustomerIdFromPhone,
        customerNameToUse,
        trimmedPhone
      );
    } catch (pointsError: any) {
      // Log error but don't fail the sale if points addition fails
      log.error('[Simple Sale] ❌ Error adding points using phone number:', pointsError);
      log.error('[Simple Sale] Error stack:', pointsError.stack);
    }
  } else {
    log.info(`[Simple Sale] No customer ID or phone number provided - sale recorded without points`);
  }

  // Return success response with points information
  const responseData: any = {
    sale: {
      id: sale._id.toString(),
      invoiceNumber: sale.invoiceNumber,
      storeId: sale.storeId,
      date: sale.date,
      customerId: sale.customerId,
      customerName: sale.customerName,
      items: sale.items,
      subtotal: sale.subtotal,
      totalItemDiscount: sale.totalItemDiscount,
      invoiceDiscount: sale.invoiceDiscount,
      tax: sale.tax,
      total: sale.total,
      paidAmount: sale.paidAmount,
      remainingAmount: sale.remainingAmount,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      seller: sale.seller,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt,
    },
  };

  // Add points information
  if (customerId) {
    responseData.pointsInfo = {
      customerFound: true,
      customerId: customerId,
      customerName: customerName,
      message: 'Points processing attempted for registered customer. Check logs for details.',
    };
  } else if (customerNumber && customerNumber.trim()) {
    responseData.pointsInfo = {
      customerFound: false,
      customerNumber: customerNumber.trim(),
      message: `Customer not found in store, but points processing attempted using phone number. Check logs for details.`,
    };
  } else {
    responseData.pointsInfo = {
      customerFound: false,
      message: 'No customer number provided. Sale recorded without points.',
    };
  }

  log.info(`[Simple Sale] ✅ Sale created successfully: ${invoiceNumber}, customer: ${customerName}${customerId ? ` (ID: ${customerId})` : ' (No customer)'}`);

  res.status(201).json({
    success: true,
    message: 'Sale created successfully',
    data: responseData,
  });
});
