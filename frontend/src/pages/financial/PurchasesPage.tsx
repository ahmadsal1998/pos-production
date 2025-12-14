import React, { useState, useMemo, useEffect } from 'react';
import { PurchaseOrder, Supplier, PurchaseItem, PurchaseStatus, PurchasePaymentMethod, ChequeDetails, SupplierPayment } from '@/features/financial/types';
import { Product } from '@/shared/types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon, ViewIcon, CancelIcon, AddPaymentIcon, PrintIcon, ExportIcon, GridViewIcon, TableViewIcon
} from '@/shared/constants';
import PurchaseAnalytics from '@/features/financial/components/PurchaseAnalytics';
import PurchaseQuickActions from '@/features/financial/components/PurchaseQuickActions';
import SuppliersAnalytics from '@/features/financial/components/SuppliersAnalytics';
import SuppliersQuickActions from '@/features/financial/components/SuppliersQuickActions';
import { formatDate } from '@/shared/utils';
import { printReceipt } from '@/shared/utils/printUtils';
import PaymentsAnalytics from '@/features/financial/components/PaymentsAnalytics';
import PaymentsQuickActions from '@/features/financial/components/PaymentsQuickActions';
import QuickReports from '@/features/financial/components/QuickReports';
import SuppliersPage from './SuppliersPage';
import SupplierPaymentsPage from './SupplierPaymentsPage';
import PurchaseReportsPage from './PurchaseReportsPage';

type LayoutType = 'table' | 'grid';
type TabType = 'purchases' | 'suppliers' | 'payments' | 'reports';

// --- MOCK DATA ---
const MOCK_SUPPLIERS_DATA: Supplier[] = [
    { id: 'supp-1', name: 'شركة المواد الغذائية المتحدة', contactPerson: 'أحمد خالد', email: 'ahmad@supplier1.com', phone: '0112345678', address: 'الرياض, المنطقة الصناعية', notes: 'مورد رئيسي للمواد الجافة', previousBalance: 15000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'supp-2', name: 'موردو الإلكترونيات الحديثة', contactPerson: 'سارة عبدالله', email: 'sara@supplier2.com', phone: '0128765432', address: 'جدة, حي الشاطئ', notes: '', previousBalance: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'supp-3', name: 'شركة المشروبات العالمية', contactPerson: 'محمد علي', email: 'mohammed@supplier3.com', phone: '0134567890', address: 'الدمام, ميناء الملك عبدالعزيز', notes: 'الدفع عند الاستلام فقط', previousBalance: 5250.50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'لابتوب Dell XPS 15', category: 'إلكترونيات', price: 4500, costPrice: 4200, stock: 50, barcode: 'DELL-XPS15-12345', expiryDate: '2025-12-31', createdAt: '2023-01-15' },
  { id: 2, name: 'هاتف Samsung S23', category: 'إلكترونيات', price: 2800, costPrice: 2500, stock: 120, barcode: 'SAM-S23-67890', expiryDate: '2026-06-30', createdAt: new Date().toISOString() },
  { id: 3, name: 'كوكا كولا', category: 'مشروبات', price: 2.50, costPrice: 1.50, stock: 200, barcode: 'COKE-CAN-123', expiryDate: '2024-12-01', createdAt: '2023-12-01' },
  { id: 4, name: 'أرز بسمتي (10 كجم)', category: 'مواد غذائية', price: 50, costPrice: 45, stock: 80, barcode: 'RICE-BAS-10KG', expiryDate: '2025-06-01', createdAt: '2023-10-01' },
];

