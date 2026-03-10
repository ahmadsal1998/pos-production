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
var import_product = require("../services/product.service");
var import_Category = __toESM(require("../models/Category"));
var import_Unit = __toESM(require("../models/Unit"));
var import_multer = __toESM(require("multer"));
var import_sync = require("csv-parse/sync");
var import_logger = require("../utils/logger");
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
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store."
    });
  }
  try {
    const { product } = await import_product.productService.create(storeId, req.body);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: { product }
    });
  } catch (error) {
    import_logger.log.error("Error creating product", error, { storeId });
    if (error.name === "ValidationError") {
      const errorMessages = Object.values(error.errors || {}).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(", ") || "Validation error"
      });
    }
    if (error.code === "DUPLICATE_BARCODE" || error.code === 11e3) {
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
    const maxProductsFullSync = Math.max(1e3, parseInt(process.env.MAX_PRODUCTS_FULL_SYNC || "10000", 10));
    const allParam = req.query.all;
    const allParamStr = typeof allParam === "string" ? allParam.toLowerCase() : "";
    const fetchAll = allParamStr === "true" || allParamStr === "1" || allParamStr === "yes";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = fetchAll ? maxProductsFullSync : Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = fetchAll ? 0 : (page - 1) * limit;
    const modifiedSince = req.query.modifiedSince?.trim() || "";
    const searchTerm = req.query.search?.trim() || "";
    const showInQuickProducts = req.query.showInQuickProducts;
    const status = req.query.status;
    const includeCategories = req.query.includeCategories !== "false";
    const viewParam = req.query.view?.toLowerCase();
    const viewList = viewParam === "list";
    const queryFilter = {
      storeId: storeId.toLowerCase()
    };
    if (modifiedSince) {
      const sinceDate = new Date(modifiedSince);
      if (!isNaN(sinceDate.getTime())) {
        queryFilter.updatedAt = { $gte: sinceDate };
      }
    }
    if (showInQuickProducts !== void 0) {
      const showInQuickProductsValue2 = typeof showInQuickProducts === "string" ? showInQuickProducts === "true" || showInQuickProducts === "1" : Boolean(showInQuickProducts);
      queryFilter.showInQuickProducts = showInQuickProductsValue2;
    }
    if (status) {
      queryFilter.status = status;
    }
    if (searchTerm) {
      const normalizedSearchTerm = searchTerm.replace(/\s+/g, " ").trim();
      const isBarcodeSearch = /^[0-9]+$/.test(normalizedSearchTerm);
      if (isBarcodeSearch) {
        const trimmedBarcode = normalizedSearchTerm.trim();
        const escapedBarcode = trimmedBarcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        queryFilter.$or = [
          { barcode: { $regex: `^${escapedBarcode}$`, $options: "i" } },
          // Exact product barcode match only
          { "units.barcode": { $regex: `^${escapedBarcode}$`, $options: "i" } }
          // Exact unit barcode match only
        ];
      } else {
        const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        queryFilter.$or = [
          { name: { $regex: escapedSearchTerm, $options: "i" } },
          { barcode: { $regex: escapedSearchTerm, $options: "i" } },
          { "units.barcode": { $regex: escapedSearchTerm, $options: "i" } }
        ];
        if (normalizedSearchTerm.length > 0) {
          queryFilter.$or.push({ internalSKU: { $regex: escapedSearchTerm, $options: "i" } });
        }
      }
    }
    const Product = await (0, import_productModel.getProductModelForStore)(storeId);
    let childProductWithExactBarcode = null;
    if (searchTerm && /^[0-9]+$/.test(searchTerm.trim())) {
      const exactBarcode = searchTerm.trim();
      try {
        let directQuery = {
          storeId: storeId.toLowerCase(),
          barcode: exactBarcode,
          // Child products have parentProductId that exists and is not null/empty
          $and: [
            { parentProductId: { $exists: true } },
            { parentProductId: { $ne: null } },
            { parentProductId: { $ne: "" } }
          ]
        };
        if (status) {
          directQuery.status = status;
        }
        if (queryFilter.showInQuickProducts !== void 0) {
          directQuery.showInQuickProducts = queryFilter.showInQuickProducts;
        }
        childProductWithExactBarcode = await Product.findOne(directQuery).lean();
        if (!childProductWithExactBarcode) {
          directQuery = {
            storeId: storeId.toLowerCase(),
            barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            $and: [
              { parentProductId: { $exists: true } },
              { parentProductId: { $ne: null } },
              { parentProductId: { $ne: "" } }
            ]
          };
          if (status) {
            directQuery.status = status;
          }
          if (queryFilter.showInQuickProducts !== void 0) {
            directQuery.showInQuickProducts = queryFilter.showInQuickProducts;
          }
          childProductWithExactBarcode = await Product.findOne(directQuery).lean();
        }
        if (!childProductWithExactBarcode && !status) {
          const fallbackQuery = {
            storeId: storeId.toLowerCase(),
            barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            $and: [
              { parentProductId: { $exists: true } },
              { parentProductId: { $ne: null } },
              { parentProductId: { $ne: "" } }
            ]
          };
          if (queryFilter.showInQuickProducts !== void 0) {
            fallbackQuery.showInQuickProducts = queryFilter.showInQuickProducts;
          }
          childProductWithExactBarcode = await Product.findOne(fallbackQuery).lean();
        }
        if (!childProductWithExactBarcode) {
          const parentQuery = {
            storeId: storeId.toLowerCase(),
            "units.barcode": { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
            $or: [
              { parentProductId: { $exists: false } },
              { parentProductId: null },
              { parentProductId: "" }
            ]
          };
          const parentWithUnitBarcode = await Product.findOne(parentQuery).lean();
          if (parentWithUnitBarcode) {
            const parentId = parentWithUnitBarcode._id?.toString() || parentWithUnitBarcode.id;
            let childQuery = {
              storeId: storeId.toLowerCase(),
              parentProductId: parentId,
              // Match parent ID exactly
              barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
            };
            if (status) {
              childQuery.status = status;
            }
            if (queryFilter.showInQuickProducts !== void 0) {
              childQuery.showInQuickProducts = queryFilter.showInQuickProducts;
            }
            childProductWithExactBarcode = await Product.findOne(childQuery).lean();
            if (!childProductWithExactBarcode) {
              const anyChildQuery = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId
              };
              if (status) {
                anyChildQuery.status = status;
              }
              if (queryFilter.showInQuickProducts !== void 0) {
                anyChildQuery.showInQuickProducts = queryFilter.showInQuickProducts;
              }
              childProductWithExactBarcode = await Product.findOne(anyChildQuery).lean();
            }
            if (!childProductWithExactBarcode && !status) {
              const childFallbackQuery = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId
              };
              if (queryFilter.showInQuickProducts !== void 0) {
                childFallbackQuery.showInQuickProducts = queryFilter.showInQuickProducts;
              }
              childProductWithExactBarcode = await Product.findOne(childFallbackQuery).lean();
            }
            if (childProductWithExactBarcode && process.env.NODE_ENV === "development") {
              import_logger.log.debug("Found child product via unit barcode match (direct query)", {
                unitBarcode: exactBarcode,
                parentId,
                parentName: parentWithUnitBarcode.name,
                childId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
                childBarcode: childProductWithExactBarcode.barcode,
                childName: childProductWithExactBarcode.name,
                childPrice: childProductWithExactBarcode.price,
                childStock: childProductWithExactBarcode.stock,
                note: "Child product data will be returned, not parent product data"
              });
            } else {
              const matchedUnit = parentWithUnitBarcode.units?.find(
                (u) => u.barcode && u.barcode.trim().toLowerCase() === exactBarcode.toLowerCase()
              );
              if (matchedUnit) {
                childProductWithExactBarcode = (0, import_productCache.createPseudoProductFromUnit)(
                  parentWithUnitBarcode,
                  matchedUnit,
                  exactBarcode
                );
                if (process.env.NODE_ENV === "development") {
                  import_logger.log.debug("No child product found for unit barcode - returning pseudo product from unit (direct query)", {
                    unitBarcode: exactBarcode,
                    parentId,
                    parentName: parentWithUnitBarcode.name,
                    unitName: matchedUnit.unitName,
                    unitPrice: matchedUnit.sellingPrice,
                    pseudoProductBarcode: childProductWithExactBarcode.barcode,
                    pseudoProductPrice: childProductWithExactBarcode.price,
                    note: "Returning pseudo product with unit-specific pricing and stock because no child products exist"
                  });
                }
              } else {
                childProductWithExactBarcode = parentWithUnitBarcode;
                if (process.env.NODE_ENV === "development") {
                  import_logger.log.debug("No child product found for unit barcode - returning parent product as fallback (direct query)", {
                    unitBarcode: exactBarcode,
                    parentId,
                    parentName: parentWithUnitBarcode.name,
                    parentBarcode: parentWithUnitBarcode.barcode,
                    note: "Returning parent product because no child products exist for this unit barcode"
                  });
                }
              }
            }
          }
        }
        if (childProductWithExactBarcode && process.env.NODE_ENV === "development") {
          import_logger.log.debug("Found child product with exact barcode match (direct query)", {
            childId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
            childBarcode: childProductWithExactBarcode.barcode,
            childName: childProductWithExactBarcode.name,
            childPrice: childProductWithExactBarcode.price,
            childStock: childProductWithExactBarcode.stock,
            childCostPrice: childProductWithExactBarcode.costPrice,
            parentProductId: childProductWithExactBarcode.parentProductId,
            searchBarcode: exactBarcode,
            matchType: "exact"
          });
        } else if (process.env.NODE_ENV === "development") {
          import_logger.log.debug("No child product found with exact barcode match (direct query)", {
            searchBarcode: exactBarcode,
            queryUsed: directQuery,
            note: "Will proceed with general search"
          });
        }
      } catch (directQueryError) {
        import_logger.log.error("Error in direct child product query", directQueryError, {
          searchBarcode: exactBarcode
        });
      }
    }
    let totalProducts = 0;
    try {
      totalProducts = await Product.countDocuments(queryFilter);
    } catch (countError) {
      import_logger.log.error("Error counting products", countError, {
        name: countError.name,
        code: countError.code
      });
      totalProducts = 0;
    }
    let totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
    const showInQuickProductsValue = typeof showInQuickProducts === "string" ? showInQuickProducts === "true" || showInQuickProducts === "1" : Boolean(showInQuickProducts);
    let fieldsToSelect;
    if (viewList) {
      fieldsToSelect = "name price stock barcode status categoryId parentProductId costPrice updatedAt";
    } else if (showInQuickProductsValue) {
      fieldsToSelect = "name price stock barcode showInQuickProducts status units costPrice categoryId brandId description updatedAt";
    }
    let products = [];
    if (childProductWithExactBarcode) {
      products = [childProductWithExactBarcode];
      totalProducts = 1;
      totalPages = 1;
      if (process.env.NODE_ENV === "development") {
        const isChildProduct = !!childProductWithExactBarcode.parentProductId;
        import_logger.log.debug("Barcode search: Using product from direct query, skipping general query", {
          productId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
          productBarcode: childProductWithExactBarcode.barcode,
          productName: childProductWithExactBarcode.name,
          productPrice: childProductWithExactBarcode.price,
          productStock: childProductWithExactBarcode.stock,
          productCostPrice: childProductWithExactBarcode.costPrice,
          isChildProduct,
          parentProductId: childProductWithExactBarcode.parentProductId,
          note: isChildProduct ? "Returning child product from direct query" : "Returning parent product from direct query (no child products exist for this unit barcode)"
        });
      }
    } else {
      try {
        let query = Product.find(queryFilter);
        if (fieldsToSelect) {
          const fieldsWithParent = fieldsToSelect.includes("parentProductId") ? fieldsToSelect : `${fieldsToSelect} parentProductId`;
          query = query.select(fieldsWithParent);
        }
        products = await query.sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        if (searchTerm && /^[0-9]+$/.test(searchTerm.trim())) {
          const exactBarcodeMatch = searchTerm.trim().toLowerCase();
          const exactBarcodeMatches = [];
          const unitBarcodeMatches = [];
          products.forEach((product) => {
            const productBarcode = String(product.barcode || "").trim().toLowerCase();
            if (productBarcode === exactBarcodeMatch) {
              exactBarcodeMatches.push(product);
              if (process.env.NODE_ENV === "development" && product.parentProductId) {
                import_logger.log.debug("Found child product with exact barcode match in general search", {
                  childId: product._id || product.id,
                  childBarcode: product.barcode,
                  childName: product.name,
                  childPrice: product.price,
                  parentProductId: product.parentProductId
                });
              }
            } else {
              const hasUnitMatch = product.units && Array.isArray(product.units) && product.units.some((unit) => {
                const unitBarcode = String(unit.barcode || "").trim().toLowerCase();
                return unitBarcode === exactBarcodeMatch;
              });
              if (hasUnitMatch) {
                unitBarcodeMatches.push(product);
              }
            }
          });
          const childWithExactMatch = exactBarcodeMatches.find((p) => !!p.parentProductId);
          const parentWithExactMatch = exactBarcodeMatches.find((p) => !p.parentProductId);
          if (childWithExactMatch) {
            products = [childWithExactMatch];
            totalProducts = 1;
            totalPages = 1;
            if (process.env.NODE_ENV === "development") {
              import_logger.log.debug("Barcode search: Found child product with exact match in results, returning only child product", {
                childId: childWithExactMatch._id || childWithExactMatch.id,
                childBarcode: childWithExactMatch.barcode,
                childName: childWithExactMatch.name,
                childPrice: childWithExactMatch.price,
                childStock: childWithExactMatch.stock,
                childCostPrice: childWithExactMatch.costPrice,
                childCategoryId: childWithExactMatch.categoryId,
                parentProductId: childWithExactMatch.parentProductId,
                excludedCount: exactBarcodeMatches.length + unitBarcodeMatches.length - 1,
                note: "Child product data will be preserved - parent product data will NOT replace child data"
              });
            }
          } else if (unitBarcodeMatches.length > 0) {
            const childProductsFromUnits = [];
            const parentProductsFromUnits = [];
            for (const parentProduct of unitBarcodeMatches) {
              const parentId = parentProduct._id?.toString() || parentProduct.id;
              let childQuery = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId,
                barcode: { $regex: `^${exactBarcodeMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
              };
              if (status) {
                childQuery.status = status;
              }
              let childProduct = await Product.findOne(childQuery).lean();
              if (!childProduct) {
                const anyChildQuery = {
                  storeId: storeId.toLowerCase(),
                  parentProductId: parentId
                };
                if (status) {
                  anyChildQuery.status = status;
                }
                childProduct = await Product.findOne(anyChildQuery).lean();
              }
              if (!childProduct && !status) {
                const childFallbackQuery = {
                  storeId: storeId.toLowerCase(),
                  parentProductId: parentId
                };
                childProduct = await Product.findOne(childFallbackQuery).lean();
              }
              if (childProduct) {
                childProductsFromUnits.push(childProduct);
                if (process.env.NODE_ENV === "development") {
                  import_logger.log.debug("Found child product via unit barcode match in general search", {
                    unitBarcode: exactBarcodeMatch,
                    parentId,
                    parentName: parentProduct.name,
                    childId: childProduct._id || childProduct.id,
                    childBarcode: childProduct.barcode,
                    childName: childProduct.name,
                    childPrice: childProduct.price,
                    childStock: childProduct.stock,
                    note: "Returning child product data, not parent product data"
                  });
                }
              } else {
                const matchedUnit = parentProduct.units?.find(
                  (u) => u.barcode && u.barcode.trim().toLowerCase() === exactBarcodeMatch.toLowerCase()
                );
                if (matchedUnit) {
                  const pseudoProduct = (0, import_productCache.createPseudoProductFromUnit)(
                    parentProduct,
                    matchedUnit,
                    exactBarcodeMatch
                  );
                  parentProductsFromUnits.push(pseudoProduct);
                  if (process.env.NODE_ENV === "development") {
                    import_logger.log.debug("No child product found for unit barcode - returning pseudo product from unit", {
                      unitBarcode: exactBarcodeMatch,
                      parentId,
                      parentName: parentProduct.name,
                      unitName: matchedUnit.unitName,
                      unitPrice: matchedUnit.sellingPrice,
                      pseudoProductBarcode: pseudoProduct.barcode,
                      pseudoProductPrice: pseudoProduct.price,
                      note: "Returning pseudo product with unit-specific pricing and stock because no child products exist"
                    });
                  }
                } else {
                  parentProductsFromUnits.push(parentProduct);
                  if (process.env.NODE_ENV === "development") {
                    import_logger.log.debug("No child product found for unit barcode - returning parent product as fallback", {
                      unitBarcode: exactBarcodeMatch,
                      parentId,
                      parentName: parentProduct.name,
                      parentBarcode: parentProduct.barcode,
                      note: "Returning parent product because no child products exist for this unit barcode"
                    });
                  }
                }
              }
            }
            if (childProductsFromUnits.length > 0) {
              products = parentWithExactMatch ? [parentWithExactMatch, ...childProductsFromUnits, ...parentProductsFromUnits] : [...childProductsFromUnits, ...parentProductsFromUnits];
            } else {
              products = parentWithExactMatch ? [parentWithExactMatch, ...parentProductsFromUnits] : parentProductsFromUnits;
            }
            products.sort((a, b) => {
              const aIsChild = !!a.parentProductId;
              const bIsChild = !!b.parentProductId;
              if (aIsChild && !bIsChild) return -1;
              if (!aIsChild && bIsChild) return 1;
              const aIsExactMatch = exactBarcodeMatches.some((p) => (p._id || p.id) === (a._id || a.id));
              const bIsExactMatch = exactBarcodeMatches.some((p) => (p._id || p.id) === (b._id || b.id));
              if (aIsExactMatch && !bIsExactMatch) return -1;
              if (!aIsExactMatch && bIsExactMatch) return 1;
              return 0;
            });
            totalProducts = products.length;
            totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
          } else {
            products = [...exactBarcodeMatches].sort((a, b) => {
              const aIsChild = !!a.parentProductId;
              const bIsChild = !!b.parentProductId;
              if (aIsChild && !bIsChild) return -1;
              if (!aIsChild && bIsChild) return 1;
              return 0;
            });
            totalProducts = products.length;
            totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
          }
        }
        if (process.env.NODE_ENV === "development" && searchTerm) {
          const childProducts = products.filter((p) => p.parentProductId);
          const parentProducts = products.filter((p) => !p.parentProductId);
          import_logger.log.debug("Product search results", {
            searchTerm,
            totalFound: products.length,
            childProducts: childProducts.length,
            parentProducts: parentProducts.length,
            // Log first few results to verify correct products are returned
            sampleResults: products.slice(0, 5).map((p) => ({
              id: p._id || p.id,
              name: p.name,
              barcode: p.barcode,
              price: p.price,
              isChild: !!p.parentProductId,
              parentProductId: p.parentProductId
            })),
            // Log the first result to see what's being returned
            firstResult: products.length > 0 ? {
              id: products[0]._id || products[0].id,
              name: products[0].name,
              barcode: products[0].barcode,
              price: products[0].price,
              isChild: !!products[0].parentProductId,
              parentProductId: products[0].parentProductId
            } : null
          });
        }
      } catch (queryError) {
        import_logger.log.error("Error querying products", queryError, {
          name: queryError.name,
          queryFilter: JSON.stringify(queryFilter)
        });
        products = [];
      }
    }
    if (products.length > 0) {
      try {
        const childProducts = products.filter((p) => p.parentProductId);
        if (childProducts.length > 0) {
          const parentProductIds = [...new Set(
            childProducts.map((p) => p.parentProductId).filter((id) => id).map((id) => id.toString().trim())
          )].filter((id) => id.length > 0);
          if (parentProductIds.length > 0) {
            const mongoose = await import("mongoose");
            const parentObjectIds = [];
            const parentStringIds = [];
            parentProductIds.forEach((id) => {
              if (mongoose.default.Types.ObjectId.isValid(id)) {
                parentObjectIds.push(new mongoose.default.Types.ObjectId(id));
              } else {
                parentStringIds.push(id);
              }
            });
            const parentQuery = {
              storeId: storeId.toLowerCase(),
              status: "active"
            };
            if (parentObjectIds.length > 0 && parentStringIds.length > 0) {
              parentQuery.$or = [
                { _id: { $in: parentObjectIds } },
                { _id: { $in: parentStringIds } }
              ];
            } else if (parentObjectIds.length > 0) {
              parentQuery._id = { $in: parentObjectIds };
            } else if (parentStringIds.length > 0) {
              parentQuery._id = { $in: parentStringIds };
            }
            const parentProducts = parentQuery.$or || parentQuery._id ? await Product.find(parentQuery).select("_id name barcode").lean() : [];
            const parentMap = {};
            parentProducts.forEach((parent) => {
              const parentId = parent._id?.toString() || parent.id;
              parentMap[parentId] = {
                id: parentId,
                name: parent.name,
                barcode: parent.barcode
              };
            });
            products = products.map((product) => {
              if (product.parentProductId) {
                const parentIdStr = product.parentProductId.toString().trim();
                let parentInfo = null;
                if (mongoose.default.Types.ObjectId.isValid(parentIdStr)) {
                  const objectIdStr = new mongoose.default.Types.ObjectId(parentIdStr).toString();
                  parentInfo = parentMap[objectIdStr] || null;
                }
                if (!parentInfo) {
                  parentInfo = parentMap[parentIdStr] || null;
                }
                const originalChildData = {
                  name: product.name,
                  barcode: product.barcode,
                  price: product.price,
                  stock: product.stock,
                  costPrice: product.costPrice
                };
                product.parentProduct = parentInfo;
                if (process.env.NODE_ENV === "development") {
                  import_logger.log.debug("Returning child product with own data", {
                    childId: product._id || product.id,
                    childName: product.name,
                    childBarcode: product.barcode,
                    childPrice: product.price,
                    childStock: product.stock,
                    childCostPrice: product.costPrice,
                    parentProductId: product.parentProductId,
                    parentName: parentInfo?.name,
                    parentBarcode: parentInfo?.barcode,
                    // Verify child data is intact
                    dataIntegrity: {
                      nameMatches: product.name === originalChildData.name,
                      barcodeMatches: product.barcode === originalChildData.barcode,
                      priceMatches: product.price === originalChildData.price,
                      stockMatches: product.stock === originalChildData.stock
                    }
                  });
                  if (product.name !== originalChildData.name || product.barcode !== originalChildData.barcode || product.price !== originalChildData.price) {
                    import_logger.log.warn("\u26A0\uFE0F WARNING: Child product data appears to have been modified!", {
                      original: originalChildData,
                      current: {
                        name: product.name,
                        barcode: product.barcode,
                        price: product.price
                      }
                    });
                  }
                }
              }
              return product;
            });
          }
        }
      } catch (parentEnrichmentError) {
        import_logger.log.error("Error enriching child products with parent information", parentEnrichmentError);
      }
    }
    if (includeCategories && products.length > 0) {
      try {
        const categoryIds = [...new Set(
          products.map((p) => p.categoryId).filter((id) => id).map((id) => id.toString().trim())
        )].filter((id) => id.length > 0);
        if (categoryIds.length > 0) {
          const mongoose = await import("mongoose");
          const categoryObjectIds = categoryIds.filter((id) => mongoose.default.Types.ObjectId.isValid(id)).map((id) => new mongoose.default.Types.ObjectId(id));
          const categories = categoryObjectIds.length > 0 ? await import_Category.default.find({ _id: { $in: categoryObjectIds } }).lean() : [];
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
        import_logger.log.error("Error enriching products with categories", categoryError);
      }
    }
    if (process.env.NODE_ENV === "development" && searchTerm && products.length > 0) {
      const returnedChildProducts = products.filter((p) => p.parentProductId);
      import_logger.log.debug("Final response - products being returned to frontend", {
        searchTerm,
        totalProducts: products.length,
        childProducts: returnedChildProducts.length,
        firstProduct: products[0] ? {
          id: products[0]._id || products[0].id,
          name: products[0].name,
          barcode: products[0].barcode,
          price: products[0].price,
          isChild: !!products[0].parentProductId,
          parentProductId: products[0].parentProductId
        } : null
      });
    }
    const paginationPage = fetchAll ? 1 : page;
    const paginationLimit = fetchAll ? totalProducts : limit;
    res.status(200).json({
      success: true,
      message: "Products retrieved successfully",
      products: products || [],
      items: products || [],
      pagination: {
        page: paginationPage,
        limit: paginationLimit,
        total: totalProducts,
        totalPages,
        currentPage: paginationPage,
        totalProducts,
        hasNextPage: fetchAll ? false : page < totalPages,
        hasPreviousPage: fetchAll ? false : page > 1
      }
    });
  } catch (error) {
    import_logger.log.error("Error fetching products", error, {
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
  const Product = await (0, import_productModel.getProductModelForStore)(storeId);
  const oldProduct = await Product.findOne({
    _id: id,
    storeId: storeId.toLowerCase()
  }).lean();
  if (!oldProduct) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }
  const updateData = { ...req.body };
  delete updateData.storeId;
  if (updateData.initialQuantity !== void 0 || updateData.stock !== void 0) {
    const newQuantity = updateData.initialQuantity !== void 0 ? parseInt(updateData.initialQuantity) : updateData.stock !== void 0 ? parseInt(updateData.stock) : null;
    if (newQuantity !== null && !isNaN(newQuantity)) {
      updateData.stock = newQuantity;
      const units = updateData.units || oldProduct.units;
      if (units && Array.isArray(units) && units.length > 0) {
        const sortedUnits = [...units].sort((a, b) => (a.order || 0) - (b.order || 0));
        if (sortedUnits.length > 1 && newQuantity > 0) {
          let calculatedTotal = newQuantity;
          for (let i = 1; i < sortedUnits.length; i++) {
            const currentUnit = sortedUnits[i];
            const unitsInPrev = currentUnit.unitsInPrevious || 1;
            if (unitsInPrev > 0) {
              calculatedTotal = calculatedTotal * unitsInPrev;
            }
          }
          updateData.total_units = calculatedTotal;
        } else {
          updateData.total_units = newQuantity;
        }
      } else {
        updateData.total_units = newQuantity;
      }
      delete updateData.initialQuantity;
    }
  }
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
  const sellingPrice = extractField(row, ["Selling Price", "selling price", "Sale Price", "sale price", "SellingPrice", "sellingPrice", "SalePrice", "salePrice", "Price", "price"]);
  const categoryName = extractField(row, ["Category", "category"]);
  const unitName = extractField(row, ["Unit", "unit"]);
  const quantityRaw = extractField(row, ["Quantity", "quantity", "Stock", "stock"]);
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
      error: `Row ${rowIndex + 1}: Selling Price / Sale Price is missing or empty`
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
      error: `Row ${rowIndex + 1}: Invalid Sale Price value`
    };
  }
  let quantity = 0;
  if (quantityRaw !== void 0 && quantityRaw !== null && quantityRaw !== "") {
    const parsed = typeof quantityRaw === "number" ? quantityRaw : parseFloat(quantityRaw.toString().replace(/,/g, ""));
    if (!isNaN(parsed) && parsed >= 0) {
      quantity = Math.floor(parsed);
    }
  }
  return {
    isValid: true,
    product: {
      name: name.trim(),
      barcode: barcode.toString().trim(),
      costPrice: parsedCostPrice,
      price: parsedSellingPrice,
      categoryName: categoryName && String(categoryName).trim() ? String(categoryName).trim() : void 0,
      unitName: unitName && String(unitName).trim() ? String(unitName).trim() : void 0,
      quantity
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
      import_logger.log.error("Error fetching user", error);
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
    const storeIdLower = storeId.toLowerCase();
    const categories = await import_Category.default.find({ storeId: storeIdLower }).select("_id name").lean();
    const categoryNameToId = /* @__PURE__ */ new Map();
    for (const c of categories) {
      const key = (c.name || "").trim().toLowerCase();
      if (key) categoryNameToId.set(key, c._id.toString());
    }
    const units = await import_Unit.default.find({ storeId: storeIdLower }).select("_id name").lean();
    const unitNameToId = /* @__PURE__ */ new Map();
    for (const u of units) {
      const key = (u.name || "").trim().toLowerCase();
      if (key) unitNameToId.set(key, u._id.toString());
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
        storeId: storeIdLower,
        categoryName: product.categoryName,
        unitName: product.unitName,
        quantity: product.quantity
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
        duplicateBarcodes.push(`${product.name} (Barcode: ${product.barcode})`);
        errors.push(`Product "${product.name}" with barcode "${product.barcode}" already exists in database`);
        continue;
      }
      const categoryId = product.categoryName ? categoryNameToId.get(product.categoryName.trim().toLowerCase()) : void 0;
      const mainUnitId = product.unitName ? unitNameToId.get(product.unitName.trim().toLowerCase()) : void 0;
      const doc = {
        storeId: storeId.toLowerCase(),
        name: product.name,
        barcode: product.barcode,
        costPrice: product.costPrice,
        price: product.price,
        stock: product.quantity,
        status: "active"
      };
      if (categoryId) doc.categoryId = categoryId;
      if (mainUnitId) doc.mainUnitId = mainUnitId;
      productsToImport.push(doc);
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
    import_logger.log.error("Error importing products", error, {
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
});
const getProductByBarcode = (0, import_error.asyncHandler)(async (req, res) => {
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: "Store ID is required. Please ensure you are logged in as a store user."
    });
  }
  let decodedBarcode;
  try {
    decodedBarcode = decodeURIComponent((req.params.barcode || "").toString());
  } catch {
    decodedBarcode = (req.params.barcode || "").toString();
  }
  if (!decodedBarcode?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Barcode is required"
    });
  }
  const result = await import_product.productService.getByBarcode(storeId, decodedBarcode);
  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Product not found"
    });
  }
  res.status(200).json({
    success: true,
    message: "Product retrieved successfully",
    data: {
      product: result.product,
      matchedUnit: result.matchedUnit,
      matchedBarcode: result.matchedBarcode
    }
  });
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
