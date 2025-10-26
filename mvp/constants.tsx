import React from 'react';
import { NavItem, MetricCardProps, QuickActionProps, TopNavItem } from './types';

export const AR_LABELS = {
  // General
  dashboard: 'لوحة القيادة',
  products: 'المنتجات',
  category: 'الفئة',
  subCategory: 'الفئة الفرعية',
  brands: 'العلامات التجارية',
  sales: 'المبيعات',
  pointOfSales: 'نقطة البيع',
  refunds: 'المبالغ المستردة',
  preferencesSetting: 'إعدادات التفضيلات',
  addMenus: 'إضافة قوائم',
  manageFoodBeverages: 'إدارة قوائم الطعام والمشروبات الخاصة بك',
  madeWithLove: 'صنع بحب ❤️ بواسطة نافين',
  back: 'رجوع',
  // Added missing labels for ProfileBanner, ProfileCard, and AccountSettingsForm
  healthyFood: 'طعام صحي',
  followMe: 'تابعني على',
  opportunitiesApplied: 'الفرص المطبقة',
  opportunitiesWon: 'الفرص الفائزة',
  currentOpportunities: 'الفرص الحالية',
  viewPublicProfile: 'عرض الملف الشخصي العام',
  update: 'تحديث',
  profileSettings: 'إعدادات الملف الشخصي',
  accountSetting: 'إعدادات الحساب',
  companySetting: 'إعدادات الشركة',
  documents: 'المستندات',
  billing: 'الفواتير',
  notification: 'الإشعارات',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  dateOfBirth: 'تاريخ الميلاد',
  phone: 'الهاتف',
  city: 'المدينة',
  country: 'البلد',

  // --- NEW AUTH LABELS ---
  login: 'تسجيل الدخول',
  emailOrUsername: 'البريد الإلكتروني أو اسم المستخدم',
  password: 'كلمة المرور',
  forgotPassword: 'هل نسيت كلمة المرور؟',
  invalidCredentials: 'البريد الإلكتروني/اسم المستخدم أو كلمة المرور غير صالحة',
  sendVerificationCode: 'إرسال رمز التحقق',
  email: 'البريد الإلكتروني',
  emailNotRegistered: 'البريد الإلكتروني غير مسجل',
  backToLogin: 'العودة إلى تسجيل الدخول',
  enterVerificationCode: 'أدخل رمز التحقق',
  verificationCodeSent: 'تم إرسال رمز مكون من 6 أرقام إلى بريدك الإلكتروني.',
  verificationCode: 'رمز التحقق',
  verifyCode: 'التحقق من الرمز',
  invalidCode: 'الرمز غير صالح',
  resetPassword: 'إعادة تعيين كلمة المرور',
  newPassword: 'كلمة المرور الجديدة',
  confirmPassword: 'تأكيد كلمة المرور',
  updatePassword: 'تحديث كلمة المرور',
  passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين',
  passwordTooShort: 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
  passwordUpdatedSuccess: 'تم تحديث كلمة المرور بنجاح!',

  // Dashboard specific
  dashboardTitle: 'لوحة القيادة',
  dashboardDescription: 'نظرة عامة على أداء عملك',
  todaysSales: 'مبيعات اليوم',
  thisMonth: 'هذا الشهر',
  todaysTransactions: 'معاملات اليوم',
  totalProducts: 'إجمالي المنتجات',
  lowStockProducts: 'منتجات منخفضة المخزون',
  expiredProducts: 'منتجات منتهية الصلاحية',
  customersWithBalance: 'العملاء الذين لديهم رصيد',
  quickActions: 'إجراءات سبعة',
  newSale: 'بيع جديد',
  addProduct: 'إضافة منتج',
  viewCustomers: 'عرض العملاء',
  viewReports: 'عرض التقارير',

  // Header specific
  posSystem: 'نظام نقاط البيع',
  users: 'المستخدمين',
  settings: 'الإعدادات',
  ahmadSai: 'أحمد صالح',

  // Product Page specific
  productManagement: 'إدارة المنتجات',
  productManagementDescription: 'عرض وإدارة المنتجات والفئات والعلامات التجارية.',
  productListing: 'قائمة المنتجات',
  productListingDescription: 'إدارة المنتجات المتوفرة في المخزون',
  addNewProduct: 'إضافة منتج جديد',
  productName: 'اسم المنتج',
  categoryName: 'الفئة',
  price: 'السعر',
  stock: 'المخزون',
  actions: 'إجراءات',
  edit: 'تعديل',
  delete: 'حذف',
  saveProduct: 'حفظ المنتج',
  cancel: 'إلغاء',
  searchPlaceholder: 'ابحث بالاسم، الباركود، أو الفئة...',
  filterByStatus: 'تصفية حسب الحالة',
  allProducts: 'كل المنتجات',
  lowStock: 'مخزون منخفض',
  expired: 'منتهي الصلاحية',
  newlyAdded: 'أضيف حديثاً',
  expiryDate: 'تاريخ الانتهاء',
  numberOfCategories: 'عدد الفئات',
  numberOfBrands: 'عدد العلامات التجارية',

  // Multi-unit product specific labels (updated for dynamic units)
  multiUnitProduct: 'منتج متعدد الوحدات',
  initialQuantityHighestUnit: 'الكمية الأولية (أعلى وحدة)', // Replaces numBoxes
  totalPurchasePrice: 'إجمالي سعر الشراء',
  unitName: 'اسم الوحدة', // New
  barcode: 'الباركود',
  subUnitsPerThisUnit: 'الوحدات الفرعية لكل وحدة', // Replaces cartonsPerBox, piecesPerCarton
  sellingPrice: 'سعر البيع', // Generic selling price
  totalQuantity: 'الكمية الإجمالية', // Generic total quantity
  costPerUnit: 'التكلفة لكل وحدة', // Generic cost per unit
  basicInformation: 'المعلومات الأساسية',
  unitInformation: 'معلومات الوحدات', // Changed from singular
  autoCalculations: 'الحسابات التلقائية',
  calculate: 'حساب',
  generateBarcode: 'توليد باركود',
  addUnitLevel: 'إضافة مستوى وحدة', // New
  remove: 'إزالة', // New
  parentUnit: 'وحدة الأبوين', // New, if needed for context

  // Sales Pages Specific
  salesToday: 'مبيعات اليوم',
  salesTodayDescription: 'عرض ملخص لمبيعاتك لليوم الحالي.',
  salesHistory: 'سجل المبيعات',
  salesHistoryDescription: 'تصفح وابحث في سجل المبيعات الخاص بك.',
  totalSales: 'إجمالي المبيعات',
  numberOfOrders: 'عدد الطلبات',
  avgOrderValue: 'متوسط قيمة الطلب',
  filterByDate: 'تصفية حسب التاريخ',
  from: 'من',
  to: 'إلى',
  applyFilters: 'تطبيق الفلاتر',
  resetFilters: 'إعادة تعيين',
  orderId: 'رقم الطلب',
  date: 'التاريخ',
  time: 'الوقت',
  customerName: 'اسم العميل',
  totalAmount: 'المبلغ الإجمالي',
  paymentMethod: 'طريقة الدفع',
  status: 'الحالة',
  viewDetails: 'عرض التفاصيل',
  printReceipt: 'طباعة الإيصال',
  noSalesFound: 'لم يتم العثور على مبيعات تطابق الفلاتر.',
  noSalesToday: 'لا توجد مبيعات مسجلة لليوم حتى الآن.',

  // New Sales Management Page Specific
  salesManagement: 'إدارة المبيعات',
  salesManagementDescription: 'عرض وتصفية وتصدير جميع معاملات البيع.',
  viewAllSales: 'عرض كل المبيعات',
  salesReports: 'تقارير المبيعات',
  customerAccounts: 'حسابات العملاء',
  searchByCustomerOrInvoice: 'ابحث بالعميل، الفاتورة، أو الهاتف...',
  paymentType: 'نوع الدفع',
  seller: 'البائع',
  paid: 'مدفوع',
  remaining: 'المتبقي',
  partial: 'جزئي',
  due: 'مستحق',
  totalSalesToday: 'إجمالي مبيعات اليوم',
  totalPayments: 'إجمالي المدفوعات',
  creditSales: 'مبيعات آجلة',
  invoiceCount: 'عدد الفواتير',
  collectionRate: 'نسبة التحصيل',
  generateReport: 'إنشاء تقرير',
  reportType: 'نوع التقرير',
  totalSalesReport: 'تقرير إجمالي المبيعات',
  salesByCustomerReport: 'تقرير المبيعات حسب العميل',
  salesByUserReport: 'تقرير المبيعات حسب المستخدم',
  salesByPaymentTypeReport: 'تقرير المبيعات حسب نوع الدفع',
  exportExcel: 'تصدير Excel',
  exportPDF: 'تصدير PDF',
  printReport: 'طباعة التقرير',
  lastPayment: 'آخر دفعة',
  dueAmount: 'المبلغ المستحق',
  amountPaid: 'المبلغ المدفوع',
  notes: 'ملاحظات',

  // Customer Accounts Specific
  searchByCustomerNameOrPhone: 'ابحث بالاسم أو رقم الهاتف...',
  allCustomers: 'كل العملاء',
  hasBalance: 'عليه رصيد',
  noBalance: 'ليس عليه رصيد',
  customerStatement: 'كشف حساب العميل',
  transactionHistory: 'سجل الحركات',
  debit: 'مدين',
  // FIX: An object literal cannot have multiple properties with the same name.
  creditTerm: 'دائن',
  balance: 'الرصيد',
  invoice: 'فاتورة',
  paymentReceived: 'دفعة مستلمة',

  // Category Management Page Specific (Updated)
  categoryManagement: 'إدارة الفئات',
  categoryManagementDescription: 'تنظيم فئات المنتجات الرئيسية والفرعية.',
  searchByCategoryName: 'ابحث باسم الفئة...',
  allStatuses: 'كل الحالات',
  active: 'نشط',
  inactive: 'غير نشط',
  sortBy: 'ترتيب حسب',
  sortByNameAsc: 'الاسم (أ-ي)',
  sortByNameDesc: 'الاسم (ي-أ)',
  sortByDateAsc: 'الأقدم أولاً',
  sortByDateDesc: 'الأحدث أولاً',
  addNewCategory: 'إضافة فئة جديدة',
  importCategories: 'استيراد',
  exportCategories: 'تصدير',
  productCount: 'عدد المنتجات',
  createdDate: 'تاريخ الإنشاء',

  // Modal specific
  categoryDetails: 'تفاصيل الفئة',
  nameArabic: 'الاسم (بالعربية)',
  description: 'الوصف',
  parentCategory: 'الفئة الرئيسية',
  noParentCategory: 'لا يوجد (فئة رئيسية)',
  save: 'حفظ',

  // Deletion confirmation
  confirmDeleteTitle: 'تأكيد الحذف',
  confirmDeleteMessage: 'هل أنت متأكد أنك تريد حذف هذه الفئة؟',
  confirmDeleteWithChildren:
    'لا يمكن حذف هذه الفئة لأنها تحتوي على فئات فرعية. يرجى حذف الفئات الفرعية أولاً.',
  confirmDeleteWithProducts:
    'تحتوي هذه الفئة على منتجات. سيؤدي حذفها إلى جعل هذه المنتجات بدون فئة. هل تريد المتابعة؟',

  // Brand Management Page Specific
  brandManagement: 'إدارة العلامات التجارية',
  brandManagementDescription: 'إنشاء وتحرير وحذف العلامات التجارية للمنتجات.',
  searchByBrandName: 'ابحث باسم العلامة التجارية...',
  brandName: 'اسم العلامة التجارية',
  addNewBrand: 'إضافة علامة تجارية جديدة',
  brandDetails: 'تفاصيل العلامة التجارية',
  confirmDeleteBrandMessage: 'هل أنت متأكد أنك تريد حذف هذه العلامة التجارية؟',
  confirmDeleteBrandWithProducts:
    'هذه العلامة التجارية مرتبطة بمنتجات. سيؤدي حذفها إلى جعل هذه المنتجات بدون علامة تجارية. هل تريد المتابعة؟',

  // POS Page Specific
  invoiceNumber: 'رقم الفاتورة',
  // FIX: Renamed 'cashier' to 'posCashier' to avoid duplicate key error.
  posCashier: 'الكاشير',
  searchProductPlaceholder: 'ابحث بالاسم أو امسح الباركود...',
  unit: 'الوحدة',
  quantity: 'الكمية',
  discount: 'الخصم',
  invoiceDiscount: 'خصم على الفاتورة',
  totalDiscount: 'إجمالي الخصم',
  subtotal: 'المجموع الفرعي',
  tax: 'الضريبة',
  grandTotal: 'المجموع الكلي',
  selectCustomer: 'اختر عميل...',
  addNewCustomer: 'إضافة عميل جديد',
  quickProducts: 'المنتجات السريعة',
  holdSale: 'تعليق البيع',
  payNow: 'الدفع الآن',
  cash: 'نقدي',
  card: 'بطاقة',
  credit: 'آجل',
  visa: 'فيزا',
  payment: 'الدفع',
  amountReceived: 'المبلغ المستلم',
  change: 'الباقي',
  confirmPayment: 'تأكيد الدفع',
  saleCompleted: 'اكتملت عملية البيع بنجاح!',
  startNewSale: 'بدء عملية بيع جديدة',
  heldInvoices: 'الفواتير المعلقة',
  restore: 'استعادة',
  noItemsInCart: 'لا توجد أصناف في السلة.',
  selectRegisteredCustomerForCredit: 'للمبيعات الآجلة, يرجى اختيار عميل مسجل.',
  autoPrintInvoice: 'طباعة الفاتورة تلقائياً',
  returnProduct: 'إرجاع منتج',
  returnInvoice: 'فاتورة إرجاع',
  searchInvoicePlaceholder: 'ابحث برقم الفاتورة أو اسم العميل...',
  productsToReturn: 'المنتجات المراد إرجاعها',
  returnQuantity: 'كمية الإرجاع',
  totalReturnValue: 'إجمالي قيمة الإرجاع',
  confirmReturn: 'تأكيد الإرجاع',
  returnCompleted: 'تم الإرجاع بنجاح!',
  originalQuantity: 'الكمية الأصلية',

  // Wholesale POS Page Specific
  wholesalePOS: 'نقطة بيع الجملة',
  selectWholesaleCustomer: 'اختر عميل جملة...',
  addNewWholesaleCustomer: 'إضافة عميل جملة جديد',
  companyName: 'اسم الشركة',
  address: 'العنوان',
  creditSale: 'بيع آجل',
  dueDate: 'تاريخ الاستحقاق',
  confirmCreditSale: 'تأكيد البيع الآجل',
  clearCart: 'إفراغ السلة',
  totalItems: 'إجمالي الأصناف',
  filterByCategory: 'تصفية حسب الفئة',
  filterByBrand: 'تصفية حسب العلامة التجارية',
  allCategories: 'كل الفئات',
  allBrands: 'كل العلامات',
  addToCart: 'أضف للسلة',
  availableStock: 'المخزون المتوفر',
  checkout: 'الدفع',
  // customerDetails: 'تفاصيل العميل', // 'customerDetails' key is duplicated. Using the one from Purchases section.
  noCustomerSelected: 'لم يتم اختيار عميل',
  orderSummary: 'ملخص الطلب',
  // FIX: Add 'customerDetails' to resolve type error in WholesalePOSPage.tsx
  customerDetails: 'تفاصيل العميل',

  // Refunds Page Specific
  refundsManagement: 'إدارة المبالغ المستردة',
  refundsManagementDescription: 'تسجيل وإدارة عمليات إرجاع المنتجات والمبالغ المستردة.',
  addNewRefund: 'إضافة إرجاع جديد',
  originalInvoiceNumber: 'رقم الفاتورة الأصلية',
  refundedProducts: 'المنتجات المرتجعة',
  refundAmount: 'المبلغ المسترد',
  refundDate: 'تاريخ الإرجاع',
  refundMethod: 'طريقة الاسترداد',
  reasonForRefund: 'سبب الإرجاع (اختياري)',
  customerCredit: 'رصيد العميل',
  fullRefund: 'إرجاع كامل',
  partialRefund: 'إرجاع جزئي',
  searchByInvoiceOrCustomer: 'ابحث برقم الفاتورة أو اسم العميل...',
  findInvoice: 'بحث عن الفاتورة',
  invoiceNotFound: 'لم يتم العثور على الفاتورة.',
  selectProductsToRefund: 'اختر المنتجات المراد إرجاعها:',
  refundQuantity: 'الكمية المرتجعة',
  saveRefund: 'حفظ الإرجاع',
  invoiceDetails: 'تفاصيل الفاتورة',
  maxQuantity: 'الحد الأقصى',

  // FIX: Add missing labels for PaymentMethodsPage.tsx to resolve type errors.
  // Payment Methods Page Specific
  paymentMethodsManagement: 'إدارة طرق الدفع',
  paymentMethodsManagementDescription: 'إعداد وتخصيص طرق الدفع المتاحة في نقطة البيع.',
  addNewPaymentMethod: 'إضافة طريقة دفع جديدة',
  searchByPaymentMethodName: 'ابحث باسم طريقة الدفع...',
  paymentMethodDetails: 'تفاصيل طريقة الدفع',
  paymentMethodName: 'اسم طريقة الدفع',
  paymentMethodType: 'نوع طريقة الدفع',
  digitalWallet: 'محفظة رقمية',
  other: 'أخرى',

  // Preferences Page Specific
  preferences: 'التفضيلات',
  preferencesDescription: 'إدارة الإعدادات العامة للنظام والتكوينات الرئيسية.',
  generalSettings: 'الإعدادات العامة للنظام',
  businessName: 'اسم النشاط التجاري',
  uploadLogo: 'تحميل الشعار',
  defaultCurrency: 'العملة الافتراضية',
  dateFormat: 'تنسيق التاريخ',
  timeFormat: 'تنسيق الوقت',
  defaultLanguage: 'اللغة الافتراضية للنظام',
  invoiceAndSalesSettings: 'إعدادات الفواتير والمبيعات',
  vatPercentage: 'نسبة ضريبة القيمة المضافة (%)',
  invoiceNumberFormat: 'تنسيق ترقيم الفواتير',
  invoiceFooterText: 'النص التذييلي الافتراضي للفاتورة',
  // autoPrintInvoice: 'طباعة الفواتير تلقائياً بعد كل عملية بيع', // This is duplicated, using the one from POS
  sellWithoutStock: 'السماح ببيع المنتجات التي لا يوجد لها مخزون',
  userRolesAndPermissions: 'أدوار المستخدمين والصلاحيات',
  sessionDuration: 'مدة جلسة تسجيل الدخول (بالدقائق)',
  allowUserCreation: 'السماح للمسؤول بإنشاء مستخدمين جدد',
  admin: 'المسؤول',
  manager: 'المدير',
  cashier: 'كاشير',
  inventoryAndProductsSettings: 'إعدادات المخزون والمنتجات',
  defaultMeasurementUnits: 'وحدات القياس الافتراضية (مفصولة بفاصلة)',
  minStockLevel: 'الحد الأدنى لمستوى المخزون للتنبيه',
  enableLowStockNotifications: 'تفعيل إشعارات انخفاض المخزون',
  paymentAndCurrencyOptions: 'خيارات الدفع والعملة',
  enablePaymentMethods: 'تفعيل طرق الدفع',
  allowCash: 'السماح بالنقد',
  allowCard: 'السماح بالبطاقة',
  allowCredit: 'السماح بالآجل',
  notificationsAndAlerts: 'الإشعارات والتنبيهات',
  enableOverdueNotifications: 'تفعيل إشعارات الدفعات المتأخرة',
  enableAutoNotifications: 'تفعيل الإشعارات التلقائية (بريد إلكتروني/واتساب)',
  otherOptions: 'خيارات أخرى',
  databaseBackup: 'نسخ احتياطي لقاعدة البيانات',
  restoreFromBackup: 'استعادة من نسخة احتياطية',
  interfaceMode: 'وضع الواجهة',
  lightMode: 'فاتح',
  darkMode: 'داكن',
  systemVersion: 'إصدار النظام',
  saveChanges: 'حفظ التغييرات',
  changesSavedSuccessfully: 'تم حفظ التغييرات بنجاح!',

  // User Management Page Specific
  userManagement: 'إدارة المستخدمين',
  userManagementDescription: 'إدارة مستخدمي النظام وتعيين الأدوار والصلاحيات.',
  searchByUserNameOrRole: 'ابحث بالاسم، اسم المستخدم، أو الدور...',
  addNewUser: 'إضافة مستخدم جديد',
  fullName: 'الاسم الكامل',
  username: 'اسم المستخدم / البريد الإلكتروني',
  role: 'الدور',
  permissions: 'صلاحيات الوصول',
  lastLogin: 'آخر تسجيل دخول',
  userDetails: 'تفاصيل المستخدم',
  // password: 'كلمة المرور', // DUPLICATE
  // confirmPassword: 'تأكيد كلمة المرور', // DUPLICATE
  screenAccessPermissions: 'صلاحيات الوصول للشاشات',
  // resetPassword: 'إعادة تعيين كلمة المرور', // DUPLICATE

  // Screen Permissions
  permissionDashboard: 'لوحة القيادة',
  permissionProducts: 'المنتجات',
  permissionCategories: 'الفئات',
  permissionBrands: 'العلامات التجارية',
  permissionSalesToday: 'مبيعات اليوم',
  permissionSalesHistory: 'سجل المبيعات',
  permissionPosRetail: 'نقطة البيع (تجزئة)',
  permissionPosWholesale: 'نقطة البيع (جملة)',
  permissionRefunds: 'المبالغ المستردة',
  permissionPreferences: 'التفضيلات',
  permissionUsers: 'إدارة المستخدمين',
  permissionPurchases: 'المشتريات',
  permissionExpenses: 'المصروفات',

  // Purchases Page Specific
  purchases: 'المشتريات',
  purchaseManagement: 'إدارة المشتريات',
  purchaseManagementDescription: 'تسجيل وتتبع وإدارة جميع مشتريات الموردين.',
  poNumber: 'رقم طلب الشراء',
  supplier: 'المورد',
  itemsCount: 'عدد الأصناف',
  markAsReceived: 'استلام الطلب',
  partiallyReceived: 'تم الاستلام جزئياً',
  received: 'تم الاستلام',
  pending: 'قيد الانتظار',
  cancelled: 'ملغى',
  completed: 'مكتمل',
  bankTransfer: 'تحويل بنكي',
  addNewPurchase: 'إضافة شراء جديد',
  purchaseDetails: 'تفاصيل الشراء',
  productSelection: 'اختيار المنتج',
  unitCost: 'تكلفة الوحدة',
  viewPurchaseDetails: 'عرض تفاصيل الشراء',
  receivePurchase: 'استلام الشراء',
  printPurchaseOrder: 'طباعة طلب الشراء',
  purchaseDate: 'تاريخ الشراء',
  selectSupplier: 'اختر مورد...',
  addNewSupplier: 'إضافة مورد جديد',
  searchByPOorSupplier: 'ابحث برقم الطلب أو اسم المورد...',
  cheque: 'شيك',
  chequeNumber: 'رقم الشيك',
  chequeAmount: 'مبلغ الشيك',
  chequeDueDate: 'تاريخ استحقاق الشيك',
  bankName: 'اسم البنك',
  chequeNotes: 'ملاحظات الشيك',
  addPayment: 'إضافة دفعة',
  supplierPayment: 'دفعة للمورد',
  paymentAmount: 'مبلغ الدفعة',
  paymentDate: 'تاريخ الدفعة',
  supplierDetails: 'تفاصيل المورد',
  contactPerson: 'الشخص المسؤول',
  // email: 'البريد الإلكتروني', // DUPLICATE
  filterBySupplier: 'تصفية حسب المورد',
  allSuppliers: 'كل الموردين',
  totalPurchases: 'إجمالي المشتريات',
  // totalPaid: 'إجمالي المدفوعات', // FIX: Renamed to avoid duplicate key.
  supplierTotalPaid: 'إجمالي المدفوعات',
  remainingBalance: 'الرصيد المتبقي',
  supplierOwesYou: 'المورد مدين لك',
  youOweSupplier: 'أنت مدين للمورد',
  supplierBalance: 'رصيد المورد',
  // NEW LABELS FOR PURCHASES REFACTOR
  purchaseOrders: 'أوامر الشراء',
  supplierAccounts: 'حسابات الموردين',
  purchaseReports: 'تقارير المشتريات',
  totalDue: 'إجمالي المستحق',
  supplierStatement: 'كشف حساب المورد',
  paymentMade: 'دفعة مسددة',
  purchaseReportBySupplier: 'تقرير المشتريات حسب المورد',
  purchaseReportByProduct: 'تقرير المشتريات حسب المنتج',
  totalPurchaseReport: 'تقرير إجمالي المشتريات',
  searchBySupplierNameOrPhone: 'ابحث بالاسم أو رقم الهاتف...',
  purchaseOrder: 'أمر شراء',

  // Expenses Page Specific
  expenses: 'المصروفات',
  expenseManagement: 'إدارة المصروفات',
  expenseManagementDescription: 'تسجيل وتتبع وإدارة جميع المصروفات المالية.',
  addNewExpense: 'إضافة مصروف جديد',
  expenseNumber: 'رقم المصروف',
  expenseCategory: 'فئة المصروف',
  responsiblePerson: 'الموظف / القسم المسؤول',
  // FIX: Add missing 'amount' label to fix type error in ExpensesPage.tsx
  amount: 'المبلغ',
  unpaid: 'غير مدفوع',
  searchByExpenseDetails: 'ابحث بالرقم، الفئة، أو المسؤول...',
  expenseDetails: 'تفاصيل المصروف',

  // Cheques Page Specific
  cheques: 'الشيكات',
  chequeManagement: 'إدارة الشيكات',
  chequeManagementDescription: 'عرض وتتبع حالة جميع الشيكات الصادرة والواردة.',
  chequeCalendar: 'تقويم الشيكات',
  chequeStatus: 'حالة الشيك',
  changeStatus: 'تغيير الحالة',
  cleared: 'تم الصرف',
  bounced: 'مرتجع',
  // FIX: Add 'chequeDetails' to resolve type errors in PurchasesPage.tsx and ChequesPage.tsx
  chequeDetails: 'تفاصيل الشيك',
  // New labels for enhancement
  overdue: 'متأخرة الاستحقاق',
  dueToday: 'مستحقة اليوم',
  dueThisWeek: 'مستحقة هذا الأسبوع',
  allDates: 'كل التواريخ',
  searchByChequeOrSupplier: 'ابحث برقم الشيك أو المورد...',
  filterByDueDate: 'تصفية حسب تاريخ الاستحقاق',
  listView: 'عرض القائمة',
  calendarView: 'عرض التقويم',
  totalPending: 'إجمالي المعلق',
  totalOverdue: 'إجمالي المتأخر',
  totalBounced: 'إجمالي المرتجع',
  totalCleared: 'إجمالي المصروف',
  chequeNumberShort: 'رقم الشيك',

  // Product Performance & Insights
  productPerformanceInsights: 'أداء المنتج والرؤى',
  timeRange: 'النطاق الزمني',
  today: 'اليوم',
  thisWeek: 'هذا الأسبوع',
  last3Months: 'آخر 3 أشهر',
  thisYear: 'هذا العام',
  bestSelling: 'الأكثر مبيعًا',
  leastSelling: 'الأقل مبيعًا',
  mostProfitable: 'الأكثر ربحية',
  leastProfitable: 'الأقل ربحية',
  mostDemanded: 'الأكثر طلبًا (كمية)',
  totalItemsSold: 'إجمالي الأصناف المباعة',
  avgSellingPrice: 'متوسط سعر البيع',
  bestSellingProduct: 'المنتج الأكثر مبيعًا',
  leastSellingProduct: 'المنتج الأقل مبيعًا',
  rank: 'الترتيب',
  salesCount: 'عدد المبيعات',
  revenue: 'الإيرادات',
  profitMargin: 'هامش الربح',
  // FIX: Renamed 'change' to 'percentageChange' to avoid duplicate key error.
  percentageChange: 'التغير (%)',
  salesTrend: 'اتجاه المبيعات',
  salesValue: 'قيمة المبيعات',
  insights: 'الرؤى والتحليلات',

  // Other
  gridView: 'عرض شبكي',
  tableView: 'عرض جدولي',
};

