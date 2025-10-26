import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { SaleTransaction, Customer, CustomerPayment, CustomerAccountSummary, SalePaymentMethod, SaleStatus } from '../types';
import { AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon, PrintIcon, ViewIcon, ExportIcon, AddPaymentIcon } from '../constants';
import MetricCard from './MetricCard';

// --- MOCK DATA ---
const MOCK_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'علي محمد', phone: '0501234567', previousBalance: 0 },
  { id: 'cust-2', name: 'فاطمة الزهراء', phone: '0557654321', previousBalance: 0 },
  { id: 'cust-3', name: 'متجر بقالة المدينة', phone: '0501112222', previousBalance: 0, companyName: 'شركة المدينة للتجارة' },
];

const MOCK_USERS = [AR_LABELS.ahmadSai, 'موظف آخر'];

const MOCK_SALES_DATA: SaleTransaction[] = [
  { id: 'INV-001', date: new Date().toISOString(), customerId: 'cust-1', customerName: 'علي محمد', totalAmount: 115, paidAmount: 115, remainingAmount: 0, paymentMethod: 'Card', status: 'Paid', seller: MOCK_USERS[0],
    items: [{ productId: 1, name: 'منتج أ', unit: 'قطعة', quantity: 2, unitPrice: 50, total: 100, discount: 0 }],
    subtotal: 100, totalItemDiscount: 0, invoiceDiscount: 0, tax: 15
  },
  { id: 'INV-002', date: new Date(Date.now() - 86400000).toISOString(), customerId: 'cust-2', customerName: 'فاطمة الزهراء', totalAmount: 207, paidAmount: 100, remainingAmount: 107, paymentMethod: 'Credit', status: 'Partial', seller: MOCK_USERS[1],
    items: [{ productId: 2, name: 'منتج ب', unit: 'قطعة', quantity: 1, unitPrice: 200, total: 200, discount: 20 }],
    subtotal: 200, totalItemDiscount: 20, invoiceDiscount: 0, tax: 27
  },
  { id: 'INV-003', date: new Date(Date.now() - 2 * 86400000).toISOString(), customerId: 'cust-3', customerName: 'متجر بقالة المدينة', totalAmount: 2500, paidAmount: 0, remainingAmount: 2500, paymentMethod: 'Credit', status: 'Due', seller: MOCK_USERS[0],
    items: [{ productId: 3, name: 'منتج ج (كمية)', unit: 'كرتون', quantity: 5, unitPrice: 500, total: 2500, discount: 0 }],
    subtotal: 2500, totalItemDiscount: 0, invoiceDiscount: 0, tax: 0
  },
  { id: 'INV-004', date: new Date().toISOString(), customerId: 'cust-2', customerName: 'فاطمة الزهراء', totalAmount: 85, paidAmount: 85, remainingAmount: 0, paymentMethod: 'Cash', status: 'Paid', seller: MOCK_USERS[0],
    items: [
      { productId: 4, name: 'منتج د', unit: 'قطعة', quantity: 5, unitPrice: 10, total: 50, discount: 0 },
      { productId: 5, name: 'منتج هـ', unit: 'قطعة', quantity: 1, unitPrice: 23.91, total: 23.91, discount: 0 }
    ],
    subtotal: 73.91, totalItemDiscount: 0, invoiceDiscount: 0, tax: 11.09
  },
];

const MOCK_PAYMENTS_DATA: CustomerPayment[] = [
    {id: UUID(), customerId: 'cust-2', date: new Date(Date.now() - 86400000).toISOString(), amount: 100, method: 'Cash', invoiceId: 'INV-002'},
];

