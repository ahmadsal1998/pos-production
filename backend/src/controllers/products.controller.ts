import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getProductByBarcode as getCachedProductByBarcode, invalidateProductCache, invalidateStoreProductCache, invalidateAllProductBarcodeCaches, createPseudoProductFromUnit } from '../utils/productCache';
import { getProductModelForStore } from '../utils/productModel';
import { productService } from '../services/product.service';
import Category from '../models/Category';
import Unit from '../models/Unit';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { log } from '../utils/logger';

export const validateCreateProduct = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
  body('barcode')
    .trim()
    .notEmpty()
    .withMessage('Barcode is required')
    .isLength({ max: 100 })
    .withMessage('Barcode cannot exceed 100 characters'),
  body('costPrice')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('stock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('warehouseId')
    .optional()
    .trim()
    .isString()
    .withMessage('Warehouse ID must be a string'),
  body('categoryId')
    .optional()
    .trim()
    .isString()
    .withMessage('Category ID must be a string'),
  body('brandId')
    .optional()
    .trim()
    .isString()
    .withMessage('Brand ID must be a string'),
];

export const createProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    });
  }

  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message:
        'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  try {
    const { product } = await productService.create(storeId, req.body);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error: any) {
    log.error('Error creating product', error, { storeId });

    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(', ') || 'Validation error',
      });
    }

    if (error.code === 'DUPLICATE_BARCODE' || error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this barcode already exists',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product. Please try again.',
    });
  }
});

