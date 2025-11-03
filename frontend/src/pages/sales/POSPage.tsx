import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Product, Customer, POSInvoice, POSCartItem, SaleTransaction } from '@/shared/types';

import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, HandIcon, CancelIcon, PrintIcon, CheckCircleIcon, ReturnIcon } from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';

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
            <div id="printable-receipt" className="w-full max-w-md bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg text-right">
                <div className="text-center mb-3 sm:mb-4">
                    <CheckCircleIcon className={`w-12 h-12 sm:w-16 sm:h-16 ${isReturn ? 'text-blue-500' : 'text-green-500'} mx-auto print-hidden`} />
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2 print-hidden">{isReturn ? AR_LABELS.returnCompleted : AR_LABELS.saleCompleted}</h2>
                    <h3 className="text-lg sm:text-xl font-bold text-center text-gray-900 dark:text-gray-100 mt-3 sm:mt-4">{title}</h3>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">123 الشارع التجاري, الرياض, السعودية</p>
                </div>

                <div className="text-xs my-3 sm:my-4 space-y-1 border-b border-dashed pb-2">
                    <p><strong>{AR_LABELS.invoiceNumber}:</strong> {invoice.id}</p>
                    {isReturn && 'originalInvoiceId' in invoice && <p><strong>{AR_LABELS.originalInvoiceNumber}:</strong> {invoice.originalInvoiceId}</p>}
                    <p><strong>{AR_LABELS.date}:</strong> {new Date(invoice.date).toLocaleString('ar-SA')}</p>
                    {/* FIX: Use type guard to access 'cashier' or 'seller' property */}
                    <p><strong>{AR_LABELS.posCashier}:</strong> {'cashier' in invoice ? invoice.cashier : invoice.seller}</p>
                    <p><strong>{AR_LABELS.customerName}:</strong> {'customer' in invoice ? invoice.customer?.name : invoice.customerName || 'N/A'}</p>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-full">
                        <thead>
                            <tr className="border-b-2 border-dashed border-gray-400 dark:border-gray-500">
                                <th className="py-1 text-right font-semibold px-1 sm:px-2">الصنف</th>
                                <th className="py-1 text-center font-semibold px-1 sm:px-2">الكمية</th>
                                <th className="py-1 text-center font-semibold px-1 sm:px-2">السعر</th>
                                <th className="py-1 text-left font-semibold px-1 sm:px-2">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map(item => (
                                <tr key={item.productId} className="border-b border-dashed border-gray-300 dark:border-gray-600">
                                    <td className="py-1 px-1 sm:px-2">{item.name}</td>
                                    <td className="py-1 text-center px-1 sm:px-2">{Math.abs(item.quantity)}</td>
                                    <td className="py-1 text-center px-1 sm:px-2">{item.unitPrice.toFixed(2)}</td>
                                    <td className="py-1 text-left px-1 sm:px-2">{Math.abs(item.total - item.discount * item.quantity).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 sm:mt-4 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span><span>{Math.abs(invoice.subtotal).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.totalDiscount}:</span><span>{Math.abs(invoice.totalItemDiscount + invoice.invoiceDiscount).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 dark:text-gray-400">{AR_LABELS.tax}:</span><span>{Math.abs(invoice.tax).toFixed(2)} ر.س</span></div>
                    <div className="flex justify-between font-bold text-sm sm:text-base border-t dark:border-gray-600 pt-1 mt-1"><span className="text-gray-800 dark:text-gray-100">{isReturn ? AR_LABELS.totalReturnValue : AR_LABELS.grandTotal}:</span><span className={isReturn ? 'text-red-600' : 'text-orange-600'}>{Math.abs('grandTotal' in invoice ? invoice.grandTotal : invoice.totalAmount).toFixed(2)} ر.س</span></div>
                </div>
                <p className="text-center text-xs mt-4 sm:mt-6 text-gray-500 dark:text-gray-400">شكراً لتعاملكم معنا!</p>
            </div>
        );
    }
    
    if (saleCompleted || returnCompleted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                {saleCompleted && renderReceipt(currentInvoice, 'PoshPointHub')}
                {returnCompleted && renderReceipt(returnCompleted, AR_LABELS.returnInvoice)}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-4 sm:space-x-reverse mt-4 sm:mt-6 print-hidden w-full max-w-md">
                    <button onClick={startNewSale} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                        <PlusIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2" />
                        <span>{AR_LABELS.startNewSale}</span>
                    </button>
                    <button onClick={() => window.print()} className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 text-sm sm:text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                        <span className="h-4 w-4 sm:h-5 sm:w-5"><PrintIcon /></span>
                        <span className="mr-2">{AR_LABELS.printReceipt}</span>
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-orange-50/20 to-amber-100/30 dark:from-slate-950 dark:via-orange-950/20 dark:to-amber-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            <div className="relative w-full px-2 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
                {/* Modern Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50 mb-2 sm:mb-3">
                        <div className="mr-2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        نقاط البيع (POS)
                    </div>
                    <h1 className="bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-white">
                        {'نقطة البيع'}
                    </h1>
                </div>

                {/* Three Column Layout - Proportional widths: 25% - 50% - 25% */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-3 sm:gap-4 h-auto md:h-[calc(100vh-12rem)] w-full overflow-x-hidden">
                   {/* Column 1: Customer & Quick Products (25%) */}
                    <div className="flex flex-col gap-3 sm:gap-4 min-h-0 min-w-0">
                        {/* Customer & Held Invoices */}
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 space-y-3 sm:space-y-4">
                            <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.customerName}</h3>
                            <CustomDropdown
                                id="pos-customer-dropdown"
                                value={currentInvoice.customer?.id || ''}
                                onChange={(value) => {
                                    const customer = MOCK_CUSTOMERS.find(c => c.id === value);
                                    setCurrentInvoice(inv => ({...inv, customer: customer || null}));
                                }}
                                options={MOCK_CUSTOMERS.map(c => ({ value: c.id, label: c.name }))}
                                placeholder={AR_LABELS.customerName}
                                className="w-full"
                            />
                            <button className="w-full text-center text-xs sm:text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium transition-colors py-1.5">{AR_LABELS.addNewCustomer}</button>
                            
                            {heldInvoices.length > 0 && (
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 sm:pt-4">
                                    <h3 className="font-bold text-sm sm:text-base text-gray-700 dark:text-gray-200 text-right mb-2">{AR_LABELS.heldInvoices}</h3>
                                    <div className="space-y-2 max-h-20 sm:max-h-24 overflow-y-auto">
                                        {heldInvoices.map(inv => (
                                            <div key={inv.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs sm:text-sm">
                                                <span className="text-gray-800 dark:text-gray-300 truncate flex-1">{inv.id} ({inv.items.length} أصناف)</span>
                                                <button onClick={() => handleRestoreSale(inv.id)} className="text-green-600 hover:underline mr-2 flex-shrink-0">{AR_LABELS.restore}</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Quick Products */}
                        <div className="bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 flex-grow overflow-y-auto">
                            <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 text-right mb-3 sm:mb-4">{AR_LABELS.quickProducts}</h3>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                {QUICK_PRODUCTS.map(p => (
                                    <button 
                                        key={p.id} 
                                        onClick={() => handleAddProduct(p)} 
                                        className="group p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl text-center hover:bg-orange-50 dark:hover:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-md active:scale-95"
                                    >
                                        <span className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">{p.name}</span>
                                        <span className="block text-xs font-bold text-orange-600">{p.price.toFixed(2)} ر.س</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Transaction/Cart (50% - Center, wider) */}
                    <div className="flex flex-col bg-white/95 dark:bg-gray-800/95 rounded-xl sm:rounded-2xl shadow-sm backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 min-h-0 min-w-0 overflow-hidden">
                        {/* Header */}
                        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs sm:text-sm text-gray-700 dark:text-gray-300 flex flex-col sm:flex-row justify-between gap-2 sm:gap-0 rounded-t-xl sm:rounded-t-2xl flex-shrink-0">
                            <span className="font-semibold truncate">{AR_LABELS.invoiceNumber}: <span className="font-mono text-orange-600">{currentInvoice.id}</span></span>
                            <span className="font-semibold truncate">{AR_LABELS.posCashier}: <span className="text-gray-900 dark:text-gray-100">{currentInvoice.cashier}</span></span>
                        </div>
                        {/* Search */}
                        <form onSubmit={handleSearch} className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="relative">
                                <SearchIcon className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
                                <input 
                                    type="text" 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    placeholder={AR_LABELS.searchProductPlaceholder} 
                                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                                />
                            </div>
                        </form>
                        {/* Cart */}
                        <div className="flex-grow overflow-y-auto overflow-x-auto min-w-0">
                            <div className="overflow-x-auto min-w-0">
                                <table className="w-full text-right min-w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                        <tr>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[5%]">#</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[30%]">{AR_LABELS.productName}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.quantity}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.price}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[12%]">{AR_LABELS.discount}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[15%]">{AR_LABELS.totalAmount}</th>
                                            <th className="px-2 sm:px-3 py-2 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[10%]"></th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                   {currentInvoice.items.length === 0 ? (
                                        <tr><td colSpan={7} className="text-center py-8 sm:py-10 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.noItemsInCart}</td></tr>
                                   ) : currentInvoice.items.map((item, index) => (
                                        <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 break-words">{item.name}</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateQuantity(item.productId, parseInt(e.target.value, 10) || 1)} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.unitPrice.toFixed(2)} ر.س</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <input 
                                                    type="number" 
                                                    value={item.discount} 
                                                    onChange={e => handleUpdateItemDiscount(item.productId, parseFloat(e.target.value) || 0)} 
                                                    className="w-full max-w-[60px] text-xs sm:text-sm text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent py-1 sm:py-1.5"
                                                />
                                            </td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-orange-600 whitespace-nowrap">{(item.total - (item.discount * item.quantity)).toFixed(2)} ر.س</td>
                                            <td className="px-2 sm:px-3 py-3 sm:py-4">
                                                <button 
                                                    onClick={() => handleRemoveItem(item.productId)} 
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors mx-auto"
                                                >
                                                    <span className="w-4 h-4 sm:w-5 sm:h-5 block"><DeleteIcon /></span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Totals, Payment & Actions (25%) */}
                    <div className="flex flex-col gap-3 sm:gap-4 min-h-0 min-w-0 overflow-y-auto">
                        <div className="bg-gradient-to-br from-white via-orange-50/30 to-amber-50/30 dark:from-gray-800 dark:via-orange-950/20 dark:to-amber-950/20 rounded-xl sm:rounded-2xl shadow-lg border border-orange-200/50 dark:border-orange-800/50 backdrop-blur-xl p-4 sm:p-5 flex-grow">
                            {/* Action Buttons */}
                            <div className="mb-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">الإجراءات</h3>
                                <div className="flex flex-col gap-2 sm:gap-3">
                                    <button 
                                        onClick={() => setReturnModalOpen(true)} 
                                        disabled={currentInvoice.items.length > 0}
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-blue-400 dark:border-blue-600 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
                                        title={currentInvoice.items.length > 0 ? "يجب إفراغ السلة لبدء عملية إرجاع" : AR_LABELS.returnProduct}
                                    >
                                        <span className="h-4 w-4 sm:h-5 sm:w-5 block"><ReturnIcon /></span>
                                        <span className="mr-2">{AR_LABELS.returnProduct}</span>
                                    </button>
                                    <button 
                                        onClick={handleHoldSale} 
                                        disabled={currentInvoice.items.length === 0} 
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-yellow-400 dark:border-yellow-600 text-sm font-medium text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                       <span className="h-4 w-4 sm:h-5 sm:w-5 block"><HandIcon /></span>
                                       <span className="mr-2">{AR_LABELS.holdSale}</span>
                                    </button>
                                    <button 
                                        onClick={() => startNewSale()} 
                                        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-red-400 dark:border-red-600 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 shadow-sm hover:shadow-md"
                                    >
                                        <span className="w-4 h-4 block"><CancelIcon /></span>
                                        <span className="mr-2">{AR_LABELS.cancel}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className="mb-4">
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">ملخص الفاتورة</h3>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.subtotal}:</span>
                                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{currentInvoice.subtotal.toFixed(2)} ر.س</span>
                                    </div>
                                    <div className="flex items-center justify-end gap-2">
                                        <label htmlFor="invoiceDiscount" className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{AR_LABELS.invoiceDiscount}:</label>
                                        <input
                                            type="number"
                                            id="invoiceDiscount"
                                            value={currentInvoice.invoiceDiscount}
                                            onChange={e => setCurrentInvoice(inv => ({...inv, invoiceDiscount: parseFloat(e.target.value) || 0}))}
                                            className="w-20 sm:w-24 text-xs sm:text-sm text-center border border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 rounded-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 py-1.5"
                                        />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.totalDiscount}:</span>
                                        <span className="text-sm sm:text-base font-semibold text-red-600">{(currentInvoice.totalItemDiscount + currentInvoice.invoiceDiscount).toFixed(2)} ر.س</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{AR_LABELS.tax} (15%):</span>
                                        <span className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">{currentInvoice.tax.toFixed(2)} ر.س</span>
                                    </div>
                                    <div className="border-t-2 border-orange-300 dark:border-orange-700 pt-3 mt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-200">{AR_LABELS.grandTotal}:</span>
                                            <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{currentInvoice.grandTotal.toFixed(2)} ر.س</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Method & Confirm */}
                            <div>
                                <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 text-right">طريقة الدفع</h3>
                                <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Cash'); setCreditPaidAmount(0); }} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Cash' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.cash}
                                        </button>
                                        <button 
                                            onClick={() => { setSelectedPaymentMethod('Card'); setCreditPaidAmount(0); }} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Card' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.visa}
                                        </button>
                                        <button 
                                            onClick={() => setSelectedPaymentMethod('Credit')} 
                                            className={`p-2 sm:p-3 rounded-xl border-2 text-center font-semibold text-xs sm:text-sm transition-all duration-200 ${
                                                selectedPaymentMethod === 'Credit' 
                                                    ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/40 text-orange-700 dark:text-orange-300 shadow-lg scale-105' 
                                                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20'
                                            }`}
                                        >
                                            {AR_LABELS.credit}
                                        </button>
                                    </div>
                                    {selectedPaymentMethod === 'Credit' && (
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 text-right mb-1.5">{AR_LABELS.amountPaid}</label>
                                            <input 
                                                type="number" 
                                                value={creditPaidAmount} 
                                                onChange={e => setCreditPaidAmount(parseFloat(e.target.value) || 0)} 
                                                className="w-full p-2 text-sm sm:text-base border-2 border-orange-300 dark:border-orange-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-center font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
                                                min="0" 
                                            />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 sm:p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <ToggleSwitch
                                            enabled={autoPrintEnabled}
                                            onChange={setAutoPrintEnabled}
                                        />
                                        <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                                            {AR_LABELS.autoPrintInvoice}
                                        </label>
                                    </div>
                                    <button 
                                        onClick={handleFinalizePayment} 
                                        disabled={currentInvoice.items.length === 0} 
                                        className="w-full px-4 py-3 text-sm sm:text-base font-bold text-white bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:via-gray-600 dark:disabled:to-gray-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 disabled:cursor-not-allowed disabled:scale-100"
                                    >
                                        {AR_LABELS.confirmPayment}
                                    </button>
                                </div>
                            </div>
                        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4" onClick={handleClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-2xl text-right max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-3 sm:mb-4">{AR_LABELS.returnProduct}</h2>
                
                <form onSubmit={handleSearch} className="flex items-center gap-2 mb-3 sm:mb-4">
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchProductPlaceholder} className="w-full pl-3 pr-8 sm:pr-10 py-2 text-sm sm:text-base rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                    <button type="submit" className="p-2 bg-blue-500 text-white rounded-md flex-shrink-0"><SearchIcon className="h-4 w-4 sm:h-5 sm:w-5"/></button>
                </form>

                <div className="space-y-3 sm:space-y-4">
                    <div>
                        <h3 className="font-semibold text-sm sm:text-base mb-2">{AR_LABELS.productsToReturn}</h3>
                        <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto border rounded-md p-2 dark:border-gray-700">
                            {returnItems.length > 0 ? returnItems.map(item => (
                                <div key={item.productId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2 rounded">
                                    <span className="text-xs sm:text-sm">{item.name} <span className="text-xs text-gray-500">({item.unitPrice.toFixed(2)} ر.س)</span></span>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <label className="text-xs sm:text-sm whitespace-nowrap">{AR_LABELS.returnQuantity}:</label>
                                        <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.productId, e.target.value)} min="1" className="w-16 sm:w-20 text-xs sm:text-sm text-center border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md py-1"/>
                                    </div>
                                </div>
                            )) : <p className="text-center text-xs sm:text-sm text-gray-500 py-4">{AR_LABELS.noItemsInCart}</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs sm:text-sm font-medium mb-1">{AR_LABELS.reasonForRefund}</label>
                        <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="w-full text-sm sm:text-base border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-right bg-white dark:bg-gray-700 py-1.5 sm:py-2 px-2 sm:px-3"/>
                    </div>
                     <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.refundMethod}</label>
                        <CustomDropdown
                            id="refund-method-dropdown"
                            value={refundMethod}
                            onChange={(value) => setRefundMethod(value as any)}
                            options={[
                                { value: 'Cash', label: AR_LABELS.cash },
                                { value: 'Card', label: AR_LABELS.card },
                                { value: 'Customer Credit', label: AR_LABELS.customerCredit }
                            ]}
                            placeholder={AR_LABELS.refundMethod}
                            className="w-full"
                        />
                    </div>
                    <div className="text-left text-lg sm:text-xl font-bold"><span>{AR_LABELS.totalReturnValue}: </span><span className="text-red-600">{totalReturnValue.toFixed(2)} ر.س</span></div>
                    <div className="flex flex-col sm:flex-row justify-start gap-2 sm:gap-4 sm:space-x-4 sm:space-x-reverse pt-3 sm:pt-4">
                        <button onClick={handleConfirm} className="px-4 py-2 text-sm sm:text-base bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">{AR_LABELS.confirmReturn}</button>
                        <button onClick={handleClose} className="px-4 py-2 text-sm sm:text-base bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">{AR_LABELS.cancel}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSPage;