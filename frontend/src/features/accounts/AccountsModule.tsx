import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AR_LABELS, UUID, SearchIcon, PlusIcon, PrintIcon } from '@/shared/constants';
import { EditIcon, DeleteIcon, ViewIcon, AddPaymentIcon } from '@/shared/assets/icons';
import { GridViewIcon, TableViewIcon } from '@/shared/constants/routes';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { useDropdown } from '@/shared/contexts/DropdownContext';
import { MetricCard } from '@/shared/components';
import { formatDate } from '@/shared/utils';
import { customersApi, suppliersApi, salesApi, purchasesApi, getApiErrorMessage, storeSettingsApi } from '@/lib/api';
import type { ApiError } from '@/lib/api';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useAuthStore } from '@/app/store';
import { printReceipt } from '@/shared/utils/printUtils';
import { loadSettings } from '@/shared/utils/settingsStorage';
import { useResponsiveViewMode } from '@/shared/hooks';
import { useConfirmDialog } from '@/shared/contexts/ConfirmDialogContext';
import type { AccountSummary, AccountEntity, AccountsLabels } from './types';
import Button from '@/shared/components/ui/Button/Button';

export type AccountMode = 'customer' | 'supplier';

/** Payment payload for add payment (entityId = customerId or supplierId) */
export interface AccountPaymentPayload {
  entityId: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Bank Transfer' | 'Cheque';
  notes?: string;
  invoiceId?: string;
  purchaseId?: string;
}