// --- MODAL COMPONENTS ---
const SaleDetailsModal: React.FC<{ sale: SaleTransaction | null, onClose: () => void }> = ({ sale, onClose }) => {
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
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{sale.id}</p>
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
                                {sale.items.map((item, index) => (
                                    <tr key={item.productId} className="border-b dark:border-gray-700">
                                        <td className="p-2 text-sm">{index + 1}</td>
                                        <td className="p-2 text-sm font-medium">{item.name}</td>
                                        <td className="p-2 text-sm">{item.quantity}</td>
                                        <td className="p-2 text-sm">{item.unitPrice.toFixed(2)}</td>
                                        <td className="p-2 text-sm font-semibold text-left">{item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                        <div className="w-1/2 text-sm space-y-1">
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span><span>{sale.subtotal.toFixed(2)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.discount}:</span><span>-{(sale.totalItemDiscount + sale.invoiceDiscount).toFixed(2)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.tax}:</span><span>+{sale.tax.toFixed(2)} ر.س</span></div>
                            <div className="flex justify-between font-bold text-lg border-t dark:border-gray-600 pt-1 mt-1"><span className="text-gray-800 dark:text-gray-100">{AR_LABELS.grandTotal}:</span><span className="text-orange-600">{sale.totalAmount.toFixed(2)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.amountPaid}:</span><span className="text-green-600">{sale.paidAmount.toFixed(2)} ر.س</span></div>
                            <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.remaining}:</span><span className="text-red-600">{sale.remainingAmount.toFixed(2)} ر.س</span></div>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.paymentMethod}</label>
                        <select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md">
                            <option value="Cash">{AR_LABELS.cash}</option>
                            <option value="Bank Transfer">{AR_LABELS.bankTransfer}</option>
                            <option value="Cheque">{AR_LABELS.cheque}</option>
                        </select>
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
    if (!summary) return null;
    
    const transactions = useMemo(() => {
        const customerSales = sales.filter(s => s.customerId === summary.customerId)
            .map(s => ({
                date: s.date,
                type: 'sale' as const,
                description: `${AR_LABELS.invoice} #${s.id}`,
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
                acc.push({ ...trans, balance: newBalance });
                return acc;
            }, [] as (typeof customerSales[0] & { balance: number })[]);

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
                            <p><strong>{AR_LABELS.totalSales}:</strong> {summary.totalSales.toFixed(2)}</p>
                            <p><strong>{AR_LABELS.totalPayments}:</strong> {summary.totalPaid.toFixed(2)}</p>
                            <p className="font-bold text-lg">{AR_LABELS.balance}: <span className={summary.balance > 0 ? 'text-red-600' : 'text-green-600'}>{summary.balance.toFixed(2)}</span></p>
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
                                         <td className="p-2 text-sm">{new Date(t.date).toLocaleDateString('ar-SA')}</td>
                                         <td className="p-2 text-sm">{t.description}</td>
                                         <td className="p-2 text-sm text-left font-mono">{t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                                         <td className="p-2 text-sm text-left font-mono text-green-600">{t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                                         <td className="p-2 text-sm text-left font-mono font-semibold">{t.balance.toFixed(2)}</td>
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

// --- MAIN PAGE COMPONENT ---
interface SalesPageProps {
  setActivePath: (path: string) => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ setActivePath }) => {
    const [activeTab, setActiveTab] = useState('sales'); // 'sales', 'reports', 'customers'
    const [sales, setSales] = useState(MOCK_SALES_DATA);
    const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
    const [payments, setPayments] = useState(MOCK_PAYMENTS_DATA);
    const [viewingSale, setViewingSale] = useState<SaleTransaction | null>(null);

    const summaryMetrics = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        const salesToday = sales.filter(s => s.date.startsWith(today));
        
        const totalSalesToday = salesToday.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0); // All time
        const creditSales = sales.filter(s => s.paymentMethod === 'Credit').reduce((sum, s) => sum + s.totalAmount, 0);
        const invoiceCount = sales.length;
        const totalBilled = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const collectionRate = totalBilled > 0 ? (totalPayments / totalBilled) * 100 : 0;

        return { totalSalesToday, totalPayments, creditSales, invoiceCount, collectionRate };
    }, [sales, payments]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.salesManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.salesManagementDescription}</p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <MetricCard id={1} title={AR_LABELS.totalSalesToday} value={`${summaryMetrics.totalSalesToday.toFixed(2)} ر.س`} icon={<div/>} bgColor="bg-green-100" valueColor="text-green-600" />
                <MetricCard id={2} title={AR_LABELS.totalPayments} value={`${summaryMetrics.totalPayments.toFixed(2)} ر.س`} icon={<div/>} bgColor="bg-blue-100" valueColor="text-blue-600" />
                <MetricCard id={3} title={AR_LABELS.creditSales} value={`${summaryMetrics.creditSales.toFixed(2)} ر.س`} icon={<div/>} bgColor="bg-yellow-100" valueColor="text-yellow-600" />
                <MetricCard id={4} title={AR_LABELS.invoiceCount} value={summaryMetrics.invoiceCount.toString()} icon={<div/>} bgColor="bg-purple-100" valueColor="text-purple-600" />
                <MetricCard id={5} title={AR_LABELS.collectionRate} value={`${summaryMetrics.collectionRate.toFixed(1)}%`} icon={<div/>} bgColor="bg-indigo-100" valueColor="text-indigo-600" />
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm">
                <nav className="flex space-x-2 space-x-reverse">
                    <TabButton label={AR_LABELS.viewAllSales} isActive={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
                    <TabButton label={AR_LABELS.salesReports} isActive={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
                    <TabButton label={AR_LABELS.customerAccounts} isActive={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
                </nav>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                {activeTab === 'sales' && <SalesTableView sales={sales} setActivePath={setActivePath} onViewSale={setViewingSale} />}
                {activeTab === 'reports' && <ReportsView sales={sales} customers={customers} payments={payments} />}
                {activeTab === 'customers' && <CustomerAccountsView sales={sales} customers={customers} payments={payments} setPayments={setPayments} />}
            </div>

            <SaleDetailsModal sale={viewingSale} onClose={() => setViewingSale(null)} />
        </div>
    );
};

const TabButton: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-orange-500 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
        {label}
    </button>
);

const SalesTableView: React.FC<{ sales: SaleTransaction[], setActivePath: (p: string) => void, onViewSale: (s: SaleTransaction) => void }> = ({ sales, setActivePath, onViewSale }) => {
    // Add filtering and sorting logic here
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="relative w-1/3">
                <input type="text" placeholder={AR_LABELS.searchByCustomerOrInvoice} className="w-full pl-3 pr-10 py-2 rounded-md border text-right"/>
                <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button onClick={() => setActivePath('/pos/1')} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.newSale}</span>
            </button>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.invoiceNumber}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.date}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.customerName}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.totalAmount}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.paid}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.remaining}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.status}</th>
                        <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.actions}</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {sales.map(s => <SalesTableRow key={s.id} sale={s} onView={onViewSale} />)}
                </tbody>
            </table>
        </div>
      </div>
    );
};

