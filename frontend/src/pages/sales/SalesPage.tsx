import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SaleTransaction, Customer, CustomerPayment, CustomerAccountSummary, SalePaymentMethod, SaleStatus } from '@/shared/types';
import { AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon, PrintIcon, ViewIcon, ExportIcon, AddPaymentIcon } from '@/shared/constants';
import { GridViewIcon, TableViewIcon } from '@/shared/constants/routes';
import { MetricCard } from '@/shared/components/ui/MetricCard';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';
import { formatDate } from '@/shared/utils';
import { customersApi, salesApi, ApiError } from '@/lib/api/client';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { useAuthStore } from '@/app/store';

// Filter icon component
const FilterIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

interface SalesPageProps {
  setActivePath?: (path: string) => void; // Make optional for backward compatibility
}

// --- NO MOCK DATA ---
// All data will be loaded from the database and localStorage

// --- MODAL COMPONENTS ---
const SaleDetailsModal: React.FC<{ sale: SaleTransaction | null, onClose: () => void }> = ({ sale, onClose }) => {
    const { formatCurrency } = useCurrency();
    if (!sale) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl text-right" onClick={e => e.stopPropagation()}>
                <div id="printable-receipt" className="p-6">
                    <div className="flex justify-between items-start pb-4 border-b dark:border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.invoiceDetails}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{sale.invoiceNumber || sale.id}</p>
                        </div>
                        <div className="text-left">
                             <h3 className="font-bold text-lg">PoshPointHub</h3>
                             <p className="text-xs text-gray-600 dark:text-gray-400">123 الشارع التجاري, الرياض, السعودية</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 my-4 text-sm">
                        <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{AR_LABELS.customerName}:</p>
                            <p className="text-gray-900 dark:text-gray-100">{sale.customerName}</p>
                        </div>
                        <div className="text-left">
                             <p className="font-semibold text-gray-700 dark:text-gray-300">{AR_LABELS.date}:</p>
                             <p className="text-gray-900 dark:text-gray-100">{new Date(sale.date).toLocaleString('ar-SA')}</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-700 dark:text-gray-300">{AR_LABELS.seller}:</p>
                            <p className="text-gray-900 dark:text-gray-100">{sale.seller}</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto border-t border-b dark:border-gray-700">
                        <table className="min-w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="p-2 text-xs font-medium uppercase">#</th>
                                    <th className="p-2 text-xs font-medium uppercase">{AR_LABELS.productName}</th>
                                    <th className="p-2 text-xs font-medium uppercase">{AR_LABELS.quantity}</th>
                                    <th className="p-2 text-xs font-medium uppercase">{AR_LABELS.price}</th>
                                    <th className="p-2 text-xs font-medium uppercase text-left">{AR_LABELS.totalAmount}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items.map((item, index) => {
                                    const isReturn = sale.status === 'Returned' || sale.id.startsWith('RET-');
                                    const displayUnitPrice = isReturn ? Math.abs(item.unitPrice) : item.unitPrice;
                                    const displayTotal = isReturn ? Math.abs(item.total) : item.total;
                                    return (
                                        <tr key={item.productId} className="border-b dark:border-gray-700">
                                            <td className="p-2 text-sm">{index + 1}</td>
                                            <td className="p-2 text-sm font-medium">{item.name}</td>
                                            <td className="p-2 text-sm">{item.quantity}</td>
                                            <td className={`p-2 text-sm ${isReturn ? 'text-red-600' : ''}`}>{isReturn ? '-' : ''}{formatCurrency(displayUnitPrice)}</td>
                                            <td className={`p-2 text-sm font-semibold text-left ${isReturn ? 'text-red-600' : ''}`}>{isReturn ? '-' : ''}{formatCurrency(displayTotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                        <div className="w-1/2 text-sm space-y-1">
                            {(() => {
                                const isReturn = sale.status === 'Returned' || sale.id.startsWith('RET-');
                                const displaySubtotal = isReturn ? Math.abs(sale.subtotal) : sale.subtotal;
                                const displayDiscount = isReturn ? Math.abs(sale.totalItemDiscount + sale.invoiceDiscount) : (sale.totalItemDiscount + sale.invoiceDiscount);
                                const displayTax = isReturn ? Math.abs(sale.tax) : sale.tax;
                                const displayTotal = isReturn ? Math.abs(sale.totalAmount) : sale.totalAmount;
                                const displayPaid = isReturn ? Math.abs(sale.paidAmount) : sale.paidAmount;
                                const displayRemaining = isReturn ? Math.abs(sale.remainingAmount) : sale.remainingAmount;
                                return (
                                    <>
                                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span><span className={isReturn ? 'text-red-600' : ''}>{isReturn ? '-' : ''}{formatCurrency(displaySubtotal)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.discount}:</span><span className={isReturn ? 'text-red-600' : ''}>{isReturn ? '-' : '-'}{formatCurrency(displayDiscount)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.tax}:</span><span className={isReturn ? 'text-red-600' : ''}>{isReturn ? '-' : '+'}{formatCurrency(displayTax)}</span></div>
                                        <div className="flex justify-between font-bold text-lg border-t dark:border-gray-600 pt-1 mt-1"><span className="text-gray-800 dark:text-gray-100">{isReturn ? AR_LABELS.totalReturnValue || 'إجمالي الإرجاع' : AR_LABELS.grandTotal}:</span><span className={isReturn ? 'text-red-600' : 'text-orange-600'}>{isReturn ? '-' : ''}{formatCurrency(displayTotal)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.amountPaid}:</span><span className={isReturn ? 'text-red-600' : 'text-green-600'}>{isReturn ? '-' : ''}{formatCurrency(displayPaid)}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.remaining}:</span><span className="text-red-600">{isReturn ? '-' : ''}{formatCurrency(displayRemaining)}</span></div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6 print-only-text">شكراً لتسوقكم!</p>

                </div>
                <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg print-hidden">
                    <button onClick={handlePrint} className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md"><PrintIcon/><span className="mr-2">{AR_LABELS.printReceipt}</span></button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                </div>
            </div>
        </div>
    );
};

const AddPaymentModal: React.FC<{
    customerSummary: CustomerAccountSummary | null;
    onClose: () => void;
    onSave: (payment: CustomerPayment) => void;
}> = ({ customerSummary, onClose, onSave }) => {
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (customerSummary) {
            setAmount(customerSummary.balance > 0 ? customerSummary.balance : 0);
            setDate(new Date().toISOString().split('T')[0]);
            setMethod('Cash');
            setNotes('');
        }
    }, [customerSummary]);
    
    if (!customerSummary) return null;

    const handleSave = () => {
        if (amount <= 0) {
            alert('المبلغ يجب أن يكون أكبر من صفر.');
            return;
        }
        onSave({
            id: UUID(),
            customerId: customerSummary.customerId,
            date,
            amount,
            method,
            notes,
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.addPayment} لـ {customerSummary.customerName}</h2>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.paymentAmount}</label>
                        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-left"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.paymentMethod}</label>
                        <CustomDropdown
                            id="payment-method-dropdown"
                            value={method}
                            onChange={(value) => setMethod(value as any)}
                            options={[
                                { value: 'Cash', label: AR_LABELS.cash },
                                { value: 'Bank Transfer', label: AR_LABELS.bankTransfer },
                                { value: 'Cheque', label: AR_LABELS.cheque }
                            ]}
                            placeholder={AR_LABELS.paymentMethod}
                            className="w-full"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.date}</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.notes}</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/>
                    </div>
                </div>
                <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg">
                    <button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                </div>
            </div>
        </div>
    )
};

const CustomerDetailsModal: React.FC<{
    summary: CustomerAccountSummary | null;
    sales: SaleTransaction[];
    payments: CustomerPayment[];
    onClose: () => void;
}> = ({ summary, sales, payments, onClose }) => {
    const { formatCurrency } = useCurrency();
    if (!summary) return null;
    
    const transactions = useMemo(() => {
        const customerSales = sales.filter(s => s.customerId === summary.customerId)
            .map(s => ({
                date: s.date,
                type: 'sale' as const,
                description: `${AR_LABELS.invoice} #${s.invoiceNumber || s.id}`,
                debit: s.totalAmount,
                credit: 0,
            }));

        const customerPayments = payments.filter(p => p.customerId === summary.customerId)
            .map(p => ({
                date: p.date,
                type: 'payment' as const,
                description: `${AR_LABELS.paymentReceived} - ${p.method}`,
                debit: 0,
                credit: p.amount,
            }));
        
        return [...customerSales, ...customerPayments]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .reduce((acc, trans) => {
                const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
                const newBalance = prevBalance + trans.debit - trans.credit;
                acc.push({ ...trans, balance: newBalance } as any);
                return acc;
            }, [] as any[]);

    }, [summary, sales, payments]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl text-right" onClick={e => e.stopPropagation()}>
                <div id="printable-receipt" className="p-6">
                     <div className="flex justify-between items-start pb-4 border-b dark:border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.customerStatement}</h2>
                            <p className="text-lg text-gray-700 dark:text-gray-300">{summary.customerName}</p>
                        </div>
                        <div className="text-left text-sm">
                            <p><strong>{AR_LABELS.totalSales}:</strong> {formatCurrency(summary.totalSales)}</p>
                            <p><strong>{AR_LABELS.totalPayments}:</strong> {formatCurrency(summary.totalPaid)}</p>
                            <p className="font-bold text-lg">{AR_LABELS.balance}: <span className={summary.balance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(summary.balance)}</span></p>
                        </div>
                    </div>
                    <div className="mt-4 max-h-96 overflow-y-auto">
                        <table className="min-w-full">
                             <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                                <tr>
                                    <th className="p-2 text-xs font-medium uppercase text-right">{AR_LABELS.date}</th>
                                    <th className="p-2 text-xs font-medium uppercase text-right">{AR_LABELS.description}</th>
                                    <th className="p-2 text-xs font-medium uppercase text-left">{AR_LABELS.debit}</th>
                                    <th className="p-2 text-xs font-medium uppercase text-left">{AR_LABELS.creditTerm}</th>
                                    <th className="p-2 text-xs font-medium uppercase text-left">{AR_LABELS.balance}</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                 {transactions.map((t, i) => (
                                     <tr key={i}>
                                         <td className="p-2 text-sm">{formatDate(t.date)}</td>
                                         <td className="p-2 text-sm">{t.description}</td>
                                         <td className="p-2 text-sm text-left font-mono">{t.debit > 0 ? formatCurrency(t.debit) : '-'}</td>
                                         <td className="p-2 text-sm text-left font-mono text-green-600">{t.credit > 0 ? formatCurrency(t.credit) : '-'}</td>
                                         <td className="p-2 text-sm text-left font-mono font-semibold">{formatCurrency(t.balance)}</td>
                                     </tr>
                                 ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg print-hidden">
                    <button onClick={() => window.print()} className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md"><PrintIcon/><span className="mr-2">{AR_LABELS.printReceipt}</span></button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                </div>
            </div>
        </div>
    );
};

// --- FILTER MODAL COMPONENT ---
const FilterModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    filters: {
        dateRange: { start: string; end: string };
        datePreset: 'today' | 'week' | 'month' | 'custom';
        paymentMethod: string;
        status: string;
        customerId: string;
        seller: string;
    };
    onFilterChange: (filters: any) => void;
    onClearFilters: () => void;
    customers: Customer[];
    sellers: string[];
}> = ({ isOpen, onClose, filters, onFilterChange, onClearFilters, customers, sellers }) => {
    if (!isOpen) return null;

    const handleClearFilters = () => {
        onClearFilters();
        onClose();
    };

    const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'custom') => {
        const today = new Date();
        let start = '';
        let end = '';

        if (preset === 'today') {
            start = today.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (preset === 'week') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            start = weekStart.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (preset === 'month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            start = monthStart.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        }

        onFilterChange({
            ...filters,
            datePreset: preset,
            dateRange: { start, end },
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl text-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">تصفية المبيعات</h2>
                    
                    {/* Date Preset */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الفترة الزمنية</label>
                        <div className="grid grid-cols-4 gap-2">
                            <button
                                onClick={() => handlePresetChange('today')}
                                className={`px-4 py-2 rounded-md text-sm ${filters.datePreset === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                اليوم
                            </button>
                            <button
                                onClick={() => handlePresetChange('week')}
                                className={`px-4 py-2 rounded-md text-sm ${filters.datePreset === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                هذا الأسبوع
                            </button>
                            <button
                                onClick={() => handlePresetChange('month')}
                                className={`px-4 py-2 rounded-md text-sm ${filters.datePreset === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                هذا الشهر
                            </button>
                            <button
                                onClick={() => handlePresetChange('custom')}
                                className={`px-4 py-2 rounded-md text-sm ${filters.datePreset === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            >
                                مخصص
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Range */}
                    {filters.datePreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => onFilterChange({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => onFilterChange({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"
                                />
                            </div>
                        </div>
                    )}

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">طريقة الدفع</label>
                        <CustomDropdown
                            id="filter-payment-method"
                            value={filters.paymentMethod}
                            onChange={(value) => onFilterChange({ ...filters, paymentMethod: value })}
                            options={[
                                { value: 'all', label: 'الكل' },
                                { value: 'cash', label: AR_LABELS.cash },
                                { value: 'card', label: AR_LABELS.card },
                                { value: 'credit', label: AR_LABELS.credit },
                            ]}
                            placeholder="طريقة الدفع"
                            className="w-full"
                        />
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                        <CustomDropdown
                            id="filter-status"
                            value={filters.status}
                            onChange={(value) => onFilterChange({ ...filters, status: value })}
                            options={[
                                { value: 'all', label: 'الكل' },
                                { value: 'completed', label: AR_LABELS.paid },
                                { value: 'partial_payment', label: AR_LABELS.partial },
                                { value: 'pending', label: AR_LABELS.due },
                            ]}
                            placeholder="الحالة"
                            className="w-full"
                        />
                    </div>

                    {/* Customer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">العميل</label>
                        <CustomDropdown
                            id="filter-customer"
                            value={filters.customerId}
                            onChange={(value) => onFilterChange({ ...filters, customerId: value })}
                            options={[
                                { value: 'all', label: 'الكل' },
                                ...customers.map(c => ({ value: c.id, label: c.name || c.phone })),
                            ]}
                            placeholder="العميل"
                            className="w-full"
                        />
                    </div>

                    {/* Seller */}
                    {sellers.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">البائع</label>
                            <CustomDropdown
                                id="filter-seller"
                                value={filters.seller}
                                onChange={(value) => onFilterChange({ ...filters, seller: value })}
                                options={[
                                    { value: 'all', label: 'الكل' },
                                    ...sellers.map(s => ({ value: s, label: s })),
                                ]}
                                placeholder="البائع"
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg">
                    <button 
                        onClick={handleClearFilters} 
                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors"
                    >
                        مسح جميع الفلاتر
                    </button>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-sm font-medium transition-colors">تطبيق</button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">{AR_LABELS.cancel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---
const SalesPage: React.FC<SalesPageProps> = ({ setActivePath }) => {
    const navigate = useNavigate();
    const { formatCurrency } = useCurrency();
    const { user } = useAuthStore();
    const currentUserName = user?.fullName || user?.username || 'Unknown';
    const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'reports', 'customers'
    const [sales, setSales] = useState<SaleTransaction[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [payments, setPayments] = useState<CustomerPayment[]>([]);
    const [viewingSale, setViewingSale] = useState<SaleTransaction | null>(null);
    const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
    const [customersError, setCustomersError] = useState<string | null>(null);
    const [isLoadingSales, setIsLoadingSales] = useState(true);
    const [salesError, setSalesError] = useState<string | null>(null);
    
    // Filter state with default "Today"
    const today = new Date().toISOString().split('T')[0];
    const defaultFilters = {
        dateRange: { start: today, end: today },
        datePreset: 'today' as 'today' | 'week' | 'month' | 'custom',
        paymentMethod: 'all',
        status: 'all',
        customerId: 'all',
        seller: 'all',
    };
    const [filters, setFilters] = useState(defaultFilters);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Function to reset filters to default (Today)
    const handleClearFilters = useCallback(() => {
        const currentToday = new Date().toISOString().split('T')[0];
        const resetFilters = {
            dateRange: { start: currentToday, end: currentToday },
            datePreset: 'today' as const,
            paymentMethod: 'all',
            status: 'all',
            customerId: 'all',
            seller: 'all',
        };
        setFilters(resetFilters);
        setCurrentPage(1); // Reset to first page
    }, []);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20); // Items per page
    const [totalSales, setTotalSales] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // Fetch sales from database with filters and pagination
    const fetchSales = useCallback(async (page: number = 1) => {
        setIsLoadingSales(true);
        setSalesError(null);
        
        try {
            // Build query parameters
            const params: any = {
                page,
                limit: pageSize,
            };

            // Add date filters
            if (filters.dateRange.start) {
                params.startDate = filters.dateRange.start;
            }
            if (filters.dateRange.end) {
                params.endDate = filters.dateRange.end;
            }

            // Add payment method filter
            if (filters.paymentMethod !== 'all') {
                params.paymentMethod = filters.paymentMethod;
            }

            // Add status filter
            if (filters.status !== 'all') {
                params.status = filters.status;
            }

            // Add customer filter
            if (filters.customerId !== 'all') {
                params.customerId = filters.customerId;
            }

            // Note: Seller filter would need backend support - for now we filter client-side
            // if (filters.seller !== 'all') {
            //     params.seller = filters.seller;
            // }

            const response = await salesApi.getSales(params);
            const backendResponse = response.data as any;
            
            if (backendResponse?.success && Array.isArray(backendResponse.data?.sales)) {
                // Transform API sales to SaleTransaction format
                const apiSales: SaleTransaction[] = backendResponse.data.sales.map((sale: any) => ({
                    id: sale.id || sale._id || sale.invoiceNumber,
                    invoiceNumber: sale.invoiceNumber || sale.id || sale._id,
                    date: sale.date || sale.createdAt || new Date().toISOString(),
                    customerName: sale.customerName || 'عميل نقدي',
                    customerId: sale.customerId || 'walk-in-customer',
                    totalAmount: sale.total || sale.totalAmount || 0,
                    paidAmount: sale.paidAmount || 0,
                    remainingAmount: sale.remainingAmount || (sale.total - (sale.paidAmount || 0)),
                    paymentMethod: (sale.paymentMethod?.charAt(0).toUpperCase() + sale.paymentMethod?.slice(1).toLowerCase()) as SalePaymentMethod || 'Cash',
                    status: sale.status === 'completed' ? 'Paid' : sale.status === 'partial_payment' ? 'Partial' : sale.status === 'pending' ? 'Due' : sale.status === 'refunded' || sale.status === 'partial_refund' ? 'Returned' : (sale.status as SaleStatus) || 'Paid',
                    seller: sale.seller || sale.cashier || currentUserName,
                    items: Array.isArray(sale.items) ? sale.items.map((item: any) => ({
                        productId: typeof item.productId === 'string' ? parseInt(item.productId) || 0 : item.productId || 0,
                        name: item.productName || item.name || '',
                        unit: item.unit || 'قطعة',
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice || 0,
                        total: item.totalPrice || item.total || 0,
                        discount: item.discount || 0,
                        conversionFactor: item.conversionFactor,
                    })) : [],
                    subtotal: sale.subtotal || 0,
                    totalItemDiscount: sale.totalItemDiscount || 0,
                    invoiceDiscount: sale.invoiceDiscount || sale.discount || 0,
                    tax: sale.tax || 0,
                }));
                
                // Sort by date (most recent first)
                apiSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                
                // Apply seller filter client-side (until backend supports it)
                let filteredSales = apiSales;
                if (filters.seller !== 'all') {
                    filteredSales = apiSales.filter(s => s.seller === filters.seller);
                }
                
                setSales(filteredSales);
                
                // Update pagination info
                const pagination = backendResponse.data?.pagination;
                if (pagination) {
                    setTotalSales(pagination.totalSales || 0);
                    setTotalPages(pagination.totalPages || 1);
                } else {
                    // Fallback: estimate from current page
                    setTotalSales(apiSales.length);
                    setTotalPages(1);
                }
                
                console.log(`Loaded ${apiSales.length} sales from database (page ${page})`);
            } else {
                setSales([]);
                setTotalSales(0);
                setTotalPages(0);
                console.log('No sales found in database');
            }
        } catch (error: any) {
            const apiError = error as ApiError;
            console.error('Error fetching sales:', apiError);
            setSalesError(apiError.message || 'فشل تحميل المبيعات');
            setSales([]);
            setTotalSales(0);
            setTotalPages(0);
        } finally {
            setIsLoadingSales(false);
        }
    }, [filters, pageSize]);

    // Fetch sales when filters or page change
    useEffect(() => {
        fetchSales(currentPage);
    }, [fetchSales, currentPage]);

    // Reset to page 1 when filters or page size change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, pageSize]);

    // Fetch customers from API
    const fetchCustomers = useCallback(async () => {
        setIsLoadingCustomers(true);
        setCustomersError(null);
        try {
            const response = await customersApi.getCustomers();
            console.log('Customers API Response:', response); // Debug log
            
            // The API client wraps the response, so response.data contains the backend response
            // Backend response structure: { success: boolean, message: string, data: { customers: [] } }
            const backendResponse = response.data;
            
            // Check backend's success field
            if (backendResponse?.success) {
                // Check if customers are in backendResponse.data.customers
                const customersArray = backendResponse.data?.customers || [];
                
                if (Array.isArray(customersArray)) {
                    // Transform API response to match Customer type
                    const transformedCustomers: Customer[] = customersArray.map((c: any) => ({
                        id: c.id,
                        name: c.name,
                        phone: c.phone,
                        previousBalance: c.previousBalance || 0,
                        ...(c.address && { address: c.address }),
                    }));
                    console.log(`Loaded ${transformedCustomers.length} customers from database`); // Debug log
                    setCustomers(transformedCustomers);
                } else {
                    // Invalid response structure
                    console.error('Invalid customers array format:', customersArray);
                    setCustomers([]);
                }
            } else {
                // Backend returned success: false
                const errorMsg = backendResponse?.message || response.message || 'فشل تحميل قائمة العملاء';
                setCustomersError(errorMsg);
                console.error('Backend returned success: false', backendResponse);
                setCustomers([]); // Clear customers on error
            }
        } catch (err: any) {
            const apiError = err as ApiError;
            console.error('Error fetching customers:', {
                error: err,
                message: apiError.message,
                status: apiError.status,
            });
            
            if (apiError.status === 401 || apiError.status === 403) {
                navigate('/login', { replace: true });
                return;
            }
            setCustomersError(apiError.message || 'فشل تحميل قائمة العملاء');
            setCustomers([]); // Clear customers on error
        } finally {
            setIsLoadingCustomers(false);
        }
    }, [navigate]);

    // Fetch customer payments from API
    const fetchPayments = useCallback(async () => {
        try {
            const response = await customersApi.getCustomerPayments();
            const backendResponse = response.data;
            
            if (backendResponse?.success) {
                const paymentsArray = backendResponse.data?.payments || [];
                
                if (Array.isArray(paymentsArray)) {
                    // Transform API response to match CustomerPayment type
                    const transformedPayments: CustomerPayment[] = paymentsArray.map((p: any) => ({
                        id: p.id,
                        customerId: p.customerId,
                        date: p.date,
                        amount: p.amount,
                        method: p.method,
                        ...(p.invoiceId && { invoiceId: p.invoiceId }),
                        ...(p.notes && { notes: p.notes }),
                    }));
                    setPayments(transformedPayments);
                } else {
                    setPayments([]);
                }
            } else {
                console.error('Failed to fetch payments:', backendResponse?.message);
                setPayments([]);
            }
        } catch (err: any) {
            const apiError = err as ApiError;
            console.error('Error fetching customer payments:', apiError);
            setPayments([]);
        }
    }, []);

    // Fetch customers on component mount
    useEffect(() => {
        fetchCustomers();
        fetchPayments();
    }, [fetchCustomers, fetchPayments]);

    // Get unique sellers from all sales (for filter dropdown)
    const sellers = useMemo(() => {
        const sellerSet = new Set<string>();
        sales.forEach(s => {
            if (s.seller) sellerSet.add(s.seller);
        });
        return Array.from(sellerSet).sort();
    }, [sales]);

    // Generate dynamic label suffix based on active filter
    const getFilterLabelSuffix = useCallback(() => {
        if (filters.datePreset === 'today') {
            return '(اليوم)';
        } else if (filters.datePreset === 'week') {
            return '(هذا الأسبوع)';
        } else if (filters.datePreset === 'month') {
            return '(هذا الشهر)';
        } else if (filters.datePreset === 'custom') {
            if (filters.dateRange.start && filters.dateRange.end) {
                // Format dates for display
                const startDate = new Date(filters.dateRange.start);
                const endDate = new Date(filters.dateRange.end);
                const startFormatted = startDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                const endFormatted = endDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                
                // If same date, just show the date
                if (filters.dateRange.start === filters.dateRange.end) {
                    return `(${startFormatted})`;
                }
                return `(${startFormatted} - ${endFormatted})`;
            }
            return '(نطاق مخصص)';
        }
        return '';
    }, [filters]);

    // Generate dynamic card titles
    const cardTitles = useMemo(() => {
        const suffix = getFilterLabelSuffix();
        return {
            totalSales: `إجمالي المبيعات ${suffix}`,
            totalPayments: `إجمالي المدفوعات ${suffix}`,
            creditSales: `مبيعات آجلة ${suffix}`,
            invoiceCount: `عدد الفواتير ${suffix}`,
        };
    }, [getFilterLabelSuffix]);

    // Fetch statistics based on current filters (need separate API call for totals)
    const [statistics, setStatistics] = useState({
        totalSales: 0,
        totalPayments: 0,
        creditSales: 0,
        invoiceCount: 0,
    });
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    const fetchStatistics = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            // Build query parameters (same as sales, but without pagination)
            const params: any = {};

            if (filters.dateRange.start) {
                params.startDate = filters.dateRange.start;
            }
            if (filters.dateRange.end) {
                params.endDate = filters.dateRange.end;
            }

            if (filters.paymentMethod !== 'all') {
                params.paymentMethod = filters.paymentMethod;
            }

            if (filters.status !== 'all') {
                params.status = filters.status;
            }

            if (filters.customerId !== 'all') {
                params.customerId = filters.customerId;
            }

            // Fetch all sales for statistics (with high limit to get all)
            const response = await salesApi.getSales({ ...params, limit: 10000 });
            const backendResponse = response.data as any;
            
            if (backendResponse?.success && Array.isArray(backendResponse.data?.sales)) {
                const allSales = backendResponse.data.sales;
                
                // Apply seller filter if needed
                let filteredStats = allSales;
                if (filters.seller !== 'all') {
                    filteredStats = allSales.filter((s: any) => {
                        const seller = s.seller || s.cashier || currentUserName;
                        return seller === filters.seller;
                    });
                }
                
                const totalSales = filteredStats.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
                const totalPayments = filteredStats.reduce((sum: number, s: any) => sum + (s.paidAmount || 0), 0);
                const creditSales = filteredStats
                    .filter((s: any) => s.paymentMethod?.toLowerCase() === 'credit')
                    .reduce((sum: number, s: any) => sum + (s.total || 0), 0);
                const invoiceCount = filteredStats.length;

                setStatistics({ totalSales, totalPayments, creditSales, invoiceCount });
            }
        } catch (error) {
            console.error('Error fetching statistics:', error);
        } finally {
            setIsLoadingStats(false);
        }
    }, [filters]);

    // Fetch statistics when filters change
    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/15 to-cyan-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-blue-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Modern Professional Header */}
                <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                                <div className="mr-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                إدارة المبيعات
                            </div>
                            <h1 className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-blue-100 dark:to-white sm:text-5xl">
                                {AR_LABELS.salesManagement}
                            </h1>
                            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                {AR_LABELS.salesManagementDescription}
                            </p>
                        </div>
                    </div>
                    
                    {/* Modern Navigation Tabs */}
                    <div className="flex gap-3 flex-wrap">
                        <TabButton label={AR_LABELS.viewAllSales} isActive={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
                        <TabButton label={AR_LABELS.salesReports} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                        <TabButton label={AR_LABELS.customerAccounts} isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
                    </div>
                </div>

                {/* Summary Metrics - Sales Cards (only shown on Sales tab) */}
                {activeTab === 'sales' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard id={1} title={cardTitles.totalSales} value={isLoadingStats ? '...' : formatCurrency(statistics.totalSales)} icon={<div className="w-6 h-6 bg-green-500 rounded"></div>} bgColor="bg-green-100" valueColor="text-green-600" />
                        <MetricCard id={2} title={cardTitles.totalPayments} value={isLoadingStats ? '...' : formatCurrency(statistics.totalPayments)} icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>} bgColor="bg-blue-100" valueColor="text-blue-600" />
                        <MetricCard id={3} title={cardTitles.creditSales} value={isLoadingStats ? '...' : formatCurrency(statistics.creditSales)} icon={<div className="w-6 h-6 bg-yellow-500 rounded"></div>} bgColor="bg-yellow-100" valueColor="text-yellow-600" />
                        <MetricCard id={4} title={cardTitles.invoiceCount} value={isLoadingStats ? '...' : statistics.invoiceCount.toString()} icon={<div className="w-6 h-6 bg-purple-500 rounded"></div>} bgColor="bg-purple-100" valueColor="text-purple-600" />
                    </div>
                )}

                {/* Content */}
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    {activeTab === 'sales' && (
                        <SalesTableView 
                            sales={sales} 
                            isLoading={isLoadingSales} 
                            error={salesError} 
                            setActivePath={setActivePath || (() => {})} 
                            onViewSale={setViewingSale}
                            onOpenFilters={() => setIsFilterModalOpen(true)}
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalSales={totalSales}
                            onPageChange={setCurrentPage}
                            pageSize={pageSize}
                            onPageSizeChange={(size) => {
                                setPageSize(size);
                                setCurrentPage(1);
                            }}
                        />
                    )}
                    {activeTab === 'reports' && <ReportsView sales={sales} customers={customers} payments={payments} />}
                    {activeTab === 'customers' && (
                        <CustomerAccountsView 
                            sales={sales} 
                            customers={customers} 
                            payments={payments} 
                            setPayments={setPayments}
                            onRefreshPayments={fetchPayments}
                            setCustomers={setCustomers}
                            isLoadingCustomers={isLoadingCustomers}
                            customersError={customersError}
                            onRefreshCustomers={fetchCustomers}
                            onSaveCustomer={async (customer: Customer) => {
                                try {
                                    // Save customer to API - extract customer data (name, phone, address)
                                    const response = await customersApi.createCustomer({
                                        name: customer.name,
                                        phone: customer.phone,
                                        address: customer.address,
                                        previousBalance: customer.previousBalance || 0,
                                    });

                                    const backendResponse = response.data as any;
                                    if (response.success && backendResponse?.data?.customer) {
                                        // Transform API response to match Customer type
                                        const newCustomer: Customer = {
                                            id: backendResponse.data.customer.id,
                                            name: backendResponse.data.customer.name,
                                            phone: backendResponse.data.customer.phone,
                                            previousBalance: backendResponse.data.customer.previousBalance || 0,
                                            ...(backendResponse.data.customer.address && { address: backendResponse.data.customer.address }),
                                        };
                                        
                                        // Refresh customers from API to ensure consistency
                                        await fetchCustomers();
                                    }
                                } catch (err: any) {
                                    const apiError = err as ApiError;
                                    if (apiError.status === 401 || apiError.status === 403) {
                                        navigate('/login', { replace: true });
                                        return;
                                    }
                                    const errorMessage = apiError.message || 'فشل حفظ العميل. يرجى المحاولة مرة أخرى.';
                                    alert(errorMessage);
                                    console.error('Error saving customer:', err);
                                    throw err; // Re-throw to let modal handle it
                                }
                            }} 
                        />
                    )}
                </div>

                <SaleDetailsModal sale={viewingSale} onClose={() => setViewingSale(null)} />
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onClearFilters={handleClearFilters}
                    customers={customers}
                    sellers={sellers}
                />
            </div>
        </div>
    );
};

const TabButton: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button 
        onClick={onClick} 
        className={`group relative px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
            isActive
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
        }`}
    >
        {isActive && (
            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
        )}
        <span className="relative">{label}</span>
    </button>
);

const SalesTableView: React.FC<{ 
    sales: SaleTransaction[], 
    isLoading?: boolean,
    error?: string | null,
    setActivePath: (p: string) => void, 
    onViewSale: (s: SaleTransaction) => void,
    onOpenFilters: () => void,
    currentPage: number,
    totalPages: number,
    totalSales: number,
    onPageChange: (page: number) => void,
    pageSize: number,
    onPageSizeChange: (size: number) => void,
}> = ({ sales, isLoading = false, error = null, setActivePath, onViewSale, onOpenFilters, currentPage, totalPages, totalSales, onPageChange, pageSize, onPageSizeChange }) => {
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const { formatCurrency } = useCurrency();
    
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative flex-1 w-full md:w-auto">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <SearchIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input 
                    type="text" 
                    placeholder={AR_LABELS.searchByCustomerOrInvoice} 
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'table'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="عرض الجدول"
                    >
                        <TableViewIcon />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-colors ${
                            viewMode === 'grid'
                                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                        }`}
                        title="عرض الشبكة"
                    >
                        <GridViewIcon />
                    </button>
                </div>
                <CustomDropdown
                    id="sales-page-size-dropdown"
                    value={pageSize.toString()}
                    onChange={(value) => {
                        onPageSizeChange(parseInt(value));
                    }}
                    options={[
                        { value: '10', label: '10 لكل صفحة' },
                        { value: '20', label: '20 لكل صفحة' },
                        { value: '50', label: '50 لكل صفحة' },
                        { value: '100', label: '100 لكل صفحة' }
                    ]}
                    placeholder="حجم الصفحة"
                    className="w-full sm:w-auto"
                />
                <button 
                    onClick={onOpenFilters} 
                    className="group relative inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                    <FilterIcon />
                    <span className="mr-2">تصفية</span>
                </button>
            </div>
        </div>
        
        {error && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{error}</p>
            </div>
        )}
        
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">جاري تحميل المبيعات...</p>
                </div>
            </div>
        ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                    <div className="h-12 w-12 text-gray-400 dark:text-gray-500">
                        <ViewIcon />
                    </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">لا توجد مبيعات</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">لم يتم تسجيل أي مبيعات بعد. ابدأ بإنشاء فاتورة جديدة من نقطة البيع.</p>
                <button 
                    onClick={() => setActivePath('/pos/1')} 
                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    <span>{AR_LABELS.newSale}</span>
                </button>
            </div>
        ) : (
            <>
                {viewMode === 'table' ? (
                    <div className="overflow-x-auto rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.invoiceNumber}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.date}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.customerName}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.paymentMethod}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.totalAmount}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.paid}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.remaining}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.status}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {sales.map(s => <SalesTableRow key={s.id} sale={s} onView={onViewSale} />)}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sales.map(sale => (
                            <SalesGridCard key={sale.id} sale={sale} onView={onViewSale} />
                        ))}
                    </div>
                )}
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                            عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalSales)} من {totalSales} فاتورة
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onPageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${
                                    currentPage === 1
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                السابق
                            </button>
                            <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                                صفحة {currentPage} من {totalPages}
                            </span>
                            <button
                                onClick={() => onPageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${
                                    currentPage === totalPages
                                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-500 text-white hover:bg-blue-600'
                                }`}
                            >
                                التالي
                            </button>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    );
};

const SalesGridCard: React.FC<{sale: SaleTransaction, onView: (s: SaleTransaction) => void}> = ({sale, onView}) => {
    const { formatCurrency } = useCurrency();
    const statusStyles: Record<SaleStatus, string> = {
        Paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        Due: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        Returned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    };
    const statusLabels = { Paid: AR_LABELS.paid, Partial: AR_LABELS.partial, Due: AR_LABELS.due, Returned: AR_LABELS.returnProduct };
    
    const paymentMethodStyles: Record<SalePaymentMethod, string> = {
        Cash: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Credit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    };
    const paymentMethodLabels: Record<SalePaymentMethod, string> = {
        Cash: AR_LABELS.cash,
        Card: AR_LABELS.card,
        Credit: AR_LABELS.credit,
    };
    
    const isReturn = sale.status === 'Returned' || sale.id.startsWith('RET-');
    const displayTotal = isReturn ? Math.abs(sale.totalAmount) : sale.totalAmount;
    const displayPaid = isReturn ? Math.abs(sale.paidAmount) : sale.paidAmount;
    const displayRemaining = isReturn ? Math.abs(sale.remainingAmount) : sale.remainingAmount;
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow duration-200">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="font-mono text-sm text-blue-600 dark:text-blue-400 mb-1">
                        {sale.invoiceNumber || sale.id}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(sale.date)}
                    </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[sale.status]}`}>
                    {statusLabels[sale.status]}
                </span>
            </div>
            
            <div className="mb-3">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {sale.customerName}
                </div>
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${paymentMethodStyles[sale.paymentMethod] || paymentMethodStyles.Cash}`}>
                    {paymentMethodLabels[sale.paymentMethod] || paymentMethodLabels.Cash}
                </span>
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalAmount}:</span>
                    <span className={`font-semibold ${isReturn ? 'text-red-600' : 'text-orange-600'}`}>
                        {isReturn ? '-' : ''}{formatCurrency(displayTotal)}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.paid}:</span>
                    <span className={`font-semibold ${isReturn ? 'text-red-600' : 'text-green-600'}`}>
                        {isReturn ? '-' : ''}{formatCurrency(displayPaid)}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.remaining}:</span>
                    <span className="font-semibold text-red-600">
                        {isReturn ? '-' : ''}{formatCurrency(displayRemaining)}
                    </span>
                </div>
            </div>
            
            <button 
                onClick={() => onView(sale)} 
                className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
                <ViewIcon />
                {AR_LABELS.viewDetails}
            </button>
        </div>
    );
};

const SalesTableRow: React.FC<{sale: SaleTransaction, onView: (s: SaleTransaction) => void}> = ({sale, onView}) => {
    const { formatCurrency } = useCurrency();
    const statusStyles: Record<SaleStatus, string> = {
        Paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        Due: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        Returned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    };
    const statusLabels = { Paid: AR_LABELS.paid, Partial: AR_LABELS.partial, Due: AR_LABELS.due, Returned: AR_LABELS.returnProduct };
    
    const paymentMethodStyles: Record<SalePaymentMethod, string> = {
        Cash: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Card: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        Credit: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
    };
    const paymentMethodLabels: Record<SalePaymentMethod, string> = {
        Cash: AR_LABELS.cash,
        Card: AR_LABELS.card,
        Credit: AR_LABELS.credit,
    };
    
    const isReturn = sale.status === 'Returned' || sale.id.startsWith('RET-');
    const displayTotal = isReturn ? Math.abs(sale.totalAmount) : sale.totalAmount;
    const displayPaid = isReturn ? Math.abs(sale.paidAmount) : sale.paidAmount;
    const displayRemaining = isReturn ? Math.abs(sale.remainingAmount) : sale.remainingAmount;
    
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-600 dark:text-blue-400">{sale.invoiceNumber || sale.id}</span>
               
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(sale.date)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{sale.customerName}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${paymentMethodStyles[sale.paymentMethod] || paymentMethodStyles.Cash}`}>
                    {paymentMethodLabels[sale.paymentMethod] || paymentMethodLabels.Cash}
                </span>
            </td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${isReturn ? 'text-red-600' : 'text-orange-600'}`}>
                {isReturn ? '-' : ''}{formatCurrency(displayTotal)}
            </td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isReturn ? 'text-red-600' : 'text-green-600'}`}>
                {isReturn ? '-' : ''}{formatCurrency(displayPaid)}
            </td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm ${isReturn ? 'text-red-600' : 'text-red-600'}`}>
                {isReturn ? '-' : ''}{formatCurrency(displayRemaining)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[sale.status]}`}>
                    {statusLabels[sale.status]}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                <button 
                    onClick={() => onView(sale)} 
                    title={AR_LABELS.viewDetails} 
                    className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <ViewIcon/>
                </button>
            </td>
        </tr>
    )
}

const ReportsView: React.FC<{ sales: SaleTransaction[], customers: Customer[], payments: CustomerPayment[] }> = ({ sales, customers, payments }) => {
    const { formatCurrency } = useCurrency();
    type ReportType = 'total' | 'customer' | 'user' | 'payment';
    const [reportType, setReportType] = useState<ReportType>('total');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [reportData, setReportData] = useState<any[] | null>(null);
    const [reportHeaders, setReportHeaders] = useState<string[]>([]);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleGenerateReport = () => {
        const filteredSales = sales.filter(sale => {
            if (!dateRange.start && !dateRange.end) return true;
            const saleDate = new Date(sale.date);
            const startDate = dateRange.start ? new Date(dateRange.start) : null;
            const endDate = dateRange.end ? new Date(dateRange.end) : null;
            if (startDate && saleDate < startDate) return false;
            if (endDate) {
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                if (saleDate > endOfDay) return false;
            }
            return true;
        });

        let data: any[] = [];
        let headers: string[] = [];

        switch (reportType) {
            case 'total': {
                headers = ['المؤشر', 'القيمة'];
                const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
                const totalPaid = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
                const totalRemaining = filteredSales.reduce((sum, s) => sum + s.remainingAmount, 0);
                data = [
                    { 'المؤشر': AR_LABELS.totalSales, 'القيمة': formatCurrency(totalSales) },
                    { 'المؤشر': AR_LABELS.paid, 'القيمة': formatCurrency(totalPaid) },
                    { 'المؤشر': AR_LABELS.remaining, 'القيمة': formatCurrency(totalRemaining) },
                    { 'المؤشر': AR_LABELS.invoiceCount, 'القيمة': filteredSales.length },
                ];
                break;
            }
            case 'customer': {
                headers = [AR_LABELS.customerName, AR_LABELS.invoiceCount, AR_LABELS.totalSales, AR_LABELS.paid, AR_LABELS.remaining];
                // FIX: Explicitly type the accumulator's initial value in the reduce function to ensure correct type inference.
                const byCustomer = filteredSales.reduce((acc, sale) => {
                    if (!acc[sale.customerId]) {
                        acc[sale.customerId] = { name: sale.customerName, count: 0, total: 0, paid: 0, remaining: 0 };
                    }
                    acc[sale.customerId].count++;
                    acc[sale.customerId].total += sale.totalAmount;
                    acc[sale.customerId].paid += sale.paidAmount;
                    acc[sale.customerId].remaining += sale.remainingAmount;
                    return acc;
                // FIX: Add type assertion to the accumulator.
                }, {} as Record<string, { name: string; count: number; total: number; paid: number; remaining: number }>);
                // FIX: Explicitly type the mapped parameter 'c' to resolve 'unknown' type error.
                data = Object.values(byCustomer).map((c: { name: string; count: number; total: number; paid: number; remaining: number }) => ({
                    [AR_LABELS.customerName]: c.name,
                    [AR_LABELS.invoiceCount]: c.count,
                    [AR_LABELS.totalSales]: formatCurrency(c.total),
                    [AR_LABELS.paid]: formatCurrency(c.paid),
                    [AR_LABELS.remaining]: formatCurrency(c.remaining),
                }));
                break;
            }
            case 'user': {
                headers = [AR_LABELS.seller, AR_LABELS.invoiceCount, AR_LABELS.totalSales, AR_LABELS.paid, AR_LABELS.remaining];
                // FIX: Explicitly type the accumulator's initial value in the reduce function to ensure correct type inference.
                const byUser = filteredSales.reduce((acc, sale) => {
                    if (!acc[sale.seller]) {
                       acc[sale.seller] = { count: 0, total: 0, paid: 0, remaining: 0 };
                    }
                    acc[sale.seller].count++;
                    acc[sale.seller].total += sale.totalAmount;
                    acc[sale.seller].paid += sale.paidAmount;
                    acc[sale.seller].remaining += sale.remainingAmount;
                    return acc;
                // FIX: Add type assertion to the accumulator.
                }, {} as Record<string, { count: number; total: number; paid: number; remaining: number }>);
                // FIX: Explicitly type the mapped parameter 'u' to resolve 'unknown' type error.
                data = Object.entries(byUser).map(([seller, u]: [string, { count: number; total: number; paid: number; remaining: number }]) => ({
                    [AR_LABELS.seller]: seller,
                    [AR_LABELS.invoiceCount]: u.count,
                    [AR_LABELS.totalSales]: formatCurrency(u.total),
                    [AR_LABELS.paid]: formatCurrency(u.paid),
                    [AR_LABELS.remaining]: formatCurrency(u.remaining),
                }));
                break;
            }
            case 'payment': {
                headers = [AR_LABELS.paymentType, AR_LABELS.invoiceCount, AR_LABELS.totalSales, AR_LABELS.paid, AR_LABELS.remaining];
                // FIX: Explicitly type the accumulator's initial value in the reduce function to ensure correct type inference.
                const byPayment = filteredSales.reduce((acc, sale) => {
                    const method = sale.paymentMethod;
                    if (!acc[method]) {
                        acc[method] = { count: 0, total: 0, paid: 0, remainingAmount: 0 };
                    }
                    acc[method].count++;
                    acc[method].total += sale.totalAmount;
                    acc[method].paid += sale.paidAmount;
                    acc[method].remainingAmount += sale.remainingAmount;
                    return acc;
                // FIX: Add type assertion to the accumulator.
                }, {} as Record<SalePaymentMethod, { count: number; total: number; paid: number; remainingAmount: number }>);
                // FIX: Explicitly type the mapped parameter 'p' to resolve 'unknown' type error.
                data = Object.entries(byPayment).map(([method, p]: [string, { count: number; total: number; paid: number; remainingAmount: number }]) => ({
                    [AR_LABELS.paymentType]: method,
                    [AR_LABELS.invoiceCount]: p.count,
                    [AR_LABELS.totalSales]: formatCurrency(p.total),
                    [AR_LABELS.paid]: formatCurrency(p.paid),
                    [AR_LABELS.remaining]: formatCurrency(p.remainingAmount),
                }));
                break;
            }
        }
        setReportHeaders(headers);
        setReportData(data);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.reportType}</label>
                    <CustomDropdown
                        id="report-type-dropdown"
                        value={reportType}
                        onChange={(value) => setReportType(value as ReportType)}
                        options={[
                            { value: 'total', label: AR_LABELS.totalSalesReport },
                            { value: 'customer', label: AR_LABELS.salesByCustomerReport },
                            { value: 'user', label: AR_LABELS.salesByUserReport },
                            { value: 'payment', label: AR_LABELS.salesByPaymentTypeReport }
                        ]}
                        placeholder={AR_LABELS.reportType}
                        className="w-full"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.from}</label>
                    <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.to}</label>
                    <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"/>
                </div>
                <button onClick={handleGenerateReport} className="w-full px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.generateReport}</button>
            </div>

            {reportData && (
                <div className="p-4 border dark:border-gray-700 rounded-lg">
                    <div className="flex justify-end gap-2 mb-4">
                        <button onClick={() => alert('Exporting to Excel...')} className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md"><ExportIcon /><span className="mr-1">{AR_LABELS.exportExcel}</span></button>
                        <button onClick={() => alert('Exporting to PDF...')} className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md"><PrintIcon /><span className="mr-1">{AR_LABELS.exportPDF}</span></button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>{reportHeaders.map(h => <th key={h} className="px-4 py-2 text-xs font-medium uppercase">{h}</th>)}</tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {reportData.map((row, i) => (
                                    <tr key={i}>{reportHeaders.map(h => <td key={h} className="px-4 py-2 text-sm">{row[h]}</td>)}</tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const AddCustomerModal: React.FC<{
    onClose: () => void;
    onSave: (customer: Customer) => Promise<void>;
}> = ({ onClose, onSave }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [errors, setErrors] = useState<{ phone?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        // Validate phone number (required)
        if (!phone.trim()) {
            setErrors({ phone: 'رقم الهاتف مطلوب' });
            return;
        }

        // Clear errors
        setErrors({});
        setIsSubmitting(true);

        try {
            // Create customer data (without id - API will generate it)
            const customerData: Omit<Customer, 'id'> = {
                name: name.trim() || phone, // Use phone as name if name not provided
                phone: phone.trim(),
                previousBalance: 0,
                ...(address.trim() && { address: address.trim() }),
            };

            // Create a temporary customer object for type compatibility
            const tempCustomer: Customer = {
                id: UUID(), // Temporary ID, will be replaced by API
                ...customerData,
            };

            await onSave(tempCustomer);
            
            // Reset form only on success
            setName('');
            setPhone('');
            setAddress('');
        } catch (error) {
            // Error is handled by parent component
            console.error('Error saving customer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.addNewCustomer}</h2>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.customerName}</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="اختياري"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {AR_LABELS.phone} <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="tel" 
                            value={phone} 
                            onChange={e => {
                                setPhone(e.target.value);
                                if (errors.phone) setErrors({});
                            }}
                            className={`w-full p-2 border ${errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right`}
                            required
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.address}</label>
                        <textarea 
                            value={address} 
                            onChange={e => setAddress(e.target.value)} 
                            placeholder="اختياري"
                            rows={3}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right resize-none"
                        />
                    </div>
                </div>
                <div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg">
                    <button 
                        onClick={handleSave} 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'جاري الحفظ...' : AR_LABELS.save}
                    </button>
                    <button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {AR_LABELS.cancel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CustomerGridCard: React.FC<{
    customer: Customer;
    summary: CustomerAccountSummary | undefined;
    onAddPayment: () => void;
    onViewStatement: () => void;
}> = ({ customer, summary, onAddPayment, onViewStatement }) => {
    const { formatCurrency } = useCurrency();
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow duration-200">
            <div className="mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {customer.name}
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {customer.phone}
                </div>
                {customer.address && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate" title={customer.address}>
                        {customer.address}
                    </div>
                )}
            </div>
            
            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.balance}:</span>
                    <span className={`font-semibold ${summary && summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {summary ? formatCurrency(summary.balance) : formatCurrency(0)}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalSales}:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {summary ? formatCurrency(summary.totalSales) : formatCurrency(0)}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalPayments}:</span>
                    <span className="font-semibold text-green-600">
                        {summary ? formatCurrency(summary.totalPaid) : formatCurrency(0)}
                    </span>
                </div>
                {summary?.lastPaymentDate && (
                    <div className="flex justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-500">{AR_LABELS.lastPayment}:</span>
                        <span className="text-gray-700 dark:text-gray-300">{summary.lastPaymentDate}</span>
                    </div>
                )}
            </div>
            
            {summary && (
                <div className="flex gap-2">
                    <button 
                        onClick={onAddPayment}
                        className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <AddPaymentIcon />
                        {AR_LABELS.addPayment}
                    </button>
                    <button 
                        onClick={onViewStatement}
                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <ViewIcon />
                        {AR_LABELS.customerStatement}
                    </button>
                </div>
            )}
        </div>
    );
};

