import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { PurchaseOrder, Supplier, PurchaseItem, Product, PurchaseStatus, PurchasePaymentMethod, ChequeDetails, SupplierPayment } from '../types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon, ViewIcon, CancelIcon, AddPaymentIcon, PrintIcon, ExportIcon
} from '../constants';
import MetricCard from './MetricCard';

// --- MOCK DATA ---
const MOCK_SUPPLIERS_DATA: Supplier[] = [
    { id: 'supp-1', name: 'شركة المواد الغذائية المتحدة', contactPerson: 'أحمد خالد', phone: '0112345678', address: 'الرياض, المنطقة الصناعية', notes: 'مورد رئيسي للمواد الجافة', previousBalance: 15000 },
    { id: 'supp-2', name: 'موردو الإلكترونيات الحديثة', contactPerson: 'سارة عبدالله', phone: '0128765432', address: 'جدة, حي الشاطئ', notes: '', previousBalance: 0 },
    { id: 'supp-3', name: 'شركة المشروبات العالمية', contactPerson: 'محمد علي', phone: '0134567890', address: 'الدمام, ميناء الملك عبدالعزيز', notes: 'الدفع عند الاستلام فقط', previousBalance: 5250.50 },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 4500, costPrice: 4200, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung S23', category: 'إلكترونيات', price: 2800, costPrice: 2500, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'كوكا كولا', category: 'مشروبات', price: 2.50, costPrice: 1.50, stock: 200, barcode: 'COKE-CAN-123', expiryDate: '2024-12-01', createdAt: '2023-12-01' },
  { id: 4, name: 'أرز بسمتي (10 كجم)', category: 'مواد غذائية', price: 50, costPrice: 45, stock: 80, barcode: 'RICE-BAS-10KG', expiryDate: '2025-06-01', createdAt: '2023-10-01' },
];

const createInitialPurchases = (): PurchaseOrder[] => [
    { id: `PO-001`, supplierId: MOCK_SUPPLIERS_DATA[0].id, supplierName: MOCK_SUPPLIERS_DATA[0].name, items: [{ productId: 4, productName: 'أرز بسمتي (10 كجم)', unit: 'كيس', quantity: 100, cost: 45, total: 4500 }], subtotal: 4500, tax: 15, discount: 0, totalAmount: 5175, status: 'Completed', purchaseDate: '2024-07-15T10:00:00Z', paymentMethod: 'Bank Transfer' },
    { id: `PO-002`, supplierId: MOCK_SUPPLIERS_DATA[1].id, supplierName: MOCK_SUPPLIERS_DATA[1].name, items: [{ productId: 1, productName: 'لابتوب Dell XPS 15', unit: 'قطعة', quantity: 10, cost: 4200, total: 42000 }], subtotal: 42000, tax: 15, discount: 1000, totalAmount: 47150, status: 'Pending', purchaseDate: '2024-07-20T14:30:00Z', paymentMethod: 'Credit' },
    { id: `PO-003`, supplierId: MOCK_SUPPLIERS_DATA[2].id, supplierName: MOCK_SUPPLIERS_DATA[2].name, items: [ { productId: 3, productName: 'كوكا كولا', unit: 'كرتون', quantity: 50, cost: 48, total: 2400 } ], subtotal: 2400, tax: 15, discount: 0, totalAmount: 2760, status: 'Pending', purchaseDate: new Date().toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 2760, chequeDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), chequeNumber: '10025', bankName: 'بنك الراجحي', status: 'Pending' } },
];

const MOCK_PAYMENTS_DATA: SupplierPayment[] = [
    { id: UUID(), supplierId: MOCK_SUPPLIERS_DATA[0].id, purchaseId: 'PO-001', amount: 5175, method: 'Bank Transfer', date: '2024-07-16T09:00:00Z' },
    { id: UUID(), supplierId: MOCK_SUPPLIERS_DATA[2].id, amount: 2000, method: 'Cash', date: '2024-07-18T12:00:00Z', notes: 'دفعة تحت الحساب' },
];

interface SupplierAccountSummary { supplierId: string; supplierName: string; totalPurchases: number; totalPaid: number; balance: number; lastPaymentDate: string | null; }

