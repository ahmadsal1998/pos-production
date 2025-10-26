import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, ExpenseStatus, ExpensePaymentMethod } from '../types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon
} from '../constants';

// --- MOCK DATA ---
const MOCK_EXPENSES: Expense[] = [
    {
        id: `EXP-${UUID()}`,
        category: 'Salaries',
        responsible: 'قسم الموارد البشرية',
        amount: 25000.00,
        date: new Date(new Date().setDate(1)).toISOString(),
        status: 'Paid',
        paymentMethod: 'Bank Transfer',
        notes: 'رواتب شهر يوليو'
    },
    {
        id: `EXP-${UUID()}`,
        category: 'Rent',
        responsible: 'الإدارة',
        amount: 10000.00,
        date: new Date(new Date().setDate(5)).toISOString(),
        status: 'Paid',
        paymentMethod: 'Bank Transfer',
        notes: 'إيجار المقر الرئيسي'
    },
    {
        id: `EXP-${UUID()}`,
        category: 'Maintenance',
        responsible: 'قسم الصيانة',
        amount: 750.50,
        date: new Date(new Date().setDate(15)).toISOString(),
        status: 'Unpaid',
        paymentMethod: 'Cash',
        notes: 'إصلاح نظام التكييف'
    },
    {
        id: `EXP-${UUID()}`,
        category: 'Utilities',
        responsible: 'الإدارة',
        amount: 1200.00,
        date: new Date(new Date().setDate(20)).toISOString(),
        status: 'Paid',
        paymentMethod: 'Card',
        notes: 'فاتورة الكهرباء والماء'
    }
];

const EMPTY_EXPENSE: Omit<Expense, 'id'> = {
    category: 'Other',
    responsible: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Paid',
    paymentMethod: 'Cash',
    notes: '',
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['Salaries', 'Maintenance', 'Operations', 'Marketing', 'Rent', 'Utilities', 'Other'];
const PAYMENT_METHODS: ExpensePaymentMethod[] = ['Cash', 'Bank Transfer', 'Card'];

// --- MODAL COMPONENT ---
const ExpenseFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expenseToEdit: Expense | null;
}> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
    const [formData, setFormData] = useState<Omit<Expense, 'id'>>(EMPTY_EXPENSE);

    React.useEffect(() => {
        if (expenseToEdit) {
            setFormData({ ...expenseToEdit, date: expenseToEdit.date.split('T')[0] });
        } else {
            setFormData(EMPTY_EXPENSE);
        }
    }, [expenseToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.responsible || formData.amount <= 0) {
            alert('يرجى ملء جميع الحقول المطلوبة بمبالغ صحيحة.');
            return;
        }
        onSave({ id: expenseToEdit?.id || `EXP-${UUID()}`, ...formData });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg text-right" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{expenseToEdit ? AR_LABELS.edit : AR_LABELS.addNewExpense}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.expenseCategory}</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">{EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.responsiblePerson}</label>
                            <input type="text" name="responsible" value={formData.responsible} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.amount}</label>
                            <input type="number" name="amount" value={formData.amount} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm" required min="0.01" step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.date}</label>
                            <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm" required />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.status}</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">
                                <option value="Paid">{AR_LABELS.paid}</option>
                                <option value="Unpaid">{AR_LABELS.unpaid}</option>
                            </select>
                        </div>
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.paymentMethod}</label>
                            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                        <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"></textarea>
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


// --- MAIN PAGE COMPONENT ---
const ExpensesPage: React.FC = () => {
    const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', category: 'all' });
    const [modal, setModal] = useState<{ isOpen: boolean; data: Expense | null }>({ isOpen: false, data: null });

    const handleSave = (expenseData: Expense) => {
        setExpenses(prev => {
            const exists = prev.some(e => e.id === expenseData.id);
            if (exists) {
                return prev.map(e => e.id === expenseData.id ? expenseData : e);
            }
            return [expenseData, ...prev];
        });
        setModal({ isOpen: false, data: null });
    };

    const handleDelete = (expenseId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
            setExpenses(prev => prev.filter(e => e.id !== expenseId));
        }
    };

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => {
            const lowerSearch = searchTerm.toLowerCase();
            const matchesSearch = searchTerm ?
                e.id.toLowerCase().includes(lowerSearch) ||
                e.responsible.toLowerCase().includes(lowerSearch) ||
                e.category.toLowerCase().includes(lowerSearch)
                : true;
            const matchesStatus = filters.status !== 'all' ? e.status === filters.status : true;
            const matchesCategory = filters.category !== 'all' ? e.category === filters.category : true;
            return matchesSearch && matchesStatus && matchesCategory;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, searchTerm, filters]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.expenseManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.expenseManagementDescription}</p>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                    <div className="relative lg:col-span-2">
                        <input type="text" placeholder={AR_LABELS.searchByExpenseDetails} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex items-center gap-2 w-full flex-wrap">
                        <select onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                            <option value="all">{AR_LABELS.allStatuses}</option>
                            <option value="Paid">{AR_LABELS.paid}</option>
                            <option value="Unpaid">{AR_LABELS.unpaid}</option>
                        </select>
                         <select onChange={e => setFilters(f => ({...f, category: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                            <option value="all">كل الفئات</option>
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <button onClick={() => setModal({ isOpen: true, data: null })} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                        <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.addNewExpense}</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.expenseNumber}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.expenseCategory}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.responsiblePerson}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.amount}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.date}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.status}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">{AR_LABELS.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredExpenses.map(e => (
                                <tr key={e.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800 dark:text-gray-200">{e.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{e.category}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">{e.responsible}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{e.amount.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(e.date).toLocaleDateString('ar-SA')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${e.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                            {e.status === 'Paid' ? AR_LABELS.paid : AR_LABELS.unpaid}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <button onClick={() => setModal({ isOpen: true, data: e })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 ml-2"><EditIcon/></button>
                                        <button onClick={() => handleDelete(e.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1"><DeleteIcon/></button>
                                    </td>
                                </tr>
                            ))}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">{AR_LABELS.noSalesFound}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <ExpenseFormModal 
                isOpen={modal.isOpen}
                onClose={() => setModal({isOpen: false, data: null})}
                onSave={handleSave}
                expenseToEdit={modal.data}
            />
        </div>
    );
};

export default ExpensesPage;