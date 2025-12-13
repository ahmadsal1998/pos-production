import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler } from '../middleware/error.middleware';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getProductModelForStore } from '../utils/productModel';
import { findUserByIdAcrossStores } from '../utils/userModel';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

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
    status = 'active',
    showInQuickProducts = false,
  } = req.body;

  let storeId = req.user?.storeId || null;

  // If storeId is not in token, try to get it from the user record
  if (!storeId && req.user?.userId && req.user.userId !== 'admin') {
    try {
      const user = await findUserByIdAcrossStores(req.user.userId, req.user.storeId || undefined);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      console.error('Error fetching user:', error.message);
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

  try {
    // Get store-specific Product model
    const Product = await getProductModelForStore(storeId);

    // Check if product with same barcode exists for this store
    const existingProduct = await Product.findOne({ barcode: barcode.trim() });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this barcode already exists',
      });
    }

    // Prepare product data
    const productData: any = {
      name: name.trim(),
      barcode: barcode.trim(),
      costPrice: parseFloat(costPrice),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      status: status || 'active',
    };

    // Add optional fields if provided
    if (warehouseId) productData.warehouseId = warehouseId.trim();
    if (categoryId) productData.categoryId = categoryId.trim();
    if (brandId) productData.brandId = brandId.trim();
    if (description) productData.description = description.trim();
    if (lowStockAlert !== undefined) productData.lowStockAlert = parseInt(lowStockAlert) || 10;
    if (internalSKU) productData.internalSKU = internalSKU.trim();
    if (vatPercentage !== undefined) productData.vatPercentage = parseFloat(vatPercentage) || 0;
    if (vatInclusive !== undefined) productData.vatInclusive = Boolean(vatInclusive);
    if (productionDate) productData.productionDate = new Date(productionDate);
    if (expiryDate) productData.expiryDate = new Date(expiryDate);
    if (batchNumber) productData.batchNumber = batchNumber.trim();
    if (discountRules) productData.discountRules = discountRules;
    if (wholesalePrice !== undefined && wholesalePrice > 0)
      productData.wholesalePrice = parseFloat(wholesalePrice);
    if (units && Array.isArray(units) && units.length > 0) productData.units = units;
    if (
      multiWarehouseDistribution &&
      Array.isArray(multiWarehouseDistribution) &&
      multiWarehouseDistribution.length > 0
    )
      productData.multiWarehouseDistribution = multiWarehouseDistribution;
    if (showInQuickProducts !== undefined) productData.showInQuickProducts = Boolean(showInQuickProducts);

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product,
      },
    });
  } catch (error: any) {
    console.error('Error creating product:', {
      message: error.message,
      stack: error.stack,
      storeId: storeId,
      name: error.name,
      code: error.code,
    });

    // Handle specific mongoose errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors || {}).map((e: any) => e.message);
      return res.status(400).json({
        success: false,
        message: errorMessages.join(', ') || 'Validation error',
      });
    }

    if (error.code === 11000) {
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
    // Get Product model for the store
    let Product;
    try {
      Product = await getProductModelForStore(storeId);
    } catch (modelError: any) {
      console.error('Error getting Product model:', {
        message: modelError.message,
        stack: modelError.stack,
        storeId: storeId,
      });
      return res.status(500).json({
        success: false,
        message: `Failed to access product model: ${modelError.message}`,
        products: [],
      });
    }
    
    // Pagination parameters with validation
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20)); // Max 100 items per page
    const skip = (page - 1) * limit;

    // Search parameter
    const searchTerm = (req.query.search as string)?.trim() || '';

    // Filter parameters
    const showInQuickProducts = req.query.showInQuickProducts;
    const status = req.query.status as string;

    // Build query filter
    const queryFilter: any = {};

    // Filter by showInQuickProducts if provided
    if (showInQuickProducts !== undefined) {
      queryFilter.showInQuickProducts = showInQuickProducts === 'true' || showInQuickProducts === true;
    }

    // Filter by status if provided
    if (status) {
      queryFilter.status = status;
    }

    // If search term is provided, search in name and barcode
    if (searchTerm) {
      // Normalize search term: remove extra spaces and handle Arabic diacritics
      const normalizedSearchTerm = searchTerm
        .replace(/\s+/g, ' ')
        .trim();

      // Create regex pattern for case-insensitive search
      // Escape special regex characters
      const escapedSearchTerm = normalizedSearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Search in name and barcode fields
      // Using $or to search in multiple fields
      // Using $regex with 'i' flag for case-insensitive search
      queryFilter.$or = [
        { name: { $regex: escapedSearchTerm, $options: 'i' } },
        { barcode: { $regex: escapedSearchTerm, $options: 'i' } },
      ];

      // Also search in internalSKU if it exists
      if (normalizedSearchTerm.length > 0) {
        queryFilter.$or.push({ internalSKU: { $regex: escapedSearchTerm, $options: 'i' } });
      }
    }

    // Get total count for pagination metadata
    let totalProducts: number = 0;
    try {
      totalProducts = await Product.countDocuments(queryFilter);
    } catch (countError: any) {
      console.error('Error counting products:', {
        message: countError.message,
        stack: countError.stack,
        name: countError.name,
        code: countError.code,
      });
      // If count fails, set to 0 and continue - products array will be empty
      totalProducts = 0;
    }

    const totalPages = Math.max(1, Math.ceil(totalProducts / limit));

    // Determine which fields to select (for optimization)
    // If showInQuickProducts filter is used, only return essential fields
    const fieldsToSelect = showInQuickProducts === 'true' || showInQuickProducts === true
      ? 'name price stock barcode showInQuickProducts status units costPrice categoryId brandId description updatedAt'
      : undefined; // Return all fields if not filtering for quick products

    // Fetch products with pagination and search filter
    let products = [];
    try {
      let query = Product.find(queryFilter);
      
      // Apply field selection if specified
      if (fieldsToSelect) {
        query = query.select(fieldsToSelect);
      }
      
      products = await query
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    } catch (queryError: any) {
      console.error('Error querying products:', {
        message: queryError.message,
        stack: queryError.stack,
        name: queryError.name,
      });
      // Return empty array if query fails
      products = [];
    }

    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      products: products || [],
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalProducts: totalProducts,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', {
      message: error.message,
      stack: error.stack,
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

  try {
    const Product = await getProductModelForStore(storeId);
    const product = await Product.findById(id);

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
  } catch (error: any) {
    console.error('Error fetching product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product',
    });
  }
});