// Icons (simplified SVG for demonstration)
const DashboardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);
const ProductsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);
const CategoryIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);
const SalesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8V7m0 11v1m-6-11h1m10 0h1M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2zm2-7h3m8-3v3m-8-8H7v9m6-9h4"
    />
  </svg>
);
const POSIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const RefundsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 19l-7-7m0 0l7-7m-7 7h18"
    />
  </svg>
);
const PreferencesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.58-.354 1.25-.566 1.956-.566z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);
const PurchasesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);
const ExpensesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const ChequesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
);

// Dashboard metric icons
const DollarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.592 1M12 8V7m0 11v1m-6-11h1m10 0h1M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);
const CalendarIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);
const ShoppingCartIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);
const PackageIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
    />
  </svg>
);
const ChartLineIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M16 12V6m-4 6V9m-4 6v-3m12-9H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2z"
    />
  </svg>
);
const ClockIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const UsersMetricIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m3-2h8m-4-8a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 20v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m3-2h8m-4-8a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

// Quick Action icons
const NewSaleIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const AddProductIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);
const ViewCustomersIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);
const ViewReportsIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

// Product action icons
const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);
const DeleteIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);
// Added Props for CancelIcon
// FIX: Explicitly add className to IconProps to resolve typing issue.
interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}
// FIX: Update SearchIcon to accept className prop to resolve type error.
const SearchIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);
// Fix: Updated to directly type props without React.FC to resolve potential IntrinsicAttributes error.
const CancelIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const GenerateBarcodeIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h1.5M16.5 10h1.5M3 14h1.5M16.5 14h1.5M14 7h1v1h-1V7zm0 4h1v1h-1v-1zm0 4h1v1h-1v-1zM5 7h1v1H5V7zm0 4h1v1H5v-1zm0 4h1v1H5v-1zm14-8h1v1h-1V7zm0 4h1v1h-1v-1zm0 4h1v1h-1v-1zM7 7h1v1H7V7zm0 4h1v1H7v-1zm0 4h1v1H7v-1zm-4 4h18a2 2 0 002-2V5a2 2 0 00-2-2H3a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);
// FIX: Update PlusIcon to accept className prop to resolve type error.
const PlusIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
  </svg>
);
const MinusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
  </svg>
);
const PrintIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
    />
  </svg>
);
const ViewIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);
const ReturnIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 15l-3-3m0 0l3-3m-3 3h12a6 6 0 000-12h-3"
    />
  </svg>
);

const ImportIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
    />
  </svg>
);
const ExportIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l4 4m0 0l-4 4m4-4H4"
    />
  </svg>
);
const GridViewIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);
const TableViewIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const CashIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);
const CreditCardIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    />
  </svg>
);
const HandIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 11.5V14m0-2.5c-.9 0-1.5.6-1.5 1.5v.5c0 .9.6 1.5 1.5 1.5v-3.5zm0 0h.01M3.17 11.5a2.5 2.5 0 010-5h.33a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-.33a2.5 2.5 0 010-5zm3.66.01a2.5 2.5 0 010-5h.34a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-.34a2.5 2.5 0 010-5zm3.67.01a2.5 2.5 0 010-5h.33a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-.33a2.5 2.5 0 010-5zm3.67.01a2.5 2.5 0 010-5h.33a2.5 2.5 0 012.5 2.5v.5a2.5 2.5 0 01-2.5 2.5h-.33a2.5 2.5 0 010-5zM12 18.5v-7"
    />
  </svg>
);

const SunIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
const MoonIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const AddPaymentIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
    />
    <path d="M19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
  </svg>
);

// Modified ChevronDownIcon to accept className prop
// FIX: Explicitly add className to ChevronDownIconProps to resolve typing issue.
interface ChevronDownIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// Fix: Updated to directly type props without React.FC to resolve potential IntrinsicAttributes error.
const ChevronDownIcon = ({ className, ...props }: ChevronDownIconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
  </svg>
);

const MenuIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6h16M4 12h16M4 18h16"
    />
  </svg>
);

const XIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CheckCircleIcon = ({ className, ...props }: IconProps) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// --- NEW AUTH ICONS ---
const MailIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
    />
  </svg>
);

const LockIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const UserIcon = (props: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  { id: 1, label: AR_LABELS.dashboard, icon: <DashboardIcon />, path: '/' },
  { id: 2, label: AR_LABELS.products, icon: <ProductsIcon />, path: '/products' },
  { id: 3, label: AR_LABELS.purchases, icon: <PurchasesIcon />, path: '/purchases' },
  { id: 4, label: AR_LABELS.cheques, icon: <ChequesIcon />, path: '/cheques' },
  { id: 5, label: AR_LABELS.expenses, icon: <ExpensesIcon />, path: '/expenses' },
  { id: 6, label: AR_LABELS.sales, icon: <SalesIcon />, path: '/sales' },
  {
    id: 7,
    label: AR_LABELS.pointOfSales,
    icon: <POSIcon />,
    path: '/pos/1',
    isDropdown: true,
    dropdownItems: [
      {
        id: 71,
        label: 'نقطة بيع ١ (Retail)',
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/pos/1',
      },
      {
        id: 72,
        label: 'نقطة بيع ٢ (Wholesale)',
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/pos/2',
      },
    ],
  },
  {
    id: 9,
    label: AR_LABELS.settings,
    icon: <PreferencesIcon />,
    path: '#',
    isDropdown: true,
    dropdownItems: [
      {
        id: 91,
        label: AR_LABELS.preferences,
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/preferences',
      },
      {
        id: 92,
        label: AR_LABELS.userManagement,
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/users',
      },
    ],
  },
];