const SalesTableRow: React.FC<{sale: SaleTransaction, onView: (s: SaleTransaction) => void}> = ({sale, onView}) => {
    const statusStyles: Record<SaleStatus, string> = {
        Paid: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        Due: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        Returned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    };
    const statusLabels = { Paid: AR_LABELS.paid, Partial: AR_LABELS.partial, Due: AR_LABELS.due, Returned: AR_LABELS.returnProduct };
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-blue-600 dark:text-blue-400">{sale.id}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm">{new Date(sale.date).toLocaleDateString('ar-SA')}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{sale.customerName}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold">{sale.totalAmount.toFixed(2)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">{sale.paidAmount.toFixed(2)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">{sale.remainingAmount.toFixed(2)}</td>
            <td className="px-4 py-2 whitespace-nowrap text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[sale.status]}`}>{statusLabels[sale.status]}</span></td>
            <td className="px-4 py-2 whitespace-nowrap text-center text-sm">
                <button onClick={() => onView(sale)} title={AR_LABELS.viewDetails} className="p-1 ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"><ViewIcon/></button>
            </td>
        </tr>
    )
}

const ReportsView: React.FC<{ sales: SaleTransaction[], customers: Customer[], payments: CustomerPayment[] }> = ({ sales, customers, payments }) => {
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
                    { 'المؤشر': AR_LABELS.totalSales, 'القيمة': `${totalSales.toFixed(2)} ر.س` },
                    { 'المؤشر': AR_LABELS.paid, 'القيمة': `${totalPaid.toFixed(2)} ر.س` },
                    { 'المؤشر': AR_LABELS.remaining, 'القيمة': `${totalRemaining.toFixed(2)} ر.س` },
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
                    [AR_LABELS.totalSales]: `${c.total.toFixed(2)} ر.س`,
                    [AR_LABELS.paid]: `${c.paid.toFixed(2)} ر.س`,
                    [AR_LABELS.remaining]: `${c.remaining.toFixed(2)} ر.س`,
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
                    [AR_LABELS.totalSales]: `${u.total.toFixed(2)} ر.س`,
                    [AR_LABELS.paid]: `${u.paid.toFixed(2)} ر.س`,
                    [AR_LABELS.remaining]: `${u.remaining.toFixed(2)} ر.س`,
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
                    [AR_LABELS.totalSales]: `${p.total.toFixed(2)} ر.س`,
                    [AR_LABELS.paid]: `${p.paid.toFixed(2)} ر.س`,
                    [AR_LABELS.remaining]: `${p.remainingAmount.toFixed(2)} ر.س`,
                }));
                break;
            }
        }
        setReportHeaders(headers);
        setReportData(data);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border dark:border-gray-700 rounded-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.reportType}</label>
                    <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right">
                        <option value="total">{AR_LABELS.totalSalesReport}</option>
                        <option value="customer">{AR_LABELS.salesByCustomerReport}</option>
                        <option value="user">{AR_LABELS.salesByUserReport}</option>
                        <option value="payment">{AR_LABELS.salesByPaymentTypeReport}</option>
                    </select>
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
                        <button onClick={() => alert('Exporting to Excel...')} className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md"><ExportIcon className="w-4 h-4 ml-1" />{AR_LABELS.exportExcel}</button>
                        <button onClick={() => alert('Exporting to PDF...')} className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-600 rounded-md"><PrintIcon className="w-4 h-4 ml-1" />{AR_LABELS.exportPDF}</button>
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

