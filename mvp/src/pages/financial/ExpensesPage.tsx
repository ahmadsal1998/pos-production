import React, { useState, useMemo } from 'react';
import { Expense, ExpenseCategory, ExpenseStatus, ExpensePaymentMethod } from '@/features/financial/types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon
} from '@/shared/constants';
import { MetricCard } from '@/shared/components/ui/MetricCard';

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

    // Calculate summary metrics
    const summaryMetrics = useMemo(() => {
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const paidExpenses = expenses.filter(e => e.status === 'Paid').reduce((sum, e) => sum + e.amount, 0);
        const unpaidExpenses = expenses.filter(e => e.status === 'Unpaid').reduce((sum, e) => sum + e.amount, 0);
        const thisMonth = expenses.filter(e => {
            const expenseDate = new Date(e.date);
            const now = new Date();
            return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
        }).reduce((sum, e) => sum + e.amount, 0);

        return {
            total: totalExpenses,
            paid: paidExpenses,
            unpaid: unpaidExpenses,
            thisMonth: thisMonth
        };
    }, [expenses]);

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-rose-50/20 to-red-100/30 dark:from-slate-950 dark:via-rose-950/20 dark:to-red-950/30" />
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-red-400/15 to-rose-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-rose-400/15 to-pink-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-red-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Modern Professional Header */}
                <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                    <div className="space-y-4">
                        <div className="space-y-3">
                            <div className="inline-flex items-center rounded-full bg-gradient-to-r from-red-500/10 to-rose-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200/50 dark:border-red-800/50">
                                <div className="mr-2 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                إدارة المصروفات
                            </div>
                            <h1 className="bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-red-100 dark:to-white sm:text-5xl">
                                {AR_LABELS.expenseManagement}
                            </h1>
                            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                {AR_LABELS.expenseManagementDescription}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={() => setModal({ isOpen: true, data: null })} 
                        className="group relative inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/50 transition-all duration-300 hover:shadow-xl hover:scale-105"
                    >
                        <PlusIcon className="h-5 w-5 ml-2" />
                        <span>{AR_LABELS.addNewExpense}</span>
                    </button>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                        id={1} 
                        title="إجمالي المصروفات" 
                        value={summaryMetrics.total.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} 
                        icon={<div className="w-6 h-6 bg-red-500 rounded"></div>} 
                        bgColor="bg-red-100" 
                        valueColor="text-red-600" 
                    />
                    <MetricCard 
                        id={2} 
                        title="المدفوعة" 
                        value={summaryMetrics.paid.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} 
                        icon={<div className="w-6 h-6 bg-green-500 rounded"></div>} 
                        bgColor="bg-green-100" 
                        valueColor="text-green-600" 
                    />
                    <MetricCard 
                        id={3} 
                        title="غير المدفوعة" 
                        value={summaryMetrics.unpaid.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} 
                        icon={<div className="w-6 h-6 bg-yellow-500 rounded"></div>} 
                        bgColor="bg-yellow-100" 
                        valueColor="text-yellow-600" 
                    />
                    <MetricCard 
                        id={4} 
                        title="هذا الشهر" 
                        value={summaryMetrics.thisMonth.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})} 
                        icon={<div className="w-6 h-6 bg-blue-500 rounded"></div>} 
                        bgColor="bg-blue-100" 
                        valueColor="text-blue-600" 
                    />
                </div>

                {/* Toolbar */}
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm p-6 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex flex-col lg:flex-row items-stretch gap-4">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                            <input 
                                type="text" 
                                placeholder={AR_LABELS.searchByExpenseDetails} 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent text-right"
                            />
                        </div>
                        <select 
                            onChange={e => setFilters(f => ({...f, status: e.target.value}))} 
                            value={filters.status}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent text-right"
                        >
                            <option value="all">{AR_LABELS.allStatuses}</option>
                            <option value="Paid">{AR_LABELS.paid}</option>
                            <option value="Unpaid">{AR_LABELS.unpaid}</option>
                        </select>
                        <select 
                            onChange={e => setFilters(f => ({...f, category: e.target.value}))} 
                            value={filters.category}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent text-right"
                        >
                            <option value="all">كل الفئات</option>
                            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white/95 dark:bg-gray-800/95 rounded-2xl shadow-sm overflow-hidden backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.expenseNumber}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.expenseCategory}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.responsiblePerson}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.amount}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.date}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{AR_LABELS.status}</th>
                                    <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredExpenses.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800 dark:text-gray-200">{e.id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{e.category}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{e.responsible}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">{e.amount.toLocaleString('ar-SA', {style: 'currency', currency: 'SAR'})}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{new Date(e.date).toLocaleDateString('ar-SA')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${e.status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'}`}>
                                                {e.status === 'Paid' ? AR_LABELS.paid : AR_LABELS.unpaid}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                            <div className="flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => setModal({ isOpen: true, data: e })} 
                                                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors"
                                                    title={AR_LABELS.edit}
                                                >
                                                    <EditIcon/>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(e.id)} 
                                                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-gray-700 transition-colors"
                                                    title={AR_LABELS.delete}
                                                >
                                                    <DeleteIcon/>
                                                </button>
                                            </div>
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
        </div>
    );
};

export default ExpensesPage;