export const getProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
      products: [],
    });
  }

  try {
    // Use unified Product model with storeId filter
    
    // Pagination parameters with validation
    // Support "all" parameter to fetch all products (for single-store optimization)
    // Cap for "all" mode is configurable via env MAX_PRODUCTS_FULL_SYNC (default 10000)
    const maxProductsFullSync = Math.max(1000, parseInt(process.env.MAX_PRODUCTS_FULL_SYNC || '10000', 10));
    const allParam = req.query.all;
    const allParamStr = typeof allParam === 'string' ? allParam.toLowerCase() : '';
    const fetchAll = allParamStr === 'true' || allParamStr === '1' || allParamStr === 'yes';
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = fetchAll
      ? maxProductsFullSync
      : Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = fetchAll ? 0 : (page - 1) * limit;

    // Incremental sync: only products modified since this date (ISO string)
    const modifiedSince = (req.query.modifiedSince as string)?.trim() || '';

    // Search parameter
    const searchTerm = (req.query.search as string)?.trim() || '';

    // Filter parameters
    const showInQuickProducts = req.query.showInQuickProducts;
    const status = req.query.status as string;
    const includeCategories = req.query.includeCategories !== 'false'; // Default true for optimization
    // List vs detail: view=list returns minimal fields (id, name, barcode, price, stock, status, categoryId) for list views
    const viewParam = (req.query.view as string)?.toLowerCase();
    const viewList = viewParam === 'list';

    // Build query filter - ALWAYS include storeId for isolation
    const queryFilter: any = {
      storeId: storeId.toLowerCase(),
    };

    if (modifiedSince) {
      const sinceDate = new Date(modifiedSince);
      if (!isNaN(sinceDate.getTime())) {
        queryFilter.updatedAt = { $gte: sinceDate };
      }
    }

    // Filter by showInQuickProducts if provided
    if (showInQuickProducts !== undefined) {
      const showInQuickProductsValue = typeof showInQuickProducts === 'string' 
        ? (showInQuickProducts === 'true' || showInQuickProducts === '1')
        : Boolean(showInQuickProducts);
      queryFilter.showInQuickProducts = showInQuickProductsValue;
    }

    // Filter by status if provided
    if (status) {
      queryFilter.status = status;
    }

    // If search term is provided, search in name, barcode, and unit barcodes
    // This ensures both parent and child products are found
    if (searchTerm) {
      // Normalize search term: remove extra spaces and handle Arabic diacritics
      const normalizedSearchTerm = searchTerm
        .replace(/\s+/g, ' ')
        .trim();

      // Check if this is a barcode search (numeric only)
      const isBarcodeSearch = /^[0-9]+$/.test(normalizedSearchTerm);
      
      if (isBarcodeSearch) {
        // For barcode searches, use ONLY exact matches (no partial matches)
        // This ensures that searching for "00001" only returns products with barcode "00001"
        // and does NOT return products with barcodes like "00011", "000012", etc.
        const trimmedBarcode = normalizedSearchTerm.trim();
        const escapedBarcode = trimmedBarcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Use exact matching only (with ^ and $ anchors) - case-insensitive
        // This ensures precise barcode matching without partial matches
        queryFilter.$or = [
          { barcode: { $regex: `^${escapedBarcode}$`, $options: 'i' } }, // Exact product barcode match only
          { 'units.barcode': { $regex: `^${escapedBarcode}$`, $options: 'i' } }, // Exact unit barcode match only
        ];
      } else {
        // For name searches, use regex
        const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        queryFilter.$or = [
          { name: { $regex: escapedSearchTerm, $options: 'i' } },
          { barcode: { $regex: escapedSearchTerm, $options: 'i' } },
          { 'units.barcode': { $regex: escapedSearchTerm, $options: 'i' } },
        ];

        // Also search in internalSKU if it exists
        if (normalizedSearchTerm.length > 0) {
          queryFilter.$or.push({ internalSKU: { $regex: escapedSearchTerm, $options: 'i' } });
        }
      }
    }

    // Get trial-aware Product model
    const Product = await getProductModelForStore(storeId);
    
    // CRITICAL FIX: For barcode searches, first check for child products with exact barcode match
    // This ensures child products are found and returned, not parent products
    // Also check if the barcode matches a unit barcode - if so, find the corresponding child product
    let childProductWithExactBarcode: any = null;
    if (searchTerm && /^[0-9]+$/.test(searchTerm.trim())) {
      const exactBarcode = searchTerm.trim();
      try {
        // STEP 1: Build direct query for child product with exact barcode match
        // CRITICAL: Check for child products first - they have parentProductId set to a non-null, non-empty value
        // Child products are identified by having parentProductId that is not null/undefined/empty
        
        // Strategy 1: Try exact case-sensitive barcode match with parentProductId filter
        // Use $and to combine conditions properly
        let directQuery: any = {
          storeId: storeId.toLowerCase(),
          barcode: exactBarcode,
          // Child products have parentProductId that exists and is not null/empty
          $and: [
            { parentProductId: { $exists: true } },
            { parentProductId: { $ne: null } },
            { parentProductId: { $ne: '' } },
          ],
        };
        
        // Only apply status filter if it was explicitly set in the request
        // Don't default to 'active' - we want to find child products even if they have different status
        if (status) {
          directQuery.status = status;
        }
        
        // Apply showInQuickProducts filter if it exists
        if (queryFilter.showInQuickProducts !== undefined) {
          directQuery.showInQuickProducts = queryFilter.showInQuickProducts;
        }
        
        // Direct query for child product with exact barcode match (case-sensitive first)
        childProductWithExactBarcode = await Product.findOne(directQuery).lean();
        
        // Strategy 2: If not found, try case-insensitive exact match
        if (!childProductWithExactBarcode) {
          directQuery = {
            storeId: storeId.toLowerCase(),
            barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            $and: [
              { parentProductId: { $exists: true } },
              { parentProductId: { $ne: null } },
              { parentProductId: { $ne: '' } },
            ],
          };
          if (status) {
            directQuery.status = status;
          }
          if (queryFilter.showInQuickProducts !== undefined) {
            directQuery.showInQuickProducts = queryFilter.showInQuickProducts;
          }
          childProductWithExactBarcode = await Product.findOne(directQuery).lean();
        }
        
        // Strategy 3: If still not found and no status filter was applied, try without status filter
        // This is a fallback to ensure we find child products even if they have unexpected status
        if (!childProductWithExactBarcode && !status) {
          const fallbackQuery: any = {
            storeId: storeId.toLowerCase(),
            barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            $and: [
              { parentProductId: { $exists: true } },
              { parentProductId: { $ne: null } },
              { parentProductId: { $ne: '' } },
            ],
          };
          if (queryFilter.showInQuickProducts !== undefined) {
            fallbackQuery.showInQuickProducts = queryFilter.showInQuickProducts;
          }
          childProductWithExactBarcode = await Product.findOne(fallbackQuery).lean();
        }
        
        // STEP 2: If no child product found by direct barcode match, check if barcode matches a unit barcode
        // When a parent product has a unit with this barcode, find the child products of that parent
        // This enables searching by unit barcode to return child product data (like POS screen behavior)
        if (!childProductWithExactBarcode) {
          // Find parent products that have a unit with this barcode
          // CRITICAL: Parent products have parentProductId as null/undefined/empty (not set)
          // Use $or to handle different ways parentProductId might be stored
          const parentQuery: any = {
            storeId: storeId.toLowerCase(),
            'units.barcode': { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            $or: [
              { parentProductId: { $exists: false } },
              { parentProductId: null },
              { parentProductId: '' },
            ],
          };
          
          const parentWithUnitBarcode = await Product.findOne(parentQuery).lean();
          
          if (parentWithUnitBarcode) {
            const parentId = parentWithUnitBarcode._id?.toString() || parentWithUnitBarcode.id;
            
            // Found a parent product with this unit barcode
            // Now find child products of this parent
            // First, try to find a child product with the exact same barcode as the unit barcode
            let childQuery: any = {
              storeId: storeId.toLowerCase(),
              parentProductId: parentId, // Match parent ID exactly
              barcode: { $regex: `^${exactBarcode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
            };
            
            if (status) {
              childQuery.status = status;
            }
            
            if (queryFilter.showInQuickProducts !== undefined) {
              childQuery.showInQuickProducts = queryFilter.showInQuickProducts;
            }
            
            childProductWithExactBarcode = await Product.findOne(childQuery).lean();
            
            // If not found with exact barcode match, try to find ANY child product of this parent
            // This ensures we return a child product even if its barcode differs from the unit barcode
            if (!childProductWithExactBarcode) {
              const anyChildQuery: any = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId,
              };
              
              if (status) {
                anyChildQuery.status = status;
              }
              
              if (queryFilter.showInQuickProducts !== undefined) {
                anyChildQuery.showInQuickProducts = queryFilter.showInQuickProducts;
              }
              
              // Find the first child product (or all if we want to return multiple)
              childProductWithExactBarcode = await Product.findOne(anyChildQuery).lean();
            }
            
            // If still not found and no status filter, try without status filter
            if (!childProductWithExactBarcode && !status) {
              const childFallbackQuery: any = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId,
              };
              if (queryFilter.showInQuickProducts !== undefined) {
                childFallbackQuery.showInQuickProducts = queryFilter.showInQuickProducts;
              }
              childProductWithExactBarcode = await Product.findOne(childFallbackQuery).lean();
            }
            
            if (childProductWithExactBarcode && process.env.NODE_ENV === 'development') {
              log.debug('Found child product via unit barcode match (direct query)', {
                unitBarcode: exactBarcode,
                parentId: parentId,
                parentName: parentWithUnitBarcode.name,
                childId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
                childBarcode: childProductWithExactBarcode.barcode,
                childName: childProductWithExactBarcode.name,
                childPrice: childProductWithExactBarcode.price,
                childStock: childProductWithExactBarcode.stock,
                note: 'Child product data will be returned, not parent product data',
              });
            } else {
              // No child product found - create pseudo product from unit data
              // This ensures unit barcode searches return accurate pricing and stock information
              const matchedUnit = parentWithUnitBarcode.units?.find(
                (u: any) => u.barcode && u.barcode.trim().toLowerCase() === exactBarcode.toLowerCase()
              );
              
              if (matchedUnit) {
                childProductWithExactBarcode = createPseudoProductFromUnit(
                  parentWithUnitBarcode,
                  matchedUnit,
                  exactBarcode
                );
                
                if (process.env.NODE_ENV === 'development') {
                  log.debug('No child product found for unit barcode - returning pseudo product from unit (direct query)', {
                    unitBarcode: exactBarcode,
                    parentId: parentId,
                    parentName: parentWithUnitBarcode.name,
                    unitName: matchedUnit.unitName,
                    unitPrice: matchedUnit.sellingPrice,
                    pseudoProductBarcode: childProductWithExactBarcode.barcode,
                    pseudoProductPrice: childProductWithExactBarcode.price,
                    note: 'Returning pseudo product with unit-specific pricing and stock because no child products exist',
                  });
                }
              } else {
                // Fallback: return parent product if unit not found (shouldn't happen)
                childProductWithExactBarcode = parentWithUnitBarcode;
                
                if (process.env.NODE_ENV === 'development') {
                  log.debug('No child product found for unit barcode - returning parent product as fallback (direct query)', {
                    unitBarcode: exactBarcode,
                    parentId: parentId,
                    parentName: parentWithUnitBarcode.name,
                    parentBarcode: parentWithUnitBarcode.barcode,
                    note: 'Returning parent product because no child products exist for this unit barcode',
                  });
                }
              }
            }
          }
        }
        
        if (childProductWithExactBarcode && process.env.NODE_ENV === 'development') {
          log.debug('Found child product with exact barcode match (direct query)', {
            childId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
            childBarcode: childProductWithExactBarcode.barcode,
            childName: childProductWithExactBarcode.name,
            childPrice: childProductWithExactBarcode.price,
            childStock: childProductWithExactBarcode.stock,
            childCostPrice: childProductWithExactBarcode.costPrice,
            parentProductId: childProductWithExactBarcode.parentProductId,
            searchBarcode: exactBarcode,
            matchType: 'exact',
          });
        } else if (process.env.NODE_ENV === 'development') {
          log.debug('No child product found with exact barcode match (direct query)', {
            searchBarcode: exactBarcode,
            queryUsed: directQuery,
            note: 'Will proceed with general search',
          });
        }
      } catch (directQueryError: any) {
        log.error('Error in direct child product query', directQueryError, {
          searchBarcode: exactBarcode,
        });
        // Continue with normal search if direct query fails
      }
    }
    
    // Get total count for pagination metadata
    let totalProducts: number = 0;
    try {
      totalProducts = await Product.countDocuments(queryFilter);
    } catch (countError: any) {
      log.error('Error counting products', countError, {
        name: countError.name,
        code: countError.code,
      });
      // If count fails, set to 0 and continue - products array will be empty
      totalProducts = 0;
    }

    // Use let instead of const because totalPages may be updated later when filtering exact matches
    let totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));

    // Determine which fields to select (for optimization)
    // view=list: minimal list representation including costPrice (weighted average from purchases)
    // showInQuickProducts: only return essential fields for quick product picker
    const showInQuickProductsValue = typeof showInQuickProducts === 'string' 
      ? (showInQuickProducts === 'true' || showInQuickProducts === '1')
      : Boolean(showInQuickProducts);
    let fieldsToSelect: string | undefined;
    if (viewList) {
      fieldsToSelect = 'name price stock barcode status categoryId parentProductId costPrice updatedAt';
    } else if (showInQuickProductsValue) {
      fieldsToSelect = 'name price stock barcode showInQuickProducts status units costPrice categoryId brandId description updatedAt';
    }
    // Otherwise return all fields (detail)

    // Fetch products with pagination and search filter
    // Use compound index (storeId, createdAt) for optimal performance
    // NOTE: This query will return both parent products (parentProductId is null/undefined)
    // and child products (parentProductId is set) that match the search criteria
    let products: any[] = [];
    
    // CRITICAL FIX: If we found a product (child or parent) with exact barcode via direct query, skip general query
    // This ensures products are returned efficiently without interference from general search
    // Priority: child products first, then parent products (when no child products exist for unit barcodes)
    if (childProductWithExactBarcode) {
      // Return the product found by direct query (child product if available, parent product as fallback)
      // This ensures unit barcode searches always return results
      products = [childProductWithExactBarcode];
      
      // Update total count to reflect single child product
      totalProducts = 1;
      totalPages = 1;
      
      if (process.env.NODE_ENV === 'development') {
        const isChildProduct = !!childProductWithExactBarcode.parentProductId;
        log.debug('Barcode search: Using product from direct query, skipping general query', {
          productId: childProductWithExactBarcode._id || childProductWithExactBarcode.id,
          productBarcode: childProductWithExactBarcode.barcode,
          productName: childProductWithExactBarcode.name,
          productPrice: childProductWithExactBarcode.price,
          productStock: childProductWithExactBarcode.stock,
          productCostPrice: childProductWithExactBarcode.costPrice,
          isChildProduct: isChildProduct,
          parentProductId: childProductWithExactBarcode.parentProductId,
          note: isChildProduct 
            ? 'Returning child product from direct query' 
            : 'Returning parent product from direct query (no child products exist for this unit barcode)',
        });
      }
    } else {
      // No child product found via direct query - proceed with general search
      try {
        let query = Product.find(queryFilter);
        
        // Apply field selection if specified
        // Always include parentProductId in selection to identify child products
        if (fieldsToSelect) {
          const fieldsWithParent = fieldsToSelect.includes('parentProductId') 
            ? fieldsToSelect 
            : `${fieldsToSelect} parentProductId`;
          query = query.select(fieldsWithParent);
        }
        // If no field selection, all fields (including parentProductId) are returned by default
        
        products = await query
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        // For barcode searches, ONLY return exact barcode matches (no partial matches)
        // This ensures that searching for "00001" only returns products with barcode "00001"
        // and does NOT return products with barcodes like "00011", "000012", etc.
        if (searchTerm && /^[0-9]+$/.test(searchTerm.trim())) {
          // Fallback: If direct query didn't find child product, process general search results
          // CRITICAL: Only accept exact barcode matches - filter out any partial matches
          const exactBarcodeMatch = searchTerm.trim().toLowerCase();
          
          // Separate products into exact barcode matches and unit barcode matches
          // IMPORTANT: Only products with EXACT barcode matches are included
          const exactBarcodeMatches: any[] = [];
          const unitBarcodeMatches: any[] = [];
          
          products.forEach((product: any) => {
            const productBarcode = String(product.barcode || '').trim().toLowerCase();
            
            // CRITICAL: Only accept exact barcode match (case-insensitive, trimmed)
            // This ensures "00001" matches only "00001", not "00011" or "000012"
            if (productBarcode === exactBarcodeMatch) {
              exactBarcodeMatches.push(product);
              
              // Log child products found by exact barcode match (development only)
              if (process.env.NODE_ENV === 'development' && product.parentProductId) {
                log.debug('Found child product with exact barcode match in general search', {
                  childId: product._id || product.id,
                  childBarcode: product.barcode,
                  childName: product.name,
                  childPrice: product.price,
                  parentProductId: product.parentProductId,
                });
              }
            } else {
              // Check if it matches via unit barcode (exact match only)
              const hasUnitMatch = product.units && Array.isArray(product.units) && 
                product.units.some((unit: any) => {
                  const unitBarcode = String(unit.barcode || '').trim().toLowerCase();
                  // CRITICAL: Only exact unit barcode matches are accepted
                  return unitBarcode === exactBarcodeMatch;
                });
              
              if (hasUnitMatch) {
                unitBarcodeMatches.push(product);
              }
              // IMPORTANT: Products that don't have exact barcode or unit barcode matches are excluded
              // This ensures no partial matches are returned
            }
          });
          
          // CRITICAL FIX: Prioritize child products over parent products
          // When searching by barcode:
          // 1. If child product has exact barcode match → return child product
          // 2. If parent product has unit barcode match → find and return child product (NOT parent)
          // 3. If parent product has exact barcode match → return parent product
          const childWithExactMatch = exactBarcodeMatches.find((p: any) => !!p.parentProductId);
          const parentWithExactMatch = exactBarcodeMatches.find((p: any) => !p.parentProductId);
          
          if (childWithExactMatch) {
            // When a child product has exact barcode match, return ONLY that child product
            // This ensures child products are displayed, not parent products
            // CRITICAL: Use the child product's own data (name, barcode, price, stock, costPrice, categoryId)
            // Do NOT use parent product data
            products = [childWithExactMatch];
            
            // Update pagination to reflect single child product
            totalProducts = 1;
            totalPages = 1;
            
            if (process.env.NODE_ENV === 'development') {
              log.debug('Barcode search: Found child product with exact match in results, returning only child product', {
                childId: childWithExactMatch._id || childWithExactMatch.id,
                childBarcode: childWithExactMatch.barcode,
                childName: childWithExactMatch.name,
                childPrice: childWithExactMatch.price,
                childStock: childWithExactMatch.stock,
                childCostPrice: childWithExactMatch.costPrice,
                childCategoryId: childWithExactMatch.categoryId,
                parentProductId: childWithExactMatch.parentProductId,
                excludedCount: exactBarcodeMatches.length + unitBarcodeMatches.length - 1,
                note: 'Child product data will be preserved - parent product data will NOT replace child data',
              });
            }
          } else if (unitBarcodeMatches.length > 0) {
            // CRITICAL: When unit barcode matches, prioritize child products but fallback to parent products
            // Unit barcode matches indicate parent products - we need to find their child products first
            // If no child products exist, return the parent product (this ensures unit barcodes always return results)
            const childProductsFromUnits: any[] = [];
            const parentProductsFromUnits: any[] = [];
            
            for (const parentProduct of unitBarcodeMatches) {
              const parentId = parentProduct._id?.toString() || parentProduct.id;
              
              // First, try to find a child product that has this barcode as its own barcode
              // This is the preferred behavior: unit barcode should return the child product with that barcode
              let childQuery: any = {
                storeId: storeId.toLowerCase(),
                parentProductId: parentId,
                barcode: { $regex: `^${exactBarcodeMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
              };
              
              if (status) {
                childQuery.status = status;
              }
              
              let childProduct = await Product.findOne(childQuery).lean();
              
              // If not found with exact barcode match, try to find ANY child product of this parent
              // This ensures we return a child product even if its barcode differs from the unit barcode
              if (!childProduct) {
                const anyChildQuery: any = {
                  storeId: storeId.toLowerCase(),
                  parentProductId: parentId,
                };
                
                if (status) {
                  anyChildQuery.status = status;
                }
                
                childProduct = await Product.findOne(anyChildQuery).lean();
              }
              
              // If still not found and no status filter, try without status filter
              if (!childProduct && !status) {
                const childFallbackQuery: any = {
                  storeId: storeId.toLowerCase(),
                  parentProductId: parentId,
                };
                childProduct = await Product.findOne(childFallbackQuery).lean();
              }
              
              if (childProduct) {
                childProductsFromUnits.push(childProduct);
                
                if (process.env.NODE_ENV === 'development') {
                  log.debug('Found child product via unit barcode match in general search', {
                    unitBarcode: exactBarcodeMatch,
                    parentId: parentId,
                    parentName: parentProduct.name,
                    childId: childProduct._id || childProduct.id,
                    childBarcode: childProduct.barcode,
                    childName: childProduct.name,
                    childPrice: childProduct.price,
                    childStock: childProduct.stock,
                    note: 'Returning child product data, not parent product data',
                  });
                }
              } else {
                // No child product found - create pseudo product from unit data
                // This ensures unit barcode searches return accurate pricing and stock information
                const matchedUnit = parentProduct.units?.find(
                  (u: any) => u.barcode && u.barcode.trim().toLowerCase() === exactBarcodeMatch.toLowerCase()
                );
                
                if (matchedUnit) {
                  const pseudoProduct = createPseudoProductFromUnit(
                    parentProduct,
                    matchedUnit,
                    exactBarcodeMatch
                  );
                  parentProductsFromUnits.push(pseudoProduct);
                  
                  if (process.env.NODE_ENV === 'development') {
                    log.debug('No child product found for unit barcode - returning pseudo product from unit', {
                      unitBarcode: exactBarcodeMatch,
                      parentId: parentId,
                      parentName: parentProduct.name,
                      unitName: matchedUnit.unitName,
                      unitPrice: matchedUnit.sellingPrice,
                      pseudoProductBarcode: pseudoProduct.barcode,
                      pseudoProductPrice: pseudoProduct.price,
                      note: 'Returning pseudo product with unit-specific pricing and stock because no child products exist',
                    });
                  }
                } else {
                  // Fallback: add parent product if unit not found (shouldn't happen)
                  parentProductsFromUnits.push(parentProduct);
                  
                  if (process.env.NODE_ENV === 'development') {
                    log.debug('No child product found for unit barcode - returning parent product as fallback', {
                      unitBarcode: exactBarcodeMatch,
                      parentId: parentId,
                      parentName: parentProduct.name,
                      parentBarcode: parentProduct.barcode,
                      note: 'Returning parent product because no child products exist for this unit barcode',
                    });
                  }
                }
              }
            }
            
            // CRITICAL: Prioritize child products, but include parent products as fallback
            // This ensures unit barcode searches always return results
            // Also include parent products that have exact barcode match (not unit barcode match)
            if (childProductsFromUnits.length > 0) {
              // Include parent products with exact barcode match (these are legitimate results)
              products = parentWithExactMatch 
                ? [parentWithExactMatch, ...childProductsFromUnits, ...parentProductsFromUnits]
                : [...childProductsFromUnits, ...parentProductsFromUnits];
            } else {
              // No child products found - return parent products (both exact match and unit barcode match)
              products = parentWithExactMatch 
                ? [parentWithExactMatch, ...parentProductsFromUnits]
                : parentProductsFromUnits;
            }
            
            // Prioritize child products, then parent products with exact barcode match, then parent products with unit barcode match
            products.sort((a: any, b: any) => {
              const aIsChild = !!a.parentProductId;
              const bIsChild = !!b.parentProductId;
              // Child products first
              if (aIsChild && !bIsChild) return -1;
              if (!aIsChild && bIsChild) return 1;
              // If both are parents, prioritize exact barcode match over unit barcode match
              const aIsExactMatch = exactBarcodeMatches.some((p: any) => (p._id || p.id) === (a._id || a.id));
              const bIsExactMatch = exactBarcodeMatches.some((p: any) => (p._id || p.id) === (b._id || b.id));
              if (aIsExactMatch && !bIsExactMatch) return -1;
              if (!aIsExactMatch && bIsExactMatch) return 1;
              return 0;
            });
            
            // Update pagination to reflect results
            totalProducts = products.length;
            totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
          } else {
            // No unit barcode matches - return only exact barcode matches (parent or child)
            // Prioritize child products among exact matches
            products = [...exactBarcodeMatches].sort((a: any, b: any) => {
              const aIsChild = !!a.parentProductId;
              const bIsChild = !!b.parentProductId;
              // Child products first
              if (aIsChild && !bIsChild) return -1;
              if (!aIsChild && bIsChild) return 1;
              return 0;
            });
            
            // Update pagination to reflect only exact matches
            totalProducts = products.length;
            totalPages = fetchAll ? 1 : Math.max(1, Math.ceil(totalProducts / limit));
          }
        }

        // Log search results for debugging (only in development)
        if (process.env.NODE_ENV === 'development' && searchTerm) {
          const childProducts = products.filter((p: any) => p.parentProductId);
          const parentProducts = products.filter((p: any) => !p.parentProductId);
          
          log.debug('Product search results', {
            searchTerm,
            totalFound: products.length,
            childProducts: childProducts.length,
            parentProducts: parentProducts.length,
            // Log first few results to verify correct products are returned
            sampleResults: products.slice(0, 5).map((p: any) => ({
              id: p._id || p.id,
              name: p.name,
              barcode: p.barcode,
              price: p.price,
              isChild: !!p.parentProductId,
              parentProductId: p.parentProductId,
            })),
            // Log the first result to see what's being returned
            firstResult: products.length > 0 ? {
              id: products[0]._id || products[0].id,
              name: products[0].name,
              barcode: products[0].barcode,
              price: products[0].price,
              isChild: !!products[0].parentProductId,
              parentProductId: products[0].parentProductId,
            } : null,
          });
        }
      } catch (queryError: any) {
        log.error('Error querying products', queryError, {
          name: queryError.name,
          queryFilter: JSON.stringify(queryFilter),
        });
        // Return empty array if query fails
        products = [];
      }
    }

    // Enrich child products with parent product information
    if (products.length > 0) {
      try {
        // Identify child products (products with parentProductId)
        const childProducts = products.filter((p: any) => p.parentProductId);
        
        if (childProducts.length > 0) {
          // Get unique parent product IDs
          const parentProductIds = [...new Set(
            childProducts
              .map((p: any) => p.parentProductId)
              .filter((id: any) => id)
              .map((id: any) => id.toString().trim())
          )].filter((id: string) => id.length > 0);

          if (parentProductIds.length > 0) {
            // Fetch parent products
            const mongoose = await import('mongoose');
            
            // Convert parent product IDs to ObjectIds if valid, otherwise use as strings
            const parentObjectIds: any[] = [];
            const parentStringIds: string[] = [];
            
            parentProductIds.forEach((id: string) => {
              if (mongoose.default.Types.ObjectId.isValid(id)) {
                parentObjectIds.push(new mongoose.default.Types.ObjectId(id));
              } else {
                parentStringIds.push(id);
              }
            });

            // Build query to find parent products by _id
            const parentQuery: any = {
              storeId: storeId.toLowerCase(),
              status: 'active',
            };

            if (parentObjectIds.length > 0 && parentStringIds.length > 0) {
              parentQuery.$or = [
                { _id: { $in: parentObjectIds } },
                { _id: { $in: parentStringIds } },
              ];
            } else if (parentObjectIds.length > 0) {
              parentQuery._id = { $in: parentObjectIds };
            } else if (parentStringIds.length > 0) {
              parentQuery._id = { $in: parentStringIds };
            }

            const parentProducts = parentQuery.$or || parentQuery._id 
              ? await Product.find(parentQuery).select('_id name barcode').lean()
              : [];

            // Create a map of parent product ID -> parent product data
            const parentMap: Record<string, any> = {};
            parentProducts.forEach((parent: any) => {
              const parentId = parent._id?.toString() || parent.id;
              parentMap[parentId] = {
                id: parentId,
                name: parent.name,
                barcode: parent.barcode,
              };
            });

            // Enrich child products with parent information
            // CRITICAL: We return the CHILD product's own data (name, barcode, price, stock, etc.)
            // We ONLY add a parentProduct reference for informational purposes
            // We NEVER replace or modify the child product's own fields
            products = products.map((product: any): any => {
              if (product.parentProductId) {
                const parentIdStr = product.parentProductId.toString().trim();
                
                // Try to find parent by ObjectId string if valid
                let parentInfo = null;
                if (mongoose.default.Types.ObjectId.isValid(parentIdStr)) {
                  const objectIdStr = new mongoose.default.Types.ObjectId(parentIdStr).toString();
                  parentInfo = parentMap[objectIdStr] || null;
                }
                
                // Fallback: try direct string match
                if (!parentInfo) {
                  parentInfo = parentMap[parentIdStr] || null;
                }

                // CRITICAL: Store original child product data before any modification
                const originalChildData = {
                  name: product.name,
                  barcode: product.barcode,
                  price: product.price,
                  stock: product.stock,
                  costPrice: product.costPrice,
                };

                // Add parent product reference to child product (for display purposes only)
                // The child product's own fields (name, barcode, price, stock, etc.) remain unchanged
                product.parentProduct = parentInfo;
                
                // Log child product data for debugging (development only)
                if (process.env.NODE_ENV === 'development') {
                  log.debug('Returning child product with own data', {
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
                      stockMatches: product.stock === originalChildData.stock,
                    },
                  });
                  
                  // Warn if child data was modified (should never happen)
                  if (product.name !== originalChildData.name || 
                      product.barcode !== originalChildData.barcode ||
                      product.price !== originalChildData.price) {
                    log.warn('⚠️ WARNING: Child product data appears to have been modified!', {
                      original: originalChildData,
                      current: {
                        name: product.name,
                        barcode: product.barcode,
                        price: product.price,
                      },
                    });
                  }
                }
              }
              // Return the product with its own data intact (child or parent)
              return product;
            });
          }
        }
      } catch (parentEnrichmentError: any) {
        log.error('Error enriching child products with parent information', parentEnrichmentError);
        // Continue without parent enrichment - products are still valid
      }
    }

    // Enrich products with category names if requested and categoryId exists
    if (includeCategories && products.length > 0) {
      try {
        // Get unique category IDs from products
        const categoryIds: string[] = [...new Set(
          products
            .map((p: any) => p.categoryId)
            .filter((id: any) => id)
            .map((id: any) => id.toString().trim())
        )].filter((id: string) => id.length > 0);

        if (categoryIds.length > 0) {
          // Fetch categories for this store using unified Category model
          // Import mongoose for ObjectId conversion
          const mongoose = await import('mongoose');
          
          // Convert string IDs to ObjectIds for querying (categoryId is string, but _id is ObjectId)
          const categoryObjectIds = categoryIds
            .filter((id: string) => mongoose.default.Types.ObjectId.isValid(id))
            .map((id: string) => new mongoose.default.Types.ObjectId(id));
          
          // Query categories by ObjectId
          const categories = categoryObjectIds.length > 0 
            ? await Category.find({ _id: { $in: categoryObjectIds } }).lean()
            : [];

          // Create a map of categoryId -> category data
          // Use both ObjectId string and original string format for lookup
          const categoryMap: Record<string, any> = {};
          categories.forEach((cat: any) => {
            const catId = cat._id?.toString() || cat.id;
            const categoryData = {
              id: catId,
              name: cat.name,
              nameAr: cat.name, // For frontend compatibility
              description: cat.description,
            };
            // Store by ObjectId string
            categoryMap[catId] = categoryData;
          });

          // Enrich products with category data
          products = products.map((product: any): any => {
            if (product.categoryId) {
              const categoryIdStr = product.categoryId.toString().trim();
              // Try to find category by converting to ObjectId string if valid
              if (mongoose.default.Types.ObjectId.isValid(categoryIdStr)) {
                const objectIdStr = new mongoose.default.Types.ObjectId(categoryIdStr).toString();
                product.category = categoryMap[objectIdStr] || null;
              } else {
                // Fallback: try direct string match
                product.category = categoryMap[categoryIdStr] || null;
              }
            }
            return product;
          });
        }
      } catch (categoryError: any) {
        log.error('Error enriching products with categories', categoryError);
        // Continue without category enrichment - products are still valid
      }
    }

    // Final verification: Log what's being returned (development only)
    if (process.env.NODE_ENV === 'development' && searchTerm && products.length > 0) {
      const returnedChildProducts = products.filter((p: any) => p.parentProductId);
      log.debug('Final response - products being returned to frontend', {
        searchTerm,
        totalProducts: products.length,
        childProducts: returnedChildProducts.length,
        firstProduct: products[0] ? {
          id: products[0]._id || products[0].id,
          name: products[0].name,
          barcode: products[0].barcode,
          price: products[0].price,
          isChild: !!products[0].parentProductId,
          parentProductId: products[0].parentProductId,
        } : null,
      });
    }

    // CRITICAL: When returning child products, ensure their own data (name, barcode, price, stock, costPrice, categoryId)
    // is preserved. The parentProduct field is only a reference for display purposes and does NOT replace child data.
    // This ensures the Products screen displays child product information when searching by child barcode,
    // matching the behavior of the POS screen.
    const paginationPage = fetchAll ? 1 : page;
    const paginationLimit = fetchAll ? totalProducts : limit;
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
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
        hasPreviousPage: fetchAll ? false : page > 1,
      },
    });
  } catch (error: any) {
    log.error('Error fetching products', error, {
      storeId: storeId,
      name: error.name,
      code: error.code,
    });
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products',
      products: [],
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export const getProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  // Get trial-aware Product model
  const Product = await getProductModelForStore(storeId);
  
  // Use unified model with storeId filter for isolation
  const product = await Product.findOne({ 
    _id: id,
    storeId: storeId.toLowerCase() 
  });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  // Convert product to plain object and ensure categoryId and mainUnitId are strings
  const productObj = product.toObject ? product.toObject() : product;
  
  // Ensure categoryId and mainUnitId are strings (handle ObjectId conversion if needed)
  if (productObj.categoryId) {
    productObj.categoryId = String(productObj.categoryId);
  }
  if (productObj.mainUnitId) {
    productObj.mainUnitId = String(productObj.mainUnitId);
  }

  res.status(200).json({
    success: true,
    message: 'Product retrieved successfully',
    data: {
      product: productObj,
    },
  });
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  // CRITICAL: storeId MUST come from JWT only
  const storeId = req.user?.storeId;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  // Get trial-aware Product model
  const Product = await getProductModelForStore(storeId);
  
  // Get the old product before updating to invalidate old barcodes and get current units
  const oldProduct = await Product.findOne({
    _id: id,
    storeId: storeId.toLowerCase(),
  }).lean();

  if (!oldProduct) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  // Ensure storeId is not overridden from request body
  const updateData = { ...req.body };
  delete updateData.storeId; // Never allow storeId from request body
  
  // Handle initialQuantity update - ensure stock is stored in main units
  if (updateData.initialQuantity !== undefined || updateData.stock !== undefined) {
    // Get the quantity to update (prefer initialQuantity, fallback to stock)
    const newQuantity = updateData.initialQuantity !== undefined 
      ? parseInt(updateData.initialQuantity) 
      : (updateData.stock !== undefined ? parseInt(updateData.stock) : null);
    
    if (newQuantity !== null && !isNaN(newQuantity)) {
      // CRITICAL: Stock should ALWAYS be stored in main units
      updateData.stock = newQuantity;
      
      // Recalculate total_units if product has hierarchical units
      const units = updateData.units || oldProduct.units;
      if (units && Array.isArray(units) && units.length > 0) {
        // Sort units by order (0 = largest, higher = smaller)
        const sortedUnits = [...units].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        
        // If we have hierarchical units, calculate total_units for reference
        if (sortedUnits.length > 1 && newQuantity > 0) {
          let calculatedTotal = newQuantity;
          
          // Multiply by unitsInPrevious for each sub-unit
          for (let i = 1; i < sortedUnits.length; i++) {
            const currentUnit = sortedUnits[i] as any;
            const unitsInPrev = currentUnit.unitsInPrevious || 1;
            if (unitsInPrev > 0) {
              calculatedTotal = calculatedTotal * unitsInPrev;
            }
          }
          
          updateData.total_units = calculatedTotal;
        } else {
          // No sub-units or no quantity - total equals main unit quantity
          updateData.total_units = newQuantity;
        }
      } else {
        // No units - total equals main unit quantity
        updateData.total_units = newQuantity;
      }
      
      // Remove initialQuantity from updateData as it's been converted to stock
      delete updateData.initialQuantity;
    }
  }

  // Use unified model with storeId filter for isolation
  const product = await Product.findOneAndUpdate(
    { _id: id, storeId: storeId.toLowerCase() },
    updateData,
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  // Invalidate cache for all barcodes (old and new) to ensure fresh data
  // This handles cases where:
  // 1. Main barcode changed
  // 2. Unit barcodes changed
  // 3. Quantity or other fields changed (need fresh data)
  if (oldProduct) {
    await invalidateAllProductBarcodeCaches(storeId, oldProduct);
  }
  // Also invalidate new barcodes in case they're different
  await invalidateAllProductBarcodeCaches(storeId, product);

  res.status(200).json({
    success: true,
    message: 'Product updated successfully',
    data: {
      product,
    },
  });
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  // CRITICAL: storeId MUST come from JWT only
  const storeId = req.user?.storeId;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  // Get trial-aware Product model
  const Product = await getProductModelForStore(storeId);
  
  // Get product first to get barcode for cache invalidation
  const product = await Product.findOne({ 
    _id: id,
    storeId: storeId.toLowerCase() 
  });
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }

  const barcode = product.barcode;
  
  // Delete product
  await Product.deleteOne({ _id: id, storeId: storeId.toLowerCase() });
  
  // Invalidate cache
  if (barcode) {
    await invalidateProductCache(storeId, barcode);
  }

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
  });
});

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/plain', // Some systems send CSV as text/plain
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.csv') || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON files are allowed.'));
    }
  },
});

