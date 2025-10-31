import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, PurchaseOrder, SupplierPayment } from '@/features/financial/types';
import { AR_LABELS, UUID, SearchIcon, EditIcon, DeleteIcon, ViewIcon, PlusIcon } from '@/shared/constants';
import { GridViewIcon, TableViewIcon } from '@/shared/constants';

type LayoutType = 'table' | 'grid';

// Helper function to calculate supplier balance
const calculateSupplierBalance = (
  supplierId: string,
  purchases: PurchaseOrder[],
  payments: SupplierPayment[]
): number => {
  const totalPurchases = purchases
    .filter(p => p.supplierId === supplierId)
    .reduce((sum, p) => sum + p.totalAmount, 0);
  
  const totalPaid = payments
    .filter(p => p.supplierId === supplierId)
    .reduce((sum, p) => sum + p.amount, 0);
  
  return totalPurchases - totalPaid;
};

// Mock data
const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'supp-1', name: 'شركة المواد الغذائية المتحدة', contactPerson: 'أحمد خالد', email: 'ahmad@supplier1.com', phone: '0112345678', address: 'الرياض, المنطقة الصناعية', notes: 'مورد رئيسي للمواد الجافة', previousBalance: 15000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'supp-2', name: 'موردو الإلكترونيات الحديثة', contactPerson: 'سارة عبدالله', email: 'sara@supplier2.com', phone: '0128765432', address: 'جدة, حي الشاطئ', notes: '', previousBalance: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'supp-3', name: 'شركة المشروبات العالمية', contactPerson: 'محمد علي', email: 'mohammed@supplier3.com', phone: '0134567890', address: 'الدمام, ميناء الملك عبدالعزيز', notes: 'الدفع عند الاستلام فقط', previousBalance: 5250.50, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface SuppliersPageProps {
  purchases?: PurchaseOrder[];
  payments?: SupplierPayment[];
  suppliers?: Supplier[];
  onSuppliersUpdated?: (suppliers: Supplier[]) => void;
}

