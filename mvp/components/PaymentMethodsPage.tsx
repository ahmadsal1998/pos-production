import React, { useState, useMemo } from 'react';
import { PaymentMethod } from '../types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon 
} from '../constants';

// --- MOCK DATA ---
const MOCK_PAYMENT_METHODS_DATA: PaymentMethod[] = [
    { id: UUID(), name: 'نقدي', type: 'Cash', status: 'Active' },
    { id: UUID(), name: 'بطاقة مدى', type: 'Card', status: 'Active' },
    { id: UUID(), name: 'Visa/Mastercard', type: 'Card', status: 'Active' },
    { id: UUID(), name: 'STC Pay', type: 'Digital Wallet', status: 'Active' },
    { id: UUID(), name: 'Apple Pay', type: 'Digital Wallet', status: 'Inactive' },
    { id: UUID(), name: 'حساب آجل (للجملة)', type: 'Credit', status: 'Active' },
    { id: UUID(), name: 'تحويل بنكي', type: 'Other', status: 'Inactive' },
];

const EMPTY_METHOD: Omit<PaymentMethod, 'id'> = {
  name: '',
  type: 'Cash',
  status: 'Active',
};

// --- HELPER COMPONENTS ---
const PaymentMethodModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (method: PaymentMethod) => void;
  methodToEdit: PaymentMethod | null;
}> = ({ isOpen, onClose, onSave, methodToEdit }) => {
  const [formData, setFormData] = useState<Omit<PaymentMethod, 'id'>>(EMPTY_METHOD);

  React.useEffect(() => {
    setFormData(methodToEdit || EMPTY_METHOD);
  }, [methodToEdit, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
        alert('اسم طريقة الدفع مطلوب.');
        return;
    }
    onSave({ id: methodToEdit?.id || UUID(), ...formData });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-right" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-xl font-bold">{AR_LABELS.paymentMethodDetails}</h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{AR_LABELS.paymentMethodName}</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm" required />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">{AR_LABELS.paymentMethodType}</label>
            <select name="type" value={formData.type} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm bg-white">
              <option value="Cash">{AR_LABELS.cash}</option>
              <option value="Card">{AR_LABELS.card}</option>
              <option value="Digital Wallet">{AR_LABELS.digitalWallet}</option>
              <option value="Credit">{AR_LABELS.credit}</option>
              <option value="Other">{AR_LABELS.other}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{AR_LABELS.status}</label>
            <select name="status" value={formData.status} onChange={handleChange} className="w-full border-gray-300 rounded-md shadow-sm bg-white">
              <option value="Active">{AR_LABELS.active}</option>
              <option value="Inactive">{AR_LABELS.inactive}</option>
            </select>
          </div>
          <div className="flex justify-start space-x-4 space-x-reverse pt-4">
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded-md">{AR_LABELS.save}</button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md">{AR_LABELS.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---
const PaymentMethodsPage: React.FC = () => {
    const [methods, setMethods] = useState<PaymentMethod[]>(MOCK_PAYMENT_METHODS_DATA);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [modal, setModal] = useState<{ isOpen: boolean; data: PaymentMethod | null }>({ isOpen: false, data: null });

    const handleSave = (methodData: PaymentMethod) => {
        setMethods(prev => {
            const exists = prev.some(m => m.id === methodData.id);
            if (exists) {
                return prev.map(m => m.id === methodData.id ? methodData : m);
            }
            return [methodData, ...prev];
        });
        setModal({ isOpen: false, data: null });
    };

    const handleDelete = (methodId: string) => {
        if(window.confirm(`هل أنت متأكد من حذف طريقة الدفع هذه؟`)) {
            setMethods(prev => prev.filter(m => m.id !== methodId));
        }
    };
    
    const filteredMethods = useMemo(() => {
        return methods.filter(method => {
            const matchesSearch = searchTerm ? method.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const matchesStatus = statusFilter !== 'all' ? method.status.toLowerCase() === statusFilter : true;
            return matchesSearch && matchesStatus;
        });
    }, [methods, searchTerm, statusFilter]);

    const typeLabels: Record<PaymentMethod['type'], string> = {
        'Cash': AR_LABELS.cash,
        'Card': AR_LABELS.card,
        'Digital Wallet': AR_LABELS.digitalWallet,
        'Credit': AR_LABELS.credit,
        'Other': AR_LABELS.other,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">{AR_LABELS.paymentMethodsManagement}</h1>
                <p className="text-gray-600">{AR_LABELS.paymentMethodsManagementDescription}</p>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-1/3">
                        <input type="text" placeholder={AR_LABELS.searchByPaymentMethodName} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <select onChange={e => setStatusFilter(e.target.value)} className="w-full md:w-auto border-gray-300 rounded-md shadow-sm text-right bg-white">
                            <option value="all">{AR_LABELS.allStatuses}</option>
                            <option value="active">{AR_LABELS.active}</option>
                            <option value="inactive">{AR_LABELS.inactive}</option>
                        </select>
                        <button onClick={() => setModal({ isOpen: true, data: null })} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                            <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.addNewPaymentMethod}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-right">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{AR_LABELS.paymentMethodName}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{AR_LABELS.paymentMethodType}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">{AR_LABELS.status}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">{AR_LABELS.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredMethods.map(method => (
                                <tr key={method.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{method.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{typeLabels[method.type]}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${method.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {method.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <button onClick={() => setModal({ isOpen: true, data: method })} className="text-indigo-600 hover:text-indigo-900 ml-2 p-1"><EditIcon /></button>
                                        <button onClick={() => handleDelete(method.id)} className="text-red-600 hover:text-red-900 p-1"><DeleteIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <PaymentMethodModal 
                isOpen={modal.isOpen}
                onClose={() => setModal({isOpen: false, data: null})}
                onSave={handleSave}
                methodToEdit={modal.data}
            />
        </div>
    );
};

export default PaymentMethodsPage;