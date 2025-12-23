# Store User (Retailer) Access Guide

This document outlines all screens and features accessible to store users (retailers) in the POS system.

## Overview

Store users (retailers) are non-admin users who have a `storeId` associated with their account. They can only access data related to their own store, ensuring complete store-level isolation.

## Access Control

### Authentication & Authorization
- **Authentication Required**: All store user routes require authentication
- **Subscription Check**: Store users must have an active subscription to access the system
- **Store Isolation**: All data is automatically filtered by the user's `storeId` from their JWT token
- **Permission-Based**: Access to specific screens is controlled by permissions assigned to the user

### User Roles for Store Users
- **Manager**: Can access user management routes in addition to their permissions
- **Cashier**: Access limited to assigned permissions only
- **Admin** (Store-level): Has access to all routes (but not system admin routes)

## Accessible Screens

### 1. Dashboard (`/`)
- **Permission Required**: `dashboard`
- **Description**: Main dashboard showing store metrics and overview
- **Features**:
  - Today's sales summary
  - Monthly sales overview
  - Transaction counts
  - Product statistics
  - Low stock alerts

### 2. Products Management (`/products`)
- **Permission Required**: `products`
- **Available Routes**:
  - `/products` - Product dashboard
  - `/products/list` - Product list view
  - `/products/management` - Product management
  - `/products/add` - Add new product
  - `/products/edit/:id` - Edit existing product
  - `/products/add-multi-unit` - Add product with multiple units
  - `/products/add-new` - Simplified product entry
  - `/products/:id` - View product details
  - `/products/:productId/add-units` - Add additional units to product

- **Features**:
  - View all products for their store
  - Add/edit products
  - Manage product categories and brands
  - Manage warehouses
  - Product search and filtering
  - Barcode scanning

### 3. Product Categories (`/products/categories`)
- **Permission Required**: `categories`
- **Features**:
  - View and manage product categories
  - Create/edit/delete categories
  - Import/export categories

### 4. Product Brands (`/products/brands`)
- **Permission Required**: `brands`
- **Features**:
  - View and manage product brands
  - Create/edit/delete brands
  - Import/export brands

### 5. Warehouses (`/products/warehouses`)
- **Permission Required**: `products` (inherited)
- **Features**:
  - View and manage warehouses
  - Track inventory by warehouse

### 6. Sales Management (`/sales`)
- **Permission Required**: `salesToday` or `salesHistory`
- **Available Routes**:
  - `/sales` - Sales overview
  - `/sales/today` - Today's sales
  - `/sales/history` - Sales history
  - `/sales/refunds` - Refunds management

- **Features**:
  - View today's sales
  - View sales history with filtering
  - Process refunds/returns
  - View sale details and receipts
  - Export sales reports
  - Filter by date, customer, payment method, status

### 7. Point of Sale (POS) - Retail (`/pos/1`)
- **Permission Required**: `posRetail`
- **Features**:
  - Complete POS interface for retail sales
  - Barcode scanning
  - Customer selection
  - **Points Integration**:
    - Add points to customers after sale completion
    - View customer points balance
    - Redeem points for payment
    - Points are automatically calculated based on purchase amount
  - Multiple payment methods (Cash, Card, Credit)
  - Receipt printing
  - Invoice generation
  - Product search and quick add
  - Discount management
  - Return/refund processing

### 8. Point of Sale (POS) - Wholesale (`/pos/2`)
- **Permission Required**: `posWholesale`
- **Features**:
  - POS interface for wholesale sales
  - Customer selection (required)
  - Bulk quantity entry
  - Wholesale pricing
  - Invoice generation
  - Similar features to retail POS but optimized for wholesale

### 9. Purchases (`/purchases` or `/financial/purchases`)
- **Permission Required**: `purchases`
- **Features**:
  - Record purchase transactions
  - Track supplier purchases
  - Manage purchase history
  - Link purchases to inventory

### 10. Expenses (`/expenses` or `/financial/expenses`)
- **Permission Required**: `expenses`
- **Features**:
  - Record business expenses
  - Categorize expenses
  - Track expense history
  - Generate expense reports

### 11. Cheques (`/cheques` or `/financial/cheques`)
- **Permission Required**: `purchases` (inherited)
- **Features**:
  - Manage cheque transactions
  - Track cheque payments
  - Record cheque receipts

### 12. Payment Methods (`/financial/payment-methods`)
- **Permission Required**: `preferences` (inherited)
- **Features**:
  - Configure payment methods
  - Set up payment terminals

### 13. Points History (`/points/history`)
- **Permission Required**: None (accessible to all authenticated store users)
- **Features**:
  - View points transaction history
  - See points issued to customers
  - See points redeemed by customers
  - Filter by customer, date range, transaction type
  - View customer points balances

### 14. Store Points Account (`/admin/store-accounts`)
- **Permission Required**: None (accessible to store owners)
- **Description**: View their own store's points account
- **Features**:
  - View current points balance
  - See total points issued
  - See total points redeemed
  - View financial balance (amount owed)
  - View detailed transaction history
  - Filter transactions by type (issued/redeemed) and date range
  - Auto-refresh capability

