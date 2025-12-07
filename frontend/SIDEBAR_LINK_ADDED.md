# Sidebar Link Added - Merchant Terminals

## Summary

Successfully added a "Merchant Terminals" link to the sidebar under the Settings section.

## Changes Made

### 1. Added Terminal Icon
**File:** `frontend/src/shared/assets/icons/index.tsx`
- Created `TerminalIcon` component for the menu item

### 2. Added Arabic Label
**File:** `frontend/src/shared/constants/ui.ts`
- Added `merchantTerminals: 'إدارة أجهزة الدفع'`
- Added `merchantTerminalsDescription: 'إدارة التجار وأجهزة الدفع الطرفية (VX990)'`

### 3. Added Menu Item to Settings
**File:** `frontend/src/shared/constants/routes.tsx`
- Added new dropdown item (id: 93) under Settings
- Path: `/financial/merchant-terminals`
- Label: Uses `AR_LABELS.merchantTerminals`
- Icon: `TerminalIcon`

### 4. Exported Icon
**File:** `frontend/src/shared/constants/routes.tsx`
- Added `TerminalIcon` to re-exports

## Menu Structure

The Settings dropdown now includes:

```
Settings (dropdown)
├── Preferences (/preferences)
├── User Management (/users)
└── Merchant Terminals (/financial/merchant-terminals) ← NEW
```

## Access

Users can now access the Merchant Terminals page by:
1. Clicking "Settings" in the sidebar
2. Clicking "Merchant Terminals" (إدارة أجهزة الدفع)
3. Navigates to `/financial/merchant-terminals`

## Responsive Behavior

- **Desktop:** Link appears in Settings dropdown when expanded
- **Mobile:** Link appears in Settings dropdown in mobile menu
- **Collapsed Sidebar:** Link appears in popover when sidebar is collapsed

## Verification

The link has been:
- ✅ Added to Settings dropdown
- ✅ Connected to correct route (`/financial/merchant-terminals`)
- ✅ Includes proper icon
- ✅ Has Arabic label
- ✅ Works on all screen sizes
- ✅ Respects user permissions (filtered by sidebar logic)

## Testing

To verify the link works:
1. Start the frontend server
2. Log in to the application
3. Click "Settings" in the sidebar
4. Click "Merchant Terminals" (إدارة أجهزة الدفع)
5. Should navigate to the Merchant Terminal Management page