const createInitialPurchases = (): PurchaseOrder[] => [
    { id: `PO-001`, poNumber: 'PO-001', supplierId: MOCK_SUPPLIERS_DATA[0].id, supplierName: MOCK_SUPPLIERS_DATA[0].name, items: [{ productId: '4', productName: 'أرز بسمتي (10 كجم)', unit: 'كيس', quantity: 100, unitCost: 45, totalCost: 4500 }], subtotal: 4500, tax: 15, discount: 0, totalAmount: 5175, status: 'Completed', purchaseDate: '2024-07-15T10:00:00Z', paymentMethod: 'Bank Transfer', createdAt: '2024-07-15T10:00:00Z', updatedAt: '2024-07-15T10:00:00Z' },
    { id: `PO-002`, poNumber: 'PO-002', supplierId: MOCK_SUPPLIERS_DATA[1].id, supplierName: MOCK_SUPPLIERS_DATA[1].name, items: [{ productId: '1', productName: 'لابتوب Dell XPS 15', unit: 'قطعة', quantity: 10, unitCost: 4200, totalCost: 42000 }], subtotal: 42000, tax: 15, discount: 1000, totalAmount: 47150, status: 'Pending', purchaseDate: '2024-07-20T14:30:00Z', paymentMethod: 'Credit', createdAt: '2024-07-20T14:30:00Z', updatedAt: '2024-07-20T14:30:00Z' },
    { id: `PO-003`, poNumber: 'PO-003', supplierId: MOCK_SUPPLIERS_DATA[2].id, supplierName: MOCK_SUPPLIERS_DATA[2].name, items: [ { productId: '3', productName: 'كوكا كولا', unit: 'كرتون', quantity: 50, unitCost: 48, totalCost: 2400 } ], subtotal: 2400, tax: 15, discount: 0, totalAmount: 2760, status: 'Pending', purchaseDate: new Date().toISOString(), paymentMethod: 'Cheque', chequeDetails: { chequeAmount: 2760, chequeDueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), chequeNumber: '10025', bankName: 'بنك الراجحي', status: 'Pending' }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const MOCK_PAYMENTS_DATA: SupplierPayment[] = [
    { id: UUID(), supplierId: MOCK_SUPPLIERS_DATA[0].id, purchaseId: 'PO-001', amount: 5175, method: 'Bank Transfer', date: '2024-07-16T09:00:00Z', createdAt: '2024-07-16T09:00:00Z' },
    { id: UUID(), supplierId: MOCK_SUPPLIERS_DATA[2].id, amount: 2000, method: 'Cash', date: '2024-07-18T12:00:00Z', notes: 'دفعة تحت الحساب', createdAt: '2024-07-18T12:00:00Z' },
];

interface SupplierAccountSummary { supplierId: string; supplierName: string; totalPurchases: number; totalPaid: number; balance: number; lastPaymentDate: string | null; }

// --- UTILS & CONSTANTS ---
const STATUS_STYLES: Record<PurchaseStatus, string> = { 'Pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300', 'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', 'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300', };
const STATUS_LABELS: Record<PurchaseStatus, string> = { 'Pending': AR_LABELS.pending, 'Completed': AR_LABELS.completed, 'Cancelled': AR_LABELS.cancelled, };
const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = { 'Cash': AR_LABELS.cash, 'Bank Transfer': AR_LABELS.bankTransfer, 'Credit': AR_LABELS.credit, 'Cheque': AR_LABELS.cheque, };
const EMPTY_PURCHASE_ORDER: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'> = { supplierId: '', supplierName: '', items: [], subtotal: 0, tax: 15, discount: 0, totalAmount: 0, status: 'Pending', purchaseDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', notes: '', };
type PaymentTarget = { supplier: Supplier; purchaseId?: string; defaultAmount: number; } | null;

