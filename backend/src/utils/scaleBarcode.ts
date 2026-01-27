/**
 * Scale Barcode Utility Functions
 * Handles parsing of weight-based barcodes (scale barcodes)
 * 
 * Example: Product "Meat" with base barcode "123"
 * - 500g → Barcode: "123000500"
 * - 800g → Barcode: "123000800"
 */

export interface ScaleBarcodeResult {
  isValid: boolean;
  weight?: number; // Weight in grams
  baseBarcode?: string;
  product?: any;
}

/**
 * Parse a scale barcode to extract weight
 * @param barcode - The scanned barcode (e.g., "123000500")
 * @param baseBarcode - The base barcode (e.g., "123")
 * @param format - The barcode format configuration
 * @returns Object with isValid flag and extracted weight in grams
 */
export function parseScaleBarcode(
  barcode: string,
  baseBarcode: string,
  format: {
    weightStartIndex: number;
    weightLength: number;
    weightUnit: 'g' | 'kg';
  }
): { isValid: boolean; weight?: number } {
  const trimmedBarcode = barcode.trim();
  const trimmedBase = baseBarcode.trim();

  // Check if barcode starts with base barcode
  if (!trimmedBarcode.startsWith(trimmedBase)) {
    return { isValid: false };
  }

  // Extract weight portion from barcode
  const weightStart = format.weightStartIndex;
  const weightEnd = weightStart + format.weightLength;

  if (weightEnd > trimmedBarcode.length) {
    return { isValid: false };
  }

  const weightString = trimmedBarcode.substring(weightStart, weightEnd);
  const weight = parseInt(weightString, 10);

  if (isNaN(weight) || weight <= 0) {
    return { isValid: false };
  }

  // Convert to grams if needed
  let weightInGrams = weight;
  if (format.weightUnit === 'kg') {
    weightInGrams = weight * 1000;
  }

  return {
    isValid: true,
    weight: weightInGrams,
  };
}

/**
 * Find product by scale barcode
 * Searches for products with scale barcode enabled that match the scanned barcode
 * @param Product - Mongoose Product model
 * @param storeId - Store ID
 * @param barcode - Scanned barcode
 * @returns Product with extracted weight, or null if not found
 */
export async function findProductByScaleBarcode(
  Product: any,
  storeId: string,
  barcode: string
): Promise<{ product: any; weight: number } | null> {
  const trimmedBarcode = barcode.trim();

  // Find all products with scale barcode enabled for this store
  const scaleProducts = await Product.find({
    storeId: storeId.toLowerCase(),
    isScaleBarcode: true,
    status: 'active',
  }).lean();

  // Try to match each scale product
  for (const product of scaleProducts) {
    if (!product.baseBarcode || !product.scaleBarcodeFormat) {
      continue;
    }

    const baseBarcode = product.baseBarcode.trim();
    
    // Check if scanned barcode starts with base barcode
    if (!trimmedBarcode.startsWith(baseBarcode)) {
      continue;
    }

    // If the scanned barcode is longer than the base barcode, it's likely a scale barcode
    // Only check scale barcodes if the scanned barcode is longer than the base
    if (trimmedBarcode.length <= baseBarcode.length) {
      continue; // Skip - this might be an exact match, check that later
    }

    const parseResult = parseScaleBarcode(
      trimmedBarcode,
      product.baseBarcode,
      product.scaleBarcodeFormat
    );

    if (parseResult.isValid && parseResult.weight) {
      return {
        product,
        weight: parseResult.weight,
      };
    }
  }

  return null;
}
