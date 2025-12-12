"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var sales_controller_exports = {};
__export(sales_controller_exports, {
  createSale: () => createSale,
  deleteSale: () => deleteSale,
  getNextInvoiceNumber: () => getNextInvoiceNumber,
  getSale: () => getSale,
  getSales: () => getSales,
  processReturn: () => processReturn,
  updateSale: () => updateSale
});
module.exports = __toCommonJS(sales_controller_exports);
var import_error = require("../middleware/error.middleware");
var import_saleModel = require("../utils/saleModel");
var import_productModel = require("../utils/productModel");
const getNextInvoiceNumber = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to get invoice number"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const allSales = await Sale.find({}).select("invoiceNumber").lean();
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
    invoiceNumber
  });
  if (existingSale) {
    return res.status(409).json({
      success: false,
      message: `Invoice number ${invoiceNumber} already exists`
    });
  }
  const sale = new Sale({
    invoiceNumber,
    storeId,
    date: date ? new Date(date) : /* @__PURE__ */ new Date(),
    customerId: customerId || null,
    customerName,
    items: items.map((item) => ({
      productId: String(item.productId),
      productName: item.productName || item.name || "",
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      totalPrice: item.totalPrice || (item.total || 0),
      unit: item.unit || "\u0642\u0637\u0639\u0629",
      discount: item.discount || 0,
      conversionFactor: item.conversionFactor || 1
    })),
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
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to access sales"
    });
  }
  const { startDate, endDate, customerId, status, paymentMethod, page = 1, limit = 100 } = req.query;
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const query = {};
  if (customerId) {
    query.customerId = customerId;
  }
  if (status) {
    query.status = status;
  }
  if (paymentMethod) {
    query.paymentMethod = paymentMethod.toLowerCase();
  }
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 100;
  const skip = (pageNum - 1) * limitNum;
  const [sales, total] = await Promise.all([
    Sale.find(query).sort({ date: -1 }).skip(skip).limit(limitNum).lean(),
    Sale.countDocuments(query)
  ]);
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
const getSale = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to access sales"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findById(id);
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
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to update sales"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findById(id);
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
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required to delete sales"
    });
  }
  const Sale = await (0, import_saleModel.getSaleModelForStore)(storeId);
  const sale = await Sale.findByIdAndDelete(id);
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
    originalInvoice = await Sale.findById(originalInvoiceId);
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
      await Product.findByIdAndUpdate(productId, { stock: newStock }, { new: true });
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
      console.error(`Error updating stock for product ${productId}:`, error);
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
  const allSales = await Sale.find({}).select("invoiceNumber").lean();
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
  processReturn,
  updateSale
});
