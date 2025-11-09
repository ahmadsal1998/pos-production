export interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string; // Optional brand
  price: number;
  costPrice: number; // Added for profit calculation
  stock: number;
  barcode: string;
  expiryDate: string;
  createdAt: string;
}

// --- NEW DYNAMIC MULTI-UNIT PRODUCT INTERFACES ---

/** Represents the input fields for a single custom unit level in the form. */
export interface CustomUnitInput {
  id: string; // Unique ID for React keying and referencing
  unitName: string;
  barcode: string;
  subUnitsPerThisUnit: number; // How many of the NEXT unit level are in THIS unit (0 for the lowest unit)
  sellingPrice: number;
}

/** Represents the calculated details for a single custom unit level. */
export interface CalculatedUnitDetails {
  id: string; // Matches CustomUnitInput.id
  unitName: string;
  barcode: string;
  totalQuantity: number; // Total count of this unit type in the entire product stock
  costPerUnit: number;
  sellingPricePerUnit: number;
  subUnitsPerThisUnit?: number; // How many of the NEXT unit level are in THIS unit (undefined/0 for the lowest unit)
}

/** Represents the final structure of a saved multi-unit product. */
export interface MultiUnitProduct {
  name: string;
  category: string;
  purchaseTotal: number;
  unitLevels: CalculatedUnitDetails[]; // Array of unit details, ordered from highest to lowest
  stock: Record<string, number>; // Dynamic stock, e.g., { "Box": 3, "Carton": 36, "Piece": 864 }
  createdAt: string;
}

/** Form field structure for AddMultiUnitProductPage (input values before calculation) */
export interface MultiUnitProductFormInput {
  productName: string;
  category: string;
  initialQuantityHighestUnit: number; // E.g., 'Number of Boxes'
  totalPurchasePrice: number;
  unitLevels: CustomUnitInput[]; // Dynamic array of units, ordered from highest to lowest
}

/** Calculated fields for AddMultiUnitProductPage (dynamic structure) */
export interface MultiUnitProductCalculatedFields {
  [unitId: string]: {
    totalQuantity: number;
    costPerUnit: number;
  };
}

// --- CATEGORY MANAGEMENT INTERFACES ---

// This interface will represent both main categories and subcategories.
export interface Category {
  id: string;
  nameAr: string;
  description?: string; // Optional description
  parentId: string | null; // null for top-level categories
  status: 'Active' | 'Inactive';
  createdAt: string; // ISO date string
  updatedAt?: string;
  productCount: number; // Number of products in this category
  imageUrl?: string;
}

// --- BRAND MANAGEMENT INTERFACES ---
export interface Brand {
  id: string;
  nameAr: string;
  description?: string;
  status: 'Active' | 'Inactive';
  createdAt: string; // ISO date string
  productCount: number;
}

// --- WHOLESALE POS INTERFACES ---

export interface WholesaleProductUnit {
  name: string; // Box, Carton, Piece
  price: number;
  cost: number; // Added for profit calculation
  stock: number;
  barcode: string;
}

export interface WholesaleProduct {
  id: number;
  name: string;
  category: string;
  brand: string;
  units: WholesaleProductUnit[];
  imageUrl?: string;
  createdAt: string;
}
