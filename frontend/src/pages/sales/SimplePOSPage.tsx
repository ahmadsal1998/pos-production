import React, { useState } from 'react';
import { salesApi } from '@/lib/api/client';
import { useAuthStore } from '@/app/store';
import { AR_LABELS } from '@/shared/constants';

const SimplePOSPage: React.FC = () => {
  const { user } = useAuthStore();
  const [invoiceAmount, setInvoiceAmount] = useState<string>('');
  const [customerNumber, setCustomerNumber] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate invoice amount
    const amount = parseFloat(invoiceAmount);
    if (!invoiceAmount || isNaN(amount) || amount <= 0) {
      setMessage({ type: 'error', text: 'يرجى إدخال مبلغ الفاتورة صحيح' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await salesApi.createSimpleSale({
        invoiceAmount: amount,
        customerNumber: customerNumber.trim() || undefined,
      });

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `تم تسجيل البيع بنجاح! رقم الفاتورة: ${response.data.data.sale.invoiceNumber}` 
        });
        
        // Clear form
        setInvoiceAmount('');
        setCustomerNumber('');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setMessage(null);
        }, 5000);
      } else {
        setMessage({ type: 'error', text: response.data.message || 'فشل في تسجيل البيع' });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'حدث خطأ أثناء تسجيل البيع';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 rounded-lg shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">نقطة البيع</h1>
            <p className="text-slate-400">تسجيل بيع سريع</p>
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 border border-green-700 text-green-200'
                  : 'bg-red-900/50 border border-red-700 text-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="invoiceAmount" className="block text-sm font-medium text-slate-300 mb-2">
                مبلغ الفاتورة *
              </label>
              <input
                type="number"
                id="invoiceAmount"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                step="0.01"
                min="0.01"
                required
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                placeholder="0.00"
                dir="ltr"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label htmlFor="customerNumber" className="block text-sm font-medium text-slate-300 mb-2">
                رقم هاتف العميل (اختياري)
              </label>
              <input
                type="text"
                id="customerNumber"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                placeholder="رقم الهاتف"
                disabled={isSubmitting}
              />
              <p className="mt-2 text-xs text-slate-400">
                سيتم إضافة نقاط المكافآت تلقائياً إذا كان العميل موجوداً
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              {isSubmitting ? 'جاري المعالجة...' : 'تأكيد البيع'}
            </button>
          </form>

          {user && (
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-400 text-center">
                المتجر: {user.storeId || 'غير محدد'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimplePOSPage;