const CustomerAccountsView: React.FC<{
    sales: SaleTransaction[];
    customers: Customer[];
    payments: CustomerPayment[];
    setPayments: React.Dispatch<React.SetStateAction<CustomerPayment[]>>;
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    onSaveCustomer: (customer: Customer) => Promise<void>;
    isLoadingCustomers?: boolean;
    customersError?: string | null;
    onRefreshCustomers?: () => void;
    onRefreshPayments?: () => void;
}> = ({ sales, customers, payments, setPayments, onSaveCustomer, isLoadingCustomers = false, customersError = null, onRefreshCustomers, onRefreshPayments }) => {
    const { formatCurrency } = useCurrency();
    const [searchTerm, setSearchTerm] = useState('');
    const [balanceFilter, setBalanceFilter] = useState('all'); // 'all', 'has_balance', 'no_balance'
    const [paymentModalTarget, setPaymentModalTarget] = useState<CustomerAccountSummary | null>(null);
    const [statementModalTarget, setStatementModalTarget] = useState<CustomerAccountSummary | null>(null);
    const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
    const [sortField, setSortField] = useState<'name' | 'phone' | 'balance' | 'totalSales'>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    
    // Date filter state with default "Today"
    const today = new Date().toISOString().split('T')[0];
    const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'custom'>('today');
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: today, end: today });

    // Handle date preset changes
    const handleDatePresetChange = useCallback((preset: 'today' | 'week' | 'month' | 'custom') => {
        const today = new Date();
        let start: string;
        let end: string;

        if (preset === 'today') {
            start = today.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (preset === 'week') {
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            start = weekStart.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else if (preset === 'month') {
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            start = monthStart.toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        } else {
            // custom - keep existing range
            start = dateRange.start;
            end = dateRange.end;
        }

        setDatePreset(preset);
        setDateRange({ start, end });
    }, [dateRange]);

    // Get filtered payments based on date range
    const filteredPayments = useMemo(() => {
        if (!dateRange.start || !dateRange.end) return payments;
        
        const startDate = new Date(dateRange.start);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);

        return payments.filter(payment => {
            const paymentDate = new Date(payment.date);
            return paymentDate >= startDate && paymentDate <= endDate;
        });
    }, [payments, dateRange]);

    const customerSummaries = useMemo<CustomerAccountSummary[]>(() => {
        return customers.map(customer => {
            const customerSales = sales.filter(s => s.customerId === customer.id);
            const customerPayments = payments.filter(p => p.customerId === customer.id);

            const totalSales = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
            const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
            
            const lastPayment = customerPayments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            return {
                customerId: customer.id,
                customerName: customer.name,
                totalSales,
                totalPaid,
                balance: totalSales - totalPaid,
                lastPaymentDate: lastPayment ? formatDate(lastPayment.date) : null,
            };
        });
    }, [customers, sales, payments]);

    const filteredAndSortedCustomers = useMemo(() => {
        // Filter customers
        let filtered = customers.filter(customer => {
            const matchesSearch = searchTerm 
                ? customer.name.toLowerCase().includes(searchTerm.toLowerCase()) 
                  || customer.phone.includes(searchTerm)
                  || (customer.address && customer.address.toLowerCase().includes(searchTerm.toLowerCase()))
                : true;
            
            if (!matchesSearch) return false;
            
            // Apply balance filter using summaries
            const summary = customerSummaries.find(s => s.customerId === customer.id);
            if (balanceFilter === 'has_balance' && summary) return summary.balance > 0;
            if (balanceFilter === 'no_balance' && summary) return summary.balance <= 0;
            
            return true;
        });

        // Sort customers
        filtered.sort((a, b) => {
            let aValue: string | number;
            let bValue: string | number;

            switch (sortField) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'phone':
                    aValue = a.phone;
                    bValue = b.phone;
                    break;
                case 'balance':
                    const aSummary = customerSummaries.find(s => s.customerId === a.id);
                    const bSummary = customerSummaries.find(s => s.customerId === b.id);
                    aValue = aSummary?.balance || 0;
                    bValue = bSummary?.balance || 0;
                    break;
                case 'totalSales':
                    const aSales = customerSummaries.find(s => s.customerId === a.id);
                    const bSales = customerSummaries.find(s => s.customerId === b.id);
                    aValue = aSales?.totalSales || 0;
                    bValue = bSales?.totalSales || 0;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            } else {
                return sortDirection === 'asc'
                    ? (aValue as number) - (bValue as number)
                    : (bValue as number) - (aValue as number);
            }
        });

        return filtered;
    }, [customers, customerSummaries, searchTerm, balanceFilter, sortField, sortDirection]);

    // Paginated customers
    const paginatedCustomers = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredAndSortedCustomers.slice(startIndex, endIndex);
    }, [filteredAndSortedCustomers, currentPage, pageSize]);

    // Calculate total pages
    const totalPages = useMemo(() => {
        return Math.ceil(filteredAndSortedCustomers.length / pageSize);
    }, [filteredAndSortedCustomers.length, pageSize]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, balanceFilter, sortField, sortDirection]);

    // Calculate statistics
    const statistics = useMemo(() => {
        // Total number of customers
        const totalCustomers = customers.length;

        // Total due amount (sum of all customer debts)
        const totalDueAmount = customerSummaries.reduce((sum, summary) => {
            return sum + (summary.balance > 0 ? summary.balance : 0);
        }, 0);

        // Number of customers with outstanding debt (based on current filters)
        const customersWithDebt = filteredAndSortedCustomers.filter(customer => {
            const summary = customerSummaries.find(s => s.customerId === customer.id);
            return summary && summary.balance > 0;
        }).length;

        // Number of payments (based on date filter)
        const numberOfPayments = filteredPayments.length;

        return {
            totalCustomers,
            totalDueAmount,
            customersWithDebt,
            numberOfPayments,
        };
    }, [customers.length, customerSummaries, filteredAndSortedCustomers, filteredPayments.length]);

    const handleSort = (field: 'name' | 'phone' | 'balance' | 'totalSales') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: 'name' | 'phone' | 'balance' | 'totalSales' }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? '↑' : '↓';
    };
    
    const handleSavePayment = async (payment: CustomerPayment) => {
        try {
            // Save payment to database
            const response = await customersApi.createCustomerPayment({
                customerId: payment.customerId,
                amount: payment.amount,
                method: payment.method,
                date: payment.date,
                invoiceId: payment.invoiceId,
                notes: payment.notes,
            });
            
            const backendResponse = response.data;
            
            if (backendResponse?.success && backendResponse.data?.payment) {
                // Transform API response to match CustomerPayment type
                const savedPayment: CustomerPayment = {
                    id: backendResponse.data.payment.id,
                    customerId: backendResponse.data.payment.customerId,
                    date: backendResponse.data.payment.date,
                    amount: backendResponse.data.payment.amount,
                    method: backendResponse.data.payment.method,
                    ...(backendResponse.data.payment.invoiceId && { invoiceId: backendResponse.data.payment.invoiceId }),
                    ...(backendResponse.data.payment.notes && { notes: backendResponse.data.payment.notes }),
                };
                
                // Add to local state
                setPayments(prev => [savedPayment, ...prev]);
                setPaymentModalTarget(null);
                
                // Refresh payments from API to ensure consistency and update statistics
                if (onRefreshPayments) {
                    await onRefreshPayments();
                }
            } else {
                alert('فشل حفظ الدفعة. الرجاء المحاولة مرة أخرى.');
                console.error('Failed to save payment:', backendResponse?.message);
            }
        } catch (err: any) {
            const apiError = err as ApiError;
            console.error('Error saving customer payment:', apiError);
            alert(`فشل حفظ الدفعة: ${apiError.message || 'حدث خطأ غير متوقع'}`);
        }
    };


    // Generate filter label suffix
    const getFilterLabelSuffix = useCallback(() => {
        if (datePreset === 'today') {
            return '(اليوم)';
        } else if (datePreset === 'week') {
            return '(هذا الأسبوع)';
        } else if (datePreset === 'month') {
            return '(هذا الشهر)';
        } else if (datePreset === 'custom') {
            if (dateRange.start && dateRange.end) {
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const startFormatted = startDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                const endFormatted = endDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
                
                if (dateRange.start === dateRange.end) {
                    return `(${startFormatted})`;
                }
                return `(${startFormatted} - ${endFormatted})`;
            }
            return '(نطاق مخصص)';
        }
        return '';
    }, [datePreset, dateRange]);

    return (
        <div className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    id={1} 
                    title="إجمالي عدد العملاء" 
                    value={statistics.totalCustomers.toString()} 
                    icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>} 
                    bgColor="bg-blue-100" 
                    valueColor="text-blue-600" 
                />
                <MetricCard 
                    id={2} 
                    title="إجمالي المبلغ المستحق" 
                    value={formatCurrency(statistics.totalDueAmount)} 
                    icon={<div className="w-6 h-6 bg-red-500 rounded"></div>} 
                    bgColor="bg-red-100" 
                    valueColor="text-red-600" 
                />
                <MetricCard 
                    id={3} 
                    title={`عدد العملاء ذوي الدين ${balanceFilter === 'has_balance' ? '(مفلتر)' : ''}`}
                    value={statistics.customersWithDebt.toString()} 
                    icon={<div className="w-6 h-6 bg-orange-500 rounded"></div>} 
                    bgColor="bg-orange-100" 
                    valueColor="text-orange-600" 
                />
                <MetricCard 
                    id={4} 
                    title={`عدد المدفوعات ${getFilterLabelSuffix()}`}
                    value={statistics.numberOfPayments.toString()} 
                    icon={<div className="w-6 h-6 bg-green-500 rounded"></div>} 
                    bgColor="bg-green-100" 
                    valueColor="text-green-600" 
                />
            </div>

            {/* Date Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={() => handleDatePresetChange('today')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                datePreset === 'today' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            اليوم
                        </button>
                        <button
                            onClick={() => handleDatePresetChange('week')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                datePreset === 'week' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            هذا الأسبوع
                        </button>
                        <button
                            onClick={() => handleDatePresetChange('month')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                datePreset === 'month' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            هذا الشهر
                        </button>
                        <button
                            onClick={() => handleDatePresetChange('custom')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                datePreset === 'custom' 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                            نطاق مخصص
                        </button>
                    </div>
                    {datePreset === 'custom' && (
                        <div className="flex items-center gap-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">من</label>
                                <input 
                                    type="date" 
                                    value={dateRange.start} 
                                    onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">إلى</label>
                                <input 
                                    type="date" 
                                    value={dateRange.end} 
                                    onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <SearchIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input 
                        type="text" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        placeholder={AR_LABELS.searchByCustomerNameOrPhone} 
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
                    />
                    </div>
                 
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === 'table'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            title="عرض الجدول"
                        >
                            <TableViewIcon />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-colors ${
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                            title="عرض الشبكة"
                        >
                            <GridViewIcon />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowAddCustomerModal(true)}
                        className="group relative inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                    >
                        <PlusIcon className="h-5 w-5 ml-2" />
                        <span>{AR_LABELS.addNewCustomer}</span>
                    </button>
                    <CustomDropdown
                        id="balance-filter-dropdown"
                        value={balanceFilter}
                        onChange={(value) => setBalanceFilter(value)}
                        options={[
                            { value: 'all', label: AR_LABELS.allCustomers },
                            { value: 'has_balance', label: AR_LABELS.hasBalance },
                            { value: 'no_balance', label: AR_LABELS.noBalance }
                        ]}
                        placeholder={AR_LABELS.allCustomers}
                        className="w-full sm:w-auto"
                    />
                    <CustomDropdown
                        id="page-size-dropdown"
                        value={pageSize.toString()}
                        onChange={(value) => {
                            setPageSize(parseInt(value));
                            setCurrentPage(1);
                        }}
                        options={[
                            { value: '10', label: '10 لكل صفحة' },
                            { value: '20', label: '20 لكل صفحة' },
                            { value: '50', label: '50 لكل صفحة' },
                            { value: '100', label: '100 لكل صفحة' }
                        ]}
                        placeholder="حجم الصفحة"
                        className="w-full sm:w-auto"
                    />
                </div>
            </div>
            {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">جاري تحميل العملاء...</p>
                    </div>
                </div>
            ) : customersError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-sm text-red-600 dark:text-red-400">
                        <p className="font-medium mb-2">خطأ في تحميل العملاء</p>
                        <p className="text-gray-600 dark:text-gray-400">{customersError}</p>
                        {onRefreshCustomers && (
                            <button
                                onClick={onRefreshCustomers}
                                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                            >
                                إعادة المحاولة
                            </button>
                        )}
                    </div>
                </div>
            ) : filteredAndSortedCustomers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-6 mb-4">
                        <div className="h-12 w-12 text-gray-400 dark:text-gray-500">
                            <ViewIcon />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {customers.length === 0 ? 'لا يوجد عملاء' : 'لا توجد نتائج'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        {customers.length === 0 
                            ? 'ابدأ بإضافة عميل جديد.' 
                            : 'لا توجد نتائج تطابق معايير البحث.'}
                    </p>
                    {customers.length === 0 && (
                        <button
                            onClick={() => setShowAddCustomerModal(true)}
                            className="inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                        >
                            <PlusIcon className="h-5 w-5 ml-2" />
                            <span>{AR_LABELS.addNewCustomer}</span>
                        </button>
                    )}
                </div>
            ) : viewMode === 'table' ? (
                <div className="overflow-x-auto rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th 
                                    className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {AR_LABELS.customerName}
                                        <span className="text-xs"><SortIcon field="name" /></span>
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                                    onClick={() => handleSort('phone')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {AR_LABELS.phone}
                                        <span className="text-xs"><SortIcon field="phone" /></span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.address}</th>
                                <th 
                                    className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                                    onClick={() => handleSort('balance')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {AR_LABELS.balance}
                                        <span className="text-xs"><SortIcon field="balance" /></span>
                                    </div>
                                </th>
                                <th 
                                    className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                                    onClick={() => handleSort('totalSales')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        {AR_LABELS.totalSales}
                                        <span className="text-xs"><SortIcon field="totalSales" /></span>
                                    </div>
                                </th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.totalPayments}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.lastPayment}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {paginatedCustomers.map(customer => {
                                const summary = customerSummaries.find(s => s.customerId === customer.id);
                                return (
                                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {customer.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                            {customer.phone}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                                            <div className="truncate" title={customer.address || ''}>
                                                {customer.address || '-'}
                                            </div>
                                        </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                                            {summary ? (
                                                summary.balance > 0 ? (
                                                    <span className="text-red-600">{formatCurrency(summary.balance)}</span>
                                                ) : (
                                                    <span className="text-green-600">{formatCurrency(summary.balance)}</span>
                                                )
                                            ) : (
                                                <span className="text-gray-400">{formatCurrency(0)}</span>
                                            )}
                                </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                            {summary ? formatCurrency(summary.totalSales) : formatCurrency(0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                            {summary ? formatCurrency(summary.totalPaid) : formatCurrency(0)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                            {summary?.lastPaymentDate || 'N/A'}
                                        </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            {summary && (
                                    <div className="flex items-center justify-center gap-2">
                                        <button 
                                                        onClick={() => setPaymentModalTarget(summary)} 
                                            className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-gray-700 transition-colors"
                                            title={AR_LABELS.addPayment}
                                        >
                                            <AddPaymentIcon/>
                                        </button>
                                        <button 
                                                        onClick={() => setStatementModalTarget(summary)} 
                                            className="p-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                                            title={AR_LABELS.customerStatement}
                                        >
                                            <ViewIcon/>
                                        </button>
                                    </div>
                                            )}
                                </td>
                            </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedCustomers.map(customer => {
                        const summary = customerSummaries.find(s => s.customerId === customer.id);
                        return (
                            <CustomerGridCard 
                                key={customer.id} 
                                customer={customer} 
                                summary={summary}
                                onAddPayment={() => summary && setPaymentModalTarget(summary)}
                                onViewStatement={() => summary && setStatementModalTarget(summary)}
                            />
                        );
                    })}
                </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                        عرض {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredAndSortedCustomers.length)} من {filteredAndSortedCustomers.length} عميل
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                currentPage === 1
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            السابق
                        </button>
                        <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                            صفحة {currentPage} من {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                                currentPage === totalPages
                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                            التالي
                        </button>
                    </div>
                </div>
            )}
            
            <AddPaymentModal customerSummary={paymentModalTarget} onClose={() => setPaymentModalTarget(null)} onSave={handleSavePayment} />
            <CustomerDetailsModal summary={statementModalTarget} sales={sales} payments={payments} onClose={() => setStatementModalTarget(null)} />
            {showAddCustomerModal && (
                <AddCustomerModal 
                    onClose={() => setShowAddCustomerModal(false)} 
                    onSave={onSaveCustomer} 
                />
            )}
        </div>
    );
};

export default SalesPage;