### 15. User Preferences (`/preferences` or `/user-management/preferences`)
- **Permission Required**: `preferences`
- **Features**:
  - Update user profile
  - Change password
  - Configure personal settings

### 16. User Management (`/users` or `/user-management/users`)
- **Permission Required**: `users` OR Manager role
- **Features** (Manager role only):
  - View store users
  - Create new users for their store
  - Edit user permissions
  - Deactivate users
  - **Note**: Managers can only manage users for their own store

## Points System Integration

### How Store Users Interact with Points

#### 1. **Issuing Points (During Sales)**
- **Location**: POS Page (`/pos/1` or `/pos/2`)
- **Process**:
  - When completing a sale, points are automatically calculated based on:
    - Purchase amount
    - Points percentage (configured in points settings)
  - Points are added to the customer's global account
  - Points can be issued to customers from any store
  - Transaction is recorded with `earningStoreId` = current store

#### 2. **Redeeming Points (During Sales)**
- **Location**: POS Page (`/pos/1` or `/pos/2`)
- **Process**:
  - Store users can redeem customer points for payment
  - Points can be redeemed at any store (not just where they were earned)
  - Transaction is recorded with `redeemingStoreId` = current store
  - Points value is calculated and deducted from customer balance

#### 3. **Viewing Points History**
- **Location**: Points History Page (`/points/history`)
- **Features**:
  - View all points transactions
  - Filter by customer, date, transaction type
  - See both points issued and redeemed
  - View customer points balances

#### 4. **Viewing Store Points Account**
- **Location**: Store Accounts Page (`/admin/store-accounts`)
- **Features**:
  - View their own store's points account summary
  - See total points issued by their store
  - See total points redeemed at their store
  - View net balance and amount owed
  - Access detailed transaction history
  - See both points issued to customers and points redeemed by customers

### Points Transaction Flow

1. **Points Issued**:
   - Customer makes purchase at Store A
   - Store A user completes sale
   - Points automatically added to customer's account
   - Transaction recorded: `earningStoreId = Store A`

2. **Points Redeemed**:
   - Customer wants to use points at Store B
   - Store B user processes redemption
   - Points deducted from customer's account
   - Transaction recorded: `redeemingStoreId = Store B`

3. **Store Account Tracking**:
   - Store A's account shows: Points issued (+)
   - Store B's account shows: Points redeemed (+)
   - Each store can only see their own transactions

## Sales & POS Features

### Sales Features
- **Create Sales**: Through POS interface
- **View Sales**: Today's sales and historical sales
- **Process Refunds**: Return items and process refunds
- **Generate Reports**: Sales reports with various filters
- **Print Receipts**: Print invoices and receipts
- **Customer Management**: Select customers, view customer history

### POS Features
- **Barcode Scanning**: Quick product lookup
- **Product Search**: Search products by name or barcode
- **Customer Selection**: Choose or create customers
- **Multiple Payment Methods**: Cash, Card, Credit
- **Discount Management**: Apply discounts to items or invoice
- **Points Integration**: Issue and redeem points
- **Receipt Printing**: Print receipts after sale
- **Return Processing**: Process returns and refunds
- **Inventory Updates**: Automatic stock updates after sale

## Security & Data Isolation

### Store-Level Isolation
- All data queries are automatically filtered by `storeId`
- Store users can only see:
  - Products from their store
  - Sales from their store
  - Customers from their store
  - Inventory from their store
  - Points transactions where their store is involved (as issuer or redeemer)
  - Their own store's points account

### Backend Enforcement
- All API endpoints enforce store isolation
- `storeId` is extracted from JWT token (cannot be manipulated)
- Admin users bypass store restrictions
- Store users cannot access other stores' data

## Permission Matrix

| Screen | Permission | Description |
|--------|-----------|-------------|
| Dashboard | `dashboard` | Main dashboard |
| Products | `products` | Product management |
| Categories | `categories` | Category management |
| Brands | `brands` | Brand management |
| Sales Today | `salesToday` | Today's sales |
| Sales History | `salesHistory` | Historical sales |
| POS Retail | `posRetail` | Retail POS |
| POS Wholesale | `posWholesale` | Wholesale POS |
| Refunds | `refunds` | Refund processing |
| Purchases | `purchases` | Purchase management |
| Expenses | `expenses` | Expense management |
| Preferences | `preferences` | User preferences |
| Users | `users` | User management (Manager role) |
| Points History | None | Points transaction history |
| Store Accounts | None | Own store's points account |

## Notes

1. **Admin Users**: Users with `role === 'Admin'` have access to all routes regardless of permissions
2. **Manager Role**: Managers automatically have access to user management routes
3. **Points History**: Accessible to all authenticated store users (no specific permission required)
4. **Store Accounts**: Accessible to store owners to view their own account only
5. **Subscription**: Store users must have an active subscription to access any routes
6. **Data Scope**: All data is automatically scoped to the user's store

## Summary

Store users have comprehensive access to:
- ✅ Product management
- ✅ Sales and POS operations
- ✅ Points system (issue and redeem)
- ✅ Financial management (purchases, expenses, cheques)
- ✅ Customer management
- ✅ Reports and analytics
- ✅ Their own store's points account

All access is controlled by permissions and automatically filtered to their store's data only.