interface ImportProductRow {
  'Product Name'?: string;
  'product name'?: string;
  'ProductName'?: string;
  'productName'?: string;
  'Name'?: string;
  'name'?: string;
  'Cost Price'?: string | number;
  'cost price'?: string | number;
  'CostPrice'?: string | number;
  'costPrice'?: string | number;
  'Selling Price'?: string | number;
  'selling price'?: string | number;
  'SellingPrice'?: string | number;
  'sellingPrice'?: string | number;
  'Price'?: string | number;
  'price'?: string | number;
  'Barcode'?: string;
  'barcode'?: string;
  'Category'?: string;
  'category'?: string;
  'Unit'?: string;
  'unit'?: string;
  'Quantity'?: string | number;
  'quantity'?: string | number;
  'Stock'?: string | number;
  'stock'?: string | number;
  [key: string]: any;
}

/**
 * Extract field value from row with multiple possible field name variations
 */
function extractField(row: ImportProductRow, possibleNames: string[]): string | number | undefined {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
  }
  return undefined;
}

/**
 * Parse CSV file content
 */
function parseCSV(fileBuffer: Buffer): ImportProductRow[] {
  try {
    const content = fileBuffer.toString('utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });
    return records;
  } catch (error: any) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}

/**
 * Parse JSON file content
 */
function parseJSON(fileBuffer: Buffer): ImportProductRow[] {
  try {
    const content = fileBuffer.toString('utf-8');
    const data = JSON.parse(content);
    
    // Handle both array and single object
    if (Array.isArray(data)) {
      return data;
    } else if (typeof data === 'object' && data !== null) {
      return [data];
    } else {
      throw new Error('JSON file must contain an array of products or a single product object');
    }
  } catch (error: any) {
    throw new Error(`Failed to parse JSON file: ${error.message}`);
  }
}

/**
 * Validate and normalize product data from import
 * Supports: Product Name, Barcode, Category, Cost Price, Sale Price, Unit, Quantity
 */
function validateAndNormalizeProduct(row: ImportProductRow, rowIndex: number): {
  isValid: boolean;
  product?: {
    name: string;
    barcode: string;
    costPrice: number;
    price: number;
    categoryName?: string;
    unitName?: string;
    quantity: number;
  };
  error?: string;
} {
  // Extract fields with multiple possible names
  const name = extractField(row, ['Product Name', 'product name', 'ProductName', 'productName', 'Name', 'name']) as string | undefined;
  const barcode = extractField(row, ['Barcode', 'barcode']) as string | undefined;
  const costPrice = extractField(row, ['Cost Price', 'cost price', 'CostPrice', 'costPrice']) as string | number | undefined;
  const sellingPrice = extractField(row, ['Selling Price', 'selling price', 'Sale Price', 'sale price', 'SellingPrice', 'sellingPrice', 'SalePrice', 'salePrice', 'Price', 'price']) as string | number | undefined;
  const categoryName = extractField(row, ['Category', 'category']) as string | undefined;
  const unitName = extractField(row, ['Unit', 'unit']) as string | undefined;
  const quantityRaw = extractField(row, ['Quantity', 'quantity', 'Stock', 'stock']) as string | number | undefined;

  // Validate required fields
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Product Name is missing or empty`,
    };
  }

  if (!barcode || !barcode.toString().trim()) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Barcode is missing or empty`,
    };
  }

  if (costPrice === undefined || costPrice === null || costPrice === '') {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Cost Price is missing or empty`,
    };
  }

  if (sellingPrice === undefined || sellingPrice === null || sellingPrice === '') {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Selling Price / Sale Price is missing or empty`,
    };
  }

  // Parse numeric values
  const parsedCostPrice = typeof costPrice === 'number' ? costPrice : parseFloat(costPrice.toString().replace(/,/g, ''));
  const parsedSellingPrice = typeof sellingPrice === 'number' ? sellingPrice : parseFloat(sellingPrice.toString().replace(/,/g, ''));

  if (isNaN(parsedCostPrice) || parsedCostPrice < 0) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Invalid Cost Price value`,
    };
  }

  if (isNaN(parsedSellingPrice) || parsedSellingPrice < 0) {
    return {
      isValid: false,
      error: `Row ${rowIndex + 1}: Invalid Sale Price value`,
    };
  }

  // Quantity: optional, default 0
  let quantity = 0;
  if (quantityRaw !== undefined && quantityRaw !== null && quantityRaw !== '') {
    const parsed = typeof quantityRaw === 'number' ? quantityRaw : parseFloat(quantityRaw.toString().replace(/,/g, ''));
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
      categoryName: categoryName && String(categoryName).trim() ? String(categoryName).trim() : undefined,
      unitName: unitName && String(unitName).trim() ? String(unitName).trim() : undefined,
      quantity,
    },
  };
}

/**
 * Import products from file (CSV or JSON)
 */
export const importProducts = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let storeId = req.user?.storeId || null;

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const User = (await import('../models/User')).default;
      const user = await User.findById(req.user.userId);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      log.error('Error fetching user', error);
    }
  }

  // Store users must have a storeId
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message:
        'Store ID is required. Please ensure you are logged in as a store user. If you are a store user, please contact your administrator to associate your account with a store.',
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please upload a CSV or JSON file.',
    });
  }

  try {
    // Parse file based on extension
    const fileName = req.file.originalname.toLowerCase();
    let rows: ImportProductRow[];

    if (fileName.endsWith('.csv')) {
      rows = parseCSV(req.file.buffer);
    } else if (fileName.endsWith('.json')) {
      rows = parseJSON(req.file.buffer);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Please upload a CSV or JSON file.',
      });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'File is empty or contains no valid data.',
      });
    }

    // Build category and unit name -> id maps for the store
    const storeIdLower = storeId.toLowerCase();
    const categories = await Category.find({ storeId: storeIdLower }).select('_id name').lean();
    const categoryNameToId = new Map<string, string>();
    for (const c of categories) {
      const key = (c.name || '').trim().toLowerCase();
      if (key) categoryNameToId.set(key, (c._id as any).toString());
    }
    const units = await Unit.find({ storeId: storeIdLower }).select('_id name').lean();
    const unitNameToId = new Map<string, string>();
    for (const u of units) {
      const key = (u.name || '').trim().toLowerCase();
      if (key) unitNameToId.set(key, (u._id as any).toString());
    }

    // Validate and normalize products
    const validProducts: Array<{
      name: string;
      barcode: string;
      costPrice: number;
      price: number;
      storeId: string;
      categoryName?: string;
      unitName?: string;
      quantity: number;
    }> = [];
    const errors: string[] = [];
    const skippedProducts: string[] = [];

    // Track barcodes to detect duplicates within the file
    const barcodeSet = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = validateAndNormalizeProduct(row, i);

      if (!validation.isValid) {
        errors.push(validation.error || `Row ${i + 1}: Invalid data`);
        skippedProducts.push(`Row ${i + 1}`);
        continue;
      }

      const product = validation.product!;

      // Check for duplicates within the file
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
        quantity: product.quantity,
      });
    }

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found in the file.',
        errors: errors,
        skipped: skippedProducts.length,
      });
    }

    // Get trial-aware Product model
    const Product = await getProductModelForStore(storeId);
    
    // Check for existing products in database (with storeId filter)
    const existingBarcodes = await Product.find({
      storeId: storeId.toLowerCase(),
      barcode: { $in: validProducts.map((p) => p.barcode) },
    }).select('barcode name');

    const existingBarcodeSet = new Set(existingBarcodes.map((p) => p.barcode));
    const productsToImport: Array<{
      name: string;
      barcode: string;
      costPrice: number;
      price: number;
      stock: number;
      status: string;
      storeId: string;
      categoryId?: string;
      mainUnitId?: string;
    }> = [];
    const duplicateBarcodes: string[] = [];

    for (const product of validProducts) {
      if (existingBarcodeSet.has(product.barcode)) {
        duplicateBarcodes.push(`${product.name} (Barcode: ${product.barcode})`);
        errors.push(`Product "${product.name}" with barcode "${product.barcode}" already exists in database`);
        continue;
      }
      const categoryId = product.categoryName
        ? categoryNameToId.get(product.categoryName.trim().toLowerCase())
        : undefined;
      const mainUnitId = product.unitName
        ? unitNameToId.get(product.unitName.trim().toLowerCase())
        : undefined;
      const doc: any = {
        storeId: storeId.toLowerCase(),
        name: product.name,
        barcode: product.barcode,
        costPrice: product.costPrice,
        price: product.price,
        stock: product.quantity,
        status: 'active',
      };
      if (categoryId) doc.categoryId = categoryId;
      if (mainUnitId) doc.mainUnitId = mainUnitId;
      productsToImport.push(doc);
    }

    if (productsToImport.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All products already exist in the database (duplicate barcodes).',
        errors: errors,
        duplicates: duplicateBarcodes.length,
      });
    }

    // Bulk insert products
    const insertedProducts = await Product.insertMany(productsToImport, {
      ordered: false, // Continue inserting even if some fail
    });

    // Invalidate store product cache after bulk import
    await invalidateStoreProductCache(storeId);

    const summary = {
      totalRows: rows.length,
      validProducts: validProducts.length,
      imported: insertedProducts.length,
      skipped: skippedProducts.length + duplicateBarcodes.length,
      duplicates: duplicateBarcodes.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    res.status(200).json({
      success: true,
      message: `Successfully imported ${insertedProducts.length} product(s)`,
      summary: summary,
      data: {
        imported: insertedProducts.length,
        skipped: summary.skipped,
        duplicates: summary.duplicates,
      },
    });
  } catch (error: any) {
    log.error('Error importing products', error, {
      storeId: storeId,
    });

    // Handle bulk write errors
    if (error.name === 'BulkWriteError' && error.writeErrors) {
      const writeErrors = error.writeErrors.map((e: any) => e.errmsg);
      const insertedCount = error.insertedCount || 0;

      return res.status(207).json({
        success: true,
        message: `Partially imported ${insertedCount} product(s). Some products failed to import.`,
        summary: {
          imported: insertedCount,
          failed: error.writeErrors.length,
          errors: writeErrors,
        },
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to import products. Please check the file format and try again.',
    });
  }
});

/**
 * Get real product metrics
 * Calculates:
 * - Total Value of Real Products (cost price * stock)
 * - Real Profit Margin (based on cost and selling price)
 * - Low Stock Products (products with stock <= lowStockAlert)
 * - Real Stock Quantity (considering main and secondary units)
 */
export const getProductMetrics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  // Get trial-aware Product model
  const Product = await getProductModelForStore(storeId);
  
  // Use unified model with storeId filter
  const products = await Product.find({ 
    storeId: storeId.toLowerCase(),
    status: 'active' 
  }).lean();

  // Calculate total value of real products (cost price * stock)
  let totalValue = 0;
  let totalCostValue = 0;
  let totalSellingValue = 0;
  let productsWithProfit = 0;
  let totalProfitMargin = 0;

  // Track low stock products
  const lowStockProducts: Array<{
    id: string;
    name: string;
    stock: number;
    lowStockAlert: number;
    unit: string;
  }> = [];

  // Process each product
  products.forEach((product) => {
    // Calculate real stock quantity (considering main and secondary units)
    // The stock field represents the main unit stock
    let realStockQuantity = product.stock || 0;

    // If product has secondary units, we still use the main stock
    // The units array contains conversion factors but stock is tracked in main unit
    // For accurate calculation, we use the main stock value
    // Note: If you track stock separately per unit, you would need to aggregate here
    realStockQuantity = product.stock || 0;

    // Calculate product value (cost price * stock)
    const productCostValue = (product.costPrice || 0) * realStockQuantity;
    const productSellingValue = (product.price || 0) * realStockQuantity;

    totalValue += productCostValue;
    totalCostValue += productCostValue;
    totalSellingValue += productSellingValue;

    // Calculate profit margin for this product
    if (product.costPrice > 0 && product.price > 0) {
      const profitMargin = ((product.price - product.costPrice) / product.costPrice) * 100;
      totalProfitMargin += profitMargin;
      productsWithProfit++;
    }

    // Check for low stock
    const lowStockAlert = product.lowStockAlert || 10;
    if (realStockQuantity <= lowStockAlert) {
      lowStockProducts.push({
        id: product._id.toString(),
        name: product.name,
        stock: realStockQuantity,
        lowStockAlert: lowStockAlert,
        unit: product.mainUnitId || 'unit',
      });
    }
  });

  // Calculate average profit margin
  const averageProfitMargin = productsWithProfit > 0 ? totalProfitMargin / productsWithProfit : 0;

  // Calculate overall profit margin (weighted by stock value)
  const overallProfitMargin =
    totalCostValue > 0 ? ((totalSellingValue - totalCostValue) / totalCostValue) * 100 : 0;

  res.status(200).json({
    success: true,
    message: 'Product metrics retrieved successfully',
    data: {
      totalValue: parseFloat(totalValue.toFixed(2)),
      totalCostValue: parseFloat(totalCostValue.toFixed(2)),
      totalSellingValue: parseFloat(totalSellingValue.toFixed(2)),
      averageProfitMargin: parseFloat(averageProfitMargin.toFixed(2)),
      overallProfitMargin: parseFloat(overallProfitMargin.toFixed(2)),
      lowStockCount: lowStockProducts.length,
      lowStockProducts: lowStockProducts,
      totalProducts: products.length,
      productsWithStock: products.filter((p) => (p.stock || 0) > 0).length,
    },
  });
});

/**
 * Get product by barcode (exact match)
 * Searches both product barcode and unit barcodes
 * Returns the first matching product with the matched unit info
 */
/**
 * Get product by barcode (exact match) - OPTIMIZED with Redis caching
 * Delegates to productService for cache-aware lookup.
 */
export const getProductByBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const storeId = req.user?.storeId;
  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  let decodedBarcode: string;
  try {
    decodedBarcode = decodeURIComponent((req.params.barcode || '').toString());
  } catch {
    decodedBarcode = (req.params.barcode || '').toString();
  }

  if (!decodedBarcode?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Barcode is required',
    });
  }

  const result = await productService.getByBarcode(storeId, decodedBarcode);
  if (!result) {
    return res.status(404).json({
      success: false,
      message: 'Product not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Product retrieved successfully',
    data: {
      product: result.product,
      matchedUnit: result.matchedUnit,
      matchedBarcode: result.matchedBarcode,
    },
  });
});

