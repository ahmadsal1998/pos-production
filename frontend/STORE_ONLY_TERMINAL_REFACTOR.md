# Store-Only Terminal Refactor

## Summary

The Payment Terminals page has been simplified to support ONLY Store-Based terminals. All Merchant-Based terminal options have been removed.

## Changes Made

### 1. Simplified TerminalFormData Interface
- Removed `terminalType` field (all terminals are store-based)
- Removed `merchantId` field (not needed for store-based terminals)
- Kept `storeId` and `merchantIdMid` as required fields

### 2. Removed Terminal Type Selector
- No more dropdown to choose between merchant/store
- Form always shows Store ID and MID fields

### 3. Removed Merchant Filter
- Merchant filter dropdown removed from terminals list
- Only store filter remains

### 4. Simplified Terminal Form Modal
- Always shows Store ID and MID fields
- No conditional logic based on terminal type

### 5. Updated Save Handler
- Always creates store-based terminals
- Removed conditional logic for merchant vs store

### 6. Removed Terminal Type Column
- Table shows Store ID instead of terminal type badge
- All terminals are store-based, so no need to display type

## Remaining Work

The following merchant-related code can be removed if merchants tab is no longer needed:
- MerchantFormData interface
- MerchantsTab component
- MerchantFormModal component
- All merchant handlers (handleCreateMerchant, handleEditMerchant, etc.)
- Merchant-related imports (if merchants tab is removed)

However, if merchants are still needed for other purposes (not related to terminals), these can remain.

## Testing Checklist

- [ ] Create store-based terminal successfully
- [ ] Edit store-based terminal
- [ ] Delete terminal
- [ ] Filter terminals by store
- [ ] Search terminals
- [ ] Test terminal connection
- [ ] Store ID field auto-filled with user's storeId
- [ ] MID field accepts uppercase input
- [ ] All fields validate correctly

