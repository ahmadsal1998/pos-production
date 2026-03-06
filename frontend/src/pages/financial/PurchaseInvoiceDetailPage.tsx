import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PurchaseOrder, PurchaseStatus, PurchasePaymentMethod } from '@/features/financial/types';
import { AR_LABELS, PrintIcon } from '@/shared/constants';
import { formatDate } from '@/shared/utils';
import { printReceipt } from '@/shared/utils/printUtils';
import { purchasesApi } from '@/lib/api';
import { useCurrency } from '@/shared/contexts/CurrencyContext';

const STATUS_STYLES: Record<PurchaseStatus, string> = {
  Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  Completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
};
const STATUS_LABELS: Record<PurchaseStatus, string> = {
  Pending: AR_LABELS.pending,
  Completed: AR_LABELS.completed,
  Cancelled: AR_LABELS.cancelled,
};
const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = {
  Cash: AR_LABELS.cash,
  'Bank Transfer': AR_LABELS.bankTransfer,
  Credit: AR_LABELS.credit,
  Cheque: AR_LABELS.cheque,
};

interface PurchaseInvoice extends PurchaseOrder {
  paidAmount?: number;
  remainingAmount?: number;
}

const PurchaseInvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { formatCurrency } = useCurrency();
  const [purchase, setPurchase] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPurchase = useCallback(async () => {
    if (!id) {
      setError('معرف الفاتورة غير صالح');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await purchasesApi.getPurchase(id);
      const raw = (res as any)?.data?.data?.purchase ?? (res as any)?.data?.purchase;
      if (!raw) {
        setError('الفاتورة غير موجودة');
        setPurchase(null);
        return;
      }
      setPurchase({
        id: raw.id,
        poNumber: raw.poNumber ?? raw.id,
        supplierId: raw.supplierId,
        supplierName: raw.supplierName,
        items: raw.items ?? [],
        subtotal: raw.subtotal ?? 0,
        tax: raw.tax ?? 0,
        discount: raw.discount ?? 0,
        totalAmount: raw.totalAmount ?? 0,
        status: raw.status ?? 'Pending',
        purchaseDate: raw.purchaseDate ?? raw.createdAt,
        paymentMethod: raw.paymentMethod ?? 'Cash',
        chequeDetails: raw.chequeDetails,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        notes: raw.notes,
        paidAmount: raw.paidAmount ?? 0,
        remainingAmount: raw.remainingAmount ?? (raw.totalAmount ?? 0) - (raw.paidAmount ?? 0),
      });
    } catch {
      setError('تعذر تحميل الفاتورة');
      setPurchase(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPurchase();
  }, [loadPurchase]);

  const handlePrint = () => {
    printReceipt('printable-purchase-invoice');
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
        <div className="relative mx-auto max-w-4xl px-4 py-8 flex items-center justify-center min-h-[40vh]">
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الفاتورة...</p>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
        <div className="relative mx-auto max-w-4xl px-4 py-8 space-y-6">
          <Link
            to="/purchases/invoices"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/50 text-slate-700 dark:text-slate-200 hover:shadow-md font-medium text-sm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة لقائمة الفواتير
          </Link>
          <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-8 border border-slate-200/50 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">{error || 'الفاتورة غير موجودة'}</p>
          </div>
        </div>
      </div>
    );
  }

  const paidAmount = purchase.paidAmount ?? 0;
  const remainingAmount = purchase.remainingAmount ?? Math.max(0, purchase.totalAmount - paidAmount);

  // Company name for print header (from localStorage preferences if available)
  const companyName =
    (typeof window !== 'undefined' &&
      (() => {
        try {
          const s = localStorage.getItem('preferences');
          if (s) {
            const p = JSON.parse(s);
            return p?.businessName || p?.storeName || p?.companyName || '';
          }
        } catch {}
        return '';
      })()) ||
    '';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Screen-only: Back + Print */}
        <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
          <Link
            to="/purchases/invoices"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-slate-800/95 border border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 hover:shadow-md font-medium text-sm"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            العودة لقائمة الفواتير
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm shadow-sm"
          >
            <PrintIcon className="h-5 w-5" />
            {AR_LABELS.printReceipt}
          </button>
        </div>

        {/* Printable invoice: self-contained with inline styles for iframe print (no Tailwind in print) */}
        <div id="printable-purchase-invoice" className="purchase-invoice-print-wrap">
          <style dangerouslySetInnerHTML={{ __html: `
            .purchase-invoice-print-wrap {
              max-width: 210mm;
              margin: 0 auto;
              background: #fff;
              color: #1e293b;
              font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              box-sizing: border-box;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              border: 1px solid #e2e8f0;
            }
            .purchase-invoice-print-wrap * { box-sizing: border-box; }
            .purchase-invoice-print-wrap .inv-page {
              padding: 14mm 16mm;
              min-height: 100%;
            }
            .purchase-invoice-print-wrap .inv-header {
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              padding-bottom: 12px;
              margin-bottom: 14px;
              border-bottom: 2px solid #0f172a;
            }
            .purchase-invoice-print-wrap .inv-company {
              text-align: right;
            }
            .purchase-invoice-print-wrap .inv-company-name {
              font-size: 16pt;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 2px 0;
            }
            .purchase-invoice-print-wrap .inv-doc-title {
              font-size: 12pt;
              color: #475569;
              margin: 0;
            }
            .purchase-invoice-print-wrap .inv-meta {
              text-align: left;
            }
            .purchase-invoice-print-wrap .inv-meta-row { margin-bottom: 4px; }
            .purchase-invoice-print-wrap .inv-meta-label { font-size: 9pt; color: #64748b; }
            .purchase-invoice-print-wrap .inv-meta-value { font-weight: 600; font-size: 11pt; color: #0f172a; }
            .purchase-invoice-print-wrap .inv-status {
              display: inline-block;
              padding: 3px 10px;
              font-size: 9pt;
              font-weight: 700;
              border-radius: 4px;
              margin-top: 4px;
            }
            .purchase-invoice-print-wrap .inv-status-pending { background: #fef3c7; color: #92400e; }
            .purchase-invoice-print-wrap .inv-status-completed { background: #d1fae5; color: #065f46; }
            .purchase-invoice-print-wrap .inv-status-cancelled { background: #fee2e2; color: #991b1b; }
            .purchase-invoice-print-wrap .inv-section-title {
              font-size: 9pt;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0 0 6px 0;
            }
            .purchase-invoice-print-wrap .inv-supplier-box {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 10px 12px;
              margin-bottom: 16px;
            }
            .purchase-invoice-print-wrap .inv-supplier-name { font-weight: 700; font-size: 12pt; color: #0f172a; margin: 0; }
            .purchase-invoice-print-wrap .inv-table-wrap {
              width: 100%;
              overflow: hidden;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              margin-bottom: 16px;
            }
            .purchase-invoice-print-wrap .inv-table {
              width: 100%;
              border-collapse: collapse;
              text-align: right;
              font-size: 10pt;
            }
            .purchase-invoice-print-wrap .inv-table th {
              background: #0f172a;
              color: #fff;
              padding: 8px 10px;
              font-weight: 600;
              border: 1px solid #0f172a;
            }
            .purchase-invoice-print-wrap .inv-table td {
              padding: 8px 10px;
              border: 1px solid #e2e8f0;
            }
            .purchase-invoice-print-wrap .inv-table tbody tr:nth-child(even) { background: #f8fafc; }
            .purchase-invoice-print-wrap .inv-totals {
              width: 100%;
              max-width: 280px;
              margin: 0 0 0 auto;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
              margin-bottom: 16px;
            }
            .purchase-invoice-print-wrap .inv-totals-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 10pt;
            }
            .purchase-invoice-print-wrap .inv-totals-row.grand {
              background: #0f172a;
              color: #fff;
              font-size: 12pt;
              font-weight: 700;
              border-bottom: none;
              padding: 10px 12px;
            }
            .purchase-invoice-print-wrap .inv-payment-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
              margin-top: 8px;
            }
            .purchase-invoice-print-wrap .inv-payment-cell {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 10px;
              font-size: 10pt;
            }
            .purchase-invoice-print-wrap .inv-payment-cell strong { display: block; font-size: 9pt; color: #64748b; margin-bottom: 2px; }
            .purchase-invoice-print-wrap .inv-notes { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 10pt; color: #475569; }
            .purchase-invoice-print-wrap .inv-cheque { margin-top: 10px; padding: 10px; background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; font-size: 10pt; }
            @media print {
              @page { size: A4; margin: 14mm; }
              body { background: #fff !important; }
              .purchase-invoice-print-wrap {
                max-width: none !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .purchase-invoice-print-wrap .inv-page { padding: 0 !important; }
              .purchase-invoice-print-wrap .inv-table { page-break-inside: avoid; }
              .purchase-invoice-print-wrap .inv-totals-row.grand { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `}} />

          <div className="inv-page" dir="rtl">
            <header className="inv-header">
              <div className="inv-company">
                {companyName && <p className="inv-company-name">{companyName}</p>}
                <p className="inv-doc-title">فاتورة شراء</p>
              </div>
              <div className="inv-meta">
                <div className="inv-meta-row">
                  <span className="inv-meta-label">{AR_LABELS.poNumber}: </span>
                  <span className="inv-meta-value">{purchase.poNumber ?? purchase.id}</span>
                </div>
                <div className="inv-meta-row">
                  <span className="inv-meta-label">{AR_LABELS.purchaseDate}: </span>
                  <span className="inv-meta-value">{formatDate(purchase.purchaseDate)}</span>
                </div>
                <span className={`inv-status inv-status-${purchase.status.toLowerCase()}`}>
                  {STATUS_LABELS[purchase.status]}
                </span>
              </div>
            </header>

            <section className="inv-supplier-section">
              <h2 className="inv-section-title">بيانات المورد</h2>
              <div className="inv-supplier-box">
                <p className="inv-supplier-name">{purchase.supplierName}</p>
                {purchase.supplierId && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: '#64748b' }}>المعرف: {purchase.supplierId}</p>
                )}
              </div>
            </section>

            <section className="inv-items-section">
              <h2 className="inv-section-title">تفاصيل الأصناف</h2>
              <div className="inv-table-wrap">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th style={{ width: '32px' }}>#</th>
                      <th>{AR_LABELS.productName}</th>
                      <th style={{ width: '70px' }}>{AR_LABELS.unit}</th>
                      <th style={{ width: '70px' }}>{AR_LABELS.quantity}</th>
                      <th style={{ width: '90px' }}>{AR_LABELS.unitCost}</th>
                      <th style={{ width: '100px' }}>{AR_LABELS.totalAmount}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items?.map((item, index) => {
                      const unitLabel = item.unit ?? 'قطعة';
                      return (
                        <tr key={item.productId + index}>
                          <td>{index + 1}</td>
                          <td>{item.productName}</td>
                          <td>{unitLabel}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unitCost)}</td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(item.totalCost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="inv-totals-section">
              <div className="inv-totals">
                <div className="inv-totals-row">
                  <span>{AR_LABELS.subtotal}</span>
                  <span>{formatCurrency(purchase.subtotal)}</span>
                </div>
                {purchase.discount > 0 && (
                  <div className="inv-totals-row">
                    <span>{AR_LABELS.discount}</span>
                    <span>-{formatCurrency(purchase.discount)}</span>
                  </div>
                )}
                {purchase.tax != null && purchase.tax > 0 && (
                  <div className="inv-totals-row">
                    <span>{AR_LABELS.tax}</span>
                    <span>{purchase.tax}%</span>
                  </div>
                )}
                <div className="inv-totals-row grand">
                  <span>{AR_LABELS.grandTotal}</span>
                  <span>{formatCurrency(purchase.totalAmount)}</span>
                </div>
              </div>
            </section>

            <section className="inv-payment-section">
              <h2 className="inv-section-title">تفاصيل الدفع</h2>
              <div className="inv-payment-grid">
                <div className="inv-payment-cell">
                  <strong>{AR_LABELS.paymentMethod}</strong>
                  {PAYMENT_METHOD_LABELS[purchase.paymentMethod]}
                </div>
                <div className="inv-payment-cell">
                  <strong>{AR_LABELS.amountPaid ?? 'المبلغ المدفوع'}</strong>
                  {formatCurrency(paidAmount)}
                </div>
                <div className="inv-payment-cell">
                  <strong>{AR_LABELS.remaining ?? 'المتبقي'}</strong>
                  {formatCurrency(remainingAmount)}
                </div>
              </div>
              {purchase.paymentMethod === 'Cheque' && purchase.chequeDetails && (
                <div className="inv-cheque">
                  <strong>تفاصيل الشيك</strong>
                  <div style={{ marginTop: 6 }}>
                    {purchase.chequeDetails.chequeNumber && (
                      <div>رقم الشيك: {purchase.chequeDetails.chequeNumber}</div>
                    )}
                    {purchase.chequeDetails.bankName && <div>البنك: {purchase.chequeDetails.bankName}</div>}
                    {purchase.chequeDetails.chequeDueDate && (
                      <div>تاريخ الاستحقاق: {formatDate(purchase.chequeDetails.chequeDueDate)}</div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {purchase.notes && (
              <div className="inv-notes">
                <strong>{AR_LABELS.notes}:</strong> {purchase.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseInvoiceDetailPage;
