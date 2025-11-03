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
    CATEGORIES: '/products/categories',
    BRANDS: '/products/brands',
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
} as const;
