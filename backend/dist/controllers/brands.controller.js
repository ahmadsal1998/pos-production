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
var brands_controller_exports = {};
__export(brands_controller_exports, {
  createBrand: () => createBrand,
  exportBrands: () => exportBrands,
  getBrands: () => getBrands,
  importBrands: () => importBrands,
  validateCreateBrand: () => validateCreateBrand
});
module.exports = __toCommonJS(brands_controller_exports);
var import_express_validator = require("express-validator");
var import_sync = require("csv-parse/sync");
var import_error = require("../middleware/error.middleware");
var import_Brand = __toESM(require("../models/Brand"));
var import_User = __toESM(require("../models/User"));
const validateCreateBrand = [
  (0, import_express_validator.body)("name").trim().notEmpty().withMessage("Brand name is required").isLength({ max: 120 }).withMessage("Brand name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
const createBrand = (0, import_error.asyncHandler)(async (req, res) => {
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
  console.log("\u{1F50D} Create Brand - User info from token:", {
    userId: req.user?.userId,
    email: req.user?.email,
    role: req.user?.role,
    storeId
  });
  if (!storeId && req.user?.userId && req.user.userId !== "admin") {
    try {
      const user = await import_User.default.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
        console.log("\u2705 Create Brand - Found storeId from user record:", storeId);
      }
    } catch (error) {
      console.error("\u274C Create Brand - Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    console.error("\u274C Create Brand - No storeId found for user");
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const trimmedName = name.trim();
    const existingBrand = await import_Brand.default.findOne({
      storeId: normalizedStoreId,
      name: trimmedName
    });
    if (existingBrand) {
      return res.status(400).json({
        success: false,
        message: "Brand with this name already exists"
      });
    }
    const brand = await import_Brand.default.create({
      storeId: normalizedStoreId,
      name: trimmedName,
      description: description?.trim() || void 0
    });
    console.log("\u2705 Create Brand - Brand created successfully:", brand._id);
    res.status(201).json({
      success: true,
      message: "Brand created successfully",
      brand
    });
  } catch (error) {
    console.error("\u274C Create Brand - Error:", {
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
        message: "Brand with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create brand. Please try again."
    });
  }
});
const getBrands = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      brands: []
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const brands = await import_Brand.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Brands retrieved successfully",
      brands
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch brands. Please try again.",
      brands: []
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
const exportBrands = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const brands = await import_Brand.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    const headers = ["name", "description", "createdAt"];
    const rows = brands.map((brand) => [
      escapeCsvValue(brand.name),
      escapeCsvValue(brand.description ?? ""),
      escapeCsvValue(brand.createdAt.toISOString())
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const utf8WithBom = `\uFEFF${csvContent}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="brands-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error) {
    console.error("Error exporting brands:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export brands. Please try again."
    });
  }
});
const importBrands = (0, import_error.asyncHandler)(async (req, res) => {
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
  const normalizedStoreId = storeId.toLowerCase().trim();
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
      const rawName = getValue(row, "name", "brand", "brand name", "\u0627\u0633\u0645 \u0627\u0644\u0639\u0644\u0627\u0645\u0629");
      const name = rawName.trim();
      if (!name) {
        errors.push({ row: index + 1, message: "Name is required" });
        continue;
      }
      const description = getValue(row, "description", "details", "desc", "\u0648\u0635\u0641").trim();
      let existing = await import_Brand.default.findOne({
        storeId: normalizedStoreId,
        name
      });
      if (!existing) {
        existing = await import_Brand.default.findOne({
          storeId: normalizedStoreId,
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
        await import_Brand.default.create({
          storeId: normalizedStoreId,
          name,
          description: description || void 0
        });
        created += 1;
      }
    }
    const brands = await import_Brand.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Brands imported successfully",
      summary: {
        created,
        updated,
        failed: errors.length
      },
      errors,
      brands
    });
  } catch (error) {
    console.error("Error importing brands:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import brands. Please try again.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Import error" })),
      brands: []
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBrand,
  exportBrands,
  getBrands,
  importBrands,
  validateCreateBrand
});
