import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PurchaseOrder, Supplier, PurchaseStatus, PurchasePaymentMethod, SupplierPayment } from '@/features/financial/types';
import { Product } from '@/shared/types';
import { 
  AR_LABELS, UUID, PlusIcon, DeleteIcon, PrintIcon
} from '@/shared/constants';
import PurchaseQuickActions from '@/features/financial/components/PurchaseQuickActions';
import { PurchasePOSView } from '@/features/financial/components/PurchasePOSView';
import { formatDate } from '@/shared/utils';
import { printReceipt } from '@/shared/utils/printUtils';
import PaymentsAnalytics from '@/features/financial/components/PaymentsAnalytics';
import PaymentsQuickActions from '@/features/financial/components/PaymentsQuickActions';
import QuickReports from '@/features/financial/components/QuickReports';
import SupplierPaymentsPage from './SupplierPaymentsPage';
import PurchaseReportsPage from './PurchaseReportsPage';
import { suppliersApi, purchasesApi, getApiErrorMessage } from '@/lib/api';
import { AccountsModule, SUPPLIER_ACCOUNTS_LABELS } from '@/features/accounts';
import type { AccountEntity } from '@/features/accounts';

type TabType = 'purchases' | 'suppliers' | 'reports';

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
const PAYMENT_METHOD_LABELS: Record<PurchasePaymentMethod, string> = { 'Cash': AR_LABELS.cash, 'Bank Transfer': AR_LABELS.bankTransfer, 'Credit': AR_LABELS.credit, 'Cheque': AR_LABELS.cheque, };
const EMPTY_PURCHASE_ORDER: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'> = { supplierId: '', supplierName: '', items: [], subtotal: 0, tax: 15, discount: 0, totalAmount: 0, status: 'Pending', purchaseDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', notes: '', };
type PaymentTarget = { supplier: Supplier; purchaseId?: string; defaultAmount: number; } | null;

// Shared input styles for supplier modal (aligned with SuppliersPage)
const supplierInputClass = 'w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 text-right focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors';
const supplierLabelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-right';
type OpeningBalanceType = 'credit' | 'debit' | null;

