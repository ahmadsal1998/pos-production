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
var warehouses_controller_exports = {};
__export(warehouses_controller_exports, {
  createWarehouse: () => createWarehouse,
  deleteWarehouse: () => deleteWarehouse,
  exportWarehouses: () => exportWarehouses,
  getWarehouseById: () => getWarehouseById,
  getWarehouses: () => getWarehouses,
  importWarehouses: () => importWarehouses,
  updateWarehouse: () => updateWarehouse,
  validateCreateWarehouse: () => validateCreateWarehouse,
  validateUpdateWarehouse: () => validateUpdateWarehouse
});
module.exports = __toCommonJS(warehouses_controller_exports);
var import_express_validator = require("express-validator");
var import_sync = require("csv-parse/sync");
var import_error = require("../middleware/error.middleware");
var import_warehouseModel = require("../utils/warehouseModel");
var import_userModel = require("../utils/userModel");
const validateCreateWarehouse = [
  (0, import_express_validator.body)("name").trim().notEmpty().withMessage("Warehouse name is required").isLength({ max: 120 }).withMessage("Warehouse name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
  (0, import_express_validator.body)("address").optional({ nullable: true }).isString().withMessage("Address must be a string").isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
  (0, import_express_validator.body)("status").optional({ nullable: true }).isIn(["Active", "Inactive"]).withMessage("Status must be either Active or Inactive")
];
const validateUpdateWarehouse = [
  (0, import_express_validator.body)("name").optional().trim().notEmpty().withMessage("Warehouse name cannot be empty").isLength({ max: 120 }).withMessage("Warehouse name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),
  (0, import_express_validator.body)("address").optional({ nullable: true }).isString().withMessage("Address must be a string").isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
  (0, import_express_validator.body)("status").optional({ nullable: true }).isIn(["Active", "Inactive"]).withMessage("Status must be either Active or Inactive")
];
const createWarehouse = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { name, description, address, status } = req.body;
  let storeId = req.user?.storeId || null;
  console.log("\u{1F50D} Create Warehouse - User info from token:", {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    storeId
  });
  if (!storeId && req.user?.userId && req.user.userId !== "admin") {
    try {
      const user = await (0, import_userModel.findUserByIdAcrossStores)(req.user.userId, req.user.storeId || void 0);
      if (user && user.storeId) {
        storeId = user.storeId;
        console.log("\u2705 Create Warehouse - Found storeId from user record:", storeId);
      }
    } catch (error) {
      console.error("\u274C Create Warehouse - Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    console.error("\u274C Create Warehouse - No storeId found for user");
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    console.log("\u{1F50D} Create Warehouse - Getting Warehouse model for storeId:", storeId);
    let Warehouse;
    try {
      Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
      console.log("\u2705 Create Warehouse - Warehouse model obtained");
    } catch (modelError) {
      console.error("\u274C Create Warehouse - Error getting Warehouse model:", {
        message: modelError.message,
        stack: modelError.stack,
        storeId
      });
      return res.status(400).json({
        success: false,
        message: modelError.message || "Failed to access store warehouses. Please ensure your account is associated with a valid store."
      });
    }
    const existingWarehouse = await Warehouse.findOne({
      name: name.trim()
    });
    if (existingWarehouse) {
      return res.status(400).json({
        success: false,
        message: "Warehouse with this name already exists"
      });
    }
    const warehouse = await Warehouse.create({
      name: name.trim(),
      description: description?.trim() || void 0,
      address: address?.trim() || void 0,
      status: status || "Active"
    });
    console.log("\u2705 Create Warehouse - Warehouse created successfully:", warehouse._id);
    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      warehouse
    });
  } catch (error) {
    console.error("\u274C Create Warehouse - Error:", {
      message: error.message,
      stack: error.stack,
      storeId,
      name: error.name,
      code: error.code
    });
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(", ") || "Validation error"
      });
    }
    if (error.code === 11e3) {
      return res.status(400).json({
        success: false,
        message: "Warehouse with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create warehouse. Please try again."
    });
  }
});
const getWarehouses = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      warehouses: []
    });
  }
  try {
    const Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    const warehousesWithCounts = await Promise.all(
      warehouses.map(async (warehouse) => {
        const productCount = 0;
        const warehouseObj = warehouse.toJSON();
        return {
          ...warehouseObj,
          productCount
        };
      })
    );
    res.status(200).json({
      success: true,
      message: "Warehouses retrieved successfully",
      warehouses: warehousesWithCounts
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch warehouses. Please try again.",
      warehouses: []
    });
  }
});
const getWarehouseById = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }
    const productCount = 0;
    res.status(200).json({
      success: true,
      message: "Warehouse retrieved successfully",
      warehouse: {
        ...warehouse.toJSON(),
        productCount
      }
    });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch warehouse. Please try again."
    });
  }
});
const updateWarehouse = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { id } = req.params;
  const { name, description, address, status } = req.body;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }
    if (name && name.trim() !== warehouse.name) {
      const existingWarehouse = await Warehouse.findOne({
        name: name.trim(),
        _id: { $ne: id }
      });
      if (existingWarehouse) {
        return res.status(400).json({
          success: false,
          message: "Warehouse with this name already exists"
        });
      }
    }
    if (name !== void 0) warehouse.name = name.trim();
    if (description !== void 0) warehouse.description = description?.trim() || void 0;
    if (address !== void 0) warehouse.address = address?.trim() || void 0;
    if (status !== void 0) warehouse.status = status;
    await warehouse.save();
    const productCount = 0;
    res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      warehouse: {
        ...warehouse.toJSON(),
        productCount
      }
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(", ") || "Validation error"
      });
    }
    if (error.code === 11e3) {
      return res.status(400).json({
        success: false,
        message: "Warehouse with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update warehouse. Please try again."
    });
  }
});
const deleteWarehouse = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
    const warehouse = await Warehouse.findById(id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found"
      });
    }
    await Warehouse.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete warehouse. Please try again."
    });
  }
});
const escapeCsvValue = (value) => {
  const stringValue = value ?? "";
  if (stringValue.includes('"') || stringValue.includes(",") || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};
const normalizeHeaderKey = (key) => key.replace(/^\uFEFF/, "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exportWarehouses = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Warehouse = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    const headers = ["name", "description", "address", "status", "createdAt"];
    const rows = warehouses.map((warehouse) => [
      escapeCsvValue(warehouse.name),
      escapeCsvValue(warehouse.description ?? ""),
      escapeCsvValue(warehouse.address ?? ""),
      escapeCsvValue(warehouse.status),
      escapeCsvValue(warehouse.createdAt.toISOString())
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const utf8WithBom = `\uFEFF${csvContent}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="warehouses-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error) {
    console.error("Error exporting warehouses:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export warehouses. Please try again."
    });
  }
});
const importWarehouses = (0, import_error.asyncHandler)(async (req, res) => {
  const file = req.file;
  const storeId = req.user?.storeId || null;
  if (!file) {
    return res.status(400).json({
      success: false,
      message: "CSV file is required"
    });
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  const fileContent = file.buffer.toString("utf-8");
  let records;
  try {
    const sanitizedContent = fileContent.replace(/^\uFEFF/, "");
    records = (0, import_sync.parse)(sanitizedContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid CSV format"
    });
  }
  let created = 0;
  let updated = 0;
  const errors = [];
  const normalizedRecords = records.map((record) => {
    const normalized = {};
    Object.entries(record).forEach(([key, value]) => {
      const normalizedKey = normalizeHeaderKey(key);
      if (!normalizedKey) {
        return;
      }
      normalized[normalizedKey] = typeof value === "string" ? value : value === void 0 || value === null ? "" : String(value);
    });
    return normalized;
  });
  let WarehouseModel;
  try {
    WarehouseModel = await (0, import_warehouseModel.getWarehouseModelForStore)(storeId);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to access store warehouses. Please ensure you are logged in as a store user.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Store access error" })),
      warehouses: []
    });
  }
  const getValue = (row, ...keys) => {
    for (const key of keys) {
      const normalizedKey = normalizeHeaderKey(key);
      if (row[normalizedKey]) {
        return row[normalizedKey];
      }
    }
    return "";
  };
  try {
    for (let index = 0; index < normalizedRecords.length; index += 1) {
      const row = normalizedRecords[index];
      const name = getValue(row, "name", "warehouse", "warehouse name", "\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062A\u0648\u062F\u0639", "warehousename").trim();
      if (!name) {
        errors.push({ row: index + 1, message: "Name is required" });
        continue;
      }
      const description = getValue(row, "description", "details", "desc", "\u0648\u0635\u0641").trim();
      const address = getValue(row, "address", "location", "\u0639\u0646\u0648\u0627\u0646").trim();
      const status = getValue(row, "status", "state", "\u062D\u0627\u0644\u0629").trim() || "Active";
      let existing = await WarehouseModel.findOne({ name });
      if (!existing) {
        existing = await WarehouseModel.findOne({
          name: {
            $regex: new RegExp(`^${escapeRegex(name)}$`, "i")
          }
        });
      }
      if (existing) {
        existing.name = name;
        if (description) {
          existing.description = description;
        }
        if (address) {
          existing.address = address;
        }
        if (status === "Active" || status === "Inactive") {
          existing.status = status;
        }
        await existing.save();
        updated += 1;
      } else {
        await WarehouseModel.create({
          name,
          description: description || void 0,
          address: address || void 0,
          status: status === "Active" || status === "Inactive" ? status : "Active"
        });
        created += 1;
      }
    }
    const warehouses = await WarehouseModel.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Warehouses imported successfully",
      summary: {
        created,
        updated,
        failed: errors.length
      },
      errors,
      warehouses
    });
  } catch (error) {
    console.error("Error importing warehouses:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import warehouses. Please try again.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Import error" })),
      warehouses: []
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createWarehouse,
  deleteWarehouse,
  exportWarehouses,
  getWarehouseById,
  getWarehouses,
  importWarehouses,
  updateWarehouse,
  validateCreateWarehouse,
  validateUpdateWarehouse
});
