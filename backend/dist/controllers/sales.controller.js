"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sales_controller_exports = {};
__export(sales_controller_exports, {
  createSale: () => createSale,
  createSimpleSale: () => createSimpleSale,
  deleteSale: () => deleteSale,
  getCurrentInvoiceNumber: () => getCurrentInvoiceNumber,
  getNextInvoiceNumber: () => getNextInvoiceNumber,
  getPublicInvoice: () => getPublicInvoice,
  getSale: () => getSale,
  getSales: () => getSales,
  getSalesSummary: () => getSalesSummary,
  processReturn: () => processReturn,
  updateSale: () => updateSale
});
module.exports = __toCommonJS(sales_controller_exports);
var import_error = require("../middleware/error.middleware");
var import_saleModel = require("../utils/saleModel");
var import_productModel = require("../utils/productModel");
var import_productCache = require("../utils/productCache");
var import_Settings = __toESM(require("../models/Settings"));
var import_businessDate = require("../utils/businessDate");
var import_logger = require("../utils/logger");
var import_Store = __toESM(require("../models/Store"));
var import_customerModel = require("../utils/customerModel");
var import_customerPaymentModel = require("../utils/customerPaymentModel");
var import_GlobalCustomer = __toESM(require("../models/GlobalCustomer"));
var import_PointsSettings = __toESM(require("../models/PointsSettings"));
var import_PointsBalance = __toESM(require("../models/PointsBalance"));
var import_PointsTransaction = __toESM(require("../models/PointsTransaction"));
var import_StorePointsAccount = __toESM(require("../models/StorePointsAccount"));
var import_sales = require("../services/sales.service");
const getCurrentInvoiceNumber = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to get invoice number"
    });
  }
  const data = await import_sales.salesService.getCurrentInvoiceNumber(storeId);
  return res.status(200).json({
    success: true,
    message: "Current invoice number retrieved successfully",
    data: {
      invoiceNumber: data.invoiceNumber,
      number: data.number
    }
  });
});
const getNextInvoiceNumber = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to get invoice number"
    });
  }
  const data = await import_sales.salesService.getNextInvoiceNumber(storeId);
  return res.status(200).json({
    success: true,
    message: "Next invoice number retrieved successfully",
    data: {
      invoiceNumber: data.invoiceNumber,
      number: data.number
    }
  });
});
const createSale = (0, import_error.asyncHandler)(async (req, res, next) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to create a sale"
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
    invoiceType
  } = req.body;
  if (!invoiceNumber || !customerName || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: invoiceNumber, customerName, and items are required"
    });
  }
  if (isReturn) {
    if (total === void 0 || total === null) {
      return res.status(400).json({
        success: false,
        message: "Total amount is required"
      });
    }
  } else {
    if (!total || total < 0) {
      return res.status(400).json({
        success: false,
        message: "Total amount is required and must be positive"
      });
    }
  }
  try {
    const result = await import_sales.salesService.createSale(storeId, {
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
      invoiceType
    });
    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: {
        sale: result.sale,
        meta: {
          requestedInvoiceNumber: result.requestedInvoiceNumber,
          finalInvoiceNumber: result.finalInvoiceNumber,
          invoiceAutoAdjusted: result.invoiceAutoAdjusted
        }
      }
    });
  } catch (error) {
    if (error.code === "INVALID_PAYMENT_METHOD") {
      return next(new import_error.AppError(error.message, 400));
    }
    if (error.code === "INVOICE_CONFLICT") {
      return next(new import_error.AppError(error.message, 409, {
        data: {
          duplicateInvoiceNumber: error.duplicateInvoiceNumber,
          duplicateInvoiceId: error.duplicateInvoiceId,
          errorType: "invoice_number_conflict"
        }
      }));
    }
    next(error);
  }
});
const getSales = (0, import_error.asyncHandler)(async (req, res) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, seller, storeId: queryStoreId, page = 1, limit = 100, search: searchParam } = req.query;
  let targetStoreId = null;
  if (userRole === "Admin") {
    if (queryStoreId) {
      targetStoreId = queryStoreId.toLowerCase().trim();
    }
  } else {
    if (!userStoreId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required to access sales"
      });
    }
    targetStoreId = userStoreId.toLowerCase().trim();
  }
  let modelStoreId = userStoreId || targetStoreId;
  if (!modelStoreId) {
    const firstStore = await import_Store.default.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: "No stores available"
      });
    }
    modelStoreId = firstStore.storeId;
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(modelStoreId);
  let query = {};
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
    let paymentMethodStr;
    if (typeof paymentMethod === "string") {
      paymentMethodStr = paymentMethod;
    } else if (Array.isArray(paymentMethod) && paymentMethod.length > 0) {
      paymentMethodStr = String(paymentMethod[0]);
    } else {
      paymentMethodStr = String(paymentMethod);
    }
    query.paymentMethod = paymentMethodStr.toLowerCase();
  }
  if (seller && seller !== "all") {
    query.seller = seller;
  }
  const search = typeof searchParam === "string" ? searchParam.trim() : "";
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const searchRegex = new RegExp(escaped, "i");
    query.$or = [
      { invoiceNumber: searchRegex },
      { customerName: searchRegex }
    ];
  }
  let businessDayStartTime;
  let businessDayTimezone;
  const settingsStoreId = targetStoreId || modelStoreId;
  if (settingsStoreId) {
    const [businessDaySetting, timezoneSetting] = await Promise.all([
      import_Settings.default.findOne({
        storeId: settingsStoreId,
        key: "businessdaystarttime"
      }),
      import_Settings.default.findOne({
        storeId: settingsStoreId,
        key: "businessdaytimezone"
      })
    ]);
    if (businessDaySetting && businessDaySetting.value) {
      businessDayStartTime = businessDaySetting.value;
    }
    if (timezoneSetting && timezoneSetting.value) {
      businessDayTimezone = timezoneSetting.value;
    }
  }
  let usingDateFilter = false;
  let businessDateQuery = null;
  if ((startDate || endDate) && !search) {
    usingDateFilter = true;
    const { start, end } = (0, import_businessDate.getBusinessDateFilterRange)(
      startDate,
      endDate,
      businessDayStartTime,
      businessDayTimezone
    );
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
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 100;
  const skip = (pageNum - 1) * limitNum;
  let sales = [];
  let total = 0;
  try {
    const pipeline = [
      { $match: query },
      // Apply all filters
      {
        $addFields: {
          // Extract numeric part from invoiceNumber (handles INV-123 format)
          invoiceNum: {
            $let: {
              vars: {
                matchResult: {
                  $regexFind: {
                    input: "$invoiceNumber",
                    regex: /^INV-(\d+)$/
                  }
                }
              },
              in: {
                $cond: {
                  if: { $ne: ["$$matchResult", null] },
                  then: { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                  else: 0
                  // Fallback for legacy formats or invalid invoice numbers
                }
              }
            }
          }
        }
      },
      { $sort: { invoiceNum: -1 } },
      // Sort by numeric invoice number descending
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          invoiceNum: 0
          // Remove the temporary field from output
        }
      }
    ];
    sales = await Sale.aggregate(pipeline);
    total = await Sale.countDocuments(query);
  } catch (aggregationError) {
    import_logger.log.warn("[Sales Controller] Aggregation sorting failed, falling back to string sort:", aggregationError);
    [sales, total] = await Promise.all([
      Sale.find(query).sort({ invoiceNumber: -1 }).skip(skip).limit(limitNum).lean(),
      Sale.countDocuments(query)
    ]);
  }
  if (usingDateFilter && total === 0 && (startDate || endDate)) {
    const calendarQuery = {};
    Object.keys(query).forEach((key) => {
      if (key !== "date") {
        calendarQuery[key] = query[key];
      }
    });
    calendarQuery.date = {};
    if (startDate) {
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      calendarQuery.date.$gte = startDateObj;
    }
    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      calendarQuery.date.$lte = endDateObj;
    }
    let calendarSales = [];
    let calendarTotal = 0;
    try {
      const calendarPipeline = [
        { $match: calendarQuery },
        {
          $addFields: {
            invoiceNum: {
              $let: {
                vars: {
                  matchResult: {
                    $regexFind: {
                      input: "$invoiceNumber",
                      regex: /^INV-(\d+)$/
                    }
                  }
                },
                in: {
                  $cond: {
                    if: { $ne: ["$$matchResult", null] },
                    then: { $toInt: { $arrayElemAt: ["$$matchResult.captures", 0] } },
                    else: 0
                  }
                }
              }
            }
          }
        },
        { $sort: { invoiceNum: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        { $project: { invoiceNum: 0 } }
      ];
      calendarSales = await Sale.aggregate(calendarPipeline);
      calendarTotal = await Sale.countDocuments(calendarQuery);
    } catch (calendarAggError) {
      import_logger.log.warn("[Sales Controller] Calendar aggregation sorting failed, using string sort:", calendarAggError);
      [calendarSales, calendarTotal] = await Promise.all([
        Sale.find(calendarQuery).sort({ invoiceNumber: -1 }).skip(skip).limit(limitNum).lean(),
        Sale.countDocuments(calendarQuery)
      ]);
    }
    if (calendarTotal > 0) {
      import_logger.log.warn("[Sales Controller] Business date filtering returned 0 results, using calendar date filtering fallback");
      sales = calendarSales;
      total = calendarTotal;
      query = calendarQuery;
    }
  }
  const totalPages = Math.ceil(total / limitNum);
  res.status(200).json({
    success: true,
    message: "Sales retrieved successfully",
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
        hasPreviousPage: pageNum > 1
      }
    }
  });
});
const getSalesSummary = (0, import_error.asyncHandler)(async (req, res) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, storeId: queryStoreId } = req.query;
  let targetStoreId = null;
  if (userRole === "Admin") {
    if (queryStoreId) {
      targetStoreId = queryStoreId.toLowerCase().trim();
    }
  } else {
    if (!userStoreId) {
      return res.status(400).json({
        success: false,
        message: "Store ID is required to access sales"
      });
    }
    targetStoreId = userStoreId.toLowerCase().trim();
  }
  let modelStoreId = userStoreId || targetStoreId;
  if (!modelStoreId) {
    const firstStore = await import_Store.default.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: "No stores available"
      });
    }
    modelStoreId = firstStore.storeId;
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(modelStoreId);
  const query = {};
  if (targetStoreId) {
    query.storeId = targetStoreId;
  }
  if (customerId) {
    const customerIdStr = String(customerId).trim();
    if (customerIdStr && customerIdStr !== "all" && customerIdStr !== "") {
      query.customerId = customerIdStr;
    }
  }
  if (status) {
    query.status = status;
  }
  if (paymentMethod) {
    let paymentMethodStr;
    if (typeof paymentMethod === "string") {
      paymentMethodStr = paymentMethod;
    } else if (Array.isArray(paymentMethod) && paymentMethod.length > 0) {
      paymentMethodStr = String(paymentMethod[0]);
    } else {
      paymentMethodStr = String(paymentMethod);
    }
    query.paymentMethod = paymentMethodStr.toLowerCase();
  }
  let businessDayStartTime;
  let businessDayTimezone;
  const settingsStoreId = targetStoreId || modelStoreId;
  if (settingsStoreId) {
    const [businessDaySetting, timezoneSetting] = await Promise.all([
      import_Settings.default.findOne({
        storeId: settingsStoreId,
        key: "businessdaystarttime"
      }),
      import_Settings.default.findOne({
        storeId: settingsStoreId,
        key: "businessdaytimezone"
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
    const { start, end } = (0, import_businessDate.getBusinessDateFilterRange)(
      startDate,
      endDate,
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
  const sanitizedQuery = {};
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
  const summaryPipeline = [
    { $match: sanitizedQuery },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$total" },
        totalPayments: { $sum: "$paidAmount" },
        invoiceCount: { $sum: 1 },
        creditSales: {
          $sum: {
            $cond: [{ $eq: ["$paymentMethod", "credit"] }, "$total", 0]
          }
        }
      }
    }
  ];
  let summaryResult = [];
  try {
    summaryResult = await Sale.aggregate(summaryPipeline);
  } catch (aggregationError) {
    import_logger.log.error("[Sales Controller] Error in aggregation pipeline", aggregationError, {
      query: sanitizedQuery,
      originalQuery: query
    });
    summaryResult = [];
  }
  const summary = summaryResult[0] || {
    totalSales: 0,
    totalPayments: 0,
    invoiceCount: 0,
    creditSales: 0
  };
  let netProfit = 0;
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(modelStoreId);
    const productIdsPipeline = [
      { $match: sanitizedQuery },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId" } }
    ];
    const productIdsResult = await Sale.aggregate(productIdsPipeline);
    const productIds = productIdsResult.map((p) => p._id).filter(Boolean).map((id) => {
      return id.toString ? id.toString() : String(id);
    });
    if (productIds.length > 0) {
      const mongoose = (await import("mongoose")).default;
      const objectIdProductIds = [];
      const stringProductIds = [];
      productIds.forEach((id) => {
        if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
          try {
            objectIdProductIds.push(new mongoose.Types.ObjectId(id));
          } catch (e) {
            stringProductIds.push(id);
          }
        } else {
          stringProductIds.push(id);
        }
      });
      const queryConditions = [];
      if (objectIdProductIds.length > 0) {
        queryConditions.push({ _id: { $in: objectIdProductIds } });
      }
      if (stringProductIds.length > 0) {
        queryConditions.push({ id: { $in: stringProductIds } });
      }
      let products = [];
      if (queryConditions.length > 0) {
        try {
          const validObjectIdConditions = objectIdProductIds.filter((oid) => {
            try {
              return oid && oid.toString && oid.toString().length === 24;
            } catch {
              return false;
            }
          });
          const finalQueryConditions = [];
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
            }).select("_id id costPrice").lean();
          }
        } catch (queryError) {
          import_logger.log.error("[Sales Controller] Error querying products for net profit", queryError, {
            queryConditions,
            stack: queryError.stack
          });
        }
      }
      const costPriceMap = /* @__PURE__ */ new Map();
      products.forEach((p) => {
        const costPrice = p.costPrice || 0;
        const idObj = p._id || p.id;
        if (idObj) {
          const idStr = idObj.toString ? idObj.toString() : String(idObj);
          costPriceMap.set(idStr, costPrice);
          if (idObj.toString && idObj.toString().length === 24) {
            costPriceMap.set(idObj.toString(), costPrice);
          }
          if (typeof idObj === "number" || !isNaN(Number(idStr))) {
            costPriceMap.set(String(Number(idStr)), costPrice);
          }
        }
      });
      const salesWithItems = await Sale.find(sanitizedQuery).select("items isReturn total").lean();
      let totalCost = 0;
      salesWithItems.forEach((sale) => {
        const saleIsReturn = sale.isReturn || sale.total && sale.total < 0;
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const quantity = item.quantity || 0;
            const absQuantity = Math.abs(quantity);
            const isReturn = saleIsReturn || quantity < 0;
            if (item.costPrice !== void 0 && item.costPrice !== null) {
              const itemCost2 = (item.costPrice || 0) * absQuantity;
              totalCost += isReturn ? -itemCost2 : itemCost2;
              return;
            }
            const itemProductId = item.productId;
            if (!itemProductId) return;
            const productIdVariants = [
              String(itemProductId),
              itemProductId.toString ? itemProductId.toString() : String(itemProductId),
              typeof itemProductId === "number" ? String(itemProductId) : null
            ].filter(Boolean);
            let costPrice = 0;
            for (const variant of productIdVariants) {
              if (costPriceMap.has(variant)) {
                costPrice = costPriceMap.get(variant);
                break;
              }
            }
            const itemCost = costPrice * absQuantity;
            totalCost += isReturn ? -itemCost : itemCost;
          });
        }
      });
      netProfit = (summary.totalSales || 0) - totalCost;
    }
  } catch (error) {
    import_logger.log.error("[Sales Controller] Error calculating net profit", error);
    netProfit = 0;
  }
  res.status(200).json({
    success: true,
    message: "Sales summary retrieved successfully",
    data: {
      totalSales: summary.totalSales || 0,
      totalPayments: summary.totalPayments || 0,
      invoiceCount: summary.invoiceCount || 0,
      creditSales: summary.creditSales || 0,
      remainingAmount: (summary.totalSales || 0) - (summary.totalPayments || 0),
      netProfit
    }
  });
});
const getSale = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  const mongoose = (await import("mongoose")).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to access sales"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findOne({
    _id: id,
    storeId: storeId.toLowerCase().trim()
  });
  if (!sale) {
    return res.status(404).json({
      success: false,
      message: "Sale not found"
    });
  }
  res.status(200).json({
    success: true,
    data: { sale }
  });
});
const updateSale = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  const mongoose = (await import("mongoose")).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to update sales"
    });
  }
  const body = req.body;
  const hasFullUpdate = body.items && Array.isArray(body.items) && body.items.length > 0;
  if (hasFullUpdate) {
    try {
      const result = await import_sales.salesService.updateSale(storeId, id, {
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
        date: body.date
      });
      const updatedSale = result.sale;
      if ((updatedSale?.paidAmount ?? 0) <= 0) {
        const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
        const normalizedStoreId = (storeId || "").toLowerCase().trim();
        const invoiceIds = [id];
        if (updatedSale?.invoiceNumber) invoiceIds.push(String(updatedSale.invoiceNumber));
        await CustomerPayment.deleteMany({
          storeId: normalizedStoreId,
          invoiceId: { $in: invoiceIds }
        });
      }
      return res.status(200).json({
        success: true,
        message: "Sale updated successfully",
        data: { sale: result.sale }
      });
    } catch (error) {
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: error.message || "Sale not found" });
      }
      if (error.statusCode === 400) {
        return res.status(400).json({ success: false, message: error.message || "Invalid request" });
      }
      throw error;
    }
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findOne({
    _id: id,
    storeId: storeId.toLowerCase().trim()
  });
  if (!sale) {
    return res.status(404).json({
      success: false,
      message: "Sale not found"
    });
  }
  const allowedUpdates = ["paidAmount", "remainingAmount", "status", "paymentMethod"];
  allowedUpdates.forEach((field) => {
    if (body[field] !== void 0) {
      sale[field] = body[field];
    }
  });
  await sale.save();
  const saleAny = sale;
  const paidAmount = saleAny.paidAmount ?? 0;
  if (paidAmount <= 0) {
    const CustomerPayment = (0, import_customerPaymentModel.getCustomerPaymentModelForStore)(storeId);
    const normalizedStoreId = (storeId || "").toLowerCase().trim();
    const invoiceIds = [id];
    if (saleAny.invoiceNumber) invoiceIds.push(String(saleAny.invoiceNumber));
    await CustomerPayment.deleteMany({
      storeId: normalizedStoreId,
      invoiceId: { $in: invoiceIds }
    });
  }
  res.status(200).json({
    success: true,
    message: "Sale updated successfully",
    data: { sale }
  });
});
const deleteSale = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  const mongoose = (await import("mongoose")).default;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format"
    });
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to delete sales"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findOneAndDelete({
    _id: id,
    storeId: storeId.toLowerCase().trim()
  });
  if (!sale) {
    return res.status(404).json({
      success: false,
      message: "Sale not found"
    });
  }
  res.status(200).json({
    success: true,
    message: "Sale deleted successfully"
  });
});
const processReturn = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to process returns"
    });
  }
  const {
    originalInvoiceId,
    // Optional - for linking purposes
    returnItems,
    // Array of items being returned: { productId, quantity, unitPrice, etc. }
    reason,
    refundMethod = "cash",
    seller,
    customerName,
    // Customer name from frontend
    customerId
    // Customer ID from frontend
  } = req.body;
  if (!returnItems || !Array.isArray(returnItems) || returnItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: returnItems are required"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const Product = await (0, import_productModel.getProductModelForStore)(storeId);
  let originalInvoice = null;
  if (originalInvoiceId) {
    originalInvoice = await Sale.findOne({
      _id: originalInvoiceId,
      storeId: storeId.toLowerCase().trim()
    });
    if (!originalInvoice) {
      return res.status(404).json({
        success: false,
        message: "Original invoice not found"
      });
    }
  }
  const validRefundMethods = ["cash", "card", "credit"];
  const normalizedRefundMethod = refundMethod?.toLowerCase();
  if (!normalizedRefundMethod || !validRefundMethods.includes(normalizedRefundMethod)) {
    return res.status(400).json({
      success: false,
      message: `Refund method must be one of: ${validRefundMethods.join(", ")}`
    });
  }
  const stockUpdates = [];
  const processedReturnItems = [];
  for (const returnItem of returnItems) {
    const { productId, quantity: returnQuantity } = returnItem;
    if (!productId || !returnQuantity || returnQuantity <= 0) {
      stockUpdates.push({
        productId: productId || "unknown",
        quantity: returnQuantity || 0,
        success: false,
        error: "Invalid return item: productId and quantity are required"
      });
      continue;
    }
    if (originalInvoice) {
      const originalItem = originalInvoice.items.find(
        (item) => String(item.productId) === String(productId)
      );
      if (!originalItem) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: "Product not found in original invoice"
        });
        continue;
      }
      if (returnQuantity > originalItem.quantity) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: `Return quantity (${returnQuantity}) exceeds original quantity (${originalItem.quantity})`
        });
        continue;
      }
    }
    try {
      const product = await Product.findById(productId);
      if (!product) {
        stockUpdates.push({
          productId,
          quantity: returnQuantity,
          success: false,
          error: "Product not found in database"
        });
        continue;
      }
      let conversionFactor = returnItem.conversionFactor || 1;
      if (originalInvoice) {
        const originalItem = originalInvoice.items.find(
          (item) => String(item.productId) === String(productId)
        );
        if (originalItem?.conversionFactor) {
          conversionFactor = originalItem.conversionFactor;
        }
      }
      let unit = returnItem.unit || "\u0642\u0637\u0639\u0629";
      let stockIncrease;
      if (product.units && product.units.length > 0) {
        stockIncrease = (0, import_sales.convertQuantityToMainUnits)(product, unit, returnQuantity);
      } else if (conversionFactor > 1) {
        stockIncrease = returnQuantity / conversionFactor;
      } else {
        stockIncrease = returnQuantity;
      }
      const currentStock = product.stock || 0;
      const newStock = currentStock + stockIncrease;
      const updatedProduct = await Product.findByIdAndUpdate(productId, { stock: newStock }, { new: true });
      if (updatedProduct && storeId) {
        await (0, import_productCache.invalidateAllProductBarcodeCaches)(storeId, updatedProduct);
      }
      stockUpdates.push({
        productId,
        quantity: returnQuantity,
        success: true
      });
      let unitPrice = returnItem.unitPrice;
      let discount = returnItem.discount || 0;
      let productName = returnItem.productName || product.name;
      if (originalInvoice) {
        const originalItem = originalInvoice.items.find(
          (item) => String(item.productId) === String(productId)
        );
        if (originalItem) {
          unitPrice = unitPrice || originalItem.unitPrice;
          discount = discount || originalItem.discount || 0;
          productName = productName || originalItem.productName;
          unit = unit || originalItem.unit || "\u0642\u0637\u0639\u0629";
        }
      }
      processedReturnItems.push({
        productId: String(productId),
        productName,
        quantity: returnQuantity,
        unitPrice: unitPrice || 0,
        totalPrice: (unitPrice - discount) * returnQuantity,
        unit,
        discount,
        conversionFactor
      });
    } catch (error) {
      import_logger.log.error(`Error updating stock for product ${productId}`, error);
      stockUpdates.push({
        productId,
        quantity: returnQuantity,
        success: false,
        error: error.message || "Failed to update stock"
      });
    }
  }
  const failedStockUpdates = stockUpdates.filter((update) => !update.success);
  if (failedStockUpdates.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Some stock updates failed",
      errors: failedStockUpdates
    });
  }
  if (processedReturnItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid return items to process"
    });
  }
  const returnSubtotal = processedReturnItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const returnTotalItemDiscount = processedReturnItems.reduce((sum, item) => sum + item.discount * item.quantity, 0);
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
  const finalCustomerName = customerName || originalInvoice?.customerName || "\u0639\u0645\u064A\u0644 \u0646\u0642\u062F\u064A";
  const finalCustomerId = customerId || originalInvoice?.customerId || null;
  const returnInvoiceNumber = await (0, import_sales.generateNextInvoiceNumber)(Sale, storeId);
  const returnSale = new Sale({
    invoiceNumber: returnInvoiceNumber,
    storeId,
    date: /* @__PURE__ */ new Date(),
    customerId: finalCustomerId,
    customerName: finalCustomerName,
    items: processedReturnItems.map((item) => ({
      ...item,
      totalPrice: -item.totalPrice
      // Make item totals negative
    })),
    subtotal: -returnSubtotal,
    // Negative for returns
    totalItemDiscount: -returnTotalItemDiscount,
    // Negative for returns
    invoiceDiscount: 0,
    tax: -returnTax,
    // Negative for returns
    total: -returnTotal,
    // Negative for returns
    paidAmount: -returnTotal,
    // Negative (refund amount)
    remainingAmount: 0,
    paymentMethod: normalizedRefundMethod,
    status: "completed",
    seller: seller || originalInvoice?.seller || "System",
    originalInvoiceId: originalInvoiceId || null,
    // Optional link to original invoice
    isReturn: true
  });
  await returnSale.save();
  res.status(201).json({
    success: true,
    message: "Return processed successfully",
    data: {
      returnInvoice: {
        id: returnSale.id,
        invoiceNumber: returnSale.invoiceNumber,
        invoiceName: "Returns",
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
        paidAmount: returnSale.paidAmount
      },
      stockUpdates
    }
  });
});
const getPublicInvoice = (0, import_error.asyncHandler)(async (req, res, next) => {
  const { invoiceNumber, storeId } = req.query;
  if (!invoiceNumber || typeof invoiceNumber !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invoice number is required"
    });
  }
  try {
    const normalizedInvoiceNumber = invoiceNumber.trim();
    let Sale;
    if (storeId && typeof storeId === "string") {
      Sale = await (0, import_saleModel.getSaleModelForStore)(storeId.toLowerCase().trim());
    } else {
      const firstStore = await import_Store.default.findOne().lean();
      if (!firstStore) {
        return res.status(400).json({
          success: false,
          message: "No stores available"
        });
      }
      const modelStoreId = firstStore.storeId;
      Sale = await (0, import_saleModel.getSaleModelForStore)(modelStoreId);
    }
    const query = { invoiceNumber: normalizedInvoiceNumber };
    if (storeId && typeof storeId === "string") {
      query.storeId = storeId.toLowerCase().trim();
    }
    import_logger.log.debug("[getPublicInvoice] Searching for invoice:", { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });
    const sale = await Sale.findOne(query).lean();
    if (!sale) {
      import_logger.log.warn("[getPublicInvoice] Invoice not found:", { invoiceNumber: normalizedInvoiceNumber, storeId: query.storeId });
      return res.status(404).json({
        success: false,
        message: "Invoice not found"
      });
    }
    import_logger.log.debug("[getPublicInvoice] Invoice found:", { invoiceNumber: sale.invoiceNumber, saleId: sale._id });
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
          isReturn: sale.isReturn
        }
      }
    });
  } catch (error) {
    next(error);
  }
});
const createSimpleSale = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to create a sale"
    });
  }
  const { invoiceAmount, customerNumber } = req.body;
  if (!invoiceAmount || invoiceAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invoice amount is required and must be positive"
    });
  }
  const total = Number(invoiceAmount);
  const paidAmount = total;
  const remainingAmount = 0;
  const subtotal = total;
  const totalItemDiscount = 0;
  const invoiceDiscount = 0;
  const tax = 0;
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const normalizedStoreId = storeId.toLowerCase().trim();
  const invoiceNumber = await (0, import_sales.generateNextInvoiceNumber)(Sale, storeId);
  let customerId = null;
  let customerName = "Cash Customer";
  if (customerNumber) {
    try {
      const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
      const mongoose = (await import("mongoose")).default;
      const trimmedCustomerNumber = customerNumber.trim();
      if (mongoose.Types.ObjectId.isValid(trimmedCustomerNumber) && trimmedCustomerNumber.length === 24) {
        const customerById = await Customer.findOne({
          _id: trimmedCustomerNumber,
          storeId: normalizedStoreId
        });
        if (customerById) {
          customerId = String(customerById._id);
          customerName = customerById.name;
          import_logger.log.info(`[Simple Sale] Found customer by ID: ${customerId}, name: ${customerName}`);
        }
      }
      if (!customerId) {
        const customerByPhone = await Customer.findOne({
          phone: trimmedCustomerNumber,
          storeId: normalizedStoreId
        });
        if (customerByPhone) {
          customerId = String(customerByPhone._id);
          customerName = customerByPhone.name;
          import_logger.log.info(`[Simple Sale] Found customer by phone: ${customerId}, name: ${customerName}`);
        } else {
          import_logger.log.warn(`[Simple Sale] Customer not found with phone/ID: ${trimmedCustomerNumber} for store: ${normalizedStoreId}`);
        }
      }
    } catch (customerError) {
      import_logger.log.error("[Simple Sale] Error looking up customer:", customerError);
    }
  }
  const saleData = {
    invoiceNumber,
    storeId: normalizedStoreId,
    date: /* @__PURE__ */ new Date(),
    customerId: customerId || null,
    customerName,
    items: [
      {
        productId: "simple-pos-item",
        productName: "\u0645\u0628\u064A\u0639\u0627\u062A \u0639\u0627\u0645\u0629",
        // General Sales
        quantity: 1,
        unitPrice: total,
        totalPrice: total,
        costPrice: 0,
        // No cost tracking for simple POS
        unit: "\u0642\u0637\u0639\u0629",
        discount: 0,
        conversionFactor: 1
      }
    ],
    subtotal,
    totalItemDiscount,
    invoiceDiscount,
    tax,
    total,
    paidAmount,
    remainingAmount,
    paymentMethod: "cash",
    status: "completed",
    seller: req.user?.userId || "system",
    originalInvoiceId: null,
    isReturn: false
  };
  const sale = await Sale.create(saleData);
  const addPointsForCustomer = async (globalCustomerId, customerName2, customerPhone) => {
    try {
      import_logger.log.info(`[Simple Sale] Attempting to add points for globalCustomerId: ${globalCustomerId}, invoice: ${invoiceNumber}, amount: ${total}`);
      let settings = await import_PointsSettings.default.findOne({ storeId: normalizedStoreId });
      if (!settings) {
        settings = await import_PointsSettings.default.findOne({ storeId: "global" });
        if (!settings) {
          import_logger.log.info("[Simple Sale] Creating default global points settings");
          settings = await import_PointsSettings.default.create({
            storeId: "global",
            userPointsPercentage: 5,
            companyProfitPercentage: 2,
            defaultThreshold: 1e4
          });
        }
      }
      import_logger.log.info(`[Simple Sale] Points settings - percentage: ${settings.userPointsPercentage}%, minPurchase: ${settings.minPurchaseAmount || "none"}`);
      const pointsPercentage = settings.userPointsPercentage;
      const points = Math.floor(total * pointsPercentage / 100);
      import_logger.log.info(`[Simple Sale] Calculated points: ${points} (${pointsPercentage}% of ${total})`);
      if (points > 0) {
        if (!settings.minPurchaseAmount || total >= settings.minPurchaseAmount) {
          const finalPoints = settings.maxPointsPerTransaction ? Math.min(points, settings.maxPointsPerTransaction) : points;
          import_logger.log.info(`[Simple Sale] Final points to award: ${finalPoints}`);
          let expiresAt;
          if (settings.pointsExpirationDays) {
            expiresAt = /* @__PURE__ */ new Date();
            expiresAt.setDate(expiresAt.getDate() + settings.pointsExpirationDays);
          }
          const pointsValuePerPoint = settings.pointsValuePerPoint || 0.01;
          const pointsValue = finalPoints * pointsValuePerPoint;
          import_logger.log.info(`[Simple Sale] Points value: ${pointsValue} (${finalPoints} points \xD7 ${pointsValuePerPoint})`);
          const transaction = await import_PointsTransaction.default.create({
            globalCustomerId,
            customerName: customerName2,
            earningStoreId: normalizedStoreId,
            invoiceNumber,
            transactionType: "earned",
            points: finalPoints,
            purchaseAmount: total,
            pointsPercentage,
            pointsValue,
            description: `Points earned from purchase at ${storeId} (Invoice: ${invoiceNumber})`,
            expiresAt
          });
          import_logger.log.info(`[Simple Sale] Points transaction created: ${transaction._id}`);
          const balance = await import_PointsBalance.default.findOneAndUpdate(
            { globalCustomerId },
            {
              $inc: {
                totalPoints: finalPoints,
                availablePoints: finalPoints,
                lifetimeEarned: finalPoints
              },
              $set: {
                customerName: customerName2,
                customerPhone: customerPhone || void 0,
                lastTransactionDate: /* @__PURE__ */ new Date()
              },
              $setOnInsert: {
                globalCustomerId,
                pendingPoints: 0,
                lifetimeSpent: 0
              }
            },
            { upsert: true, new: true }
          );
          import_logger.log.info(`[Simple Sale] Points balance updated: total=${balance.totalPoints}, available=${balance.availablePoints}`);
          let storeAccount = await import_StorePointsAccount.default.findOne({ storeId: normalizedStoreId });
          if (storeAccount) {
            const oldIssued = storeAccount.totalPointsIssued;
            const oldValue = storeAccount.totalPointsValueIssued;
            storeAccount.totalPointsIssued += finalPoints;
            storeAccount.totalPointsValueIssued += pointsValue;
            storeAccount.recalculate();
            await storeAccount.save();
            import_logger.log.info(`[Simple Sale] Store account updated: points issued ${oldIssued} \u2192 ${storeAccount.totalPointsIssued}, value ${oldValue} \u2192 ${storeAccount.totalPointsValueIssued}`);
          } else {
            const store = await import_Store.default.findOne({ storeId: normalizedStoreId });
            storeAccount = await import_StorePointsAccount.default.create({
              storeId: normalizedStoreId,
              storeName: store?.name || "Unknown Store",
              totalPointsIssued: finalPoints,
              totalPointsRedeemed: 0,
              pointsValuePerPoint,
              totalPointsValueIssued: pointsValue,
              totalPointsValueRedeemed: 0
            });
            storeAccount.recalculate();
            await storeAccount.save();
            import_logger.log.info(`[Simple Sale] New store account created: ${storeAccount.storeId}, points issued: ${finalPoints}`);
          }
          import_logger.log.info(`[Simple Sale] \u2705 Successfully added ${finalPoints} points for globalCustomerId ${globalCustomerId}`);
          return { success: true, points: finalPoints };
        } else {
          import_logger.log.warn(`[Simple Sale] Purchase amount ${total} is below minimum ${settings.minPurchaseAmount} - no points awarded`);
          return { success: false, reason: "below_minimum" };
        }
      } else {
        import_logger.log.warn(`[Simple Sale] Calculated points is 0 - no points awarded`);
        return { success: false, reason: "zero_points" };
      }
    } catch (pointsError) {
      import_logger.log.error("[Simple Sale] \u274C Error adding points:", pointsError);
      import_logger.log.error("[Simple Sale] Error stack:", pointsError.stack);
      return { success: false, error: pointsError.message };
    }
  };
  if (customerId) {
    try {
      import_logger.log.info(`[Simple Sale] Customer found in store: ${customerId}, invoice: ${invoiceNumber}, amount: ${total}`);
      const Customer = await (0, import_customerModel.getCustomerModelForStore)(storeId);
      const customer = await Customer.findById(customerId);
      if (!customer) {
        import_logger.log.warn(`[Simple Sale] Customer not found with ID: ${customerId}`);
      } else {
        import_logger.log.info(`[Simple Sale] Customer found: ${customer.name}, phone: ${customer.phone}`);
        const globalCustomer = await import_GlobalCustomer.default.getOrCreateGlobalCustomer(
          storeId,
          customerId,
          customer.name,
          customer.phone,
          void 0
        );
        import_logger.log.info(`[Simple Sale] Global customer: ${globalCustomer.globalCustomerId}`);
        await addPointsForCustomer(
          globalCustomer.globalCustomerId,
          globalCustomer.name,
          globalCustomer.phone
        );
      }
    } catch (pointsError) {
      import_logger.log.error("[Simple Sale] \u274C Error adding points to customer:", pointsError);
      import_logger.log.error("[Simple Sale] Error stack:", pointsError.stack);
    }
  } else if (customerNumber && customerNumber.trim()) {
    try {
      const trimmedPhone = customerNumber.trim();
      import_logger.log.info(`[Simple Sale] Customer not found in store, but phone provided: ${trimmedPhone}. Attempting to add points using phone as globalCustomerId`);
      const globalCustomerIdFromPhone = trimmedPhone.toLowerCase();
      let customerNameToUse = "Customer";
      const existingGlobalCustomer = await import_GlobalCustomer.default.findOne({
        globalCustomerId: globalCustomerIdFromPhone
      });
      if (existingGlobalCustomer) {
        customerNameToUse = existingGlobalCustomer.name;
        import_logger.log.info(`[Simple Sale] Found existing GlobalCustomer: ${existingGlobalCustomer.name}, phone: ${existingGlobalCustomer.phone}`);
      } else {
        import_logger.log.info(`[Simple Sale] No existing GlobalCustomer found for phone: ${trimmedPhone}. Points will be added using phone as globalCustomerId. GlobalCustomer will be created when customer registers in a store.`);
      }
      await addPointsForCustomer(
        globalCustomerIdFromPhone,
        customerNameToUse,
        trimmedPhone
      );
    } catch (pointsError) {
      import_logger.log.error("[Simple Sale] \u274C Error adding points using phone number:", pointsError);
      import_logger.log.error("[Simple Sale] Error stack:", pointsError.stack);
    }
  } else {
    import_logger.log.info(`[Simple Sale] No customer ID or phone number provided - sale recorded without points`);
  }
  const responseData = {
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
      updatedAt: sale.updatedAt
    }
  };
  if (customerId) {
    responseData.pointsInfo = {
      customerFound: true,
      customerId,
      customerName,
      message: "Points processing attempted for registered customer. Check logs for details."
    };
  } else if (customerNumber && customerNumber.trim()) {
    responseData.pointsInfo = {
      customerFound: false,
      customerNumber: customerNumber.trim(),
      message: `Customer not found in store, but points processing attempted using phone number. Check logs for details.`
    };
  } else {
    responseData.pointsInfo = {
      customerFound: false,
      message: "No customer number provided. Sale recorded without points."
    };
  }
  import_logger.log.info(`[Simple Sale] \u2705 Sale created successfully: ${invoiceNumber}, customer: ${customerName}${customerId ? ` (ID: ${customerId})` : " (No customer)"}`);
  res.status(201).json({
    success: true,
    message: "Sale created successfully",
    data: responseData
  });
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createSale,
  createSimpleSale,
  deleteSale,
  getCurrentInvoiceNumber,
  getNextInvoiceNumber,
  getPublicInvoice,
  getSale,
  getSales,
  getSalesSummary,
  processReturn,
  updateSale
});