export const updateProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Product = await getProductModelForStore(storeId);
    const product = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product,
      },
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product',
    });
  }
});

export const deleteProduct = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  try {
    const Product = await getProductModelForStore(storeId);
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product',
    });
  }
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
 */
function validateAndNormalizeProduct(row: ImportProductRow, rowIndex: number): {
  isValid: boolean;
  product?: {
    name: string;
    barcode: string;
    costPrice: number;
    price: number;
  };
  error?: string;
} {
  // Extract fields with multiple possible names
  const name = extractField(row, ['Product Name', 'product name', 'ProductName', 'productName', 'Name', 'name']) as string | undefined;
  const barcode = extractField(row, ['Barcode', 'barcode']) as string | undefined;
  const costPrice = extractField(row, ['Cost Price', 'cost price', 'CostPrice', 'costPrice']) as string | number | undefined;
  const sellingPrice = extractField(row, ['Selling Price', 'selling price', 'SellingPrice', 'sellingPrice', 'Price', 'price']) as string | number | undefined;

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
      error: `Row ${rowIndex + 1}: Selling Price is missing or empty`,
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
      error: `Row ${rowIndex + 1}: Invalid Selling Price value`,
    };
  }

  return {
    isValid: true,
    product: {
      name: name.trim(),
      barcode: barcode.toString().trim(),
      costPrice: parsedCostPrice,
      price: parsedSellingPrice,
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
      const user = await findUserByIdAcrossStores(req.user.userId, req.user.storeId || undefined);
      if (user && user.storeId) {
        storeId = user.storeId;
      }
    } catch (error: any) {
      console.error('Error fetching user:', error.message);
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

    // Get store-specific Product model
    const Product = await getProductModelForStore(storeId);

    // Validate and normalize products
    const validProducts: Array<{
      name: string;
      barcode: string;
      costPrice: number;
      price: number;
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
      validProducts.push(product);
    }

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found in the file.',
        errors: errors,
        skipped: skippedProducts.length,
      });
    }

    // Check for existing products in database
    const existingBarcodes = await Product.find({
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
    }> = [];
    const duplicateBarcodes: string[] = [];

    for (const product of validProducts) {
      if (existingBarcodeSet.has(product.barcode)) {
        const existingProduct = existingBarcodes.find((p) => p.barcode === product.barcode);
        duplicateBarcodes.push(`${product.name} (Barcode: ${product.barcode})`);
        errors.push(`Product "${product.name}" with barcode "${product.barcode}" already exists in database`);
        continue;
      }
      productsToImport.push({
        name: product.name,
        barcode: product.barcode,
        costPrice: product.costPrice,
        price: product.price,
        stock: 0,
        status: 'active',
      });
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
    console.error('Error importing products:', {
      message: error.message,
      stack: error.stack,
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

  try {
    const Product = await getProductModelForStore(storeId);
    const products = await Product.find({ status: 'active' }).lean();

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
  } catch (error: any) {
    console.error('Error fetching product metrics:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product metrics',
    });
  }
});

/**
 * Get product by barcode (exact match)
 * Searches both product barcode and unit barcodes
 * Returns the first matching product with the matched unit info
 */
export const getProductByBarcode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { barcode } = req.params;
  const storeId = req.user?.storeId || null;

  if (!storeId) {
    return res.status(400).json({
      success: false,
      message: 'Store ID is required. Please ensure you are logged in as a store user.',
    });
  }

  if (!barcode || !barcode.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Barcode is required',
    });
  }

  try {
    const Product = await getProductModelForStore(storeId);
    const trimmedBarcode = barcode.trim();

    // First, try exact match on product barcode (only active products)
    let product = await Product.findOne({ 
      barcode: trimmedBarcode,
      status: 'active',
    }).lean();

    // If not found, search in unit barcodes (only active products)
    if (!product) {
      product = await Product.findOne({
        'units.barcode': trimmedBarcode,
        status: 'active',
      }).lean();
    }

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

    // Determine which unit matched (if any)
    let matchedUnit = null;
    if (productObj.units && Array.isArray(productObj.units)) {
      matchedUnit = productObj.units.find((u: any) => u.barcode === trimmedBarcode);
    }

    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: {
        product: productObj,
        matchedUnit: matchedUnit || null, // Include matched unit info if found
        matchedBarcode: trimmedBarcode,
      },
    });
  } catch (error: any) {
    console.error('Error fetching product by barcode:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product by barcode',
    });
  }
});