const CustomerAccountsView: React.FC<{
    sales: SaleTransaction[];
    customers: Customer[];
    payments: CustomerPayment[];
    setPayments: React.Dispatch<React.SetStateAction<CustomerPayment[]>>;
}> = ({ sales, customers, payments, setPayments }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [balanceFilter, setBalanceFilter] = useState('all'); // 'all', 'has_balance', 'no_balance'
    const [paymentModalTarget, setPaymentModalTarget] = useState<CustomerAccountSummary | null>(null);
    const [statementModalTarget, setStatementModalTarget] = useState<CustomerAccountSummary | null>(null);

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
                lastPaymentDate: lastPayment ? new Date(lastPayment.date).toLocaleDateString('ar-SA') : null,
            };
        });
    }, [customers, sales, payments]);

    const filteredSummaries = useMemo(() => {
        return customerSummaries.filter(c => {
            const customerDetails = customers.find(cust => cust.id === c.customerId);
            const matchesSearch = searchTerm ? c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || customerDetails?.phone.includes(searchTerm) : true;
            if (!matchesSearch) return false;
            
            if (balanceFilter === 'has_balance') return c.balance > 0;
            if (balanceFilter === 'no_balance') return c.balance <= 0;
            return true;
        });
    }, [customerSummaries, searchTerm, balanceFilter, customers]);
    
    const handleSavePayment = (payment: CustomerPayment) => {
        setPayments(prev => [payment, ...prev]);
        setPaymentModalTarget(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-1/2">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchByCustomerNameOrPhone} className="w-full pl-3 pr-10 py-2 rounded-md border text-right"/>
                    <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                 <div className="flex items-center gap-2">
                    <select value={balanceFilter} onChange={e => setBalanceFilter(e.target.value)} className="p-2 border rounded-md text-right">
                        <option value="all">{AR_LABELS.allCustomers}</option>
                        <option value="has_balance">{AR_LABELS.hasBalance}</option>
                        <option value="no_balance">{AR_LABELS.noBalance}</option>
                    </select>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.customerName}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.totalSales}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.totalPayments}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.balance}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.lastPayment}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase text-center">{AR_LABELS.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredSummaries.map(c => (
                            <tr key={c.customerId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">{c.customerName}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{c.totalSales.toFixed(2)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">{c.totalPaid.toFixed(2)}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm font-bold">
                                    {c.balance > 0 ? <span className="text-red-600">{c.balance.toFixed(2)}</span> : <span className="text-green-600">{c.balance.toFixed(2)}</span>}
                                </td>
                                <td className="px-4 py-2 whitespace-nowrap text-sm">{c.lastPaymentDate || 'N/A'}</td>
                                <td className="px-4 py-2 whitespace-nowrap text-center text-sm">
                                    <button onClick={() => setPaymentModalTarget(c)} className="p-1 ml-2 text-green-600" title={AR_LABELS.addPayment}><AddPaymentIcon/></button>
                                    <button onClick={() => setStatementModalTarget(c)} className="p-1 ml-2 text-blue-600" title={AR_LABELS.customerStatement}><ViewIcon/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <AddPaymentModal customerSummary={paymentModalTarget} onClose={() => setPaymentModalTarget(null)} onSave={handleSavePayment} />
            <CustomerDetailsModal summary={statementModalTarget} sales={sales} payments={payments} onClose={() => setStatementModalTarget(null)} />
        </div>
    );
};

export default SalesPage;