const SuppliersPage: React.FC<SuppliersPageProps> = ({ 
  purchases = [], 
  payments = [],
  suppliers: initialSuppliers,
  onSuppliersUpdated
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers || MOCK_SUPPLIERS);
  
  // Sync with parent suppliers
  useEffect(() => {
    if (initialSuppliers) {
      setSuppliers(initialSuppliers);
    }
  }, [initialSuppliers]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'credit' | 'debit' | 'zero'>('all');
  const [layout, setLayout] = useState<LayoutType>('table');
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'add' | 'edit'; data: Supplier | null }>({ isOpen: false, type: 'add', data: null });
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; supplier: Supplier | null }>({ isOpen: false, supplier: null });

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(supplier => {
      const matchesSearch = searchTerm
        ? supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const balance = calculateSupplierBalance(supplier.id, purchases, payments) + (supplier.previousBalance || 0);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'credit' && balance > 0) ||
        (statusFilter === 'debit' && balance < 0) ||
        (statusFilter === 'zero' && balance === 0);
      
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter, purchases, payments]);

  const handleSaveSupplier = (supplierData: Supplier) => {
    let updatedSuppliers: Supplier[];
    if (modal.type === 'add') {
      updatedSuppliers = [...suppliers, { ...supplierData, id: UUID() }];
      setSuppliers(updatedSuppliers);
    } else {
      updatedSuppliers = suppliers.map(s => s.id === supplierData.id ? supplierData : s);
      setSuppliers(updatedSuppliers);
    }
    if (onSuppliersUpdated) {
      onSuppliersUpdated(updatedSuppliers);
    }
    setModal({ isOpen: false, type: 'add', data: null });
  };

  const handleDeleteSupplier = (supplierId: string) => {
    const supplierPurchases = purchases.filter(p => p.supplierId === supplierId);
    if (supplierPurchases.length > 0) {
      alert('لا يمكن حذف مورد لديه مشتريات مسجلة');
      return;
    }
    if (window.confirm('هل أنت متأكد من حذف هذا المورد؟')) {
      const updatedSuppliers = suppliers.filter(s => s.id !== supplierId);
      setSuppliers(updatedSuppliers);
      if (onSuppliersUpdated) {
        onSuppliersUpdated(updatedSuppliers);
      }
    }
  };

  const handleViewDetails = (supplier: Supplier) => {
    setDetailsModal({ isOpen: true, supplier });
  };

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="ابحث بالاسم، الهاتف، أو البريد الإلكتروني..."
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
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">اسم المورد</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">معلومات الاتصال</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">الرصيد الحالي</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">عدد الفواتير</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSuppliers.map((supplier) => {
                  const balance = calculateSupplierBalance(supplier.id, purchases, payments) + (supplier.previousBalance || 0);
                  const invoiceCount = purchases.filter(p => p.supplierId === supplier.id).length;
                  return (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{supplier.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{supplier.phone || supplier.email || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-center ${balance > 0 ? 'text-red-600 dark:text-red-400' : balance < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {balance.toFixed(2)} ر.س
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">{invoiceCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button onClick={() => handleViewDetails(supplier)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 ml-4 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`عرض تفاصيل ${supplier.name}`}><ViewIcon /></button>
                        <button onClick={() => setModal({ isOpen: true, type: 'edit', data: supplier })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-4 p-2 rounded-full hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.edit} ${supplier.name}`}><EditIcon /></button>
                        <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-gray-700 transition-colors duration-200" aria-label={`${AR_LABELS.delete} ${supplier.name}`}><DeleteIcon /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const balance = calculateSupplierBalance(supplier.id, purchases, payments) + (supplier.previousBalance || 0);
            const invoiceCount = purchases.filter(p => p.supplierId === supplier.id).length;
            return (
              <div key={supplier.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{supplier.name}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{supplier.phone || supplier.email || '-'}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">عدد الفواتير: {invoiceCount}</p>
                <p className={`text-sm font-semibold mb-3 ${balance > 0 ? 'text-red-600 dark:text-red-400' : balance < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  الرصيد: {balance.toFixed(2)} ر.س
                </p>
                <div className="border-t dark:border-gray-700 pt-2 flex justify-end space-x-2 space-x-reverse">
                  <button onClick={() => handleViewDetails(supplier)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"><ViewIcon /></button>
                  <button onClick={() => setModal({ isOpen: true, type: 'edit', data: supplier })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1"><EditIcon /></button>
                  <button onClick={() => handleDeleteSupplier(supplier.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, type: 'add', data: null })}
        onSave={handleSaveSupplier}
        supplierToEdit={modal.data}
      />

      {/* Supplier Details Modal */}
      <SupplierDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, supplier: null })}
        supplier={detailsModal.supplier}
        purchases={purchases}
        payments={payments}
      />
    </div>
  );
};

// Supplier Form Modal Component
const SupplierFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  supplierToEdit: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplierToEdit }) => {
  const [formData, setFormData] = useState<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    previousBalance: 0,
  });

  React.useEffect(() => {
    if (supplierToEdit) {
      setFormData(supplierToEdit);
    } else {
      setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '', notes: '', previousBalance: 0 });
    }
  }, [supplierToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('اسم المورد مطلوب');
      return;
    }
    const supplierData: Supplier = {
      ...formData,
      id: supplierToEdit?.id || UUID(),
      createdAt: supplierToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(supplierData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg text-right" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{supplierToEdit ? 'تعديل مورد' : 'إضافة مورد جديد'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المورد *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الشخص المسؤول</label>
            <input
              type="text"
              value={formData.contactPerson || ''}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الهاتف</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العنوان</label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الرصيد السابق</label>
            <input
              type="number"
              value={formData.previousBalance || 0}
              onChange={(e) => setFormData({ ...formData, previousBalance: parseFloat(e.target.value) || 0 })}
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

// Supplier Details Modal Component
const SupplierDetailsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  purchases: PurchaseOrder[];
  payments: SupplierPayment[];
}> = ({ isOpen, onClose, supplier, purchases, payments }) => {
  if (!isOpen || !supplier) return null;

  const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
  const supplierPayments = payments.filter(p => p.supplierId === supplier.id);
  const totalPurchases = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalPurchases + (supplier.previousBalance || 0) - totalPaid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto text-right" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">تفاصيل المورد: {supplier.name}</h2>
        
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المشتريات</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalPurchases.toFixed(2)} ر.س</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">إجمالي المدفوع</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalPaid.toFixed(2)} ر.س</p>
          </div>
          <div className={`p-4 rounded-lg ${balance > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
            <p className="text-sm text-gray-600 dark:text-gray-400">الرصيد الحالي</p>
            <p className={`text-2xl font-bold ${balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>{balance.toFixed(2)} ر.س</p>
          </div>
        </div>

        {/* Invoices */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">الفواتير ({supplierPurchases.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">رقم الفاتورة</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {supplierPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="px-4 py-2 text-sm">{purchase.id}</td>
                    <td className="px-4 py-2 text-sm">{new Date(purchase.purchaseDate).toLocaleDateString('ar-SA')}</td>
                    <td className="px-4 py-2 text-sm">{purchase.totalAmount.toFixed(2)} ر.س</td>
                    <td className="px-4 py-2 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${purchase.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {purchase.status === 'Completed' ? 'مكتمل' : 'معلق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">المدفوعات ({supplierPayments.length})</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">التاريخ</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">المبلغ</th>
                  <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">طريقة الدفع</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {supplierPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-2 text-sm">{new Date(payment.date).toLocaleDateString('ar-SA')}</td>
                    <td className="px-4 py-2 text-sm">{payment.amount.toFixed(2)} ر.س</td>
                    <td className="px-4 py-2 text-sm">{payment.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-start space-x-4 space-x-reverse pt-4 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md">{AR_LABELS.cancel}</button>
        </div>
      </div>
    </div>
  );
};

export default SuppliersPage;

