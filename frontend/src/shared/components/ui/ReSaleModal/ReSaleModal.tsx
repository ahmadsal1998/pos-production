import React, { useEffect } from 'react';
import { XIcon } from '@/shared/assets/icons';
import { useCurrency } from '@/shared/contexts/CurrencyContext';

interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
  discount?: number;
}

interface ExistingInvoice {
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  totalItemDiscount?: number;
  invoiceDiscount?: number;
  tax?: number;
  total: number;
  customerName: string;
  date: string;
}

interface ReSaleModalProps {
  isOpen: boolean;
  existingInvoice: ExistingInvoice | null;
  onClose: () => void;
  onReSale: () => void;
}

const ReSaleModal: React.FC<ReSaleModalProps> = ({
  isOpen,
  existingInvoice,
  onClose,
  onReSale,
}) => {
  const { formatCurrency } = useCurrency();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !existingInvoice) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 transition-opacity duration-300"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-800 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resale-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-900">
          <h2 id="resale-modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            تعارض في رقم الفاتورة
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            aria-label="إغلاق"
            title="إغلاق"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Warning Message */}
          <div className="mb-6 text-center">
            <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-orange-600 dark:text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <p className="text-gray-700 dark:text-gray-300 mb-2 text-lg font-medium">
              رقم الفاتورة موجود مسبقاً بمحتوى مختلف
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-base mb-1">
              رقم الفاتورة: <span className="font-mono font-semibold text-orange-600 dark:text-orange-400">{existingInvoice.invoiceNumber}</span>
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              يمكنك إعادة بيع هذه الفاتورة باستخدام رقم فاتورة جديد
            </p>
          </div>

          {/* Invoice Details */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              محتويات الفاتورة الأصلية:
            </h3>

            {/* Invoice Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">العميل:</span>
                  <span className="mr-2 font-semibold text-gray-900 dark:text-gray-100">
                    {existingInvoice.customerName}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">التاريخ:</span>
                  <span className="mr-2 font-semibold text-gray-900 dark:text-gray-100">
                    {new Date(existingInvoice.date).toLocaleString('ar-SA')}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      اسم المنتج
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      الكمية
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      سعر الوحدة
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {existingInvoice.items.map((item, index) => (
                    <tr
                      key={`${item.productId}-${index}`}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                        {item.productName}
                        {item.unit && (
                          <span className="mr-2 text-xs text-gray-500 dark:text-gray-400">
                            ({item.unit})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                      المجموع:
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-lg text-gray-900 dark:text-gray-100">
                      {formatCurrency(existingInvoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 justify-end bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onReSale}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-md hover:shadow-lg"
          >
            إعادة البيع
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReSaleModal;

