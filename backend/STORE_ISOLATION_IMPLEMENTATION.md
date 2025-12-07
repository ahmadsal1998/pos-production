# Store-Level Isolation Implementation

## Overview
This document describes the store-level isolation implementation that ensures each employee/user can only access and work within their assigned store, with no cross-store visibility or permissions.

## Key Requirements Met

### 1. Automatic Store Linking on User Creation
- ✅ When a Manager creates a new employee/user, the account is **automatically linked** to the Manager's store
- ✅ The `storeId` from the request body is **ignored** for non-admin users (security measure)
- ✅ Only Admin users can create users for different stores or system users (null storeId)

### 2. Store-Level Data Access
- ✅ When an employee logs in, they can only access data related to their assigned store
- ✅ All queries and operations are filtered by `storeId` for non-admin users
- ✅ Employees cannot see any data, orders, settings, or information belonging to other stores

### 3. Backend Enforcement
- ✅ Store-level isolation is enforced at the **controller level** in all relevant operations
- ✅ All actions (view, edit, delete, orders, reports, etc.) are limited based on the user's `storeId`
- ✅ Admin users bypass store restrictions (can access all stores)

## Implementation Details

### User Model
- The `User` model includes a `storeId` field:
  - `null` for system/admin users
  - `string` for store-specific users
- Indexed for efficient querying: `{ storeId: 1 }`
- Compound index for store-specific username uniqueness

### Authentication & Authorization
- JWT tokens include `storeId` in the payload
- Login response includes `storeId` for frontend filtering
- Auth middleware extracts `storeId` from token for use in controllers

### User Management Controller (`users.controller.ts`)

#### Create User (`createUser`)
- **Admin users**: Can create users for any store or system users
- **Manager users**: 
  - MUST create users for their own store only
  - `storeId` from request body is **ignored** (security)
  - New user's `storeId` is **always** set to requester's `storeId`
  - Warning logged if Manager attempts to specify different storeId

#### Update User (`updateUser`)
- **Admin users**: Can change a user's `storeId` to any store
- **Manager users**: 
  - **CANNOT** change `storeId` at all
  - Even if `storeId` matches their own store, it cannot be modified
  - Prevents any potential security issues

#### Get Users (`getUsers`, `getUserById`)
- **Admin users**: Can see all users across all stores
- **Manager users**: Can only see users from their own store
- Filtering applied at database query level

#### Delete User (`deleteUser`)
- **Admin users (role='Admin')**: 
  - Can ONLY be deleted by Super Admin (userId === 'admin')
  - Admin accounts are protected from deletion in regular store management screens
  - Can only be deleted from the Super Admin Panel
  - This prevents accidental deletion of critical admin accounts
- **Non-admin users**: Can be deleted by Admin or Manager (with store restrictions)
- **Manager users**: Can only delete users from their own store
- Validation prevents cross-store deletion

### Brands & Categories Controllers
- Already enforce store-level isolation
- Use store-specific models based on `storeId`
- Require `storeId` for non-admin users
- Do not accept `storeId` from request body (only from JWT token)

### Store Isolation Middleware
Created `storeIsolation.middleware.ts` with utilities:
- `requireStoreAccess`: Ensures non-admin users have a `storeId`
- `validateStoreAccess`: Validates that `storeId` in request matches requester's `storeId`

### Admin Controller
- When creating a store with default admin user, the user's `storeId` is set to the store's canonical `storeId` (not prefix)
- Ensures consistency across the system

## Security Measures

1. **Request Body Validation**: Non-admin users cannot override `storeId` from request body
2. **Database Query Filtering**: All queries for non-admin users include `storeId` filter
3. **Token-Based StoreId**: `storeId` comes from JWT token (cannot be manipulated)
4. **Controller-Level Enforcement**: Store isolation checked in every controller method
5. **Update Protection**: Non-admin users cannot modify `storeId` even for their own store
6. **Admin Deletion Protection**: Admin accounts can only be deleted by Super Admin from Super Admin Panel

## Testing Checklist

- [ ] Manager creates user → user's `storeId` matches Manager's `storeId`
- [ ] Manager attempts to create user with different `storeId` → request ignored, uses Manager's `storeId`
- [ ] Manager tries to update user's `storeId` → request rejected
- [ ] Manager can only see users from their store
- [ ] Manager can only delete users from their store
- [ ] Employee logs in → only sees their store's data
- [ ] Employee cannot access other stores' data
- [ ] Admin can create users for any store
- [ ] Admin can see all users across all stores

## Files Modified

1. `backend/src/controllers/users.controller.ts`
   - Updated `createUser` to always use requester's `storeId` for non-admin users
   - Enhanced `updateUser` to prevent `storeId` changes for non-admin users
   - Added comprehensive documentation

2. `backend/src/controllers/admin.controller.ts`
   - Updated default admin user creation to use store's canonical `storeId`

3. `backend/src/middleware/storeIsolation.middleware.ts` (NEW)
   - Created middleware utilities for store-level access control

## Notes

- Store isolation is enforced at the **controller level** for maximum security
- All store-specific data operations automatically filter by `storeId`
- The system uses the store's canonical `storeId` (not prefix) for consistency
- Admin users have full access across all stores (by design)

