import React, { useState, useMemo } from 'react';
import { SupplierPayment, Supplier } from '@/features/financial/types';
import { AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon } from '@/shared/constants';
import { GridViewIcon, TableViewIcon } from '@/shared/constants';

type LayoutType = 'table' | 'grid';

interface SupplierPaymentsPageProps {
  suppliers?: Supplier[];
  payments?: SupplierPayment[];
  onPaymentAdded?: (payment: SupplierPayment) => void;
  onPaymentUpdated?: (payments: SupplierPayment[]) => void;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'Cash': AR_LABELS.cash || 'نقدي',
  'Bank Transfer': AR_LABELS.bankTransfer || 'تحويل بنكي',
  'Cheque': AR_LABELS.cheque || 'شيك',
};

const SupplierPaymentsPage: React.FC<SupplierPaymentsPageProps> = ({ 
  suppliers = [], 
  payments: initialPayments = [],
  onPaymentAdded,
  onPaymentUpdated 
}) => {
  const [payments, setPayments] = useState<SupplierPayment[]>(initialPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<{ isOpen: boolean; payment: SupplierPayment | null }>({ isOpen: false, payment: null });

  // Sync with parent payments
  React.useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const supplier = suppliers.find(s => s.id === payment.supplierId);
      const matchesSearch = searchTerm
        ? supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.amount.toString().includes(searchTerm) ||
          payment.method.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchesSearch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchTerm, suppliers]);

  const handleSavePayment = (paymentData: SupplierPayment) => {
    let updatedPayments: SupplierPayment[];
    if (modal.payment) {
      // Edit existing payment
      updatedPayments = payments.map(p => p.id === paymentData.id ? paymentData : p);
      setPayments(updatedPayments);
    } else {
      // Add new payment
      const newPayment = { ...paymentData, id: UUID(), createdAt: new Date().toISOString() };
      updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      if (onPaymentAdded) {
        onPaymentAdded(newPayment);
      }
    }
    if (onPaymentUpdated) {
      onPaymentUpdated(updatedPayments);
    }
    setModal({ isOpen: false, payment: null });
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الدفع؟')) {
      const updatedPayments = payments.filter(p => p.id !== paymentId);
      setPayments(updatedPayments);
      if (onPaymentUpdated) {
        onPaymentUpdated(updatedPayments);
      }
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || supplierId;
  };

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="ابحث بالاسم، المبلغ، أو طريقة الدفع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-right"
            />
            <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
            <button
              onClick={() => setLayout(layout === 'table' ? 'grid' : 'table')}
              className="p-2 border dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {layout === 'table' ? <GridViewIcon /> : <TableViewIcon />}
            </button>
           
          </div>
        </div>
      </div>

      {/* Table/Grid View */}
      {layout === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">المورد</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">المبلغ المدفوع</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">طريقة الدفع</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{getSupplierName(payment.supplierId)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(payment.date).toLocaleDateString('ar-SA')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">{payment.amount.toFixed(2)} ر.س</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button onClick={() => setModal({ isOpen: true, payment })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-4 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.edit}`}><EditIcon /></button>
                      <button onClick={() => handleDeletePayment(payment.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.delete}`}><DeleteIcon /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{getSupplierName(payment.supplierId)}</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">التاريخ: {new Date(payment.date).toLocaleDateString('ar-SA')}</p>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">{payment.amount.toFixed(2)} ر.س</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{PAYMENT_METHOD_LABELS[payment.method] || payment.method}</p>
              <div className="border-t dark:border-gray-700 pt-2 flex justify-end space-x-2 space-x-reverse">
                <button onClick={() => setModal({ isOpen: true, payment })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1" aria-label={`${AR_LABELS.edit}`}><EditIcon /></button>
                <button onClick={() => handleDeletePayment(payment.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1" aria-label={`${AR_LABELS.delete}`}><DeleteIcon /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, payment: null })}
        onSave={handleSavePayment}
        paymentToEdit={modal.payment}
        suppliers={suppliers}
      />
    </div>
  );
};

// Payment Form Modal Component
const PaymentFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: SupplierPayment) => void;
  paymentToEdit: SupplierPayment | null;
  suppliers: Supplier[];
}> = ({ isOpen, onClose, onSave, paymentToEdit, suppliers }) => {
  const [formData, setFormData] = useState<Omit<SupplierPayment, 'id' | 'createdAt'>>({
    supplierId: '',
    purchaseId: '',
    amount: 0,
    method: 'Cash',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  React.useEffect(() => {
    if (paymentToEdit) {
      setFormData({
        supplierId: paymentToEdit.supplierId,
        purchaseId: paymentToEdit.purchaseId || '',
        amount: paymentToEdit.amount,
        method: paymentToEdit.method,
        date: paymentToEdit.date.split('T')[0],
        notes: paymentToEdit.notes || '',
      });
    } else {
      setFormData({
        supplierId: '',
        purchaseId: '',
        amount: 0,
        method: 'Cash',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
    }
  }, [paymentToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || formData.amount <= 0) {
      alert('يرجى اختيار مورد وإدخال مبلغ صحيح');
      return;
    }
    const paymentData: SupplierPayment = {
      ...formData,
      id: paymentToEdit?.id || UUID(),
      createdAt: paymentToEdit?.createdAt || new Date().toISOString(),
    };
    onSave(paymentData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{paymentToEdit ? 'تعديل دفعة' : 'إضافة دفعة جديدة'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المورد *</label>
            <select
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
              required
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            >
              <option value="">اختر مورد</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ *</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
              min="0.01"
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الدفع *</label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
              required
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            >
              <option value="Cash">{AR_LABELS.cash || 'نقدي'}</option>
              <option value="Bank Transfer">{AR_LABELS.bankTransfer || 'تحويل بنكي'}</option>
              <option value="Cheque">{AR_LABELS.cheque || 'شيك'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div className="flex justify-start space-x-4 space-x-reverse pt-4">
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierPaymentsPage;