// --- MODAL COMPONENTS ---
const SupplierFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newSupplier: Supplier) => void; }> = ({ isOpen, onClose, onSave }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const handleSave = () => { if (!name.trim()) { alert('اسم المورد مطلوب.'); return; } onSave({ id: UUID(), name, contactPerson, email: '', phone, address: '', previousBalance: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); setName(''); setContactPerson(''); setPhone(''); };
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
    const [formData, setFormData] = useState<Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>>(EMPTY_PURCHASE_ORDER);
    const [productSearch, setProductSearch] = useState('');
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);

    useEffect(() => { const initialData = purchaseToEdit ? { ...purchaseToEdit } : { ...EMPTY_PURCHASE_ORDER }; if (initialData.paymentMethod === 'Cheque' && !initialData.chequeDetails) { initialData.chequeDetails = { chequeAmount: 0, chequeDueDate: '', status: 'Pending' }; } setFormData(initialData); }, [purchaseToEdit, isOpen]);
    useEffect(() => { const subtotal = formData.items.reduce((acc, item) => acc + item.totalCost, 0); const totalAfterDiscount = subtotal - formData.discount; const taxAmount = totalAfterDiscount * (formData.tax / 100); const totalAmount = totalAfterDiscount + taxAmount; setFormData(prev => ({ ...prev, subtotal, totalAmount, chequeDetails: prev.paymentMethod === 'Cheque' ? { ...prev.chequeDetails, chequeAmount: totalAmount, chequeDueDate: prev.chequeDetails?.chequeDueDate || '', status: prev.chequeDetails?.status || 'Pending' } : undefined })); }, [formData.items, formData.discount, formData.tax, formData.paymentMethod]);
    
    const handleSaveNewProduct = (newProduct: Product) => {
        setProducts(prev => [...prev, newProduct]);
        const newPurchaseItem: PurchaseItem = {
            productId: String(newProduct.id),
            productName: newProduct.name,
            unit: 'قطعة',
            quantity: 1,
            unitCost: newProduct.costPrice,
            totalCost: newProduct.costPrice,
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newPurchaseItem] }));
        setIsAddProductModalOpen(false);
    };
    
    const handleAddItem = (product: Product) => { const newItem: PurchaseItem = { productId: String(product.id), productName: product.name, unit: 'قطعة', quantity: 1, unitCost: product.costPrice, totalCost: product.costPrice }; setFormData(prev => ({ ...prev, items: [...prev.items, newItem] })); setProductSearch(''); };
    const handleItemChange = (productId: string, field: 'quantity' | 'unitCost' | 'unit', value: string | number) => { setFormData(prev => ({ ...prev, items: prev.items.map(item => { if (item.productId === productId) { const updatedItem = { ...item, [field]: value }; if (field === 'quantity' || field === 'unitCost') { updatedItem.totalCost = updatedItem.quantity * updatedItem.unitCost; } return updatedItem; } return item; }) })); };
    const handleRemoveItem = (productId: string) => { setFormData(prev => ({ ...prev, items: prev.items.filter(item => item.productId !== productId) })); };
    const handleSupplierChange = (supplierId: string) => { const supplier = suppliers.find(s => s.id === supplierId); if (supplier) { setFormData(prev => ({...prev, supplierId: supplier.id, supplierName: supplier.name})); } };
    const handleChequeDetailChange = (field: keyof ChequeDetails, value: string | number) => { setFormData(prev => ({ ...prev, chequeDetails: { chequeAmount: prev.chequeDetails?.chequeAmount || 0, chequeDueDate: prev.chequeDetails?.chequeDueDate || '', status: prev.chequeDetails?.status || 'Pending', ...prev.chequeDetails, [field]: value } })) };
    const handleSubmit = () => { if (!formData.supplierId || formData.items.length === 0) { alert("يرجى اختيار مورد وإضافة منتجات."); return; } if (formData.paymentMethod === 'Cheque' && !formData.chequeDetails?.chequeDueDate) { alert("تاريخ استحقاق الشيك مطلوب."); return; } onSave({ id: purchaseToEdit?.id || `PO-${UUID()}`, poNumber: purchaseToEdit?.poNumber || `PO-${UUID()}`, ...formData, createdAt: purchaseToEdit?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }); };
    if (!isOpen) return null;
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl text-right" onClick={e => e.stopPropagation()}><div className="max-h-[85vh] overflow-y-auto pr-2 space-y-4"><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{purchaseToEdit ? AR_LABELS.edit : AR_LABELS.addNewPurchase}</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="flex items-center gap-2"><select value={formData.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"><option value="" disabled>{AR_LABELS.selectSupplier}</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button onClick={onAddNewSupplier} className="p-2 bg-orange-500 text-white rounded-md"><PlusIcon className="h-4 w-4"/></button></div><input type="date" value={formData.purchaseDate.toString().split('T')[0]} onChange={e => setFormData(f=>({...f, purchaseDate: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/><select value={formData.paymentMethod} onChange={e => setFormData(f=>({...f, paymentMethod: e.target.value as PurchasePaymentMethod}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">{Object.keys(PAYMENT_METHOD_LABELS).map(key => <option key={key} value={key}>{PAYMENT_METHOD_LABELS[key as PurchasePaymentMethod]}</option>)}</select></div>{formData.paymentMethod === 'Cheque' && (<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-r-4 border-blue-400 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4"><input type="text" placeholder={AR_LABELS.chequeNumber} value={formData.chequeDetails?.chequeNumber || ''} onChange={e => handleChequeDetailChange('chequeNumber', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="number" placeholder={AR_LABELS.chequeAmount} value={formData.chequeDetails?.chequeAmount || 0} onChange={e => handleChequeDetailChange('chequeAmount', parseFloat(e.target.value))} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="date" placeholder={AR_LABELS.chequeDueDate} value={formData.chequeDetails?.chequeDueDate.split('T')[0] || ''} onChange={e => handleChequeDetailChange('chequeDueDate', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><input type="text" placeholder={AR_LABELS.bankName} value={formData.chequeDetails?.bankName || ''} onChange={e => handleChequeDetailChange('bankName', e.target.value)} className="w-full border-gray-300 dark:border-gray-600 rounded-md"/><textarea placeholder={AR_LABELS.chequeNotes} value={formData.chequeDetails?.notes || ''} onChange={e => handleChequeDetailChange('notes', e.target.value)} className="md:col-span-2 w-full border-gray-300 dark:border-gray-600 rounded-md"/></div>)}
                <div className="relative flex items-center gap-2">
                    <input type="text" placeholder="ابحث عن منتج لإضافته..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                    <button type="button" onClick={() => setIsAddProductModalOpen(true)} className="px-3 py-2 bg-indigo-500 text-white rounded-md text-sm whitespace-nowrap">{AR_LABELS.addNewProduct}</button>
                    {productSearch && (<div className="absolute top-full left-0 z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md mt-1 shadow-lg max-h-48 overflow-y-auto">{products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (<div key={p.id} onClick={() => handleAddItem(p)} className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/50 cursor-pointer">{p.name}</div>))}</div>)}
                </div>
                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md"><table className="min-w-full"><thead className="bg-gray-50 dark:bg-gray-700/50"><tr><th className="p-2 text-xs">{AR_LABELS.productName}</th><th className="p-2 text-xs">{AR_LABELS.unit}</th><th className="p-2 text-xs">{AR_LABELS.quantity}</th><th className="p-2 text-xs">{AR_LABELS.unitCost}</th><th className="p-2 text-xs">{AR_LABELS.totalAmount}</th><th></th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-700">{formData.items.map(item => (<tr key={item.productId}><td className="p-2 text-sm">{item.productName}</td><td className="p-1"><input type="text" value={item.unit} onChange={e => handleItemChange(item.productId, 'unit', e.target.value)} className="w-20 p-1 border rounded-md"/></td><td className="p-1"><input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', parseFloat(e.target.value))} className="w-20 p-1 border rounded"/></td><td className="p-1"><input type="number" value={item.unitCost} onChange={e => handleItemChange(item.productId, 'unitCost', parseFloat(e.target.value))} className="w-24 p-1 border rounded"/></td><td className="p-2 text-sm font-semibold">{item.totalCost.toFixed(2)}</td><td className="p-1"><button onClick={() => handleRemoveItem(item.productId)} className="text-red-500"><DeleteIcon/></button></td></tr>))}</tbody></table></div><div className="flex justify-between items-end"><div className="w-1/2"><textarea placeholder="ملاحظات..." value={formData.notes} onChange={e => setFormData(f=>({...f, notes: e.target.value}))} className="w-full h-24 border-gray-300 dark:border-gray-600 rounded-md shadow-sm"/></div><div className="w-1/3 space-y-1 text-sm"><div className="flex justify-between"><span>{AR_LABELS.subtotal}:</span><span>{formData.subtotal.toFixed(2)}</span></div><div className="flex justify-between items-center"><label>{AR_LABELS.discount}:</label><input type="number" value={formData.discount} onChange={e=>setFormData(f=>({...f, discount: parseFloat(e.target.value)}))} className="w-24 p-1 border rounded text-left"/></div><div className="flex justify-between items-center"><label>{AR_LABELS.tax} (%):</label><input type="number" value={formData.tax} onChange={e=>setFormData(f=>({...f, tax: parseFloat(e.target.value)}))} className="w-24 p-1 border rounded text-left"/></div><div className="flex justify-between font-bold text-lg border-t pt-1">{AR_LABELS.grandTotal}:<span>{formData.totalAmount.toFixed(2)}</span></div></div></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button onClick={handleSubmit} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">{AR_LABELS.cancel}</button></div></div>
                <SimpleAddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onSave={handleSaveNewProduct} />
            </div></div>);
};

const AddPaymentModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (payment: SupplierPayment) => void; target: PaymentTarget; }> = ({ isOpen, onClose, onSave, target }) => {
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    useEffect(() => { if (target) { setAmount(target.defaultAmount); setMethod('Cash'); setDate(new Date().toISOString().split('T')[0]); } }, [target, isOpen]);
    if (!isOpen || !target) return null;
    const handleSave = () => { if (amount <= 0) return; onSave({ id: UUID(), supplierId: target.supplier.id, purchaseId: target.purchaseId, amount, method, date, createdAt: new Date().toISOString() }); onClose(); };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.addPayment} لـ {target.supplier.name}</h2><div className="space-y-4"><input type="number" placeholder={AR_LABELS.paymentAmount} value={amount} onChange={e => setAmount(parseFloat(e.target.value) || 0)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/><select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"><option value="Cash">{AR_LABELS.cash}</option><option value="Bank Transfer">{AR_LABELS.bankTransfer}</option><option value="Cheque">{AR_LABELS.cheque}</option></select><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
}

const SupplierStatementModal: React.FC<{ summary: SupplierAccountSummary | null; purchases: PurchaseOrder[]; payments: SupplierPayment[]; onClose: () => void; }> = ({ summary, purchases, payments, onClose }) => {
    if (!summary) return null;
    const transactions = useMemo(() => {
        type TransactionType = { date: string; type: 'purchase' | 'payment'; description: string; debit: number; credit: number; balance: number };
        const supplierPurchases: TransactionType[] = purchases.filter(p => p.supplierId === summary.supplierId).map(p => ({ date: p.purchaseDate, type: 'purchase' as const, description: `${AR_LABELS.purchaseOrder} #${p.id}`, debit: p.totalAmount, credit: 0, balance: 0 }));
        const supplierPayments: TransactionType[] = payments.filter(p => p.supplierId === summary.supplierId).map(p => ({ date: p.date, type: 'payment' as const, description: `${AR_LABELS.paymentMade} - ${p.method}`, debit: 0, credit: p.amount, balance: 0 }));
        return [...supplierPurchases, ...supplierPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).reduce((acc, trans) => { const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0; const newBalance = prevBalance + trans.debit - trans.credit; acc.push({ ...trans, balance: newBalance }); return acc; }, [] as TransactionType[]);
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
                            <td className="p-2 text-sm">{formatDate(t.date)}</td>
                            <td className="p-2 text-sm">{t.description}</td>
                            <td className="p-2 text-sm text-left font-mono">{t.debit > 0 ? t.debit.toFixed(2) : '-'}</td>
                            <td className="p-2 text-sm text-left font-mono text-green-600">{t.credit > 0 ? t.credit.toFixed(2) : '-'}</td>
                            <td className="p-2 text-sm text-left font-mono font-semibold">{t.balance.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div><div className="flex justify-start space-x-4 space-x-reverse p-4 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 rounded-b-lg print-hidden"><button onClick={() => printReceipt('printable-receipt')} className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md"><PrintIcon/><span className="mr-2">{AR_LABELS.printReceipt}</span></button><button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
};

// FIX: Added the main component and default export to fix the error.
const PurchasesPage: React.FC = () => {
    const [purchases, setPurchases] = useState<PurchaseOrder[]>(createInitialPurchases());
    const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS_DATA);
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [payments, setPayments] = useState<SupplierPayment[]>(MOCK_PAYMENTS_DATA);
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

    const handleQuickAction = (action: string) => {
        switch (action) {
            case 'add-purchase':
                setPurchaseModal({isOpen: true, data: null});
                break;
            case 'import':
                alert('وظيفة الاستيراد قيد التطوير');
                break;
            case 'export':
                alert('وظيفة التصدير قيد التطوير');
                break;
            case 'print':
                alert('وظيفة الطباعة قيد التطوير');
                break;
            case 'search':
                // Focus on search input
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                break;
            case 'add-supplier':
                setSupplierModalOpen(true);
                break;
            case 'add-payment':
                if (suppliers.length > 0) {
                    setPaymentModalTarget({ supplier: suppliers[0], defaultAmount: 0 });
                } else {
                    alert('يرجى إضافة مورد أولاً');
                }
                break;
            case 'generate-report':
                alert('جاري توليد التقرير...');
                break;
            default:
                break;
        }
    };

    const [activeTab, setActiveTab] = useState<TabType>('purchases');

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-orange-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Modern Professional Header */}
                <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-4 py-2 text-sm font-semibold text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-800/50">
                                <div className="mr-2 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                إدارة المشتريات
                            </div>
                            <h1 className="bg-gradient-to-r from-slate-900 via-orange-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-orange-100 dark:to-white sm:text-5xl">
                                لوحة تحكم المشتريات
                            </h1>
                            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                إدارة شاملة للمشتريات والموردين والمدفوعات
                            </p>
                        </div>
                    </div>
                    
                    {/* Modern Navigation Tabs */}
                    <div className="flex gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
                        {[
                            { id: 'purchases', label: 'المشتريات' },
                            { id: 'suppliers', label: 'الموردين' },
                            { id: 'payments', label: 'المدفوعات' },
                            { id: 'reports', label: 'التقارير' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`group relative flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
                                    activeTab === tab.id
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                                        : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                                )}
                                <span className="relative">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                {activeTab === 'purchases' && (
                    <div className="space-y-8">
                        {/* Analytics and Quick Actions */}
                        <div className="space-y-6">
                            <PurchaseAnalytics purchases={purchases} />
                            <PurchaseQuickActions
                                onAddPurchase={() => handleQuickAction('add-purchase')}
                                onImportPurchases={() => handleQuickAction('import')}
                                onExportPurchases={() => handleQuickAction('export')}
                                onPrintPurchases={() => handleQuickAction('print')}
                                onSearchPurchases={() => handleQuickAction('search')}
                            />
                        </div>

                        {/* Purchase Orders View */}
                        <PurchaseOrdersView 
                            purchases={purchases} 
                            onAdd={() => setPurchaseModal({isOpen: true, data: null})} 
                            onEdit={(p) => setPurchaseModal({isOpen: true, data: p})} 
                        />
                    </div>
                )}

                {activeTab === 'suppliers' && (
                    <div className="space-y-8">
                        {/* Analytics and Quick Actions */}
                        <div className="space-y-6">
                            <SuppliersAnalytics 
                                suppliers={suppliers}
                                purchases={purchases}
                                payments={payments}
                            />
                            <SuppliersQuickActions
                                onAddSupplier={() => handleQuickAction('add-supplier')}
                                onViewSuppliers={() => handleQuickAction('view-suppliers')}
                                onImportSuppliers={() => handleQuickAction('import')}
                                onExportSuppliers={() => handleQuickAction('export')}
                            />
                        </div>

                        {/* Suppliers View */}
                        <SuppliersPage 
                            purchases={purchases} 
                            payments={payments}
                            suppliers={suppliers}
                            onSuppliersUpdated={(updatedSuppliers) => {
                                setSuppliers(updatedSuppliers);
                            }}
                        />
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="space-y-8">
                        {/* Analytics and Quick Actions */}
                        <div className="space-y-6">
                            <PaymentsAnalytics payments={payments} />
                            <PaymentsQuickActions
                                onAddPayment={() => handleQuickAction('add-payment')}
                                onViewPayments={() => handleQuickAction('view-payments')}
                                onPrintPayments={() => handleQuickAction('print')}
                                onExportPayments={() => handleQuickAction('export')}
                            />
                        </div>

                        {/* Payments View */}
                        <SupplierPaymentsPage 
                            suppliers={suppliers}
                            payments={payments}
                            onPaymentAdded={(payment) => {
                                setPayments(prev => [payment, ...prev]);
                            }}
                            onPaymentUpdated={(updatedPayments) => {
                                setPayments(updatedPayments);
                            }}
                        />
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-8">
                        {/* Quick Reports */}
                        <QuickReports 
                            onGenerateReport={(reportType) => handleQuickAction('generate-report')}
                        />

                        {/* Detailed Reports */}
                        <PurchaseReportsPage 
                            purchases={purchases} 
                            payments={payments} 
                            suppliers={suppliers}
                        />
                    </div>
                )}
            </div>

                {/* Modals */}
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
        </div>
    );
};

const PurchaseOrdersView: React.FC<{
    purchases: PurchaseOrder[];
    onAdd: () => void;
    onEdit: (p: PurchaseOrder) => void;
}> = ({ purchases, onAdd, onEdit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [layout, setLayout] = useState<LayoutType>('table');

    const filteredPurchases = useMemo(() => {
        return purchases.filter(p => {
            const matchesSearch = searchTerm ? 
                p.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            return matchesSearch;
        }).sort((a,b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    }, [purchases, searchTerm]);

    return (
        <div>
            {/* Control Bar: Search */}
            <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-4 sm:p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                    {/* Search Bar */}
                    <div className="relative flex-1 w-full sm:w-auto">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder={AR_LABELS.searchByPOorSupplier || 'ابحث برقم الطلب أو المورد...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                        />
                    </div>
                    {/* Layout Toggle */}
                    <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden w-full sm:w-auto flex-shrink-0">
                        <button 
                            onClick={() => setLayout('table')} 
                            className={`flex-1 sm:flex-none px-3 py-2 ${layout === 'table' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            title="عرض الجدول"
                        >
                            <TableViewIcon />
                        </button>
                        <button 
                            onClick={() => setLayout('grid')} 
                            className={`flex-1 sm:flex-none px-3 py-2 ${layout === 'grid' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                            title="عرض الشبكة"
                        >
                            <GridViewIcon/>
                        </button>
                    </div>
                </div>
            </div>

            {/* Purchase Table/Grid */}
            {layout === 'table' ? (
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="overflow-x-auto overscroll-contain">
                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.poNumber}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.purchaseDate}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.supplier}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.totalAmount}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.paymentMethod}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.status}</th>
                                    <th scope="col" className="px-2 py-3 sm:px-4 sm:py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPurchases.length > 0 ? filteredPurchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400">{purchase.id}</div></td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{formatDate(purchase.purchaseDate)}</div></td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px] sm:max-w-none" title={purchase.supplierName}>{purchase.supplierName}</div></td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm font-semibold text-orange-600">{purchase.totalAmount.toFixed(2)} ر.س</div></td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap"><div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{PAYMENT_METHOD_LABELS[purchase.paymentMethod]}</div></td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[purchase.status]}`}>
                                                {STATUS_LABELS[purchase.status]}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3 sm:px-4 sm:py-4 whitespace-nowrap text-center text-xs sm:text-sm font-medium">
                                            <button onClick={() => alert('View details for ' + purchase.id)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-2 sm:ml-4 p-1 sm:p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.viewDetails} ${purchase.id}`}><ViewIcon /></button>
                                            <button onClick={() => onEdit(purchase)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 sm:p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.edit} ${purchase.id}`}><EditIcon /></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredPurchases.length > 0 ? filteredPurchases.map((purchase) => (
                        <div key={purchase.id} className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-6 space-y-3 flex flex-col justify-between backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md transition-shadow">
                            <div>
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">{purchase.id}</h3>
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_STYLES[purchase.status]}`}>
                                        {STATUS_LABELS[purchase.status]}
                                    </span>
                                </div>
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                    <p><span className="font-medium">{AR_LABELS.supplier}:</span> {purchase.supplierName}</p>
                                    <p><span className="font-medium">{AR_LABELS.purchaseDate}:</span> {formatDate(purchase.purchaseDate)}</p>
                                    <p><span className="font-medium">{AR_LABELS.totalAmount}:</span> <span className="font-bold text-orange-600">{purchase.totalAmount.toFixed(2)} ر.س</span></p>
                                    <p><span className="font-medium">{AR_LABELS.paymentMethod}:</span> {PAYMENT_METHOD_LABELS[purchase.paymentMethod]}</p>
                                </div>
                            </div>
                            <div className="border-t dark:border-gray-700 pt-3 flex justify-end gap-2">
                                <button onClick={() => alert('View details for ' + purchase.id)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"><ViewIcon /></button>
                                <button onClick={() => onEdit(purchase)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"><EditIcon /></button>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-10">{AR_LABELS.noSalesFound}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PurchasesPage;
