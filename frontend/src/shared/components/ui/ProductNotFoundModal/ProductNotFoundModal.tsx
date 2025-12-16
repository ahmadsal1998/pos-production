import React, { useEffect, useState } from 'react';
import { XIcon } from '@/shared/assets/icons';

interface ProductNotFoundModalProps {
  isOpen: boolean;
  barcode: string;
  onClose: () => void;
  onQuickAdd: (barcode: string, costPrice: number, sellingPrice: number, productName?: string) => Promise<void>;
}

const ProductNotFoundModal: React.FC<ProductNotFoundModalProps> = ({ 
  isOpen, 
  barcode, 
  onClose, 
  onQuickAdd 
}) => {
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [productName, setProductName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCostPrice('');
      setSellingPrice('');
      setProductName('');
      setError('');
    }
  }, [isOpen]);

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

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    const costPriceNum = parseFloat(costPrice);
    const sellingPriceNum = parseFloat(sellingPrice);

    if (!costPrice.trim() || isNaN(costPriceNum) || costPriceNum < 0) {
      setError('يرجى إدخال سعر التكلفة صحيح');
      return;
    }

    if (!sellingPrice.trim() || isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      setError('يرجى إدخال سعر البيع صحيح');
      return;
    }

    if (sellingPriceNum < costPriceNum) {
      setError('سعر البيع يجب أن يكون أكبر من أو يساوي سعر التكلفة');
      return;
    }

    setIsSubmitting(true);
    try {
      await onQuickAdd(barcode, costPriceNum, sellingPriceNum, productName.trim() || undefined);
      // Close modal after successful add
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل إضافة المنتج. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 transition-opacity duration-300"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col border border-gray-200 dark:border-gray-800 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-900">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            المنتج غير موجود
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
        <div className="p-6">
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
              المنتج غير موجود في النظام
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              الباركود: <span className="font-mono font-semibold">{barcode}</span>
            </p>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                باركود المنتج
              </label>
              <input
                type="text"
                value={barcode}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-right font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                اسم المنتج
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="اسم المنتج (اختياري)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                سعر التكلفة <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-right">
                سعر البيع <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-right focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-600 dark:text-red-400 text-right">{error}</p>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'جاري الإضافة...' : 'إضافة سريعة'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductNotFoundModal;

