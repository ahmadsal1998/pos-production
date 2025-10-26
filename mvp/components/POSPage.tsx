import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Customer, POSInvoice, POSCartItem, SaleTransaction } from '../types';
import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, HandIcon, CancelIcon, PrintIcon, ToggleSwitch, CheckCircleIcon, ReturnIcon } from '../constants';

// --- MOCK DATA ---
const MOCK_PRODUCTS_DATA: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 1200.00, costPrice: 950.00, stock: 50, barcode: '629100100001', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung S23', category: 'إلكترونيات', price: 899.99, costPrice: 700.00, stock: 120, barcode: '629100100002', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'كوكا كولا', category: 'مشروبات', price: 2.50, costPrice: 1.50, stock: 200, barcode: '629100100003', expiryDate: '2024-12-01', createdAt: '2023-12-01' },
  { id: 4, name: 'ماء (صغير)', category: 'مشروبات', price: 1.00, costPrice: 0.50, stock: 500, barcode: '629100100004', expiryDate: '2025-01-01', createdAt: '2023-11-01' },
  { id: 5, name: 'ليز بالملح', category: 'وجبات خفيفة', price: 3.00, costPrice: 1.80, stock: 150, barcode: '629100100005', expiryDate: '2024-08-01', createdAt: '2023-12-10' },
  { id: 6, name: 'سماعات Sony XM5', category: 'إلكترونيات', price: 349.00, costPrice: 250.00, stock: 8, barcode: '629100100006', expiryDate: '2027-01-01', createdAt: '2023-09-01' },
];

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
            { productId: 6, name: 'سماعات Sony XM5', unit: 'قطعة', quantity: 1, unitPrice: 349.00, total: 349.00, discount: 0 },
        ],
        subtotal: 349.00,
        totalItemDiscount: 0,
        invoiceDiscount: 0,
        tax: 52.35,
        grandTotal: 401.35,
        paymentMethod: 'Card',
    }
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: UUID(), name: 'علي محمد', phone: '0501234567', previousBalance: 0 },
  { id: UUID(), name: 'فاطمة الزهراء', phone: '0557654321', previousBalance: 150.75 },
  { id: UUID(), name: 'عميل نقدي', phone: 'N/A', previousBalance: 0 },
];

const QUICK_PRODUCTS = MOCK_PRODUCTS_DATA.slice(2, 6); // Coke, Water, Lays, Sony Headphones