export const TOP_NAV_ITEMS: TopNavItem[] = [
  { id: 1, label: AR_LABELS.dashboard, path: '/' },
  { id: 2, label: AR_LABELS.pointOfSales, path: '/pos/1' },
  { id: 3, label: AR_LABELS.products, path: '/products' },
  { id: 4, label: 'التقارير', path: '/reports' },
  { id: 5, label: AR_LABELS.users, path: '/users' },
  { id: 6, label: AR_LABELS.settings, path: '/settings' },
];

export const METRIC_CARDS_DATA: MetricCardProps[] = [
  {
    id: 1,
    title: AR_LABELS.todaysSales,
    value: '$0.00',
    icon: <DollarIcon />,
    bgColor: 'bg-green-100',
    valueColor: 'text-green-600',
  },
  {
    id: 2,
    title: AR_LABELS.thisMonth,
    value: '$0.00',
    icon: <CalendarIcon />,
    bgColor: 'bg-orange-100',
    valueColor: 'text-orange-600',
  },
  {
    id: 3,
    title: AR_LABELS.todaysTransactions,
    value: '0',
    icon: <ShoppingCartIcon />,
    bgColor: 'bg-blue-100',
    valueColor: 'text-blue-600',
  },
  {
    id: 4,
    title: AR_LABELS.totalProducts,
    value: '1',
    icon: <PackageIcon />,
    bgColor: 'bg-purple-100',
    valueColor: 'text-purple-600',
  },
  {
    id: 5,
    title: AR_LABELS.lowStockProducts,
    value: '0',
    icon: <ChartLineIcon />,
    bgColor: 'bg-red-100',
    valueColor: 'text-red-600',
  },
  {
    id: 6,
    title: AR_LABELS.expiredProducts,
    value: '0',
    icon: <ClockIcon />,
    bgColor: 'bg-yellow-100',
    valueColor: 'text-yellow-600',
  },
  {
    id: 7,
    title: AR_LABELS.customersWithBalance,
    value: '0',
    icon: <UsersMetricIcon />,
    bgColor: 'bg-indigo-100',
    valueColor: 'text-indigo-600',
  },
];

