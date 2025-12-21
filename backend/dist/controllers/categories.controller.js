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
var categories_controller_exports = {};
__export(categories_controller_exports, {
  createCategory: () => createCategory,
  exportCategories: () => exportCategories,
  getCategories: () => getCategories,
  importCategories: () => importCategories,
  validateCreateCategory: () => validateCreateCategory
});
module.exports = __toCommonJS(categories_controller_exports);
var import_express_validator = require("express-validator");
var import_sync = require("csv-parse/sync");
var import_error = require("../middleware/error.middleware");
var import_Category = __toESM(require("../models/Category"));
var import_User = __toESM(require("../models/User"));
var import_logger = require("../utils/logger");
const validateCreateCategory = [
  (0, import_express_validator.body)("name").trim().notEmpty().withMessage("Category name is required").isLength({ max: 120 }).withMessage("Category name cannot exceed 120 characters"),
  (0, import_express_validator.body)("description").optional({ nullable: true }).isString().withMessage("Description must be a string").isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
];
const createCategory = (0, import_error.asyncHandler)(async (req, res) => {
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
  import_logger.log.debug("Create Category - User info from token", {
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
        import_logger.log.debug("Create Category - Found storeId from user record", { storeId });
      }
    } catch (error) {
      import_logger.log.error("Create Category - Error fetching user", error);
    }
  }
  if (!storeId) {
    import_logger.log.warn("Create Category - No storeId found for user");
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const existingCategory = await import_Category.default.findOne({
      storeId: normalizedStoreId,
      name: name.trim()
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists"
      });
    }
    const category = await import_Category.default.create({
      storeId: normalizedStoreId,
      name: name.trim(),
      description: description?.trim() || void 0
    });
    import_logger.log.debug("Create Category - Category created successfully", { categoryId: category._id });
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    import_logger.log.error("Create Category - Error", error, {
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
        message: "Category with this name already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create category. Please try again."
    });
  }
});
const getCategories = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      categories: []
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const categories = await import_Category.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      categories
    });
  } catch (error) {
    import_logger.log.error("Error fetching categories", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch categories. Please try again.",
      categories: []
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
const exportCategories = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const normalizedStoreId = storeId.toLowerCase().trim();
    const categories = await import_Category.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    const headers = ["name", "description", "imageUrl", "createdAt"];
    const rows = categories.map((category) => [
      escapeCsvValue(category.name),
      escapeCsvValue(category.description ?? ""),
      escapeCsvValue(category.imageUrl ?? ""),
      escapeCsvValue(category.createdAt.toISOString())
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const utf8WithBom = `\uFEFF${csvContent}`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="categories-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(utf8WithBom);
  } catch (error) {
    import_logger.log.error("Error exporting categories", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to export categories. Please try again."
    });
  }
});
const importCategories = (0, import_error.asyncHandler)(async (req, res) => {
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
      const name = getValue(row, "name", "category", "category name", "\u0627\u0633\u0645 \u0627\u0644\u0641\u0626\u0629", "categoryname").trim();
      if (!name) {
        errors.push({ row: index + 1, message: "Name is required" });
        continue;
      }
      const description = getValue(row, "description", "details", "desc", "\u0648\u0635\u0641").trim();
      const imageUrl = getValue(row, "imageurl", "image url", "image", "\u0635\u0648\u0631\u0629").trim();
      let existing = await import_Category.default.findOne({
        storeId: normalizedStoreId,
        name
      });
      if (!existing) {
        existing = await import_Category.default.findOne({
          storeId: normalizedStoreId,
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
        if (imageUrl) {
          existing.imageUrl = imageUrl;
        }
        await existing.save();
        updated += 1;
      } else {
        await import_Category.default.create({
          storeId: normalizedStoreId,
          name,
          description: description || void 0,
          imageUrl: imageUrl || void 0
        });
        created += 1;
      }
    }
    const categories = await import_Category.default.find({ storeId: normalizedStoreId }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Categories imported successfully",
      summary: {
        created,
        updated,
        failed: errors.length
      },
      errors,
      categories
    });
  } catch (error) {
    import_logger.log.error("Error importing categories", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import categories. Please try again.",
      summary: {
        created: 0,
        updated: 0,
        failed: normalizedRecords.length
      },
      errors: normalizedRecords.map((_, index) => ({ row: index + 1, message: "Import error" })),
      categories: []
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCategory,
  exportCategories,
  getCategories,
  importCategories,
  validateCreateCategory
});