// --- UTILS & CONSTANTS ---
const STATUS_STYLES: Record<PurchaseStatus, string> = { 'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', 'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', };
const STATUS_LABELS: Record<PurchaseStatus, string> = { 'Pending': AR_LABELS.pending, 'Completed': AR_LABELS.completed, 'Cancelled': AR_LABELS.cancelled, };
const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = { 'Cash': AR_LABELS.cash, 'Bank Transfer': AR_LABELS.bankTransfer, 'Credit': AR_LABELS.credit, 'Cheque': AR_LABELS.cheque, };
const EMPTY_PURCHASE_ORDER: Omit<PurchaseOrder, 'id'> = { supplierId: '', supplierName: '', items: [], subtotal: 0, tax: 15, discount: 0, totalAmount: 0, status: 'Pending', purchaseDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', notes: '', };
type PaymentTarget = { supplier: Supplier; purchaseId?: string; defaultAmount: number; } | null;

// --- MODAL COMPONENTS ---
const SupplierFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newSupplier: Supplier) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const handleSave = () => { if (!name.trim()) { alert('اسم المورد مطلوب.'); return; } onSave({ id: UUID(), name, contactPerson, phone, previousBalance: 0, }); setName(''); setContactPerson(''); setPhone(''); };
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.addNewSupplier}</h2><div className="space-y-4"><input type="text" placeholder={AR_LABELS.supplier} value={name} onChange={e => setName(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/><input type="text" placeholder={AR_LABELS.contactPerson} value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/><input type="text" placeholder={AR_LABELS.phone} value={phone} onChange={e => setPhone(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
}

const SimpleAddProductModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newProduct: Product) => void; }> = ({ isOpen, onClose, onSave }) => {
    const EMPTY_PRODUCT = { name: '', category: 'مواد غذائية', costPrice: 0, price: 0, barcode: '' };
    const [productData, setProductData] = useState(EMPTY_PRODUCT);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setProductData(prev => ({...prev, [name]: type === 'number' ? parseFloat(value) : value }));
    };

    const handleSave = () => {
        if (!productData.name || productData.costPrice <= 0 || productData.price <= 0) {
            alert("يرجى ملء اسم المنتج والتكلفة والسعر.");
            return;
        }
        const newProduct: Product = {
            id: Date.now(), // Simple unique ID for mock purposes
            name: productData.name,
            category: productData.category,
            price: productData.price,
            costPrice: productData.costPrice,
            stock: 0,
            barcode: productData.barcode || `AUTO-${Date.now()}`,
            expiryDate: '',
            createdAt: new Date().toISOString(),
        };
        onSave(newProduct);
        setProductData(EMPTY_PRODUCT);
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg text-right" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.addNewProduct}</h2>
                <div className="space-y-4">
                    <input name="name" value={productData.name} onChange={handleChange} placeholder={AR_LABELS.productName} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                    <input name="costPrice" type="number" value={productData.costPrice} onChange={handleChange} placeholder={AR_LABELS.unitCost} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                    <input name="price" type="number" value={productData.price} onChange={handleChange} placeholder={AR_LABELS.price} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                    <input name="barcode" value={productData.barcode} onChange={handleChange} placeholder={AR_LABELS.barcode} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                </div>
                 <div className="flex justify-start space-x-4 space-x-reverse pt-4">
                    <button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
                </div>
            </div>
        </div>
    );
};


const PurchaseFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (purchase: PurchaseOrder) => void; purchaseToEdit: PurchaseOrder | null; suppliers: Supplier[]; products: Product[]; setProducts: React.Dispatch<React.SetStateAction<Product[]>>; onAddNewSupplier: () => void; }> = ({ isOpen, onClose, onSave, purchaseToEdit, suppliers, products, setProducts, onAddNewSupplier }) => {
    const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id'>>(EMPTY_PURCHASE_ORDER);
    const [productSearch, setProductSearch] = useState('');
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

    useEffect(() => { const initialData = purchaseToEdit ? { ...purchaseToEdit } : { ...EMPTY_PURCHASE_ORDER }; if (initialData.paymentMethod === 'Cheque' && !initialData.chequeDetails) { initialData.chequeDetails = { chequeAmount: 0, chequeDueDate: '', status: 'Pending' }; } setFormData(initialData); }, [purchaseToEdit, isOpen]);
    useEffect(() => { const subtotal = formData.items.reduce((acc, item) => acc + item.total, 0); const totalAfterDiscount = subtotal - formData.discount; const taxAmount = totalAfterDiscount * (formData.tax / 100); const totalAmount = totalAfterDiscount + taxAmount; setFormData(prev => ({ ...prev, subtotal, totalAmount, chequeDetails: prev.paymentMethod === 'Cheque' ? { ...prev.chequeDetails, chequeAmount: totalAmount, chequeDueDate: prev.chequeDetails?.chequeDueDate || '', status: prev.chequeDetails?.status || 'Pending' } : undefined })); }, [formData.items, formData.discount, formData.tax, formData.paymentMethod]);
    
    const handleSaveNewProduct = (newProduct: Product) => {
        setProducts(prev => [...prev, newProduct]);
        const newPurchaseItem: PurchaseItem = {
            productId: newProduct.id,
            productName: newProduct.name,
            unit: 'قطعة',
            quantity: 1,
            cost: newProduct.costPrice,
            total: newProduct.costPrice,
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newPurchaseItem] }));
        setIsAddProductModalOpen(false);
    };
    
    const handleAddItem = (product: Product) => { const newItem: PurchaseItem = { productId: product.id, productName: product.name, unit: 'قطعة', quantity: 1, cost: product.costPrice, total: product.costPrice }; setFormData(prev => ({ ...prev, items: [...prev.items, newItem] })); setProductSearch(''); };
    const handleItemChange = (productId: number, field: 'quantity' | 'cost' | 'unit', value: string | number) => { setFormData(prev => ({ ...prev, items: prev.items.map(item => { if (item.productId === productId) { const updatedItem = { ...item, [field]: value }; if (field === 'quantity' || field === 'cost') { updatedItem.total = updatedItem.quantity * updatedItem.cost; } return updatedItem; } return item; }) })); };
    const handleRemoveItem = (productId: number) => { setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) })); };
    const handleSupplierChange = (supplierId: string) => { const supplier = suppliers.find(s => s.id === supplierId); if (supplier) { setFormData(prev => ({...prev, supplierId: supplier.id, supplierName: supplier.name})); } };
    const handleChequeDetailChange = (field: keyof ChequeDetails, value: string | number) => { setFormData(prev => ({ ...prev, chequeDetails: { chequeAmount: prev.chequeDetails?.chequeAmount || 0, chequeDueDate: prev.chequeDetails?.chequeDueDate || '', status: prev.chequeDetails?.status || 'Pending', ...prev.chequeDetails, [field]: value } })) };
    const handleSubmit = () => { if (!formData.supplierId || formData.items.length === 0) { alert("يرجى اختيار مورد وإضافة منتجات."); return; } if (formData.paymentMethod === 'Cheque' && !formData.chequeDetails?.chequeDueDate) { alert("تاريخ استحقاق الشيك مطلوب."); return; } onSave({ id: purchaseToEdit?.id || `PO-${UUID()}`, ...formData }); };
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl text-right" onClick={e => e.stopPropagation()}><div className="max-h-[85vh] overflow-y-auto pr-2 space-y-4"><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{purchaseToEdit ? AR_LABELS.edit : AR_LABELS.addNewPurchase}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="flex items-center gap-2"><select value={formData.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"><option value="" disabled>{AR_LABELS.selectSupplier}</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button onClick={onAddNewSupplier} className="p-2 bg-orange-500 text-white rounded-md"><PlusIcon className="h-4 w-4"/></button></div><input type="date" value={formData.purchaseDate.toString().split('T')[0]} onChange={e => setFormData(f=>({...f, purchaseDate: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/><select value={formData.paymentMethod} onChange={e => setFormData(f=>({...f, paymentMethod: e.target.value as PurchasePaymentMethod}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">{Object.keys(PAYMENT_METHOD_LABELS).map(key => <option key={key} value={key}>{PAYMENT_METHOD_LABELS[key as PurchasePaymentMethod]}</option>)}</select></div>{formData.paymentMethod === 'Cheque' && (<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-400 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4"><input type="text" placeholder={AR_LABELS.chequeNumber} value={formData.chequeDetails?.chequeNumber || ''} onChange={e => handleChequeDetailChange('chequeNumber', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="number" placeholder={AR_LABELS.chequeAmount} value={formData.chequeDetails?.chequeAmount || 0} onChange={e => handleChequeDetailChange('chequeAmount', parseFloat(e.target.value))} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="date" placeholder={AR_LABELS.chequeDueDate} value={formData.chequeDetails?.chequeDueDate.split('T')[0] || ''} onChange={e => handleChequeDetailChange('chequeDueDate', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="text" placeholder={AR_LABELS.bankName} value={formData.chequeDetails?.bankName || ''} onChange={e => handleChequeDetailChange('bankName', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><textarea placeholder={AR_LABELS.chequeNotes} value={formData.chequeDetails?.notes || ''} onChange={e => handleChequeDetailChange('notes', e.target.value)} className="md:col-span-2 w-full border-gray-300 dark:border-gray-600 rounded-md"/></div>)}
                <div className="relative flex items-center gap-2">
                    <input type="text" placeholder="ابحث عن منتج لإضافته..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                    <button type="button" onClick={() => setIsAddProductModalOpen(true)} className="px-3 py-2 bg-indigo-500 text-white rounded-md text-sm whitespace-nowrap">{AR_LABELS.addNewProduct}</button>
                    {productSearch && (<div className="absolute top-full left-0 z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">{products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (<div key={p.id} onClick={() => handleAddItem(p)} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/50 cursor-pointer">{p.name}</div>))}</div>)}
                </div>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md"><table className="min-w-full"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr><th className="p-2 text-xs">{AR_LABELS.productName}</th><th className="p-2 text-xs">{AR_LABELS.unit}</th><th className="p-2 text-xs">{AR_LABELS.quantity}</th><th className="p-2 text-xs">{AR_LABELS.unitCost}</th><th className="p-2 text-xs">{AR_LABELS.totalAmount}</th><th></th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{formData.items.map(item => (<tr key={item.productId}><td className="p-2 text-sm">{item.productName}</td><td className="p-1"><input type="text" value={item.unit} onChange={e => handleItemChange(item.productId, 'unit', e.target.value)} className="w-20 p-1 border rounded-md"/></td><td className="p-1"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', parseFloat(e.target.value))} className="w-20 p-1 border rounded"/></td><td className="p-1"><input type="number" value={item.cost} onChange={e => handleItemChange(item.productId, 'cost', parseFloat(e.target.value))} className="w-24 p-1 border rounded"/></td><td className="p-2 text-sm font-semibold">{item.total.toFixed(2)}</td><td className="p-1"><button onClick={() => handleRemoveItem(item.productId)} className="text-red-500"><DeleteIcon/></button></td></tr>))}</tbody></table></div><div className="flex justify-between items-end"><div className="w-1/2"><textarea placeholder="ملاحظات..." value={formData.notes} onChange={e => setFormData(f=>({...f, notes: e.target.value}))} className="w-full h-24 border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/></div><div className="w-1/3 space-y-1 text-sm"><div className="flex justify-between"><span>{AR_LABELS.subtotal}:</span><span>{formData.subtotal.toFixed(2)}</span></div><div className="flex justify-between items-center"><label>{AR_LABELS.discount}:</label><input type="number" value={formData.discount} onChange={e=>setFormData(f=>({...f, discount: parseFloat(e.target.value)}))} className="w-24 p-1 border rounded text-left"/></div><div className="flex justify-between items-center"><label>{AR_LABELS.tax} (%):</label><input type="number" value={formData.tax} onChange={e=>setFormData(f=>({...f, tax: parseFloat(e.target.value)}))} className="w-24 p-1 border rounded text-left"/></div><div className="flex justify-between font-bold text-lg border-t pt-1">{AR_LABELS.grandTotal}:<span>{formData.totalAmount.toFixed(2)}</span></div></div></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button onClick={handleSubmit} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{AR_LABELS.cancel}</button></div></div>
                <SimpleAddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onSave={handleSaveNewProduct} />
            </div></div>);
};

const AddPaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (payment: SupplierPayment) => void; target: PaymentTarget; }> = ({ isOpen, onClose, onSave, target }) => {
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    useEffect(() => { if (target) { setAmount(target.defaultAmount); setMethod('Cash'); setDate(new Date().toISOString().split('T')[0]); } }, [target, isOpen]);
    if (!isOpen || !target) return null;
    const handleSave = () => { if (amount <= 0) return; onSave({ id: UUID(), supplierId: target.supplier.id, purchaseId: target.purchaseId, amount, method, date }); onClose(); };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.addPayment} لـ {target.supplier.name}</h2><div className="space-y-4"><input type="number" placeholder={AR_LABELS.paymentAmount} value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/><select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"><option value="Cash">{AR_LABELS.cash}</option><option value="Bank Transfer">{AR_LABELS.bankTransfer}</option><option value="Cheque">{AR_LABELS.cheque}</option></select><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
}

const SupplierStatementModal: React.FC<{ summary: SupplierAccountSummary | null; purchases: PurchaseOrder[]; payments: SupplierPayment[]; onClose: () => void; }> = ({ summary, purchases, payments, onClose }) => {
    if (!summary) return null;
    const transactions = useMemo(() => {
        const supplierPurchases = purchases.filter(p => p.supplierId === summary.supplierId).map(p => ({ date: p.purchaseDate, type: 'purchase' as const, description: `${AR_LABELS.purchaseOrder} #${p.id}`, debit: p.totalAmount, credit: 0, }));
        const supplierPayments = payments.filter(p => p.supplierId === summary.supplierId).map(p => ({ date: p.date, type: 'payment' as const, description: `${AR_LABELS.paymentMade} - ${p.method}`, debit: 0, credit: p.amount, }));
        return [...supplierPurchases, ...supplierPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc, trans) => { const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0; const newBalance = prevBalance + trans.debit - trans.credit; acc.push({ ...trans, balance: newBalance }); return acc; }, [] as (typeof supplierPurchases[0] & { balance: number })[]);
    }, [summary, purchases, payments]);
    return (<div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl text-right" onClick={e => e.stopPropagation()}><div id="printable-receipt" className="p-6">
        <div className="flex justify-between items-start pb-4 border-b dark:border-gray-700">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.supplierStatement}</h2>
                <p className="text-lg text-gray-700 dark:text-gray-300">{summary.supplierName}</p>
            </div>
            <div className="text-left text-sm">
                <p><strong>{AR_LABELS.totalPurchases}:</strong> {summary.totalPurchases.toFixed(2)}</p>
                <p><strong>{AR_LABELS.supplierTotalPaid}:</strong> {summary.totalPaid.toFixed(2)}</p>
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
    </div><div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg print-hidden"><button onClick={() => window.print()} className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md"><PrintIcon/><span className="mr-2">{AR_LABELS.printReceipt}</span></button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
};

// FIX: Added the main component and default export to fix the error.
const PurchasesPage: React.FC = () => {
    const [purchases, setPurchases] = useState<PurchaseOrder[]>(createInitialPurchases());
    const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS_DATA);
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [payments, setPayments] = useState<SupplierPayment[]>(MOCK_PAYMENTS_DATA);
    const [activeTab, setActiveTab] = useState('orders');
    const [purchaseModal, setPurchaseModal] = useState<{isOpen: boolean, data: PurchaseOrder | null}>({isOpen: false, data: null});
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [paymentModalTarget, setPaymentModalTarget] = useState<PaymentTarget>(null);
    const [statementModalTarget, setStatementModalTarget] = useState<SupplierAccountSummary | null>(null);

    const handleSavePurchase = (purchase: PurchaseOrder) => {
        setPurchases(prev => {
            const exists = prev.some(p => p.id === purchase.id);
            if (exists) {
                return prev.map(p => p.id === purchase.id ? purchase : p);
            }
            return [purchase, ...prev];
        });
        setPurchaseModal({isOpen: false, data: null});
    };
    
    const handleSaveSupplier = (supplier: Supplier) => {
        setSuppliers(prev => [supplier, ...prev]);
        setSupplierModalOpen(false);
    };

    const handleSavePayment = (payment: SupplierPayment) => {
        setPayments(prev => [payment, ...prev]);
        setPaymentModalTarget(null);
    };

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.purchaseManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.purchaseManagementDescription}</p>
            </div>
            {/* Tabs can be added here if needed */}
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <PurchaseOrdersView 
                    purchases={purchases} 
                    onAdd={() => setPurchaseModal({isOpen: true, data: null})} 
                    onEdit={(p) => setPurchaseModal({isOpen: true, data: p})} 
                />
            </div>
            
            <PurchaseFormModal 
                isOpen={purchaseModal.isOpen}
                onClose={() => setPurchaseModal({isOpen: false, data: null})}
                onSave={handleSavePurchase}
                purchaseToEdit={purchaseModal.data}
                suppliers={suppliers}
                products={products}
                setProducts={setProducts}
                onAddNewSupplier={() => setSupplierModalOpen(true)}
            />
            <SupplierFormModal
                isOpen={supplierModalOpen}
                onClose={() => setSupplierModalOpen(false)}
                onSave={handleSaveSupplier}
            />
             <AddPaymentModal 
                isOpen={!!paymentModalTarget}
                onClose={() => setPaymentModalTarget(null)}
                onSave={handleSavePayment}
                target={paymentModalTarget}
            />
            <SupplierStatementModal
                summary={statementModalTarget}
                purchases={purchases}
                payments={payments}
                onClose={() => setStatementModalTarget(null)}
            />
        </div>
    );
};

const PurchaseOrdersView: React.FC<{
    purchases: PurchaseOrder[];
    onAdd: () => void;
    onEdit: (p: PurchaseOrder) => void;
}> = ({ purchases, onAdd, onEdit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', supplierId: 'all' });

    const filteredPurchases = useMemo(() => {
        return purchases.filter(p => {
            const matchesSearch = searchTerm ? p.id.toLowerCase().includes(searchTerm.toLowerCase()) || p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const matchesStatus = filters.status !== 'all' ? p.status === filters.status : true;
            return matchesSearch && matchesStatus;
        }).sort((a,b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    }, [purchases, searchTerm, filters]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-1/2">
                    <input type="text" placeholder={AR_LABELS.searchByPOorSupplier} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border text-right"/>
                    <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                    <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="p-2 border rounded-md text-right">
                        <option value="all">كل الحالات</option>
                        {Object.keys(STATUS_LABELS).map(s => <option key={s} value={s}>{STATUS_LABELS[s as PurchaseStatus]}</option>)}
                    </select>
                    <button onClick={onAdd} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                        <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.addNewPurchase}</span>
                    </button>
                </div>
            </div>
             <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.poNumber}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.purchaseDate}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.supplier}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.totalAmount}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.paymentMethod}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase">{AR_LABELS.status}</th>
                            <th className="px-4 py-2 text-xs font-medium uppercase text-center">{AR_LABELS.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredPurchases.map(p => (
                            <tr key={p.id}>
                                <td className="px-4 py-2 text-sm font-mono text-blue-600 dark:text-blue-400">{p.id}</td>
                                <td className="px-4 py-2 text-sm">{new Date(p.purchaseDate).toLocaleDateString('ar-SA')}</td>
                                <td className="px-4 py-2 text-sm font-medium">{p.supplierName}</td>
                                <td className="px-4 py-2 text-sm font-semibold">{p.totalAmount.toFixed(2)}</td>
                                <td className="px-4 py-2 text-sm">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</td>
                                <td className="px-4 py-2 text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                                <td className="px-4 py-2 text-center text-sm">
                                    <button onClick={() => alert('View details for ' + p.id)} title={AR_LABELS.viewDetails} className="p-1 ml-2 text-blue-600"><ViewIcon/></button>
                                    <button onClick={() => onEdit(p)} title={AR_LABELS.edit} className="p-1 ml-2 text-indigo-600"><EditIcon/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PurchasesPage;
