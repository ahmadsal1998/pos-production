import React, { useState, useMemo, useCallback } from 'react';
import { RefundTransaction, RefundedItem, POSInvoice, POSCartItem } from '@/features/sales/types';
import { AR_LABELS, UUID, SearchIcon, PlusIcon, ViewIcon, EditIcon, DeleteIcon } from '@/shared/constants';
import { formatDate } from '@/shared/utils';
import { useAuthStore } from '@/app/store';
import { getBusinessDateFilterRange, getBusinessDayStartTime, getBusinessDayTimezone } from '@/shared/utils/businessDate';

// --- MOCK DATA ---
// We need mock original invoices to search against. Let's create some.
const MOCK_ORIGINAL_INVOICES: POSInvoice[] = [
    {
        id: 'INV-2024-ABCDE',
        date: new Date('2024-07-20T10:30:00Z'),
        cashier: AR_LABELS.ahmadSai,
        customer: { id: 'CUST-1', name: 'علي محمد', phone: '0501234567', previousBalance: 0 },
        items: [
            { productId: 3, name: 'كوكا كولا', unit: 'قطعة', quantity: 10, unitPrice: 2.50, total: 25.00, discount: 0 },
            { productId: 5, name: 'ليز بالملح', unit: 'قطعة', quantity: 5, unitPrice: 3.00, total: 15.00, discount: 1 },
        ],
        subtotal: 40.00,
        totalItemDiscount: 5,
        invoiceDiscount: 0,
        tax: 5.25,
        grandTotal: 40.25,
        paymentMethod: 'Cash',
    },
    {
        id: 'INV-2024-FGHIJ',
        date: new Date('2024-07-18T15:00:00Z'),
        cashier: AR_LABELS.ahmadSai,
        customer: { id: 'CUST-2', name: 'فاطمة الزهراء', phone: '0557654321', previousBalance: 150.75 },
        items: [
            { productId: 1, name: 'لابتوب Dell XPS 15', unit: 'قطعة', quantity: 1, unitPrice: 1200, total: 1200, discount: 50 },
        ],
        subtotal: 1200,
        totalItemDiscount: 50,
        invoiceDiscount: 0,
        tax: 172.5,
        grandTotal: 1322.5,
        paymentMethod: 'Card',
    }
];

const MOCK_REFUNDS: RefundTransaction[] = [
    {
        id: `REF-${UUID()}`,
        originalInvoiceId: 'INV-2024-ABCDE',
        customerName: 'علي محمد',
        refundedItems: [{ productId: 5, productName: 'ليز بالملح', quantity: 2, unitPrice: 3.00, refundedAmount: 4.00 }],
        totalRefundAmount: 4.00,
        refundDate: '2024-07-21T11:00:00Z',
        refundMethod: 'Cash',
        status: 'Partial',
        processedBy: AR_LABELS.ahmadSai,
        reason: 'العميل غير رأيه',
    }
];