export const QUICK_ACTIONS_DATA: QuickActionProps[] = [
  {
    id: 1,
    title: AR_LABELS.newSale,
    icon: <NewSaleIcon />,
    colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    path: '/pos/new-sale',
  },
  {
    id: 2,
    title: AR_LABELS.addProduct,
    icon: <AddProductIcon />,
    colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    path: '/products/add-multi-unit',
  }, // Updated path
  {
    id: 3,
    title: AR_LABELS.viewCustomers,
    icon: <ViewCustomersIcon />,
    colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    path: '/customers',
  },
  {
    id: 4,
    title: AR_LABELS.viewReports,
    icon: <ViewReportsIcon />,
    colorClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    path: '/reports',
  },
];

// Mock product categories
export const PRODUCT_CATEGORIES = [
  'إلكترونيات',
  'أثاث',
  'مطبخ',
  'ملابس',
  'أحذية',
  'كتب',
  'ألعاب',
  'رياضة',
  'مستحضرات تجميل',
  'أدوات منزلية',
  'مشروبات', // Added for multi-unit example
  'وجبات خفيفة',
  'تنظيف',
];

// Utility to generate a unique ID
export const UUID = () => Math.random().toString(36).substring(2, 9);

// Reusable Toggle Switch Component
export const ToggleSwitch: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
}> = ({ enabled, onChange, label }) => {
  return (
    <div className="flex items-center justify-end">
      {label && (
        <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      )}
      <button
        type="button"
        className={`${
          enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-600'
        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
        onClick={() => onChange(!enabled)}
      >
        <span
          className={`${
            enabled ? '-translate-x-6' : '-translate-x-1'
          } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
        />
      </button>
    </div>
  );
};

export {
  ChevronDownIcon,
  AddProductIcon,
  EditIcon,
  DeleteIcon,
  CancelIcon,
  GenerateBarcodeIcon,
  PlusIcon,
  MinusIcon,
  PrintIcon,
  ViewIcon,
  SearchIcon,
  ImportIcon,
  ExportIcon,
  GridViewIcon,
  TableViewIcon,
  CashIcon,
  CreditCardIcon,
  HandIcon,
  MenuIcon,
  XIcon,
  UsersIcon,
  PurchasesIcon,
  ExpensesIcon,
  ChequesIcon,
  SunIcon,
  MoonIcon,
  AddPaymentIcon,
  ClockIcon,
  CheckCircleIcon,
  ReturnIcon,
  MailIcon,
  LockIcon,
  UserIcon,
};