// --- MODAL COMPONENTS ---
const SupplierFormModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (newSupplier: Supplier) => void; supplierToEdit?: Supplier | null; }> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [openingBalanceType, setOpeningBalanceType] = useState<OpeningBalanceType>(null);
    const [openingBalanceAmount, setOpeningBalanceAmount] = useState('');
    useEffect(() => {
        if (supplierToEdit) {
            setName(supplierToEdit.name);
            setContactPerson(supplierToEdit.contactPerson || '');
            setPhone(supplierToEdit.phone || '');
            setEmail(supplierToEdit.email || '');
            setAddress(supplierToEdit.address || '');
            setNotes(supplierToEdit.notes || '');
            const bal = supplierToEdit.previousBalance ?? 0;
            if (bal > 0) {
                setOpeningBalanceType('debit');
                setOpeningBalanceAmount(String(bal));
            } else if (bal < 0) {
                setOpeningBalanceType('credit');
                setOpeningBalanceAmount(String(Math.abs(bal)));
            } else {
                setOpeningBalanceType(null);
                setOpeningBalanceAmount('');
            }
        } else {
            setName('');
            setContactPerson('');
            setPhone('');
            setEmail('');
            setAddress('');
            setNotes('');
            setOpeningBalanceType(null);
            setOpeningBalanceAmount('');
        }
    }, [supplierToEdit, isOpen]);
    const handleSave = () => {
        if (!name.trim()) { alert('اسم المورد مطلوب.'); return; }
        if (!phone.trim()) { alert('رقم الهاتف مطلوب.'); return; }
        let previousBalance = 0;
        if (openingBalanceType && openingBalanceAmount) {
            const amount = parseFloat(openingBalanceAmount) || 0;
            previousBalance = openingBalanceType === 'debit' ? amount : -amount;
        }
        const payload = { name, contactPerson, email, phone, address, notes, previousBalance, updatedAt: new Date().toISOString() };
        if (supplierToEdit) {
            onSave({ ...supplierToEdit, ...payload });
        } else {
            onSave({ id: UUID(), ...payload, createdAt: new Date().toISOString() });
        }
    };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md text-right overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 pb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">{supplierToEdit ? 'تعديل مورد' : AR_LABELS.addNewSupplier}</h2>
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="purch-supplier-name" className={supplierLabelClass}>اسم المورد *</label>
                            <input id="purch-supplier-name" type="text" value={name} onChange={e => setName(e.target.value)} className={supplierInputClass} placeholder="اسم المورد" />
                        </div>
                        <div>
                            <label htmlFor="purch-supplier-contact" className={supplierLabelClass}>{AR_LABELS.contactPerson}</label>
                            <input id="purch-supplier-contact" type="text" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className={supplierInputClass} placeholder="الشخص المسؤول" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="purch-supplier-phone" className={supplierLabelClass}>{AR_LABELS.phone} *</label>
                                <input id="purch-supplier-phone" type="text" value={phone} onChange={e => setPhone(e.target.value)} className={supplierInputClass} placeholder="05xxxxxxxx" />
                            </div>
                            <div>
                                <label htmlFor="purch-supplier-email" className={supplierLabelClass}>البريد الإلكتروني (اختياري)</label>
                                <input id="purch-supplier-email" type="text" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} className={supplierInputClass} placeholder="example@domain.com" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="purch-supplier-address" className={supplierLabelClass}>{AR_LABELS.address}</label>
                            <input id="purch-supplier-address" type="text" value={address} onChange={e => setAddress(e.target.value)} className={supplierInputClass} placeholder="العنوان" />
                        </div>
                        <div>
                            <label htmlFor="purch-supplier-notes" className={supplierLabelClass}>{AR_LABELS.notes}</label>
                            <textarea id="purch-supplier-notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={`${supplierInputClass} resize-none`} placeholder="ملاحظات اختيارية" />
                        </div>
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-5 mt-2">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 text-right">{AR_LABELS.openingBalance}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-right">{AR_LABELS.openingBalanceHint}</p>
                            <div className="space-y-4">
                                <div>
                                    <span className={supplierLabelClass}>{AR_LABELS.transactionType}</span>
                                    <div className="flex gap-3 flex-row-reverse">
                                        <label className="flex-1 cursor-pointer flex flex-col">
                                            <input type="radio" name="purchOpeningBalanceType" checked={openingBalanceType === 'credit'} onChange={() => setOpeningBalanceType('credit')} className="sr-only peer" />
                                            <span className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all peer-checked:border-orange-500 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 peer-checked:text-orange-700 dark:peer-checked:text-orange-300">{AR_LABELS.receiptVoucherCredit}</span>
                                        </label>
                                        <label className="flex-1 cursor-pointer flex flex-col">
                                            <input type="radio" name="purchOpeningBalanceType" checked={openingBalanceType === 'debit'} onChange={() => setOpeningBalanceType('debit')} className="sr-only peer" />
                                            <span className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-all peer-checked:border-orange-500 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20 peer-checked:text-orange-700 dark:peer-checked:text-orange-300">{AR_LABELS.debitVoucher}</span>
                                        </label>
                                    </div>
                                </div>
                                {openingBalanceType && (
                                    <div>
                                        <label htmlFor="purch-opening-amount" className={supplierLabelClass}>{AR_LABELS.openingBalanceAmount}</label>
                                        <input id="purch-opening-amount" type="number" min={0} step={0.01} value={openingBalanceAmount} onChange={e => setOpeningBalanceAmount(e.target.value)} className={supplierInputClass} placeholder="0.00" />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-start gap-3 pt-4">
                            <button type="button" onClick={handleSave} className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors">{AR_LABELS.save}</button>
                            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors">{AR_LABELS.cancel}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
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
    const [amountStr, setAmountStr] = useState('0');
    const amountInputRef = useRef<HTMLInputElement>(null);
    const [method, setMethod] = useState<'Cash' | 'Bank Transfer' | 'Cheque'>('Cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    useEffect(() => { if (target) { setAmountStr(String(target.defaultAmount ?? 0)); setMethod('Cash'); setDate(new Date().toISOString().split('T')[0]); } }, [target, isOpen]);
    if (!isOpen || !target) return null;
    const handleSave = () => {
        const rawValue = amountInputRef.current?.value ?? amountStr;
        const numericValue = Number(rawValue);
        if (isNaN(numericValue) || numericValue <= 0) return;
        onSave({ id: UUID(), supplierId: target.supplier.id, purchaseId: target.purchaseId, amount: numericValue, method, date, createdAt: new Date().toISOString() });
        onClose();
    };
    return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" onClick={onClose}><div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}><h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">{AR_LABELS.addPayment} لـ {target.supplier.name}</h2><div className="space-y-4"><input ref={amountInputRef} type="number" placeholder={AR_LABELS.paymentAmount} min={0} step="any" value={amountStr} onChange={e => setAmountStr(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/><select value={method} onChange={e => setMethod(e.target.value as any)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"><option value="Cash">{AR_LABELS.cash}</option><option value="Bank Transfer">{AR_LABELS.bankTransfer}</option><option value="Cheque">{AR_LABELS.cheque}</option></select><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md"/></div><div className="flex justify-start space-x-4 space-x-reverse pt-4"><button type="button" onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button></div></div></div>);
}

const SupplierStatementModal: React.FC<{ summary: SupplierAccountSummary | null; purchases: PurchaseOrder[]; payments: SupplierPayment[]; onClose: () => void; }> = ({ summary, purchases, payments, onClose }) => {
    if (!summary) return null;
    const transactions = useMemo(() => {
        type TransactionType = { date: string; type: 'purchase' | 'payment'; description: string; debit: number; credit: number; balance: number };
        const supplierPurchases: TransactionType[] = purchases.filter(p => p.supplierId === summary.supplierId).map(p => ({ date: p.purchaseDate, type: 'purchase' as const, description: `${AR_LABELS.purchaseOrder} #${p.id}`, debit: p.totalAmount, credit: 0, balance: 0 }));
        const supplierPayments: TransactionType[] = payments.filter(p => p.supplierId === summary.supplierId).map(p => {
            const amt = typeof p.amount === 'number' ? p.amount : 0;
            if (amt < 0) {
                return { date: p.date, type: 'payment' as const, description: (p as any).notes || 'رصيد أولي - سند قيد', debit: Math.abs(amt), credit: 0, balance: 0 };
            }
            return { date: p.date, type: 'payment' as const, description: (p as any).notes || `${AR_LABELS.paymentMade} - ${p.method}`, debit: 0, credit: amt, balance: 0 };
        });
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
    const [searchParams] = useSearchParams();
    const editPurchaseId = searchParams.get('edit') || undefined;
    const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
    const [payments, setPayments] = useState<SupplierPayment[]>([]);
    const [purchaseModal, setPurchaseModal] = useState<{isOpen: boolean, data: PurchaseOrder | null}>({isOpen: false, data: null});
    const [supplierModalOpen, setSupplierModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [paymentModalTarget, setPaymentModalTarget] = useState<PaymentTarget>(null);
    const [statementModalTarget, setStatementModalTarget] = useState<SupplierAccountSummary | null>(null);
    const [purchasesLoading, setPurchasesLoading] = useState(false);
    const [supplierSummaries, setSupplierSummaries] = useState<SupplierAccountSummary[]>([]);

    const loadFromApi = useCallback(async () => {
        setPurchasesLoading(true);
        try {
            const [suppRes, purRes, payRes, sumRes] = await Promise.all([
                suppliersApi.getSuppliers().catch(() => ({ data: { suppliers: [] } })),
                purchasesApi.getPurchases().catch(() => ({ data: { purchases: [] } })),
                suppliersApi.getSupplierPayments().catch(() => ({ data: { payments: [] } })),
                suppliersApi.getSupplierAccountsSummary().catch(() => ({ data: { summaries: [] } })),
            ]);
            const suppList = (suppRes as any)?.data?.data?.suppliers ?? (suppRes as any)?.data?.suppliers ?? [];
            const purList = (purRes as any)?.data?.data?.purchases ?? (purRes as any)?.data?.purchases ?? [];
            const payList = (payRes as any)?.data?.data?.payments ?? (payRes as any)?.data?.payments ?? [];
            const sumList = (sumRes as any)?.data?.data?.summaries ?? (sumRes as any)?.data?.summaries ?? [];
            setSuppliers(Array.isArray(suppList) ? suppList : []);
            setSupplierSummaries(Array.isArray(sumList) ? sumList.map((s: any) => ({
                supplierId: s.supplierId,
                supplierName: s.supplierName,
                totalPurchases: s.totalPurchases ?? 0,
                totalPaid: s.totalPaid ?? 0,
                balance: s.balance ?? 0,
                lastPaymentDate: s.lastPaymentDate ?? null,
            })) : []);
            setPurchases(Array.isArray(purList) ? purList.map((p: any) => ({
                id: p.id,
                poNumber: p.poNumber ?? p.id,
                supplierId: p.supplierId,
                supplierName: p.supplierName,
                items: p.items ?? [],
                subtotal: p.subtotal ?? 0,
                tax: p.tax ?? 0,
                discount: p.discount ?? 0,
                totalAmount: p.totalAmount ?? 0,
                status: p.status ?? 'Pending',
                purchaseDate: p.purchaseDate ?? p.createdAt,
                paymentMethod: p.paymentMethod ?? 'Cash',
                chequeDetails: p.chequeDetails,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                notes: p.notes,
            })) : []);
            setPayments(Array.isArray(payList) ? payList : []);
        } finally {
            setPurchasesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFromApi();
    }, [loadFromApi]);

    const handleSavePurchase = (purchase: PurchaseOrder) => {
        setPurchases(prev => {
            const exists = prev.some(p => p.id === purchase.id);
            if (exists) {
                return prev.map(p => p.id === purchase.id ? purchase : p);
            }
            return [purchase, ...prev];
        });
        setPurchaseModal({isOpen: false, data: null});
        loadFromApi();
    };
    
    const handleSaveSupplier = async (supplier: Supplier) => {
        try {
            if (editingSupplier) {
                await suppliersApi.updateSupplier(editingSupplier.id, { name: supplier.name, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, address: supplier.address, previousBalance: supplier.previousBalance, notes: supplier.notes });
                setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...supplier, id: editingSupplier.id, createdAt: s.createdAt, updatedAt: new Date().toISOString() } : s));
                setEditingSupplier(null);
            } else {
                const res = await suppliersApi.createSupplier({ name: supplier.name, contactPerson: supplier.contactPerson, email: supplier.email, phone: supplier.phone, address: supplier.address, previousBalance: supplier.previousBalance ?? 0, notes: supplier.notes });
                const created = (res.data as any)?.data?.supplier;
                if (created) setSuppliers(prev => [{ ...created, id: created.id || created._id }, ...prev]);
                setSupplierModalOpen(false);
            }
            loadFromApi();
        } catch (e: any) {
            alert(getApiErrorMessage(e, 'فشل حفظ المورد'));
        }
    };

    const handleDeleteSupplier = async (id: string) => {
        await suppliersApi.deleteSupplier(id);
        setSuppliers(prev => prev.filter(s => s.id !== id));
        setPayments(prev => prev.filter(p => p.supplierId !== id));
        loadFromApi();
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

    const location = useLocation();
    const pathname = location.pathname;
    const activeTab: TabType =
        pathname.endsWith('/suppliers') ? 'suppliers'
        : pathname.endsWith('/reports') ? 'reports'
        : 'purchases';

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-amber-50/20 to-orange-100/30 dark:from-slate-950 dark:via-amber-950/20 dark:to-orange-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-orange-400/15 to-amber-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-orange-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-orange-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative w-full px-2 sm:px-3 py-8 space-y-8">
                {/* Modern Professional Header */}
                <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                    <div />
                    
                    {/* Modern Navigation Tabs - each button has its own route */}
                    <div className="w-full overflow-x-auto scroll-smooth horizontal-nav-scroll">
                        <div className="flex gap-2 sm:gap-3 min-w-max pb-2 items-center">
                            {[
                                { id: 'purchases', label: 'المشتريات', to: '/purchases' },
                                { id: 'suppliers', label: 'الموردين', to: '/suppliers' },
                                { id: 'reports', label: 'التقارير', to: '/reports' },
                            ].map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <Link
                                        key={tab.id}
                                        to={tab.to}
                                        className={`group relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                                            isActive
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                                                : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                                        }`}
                                    >
                                        {isActive && (
                                            <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                                        )}
                                        <span className="relative">{tab.label}</span>
                                    </Link>
                                );
                            })}
                            <Link
                                to="/purchases/invoices"
                                className={`group relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                                    pathname.includes('/purchases/invoices')
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/50'
                                        : 'bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700/50 hover:shadow-md'
                                }`}
                            >
                                {pathname.includes('/purchases/invoices') && (
                                    <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur" />
                                )}
                                <span className="relative">{AR_LABELS.purchaseInvoicesList}</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                {activeTab === 'purchases' && (
                    <div className="space-y-6">
                        {/* POS-style New Purchase (same layout as POS screen) */}
                        <div className="h-[calc(100vh-14rem)] min-h-[420px]">
                            <PurchasePOSView
                                editPurchaseId={editPurchaseId}
                                onPurchaseCreated={loadFromApi}
                                onViewStatement={(supplierId) => {
                                    const summary = supplierSummaries.find(s => s.supplierId === supplierId);
                                    if (summary) {
                                        setStatementModalTarget(summary);
                                    } else {
                                        const supp = suppliers.find(s => s.id === supplierId);
                                        if (supp) {
                                            setStatementModalTarget({
                                                supplierId: supp.id,
                                                supplierName: supp.name,
                                                totalPurchases: 0,
                                                totalPaid: 0,
                                                balance: 0,
                                                lastPaymentDate: null,
                                            });
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'suppliers' && (
                    <AccountsModule
                        mode="supplier"
                        entities={suppliers.map(s => ({ id: s.id, name: s.name, phone: s.phone, address: s.address }))}
                        setEntities={(updater) => {
                            setSuppliers(prev => {
                                const next = typeof updater === 'function' ? updater(prev.map(s => ({ id: s.id, name: s.name, phone: s.phone, address: s.address }))) : updater;
                                return next.map(e => {
                                    const full = prev.find(s => s.id === e.id);
                                    return full ? { ...full, ...e } : { ...e, contactPerson: '', email: '', previousBalance: 0, createdAt: '', updatedAt: '', notes: '' } as Supplier;
                                });
                            });
                        }}
                        payments={payments.map(p => ({ entityId: p.supplierId, date: p.date, amount: p.amount, method: p.method }))}
                        setPayments={(updater) => {
                            setPayments(prev => {
                                const next = typeof updater === 'function' ? updater(prev) : updater;
                                return (next || []).map((p: any) => ({ id: p.id || UUID(), supplierId: p.entityId, date: p.date, amount: p.amount, method: p.method, createdAt: p.createdAt || new Date().toISOString() }));
                            });
                        }}
                        onRefreshPayments={loadFromApi}
                        onSaveNewEntity={async (entity) => {
                            await suppliersApi.createSupplier({ name: entity.name, contactPerson: (entity as any).contactPerson, email: (entity as any).email, phone: entity.phone, address: entity.address, previousBalance: (entity as any).previousBalance ?? 0, notes: (entity as any).notes });
                            loadFromApi();
                        }}
                        onUpdateEntity={async (entity) => {
                            const full = suppliers.find(s => s.id === entity.id);
                            if (full) await handleSaveSupplier({ ...full, ...entity, updatedAt: new Date().toISOString() });
                        }}
                        onDeleteEntity={handleDeleteSupplier}
                        onOpenAddEntity={() => { setEditingSupplier(null); setSupplierModalOpen(true); }}
                        onOpenEditEntity={(entity) => {
                            const full = suppliers.find(s => s.id === entity.id);
                            if (full) setEditingSupplier(full);
                        }}
                        labels={SUPPLIER_ACCOUNTS_LABELS}
                        isLoadingEntities={purchasesLoading}
                        onRefreshEntities={loadFromApi}
                    />
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
                    isOpen={supplierModalOpen || !!editingSupplier}
                    onClose={() => { setSupplierModalOpen(false); setEditingSupplier(null); }}
                    onSave={handleSaveSupplier}
                    supplierToEdit={editingSupplier}
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

export default PurchasesPage;
