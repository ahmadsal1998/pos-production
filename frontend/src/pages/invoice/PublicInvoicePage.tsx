import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AR_LABELS } from '@/shared/constants';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { SaleTransaction } from '@/shared/types';
import { formatQuantityForDisplay } from '@/shared/utils';
import { printReceipt } from '@/shared/utils/printUtils';

const PublicInvoicePage: React.FC = () => {
  const { invoiceNumber, storeId } = useParams<{ invoiceNumber: string; storeId?: string }>();
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const [invoice, setInvoice] = useState<SaleTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceNumber) {
        setError('رقم الفاتورة غير موجود');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use the public invoice endpoint (no authentication required)
        const params = new URLSearchParams({ invoiceNumber: invoiceNumber.trim() });
        if (storeId) {
          params.append('storeId', storeId.trim());
        }
        
        console.log('[PublicInvoicePage] Fetching invoice:', { invoiceNumber, storeId });
        
        // Use fetch directly for public endpoint (no auth required)
        const apiBaseUrl = (import.meta.env.VITE_API_URL as string) || '/api';
        const url = `${apiBaseUrl}/sales/public/invoice?${params.toString()}`;
        console.log('[PublicInvoicePage] API URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        console.log('[PublicInvoicePage] API response:', { status: response.status, data });
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch invoice');
        }
        
        if (data.success && data.data && data.data.sale) {
          console.log('[PublicInvoicePage] Invoice found:', data.data.sale.invoiceNumber);
          console.log('[PublicInvoicePage] Raw items:', data.data.sale.items);
          // Map backend sale to frontend SaleTransaction format
          const mappedSale: SaleTransaction = {
            ...data.data.sale,
            items: Array.isArray(data.data.sale.items) ? data.data.sale.items.map((item: any) => {
              const mappedItem = {
                productId: typeof item.productId === 'string' ? parseInt(item.productId) || 0 : item.productId || 0,
                name: item.productName || item.name || 'منتج غير معروف',
                unit: item.unit || 'قطعة',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                total: item.totalPrice || item.total || 0,
                discount: item.discount || 0,
                conversionFactor: item.conversionFactor,
              };
              console.log('[PublicInvoicePage] Mapped item:', { original: item, mapped: mappedItem });
              return mappedItem;
            }) : [],
          };
          console.log('[PublicInvoicePage] Mapped sale:', mappedSale);
          setInvoice(mappedSale);
        } else {
          setError('الفاتورة غير موجودة');
        }
      } catch (err: any) {
        console.error('Error fetching invoice:', err);
        setError(err.response?.data?.message || 'حدث خطأ أثناء جلب الفاتورة');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceNumber, storeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">خطأ</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'الفاتورة غير موجودة'}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            العودة إلى الصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  const isReturn = invoice.status === 'Returned' || invoice.id?.startsWith('RET-');

  const handlePrint = () => {
    printReceipt('printable-receipt').catch(() => {
      window.print();
    });
  };

  const invoiceDate = invoice.date ? new Date(invoice.date) : new Date();
  const paymentMethod = (invoice as any).paymentMethod;
  const paidAmount = (invoice as any).paidAmount;
  const remainingAmount = (invoice as any).remainingAmount;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Print button - not part of printable content */}
        <div className="flex justify-end mb-4">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            طباعة
          </button>
        </div>
        <div
          id="printable-receipt"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 w-full max-w-2xl mx-auto text-right"
          data-invoice-date={invoiceDate.toISOString()}
          data-payment-method={paymentMethod || undefined}
          data-paid-amount={paidAmount != null ? paidAmount : undefined}
          data-remaining-amount={remainingAmount != null ? remainingAmount : undefined}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {isReturn ? AR_LABELS.returnInvoice : 'فاتورة'}
            </h1>
          </div>

          {/* Invoice Info - structure matches Sales Invoice for print extraction */}
          <div className="invoice-info text-sm mb-6 space-y-2 border-b border-gray-200 dark:border-gray-700 pb-4">
            <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.invoiceNumber || invoice.id}</p>
            <p data-date={invoiceDate.toISOString()}><strong>{AR_LABELS.date}:</strong> {invoiceDate.toLocaleString('ar-SA')}</p>
            <p><strong>{AR_LABELS.customerName}:</strong> {invoice.customerName || 'عميل نقدي'}</p>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="py-3 px-4 text-right font-bold border border-gray-300 dark:border-gray-600">اسم المنتج</th>
                  <th className="py-3 px-4 text-center font-bold border border-gray-300 dark:border-gray-600">الكمية</th>
                  <th className="py-3 px-4 text-center font-bold border border-gray-300 dark:border-gray-600">سعر الوحدة</th>
                  <th className="py-3 px-4 text-center font-bold border border-gray-300 dark:border-gray-600">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => {
                  // Use the item name (mapped from productName)
                  const itemName = item.name || '';
                  const itemUnitPrice = isReturn ? -Math.abs(item.unitPrice || 0) : (item.unitPrice || 0);
                  // totalPrice from backend already includes discount, so use it directly
                  // For returns, make it negative
                  const itemTotal = isReturn 
                    ? -Math.abs(item.total || 0)
                    : (item.total || 0);
                  
                  return (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-3 px-4 text-right font-medium text-gray-900 dark:text-gray-100">{itemName}</td>
                      <td className="py-3 px-4 text-center text-gray-700 dark:text-gray-300">{formatQuantityForDisplay(Math.abs(item.quantity || 0))}</td>
                      <td className={`py-3 px-4 text-center ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(itemUnitPrice)}
                      </td>
                      <td className={`py-3 px-4 text-center font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {formatCurrency(itemTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="receipt-summary mt-6 space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.subtotal}:</span>
              <span className={`font-semibold ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                {formatCurrency(isReturn ? -Math.abs(invoice.subtotal || 0) : (invoice.subtotal || 0))}
              </span>
            </div>
            {((invoice.totalItemDiscount || 0) + (invoice.invoiceDiscount || 0)) !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.totalDiscount}:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(isReturn ? -Math.abs((invoice.totalItemDiscount || 0) + (invoice.invoiceDiscount || 0)) : -((invoice.totalItemDiscount || 0) + (invoice.invoiceDiscount || 0)))}
                </span>
              </div>
            )}
            {invoice.tax && invoice.tax !== 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400 font-medium">{AR_LABELS.tax}:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(isReturn ? -Math.abs(invoice.tax) : invoice.tax)}
                </span>
              </div>
            )}
            <div className="grand-total flex justify-between pt-4 border-t-2 border-gray-300 dark:border-gray-600">
              <span className="text-gray-900 dark:text-gray-100 font-bold text-lg">
                {isReturn ? 'إجمالي قيمة الإرجاع' : AR_LABELS.grandTotal}:
              </span>
              <span className={`font-bold text-xl ${isReturn ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {formatCurrency(isReturn ? -Math.abs(invoice.totalAmount || 0) : (invoice.totalAmount || 0))}
              </span>
            </div>
          </div>

          {/* Footer */}
          <p className="receipt-footer text-center text-sm mt-8 text-gray-500 dark:text-gray-400">
            شكراً لتعاملكم معنا!
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicInvoicePage;