const formatStatementNumber = (
  value: number,
  formatCurrencyFn: (val: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number; showSymbol?: boolean }) => string
): string => {
  if (value === 0) return '-';
  const isWholeNumber = Math.abs(value % 1) < 0.001;
  if (isWholeNumber) return formatCurrencyFn(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatted = formatCurrencyFn(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return formatted.replace(/(\d+)\.0+(\s|$)/, '$1$2').replace(/(\d+\.\d*?)0+(\s|$)/, '$1$2');
};

// ----- Balance filter dropdown -----
const BalanceFilterDropdown: React.FC<{
  value: { debtor: boolean; creditor: boolean };
  onChange: (v: { debtor: boolean; creditor: boolean }) => void;
  className?: string;
  labels: { allFilter: string; debtorFilter: string; creditorFilter: string };
}> = ({ value, onChange, className = '', labels }) => {
  const dropdownId = useMemo(() => `balance-filter-${Math.random().toString(36).slice(2, 9)}`, []);
  const { openDropdownId, setOpenDropdownId, closeAllDropdowns } = useDropdown();
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpen = openDropdownId === dropdownId;

  useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const update = () => {
      if (!buttonRef.current) return;
      const r = buttonRef.current.getBoundingClientRect();
      setMenuPosition({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    const h = () => update();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    const clickOutside = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (buttonRef.current?.contains(t)) return;
      if (document.querySelector(`[data-menu-id="${dropdownId}"]`)?.contains(t)) return;
      closeAllDropdowns();
    };
    document.addEventListener('mousedown', clickOutside);
    return () => {
      window.removeEventListener('resize', h);
      window.removeEventListener('scroll', h, true);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, [isOpen, dropdownId, closeAllDropdowns]);

  const getDisplayLabel = () => {
    if (value.debtor && value.creditor) return labels.allFilter;
    if (value.debtor) return labels.debtorFilter;
    if (value.creditor) return labels.creditorFilter;
    return 'لا يوجد';
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? closeAllDropdowns() : setOpenDropdownId(dropdownId))}
        className="relative w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium shadow-sm"
      >
        <div className="flex items-center justify-between">
          <span className="truncate text-right">{getDisplayLabel()}</span>
          <svg className={`ml-2 h-4 w-4 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          data-menu-id={dropdownId}
          className="fixed z-[9999] rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl p-2"
          style={{ top: menuPosition.top, left: menuPosition.left, width: menuPosition.width }}
          onClick={e => e.stopPropagation()}
        >
          <label className="flex items-center px-3 py-2.5 text-right text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <input type="checkbox" checked={value.debtor} onChange={e => onChange({ ...value, debtor: e.target.checked })} className="ml-3 h-4 w-4 text-orange-600 rounded" />
            <span className="flex-1">{labels.debtorFilter}</span>
          </label>
          <label className="flex items-center px-3 py-2.5 text-right text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <input type="checkbox" checked={value.creditor} onChange={e => onChange({ ...value, creditor: e.target.checked })} className="ml-3 h-4 w-4 text-orange-600 rounded" />
            <span className="flex-1">{labels.creditorFilter}</span>
          </label>
        </div>,
        document.body
      )}
    </div>
  );
};

// ----- Add Payment Modal (receipt / journal voucher) -----
type VoucherType = 'receiptVoucher' | 'journalVoucher';
const AddPaymentModal: React.FC<{
  summary: AccountSummary | null;
  onClose: () => void;
  onSave: (payload: AccountPaymentPayload) => void;
  entityLabel: string;
}> = ({ summary, onClose, onSave, entityLabel }) => {
  const [voucherType, setVoucherType] = useState<VoucherType | null>(null);
  const [amountStr, setAmountStr] = useState('0');
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Only reset form when opening for a different entity (use entityId so parent re-renders with new summary reference don't wipe user input)
  useEffect(() => {
    if (summary) {
      setAmountStr('0');
      setDate(new Date().toISOString().split('T')[0]);
      setMethod('Cash');
      setNotes('');
      setVoucherType(null);
    }
  }, [summary?.entityId]);

  if (!summary) return null;

  const handleSave = () => {
    if (!voucherType) {
      alert('يرجى اختيار نوع السند.');
      return;
    }
    // Read from DOM so we get the latest value even if user just typed and pressed Enter before React state updated
    const rawValue = amountInputRef.current?.value ?? amountStr;
    const numericValue = Number(rawValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      alert('المبلغ يجب أن يكون أكبر من صفر.');
      return;
    }
    const paymentAmount = voucherType === 'receiptVoucher' ? numericValue : -numericValue;
    onSave({
      entityId: summary.entityId,
      date,
      amount: paymentAmount,
      method,
      notes: notes || undefined,
    });
  };

  const overlayClass = 'fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4';

  if (!voucherType) {
    return createPortal(
      <div className={overlayClass} onClick={onClose} aria-modal="true">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
          <div className="p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">اختر نوع السند لـ {summary.entityName}</h2>
            <div className="space-y-2">
              <button onClick={() => setVoucherType('receiptVoucher')} className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-md text-right font-medium">
                {AR_LABELS.receiptVoucher}
              </button>
              <button onClick={() => setVoucherType('journalVoucher')} className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-md text-right font-medium">
                {AR_LABELS.journalVoucher}
              </button>
            </div>
          </div>
          <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const voucherLabel = voucherType === 'receiptVoucher' ? AR_LABELS.receiptVoucher : AR_LABELS.journalVoucher;
  return createPortal(
    <div className={overlayClass} onClick={onClose} aria-modal="true">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex justify-between mb-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{voucherLabel} لـ {summary.entityName}</h2>
            <button onClick={() => setVoucherType(null)} className="text-sm text-gray-500 hover:text-gray-700">← رجوع</button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.paymentAmount}</label>
            <input
              ref={amountInputRef}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={amountStr}
              onChange={e => setAmountStr(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.paymentMethod}</label>
            <CustomDropdown id="payment-method-acc" value={method} onChange={v => setMethod(v as any)} options={[{ value: 'Cash', label: AR_LABELS.cash }, { value: 'Bank Transfer', label: AR_LABELS.bankTransfer }, { value: 'Cheque', label: AR_LABELS.cheque }]} placeholder={AR_LABELS.paymentMethod} className="w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.date}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.notes}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md" />
          </div>
        </div>
        <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700">
          <button type="button" onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ----- Statement Modal (transactions + print) -----
interface StatementTransaction {
  date: string;
  entryDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  sourceType: 'sale' | 'purchase' | 'payment';
  sourceId: string;
  invoiceNumber?: string | null;
}

const AccountStatementModal: React.FC<{
  summary: AccountSummary | null;
  mode: AccountMode;
  labels: AccountsLabels;
  onClose: () => void;
  onStatementUpdated: () => void;
}> = ({ summary, mode, labels, onClose, onStatementUpdated }) => {
  const { formatCurrency } = useCurrency();
  const { user } = useAuthStore();
  const confirmDialog = useConfirmDialog();
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<{ index: number; transaction: StatementTransaction } | null>(null);
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentEditForm, setPaymentEditForm] = useState<{ amountStr: string; method: 'Cash' | 'Bank Transfer' | 'Cheque'; date: string; notes: string; invoiceId: string }>({ amountStr: '0', method: 'Cash', date: '', notes: '', invoiceId: '' });
  const [storeAddress, setStoreAddress] = useState('');
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    if (!summary) {
      setSelectedTransaction(null);
      setShowEditPaymentModal(false);
      return;
    }
    const entityId = summary.entityId;
    setIsLoading(true);
    const load = async () => {
      try {
        if (mode === 'customer') {
          const [salesRes, payRes] = await Promise.all([
            salesApi.getSales({ customerId: entityId, limit: 10000, page: 1 }),
            customersApi.getCustomerPayments({ customerId: entityId }),
          ]);
          const sData = (salesRes.data as any)?.data;
          const pData = (payRes.data as any)?.data;
          setRawInvoices(Array.isArray(sData?.sales) ? sData.sales : []);
          setAllInvoices((Array.isArray(sData?.sales) ? sData.sales : []).map((s: any) => ({
            id: s.id || s._id || s.invoiceNumber,
            invoiceNumber: s.invoiceNumber || s.id || s._id,
            date: s.date || s.createdAt,
            totalAmount: s.total || s.totalAmount || 0,
            status: s.status,
            originalInvoiceId: s.originalInvoiceId,
          })));
          setRawPayments(Array.isArray(pData?.payments) ? pData.payments : []);
          setAllPayments((Array.isArray(pData?.payments) ? pData.payments : []).map((p: any) => ({
            id: p.id || p._id,
            entityId: p.customerId,
            date: p.date || p.createdAt,
            amount: p.amount || 0,
            method: p.method || 'Cash',
            invoiceId: p.invoiceId,
            notes: p.notes || '',
          })));
        } else {
          const [purchasesRes, payRes] = await Promise.all([
            purchasesApi.getPurchases({ supplierId: entityId }),
            suppliersApi.getSupplierPayments({ supplierId: entityId }),
          ]);
          const purData = (purchasesRes.data as any)?.data;
          const pData = (payRes.data as any)?.data;
          const purchases = Array.isArray(purData?.purchases) ? purData.purchases : [];
          setRawInvoices(purchases);
          setAllInvoices(purchases.map((p: any) => ({
            id: p.id || p._id || p.poNumber,
            invoiceNumber: p.poNumber || p.id || p._id,
            date: p.purchaseDate || p.createdAt,
            totalAmount: p.totalAmount || 0,
            status: p.status,
          })));
          setRawPayments(Array.isArray(pData?.payments) ? pData.payments : []);
          setAllPayments((Array.isArray(pData?.payments) ? pData.payments : []).map((p: any) => ({
            id: p.id || p._id,
            entityId: p.supplierId,
            date: p.date || p.createdAt,
            amount: p.amount || 0,
            method: p.method || 'Cash',
            purchaseId: p.purchaseId,
            notes: p.notes || '',
          })));
        }
      } catch (e) {
        console.error('[AccountStatementModal] Error loading transactions', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [summary?.entityId, mode]);

  useEffect(() => {
    if (!summary) return;
    const settings = loadSettings(null);
    setBusinessName(settings?.businessName || '');
    setStoreAddress(settings?.storeAddress || '');
  }, [summary]);

  const transactions = useMemo<StatementTransaction[]>(() => {
    if (!summary) return [];
    const entityId = summary.entityId;
    const invoices = allInvoices;
    const payments = allPayments;
    const invoiceRows: StatementTransaction[] = invoices.map((inv: any) => {
      const isReturn = mode === 'customer' && (inv.status === 'Returned' || inv.totalAmount < 0);
      const amount = Math.abs(inv.totalAmount || 0);
      const raw = rawInvoices.find((r: any) => (r.id || r._id || r.invoiceNumber) === (inv.id || inv.invoiceNumber));
      const entryDate = raw?.createdAt ? (typeof raw.createdAt === 'string' ? raw.createdAt : (raw.createdAt as Date).toISOString()) : (inv.date || '');
      // For customer sales: debit = invoice total, credit = amount already paid at sale (cash/card).
      // For supplier purchases: debit = invoice total, credit = amount already paid at purchase (cash/bank etc).
      // So balance impact = total - paidAmount. Changing invoice type cash↔credit is reflected correctly.
      const paidAtInvoice =
        mode === 'customer' && !isReturn ? Math.min(amount, Math.max(0, raw?.paidAmount ?? 0)) :
        mode !== 'customer' ? Math.min(amount, Math.max(0, raw?.paidAmount ?? 0)) : 0;
      return {
        date: inv.date,
        entryDate,
        description: mode === 'customer'
          ? (isReturn ? `إرجاع - ${AR_LABELS.invoice} #${inv.invoiceNumber || inv.id}` : `شراء - ${AR_LABELS.invoice} #${inv.invoiceNumber || inv.id}`)
          : `شراء - أمر شراء #${inv.invoiceNumber || inv.id}`,
        debit: isReturn ? 0 : amount,
        credit: isReturn ? amount : paidAtInvoice,
        balance: 0,
        sourceType: mode === 'customer' ? 'sale' : 'purchase',
        sourceId: inv.id || inv.invoiceNumber || '',
        invoiceNumber: inv.invoiceNumber || inv.id,
      };
    });
    const paymentRows: StatementTransaction[] = payments.map((p: any) => {
      const isCredit = p.amount >= 0;
      const absAmount = Math.abs(p.amount);
      let description = isCredit ? `${AR_LABELS.receiptVoucher} - ${p.method}` : `${AR_LABELS.journalVoucher} - ${p.method}`;
      if (p.notes?.trim()) description += ` (${p.notes.trim()})`;
      const raw = rawPayments.find((r: any) => (r.id || r._id) === p.id);
      const entryDate = raw?.createdAt ? (typeof raw.createdAt === 'string' ? raw.createdAt : (raw.createdAt as Date).toISOString()) : (p.date || '');
      return {
        date: p.date,
        entryDate,
        description,
        debit: isCredit ? 0 : absAmount,
        credit: isCredit ? absAmount : 0,
        balance: 0,
        sourceType: 'payment',
        sourceId: p.id,
        invoiceNumber: p.invoiceId || p.purchaseId,
      };
    });
    const combined = [...invoiceRows, ...paymentRows].sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
    let running = 0;
    return combined.map(t => {
      running += t.debit - t.credit;
      return { ...t, balance: running };
    });
  }, [summary, allInvoices, allPayments, rawInvoices, rawPayments, mode]);

  const refetchPayments = useCallback(async () => {
    if (!summary?.entityId) return;
    try {
      if (mode === 'customer') {
        const res = await customersApi.getCustomerPayments({ customerId: summary.entityId });
        const data = (res.data as any)?.data;
        if (data?.payments) {
          setRawPayments(data.payments);
          setAllPayments(data.payments.map((p: any) => ({ id: p.id || p._id, entityId: p.customerId, date: p.date || p.createdAt, amount: p.amount || 0, method: p.method || 'Cash', invoiceId: p.invoiceId, notes: p.notes || '' })));
        }
      } else {
        const res = await suppliersApi.getSupplierPayments({ supplierId: summary.entityId });
        const data = (res.data as any)?.data;
        if (data?.payments) {
          setRawPayments(data.payments);
          setAllPayments(data.payments.map((p: any) => ({ id: p.id || p._id, entityId: p.supplierId, date: p.date || p.createdAt, amount: p.amount || 0, method: p.method || 'Cash', purchaseId: p.purchaseId, notes: p.notes || '' })));
        }
      }
    } catch (e) {
      console.error('[AccountStatementModal] Error refetching payments', e);
    }
  }, [summary?.entityId, mode]);

  const handleOpenEditPayment = useCallback(() => {
    if (!selectedTransaction || selectedTransaction.transaction.sourceType !== 'payment') return;
    const p = allPayments.find((x: any) => x.id === selectedTransaction.transaction.sourceId);
    if (!p) return;
    const dateStr = typeof p.date === 'string' ? p.date.slice(0, 16) : new Date(p.date).toISOString().slice(0, 16);
    setPaymentEditForm({ amountStr: String(p.amount ?? 0), method: p.method || 'Cash', date: dateStr, notes: p.notes || '', invoiceId: p.invoiceId || p.purchaseId || '' });
    setShowEditPaymentModal(true);
  }, [selectedTransaction, allPayments]);

  const handleSaveEditPayment = useCallback(async () => {
    if (!selectedTransaction || selectedTransaction.transaction.sourceType !== 'payment') return;
    setIsSavingPayment(true);
    try {
      if (mode === 'customer') {
        await customersApi.updateCustomerPayment(selectedTransaction.transaction.sourceId, {
          amount: parseFloat(paymentEditForm.amountStr) || 0,
          method: paymentEditForm.method,
          date: paymentEditForm.date ? new Date(paymentEditForm.date).toISOString() : undefined,
          notes: paymentEditForm.notes || null,
          invoiceId: paymentEditForm.invoiceId?.trim() || null,
        });
      } else {
        await suppliersApi.updateSupplierPayment(selectedTransaction.transaction.sourceId, {
          amount: parseFloat(paymentEditForm.amountStr) || 0,
          method: paymentEditForm.method,
          date: paymentEditForm.date ? new Date(paymentEditForm.date).toISOString() : undefined,
          notes: paymentEditForm.notes || null,
          purchaseId: paymentEditForm.invoiceId?.trim() || undefined,
        });
      }
      await refetchPayments();
      await onStatementUpdated();
      setSelectedTransaction(null);
      setShowEditPaymentModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'فشل تحديث الحركة');
    } finally {
      setIsSavingPayment(false);
    }
  }, [selectedTransaction, paymentEditForm, mode, refetchPayments, onStatementUpdated]);

  const handleDeletePayment = useCallback(async () => {
    if (!selectedTransaction || selectedTransaction.transaction.sourceType !== 'payment') return;
    const ok = await confirmDialog({ message: labels.confirmDeletePaymentMessage, confirmLabel: AR_LABELS.delete, cancelLabel: AR_LABELS.cancel });
    if (!ok) return;
    try {
      if (mode === 'customer') {
        await customersApi.deleteCustomerPayment(selectedTransaction.transaction.sourceId);
      } else {
        await suppliersApi.deleteSupplierPayment(selectedTransaction.transaction.sourceId);
      }
      await refetchPayments();
      await onStatementUpdated();
      setSelectedTransaction(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'فشل حذف الحركة');
    }
  }, [selectedTransaction, mode, refetchPayments, onStatementUpdated, confirmDialog, labels.confirmDeletePaymentMessage]);

  if (!summary) return null;

  /** For supplier: make purchase invoice number clickable and open purchase invoice detail (same behavior as sales invoice in customer statement). */
  const renderDescriptionWithInvoiceLink = (t: StatementTransaction) => {
    if (mode === 'supplier' && t.sourceType === 'purchase' && t.sourceId) {
      const purchaseUrl = `/purchases/invoices/${t.sourceId}`;
      const invoicePattern = t.invoiceNumber ? `#${t.invoiceNumber}` : '';
      const label = invoicePattern || t.description;
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(purchaseUrl, '_blank', 'noopener,noreferrer');
      };
      if (invoicePattern && t.description.includes(invoicePattern)) {
        const idx = t.description.indexOf(invoicePattern);
        const before = t.description.slice(0, idx);
        const after = t.description.slice(idx + invoicePattern.length);
        return (
          <span>
            {before}
            <a
              href={purchaseUrl}
              onClick={handleClick}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer font-medium print:text-black print:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {invoicePattern}
            </a>
            {after}
          </span>
        );
      }
      return (
        <a
          href={purchaseUrl}
          onClick={handleClick}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.description}
        </a>
      );
    }
    if (mode === 'customer' && t.invoiceNumber) {
      const storeId = user?.storeId;
      const invoiceUrl = storeId ? `/invoice/${storeId}/${t.invoiceNumber}` : `/invoice/${t.invoiceNumber}`;
      const invoicePattern = `#${t.invoiceNumber}`;
      const idx = t.description.indexOf(invoicePattern);
      if (idx === -1) return <span>{t.description}</span>;
      const before = t.description.slice(0, idx);
      const after = t.description.slice(idx + invoicePattern.length);
      const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      };
      return (
        <span>
          {before}
          <a href={invoiceUrl} onClick={handleClick} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium" target="_blank" rel="noopener noreferrer">
            {invoicePattern}
          </a>
          {after}
        </span>
      );
    }
    return <span>{t.description}</span>;
  };

  const settings = loadSettings(null);
  const businessNameToDisplay = businessName || settings?.businessName || '';
  const addressToDisplay = storeAddress || settings?.storeAddress || '';

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} />
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl text-right flex flex-col overflow-hidden" onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', maxHeight: '90vh', maxWidth: '90vw', zIndex: 9999 }}>
        <div id="printable-statement-acc" className="p-6 overflow-y-auto flex-1 customer-statement-print">
          {/* Header: business name and address - visible on screen and in print */}
          {(businessNameToDisplay || addressToDisplay) && (
            <div className="text-center mb-4 pb-4 border-b border-gray-300 dark:border-gray-700">
              {businessNameToDisplay && <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{businessNameToDisplay}</h1>}
              {addressToDisplay && <p className="text-sm text-gray-600 dark:text-gray-400">{addressToDisplay}</p>}
            </div>
          )}
          {/* Statement title and entity info - clear block for print */}
          <div className="pb-4 border-b border-gray-300 dark:border-gray-700 mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{labels.statementTitle}</h2>
            <p className="text-base text-gray-800 dark:text-gray-200 font-medium">{summary.entityName}</p>
            {summary.address && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{AR_LABELS.address}: {summary.address}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{AR_LABELS.date}: {formatDate(new Date().toISOString())}</p>
          </div>
          {/* Summary totals - visible on screen (right side) and in print via statement-summary */}
          <div className="text-left text-sm print-hidden mb-4">
            <p><strong>{labels.totalDebt}:</strong> {formatCurrency(summary.totalDebt)}</p>
            <p><strong>{labels.totalPayments}:</strong> {formatCurrency(summary.totalPaid)}</p>
            <p className="font-bold text-lg">{labels.balance}: <span className={summary.balance > 0 ? 'text-red-600' : summary.balance < 0 ? 'text-blue-600' : 'text-gray-600'}>
              {formatCurrency(Math.abs(summary.balance))}{summary.balance > 0 && ' (مدين)'}{summary.balance < 0 && ' (دائن)'}
            </span></p>
          </div>
          {/* Statement summary - print only: professional bordered layout */}
          <div className="statement-summary mb-4 hidden print:block">
            <div><span>{labels.totalDebt}:</span><span>{formatCurrency(summary.totalDebt)}</span></div>
            <div><span>{labels.totalPayments}:</span><span>{formatCurrency(summary.totalPaid)}</span></div>
            <div className="grand-total">
              <span>{labels.balance}:</span>
              <span>{formatCurrency(Math.abs(summary.balance))}{summary.balance > 0 && ' (مدين)'}{summary.balance < 0 && ' (دائن)'}</span>
            </div>
          </div>
          {/* Transactions table - wrapped for print styles */}
          <div className="mt-4 max-h-[50vh] overflow-y-auto statement-table-container">
            {!isLoading && transactions.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-2 print-hidden sticky top-0 z-10 py-2 bg-white dark:bg-gray-800">
                <span className="text-xs text-gray-500">{labels.selectTransactionToEditOrDelete}</span>
                <button type="button" onClick={handleOpenEditPayment} disabled={!selectedTransaction || selectedTransaction.transaction.sourceType !== 'payment'} className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-500 text-white rounded-md disabled:opacity-50">
                  <EditIcon className="w-4 h-4 ml-1" />{labels.editTransaction}
                </button>
                <button type="button" onClick={handleDeletePayment} disabled={!selectedTransaction || selectedTransaction.transaction.sourceType !== 'payment'} className="inline-flex items-center px-3 py-1.5 text-sm bg-red-500 text-white rounded-md disabled:opacity-50">
                  <DeleteIcon className="w-4 h-4 ml-1" />{labels.deleteTransaction}
                </button>
                {selectedTransaction && selectedTransaction.transaction.sourceType !== 'payment' && (
                  <span className="text-xs text-amber-600">{labels.onlyPaymentTransactionsEditable}</span>
                )}
              </div>
            )}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">جاري تحميل المعاملات...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">لا توجد معاملات</div>
            ) : (
              <table className="min-w-full text-right statement-transactions-table border-collapse">
                <thead className="bg-gray-100 dark:bg-gray-700/50">
                  <tr>
                    <th className="p-2 text-xs font-semibold uppercase text-right statement-col-date text-gray-900 dark:text-gray-100">{AR_LABELS.date}</th>
                    <th className="p-2 text-xs font-semibold uppercase text-right statement-col-description">{AR_LABELS.description || 'الوصف'}</th>
                    <th className="p-2 text-xs font-semibold uppercase text-right statement-col-amount">{AR_LABELS.debit}</th>
                    <th className="p-2 text-xs font-semibold uppercase text-right statement-col-amount">{AR_LABELS.creditTerm}</th>
                    <th className="p-2 text-xs font-semibold uppercase text-right statement-col-balance">{labels.balance}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((t, i) => {
                    const isSelected = selectedTransaction?.index === i;
                    const debitDisplay = t.debit > 0 ? formatStatementNumber(t.debit, v => formatCurrency(v, { minimumFractionDigits: 0, maximumFractionDigits: 2, showSymbol: false })) : '-';
                    const creditDisplay = t.credit > 0 ? formatStatementNumber(t.credit, v => formatCurrency(v, { minimumFractionDigits: 0, maximumFractionDigits: 2, showSymbol: false })) : '-';
                    return (
                      <tr key={i} onClick={() => setSelectedTransaction({ index: i, transaction: t })} className={`cursor-pointer ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                        <td className="p-2 text-sm font-medium statement-col-date">{formatDate(t.date)}</td>
                        <td className="p-2 text-sm statement-col-description">{renderDescriptionWithInvoiceLink(t)}</td>
                        <td className="p-2 text-sm font-mono statement-col-amount print-text-black">{debitDisplay}</td>
                        <td className="p-2 text-sm font-mono statement-col-amount print-text-black">{creditDisplay}</td>
                        <td className="p-2 text-sm font-mono font-semibold statement-col-balance">{formatCurrency(Math.abs(t.balance))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {showEditPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]" onClick={() => !isSavingPayment && setShowEditPaymentModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6 text-right" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">{labels.editTransaction}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{AR_LABELS.amount}</label>
                  <input type="number" step="any" min={0} value={paymentEditForm.amountStr} onChange={e => setPaymentEditForm(prev => ({ ...prev, amountStr: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{AR_LABELS.date}</label>
                  <input type="datetime-local" value={paymentEditForm.date} onChange={e => setPaymentEditForm(prev => ({ ...prev, date: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{AR_LABELS.paymentMethod}</label>
                  <select value={paymentEditForm.method} onChange={e => setPaymentEditForm(prev => ({ ...prev, method: e.target.value as any }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700">
                    <option value="Cash">{AR_LABELS.cash}</option>
                    <option value="Bank Transfer">تحويل بنكي</option>
                    <option value="Cheque">شيك</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{AR_LABELS.reference}</label>
                  <input type="text" value={paymentEditForm.invoiceId} onChange={e => setPaymentEditForm(prev => ({ ...prev, invoiceId: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ملاحظات</label>
                  <input type="text" value={paymentEditForm.notes} onChange={e => setPaymentEditForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700" />
                </div>
              </div>
              <div className="flex justify-start gap-2 mt-6">
                <button onClick={handleSaveEditPayment} disabled={isSavingPayment} className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50">{isSavingPayment ? '...' : AR_LABELS.save}</button>
                <button onClick={() => setShowEditPaymentModal(false)} disabled={isSavingPayment} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{AR_LABELS.cancel}</button>
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex-shrink-0 print-hidden">
          <button onClick={() => printReceipt('printable-statement-acc')} className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md"><PrintIcon /><span className="mr-2">{labels.printReceipt}</span></button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{AR_LABELS.cancel}</button>
        </div>
      </div>
    </>
  );
  return createPortal(modalContent, document.body);
};

// ----- Main Accounts Module -----
export interface AccountsModuleProps {
  mode: AccountMode;
  entities: AccountEntity[];
  setEntities: React.Dispatch<React.SetStateAction<AccountEntity[]>>;
  payments: { entityId: string; date: string; amount: number; method: string }[];
  setPayments?: React.Dispatch<React.SetStateAction<any[]>>;
  onRefreshPayments?: () => Promise<void>;
  onSaveNewEntity: (entity: AccountEntity & Record<string, any>) => Promise<void>;
  onUpdateEntity: (entity: AccountEntity & Record<string, any>) => Promise<void>;
  onDeleteEntity: (id: string) => Promise<void>;
  onOpenAddEntity: () => void;
  onOpenEditEntity: (entity: AccountEntity) => void;
  labels: AccountsLabels;
  isLoadingEntities?: boolean;
  entitiesError?: string | null;
  onRefreshEntities?: () => void;
  /** Bump to force refetch summaries (e.g. after update entity) */
  refreshTrigger?: number;
}

export const AccountsModule: React.FC<AccountsModuleProps> = ({
  mode,
  entities,
  setEntities,
  payments,
  setPayments,
  onRefreshPayments,
  onSaveNewEntity,
  onUpdateEntity,
  onDeleteEntity,
  onOpenAddEntity,
  onOpenEditEntity,
  labels,
  isLoadingEntities = false,
  entitiesError = null,
  onRefreshEntities,
  refreshTrigger = 0,
}) => {
  const { formatCurrency } = useCurrency();
  const confirmDialog = useConfirmDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState({ debtor: true, creditor: true });
  const [paymentModalTarget, setPaymentModalTarget] = useState<AccountSummary | null>(null);
  const [statementModalTarget, setStatementModalTarget] = useState<AccountSummary | null>(null);
  const [sortField, setSortField] = useState<'name' | 'phone' | 'balance' | 'totalDebt' | 'totalPayments'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const { viewMode, setViewMode } = useResponsiveViewMode(mode === 'customer' ? 'customerAccounts' : 'suppliers', 'table', 'grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');
  const [apiSummaries, setApiSummaries] = useState<AccountSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);
  const [summariesError, setSummariesError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const today = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [dateRange, setDateRange] = useState({ start: today, end: today });

  const fetchSummaries = useCallback(async () => {
    setIsLoadingSummaries(true);
    setSummariesError(null);
    try {
      if (mode === 'customer') {
        const res = await customersApi.getCustomerAccountsSummary({ _t: Date.now() });
        const data = (res.data as any)?.data;
        const list = Array.isArray(data?.summaries) ? data.summaries : [];
        const mapped = list.map((s: any) => ({
          entityId: s.customerId,
          entityName: s.customerName || '',
          address: s.address,
          totalDebt: s.totalSales ?? 0,
          totalPaid: s.totalPaid ?? 0,
          balance: s.balance ?? 0,
          lastPaymentDate: s.lastPaymentDate ? formatDate(s.lastPaymentDate) : null,
        }));
        setApiSummaries(mapped);
        setStatementModalTarget(prev => {
          if (!prev) return null;
          const u = mapped.find((s: AccountSummary) => s.entityId === prev.entityId);
          return u ?? prev;
        });
      } else {
        const res = await suppliersApi.getSupplierAccountsSummary();
        const data = (res.data as any)?.data;
        const list = Array.isArray(data?.summaries) ? data.summaries : [];
        const mapped = list.map((s: any) => ({
          entityId: s.supplierId,
          entityName: s.supplierName || '',
          address: s.address,
          totalDebt: s.totalPurchases ?? 0,
          totalPaid: s.totalPaid ?? 0,
          balance: s.balance ?? 0,
          lastPaymentDate: s.lastPaymentDate ? formatDate(s.lastPaymentDate) : null,
        }));
        setApiSummaries(mapped);
        setStatementModalTarget(prev => {
          if (!prev) return null;
          const u = mapped.find((s: AccountSummary) => s.entityId === prev.entityId);
          return u ?? prev;
        });
      }
      if (mode === 'customer') {
      }
    } catch (e: any) {
      setSummariesError(e?.message || 'فشل تحميل الملخصات');
      setApiSummaries([]);
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries, entities.length, refreshTrigger]);

  const handleDatePresetChange = useCallback((preset: 'today' | 'week' | 'month' | 'custom') => {
    const t = new Date();
    let start: string, end: string;
    if (preset === 'today') {
      start = end = t.toISOString().split('T')[0];
    } else if (preset === 'week') {
      const weekStart = new Date(t);
      weekStart.setDate(t.getDate() - t.getDay());
      start = weekStart.toISOString().split('T')[0];
      end = t.toISOString().split('T')[0];
    } else if (preset === 'month') {
      start = new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().split('T')[0];
    } else {
      start = dateRange.start;
      end = dateRange.end;
    }
    setDatePreset(preset);
    setDateRange({ start, end });
  }, [dateRange]);

  const filteredPayments = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return payments;
    return payments.filter(p => {
      const d = p.date ? new Date(p.date).toISOString().split('T')[0] : '';
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [payments, dateRange]);

  const entitySummaries = useMemo<AccountSummary[]>(() => {
    if (apiSummaries.length > 0) {
      return entities.map(e => {
        const s = apiSummaries.find(x => x.entityId === e.id);
        return s ?? { entityId: e.id, entityName: e.name, address: e.address, totalDebt: 0, totalPaid: 0, balance: 0, lastPaymentDate: null };
      });
    }
    return entities.map(e => ({ entityId: e.id, entityName: e.name, address: e.address, totalDebt: 0, totalPaid: 0, balance: 0, lastPaymentDate: null }));
  }, [entities, apiSummaries]);

  const filteredAndSorted = useMemo(() => {
    let list = entities.filter(e => {
      const matchSearch = !searchTerm || e.name.toLowerCase().includes(searchTerm.toLowerCase()) || (e.phone || '').includes(searchTerm) || (e.address || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      const summary = entitySummaries.find(s => s.entityId === e.id);
      const balance = summary?.balance ?? 0;
      const isDebtor = balance > 0;
      const isCreditor = balance < 0;
      if (!balanceFilter.debtor && !balanceFilter.creditor) return false;
      if (balanceFilter.debtor && balanceFilter.creditor) return true;
      if (balanceFilter.debtor && !balanceFilter.creditor) return isDebtor;
      return isCreditor;
    });
    list.sort((a, b) => {
      let av: string | number, bv: string | number;
      const as = entitySummaries.find(s => s.entityId === a.id);
      const bs = entitySummaries.find(s => s.entityId === b.id);
      switch (sortField) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'phone': av = a.phone || ''; bv = b.phone || ''; break;
        case 'balance': av = as?.balance ?? 0; bv = bs?.balance ?? 0; break;
        case 'totalDebt': av = as?.totalDebt ?? 0; bv = bs?.totalDebt ?? 0; break;
        case 'totalPayments': av = as?.totalPaid ?? 0; bv = bs?.totalPaid ?? 0; break;
        default: av = a.name.toLowerCase(); bv = b.name.toLowerCase();
      }
      if (typeof av === 'string') return sortDirection === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDirection === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [entities, entitySummaries, searchTerm, balanceFilter, sortField, sortDirection]);

  const paginatedEntities = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, balanceFilter, sortField, sortDirection]);

  const statistics = useMemo(() => {
    const totalDueAmount = entitySummaries.reduce((s, x) => s + (x.balance > 0 ? x.balance : 0), 0);
    const customersWithDebt = filteredAndSorted.filter(e => (entitySummaries.find(s => s.entityId === e.id)?.balance ?? 0) > 0).length;
    const receiptVouchers = filteredPayments.filter(p => p && typeof p.amount === 'number' && p.amount > 0);
    return {
      totalCount: entities.length,
      totalDueAmount,
      customersWithDebt,
      receiptVoucherCount: receiptVouchers.length,
      receiptVoucherTotal: receiptVouchers.reduce((s, p) => s + (p.amount || 0), 0),
    };
  }, [entities.length, entitySummaries, filteredAndSorted, filteredPayments]);

  const handleSort = (field: 'name' | 'phone' | 'balance' | 'totalDebt' | 'totalPayments') => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => (sortField !== field ? null : sortDirection === 'asc' ? '↑' : '↓');

  const handleSavePayment = async (payload: AccountPaymentPayload) => {
    try {
      if (mode === 'customer') {
        const res = await customersApi.createCustomerPayment({
          customerId: payload.entityId,
          amount: payload.amount,
          method: payload.method,
          date: payload.date,
          invoiceId: payload.invoiceId,
          notes: payload.notes,
        });
        const data = (res.data as any)?.data?.payment;
        if (data && setPayments) setPayments(prev => [{ id: data.id, entityId: data.customerId, date: data.date, amount: data.amount, method: data.method, ...(data.invoiceId && { invoiceId: data.invoiceId }), ...(data.notes && { notes: data.notes }) }, ...(prev || [])]);
      } else {
        const res = await suppliersApi.addSupplierPayment({
          supplierId: payload.entityId,
          amount: payload.amount,
          method: payload.method,
          date: payload.date,
          notes: payload.notes,
          purchaseId: payload.purchaseId,
        });
        const data = (res.data as any)?.data?.payment;
        if (data && setPayments) setPayments(prev => [{ id: data.id, entityId: data.supplierId, date: data.date, amount: data.amount, method: data.method, ...(data.notes && { notes: data.notes }) }, ...(prev || [])]);
      }
      setPaymentModalTarget(null);
      if (onRefreshPayments) await onRefreshPayments();
      await fetchSummaries();
    } catch (err: any) {
      alert(getApiErrorMessage(err, 'فشل حفظ الدفعة'));
    }
  };

  const showToast = (msg: string, type: 'info' | 'error' | 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteEntity = async (id: string) => {
    const ok = await confirmDialog({ message: labels.confirmDeleteMessage, confirmLabel: AR_LABELS.delete, cancelLabel: AR_LABELS.cancel });
    if (!ok) return;
    try {
      await onDeleteEntity(id);
      setEntities(prev => prev.filter(e => e.id !== id));
      showToast(labels.deleteSuccess, 'success');
      await fetchSummaries();
      if (onRefreshPayments) await onRefreshPayments();
    } catch (e: any) {
      showToast(getApiErrorMessage(e, labels.deleteFailed), 'error');
    }
  };

  const getFilterLabelSuffix = () => {
    if (datePreset === 'today') return '(اليوم)';
    if (datePreset === 'week') return '(هذا الأسبوع)';
    if (datePreset === 'month') return '(هذا الشهر)';
    if (datePreset === 'custom' && dateRange.start && dateRange.end) {
      const s = new Date(dateRange.start).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
      const e = new Date(dateRange.end).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
      return dateRange.start === dateRange.end ? `(${s})` : `(${s} - ${e})`;
    }
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <MetricCard id={1} title={labels.totalCount} value={statistics.totalCount.toString()} icon={<div className="w-6 h-6 bg-blue-500 rounded" />} bgColor="bg-blue-100" valueColor="text-blue-600" />
        <MetricCard id={2} title={labels.totalDueAmount} value={formatCurrency(statistics.totalDueAmount)} icon={<div className="w-6 h-6 bg-red-500 rounded" />} bgColor="bg-red-100" valueColor="text-red-600" />
        <MetricCard id={3} title={`${labels.countWithDebt} ${balanceFilter.debtor && !balanceFilter.creditor ? '(مفلتر)' : ''}`} value={statistics.customersWithDebt.toString()} icon={<div className="w-6 h-6 bg-orange-500 rounded" />} bgColor="bg-orange-100" valueColor="text-orange-600" />
        <MetricCard id={5} title={`${labels.receiptVoucherCount} ${getFilterLabelSuffix()}`} value={statistics.receiptVoucherCount.toString()} icon={<div className="w-6 h-6 bg-emerald-500 rounded" />} bgColor="bg-emerald-100" valueColor="text-emerald-600" />
        <MetricCard id={6} title={`${labels.receiptVoucherTotal} ${getFilterLabelSuffix()}`} value={formatCurrency(statistics.receiptVoucherTotal)} icon={<div className="w-6 h-6 bg-teal-500 rounded" />} bgColor="bg-teal-100" valueColor="text-teal-600" />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-2 flex-wrap">
            {['today', 'week', 'month', 'custom'].map(preset => (
              <button key={preset} onClick={() => handleDatePresetChange(preset as any)} className={`px-4 py-2 rounded-md text-sm font-medium ${datePreset === preset ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                {preset === 'today' ? 'اليوم' : preset === 'week' ? 'هذا الأسبوع' : preset === 'month' ? 'هذا الشهر' : 'نطاق مخصص'}
              </button>
            ))}
          </div>
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <div><label className="block text-xs font-medium mb-1">من</label><input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm" /></div>
              <div><label className="block text-xs font-medium mb-1">إلى</label><input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-sm" /></div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative flex-1 w-full md:w-auto">
          <div className="absolute left-3 top-1/2 -translate-y-1/2"><SearchIcon className="h-5 w-5 text-gray-400" /></div>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={labels.searchPlaceholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 text-right" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => setViewMode('table')} className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}><TableViewIcon /></button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}><GridViewIcon /></button>
          </div>
          <button onClick={onOpenAddEntity} className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500">
            <PlusIcon className="h-5 w-5 ml-2" /><span>{labels.addNewEntity}</span>
          </button>
          <BalanceFilterDropdown value={balanceFilter} onChange={setBalanceFilter} className="w-full sm:w-auto" labels={labels} />
          <CustomDropdown id="page-size-acc" value={pageSize.toString()} onChange={v => { setPageSize(parseInt(v)); setCurrentPage(1); }} options={[{ value: '10', label: '10 لكل صفحة' }, { value: '20', label: '20 لكل صفحة' }, { value: '50', label: '50 لكل صفحة' }, { value: '100', label: '100 لكل صفحة' }]} placeholder="حجم الصفحة" className="w-full sm:w-auto" />
        </div>
      </div>

      {(isLoadingEntities || isLoadingSummaries) ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-sm text-gray-600 dark:text-gray-400">جاري التحميل...</p>
        </div>
      ) : (entitiesError || summariesError) ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{summariesError || entitiesError}</p>
          <div className="mt-3 flex gap-2">
            {summariesError && <button onClick={fetchSummaries} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">إعادة تحميل الملخصات</button>}
            {entitiesError && onRefreshEntities && <button onClick={onRefreshEntities} className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm">إعادة المحاولة</button>}
          </div>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{entities.length === 0 ? labels.noEntities : labels.noResults}</h3>
          <p className="text-sm text-gray-600 mb-6">{entities.length === 0 ? labels.noEntitiesHint : labels.noResultsHint}</p>
          {entities.length === 0 && (
            <button onClick={onOpenAddEntity} className="inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500">
              <PlusIcon className="h-5 w-5 ml-2" /><span>{labels.addNewEntity}</span>
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => handleSort('name')}><div className="flex items-center justify-end gap-2">{labels.entityName} <SortIcon field="name" /></div></th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer" onClick={() => handleSort('phone')}><div className="flex items-center justify-end gap-2">{AR_LABELS.phone} <SortIcon field="phone" /></div></th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{AR_LABELS.address}</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('balance')}><div className="flex items-center justify-end gap-2">{labels.balance} <SortIcon field="balance" /></div></th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('totalDebt')}><div className="flex items-center justify-end gap-2">{labels.totalDebt} <SortIcon field="totalDebt" /></div></th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('totalPayments')}><div className="flex items-center justify-end gap-2">{labels.totalPayments} <SortIcon field="totalPayments" /></div></th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{labels.lastPayment}</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">{labels.actions}</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedEntities.map(entity => {
                const summary = entitySummaries.find(s => s.entityId === entity.id);
                return (
                  <tr key={entity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{entity.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{entity.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" title={entity.address || ''}>{entity.address || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                      {summary ? (summary.balance > 0 ? <span className="text-red-600 dark:text-red-400">{formatCurrency(Math.abs(summary.balance))} (مدين)</span> : summary.balance < 0 ? <span className="text-blue-600 dark:text-blue-400">{formatCurrency(Math.abs(summary.balance))} (دائن)</span> : <span className="text-gray-600">{formatCurrency(0)}</span>) : <span className="text-gray-400">{formatCurrency(0)}</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{summary ? formatCurrency(summary.totalDebt) : formatCurrency(0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="inline-flex gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200"><span className="text-green-700 dark:text-green-400 font-bold text-sm">{summary ? formatCurrency(summary.totalPaid) : formatCurrency(0)}</span></div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{summary?.lastPaymentDate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {summary && (
                          <>
                            <button
                              onClick={() => setPaymentModalTarget(summary)}
                              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-sm hover:shadow transition-all"
                              title={labels.addPayment}
                            >
                              <AddPaymentIcon className="w-4 h-4 ml-1" />
                              <span className="hidden sm:inline">{labels.addPayment}</span>
                            </button>
                            <button
                              onClick={() => setStatementModalTarget(summary)}
                              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-[13px] font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm hover:shadow transition-all"
                              title={labels.statementTitle}
                            >
                              <ViewIcon className="w-4 h-4 ml-1" />
                              <span className="hidden sm:inline">{labels.statementTitle}</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => onOpenEditEntity(entity)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700/60 rounded-lg"
                          title={AR_LABELS.edit}
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDeleteEntity(entity.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg"
                          title={AR_LABELS.delete}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedEntities.map(entity => {
            const summary = entitySummaries.find(s => s.entityId === entity.id);
            const isDebtor = summary && summary.balance > 0;
            const isCreditor = summary && summary.balance < 0;
            const isZero = !summary || summary.balance === 0;
            return (
              <div
                key={entity.id}
                className="bg-white dark:bg-gray-800/95 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 pb-4 border-b border-slate-100 dark:border-slate-700/80">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight mb-1.5">
                    {entity.name}
                  </h3>
                  {entity.phone && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {entity.phone}
                    </p>
                  )}
                  <p
                    className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1"
                    title={entity.address || '-'}
                  >
                    {entity.address || '-'}
                  </p>
                </div>

                {/* Totals */}
                <div className="px-5 py-4 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.totalDebt}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold tabular-nums">
                      {summary ? formatCurrency(summary.totalDebt) : formatCurrency(0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{labels.totalPayments}</span>
                    <span className="text-slate-900 dark:text-slate-100 font-semibold tabular-nums">
                      {summary ? formatCurrency(summary.totalPaid) : formatCurrency(0)}
                    </span>
                  </div>

                  {/* Balance — polished debit/credit box */}
                  <div
                    className={`
                      rounded-xl border px-4 py-3.5 flex flex-col gap-1
                      ${isDebtor ? 'bg-red-50/90 dark:bg-red-950/30 border-red-200/80 dark:border-red-800/60' : ''}
                      ${isCreditor ? 'bg-blue-50/90 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-800/60' : ''}
                      ${isZero ? 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-600/50' : ''}
                    `}
                  >
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {labels.balance}
                    </span>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`
                          text-lg font-bold tabular-nums
                          ${isDebtor ? 'text-red-700 dark:text-red-300' : ''}
                          ${isCreditor ? 'text-blue-700 dark:text-blue-300' : ''}
                          ${isZero ? 'text-slate-700 dark:text-slate-300' : ''}
                        `}
                      >
                        {summary ? formatCurrency(Math.abs(summary.balance)) : formatCurrency(0)}
                      </span>
                      {!isZero && (
                        <span
                          className={`
                            text-xs font-semibold px-2.5 py-1 rounded-md
                            ${isDebtor ? 'bg-red-200/60 dark:bg-red-800/50 text-red-800 dark:text-red-200' : ''}
                            ${isCreditor ? 'bg-blue-200/60 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200' : ''}
                          `}
                        >
                          {isDebtor ? 'مدين' : 'دائن'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-5 pt-0 space-y-3">
                  {summary && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setPaymentModalTarget(summary)}
                        variant="success"
                        size="md"
                        className="flex-1"
                      >
                        <AddPaymentIcon className="w-4 h-4" />
                        {labels.addPayment}
                      </Button>
                      <Button
                        onClick={() => setStatementModalTarget(summary)}
                        variant="primary"
                        size="md"
                        className="flex-1"
                      >
                        <ViewIcon className="w-4 h-4" />
                        {labels.statementTitle}
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onOpenEditEntity(entity)}
                      variant="secondary"
                      size="md"
                      className="flex-1"
                    >
                      <EditIcon className="w-4 h-4" />
                      {AR_LABELS.edit}
                    </Button>
                    <Button
                      onClick={() => handleDeleteEntity(entity.id)}
                      variant="danger"
                      size="md"
                      className="flex-1"
                    >
                      <DeleteIcon className="w-4 h-4" />
                      {AR_LABELS.delete}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredAndSorted.length)} من {filteredAndSorted.length}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className={`px-4 py-2 rounded-md text-sm font-medium ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>السابق</button>
            <span className="px-4 py-2 text-sm">صفحة {currentPage} من {totalPages}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} className={`px-4 py-2 rounded-md text-sm font-medium ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}>التالي</button>
          </div>
        </div>
      )}

      <AddPaymentModal summary={paymentModalTarget} onClose={() => setPaymentModalTarget(null)} onSave={handleSavePayment} entityLabel={labels.entityName} />
      <AccountStatementModal summary={statementModalTarget} mode={mode} labels={labels} onClose={() => setStatementModalTarget(null)} onStatementUpdated={async () => { await fetchSummaries(); if (onRefreshPayments) await onRefreshPayments(); }} />

      {toastMessage && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg ${toastType === 'error' ? 'bg-red-50 border-red-200 text-red-800' : toastType === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
          <span className="font-medium text-sm">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="mr-2">×</button>
        </div>
      )}
    </div>
  );
};

export default AccountsModule;
