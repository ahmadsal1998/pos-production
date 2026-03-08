import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import { AddProductIcon, ImportIcon, ExportIcon, PrintIcon, SearchIcon } from '@/shared/assets/icons';
import { QuickActionCard } from '@/shared/components/ui/QuickActionCard';

interface ProductQuickActionsProps {
  onAddProduct: () => void;
  onImportProducts: () => void;
  onExportProducts: () => void;
  onPrintBarcodes: () => void;
  onSearchProducts: () => void;
  /** When true, export button shows loading and is disabled */
  exportLoading?: boolean;
}

const ProductQuickActions: React.FC<ProductQuickActionsProps> = ({
  onAddProduct,
  onImportProducts,
  onExportProducts,
  onPrintBarcodes,
  onSearchProducts,
  exportLoading = false,
}) => {
  const navigate = useNavigate();

  const quickActions: Array<{
    id: number;
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
  }> = [
    {
      id: 1,
      title: 'إضافة منتج جديد',
      icon: <AddProductIcon />,
      colorClass: 'bg-orange-500 hover:bg-orange-600 text-white',
      onClick: () => navigate('/products/add')
    },
    {
      id: 2,
      title: 'استيراد المنتجات',
      icon: <ImportIcon />,
      colorClass: 'bg-blue-500 hover:bg-blue-600 text-white',
      onClick: onImportProducts
    },
    {
      id: 3,
      title: 'تصدير المنتجات',
      icon: <ExportIcon />,
      colorClass: 'bg-green-500 hover:bg-green-600 text-white',
      onClick: onExportProducts,
      disabled: exportLoading,
      loading: exportLoading,
    },
    {
      id: 4,
      title: 'طباعة الباركود',
      icon: <PrintIcon />,
      colorClass: 'bg-purple-500 hover:bg-purple-600 text-white',
      onClick: onPrintBarcodes
    },
    {
      id: 5,
      title: 'البحث المتقدم',
      icon: <SearchIcon />,
      colorClass: 'bg-indigo-500 hover:bg-indigo-600 text-white',
      onClick: onSearchProducts
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">الإجراءات السريعة</h3>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.disabled ? undefined : action.onClick}
            disabled={action.disabled}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all duration-200 ${action.colorClass} hover:shadow-lg hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100`}
          >
            <div className="mb-2">
              {action.loading ? (
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                action.icon
              )}
            </div>
            <span className="text-sm font-medium text-center">{action.loading ? 'جاري التصدير...' : action.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductQuickActions;