// --- HELPER COMPONENTS ---
const RefundModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (newRefund: RefundTransaction) => void;
}> = ({ isOpen, onClose, onSave }) => {
    const { user } = useAuthStore();
    const currentUserName = user?.fullName || user?.username || 'Unknown';
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [foundInvoice, setFoundInvoice] = useState<POSInvoice | null>(null);
    const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({});
    const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Customer Credit'>('Cash');
    const [reason, setReason] = useState('');

    const handleFindInvoice = () => {
        const invoice = MOCK_ORIGINAL_INVOICES.find(inv => inv.id.toLowerCase() === invoiceSearch.toLowerCase());
        setFoundInvoice(invoice || null);
        if (!invoice) {
            alert(AR_LABELS.invoiceNotFound);
        } else {
            // Initialize refund quantities to 0
            const initialQuantities = invoice.items.reduce((acc, item) => {
                acc[item.productId] = 0;
                return acc;
            }, {} as Record<number, number>);
            setRefundQuantities(initialQuantities);
        }
    };

    const handleQuantityChange = (item: POSCartItem, value: string) => {
        const qty = parseInt(value, 10);
        if (!isNaN(qty)) {
            setRefundQuantities(prev => ({
                ...prev,
                [item.productId]: Math.max(0, Math.min(qty, item.quantity)) // Ensure qty is within valid range
            }));
        }
    };

    const totalRefundAmount = useMemo(() => {
        if (!foundInvoice) return 0;
        return foundInvoice.items.reduce((total, item) => {
            const quantityToRefund = refundQuantities[item.productId] || 0;
            const priceAfterDiscount = item.unitPrice - item.discount;
            return total + (quantityToRefund * priceAfterDiscount);
        }, 0);
    }, [foundInvoice, refundQuantities]);
    
    const handleSave = () => {
        if (!foundInvoice || totalRefundAmount <= 0) {
            alert("يرجى اختيار منتجات وكميات للإرجاع.");
            return;
        }

        const refundedItems: RefundedItem[] = foundInvoice.items
            .filter(item => refundQuantities[item.productId] > 0)
            .map(item => ({
                productId: item.productId,
                productName: item.name,
                quantity: refundQuantities[item.productId],
                unitPrice: item.unitPrice,
                refundedAmount: refundQuantities[item.productId] * (item.unitPrice - item.discount)
            }));
        
        const totalOriginalQuantity = foundInvoice.items.reduce((sum, item) => sum + item.quantity, 0);
        const totalRefundedQuantity = refundedItems.reduce((sum, item) => sum + item.quantity, 0);

        const newRefund: RefundTransaction = {
            id: `REF-${UUID()}`,
            originalInvoiceId: foundInvoice.id,
            customerName: foundInvoice.customer?.name || 'غير معروف',
            refundedItems,
            totalRefundAmount,
            refundDate: new Date().toISOString(),
            refundMethod,
            reason,
            status: totalRefundedQuantity === totalOriginalQuantity ? 'Full' : 'Partial',
            processedBy: currentUserName
        };
        
        onSave(newRefund);
        resetState();
    };
    
    const resetState = () => {
        setInvoiceSearch('');
        setFoundInvoice(null);
        setRefundQuantities({});
        setRefundMethod('Cash');
        setReason('');
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl text-right" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{AR_LABELS.addNewRefund}</h2>
                
                {/* Step 1: Find Invoice */}
                <div className="flex items-center gap-2 mb-4">
                    <input type="text" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} placeholder={AR_LABELS.originalInvoiceNumber} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm text-right"/>
                    <button onClick={handleFindInvoice} className="px-4 py-2 bg-blue-500 text-white rounded-md whitespace-nowrap">{AR_LABELS.findInvoice}</button>
                </div>

                {foundInvoice && (
                    <div className="space-y-4">
                        {/* Invoice Details */}
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-300">
                            <p><strong>{AR_LABELS.invoiceDetails}:</strong></p>
                            <p>{AR_LABELS.originalInvoiceNumber}: {foundInvoice.id}</p>
                            <p>{AR_LABELS.customerName}: {foundInvoice.customer?.name}</p>
                            <p>{AR_LABELS.date}: {formatDate(foundInvoice.date)}</p>
                        </div>

                        {/* Step 2: Select Products */}
                        <div>
                            <h3 className="font-semibold mb-2 text-gray-900 dark:text-gray-200">{AR_LABELS.selectProductsToRefund}</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-2">
                                {foundInvoice.items.map(item => (
                                    <div key={item.productId} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                                        <span className="text-gray-800 dark:text-gray-200">{item.name} ({item.quantity} {item.unit})</span>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor={`qty-${item.productId}`} className="text-sm text-gray-700 dark:text-gray-300">{AR_LABELS.refundQuantity}:</label>
                                            <input type="number" id={`qty-${item.productId}`} value={refundQuantities[item.productId] || 0} onChange={e => handleQuantityChange(item, e.target.value)} min="0" max={item.quantity} className="w-20 text-center border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"/>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">({AR_LABELS.maxQuantity}: {item.quantity})</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        {/* Step 3: Refund Details */}
                         <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.reasonForRefund}</label>
                            <input type="text" id="reason" value={reason} onChange={e => setReason(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm text-right"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.refundMethod}</label>
                            <select value={refundMethod} onChange={e => setRefundMethod(e.target.value as any)} className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-right bg-white dark:bg-gray-700">
                                <option value="Cash">{AR_LABELS.cash}</option>
                                <option value="Card">{AR_LABELS.card}</option>
                                <option value="Customer Credit">{AR_LABELS.customerCredit}</option>
                            </select>
                        </div>
                        
                        {/* Total */}
                        <div className="text-left text-xl font-bold text-gray-800 dark:text-gray-100">
                            <span>{AR_LABELS.totalAmount}: </span>
                            <span className="text-red-600">{totalRefundAmount.toFixed(2)} ر.س</span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex justify-start space-x-4 space-x-reverse pt-4">
                            <button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.saveRefund}</button>
                            <button onClick={handleClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const RefundsPage: React.FC = () => {
    const [refunds, setRefunds] = useState<RefundTransaction[]>(MOCK_REFUNDS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSaveRefund = (newRefund: RefundTransaction) => {
        setRefunds(prev => [newRefund, ...prev]);
        setIsModalOpen(false);
    };

    const filteredRefunds = useMemo(() => {
        // Use business date filtering with timezone
        const businessDayStartTime = getBusinessDayStartTime();
        const timezone = getBusinessDayTimezone();
        const timeStr = businessDayStartTime.hours.toString().padStart(2, '0') + ':' + businessDayStartTime.minutes.toString().padStart(2, '0');
        const { start, end } = getBusinessDateFilterRange(
            filters.startDate || null,
            filters.endDate || null,
            timeStr,
            timezone
        );
        
        return refunds.filter(refund => {
            const matchesSearch = searchTerm ?
                refund.originalInvoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                refund.customerName.toLowerCase().includes(searchTerm.toLowerCase()) : true;

            const refundDate = new Date(refund.refundDate);
            if (start && refundDate < start) return false;
            if (end && refundDate > end) return false;
            
            return matchesSearch;
        });
    }, [refunds, searchTerm, filters]);
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.refundsManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.refundsManagementDescription}</p>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <div className="relative">
                        <input type="text" placeholder={AR_LABELS.searchByInvoiceOrCustomer} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input type="date" name="startDate" value={filters.startDate} onChange={e => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-right text-gray-900 dark:text-gray-200"/>
                    <input type="date" name="endDate" value={filters.endDate} onChange={e => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md text-right text-gray-900 dark:text-gray-200"/>
                    <button onClick={() => setIsModalOpen(true)} className="md:col-start-3 lg:col-start-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                        <PlusIcon className="h-4 w-4 ml-2" />
                        <span>{AR_LABELS.addNewRefund}</span>
                    </button>
                </div>
            </div>

            {/* Refunds Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.originalInvoiceNumber}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.customerName}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.refundedProducts}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.refundAmount}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.refundDate}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.status}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">{AR_LABELS.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredRefunds.map(refund => (
                                <tr key={refund.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800 dark:text-gray-200">{refund.originalInvoiceId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{refund.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        {refund.refundedItems.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{refund.totalRefundAmount.toFixed(2)} ر.س</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(refund.refundDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${refund.status === 'Full' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                            {refund.status === 'Full' ? AR_LABELS.fullRefund : AR_LABELS.partialRefund}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-2 p-1"><ViewIcon /></button>
                                        <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2 p-1"><EditIcon /></button>
                                        <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                                    </td>
                                </tr>
                            ))}
                             {filteredRefunds.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <RefundModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveRefund}
            />
        </div>
    );
};

export default RefundsPage;