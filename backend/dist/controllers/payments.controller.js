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
var payments_controller_exports = {};
__export(payments_controller_exports, {
  cancelPayment: () => cancelPayment,
  getPayment: () => getPayment,
  getPaymentsByInvoice: () => getPaymentsByInvoice,
  processPayment: () => processPayment
});
module.exports = __toCommonJS(payments_controller_exports);
var import_Payment = require("../models/Payment");
var import_logger = require("../utils/logger");
const processPayment = async (req, res) => {
  try {
    const storeId = req.user?.storeId || null;
    const { invoiceId, amount, currency = "SAR", paymentMethod, description } = req.body;
    if (!invoiceId || !amount || !paymentMethod) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: invoiceId, amount, and paymentMethod are required"
      });
      return;
    }
    const payment = new import_Payment.Payment({
      invoiceId,
      storeId: storeId || null,
      amount,
      currency,
      paymentMethod,
      status: "Approved",
      // Auto-approve since no terminal validation
      description: description || `Invoice ${invoiceId}`,
      processedAt: /* @__PURE__ */ new Date()
    });
    await payment.save();
    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        payment: {
          id: payment.id,
          invoiceId: payment.invoiceId,
          amount: payment.amount,
          currency: payment.currency,
          paymentMethod: payment.paymentMethod,
          status: payment.status,
          processedAt: payment.processedAt
        }
      }
    });
  } catch (error) {
    import_logger.log.error("Payment processing error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    const payment = await import_Payment.Payment.findOne({
      _id: id,
      ...storeId ? { storeId } : {}
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment not found"
      });
      return;
    }
    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    import_logger.log.error("Get payment error", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
const getPaymentsByInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.user?.storeId || null;
    const payments = await import_Payment.Payment.find({
      invoiceId,
      ...storeId ? { storeId } : {}
    }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error("Get payments by invoice error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
const cancelPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId || null;
    const payment = await import_Payment.Payment.findOne({
      _id: id,
      ...storeId ? { storeId } : {}
    });
    if (!payment) {
      res.status(404).json({
        success: false,
        message: "Payment not found"
      });
      return;
    }
    if (payment.status !== "Pending") {
      res.status(400).json({
        success: false,
        message: `Cannot cancel payment with status: ${payment.status}`
      });
      return;
    }
    payment.status = "Cancelled";
    payment.processedAt = /* @__PURE__ */ new Date();
    await payment.save();
    res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      data: { payment }
    });
  } catch (error) {
    console.error("Cancel payment error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  cancelPayment,
  getPayment,
  getPaymentsByInvoice,
  processPayment
});
