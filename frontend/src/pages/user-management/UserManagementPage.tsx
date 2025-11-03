import React, { useState, useMemo } from 'react';
import { User, SystemRole, ScreenPermission, ALL_PERMISSIONS } from '@/shared/types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon
} from '@/shared/constants';
import { UsersIcon } from '@/shared/assets/icons';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';
import CustomDropdown from '@/shared/components/ui/CustomDropdown/CustomDropdown';

// --- MOCK DATA ---
const createInitialUsers = (): User[] => [
    {
        id: UUID(),
        fullName: 'أحمد صالح',
        username: 'admin',
        role: 'Admin',
        permissions: [...ALL_PERMISSIONS],
        createdAt: '2023-01-01T10:00:00Z',
        lastLogin: new Date().toISOString(),
        status: 'Active',
    },
    {
        id: UUID(),
        fullName: 'فاطمة علي',
        username: 'fatima.manager',
        role: 'Manager',
        permissions: ['dashboard', 'products', 'categories', 'brands', 'salesToday', 'salesHistory', 'refunds'],
        createdAt: '2023-05-15T12:30:00Z',
        lastLogin: '2024-07-20T18:00:00Z',
        status: 'Active',
    },
    {
        id: UUID(),
        fullName: 'خالد عبدالله',
        username: 'khalid.cashier',
        role: 'Cashier',
        permissions: ['posRetail', 'posWholesale', 'refunds'],
        createdAt: '2024-02-10T09:00:00Z',
        lastLogin: '2024-07-21T09:05:00Z',
        status: 'Active',
    },
    {
        id: UUID(),
        fullName: 'سارة إبراهيم',
        username: 'sara.inactive',
        role: 'Cashier',
        permissions: [],
        createdAt: '2023-11-20T14:00:00Z',
        lastLogin: '2024-01-10T11:00:00Z',
        status: 'Inactive',
    },
];

const EMPTY_USER: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
    fullName: '',
    username: '',
    password: '',
    role: 'Cashier',
    permissions: [],
    status: 'Active',
};

const PERMISSION_LABELS: Record<ScreenPermission, string> = {
    dashboard: AR_LABELS.permissionDashboard,
    products: AR_LABELS.permissionProducts,
    categories: AR_LABELS.permissionCategories,
    brands: AR_LABELS.permissionBrands,
    purchases: AR_LABELS.permissionPurchases,
    expenses: AR_LABELS.permissionExpenses,
    salesToday: AR_LABELS.permissionSalesToday,
    salesHistory: AR_LABELS.permissionSalesHistory,
    posRetail: AR_LABELS.permissionPosRetail,
    posWholesale: AR_LABELS.permissionPosWholesale,
    refunds: AR_LABELS.permissionRefunds,
    preferences: AR_LABELS.permissionPreferences,
    users: AR_LABELS.permissionUsers,
};