const generateNewInvoice = (cashierName: string): POSInvoice => ({
  id: `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  date: new Date(),
  cashier: cashierName,
  customer: MOCK_CUSTOMERS.find(c => c.name === 'عميل نقدي') || null,
  items: [],
  subtotal: 0,
  totalItemDiscount: 0,
  invoiceDiscount: 0,
  tax: 0,
  grandTotal: 0,
  paymentMethod: null,
});

// --- MAIN POS COMPONENT ---
const POSPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS_DATA);
    const [currentInvoice, setCurrentInvoice] = useState<POSInvoice>(() => generateNewInvoice(AR_LABELS.ahmadSai));
    const [heldInvoices, setHeldInvoices] = useState<POSInvoice[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [returnCompleted, setReturnCompleted] = useState<SaleTransaction | null>(null);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Cash');
    const [creditPaidAmount, setCreditPaidAmount] = useState(0);
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
    const [isReturnModalOpen, setReturnModalOpen] = useState(false);
    
    const calculateTotals = useCallback((items: POSCartItem[], invoiceDiscount: number): Pick<POSInvoice, 'subtotal' | 'totalItemDiscount' | 'tax' | 'grandTotal'> => {
        const subtotal = items.reduce((acc, item) => acc + item.total, 0);
        const totalItemDiscount = items.reduce((acc, item) => acc + item.discount * item.quantity, 0);
        const totalDiscountValue = totalItemDiscount + invoiceDiscount;
        // Assuming 15% tax for demonstration
        const tax = (subtotal - totalDiscountValue) * 0.15;
        const grandTotal = subtotal - totalDiscountValue + tax;
        return { subtotal, totalItemDiscount, tax, grandTotal };
    }, []);

    useEffect(() => {
        const newTotals = calculateTotals(currentInvoice.items, currentInvoice.invoiceDiscount);
        setCurrentInvoice(inv => ({ ...inv, ...newTotals }));
    }, [currentInvoice.items, currentInvoice.invoiceDiscount, calculateTotals]);
    
    useEffect(() => {
        if ((saleCompleted || returnCompleted) && autoPrintEnabled) {
            const timer = setTimeout(() => window.print(), 300); // Small delay to ensure render
            return () => clearTimeout(timer);
        }
    }, [saleCompleted, returnCompleted, autoPrintEnabled]);

    const handleAddProduct = (product: Product, unit = 'قطعة') => {
        const p = products.find(prod => prod.id === product.id);
        const existingItem = currentInvoice.items.find(item => item.productId === product.id);
        
        if (p && p.stock <= (existingItem?.quantity || 0)) {
            alert('المنتج غير متوفر في المخزون.');
            return;
        }

        if (existingItem) {
            handleUpdateQuantity(product.id, existingItem.quantity + 1);
        } else {
            const newItem: POSCartItem = {
                productId: product.id,
                name: product.name,
                unit: unit,
                quantity: 1,
                unitPrice: product.price,
                total: product.price,
                discount: 0,
            };
            setCurrentInvoice(inv => ({ ...inv, items: [...inv.items, newItem] }));
        }
    };
    
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        const foundProduct = products.find(p => p.barcode === searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        if (foundProduct) {
            handleAddProduct(foundProduct);
            setSearchTerm('');
        } else {
            alert('المنتج غير موجود');
        }
    };

    const handleUpdateQuantity = (productId: number, quantity: number) => {
        const p = products.find(prod => prod.id === productId);
        if (p && quantity > p.stock) {
            alert(`الكمية المطلوبة (${quantity}) تتجاوز المخزون المتوفر (${p.stock}). لا يمكنك إضافة المزيد.`);
            return;
        }

        if (quantity < 1) {
            handleRemoveItem(productId);
            return;
        }
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.productId === productId ? { ...item, quantity: quantity, total: item.unitPrice * quantity } : item
            ),
        }));
    };

    const handleUpdateItemDiscount = (productId: number, discount: number) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.map(item =>
                item.productId === productId ? { ...item, discount: Math.max(0, discount) } : item
            ),
        }));
    };

    const handleRemoveItem = (productId: number) => {
        setCurrentInvoice(inv => ({
            ...inv,
            items: inv.items.filter(item => item.productId !== productId),
        }));
    };

    const handleHoldSale = () => {
        if (currentInvoice.items.length === 0) return;
        setHeldInvoices(prev => [...prev, currentInvoice]);
        setCurrentInvoice(generateNewInvoice(AR_LABELS.ahmadSai));
    };

    const handleRestoreSale = (invoiceId: string) => {
        const invoiceToRestore = heldInvoices.find(inv => inv.id === invoiceId);
        if (invoiceToRestore) {
            setHeldInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            setCurrentInvoice(invoiceToRestore);
        }
    };
    
    const startNewSale = () => {
        setSaleCompleted(false);
        setReturnCompleted(null);
        setCurrentInvoice(generateNewInvoice(AR_LABELS.ahmadSai));
        setSelectedPaymentMethod('Cash');
        setCreditPaidAmount(0);
    }
    
    const handleFinalizePayment = () => {
        if (currentInvoice.items.length === 0) return;

        if (selectedPaymentMethod === 'Credit' && (!currentInvoice.customer || currentInvoice.customer.name === 'عميل نقدي')) {
            alert(AR_LABELS.selectRegisteredCustomerForCredit);
            return;
        }

        if (selectedPaymentMethod === 'Credit' && creditPaidAmount < 0) {
            alert('المبلغ المدفوع لا يمكن أن يكون سالباً.');
            return;
        }
        
        // Deduct stock
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            currentInvoice.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].stock -= item.quantity;
                }
            });
            return newProducts;
        });
        
        const finalInvoice = { ...currentInvoice, paymentMethod: selectedPaymentMethod };
        console.log('Sale Finalized:', finalInvoice);
        setCurrentInvoice(finalInvoice);
        setSaleCompleted(true);
    };

    const handleConfirmReturn = (returnInvoice: SaleTransaction) => {
        // Quantities in returnInvoice.items are negative, so this adds stock back.
        setProducts(prevProducts => {
            const newProducts = [...prevProducts];
            returnInvoice.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].stock -= item.quantity; // e.g., 50 - (-2) = 52
                }
            });
            return newProducts;
        });

        console.log("RETURN INVOICE CREATED:", returnInvoice);
        setReturnModalOpen(false);
        setReturnCompleted(returnInvoice);
    };

    const renderReceipt = (invoice: SaleTransaction | POSInvoice, title: string) => {
        const isReturn = 'originalInvoiceId' in invoice;
        return (
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-4">
                    <CheckCircleIcon className={`w-16 h-16 ${isReturn ? 'text-blue-500' : 'text-green-500'} mx-auto print-hidden`} />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{isReturn ? AR_LABELS.returnCompleted : AR_LABELS.saleCompleted}</h2>
                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-4">{title}</h3>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">123 الشارع التجاري, الرياض, السعودية</p>
                </div>

                <div className="text-xs my-4 space-y-1 border-b border-dashed pb-2">
                    <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.id}</p>
                    {isReturn && 'originalInvoiceId' in invoice && <p><strong>{AR_LABELS.originalInvoiceNumber}:</strong> {invoice.originalInvoiceId}</p>}
                    <p><strong>{AR_LABELS.date}:</strong> {new Date(invoice.date).toLocaleString('ar-SA')}</p>
                    {/* FIX: Use type guard to access 'cashier' or 'seller' property */}
                    <p><strong>{AR_LABELS.posCashier}:</strong> {'cashier' in invoice ? invoice.cashier : invoice.seller}</p>
                    <p><strong>{AR_LABELS.customerName}:</strong> {'customer' in invoice ? invoice.customer?.name : invoice.customerName || 'N/A'}</p>
                </div>
                
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b-2 border-dashed border-gray-400 dark:border-gray-500">
                            <th className="py-1 text-right font-semibold">الصنف</th>
                            <th className="py-1 text-center font-semibold">الكمية</th>
                            <th className="py-1 text-center font-semibold">السعر</th>
                            <th className="py-1 text-left font-semibold">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map(item => (
                            <tr key={item.productId} className="border-b border-dashed border-gray-300 dark:border-gray-600">
                                <td className="py-1">{item.name}</td>
                                <td className="py-1 text-center">{Math.abs(item.quantity)}</td>
                                <td className="py-1 text-center">{item.unitPrice.toFixed(2)}</td>
                                <td className="py-1 text-left">{Math.abs(item.total - item.discount * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-4 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span><span>{Math.abs(invoice.subtotal).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalDiscount}:</span><span>{Math.abs(invoice.totalItemDiscount + invoice.invoiceDiscount).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.tax}:</span><span>{Math.abs(invoice.tax).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between font-bold text-base border-t dark:border-gray-600 pt-1 mt-1"><span className="text-gray-800 dark:text-gray-100">{isReturn ? AR_LABELS.totalReturnValue : AR_LABELS.grandTotal}:</span><span className={isReturn ? 'text-red-600' : 'text-orange-600'}>{Math.abs('grandTotal' in invoice ? invoice.grandTotal : invoice.totalAmount).toFixed(2)} ر.س</span></div>
                </div>
                <p className="text-center text-xs mt-6 text-gray-500 dark:text-gray-400">شكراً لتعاملكم معنا!</p>
            </div>
        );
    }
    
    if (saleCompleted || returnCompleted) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-900 p-4">
                {saleCompleted && renderReceipt(currentInvoice, 'PoshPointHub')}
                {returnCompleted && renderReceipt(returnCompleted, AR_LABELS.returnInvoice)}
                <div className="flex space-x-4 space-x-reverse mt-6 print-hidden">
                    <button onClick={startNewSale} className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                        <PlusIcon className="h-5 w-5 ml-2" />
                        <span>{AR_LABELS.startNewSale}</span>
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <PrintIcon />
                        <span className="mr-2">{AR_LABELS.printReceipt}</span>
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-row-reverse h-[calc(100vh-10rem)] gap-4">
           {/* Left Panel (Action Panel in RTL) */}
            <div className="w-1/3 flex flex-col gap-4">
                {/* Customer & Held Invoices */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 text-right">{AR_LABELS.customerName}</h3>
                    <select 
                        value={currentInvoice.customer?.id || ''}
                        onChange={(e) => {
                            const customer = MOCK_CUSTOMERS.find(c => c.id === e.target.value);
                            setCurrentInvoice(inv => ({...inv, customer: customer || null}));
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"
                    >
                        {MOCK_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="w-full text-center text-sm text-orange-600 hover:underline">{AR_LABELS.addNewCustomer}</button>
                    
                    {heldInvoices.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                            <h3 className="font-bold text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.heldInvoices}</h3>
                            <div className="space-y-2 max-h-24 overflow-y-auto">
                                {heldInvoices.map(inv => (
                                    <div key={inv.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                                        <span className="text-sm text-gray-800 dark:text-gray-300">{inv.id} ({inv.items.length} أصناف)</span>
                                        <button onClick={() => handleRestoreSale(inv.id)} className="text-sm text-green-600 hover:underline">{AR_LABELS.restore}</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {/* Quick Products */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex-grow">
                     <h3 className="font-bold text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.quickProducts}</h3>
                     <div className="grid grid-cols-2 gap-2">
                        {QUICK_PRODUCTS.map(p => (
                            <button key={p.id} onClick={() => handleAddProduct(p)} className="p-2 border border-gray-200 dark:border-gray-700 rounded-md text-center hover:bg-orange-50 dark:hover:bg-gray-700">
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name}</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">{p.price.toFixed(2)} ر.س</span>
                            </button>
                        ))}
                     </div>
                </div>
            </div>

            {/* Right Panel (Main Transaction in RTL) */}
            <div className="w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
                 {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                    <span>{AR_LABELS.invoiceNumber}: <span className="font-mono">{currentInvoice.id}</span></span>
                    {/* FIX: Use the renamed 'posCashier' key to correctly display the label. */}
                    <span>{AR_LABELS.posCashier}: {currentInvoice.cashier}</span>
                </div>
                {/* Search */}
                <form onSubmit={handleSearch} className="p-4 border-b border-gray-200 dark:border-gray-700">
                     <div className="relative">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchProductPlaceholder} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                     </div>
                </form>
                {/* Cart */}
                <div className="flex-grow overflow-y-auto">
                    <table className="min-w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.productName}</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.quantity}</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.price}</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.discount}</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.totalAmount}</th>
                                <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                           {currentInvoice.items.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-500 dark:text-gray-400">{AR_LABELS.noItemsInCart}</td></tr>
                           ) : currentInvoice.items.map((item, index) => (
                                <tr key={item.productId}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <input type="number" value={item.quantity} onChange={e => handleUpdateQuantity(item.productId, parseInt(e.target.value, 10) || 1)} className="w-16 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.unitPrice.toFixed(2)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm">
                                        <input type="number" value={item.discount} onChange={e => handleUpdateItemDiscount(item.productId, parseFloat(e.target.value) || 0)} className="w-16 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-gray-200">{(item.total - (item.discount * item.quantity)).toFixed(2)}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        <button onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700 p-1"><DeleteIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Footer Totals & Actions */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex justify-between items-end">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setReturnModalOpen(true)} 
                            disabled={currentInvoice.items.length > 0}
                            className="inline-flex items-center px-4 py-2 border border-blue-400 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={currentInvoice.items.length > 0 ? "يجب إفراغ السلة لبدء عملية إرجاع" : AR_LABELS.returnProduct}
                        >
                            <ReturnIcon className="h-5 w-5" /><span className="mr-2">{AR_LABELS.returnProduct}</span>
                        </button>
                        <button onClick={handleHoldSale} disabled={currentInvoice.items.length === 0} className="inline-flex items-center px-4 py-2 border border-yellow-400 dark:border-yellow-600 text-sm font-medium rounded-md text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-900/60 disabled:opacity-50">
                           <HandIcon /><span className="mr-2">{AR_LABELS.holdSale}</span>
                        </button>
                        <button onClick={() => startNewSale()} className="inline-flex items-center px-4 py-2 border border-red-400 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60">
                            <CancelIcon className="w-4 h-4" /><span className="mr-2">{AR_LABELS.cancel}</span>
                        </button>
                    </div>
                    <div className="text-right space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        <p>{AR_LABELS.subtotal}: <span className="font-semibold">{currentInvoice.subtotal.toFixed(2)} ر.س</span></p>
                        <div className="flex items-center justify-end">
                            <label htmlFor="invoiceDiscount" className="ml-2">{AR_LABELS.invoiceDiscount}:</label>
                            <input
                                type="number"
                                id="invoiceDiscount"
                                value={currentInvoice.invoiceDiscount}
                                onChange={e => setCurrentInvoice(inv => ({...inv, invoiceDiscount: parseFloat(e.target.value) || 0}))}
                                className="w-20 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md font-semibold"
                            />
                        </div>
                         <p>{AR_LABELS.totalDiscount}: <span className="font-semibold text-red-600">{(currentInvoice.totalItemDiscount + currentInvoice.invoiceDiscount).toFixed(2)} ر.س</span></p>
                        <p>{AR_LABELS.tax} (15%): <span className="font-semibold">{currentInvoice.tax.toFixed(2)} ر.س</span></p>
                        <p className="text-xl font-bold text-orange-600">{AR_LABELS.grandTotal}: <span>{currentInvoice.grandTotal.toFixed(2)} ر.س</span></p>
                    </div>
                    <div className="w-72 flex-shrink-0 flex flex-col gap-2">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => { setSelectedPaymentMethod('Cash'); setCreditPaidAmount(0); }} className={`p-2 rounded-md border-2 text-center font-semibold text-sm ${selectedPaymentMethod === 'Cash' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600'}`}>{AR_LABELS.cash}</button>
                            <button onClick={() => { setSelectedPaymentMethod('Card'); setCreditPaidAmount(0); }} className={`p-2 rounded-md border-2 text-center font-semibold text-sm ${selectedPaymentMethod === 'Card' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600'}`}>{AR_LABELS.visa}</button>
                            <button onClick={() => setSelectedPaymentMethod('Credit')} className={`p-2 rounded-md border-2 text-center font-semibold text-sm ${selectedPaymentMethod === 'Credit' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600'}`}>{AR_LABELS.credit}</button>
                        </div>
                        {selectedPaymentMethod === 'Credit' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 text-right mb-1">{AR_LABELS.amountPaid}</label>
                                <input type="number" value={creditPaidAmount} onChange={e => setCreditPaidAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-center font-bold" min="0" />
                            </div>
                        )}
                        <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-2 rounded-md">
                            <ToggleSwitch
                                enabled={autoPrintEnabled}
                                onChange={setAutoPrintEnabled}
                            />
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {AR_LABELS.autoPrintInvoice}
                            </label>
                        </div>
                        <button onClick={handleFinalizePayment} disabled={currentInvoice.items.length === 0} className="w-full px-4 py-3 text-base font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600">{AR_LABELS.confirmPayment}</button>
                    </div>
                </div>
            </div>
            <ReturnModal isOpen={isReturnModalOpen} onClose={() => setReturnModalOpen(false)} onConfirm={handleConfirmReturn} />
        </div>
    );
};

const ReturnModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (returnInvoice: SaleTransaction) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [returnItems, setReturnItems] = useState<POSCartItem[]>([]);
    const [reason, setReason] = useState('');
    const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Credit'>('Cash');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        const foundProduct = MOCK_PRODUCTS_DATA.find(p => p.barcode === searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        if (foundProduct) {
            setReturnItems(prevItems => {
                const existingItem = prevItems.find(item => item.productId === foundProduct.id);
                if (existingItem) {
                    return prevItems.map(item => item.productId === foundProduct.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } : item);
                } else {
                    return [...prevItems, {
                        productId: foundProduct.id,
                        name: foundProduct.name,
                        unit: 'قطعة',
                        quantity: 1,
                        unitPrice: foundProduct.price,
                        total: foundProduct.price,
                        discount: 0,
                    }];
                }
            });
            setSearchTerm('');
        } else {
            alert('المنتج غير موجود');
        }
    };

    const handleQuantityChange = (productId: number, value: string) => {
        const quantity = parseInt(value, 10);
        if (!isNaN(quantity) && quantity >= 0) {
            setReturnItems(prev => prev.map(item => 
                item.productId === productId 
                ? { ...item, quantity, total: quantity * item.unitPrice }
                : item
            ).filter(item => item.quantity > 0));
        }
    };
    
    const totalReturnValue = useMemo(() => {
        return returnItems.reduce((total, item) => total + item.total, 0);
    }, [returnItems]);

    const handleConfirm = () => {
        if (returnItems.length === 0) {
            alert("الرجاء إضافة منتجات للإرجاع.");
            return;
        }
        const returnTransactionItems: POSCartItem[] = returnItems.map(item => ({
            ...item,
            quantity: -item.quantity,
            total: -item.total,
        }));
        
        const subtotal = returnTransactionItems.reduce((acc, item) => acc + item.total, 0);
        const tax = subtotal * 0.15;
        const totalAmount = subtotal + tax;

        const returnInvoice: SaleTransaction = {
            id: `RET-${UUID()}`,
            originalInvoiceId: 'N/A - No Receipt',
            date: new Date().toISOString(),
            customerName: 'عميل إرجاع',
            customerId: 'N/A',
            seller: AR_LABELS.ahmadSai,
            items: returnTransactionItems,
            status: 'Returned',
            paymentMethod: refundMethod,
            subtotal,
            totalItemDiscount: 0,
            invoiceDiscount: 0,
            tax,
            totalAmount,
            paidAmount: totalAmount,
            remainingAmount: 0,
        };
        
        onConfirm(returnInvoice);
        handleClose();
    };

    const handleClose = () => {
        setSearchTerm('');
        setReturnItems([]);
        setReason('');
        setRefundMethod('Cash');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl text-right" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{AR_LABELS.returnProduct}</h2>
                
                <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchProductPlaceholder} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                    <button type="submit" className="p-2 bg-blue-500 text-white rounded-md"><SearchIcon className="h-5 w-5"/></button>
                </form>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold mb-2">{AR_LABELS.productsToReturn}</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2 dark:border-gray-700">
                            {returnItems.length > 0 ? returnItems.map(item => (
                                <div key={item.productId} className="flex items-center justify-between p-2 rounded">
                                    <span>{item.name} <span className="text-xs text-gray-500">({item.unitPrice.toFixed(2)} ر.س)</span></span>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm">{AR_LABELS.returnQuantity}:</label>
                                        <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.productId, e.target.value)} min="1" className="w-20 text-center border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md"/>
                                    </div>
                                </div>
                            )) : <p className="text-center text-gray-500 py-4">{AR_LABELS.noItemsInCart}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">{AR_LABELS.reasonForRefund}</label>
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-right bg-white dark:bg-gray-700"/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.refundMethod}</label>
                        <select value={refundMethod} onChange={e => setRefundMethod(e.target.value as any)} className="w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-right bg-white dark:bg-gray-700">
                            <option value="Cash">{AR_LABELS.cash}</option>
                            <option value="Card">{AR_LABELS.card}</option>
                            <option value="Customer Credit">{AR_LABELS.customerCredit}</option>
                        </select>
                    </div>
                    <div className="text-left text-xl font-bold"><span>{AR_LABELS.totalReturnValue}: </span><span className="text-red-600">{totalReturnValue.toFixed(2)} ر.س</span></div>
                    <div className="flex justify-start space-x-4 space-x-reverse pt-4">
                        <button onClick={handleConfirm} className="px-4 py-2 bg-green-500 text-white rounded-md">{AR_LABELS.confirmReturn}</button>
                        <button onClick={handleClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSPage;