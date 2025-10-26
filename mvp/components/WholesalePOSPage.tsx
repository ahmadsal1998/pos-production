import React, { useState, useMemo, useCallback } from 'react';
import { WholesaleProduct, Customer, WholesaleInvoice, WholesalePOSCartItem, WholesaleProductUnit } from '../types';
import { AR_LABELS, UUID, SearchIcon, DeleteIcon, PlusIcon, CancelIcon, PrintIcon } from '../constants';

// --- MOCK DATA ---
const MOCK_WHOLESALE_PRODUCTS: WholesaleProduct[] = [
  { id: 1, name: 'كوكا كولا', category: 'مشروبات', brand: 'كوكا كولا', createdAt: '2023-01-15', imageUrl: 'https://picsum.photos/seed/coke/200/200', units: [
    { name: 'حبة', price: 2.50, cost: 1.50, stock: 500, barcode: 'COKE-P' },
    { name: 'كرتون (24 حبة)', price: 55.00, cost: 36.00, stock: 20, barcode: 'COKE-C24' },
  ]},
  { id: 2, name: 'ماء (صغير)', category: 'مشروبات', brand: 'نستله', createdAt: '2023-02-20', imageUrl: 'https://picsum.photos/seed/water/200/200', units: [
    { name: 'حبة', price: 1.00, cost: 0.50, stock: 1000, barcode: 'WATER-P' },
    { name: 'كرتون (40 حبة)', price: 35.00, cost: 20.00, stock: 25, barcode: 'WATER-C40' },
  ]},
  { id: 3, name: 'ليز بالملح', category: 'وجبات خفيفة', brand: 'ليز', createdAt: '2023-03-10', imageUrl: 'https://picsum.photos/seed/lays/200/200', units: [
    { name: 'حبة', price: 3.00, cost: 1.80, stock: 300, barcode: 'LAYS-P' },
    { name: 'صندوق (12 حبة)', price: 33.00, cost: 21.60, stock: 25, barcode: 'LAYS-B12' },
  ]},
  { id: 4, name: 'هاتف Samsung S23', category: 'إلكترونيات', brand: 'سامسونج', createdAt: '2023-04-01', imageUrl: 'https://picsum.photos/seed/samsung/200/200', units: [
    { name: 'جهاز', price: 850, cost: 700, stock: 50, barcode: 'SAM-S23' },
  ]},
];

const MOCK_WHOLESALE_CUSTOMERS: Customer[] = [
  { id: UUID(), name: 'متجر بقالة المدينة', phone: '0501112222', previousBalance: 2500, companyName: 'شركة المدينة للتجارة', address: 'الرياض, شارع الملك فهد' },
  { id: UUID(), name: 'سوبرماركت الواحة', phone: '0553334444', previousBalance: 0, companyName: 'مؤسسة الواحة', address: 'جدة, حي السلامة' },
];

const ALL_CATEGORIES = [...new Set(MOCK_WHOLESALE_PRODUCTS.map(p => p.category))];
const ALL_BRANDS = [...new Set(MOCK_WHOLESALE_PRODUCTS.map(p => p.brand))];

const generateNewInvoice = (cashierName: string): WholesaleInvoice => ({
  id: `WINV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
  date: new Date(),
  cashier: cashierName,
  customer: null,
  items: [],
  subtotal: 0,
  totalDiscount: 0,
  grandTotal: 0,
  paymentMethod: null,
});

const WholesalePOSPage: React.FC = () => {
    const [invoice, setInvoice] = useState<WholesaleInvoice>(generateNewInvoice(AR_LABELS.ahmadSai));
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: 'all', brand: 'all' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');
    const [saleCompleted, setSaleCompleted] = useState(false);
    const [gridQuantities, setGridQuantities] = useState<Record<string, string>>({});

    const calculateTotals = useCallback((items: WholesalePOSCartItem[], discount: number) => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = subtotal - discount;
        return { subtotal, grandTotal, totalDiscount: discount };
    }, []);
    
    const handleGridQuantityChange = (productId: number, unitName: string, value: string) => {
        const key = `${productId}-${unitName}`;
        if (/^\d*$/.test(value)) { // Only allow numeric input, but can be empty
            setGridQuantities(prev => ({
                ...prev,
                [key]: value
            }));
        }
    };

    const handleAddItem = (product: WholesaleProduct, unit: WholesaleProductUnit) => {
        if (!selectedCustomer) {
            alert('الرجاء اختيار عميل أولاً.');
            return;
        }
        
        const key = `${product.id}-${unit.name}`;
        const quantityToAdd = parseInt(gridQuantities[key] || '1', 10);

        if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
            return; 
        }

        const existingItem = invoice.items.find(item => item.productId === product.id && item.unitName === unit.name);
        const currentQuantityInCart = existingItem?.quantity || 0;
        const totalQuantityRequested = currentQuantityInCart + quantityToAdd;

        if (totalQuantityRequested > unit.stock) {
            alert(`إجمالي الكمية المطلوبة (${totalQuantityRequested}) لـ ${product.name} (${unit.name}) يتجاوز المخزون المتوفر (${unit.stock}).`);
            return;
        }

        let newItems: WholesalePOSCartItem[];
        if (existingItem) {
            newItems = invoice.items.map(item =>
                item.productId === product.id && item.unitName === unit.name
                    ? { ...item, quantity: totalQuantityRequested, total: totalQuantityRequested * item.unitPrice }
                    : item
            );
        } else {
            const newItem: WholesalePOSCartItem = {
                productId: product.id,
                name: product.name,
                unitName: unit.name,
                quantity: quantityToAdd,
                unitPrice: unit.price,
                total: quantityToAdd * unit.price
            };
            newItems = [...invoice.items, newItem];
        }
        const totals = calculateTotals(newItems, invoice.totalDiscount);
        setInvoice(inv => ({...inv, items: newItems, ...totals }));
        
        // Reset grid quantity input
        setGridQuantities(prev => ({...prev, [key]: '1' }));
    };

    const handleUpdateQuantity = (productId: number, unitName: string, quantity: number) => {
        const productInDb = MOCK_WHOLESALE_PRODUCTS.find(p => p.id === productId);
        const unitInDb = productInDb?.units.find(u => u.name === unitName);

        if (unitInDb && quantity > unitInDb.stock) {
            alert(`الكمية المطلوبة (${quantity}) تتجاوز المخزون المتوفر (${unitInDb.stock}).`);
            return;
        }

        let newItems = invoice.items.map(item => 
            item.productId === productId && item.unitName === unitName 
            ? {...item, quantity, total: quantity * item.unitPrice} 
            : item
        );

        if (quantity < 1) {
            newItems = newItems.filter(item => !(item.productId === productId && item.unitName === unitName));
        }
        const totals = calculateTotals(newItems, invoice.totalDiscount);
        setInvoice(inv => ({...inv, items: newItems, ...totals }));
    };

    const handleDiscountChange = (discountValue: number) => {
        const discount = Math.max(0, discountValue);
        const totals = calculateTotals(invoice.items, discount);
        setInvoice(inv => ({ ...inv, ...totals }));
    };
    
    const handleClearCart = () => {
        if(window.confirm('هل أنت متأكد من أنك تريد إفراغ السلة؟')) {
            const totals = calculateTotals([], 0);
            setInvoice(inv => ({...inv, items: [], ...totals}));
        }
    };
    
    const handleSelectCustomer = (customerId: string) => {
        const customer = MOCK_WHOLESALE_CUSTOMERS.find(c => c.id === customerId);
        setSelectedCustomer(customer || null);
        setInvoice(inv => ({...inv, customer: customer || null}));
    };
    
    const openPaymentModal = () => {
        if(invoice.items.length === 0 || !selectedCustomer) return;
        setSelectedPaymentMethod('Cash');
        setPaymentModalOpen(true);
    };

    const handleFinalizeSale = () => {
        if (!invoice.customer || !selectedPaymentMethod) {
            alert('الرجاء اختيار عميل وطريقة دفع.');
            return;
        }
        let finalInvoice: WholesaleInvoice = { ...invoice, paymentMethod: selectedPaymentMethod };
        
        if (selectedPaymentMethod === 'Credit') {
            if (!dueDate) {
                alert('الرجاء تحديد تاريخ الاستحقاق.');
                return;
            }
            finalInvoice.dueDate = dueDate;
        }
        console.log("SALE FINALIZED: ", finalInvoice);
        setSaleCompleted(true);
        setPaymentModalOpen(false);
    };
    
    const startNewSale = () => {
        setSaleCompleted(false);
        setInvoice(generateNewInvoice(AR_LABELS.ahmadSai));
        setSelectedCustomer(null);
        setDueDate('');
        setGridQuantities({});
        setSelectedPaymentMethod(null);
    };
    
    const filteredProducts = useMemo(() => {
        return MOCK_WHOLESALE_PRODUCTS.filter(p => {
            const matchesSearch = searchTerm ? (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.units.some(u => u.barcode.toLowerCase().includes(searchTerm.toLowerCase()))) : true;
            const matchesCategory = filters.category !== 'all' ? p.category === filters.category : true;
            const matchesBrand = filters.brand !== 'all' ? p.brand === filters.brand : true;
            return matchesSearch && matchesCategory && matchesBrand;
        });
    }, [searchTerm, filters]);

    if (saleCompleted) {
       return (
            <div className="flex flex-col items-center justify-center h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl text-center p-8">
                <svg className="w-24 h-24 text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">{AR_LABELS.saleCompleted}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">رقم الفاتورة: {invoice.id}</p>
                <div className="flex space-x-4 space-x-reverse">
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
            {/* Left Panel (Products) */}
            <div className="w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={AR_LABELS.searchProductPlaceholder} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                            <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                        </div>
                        <select onChange={e => setFilters(f => ({...f, brand: e.target.value}))} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right"><option value="all">{AR_LABELS.allBrands}</option>{ALL_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}</select>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <button onClick={() => setFilters(f => ({...f, category: 'all'}))} className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap ${filters.category === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                            {AR_LABELS.allCategories}
                        </button>
                        {ALL_CATEGORIES.map(c => (
                            <button key={c} onClick={() => setFilters(f => ({...f, category: c}))} className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap ${filters.category === c ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(p => (
                            <div key={p.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex flex-col transition-shadow hover:shadow-md">
                                <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-t-lg" />
                                <div className="p-3 flex flex-col flex-grow">
                                    <h4 className="font-bold text-gray-800 dark:text-gray-100 text-md text-right">{p.name}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 text-right">{p.brand}</p>
                                    <div className="space-y-2 mt-auto">
                                        {p.units.map(u => (
                                            <div key={u.barcode} className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 text-right">{u.name}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 text-right">{u.price.toFixed(2)} ر.س / {u.stock} متوفر</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        value={gridQuantities[`${p.id}-${u.name}`] || ''}
                                                        onChange={(e) => handleGridQuantityChange(p.id, u.name, e.target.value)}
                                                        className="w-16 p-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-center focus:ring-orange-500 focus:border-orange-500"
                                                        aria-label={`Quantity for ${u.name}`}
                                                    />
                                                    <button onClick={() => handleAddItem(p, u)} className="flex-grow p-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition text-sm font-bold">
                                                        {AR_LABELS.addToCart}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                         {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-16 text-gray-500 dark:text-gray-400">
                                <p>{AR_LABELS.noSalesFound}</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>

            {/* Right Panel (Cart & Customer) */}
            <div className="w-1/3 flex flex-col gap-4">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-right">{AR_LABELS.customerDetails}</h3>
                    <select value={selectedCustomer?.id || ''} onChange={e => handleSelectCustomer(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-right">
                        <option value="" disabled>{AR_LABELS.selectWholesaleCustomer}</option>
                        {MOCK_WHOLESALE_CUSTOMERS.map(c => <option key={c.id} value={c.id}>{c.name} ({c.companyName})</option>)}
                    </select>
                    {selectedCustomer && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 text-right border-t border-gray-200 dark:border-gray-700 pt-2">
                        <p>{AR_LABELS.phone}: {selectedCustomer.phone}</p>
                        <p>{AR_LABELS.address}: {selectedCustomer.address}</p>
                    </div>
                    )}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col flex-grow">
                     <h3 className="font-bold text-gray-800 dark:text-gray-200 text-right mb-2">{AR_LABELS.orderSummary}</h3>
                     <div className="flex-grow overflow-y-auto border-t border-b border-gray-200 dark:border-gray-700 mb-2">
                        {invoice.items.length === 0 ? <p className="text-center text-gray-500 dark:text-gray-400 py-10">{AR_LABELS.noItemsInCart}</p> : 
                            invoice.items.map(item => (
                            <div key={`${item.productId}-${item.unitName}`} className="flex items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex-grow text-right">
                                    <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.name} <span className="text-gray-500 dark:text-gray-400">({item.unitName})</span></p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{item.unitPrice.toFixed(2)} ر.س</p>
                                </div>
                                <input type="number" value={item.quantity} onChange={e=>handleUpdateQuantity(item.productId, item.unitName, parseInt(e.target.value))} className="w-16 mx-2 text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded"/>
                                <p className="font-semibold w-20 text-left text-sm text-gray-800 dark:text-gray-200">{item.total.toFixed(2)}</p>
                            </div>
                            ))
                        }
                     </div>
                     <div className="space-y-1 text-right text-sm text-gray-700 dark:text-gray-300">
                         <p>{AR_LABELS.totalItems}: <span className="font-bold">{invoice.items.length}</span></p>
                         <p>{AR_LABELS.totalQuantity}: <span className="font-bold">{invoice.items.reduce((s, i) => s + i.quantity, 0)}</span></p>
                         <div className="flex items-center justify-between">
                            <input
                                type="number"
                                placeholder='0.00'
                                value={invoice.totalDiscount || ''}
                                onChange={e => handleDiscountChange(parseFloat(e.target.value) || 0)}
                                className="w-24 p-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md text-left"
                            />
                             <label>{AR_LABELS.discount}:</label>
                         </div>
                         <p className="text-xl font-bold text-orange-600 mt-2">{AR_LABELS.grandTotal}: <span>{invoice.grandTotal.toFixed(2)} ر.س</span></p>
                     </div>
                     <div className="mt-auto pt-4 flex gap-2">
                        <button onClick={handleClearCart} disabled={invoice.items.length === 0} className="w-full px-4 py-2 text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 rounded-md disabled:opacity-50">{AR_LABELS.clearCart}</button>
                        <button onClick={openPaymentModal} disabled={invoice.items.length === 0 || !selectedCustomer} className="w-full px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-gray-400 dark:disabled:bg-gray-600">{AR_LABELS.checkout}</button>
                     </div>
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-right">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">{AR_LABELS.checkout}</h2>
                        <div className="mb-4 p-4 bg-orange-50 dark:bg-gray-700 rounded-md text-center">
                            <p className="text-lg text-gray-600 dark:text-gray-300">{AR_LABELS.grandTotal}</p>
                            <p className="text-4xl font-mono font-bold text-orange-600">{invoice.grandTotal.toFixed(2)}</p>
                        </div>
                         <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{AR_LABELS.paymentMethod}</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button onClick={() => setSelectedPaymentMethod('Cash')} className={`p-3 rounded-md border-2 text-center font-semibold ${selectedPaymentMethod === 'Cash' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                    {AR_LABELS.cash}
                                </button>
                                <button onClick={() => setSelectedPaymentMethod('Card')} className={`p-3 rounded-md border-2 text-center font-semibold ${selectedPaymentMethod === 'Card' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                    {AR_LABELS.visa}
                                </button>
                                <button onClick={() => setSelectedPaymentMethod('Credit')} className={`p-3 rounded-md border-2 text-center font-semibold ${selectedPaymentMethod === 'Credit' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'}`}>
                                    {AR_LABELS.credit}
                                </button>
                            </div>
                        </div>
                        {selectedPaymentMethod === 'Credit' && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.dueDate}</label>
                                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md" />
                            </div>
                        )}
                        <div className="flex justify-between gap-2 mt-6">
                           <button onClick={() => setPaymentModalOpen(false)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">{AR_LABELS.cancel}</button>
                           <button onClick={handleFinalizeSale} className="w-full px-4 py-2 bg-green-500 text-white rounded-md">{AR_LABELS.confirmPayment}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WholesalePOSPage;