// --- HELPER COMPONENTS ---
const UserFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  userToEdit: User | null;
  existingUsers: User[];
}> = ({ isOpen, onClose, onSave, userToEdit, existingUsers }) => {
    const [formData, setFormData] = useState<Omit<User, 'id' | 'createdAt' | 'lastLogin'>>(EMPTY_USER);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const isEditMode = !!userToEdit;

    React.useEffect(() => {
        if (isEditMode) {
            setFormData({ ...userToEdit, password: '' });
        } else {
            setFormData(EMPTY_USER);
        }
        setConfirmPassword('');
        setErrors({});
    }, [userToEdit, isOpen]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = "الاسم الكامل مطلوب.";
        if (!formData.username.trim()) newErrors.username = "اسم المستخدم مطلوب.";
        else if (existingUsers.some(u => u.username === formData.username && u.id !== userToEdit?.id)) {
            newErrors.username = "اسم المستخدم موجود بالفعل.";
        }

        if (!isEditMode || formData.password) {
            if (!formData.password) newErrors.password = "كلمة المرور مطلوبة.";
            else if (formData.password.length < 6) newErrors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
            else if (formData.password !== confirmPassword) newErrors.confirmPassword = "كلمتا المرور غير متطابقتين.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        const userData: User = {
            id: userToEdit?.id || UUID(),
            createdAt: userToEdit?.createdAt || new Date().toISOString(),
            lastLogin: userToEdit?.lastLogin || null,
            ...formData,
        };
        onSave(userData);
    };

    const handlePermissionChange = (permission: ScreenPermission, checked: boolean) => {
        setFormData(prev => {
            const newPermissions = new Set(prev.permissions);
            if (checked) {
                newPermissions.add(permission);
            } else {
                newPermissions.delete(permission);
            }
            return { ...prev, permissions: Array.from(newPermissions) };
        });
    };
    
    if (!isOpen) return null;

    return (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-2xl text-right border border-slate-200/50 dark:border-slate-700/50" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/50">
                            <UsersIcon />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{isEditMode ? AR_LABELS.userDetails : AR_LABELS.addNewUser}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.fullName}</label>
                            <input 
                                type="text" 
                                value={formData.fullName} 
                                onChange={e => setFormData(f => ({...f, fullName: e.target.value}))} 
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.username}</label>
                            <input 
                                type="text" 
                                value={formData.username} 
                                onChange={e => setFormData(f => ({...f, username: e.target.value}))} 
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                            />
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.password}</label>
                            <input 
                                type="password" 
                                placeholder={isEditMode ? 'اتركه فارغاً لعدم التغيير' : ''} 
                                value={formData.password} 
                                onChange={e => setFormData(f => ({...f, password: e.target.value}))} 
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                            />
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.confirmPassword}</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl shadow-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500"
                            />
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{AR_LABELS.role}</label>
                            <CustomDropdown
                                value={formData.role}
                                onChange={(value) => setFormData(f => ({...f, role: value as SystemRole}))}
                                options={[
                                    { value: 'Admin', label: AR_LABELS.admin },
                                    { value: 'Manager', label: AR_LABELS.manager },
                                    { value: 'Cashier', label: AR_LABELS.cashier }
                                ]}
                                placeholder={AR_LABELS.role}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{AR_LABELS.status}</label>
                            <div className="flex items-center justify-end py-3 px-4 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
                                <ToggleSwitch enabled={formData.status === 'Active'} onChange={e => setFormData(f => ({...f, status: e ? 'Active' : 'Inactive'}))} />
                                <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {formData.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{AR_LABELS.screenAccessPermissions}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-5 border border-slate-200/50 dark:border-slate-700/50 rounded-xl bg-slate-50/50 dark:bg-slate-800/50">
                            {ALL_PERMISSIONS.map(p => (
                                <div key={p} className="flex justify-end items-center py-2 px-3 rounded-lg hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-colors">
                                    <label htmlFor={`perm-${p}`} className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer flex-1">{PERMISSION_LABELS[p]}</label>
                                    <input 
                                        type="checkbox" 
                                        id={`perm-${p}`} 
                                        checked={formData.permissions.includes(p)} 
                                        onChange={e => handlePermissionChange(p, e.target.checked)} 
                                        className="h-4 w-4 text-orange-600 border-slate-300 dark:border-slate-600 rounded focus:ring-orange-500 cursor-pointer" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-start gap-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                        <button 
                            type="submit" 
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 hover:scale-105 active:scale-95"
                        >
                            {AR_LABELS.save}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-6 py-3 bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:bg-slate-300 dark:hover:bg-slate-700"
                        >
                            {AR_LABELS.cancel}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const UserManagementPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>(createInitialUsers());
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ status: 'all', role: 'all' });
    const [modal, setModal] = useState<{ isOpen: boolean; data: User | null }>({ isOpen: false, data: null });

    const handleSaveUser = (userData: User) => {
        setUsers(prev => {
            const exists = prev.some(u => u.id === userData.id);
            if (exists) {
                return prev.map(u => u.id === userData.id ? { ...u, ...userData, password: '' } : u); // Never store password in state
            }
            return [{ ...userData, password: '' }, ...prev];
        });
        setModal({ isOpen: false, data: null });
    };

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
            setUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch = searchTerm ?
                user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            const matchesStatus = filters.status !== 'all' ? user.status.toLowerCase() === filters.status : true;
            const matchesRole = filters.role !== 'all' ? user.role === filters.role : true;
            return matchesSearch && matchesStatus && matchesRole;
        });
    }, [users, searchTerm, filters]);

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Modern Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 dark:from-slate-950 dark:via-blue-950/20 dark:to-indigo-950/30" />
            
            {/* Subtle Floating Orbs */}
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-400/15 to-indigo-400/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-400/15 to-purple-400/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-400/10 to-blue-400/10 blur-2xl animate-pulse" style={{ animationDelay: '4s' }} />

            <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Modern Professional Header */}
                <div className="mb-12">
                    <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
                        <div className="space-y-4">
                            <div className="space-y-3">
                                <div className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50">
                                    <div className="mr-2 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                    إدارة المستخدمين
                                </div>
                                <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-4xl font-bold tracking-tight text-transparent dark:from-white dark:via-slate-100 dark:to-white sm:text-5xl lg:text-6xl">
                                    {AR_LABELS.userManagement}
                                </h1>
                                <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {AR_LABELS.userManagementDescription}
                                </p>
                            </div>
                        </div>
                        
                        {/* Modern Status Card */}
                        <div className="group relative">
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur transition-all duration-300 group-hover:opacity-30" />
                            <div className="relative rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:bg-slate-900/90 border border-slate-200/50 dark:border-slate-700/50">
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-2 mb-3">
                                        <UsersIcon />
                                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">المستخدمين</p>
                                    </div>
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {users.length}
                                    </p>
                                    <div className="flex items-center justify-end space-x-2 space-x-reverse mt-2">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                            {users.filter(u => u.status === 'Active').length} نشط
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Toolbar */}
                <div className="group relative mb-8">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 opacity-0 blur transition-all duration-500 group-hover:opacity-100 dark:from-slate-700 dark:to-slate-600" />
                    <div className="relative rounded-2xl bg-white/95 backdrop-blur-xl p-6 shadow-lg transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                            <div className="relative w-full lg:w-1/3">
                                <input 
                                    type="text" 
                                    placeholder={AR_LABELS.searchByUserNameOrRole} 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all duration-200 hover:border-slate-400 dark:hover:border-slate-500 text-right shadow-sm"
                                />
                                <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
                            </div>
                            <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap justify-end">
                                <CustomDropdown
                                    id="filter-status-dropdown"
                                    value={filters.status}
                                    onChange={(value) => setFilters(f => ({...f, status: value}))}
                                    options={[
                                        { value: 'all', label: AR_LABELS.allStatuses },
                                        { value: 'active', label: AR_LABELS.active },
                                        { value: 'inactive', label: AR_LABELS.inactive }
                                    ]}
                                    placeholder={AR_LABELS.allStatuses}
                                    className="w-full lg:w-auto min-w-[140px]"
                                />
                                <CustomDropdown
                                    id="filter-role-dropdown"
                                    value={filters.role}
                                    onChange={(value) => setFilters(f => ({...f, role: value}))}
                                    options={[
                                        { value: 'all', label: 'كل الأدوار' },
                                        { value: 'Admin', label: AR_LABELS.admin },
                                        { value: 'Manager', label: AR_LABELS.manager },
                                        { value: 'Cashier', label: AR_LABELS.cashier }
                                    ]}
                                    placeholder="كل الأدوار"
                                    className="w-full lg:w-auto min-w-[140px]"
                                />
                                <div className="group relative">
                                    <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 opacity-20 blur transition-all duration-300 group-hover:opacity-30" />
                                    <button 
                                        onClick={() => setModal({ isOpen: true, data: null })} 
                                        className="relative inline-flex items-center px-5 py-3 border border-transparent text-sm font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-300 hover:scale-105 active:scale-95"
                                    >
                                        <PlusIcon className="h-4 w-4 ml-2" />
                                        <span>{AR_LABELS.addNewUser}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modern Table */}
                <div className="group relative">
                    <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-slate-200 to-slate-300 opacity-0 blur transition-all duration-500 group-hover:opacity-100 dark:from-slate-700 dark:to-slate-600" />
                    <div className="relative rounded-2xl bg-white/95 backdrop-blur-xl shadow-lg transition-all duration-500 hover:shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-right">
                                <thead className="bg-slate-50/50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{AR_LABELS.fullName}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{AR_LABELS.role}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{AR_LABELS.permissions}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{AR_LABELS.lastLogin}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">{AR_LABELS.status}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-center">{AR_LABELS.actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                                   {filteredUsers.map(user => (
                                       <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors duration-150">
                                           <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.fullName}</div>
                                                <div className="text-sm text-slate-500 dark:text-slate-400">{user.username}</div>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{AR_LABELS[user.role.toLowerCase() as keyof typeof AR_LABELS]}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                                    {user.permissions.length} / {ALL_PERMISSIONS.length}
                                                </span>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                                                {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول'}
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                    {user.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                                                </span>
                                           </td>
                                           <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => setModal({ isOpen: true, data: user })} 
                                                        className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200" 
                                                        aria-label={`Edit ${user.fullName}`}
                                                    >
                                                        <EditIcon />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteUser(user.id)} 
                                                        className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200" 
                                                        aria-label={`Delete ${user.fullName}`}
                                                    >
                                                        <DeleteIcon />
                                                    </button>
                                                </div>
                                           </td>
                                       </tr>
                                   ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <UserFormModal
                isOpen={modal.isOpen}
                onClose={() => setModal({isOpen: false, data: null})}
                onSave={handleSaveUser}
                userToEdit={modal.data}
                existingUsers={users}
            />
        </div>
    );
};

export default UserManagementPage;