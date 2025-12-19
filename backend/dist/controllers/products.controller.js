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
var products_controller_exports = {};
__export(products_controller_exports, {
  createProduct: () => createProduct,
  deleteProduct: () => deleteProduct,
  getProduct: () => getProduct,
  getProductByBarcode: () => getProductByBarcode,
  getProductMetrics: () => getProductMetrics,
  getProducts: () => getProducts,
  importProducts: () => importProducts,
  updateProduct: () => updateProduct,
  upload: () => upload,
  validateCreateProduct: () => validateCreateProduct
});
module.exports = __toCommonJS(products_controller_exports);
var import_express_validator = require("express-validator");
var import_error = require("../middleware/error.middleware");
var import_productCache = require("../utils/productCache");
var import_productModel = require("../utils/productModel");
var import_multer = __toESM(require("multer"));
var import_sync = require("csv-parse/sync");
const validateCreateProduct = [
  (0, import_express_validator.body)("name").trim().notEmpty().withMessage("Product name is required").isLength({ max: 200 }).withMessage("Product name cannot exceed 200 characters"),
  (0, import_express_validator.body)("barcode").trim().notEmpty().withMessage("Barcode is required").isLength({ max: 100 }).withMessage("Barcode cannot exceed 100 characters"),
  (0, import_express_validator.body)("costPrice").isFloat({ min: 0 }).withMessage("Cost price must be a positive number"),
  (0, import_express_validator.body)("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
  (0, import_express_validator.body)("stock").optional().isInt({ min: 0 }).withMessage("Stock must be a non-negative integer"),
  (0, import_express_validator.body)("warehouseId").optional().trim().isString().withMessage("Warehouse ID must be a string"),
  (0, import_express_validator.body)("categoryId").optional().trim().isString().withMessage("Category ID must be a string"),
  (0, import_express_validator.body)("brandId").optional().trim().isString().withMessage("Brand ID must be a string")
];
const createProduct = (0, import_error.asyncHandler)(async (req, res) => {
  const errors = (0, import_express_validator.validationResult)(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array()
    });
  }
  const {
    name,
    barcode,
    costPrice,
    price,
    stock = 0,
    warehouseId,
    categoryId,
    brandId,
    description,
    lowStockAlert,
    internalSKU,
    vatPercentage = 0,
    vatInclusive = false,
    productionDate,
    expiryDate,
    batchNumber,
    discountRules,
    wholesalePrice,
    units,
    multiWarehouseDistribution,
    status = "active",
    showInQuickProducts = false
  } = req.body;
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const existingProduct = await Product.findOne({
      storeId: storeId.toLowerCase(),
      barcode: barcode.trim()
    });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: "Product with this barcode already exists"
      });
    }
    const productData = {
      storeId: storeId.toLowerCase(),
      // REQUIRED for multi-tenant isolation
      name: name.trim(),
      barcode: barcode.trim(),
      costPrice: parseFloat(costPrice),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      status: status || "active"
    };
    if (warehouseId) productData.warehouseId = warehouseId.trim();
    if (categoryId) productData.categoryId = categoryId.trim();
    if (brandId) productData.brandId = brandId.trim();
    if (description) productData.description = description.trim();
    if (lowStockAlert !== void 0) productData.lowStockAlert = parseInt(lowStockAlert) || 10;
    if (internalSKU) productData.internalSKU = internalSKU.trim();
    if (vatPercentage !== void 0) productData.vatPercentage = parseFloat(vatPercentage) || 0;
    if (vatInclusive !== void 0) productData.vatInclusive = Boolean(vatInclusive);
    if (productionDate) productData.productionDate = new Date(productionDate);
    if (expiryDate) productData.expiryDate = new Date(expiryDate);
    if (batchNumber) productData.batchNumber = batchNumber.trim();
    if (discountRules) productData.discountRules = discountRules;
    if (wholesalePrice !== void 0 && wholesalePrice > 0)
      productData.wholesalePrice = parseFloat(wholesalePrice);
    if (units && Array.isArray(units) && units.length > 0) productData.units = units;
    if (multiWarehouseDistribution && Array.isArray(multiWarehouseDistribution) && multiWarehouseDistribution.length > 0)
      productData.multiWarehouseDistribution = multiWarehouseDistribution;
    if (showInQuickProducts !== void 0) productData.showInQuickProducts = Boolean(showInQuickProducts);
    const product = await Product.create(productData);
    await (0, import_productCache.invalidateAllProductBarcodeCaches)(storeId, product);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: {
        product
      }
    });
  } catch (error) {
    console.error("Error creating product:", {
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
        message: "Product with this barcode already exists"
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create product. Please try again."
    });
  }
});
const getProducts = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user.",
      products: []
    });
  }
  try {
    const allParam = req.query.all;
    const fetchAll = allParam === "true" || allParam === "1" || allParam === "yes";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = fetchAll ? 1e4 : Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = fetchAll ? 0 : (page - 1) * limit;
    const searchTerm = req.query.search?.trim() || "";
    const showInQuickProducts = req.query.showInQuickProducts;
    const status = req.query.status;
    const includeCategories = req.query.includeCategories !== "false";
    const queryFilter = {
      storeId: storeId.toLowerCase()
    };
    if (showInQuickProducts !== void 0) {
      const showInQuickProductsValue2 = typeof showInQuickProducts === "string" ? showInQuickProducts === "true" || showInQuickProducts === "1" : Boolean(showInQuickProducts);
      queryFilter.showInQuickProducts = showInQuickProductsValue2;
    }
    if (status) {
      queryFilter.status = status;
    }
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.replace(/\s+/g, " ").trim();
      const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      queryFilter.$or = [
        { name: { $regex: escapedSearchTerm, $options: "i" } },
        { barcode: { $regex: escapedSearchTerm, $options: "i" } }
      ];
      if (normalizedSearchTerm.length > 0) {
        queryFilter.$or.push({ internalSKU: { $regex: escapedSearchTerm, $options: "i" } });
      }
    }
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    let totalProducts = 0;
    try {
      totalProducts = await Product.countDocuments(queryFilter);
    } catch (countError) {
      console.error("Error counting products:", {
        message: countError.message,
        stack: countError.stack,
        name: countError.name,
        code: countError.code
      });
      totalProducts = 0;
    }
    const totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
    const showInQuickProductsValue = typeof showInQuickProducts === "string" ? showInQuickProducts === "true" || showInQuickProducts === "1" : Boolean(showInQuickProducts);
    const fieldsToSelect = showInQuickProductsValue ? "name price stock barcode showInQuickProducts status units costPrice categoryId brandId description updatedAt" : void 0;
    let products = [];
    try {
      let query = Product.find(queryFilter);
      if (fieldsToSelect) {
        query = query.select(fieldsToSelect);
      }
      products = await query.sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    } catch (queryError) {
      console.error("Error querying products:", {
        message: queryError.message,
        stack: queryError.stack,
        name: queryError.name
      });
      products = [];
    }
    if (includeCategories && products.length > 0) {
      try {
        const categoryIds = [...new Set(
          products.map((p) => p.categoryId).filter((id) => id).map((id) => id.toString().trim())
        )].filter((id) => id.length > 0);
        if (categoryIds.length > 0) {
          const Category = (await import("../models/Category")).default;
          const mongoose = await import("mongoose");
          const categoryObjectIds = categoryIds.filter((id) => mongoose.default.Types.ObjectId.isValid(id)).map((id) => new mongoose.default.Types.ObjectId(id));
          const categories = categoryObjectIds.length > 0 ? await Category.find({ _id: { $in: categoryObjectIds } }).lean() : [];
          const categoryMap = {};
          categories.forEach((cat) => {
            const catId = cat._id?.toString() || cat.id;
            const categoryData = {
              id: catId,
              name: cat.name,
              nameAr: cat.name,
              // For frontend compatibility
              description: cat.description
            };
            categoryMap[catId] = categoryData;
          });
          products = products.map((product) => {
            if (product.categoryId) {
              const categoryIdStr = product.categoryId.toString().trim();
              if (mongoose.default.Types.ObjectId.isValid(categoryIdStr)) {
                const objectIdStr = new mongoose.default.Types.ObjectId(categoryIdStr).toString();
                product.category = categoryMap[objectIdStr] || null;
              } else {
                product.category = categoryMap[categoryIdStr] || null;
              }
            }
            return product;
          });
        }
      } catch (categoryError) {
        console.error("Error enriching products with categories:", categoryError);
      }
    }
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      products: products || [],
      pagination: {
        currentPage: fetchAll ? 1 : page,
        totalPages,
        totalProducts,
        limit: fetchAll ? totalProducts : limit,
        hasNextPage: fetchAll ? false : page < totalPages,
        hasPreviousPage: fetchAll ? false : page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching products:", {
      message: error.message,
      stack: error.stack,
      storeId,
      name: error.name,
      code: error.code
    });
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch products",
      products: [],
      error: process.env.NODE_ENV === "development" ? error.stack : void 0
    });
  }
});
const getProduct = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const product = await Product.findOne({
      _id: id,
      storeId: storeId.toLowerCase()
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    const productObj = product.toObject ? product.toObject() : product;
    if (productObj.categoryId) {
      productObj.categoryId = String(productObj.categoryId);
    }
    if (productObj.mainUnitId) {
      productObj.mainUnitId = String(productObj.mainUnitId);
    }
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        product: productObj
      }
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch product"
    });
  }
});
const updateProduct = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const updateData = { ...req.body };
    delete updateData.storeId;
    const oldProduct = await Product.findOne({
      _id: id,
      storeId: storeId.toLowerCase()
    }).lean();
    const product = await Product.findOneAndUpdate(
      { _id: id, storeId: storeId.toLowerCase() },
      updateData,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    if (oldProduct) {
      await (0, import_productCache.invalidateAllProductBarcodeCaches)(storeId, oldProduct);
    }
    await (0, import_productCache.invalidateAllProductBarcodeCaches)(storeId, product);
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: {
        product
      }
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update product"
    });
  }
});
const deleteProduct = (0, import_error.asyncHandler)(async (req, res) => {
  const { id } = req.params;
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const product = await Product.findOne({
      _id: id,
      storeId: storeId.toLowerCase()
    });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    const barcode = product.barcode;
    await Product.deleteOne({ _id: id, storeId: storeId.toLowerCase() });
    if (barcode) {
      await (0, import_productCache.invalidateProductCache)(storeId, barcode);
    }
    res.status(200).json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete product"
    });
  }
});
const storage = import_multer.default.memoryStorage();
const upload = (0, import_multer.default)({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/json",
      "text/plain"
      // Some systems send CSV as text/plain
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith(".csv") || file.originalname.endsWith(".json")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and JSON files are allowed."));
    }
  }
});
function extractField(row, possibleNames) {
  for (const name of possibleNames) {
    if (row[name] !== void 0 && row[name] !== null && row[name] !== "") {
      return row[name];
    }
  }
  return void 0;
}
function parseCSV(fileBuffer) {
  try {
    const content = fileBuffer.toString("utf-8");
    const records = (0, import_sync.parse)(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}
function parseJSON(fileBuffer) {
  try {
    const content = fileBuffer.toString("utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    } else if (typeof data === "object" && data !== null) {
      return [data];
    } else {
      throw new Error("JSON file must contain an array of products or a single product object");
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON file: ${error.message}`);
  }
}
function validateAndNormalizeProduct(row, rowIndex) {
  const name = extractField(row, ["Product Name", "product name", "ProductName", "productName", "Name", "name"]);
  const barcode = extractField(row, ["Barcode", "barcode"]);
  const costPrice = extractField(row, ["Cost Price", "cost price", "CostPrice", "costPrice"]);
  const sellingPrice = extractField(row, ["Selling Price", "selling price", "SellingPrice", "sellingPrice", "Price", "price"]);
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Product Name is missing or empty`
    };
  }
  if (!barcode || !barcode.toString().trim()) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Barcode is missing or empty`
    };
  }
  if (costPrice === void 0 || costPrice === null || costPrice === "") {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Cost Price is missing or empty`
    };
  }
  if (sellingPrice === void 0 || sellingPrice === null || sellingPrice === "") {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Selling Price is missing or empty`
    };
  }
  const parsedCostPrice = typeof costPrice === "number" ? costPrice : parseFloat(costPrice.toString().replace(/,/g, ""));
  const parsedSellingPrice = typeof sellingPrice === "number" ? sellingPrice : parseFloat(sellingPrice.toString().replace(/,/g, ""));
  if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Invalid Cost Price value`
    };
  }
  if (isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Invalid Selling Price value`
    };
  }
  return {
    isValid: true,
    product: {
      name: name.trim(),
      barcode: barcode.toString().trim(),
      costPrice: parsedCostPrice,
      price: parsedSellingPrice
    }
  };
}
const importProducts = (0, import_error.asyncHandler)(async (req, res) => {
  let storeId = req.user?.storeId || null;
  if (!storeId && req.user?.userId && req.user.userId !== "admin") {
    try {
      const User = (await import("../models/User")).default;
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error) {
      console.error("Error fetching user:", error.message);
    }
  }
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Please upload a CSV or JSON file."
    });
  }
  try {
    const fileName = req.file.originalname.toLowerCase();
    let rows;
    if (fileName.endsWith(".csv")) {
      rows = parseCSV(req.file.buffer);
    } else if (fileName.endsWith(".json")) {
      rows = parseJSON(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Please upload a CSV or JSON file."
      });
    }
    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "File is empty or contains no valid data."
      });
    }
    const validProducts = [];
    const errors = [];
    const skippedProducts = [];
    const barcodeSet = /* @__PURE__ */ new Set();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = validateAndNormalizeProduct(row, i);
      if (!validation.isValid) {
        errors.push(validation.error || `Row ${i + 1}: Invalid data`);
        skippedProducts.push(`Row ${i + 1}`);
        continue;
      }
      const product = validation.product;
      if (barcodeSet.has(product.barcode)) {
        errors.push(`Row ${i + 1}: Duplicate barcode "${product.barcode}" found in file`);
        skippedProducts.push(`Row ${i + 1} (${product.name})`);
        continue;
      }
      barcodeSet.add(product.barcode);
      validProducts.push({
        name: product.name,
        barcode: product.barcode,
        costPrice: product.costPrice,
        price: product.price,
        storeId: storeId.toLowerCase()
      });
    }
    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid products found in the file.",
        errors,
        skipped: skippedProducts.length
      });
    }
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const existingBarcodes = await Product.find({
      storeId: storeId.toLowerCase(),
      barcode: { $in: validProducts.map((p) => p.barcode) }
    }).select("barcode name");
    const existingBarcodeSet = new Set(existingBarcodes.map((p) => p.barcode));
    const productsToImport = [];
    const duplicateBarcodes = [];
    for (const product of validProducts) {
      if (existingBarcodeSet.has(product.barcode)) {
        const existingProduct = existingBarcodes.find((p) => p.barcode === product.barcode);
        duplicateBarcodes.push(`${product.name} (Barcode: ${product.barcode})`);
        errors.push(`Product "${product.name}" with barcode "${product.barcode}" already exists in database`);
        continue;
      }
      productsToImport.push({
        storeId: storeId.toLowerCase(),
        // REQUIRED for multi-tenant isolation
        name: product.name,
        barcode: product.barcode,
        costPrice: product.costPrice,
        price: product.price,
        stock: 0,
        status: "active"
      });
    }
    if (productsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All products already exist in the database (duplicate barcodes).",
        errors,
        duplicates: duplicateBarcodes.length
      });
    }
    const insertedProducts = await Product.insertMany(productsToImport, {
      ordered: false
      // Continue inserting even if some fail
    });
    await (0, import_productCache.invalidateStoreProductCache)(storeId);
    const summary = {
      totalRows: rows.length,
      validProducts: validProducts.length,
      imported: insertedProducts.length,
      skipped: skippedProducts.length + duplicateBarcodes.length,
      duplicates: duplicateBarcodes.length,
      errors: errors.length > 0 ? errors : void 0
    };
    res.status(200).json({
      success: true,
      message: `Successfully imported ${insertedProducts.length} product(s)`,
      summary,
      data: {
        imported: insertedProducts.length,
        skipped: summary.skipped,
        duplicates: summary.duplicates
      }
    });
  } catch (error) {
    console.error("Error importing products:", {
      message: error.message,
      stack: error.stack,
      storeId
    });
    if (error.name === "BulkWriteError" && error.writeErrors) {
      const writeErrors = error.writeErrors.map((e) => e.errmsg);
      const insertedCount = error.insertedCount || 0;
      return res.status(207).json({
        success: true,
        message: `Partially imported ${insertedCount} product(s). Some products failed to import.`,
        summary: {
          imported: insertedCount,
          failed: error.writeErrors.length,
          errors: writeErrors
        }
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to import products. Please check the file format and try again."
    });
  }
});
const getProductMetrics = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId || null;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  try {
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    const products = await Product.find({
      storeId: storeId.toLowerCase(),
      status: "active"
    }).lean();
    let totalValue = 0;
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let productsWithProfit = 0;
    let totalProfitMargin = 0;
    const lowStockProducts = [];
    products.forEach((product) => {
      let realStockQuantity = product.stock || 0;
      realStockQuantity = product.stock || 0;
      const productCostValue = (product.costPrice || 0) * realStockQuantity;
      const productSellingValue = (product.price || 0) * realStockQuantity;
      totalValue += productCostValue;
      totalCostValue += productCostValue;
      totalSellingValue += productSellingValue;
      if (product.costPrice > 0 && product.price > 0) {
        const profitMargin = (product.price - product.costPrice) / product.costPrice * 100;
        totalProfitMargin += profitMargin;
        productsWithProfit++;
      }
      const lowStockAlert = product.lowStockAlert || 10;
      if (realStockQuantity <= lowStockAlert) {
        lowStockProducts.push({
          id: product._id.toString(),
          name: product.name,
          stock: realStockQuantity,
          lowStockAlert,
          unit: product.mainUnitId || "unit"
        });
      }
    });
    const averageProfitMargin = productsWithProfit > 0 ? totalProfitMargin / productsWithProfit : 0;
    const overallProfitMargin = totalCostValue > 0 ? (totalSellingValue - totalCostValue) / totalCostValue * 100 : 0;
    res.status(200).json({
      success: true,
      message: "Product metrics retrieved successfully",
      data: {
        totalValue: parseFloat(totalValue.toFixed(2)),
        totalCostValue: parseFloat(totalCostValue.toFixed(2)),
        totalSellingValue: parseFloat(totalSellingValue.toFixed(2)),
        averageProfitMargin: parseFloat(averageProfitMargin.toFixed(2)),
        overallProfitMargin: parseFloat(overallProfitMargin.toFixed(2)),
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        totalProducts: products.length,
        productsWithStock: products.filter((p) => (p.stock || 0) > 0).length
      }
    });
  } catch (error) {
    console.error("Error fetching product metrics:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch product metrics"
    });
  }
});
const getProductByBarcode = (0, import_error.asyncHandler)(async (req, res) => {
  const { barcode } = req.params;
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  const decodedBarcode = decodeURIComponent(barcode || "");
  if (!decodedBarcode || !decodedBarcode.trim()) {
    return res.status(400).json({
      success: false,
      message: "Barcode is required"
    });
  }
  try {
    const trimmedBarcode = decodedBarcode.trim();
    const product = await (0, import_productCache.getProductByBarcode)(storeId, trimmedBarcode);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }
    const productObj = product;
    if (productObj.categoryId) {
      productObj.categoryId = String(productObj.categoryId);
    }
    if (productObj.mainUnitId) {
      productObj.mainUnitId = String(productObj.mainUnitId);
    }
    let matchedUnit = null;
    if (productObj.units && Array.isArray(productObj.units)) {
      matchedUnit = productObj.units.find((u) => u.barcode === trimmedBarcode);
    }
    res.status(200).json({
      success: true,
      message: "Product retrieved successfully",
      data: {
        product: productObj,
        matchedUnit: matchedUnit || null,
        matchedBarcode: trimmedBarcode
      }
    });
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch product by barcode"
    });
  }
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createProduct,
  deleteProduct,
  getProduct,
  getProductByBarcode,
  getProductMetrics,
  getProducts,
  importProducts,
  updateProduct,
  upload,
  validateCreateProduct
});
