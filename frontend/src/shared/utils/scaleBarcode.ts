/**
 * Scale Barcode Utility Functions (Frontend)
 * Handles parsing of weight-based barcodes (scale barcodes)
 * 
 * Example: Product "Meat" with base barcode "123"
 * - 500g → Barcode: "123000500"
 * - 800g → Barcode: "123000800"
 */

export interface ScaleBarcodeFormat {
  weightStartIndex: number;
  weightLength: number;
  weightUnit: 'g' | 'kg';
}

export interface ScaleBarcodeResult {
  isValid: boolean;
  weight?: number; // Weight in grams
  baseBarcode?: string;
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
  format: ScaleBarcodeFormat
): ScaleBarcodeResult {
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
    baseBarcode: trimmedBase,
  };
}

/**
 * Find product by scale barcode in a list of products
 * @param products - Array of products to search
 * @param barcode - Scanned barcode
 * @returns Product with extracted weight, or null if not found
 */
export function findProductByScaleBarcode(
  products: any[],
  barcode: string
): { product: any; weight: number } | null {
  const trimmedBarcode = barcode.trim();

  // Try to match each scale product
  for (const product of products) {
    if (!product.isScaleBarcode || !product.baseBarcode || !product.scaleBarcodeFormat) {
      continue;
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
