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
var units_controller_exports = {};
__export(units_controller_exports, {
  createUnit: () => createUnit,
  deleteUnit: () => deleteUnit,
  exportUnits: () => exportUnits,
  getUnitById: () => getUnitById,
  getUnits: () => getUnits,
  importUnits: () => importUnits,
  updateUnit: () => updateUnit,
  validateCreateUnit: () => validateCreateUnit,
  validateUpdateUnit: () => validateUpdateUnit
});
module.exports = __toCommonJS(units_controller_exports);
var import_express_validator = require("express-validator");
var import_sync = require("csv-parse/sync");
var import_error = require("../middleware/error.middleware");
var import_unitModel = require("../utils/unitModel");
var import_userModel = require("../utils/userModel");
const validateCreateUnit = [
  (0, import_express_validator.body)("name").trim().notEmpty().withMessage("Unit name is required").isLength({ max: 120 }).withMessage("Unit name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
const validateUpdateUnit = [
  (0, import_express_validator.body)("name").optional().trim().notEmpty().withMessage("Unit name cannot be empty").isLength({ max: 120 }).withMessage("Unit name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
const createUnit = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { name, description } = req.body;
  let storeId = req.user?.storeId || null;
  console.log("\u{1F50D} Create Unit - User info from token:", {
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
        console.log("\u2705 Create Unit - Found storeId from user record:", storeId);
      }
    } catch (error) {
      console.error("\u274C Create Unit - Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    console.error("\u274C Create Unit - No storeId found for user");
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    console.log("\u{1F50D} Create Unit - Getting Unit model for storeId:", storeId);
    let Unit;
    try {
      Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
      console.log("\u2705 Create Unit - Unit model obtained");
    } catch (modelError) {
      console.error("\u274C Create Unit - Error getting Unit model:", {
        message: modelError.message,
        stack: modelError.stack,
        storeId
      });
      return res.status(400).json({
        success: false,
        message: modelError.message || "Failed to access store units. Please ensure your account is associated with a valid store."
      });
    }
    const trimmedName = name.trim();
    const existingUnit = await Unit.findOne({
      name: trimmedName
    });
    if (existingUnit) {
      return res.status(400).json({
        success: false,
        message: "Unit with this name already exists"
      });
    }
    const unit = await Unit.create({
      name: trimmedName,
      description: description?.trim() || void 0
    });
    console.log("\u2705 Create Unit - Unit created successfully:", unit._id);
    res.status(201).json({
      success: true,
      message: "Unit created successfully",
      unit
    });
  } catch (error) {
    console.error("\u274C Create Unit - Error:", {
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
        message: "Unit with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create unit. Please try again."
    });
  }
});
const getUnits = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      units: []
    });
  }
  try {
    const Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
    const units = await Unit.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Units retrieved successfully",
      units
    });
  } catch (error) {
    console.error("Error fetching units:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch units. Please try again.",
      units: []
    });
  }
});
const getUnitById = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
    const unit = await Unit.findById(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found"
      });
    }
    res.status(200).json({
      success: true,
      message: "Unit retrieved successfully",
      unit
    });
  } catch (error) {
    console.error("Error fetching unit:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch unit. Please try again."
    });
  }
});
const updateUnit = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const { id } = req.params;
  const { name, description } = req.body;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
    const unit = await Unit.findById(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found"
      });
    }
    if (name && name.trim() !== unit.name) {
      const existingUnit = await Unit.findOne({
        name: name.trim(),
        _id: { $ne: id }
      });
      if (existingUnit) {
        return res.status(400).json({
          success: false,
          message: "Unit with this name already exists"
        });
      }
    }
    if (name !== void 0) unit.name = name.trim();
    if (description !== void 0) unit.description = description?.trim() || void 0;
    await unit.save();
    res.status(200).json({
      success: true,
      message: "Unit updated successfully",
      unit
    });
  } catch (error) {
    console.error("Error updating unit:", error);
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
        message: "Unit with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update unit. Please try again."
    });
  }
});
const deleteUnit = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
    const unit = await Unit.findById(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found"
      });
    }
    await Unit.findByIdAndDelete(id);
    res.status(200).json({
      success: true,
      message: "Unit deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete unit. Please try again."
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
const exportUnits = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Unit = await (0, import_unitModel.getUnitModelForStore)(storeId);
    const units = await Unit.find().sort({ createdAt: -1 });
    const headers = ["name", "description", "createdAt"];
    const rows = units.map((unit) => [
      escapeCsvValue(unit.name),
      escapeCsvValue(unit.description ?? ""),
      escapeCsvValue(unit.createdAt.toISOString())
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const utf8WithBom = `\uFEFF${csvContent}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="units-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error) {
    console.error("Error exporting units:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export units. Please try again."
    });
  }
});
const importUnits = (0, import_error.asyncHandler)(async (req, res) => {
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
  let UnitModel;
  try {
    UnitModel = await (0, import_unitModel.getUnitModelForStore)(storeId);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to access store units. Please ensure you are logged in as a store user.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Store access error" })),
      units: []
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
      const rawName = getValue(row, "name", "unit", "unit name", "\u0627\u0633\u0645 \u0627\u0644\u0648\u062D\u062F\u0629");
      const name = rawName.trim();
      if (!name) {
        errors.push({ row: index + 1, message: "Name is required" });
        continue;
      }
      const description = getValue(row, "description", "details", "desc", "\u0648\u0635\u0641").trim();
      let existing = await UnitModel.findOne({ name });
      if (!existing) {
        existing = await UnitModel.findOne({
          name: {
            $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
          }
        });
      }
      if (existing) {
        existing.description = description || existing.description;
        await existing.save();
        updated += 1;
      } else {
        await UnitModel.create({
          name,
          description: description || void 0
        });
        created += 1;
      }
    }
    const units = await UnitModel.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Units imported successfully",
      summary: {
        created,
        updated,
        failed: errors.length
      },
      errors,
      units
    });
  } catch (error) {
    console.error("Error importing units:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import units. Please try again.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Import error" })),
      units: []
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createUnit,
  deleteUnit,
  exportUnits,
  getUnitById,
  getUnits,
  importUnits,
  updateUnit,
  validateCreateUnit,
  validateUpdateUnit
});
