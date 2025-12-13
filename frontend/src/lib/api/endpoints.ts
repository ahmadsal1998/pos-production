// Centralized API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    VERIFY_OTP: '/auth/verify-otp',
    VERIFY_CODE: '/auth/verify-otp', // Alias for backward compatibility
  },
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: '/products/:id',
    DELETE: '/products/:id',
    METRICS: '/products/metrics',
    BARCODE: '/products/barcode/:barcode',
    CATEGORIES: '/products/categories',
    BRANDS: '/products/brands',
    WAREHOUSES: '/warehouses',
  },
  SALES: {
    LIST: '/sales',
    CREATE: '/sales',
    TODAY: '/sales/today',
    HISTORY: '/sales/history',
    REFUNDS: '/sales/refunds',
  },
  INVENTORY: {
    LIST: '/inventory',
    UPDATE: '/inventory/:id',
    LOW_STOCK: '/inventory/low-stock',
  },
  USERS: {
    LIST: '/users',
    CREATE: '/users',
    UPDATE: '/users/:id',
    DELETE: '/users/:id',
  },
  FINANCIAL: {
    PURCHASES: '/financial/purchases',
    EXPENSES: '/financial/expenses',
    CHEQUES: '/financial/cheques',
    PAYMENT_METHODS: '/financial/payment-methods',
  },
  ADMIN: {
    STORES: '/admin/stores',
    STORE: '/admin/stores/:id',
  },
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    GET: '/customers/:id',
  },
  PAYMENTS: {
    PROCESS: '/payments/process',
    GET: '/payments/:id',
    BY_INVOICE: '/payments/invoice/:invoiceId',
    CANCEL: '/payments/:id/cancel',
  },
  MERCHANTS: {
    LIST: '/merchants',
    GET: '/merchants/:id',
    CREATE: '/merchants',
    UPDATE: '/merchants/:id',
    DELETE: '/merchants/:id',
  },
} as const;
