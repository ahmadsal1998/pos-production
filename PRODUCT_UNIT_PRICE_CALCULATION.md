# Product Entry with Automatic Unit Price Calculation

## Overview

This feature implements a streamlined product entry workflow where users can:
1. Enter products with the largest unit first (e.g., Carton) with a wholesale price
2. Add smaller units later with automatic price calculation
3. Manage stock in any unit with automatic conversion

## Implementation Details

### Frontend Components

#### 1. AddNewProductPage (`frontend/src/pages/products/AddNewProductPage.tsx`)
- **Purpose**: Simplified product entry form for basic product information
- **Fields**:
  - Product Name
  - Category
  - Largest Unit Name (e.g., "Carton")
  - Wholesale Price for the largest unit
  - Barcode (with auto-generation)
  - Optional: Description, Brand, Warehouse
- **Flow**: After saving, redirects to "Add Additional Units" page

#### 2. AddAdditionalUnitsPage (`frontend/src/pages/products/AddAdditionalUnitsPage.tsx`)
- **Purpose**: Add smaller units to an existing product with automatic price calculation
- **Features**:
  - Displays product information (name, largest unit, wholesale price)
  - Allows adding multiple smaller units
  - For each smaller unit:
    - Unit Name (e.g., "Bottle")
    - Conversion Factor: How many smaller units fit in the larger unit (e.g., 12 bottles = 1 carton)
    - Barcode (with auto-generation)
    - **Automatically Calculated Price**: `wholesalePrice ÷ conversionFactor`
- **Example**: 
  - Largest unit: Carton, Price: 17 ر.س
  - Smaller unit: Bottle, Conversion: 12
  - Calculated price: 17 ÷ 12 = 1.42 ر.س

### Backend Support

The backend already supports multi-unit products through:
- `units` array in the product schema with:
  - `unitName`: Name of the unit
  - `barcode`: Unique barcode for the unit
  - `sellingPrice`: Price per unit
  - `conversionFactor`: How many of this unit fit in the larger unit (1 for largest unit)
- `wholesalePrice`: Wholesale price for the largest unit

### Routes

- `/products/add-new`: New simplified product entry form
- `/products/:productId/add-units`: Add additional units page (must come before `:id` route)

### Key Features

1. **Automatic Price Calculation**
   - When adding a smaller unit, the system automatically calculates: `largestUnitPrice ÷ conversionFactor`
   - No manual price entry needed for smaller units
   - Price updates in real-time as conversion factor changes

2. **Unit Relationships**
   - Units are stored with conversion factors
   - Largest unit always has `conversionFactor = 1`
   - Smaller units have `conversionFactor > 1` (representing how many fit in the larger unit)

3. **Stock Management** (Future Enhancement)
   - Users can enter stock quantities in any unit
   - System automatically calculates total stock based on unit relationships
   - Example: 5 cartons + 10 bottles = 70 bottles (if 12 bottles = 1 carton)

### Usage Example

1. **Create Product**:
   - Navigate to Products → Add New Product
   - Enter: Name: "Coca-Cola", Largest Unit: "Carton", Wholesale Price: 17
   - Save product

2. **Add Additional Units**:
   - System redirects to "Add Additional Units" page
   - Click "Add Unit"
   - Enter: Unit Name: "Bottle", Conversion Factor: 12 (12 bottles = 1 carton)
   - System automatically calculates price: 17 ÷ 12 = 1.42 ر.س
   - Save units

3. **Stock Management** (To be implemented):
   - When adding stock, user can enter:
     - 5 cartons OR
     - 10 bottles OR
     - Any combination
   - System calculates total stock in smallest unit automatically

### Technical Notes

- The `conversionFactor` represents how many of the smaller unit fit in the larger unit
- Price calculation: `smallerUnitPrice = largestUnitWholesalePrice / conversionFactor`
- All units are stored in the `units` array on the product document
- The largest unit is identified by `conversionFactor === 1`

### Future Enhancements

1. **Stock Management Component**: 
   - Allow entering stock in any unit
   - Automatic conversion to smallest unit for total stock calculation
   - Display stock in all units

2. **Unit Conversion Display**:
   - Show stock in all available units
   - Quick conversion between units

3. **Bulk Unit Addition**:
   - Add multiple units at once
   - Import units from CSV

