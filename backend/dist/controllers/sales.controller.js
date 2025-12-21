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
  deleteSale: () => deleteSale,
  getNextInvoiceNumber: () => getNextInvoiceNumber,
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
const getNextInvoiceNumber = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to get invoice number"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const allSales = await Sale.find({ storeId: storeId.toLowerCase() }).select("invoiceNumber").lean();
  let maxNumber = 0;
  for (const sale of allSales) {
    const invoiceNumber = sale.invoiceNumber || "";
    const match = invoiceNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  const nextNumber = maxNumber + 1;
  const nextInvoiceNumber = `INV-${nextNumber}`;
  res.status(200).json({
    success: true,
    message: "Next invoice number retrieved successfully",
    data: {
      invoiceNumber: nextInvoiceNumber,
      number: nextNumber
    }
  });
});
const createSale = (0, import_error.asyncHandler)(async (req, res) => {
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
    isReturn = false
    // Flag to indicate if this is a return invoice
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
  const validPaymentMethods = ["cash", "card", "credit"];
  const normalizedPaymentMethod = paymentMethod?.toLowerCase();
  if (!normalizedPaymentMethod || !validPaymentMethods.includes(normalizedPaymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Payment method must be one of: ${validPaymentMethods.join(", ")}`
    });
  }
  let saleStatus = status;
  if (!saleStatus) {
    if (remainingAmount <= 0) {
      saleStatus = "completed";
    } else if (paidAmount > 0) {
      saleStatus = "partial_payment";
    } else {
      saleStatus = "pending";
    }
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const existingSale = await Sale.findOne({
    invoiceNumber,
    storeId: storeId.toLowerCase().trim()
  });
  if (existingSale) {
    return res.status(409).json({
      success: false,
      message: `Invoice number ${invoiceNumber} already exists`
    });
  }
  const Product = await (0, import_productModel.getProductModelForStore)(storeId);
  const itemsWithCostPrice = await Promise.all(
    items.map(async (item) => {
      if (item.costPrice !== void 0 && item.costPrice !== null) {
        return {
          productId: String(item.productId),
          productName: item.productName || item.name || "",
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.total || 0),
          costPrice: Number(item.costPrice) || 0,
          unit: item.unit || "\u0642\u0637\u0639\u0629",
          discount: item.discount || 0,
          conversionFactor: item.conversionFactor || 1
        };
      }
      let costPrice = 0;
      try {
        const productId = String(item.productId);
        const mongoose = (await import("mongoose")).default;
        let product = null;
        if (mongoose.Types.ObjectId.isValid(productId) && productId.length === 24) {
          product = await Product.findOne({
            _id: productId,
            storeId: storeId.toLowerCase()
          }).select("costPrice").lean();
        }
        if (!product) {
          product = await Product.findOne({
            id: productId,
            storeId: storeId.toLowerCase()
          }).select("costPrice").lean();
        }
        if (product) {
          costPrice = product.costPrice || 0;
        }
      } catch (error) {
        import_logger.log.warn(`[Sales Controller] Failed to fetch cost price for product ${item.productId}`, error);
      }
      return {
        productId: String(item.productId),
        productName: item.productName || item.name || "",
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || (item.total || 0),
        costPrice,
        unit: item.unit || "\u0642\u0637\u0639\u0629",
        discount: item.discount || 0,
        conversionFactor: item.conversionFactor || 1
      };
    })
  );
  const sale = new Sale({
    invoiceNumber,
    storeId,
    date: date ? new Date(date) : /* @__PURE__ */ new Date(),
    customerId: customerId || null,
    customerName,
    items: itemsWithCostPrice,
    subtotal: subtotal || 0,
    totalItemDiscount: totalItemDiscount || 0,
    invoiceDiscount: invoiceDiscount || 0,
    tax: tax || 0,
    total,
    paidAmount: paidAmount || 0,
    remainingAmount: remainingAmount || total - (paidAmount || 0),
    paymentMethod: normalizedPaymentMethod,
    status: saleStatus,
    seller: seller || "Unknown"
  });
  await sale.save();
  res.status(201).json({
    success: true,
    message: "Sale created successfully",
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
        tax: sale.tax
      }
    }
  });
});
const getSales = (0, import_error.asyncHandler)(async (req, res) => {
  const userStoreId = req.user?.storeId || null;
  const userRole = req.user?.role || null;
  const { startDate, endDate, customerId, status, paymentMethod, seller, storeId: queryStoreId, page = 1, limit = 100 } = req.query;
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
    const Store = (await import("../models/Store")).default;
    const firstStore = await Store.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: "No stores available"
      });
    }
    modelStoreId = firstStore.storeId || firstStore.prefix;
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
  if (startDate || endDate) {
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
  let [sales, total] = await Promise.all([
    Sale.find(query).sort({ date: -1 }).skip(skip).limit(limitNum).lean(),
    Sale.countDocuments(query)
  ]);
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
    const [calendarSales, calendarTotal] = await Promise.all([
      Sale.find(calendarQuery).sort({ date: -1 }).skip(skip).limit(limitNum).lean(),
      Sale.countDocuments(calendarQuery)
    ]);
    if (calendarTotal > 0) {
      import_logger.log.warn("[Sales Controller] Business date filtering returned 0 results, using calendar date filtering fallback");
      sales = calendarSales;
      total = calendarTotal;
      query = calendarQuery;
    }
  }
  res.status(200).json({
    success: true,
    message: "Sales retrieved successfully",
    data: {
      sales,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalSales: total,
        limit: limitNum,
        hasNextPage: pageNum * limitNum < total,
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
    const Store = (await import("../models/Store")).default;
    const firstStore = await Store.findOne().lean();
    if (!firstStore) {
      return res.status(400).json({
        success: false,
        message: "No stores available"
      });
    }
    modelStoreId = firstStore.storeId || firstStore.prefix;
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
      const salesWithItems = await Sale.find(sanitizedQuery).select("items").lean();
      let totalCost = 0;
      salesWithItems.forEach((sale) => {
        if (sale.items && Array.isArray(sale.items)) {
          sale.items.forEach((item) => {
            const quantity = Math.abs(item.quantity || 0);
            if (item.costPrice !== void 0 && item.costPrice !== null) {
              totalCost += (item.costPrice || 0) * quantity;
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
            totalCost += costPrice * quantity;
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
  const allowedUpdates = [
    "paidAmount",
    "remainingAmount",
    "status",
    "paymentMethod"
  ];
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== void 0) {
      sale[field] = req.body[field];
    }
  });
  await sale.save();
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
      let stockIncrease = returnQuantity;
      if (conversionFactor > 1) {
        stockIncrease = Math.ceil(returnQuantity / conversionFactor);
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
      let unit = returnItem.unit || "\u0642\u0637\u0639\u0629";
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
  const allSales = await Sale.find({ storeId: storeId.toLowerCase() }).select("invoiceNumber").lean();
  let maxNumber = 0;
  for (const sale of allSales) {
    const invNumber = sale.invoiceNumber || "";
    const match = invNumber.match(/^INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  const nextNumber = maxNumber + 1;
  const returnInvoiceNumber = `INV-${nextNumber}`;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createSale,
  deleteSale,
  getNextInvoiceNumber,
  getSale,
  getSales,
  getSalesSummary,
  processReturn,
  updateSale
});
