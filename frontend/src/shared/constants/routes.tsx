import { AR_LABELS } from './ui';
import {
  DashboardIcon,
  ProductsIcon,
  PurchasesIcon,
  ChequesIcon,
  ExpensesIcon,
  SalesIcon,
  POSIcon,
  PreferencesIcon,
  DollarIcon,
  CalendarIcon,
  ShoppingCartIcon,
  PackageIcon,
  ChartLineIcon,
  ClockIcon,
  UsersMetricIcon,
  NewSaleIcon,
  AddProductIcon,
  ViewCustomersIcon,
  ViewReportsIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
  SearchIcon,
  GridViewIcon,
  TableViewIcon,
  XIcon,
  CheckCircleIcon,
  EditIcon,
  MailIcon,
  UserIcon,
  LockIcon,
  PlusIcon,
  FilterIcon,
  DeleteIcon,
  ViewIcon,
  // Additional icons needed
  CancelIcon,
  PrintIcon,
  ExportIcon,
  ImportIcon,
  HandIcon,
  ReturnIcon,
  MinusIcon,
  GenerateBarcodeIcon,
  AddPaymentIcon,
  MobileRechargeIcon,
  TerminalIcon
} from '../../shared/assets/icons';

// Define types locally to avoid circular dependencies
export interface NavItem {
  id: number;
  label: string;
  icon: React.ReactNode;
  path: string;
  isDropdown?: boolean;
  dropdownItems?: NavItem[];
  isStoreOwnerOnly?: boolean; // Only visible to store owners (not system admins)
}

export interface TopNavItem {
  id: number;
  label: string;
  path: string;
}

export interface MetricCardProps {
  id: number;
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
  valueColor: string;
}

export interface QuickActionProps {
  id: number;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  path: string;
}

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
        label: 'نقطة بيع (مفرق)',
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/pos/1',
      },
      {
        id: 72,
        label: 'نقطة بيع (جملة)',
        icon: <span className="block h-2 w-2 rounded-full bg-gray-500"></span>,
        path: '/pos/2',
      },
    ],
  },
  {
    id: 8,
    label: 'تاريخ النقاط',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    path: '/points/history',
  },
  {
    id: 10,
    label: 'حساب النقاط الخاص بي',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    path: '/my-store-points-account',
    isStoreOwnerOnly: true, // Only visible to store owners
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
  { id: 4, label: AR_LABELS.reports, path: '/reports' },
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
    path: '/products/add-new',
  }, // Updated path to new simplified product entry
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

// Store Points Account quick action (only for store owners)
export const STORE_POINTS_ACCOUNT_ACTION: QuickActionProps = {
  id: 5,
  title: 'حساب النقاط الخاص بي',
  icon: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
  path: '/my-store-points-account',
};

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

// Re-export icons for convenience
export { 
  ChevronDownIcon, 
  SunIcon, 
  MoonIcon,
  SearchIcon,
  GridViewIcon,
  TableViewIcon,
  ClockIcon,
  ChequesIcon,
  XIcon,
  CheckCircleIcon,
  EditIcon,
  MailIcon,
  UserIcon,
  LockIcon,
  PlusIcon,
  FilterIcon,
  DeleteIcon,
  ViewIcon,
  // Additional icons
  CancelIcon,
  PrintIcon,
  ExportIcon,
  ImportIcon,
  HandIcon,
  ReturnIcon,
  MinusIcon,
  GenerateBarcodeIcon,
  AddPaymentIcon,
  AddProductIcon,
  MobileRechargeIcon,
  TerminalIcon
};
