import React, { useState, useMemo } from 'react';
import { User, SystemRole, ScreenPermission, ALL_PERMISSIONS } from '@/shared/types';
import { 
  AR_LABELS, UUID, SearchIcon, PlusIcon, EditIcon, DeleteIcon
} from '@/shared/constants';
import { ToggleSwitch } from '@/shared/components/ui/ToggleSwitch';

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
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl text-right" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                    {/* FIX: Replaced non-existent AR_LABELS.editUser with AR_LABELS.userDetails for the modal title. */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{isEditMode ? AR_LABELS.userDetails : AR_LABELS.addNewUser}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.fullName}</label>
                            <input type="text" value={formData.fullName} onChange={e => setFormData(f => ({...f, fullName: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.username}</label>
                            <input type="text" value={formData.username} onChange={e => setFormData(f => ({...f, username: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.password}</label>
                            <input type="password" placeholder={isEditMode ? 'اتركه فارغاً لعدم التغيير' : ''} value={formData.password} onChange={e => setFormData(f => ({...f, password: e.target.value}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                             {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.confirmPassword}</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm"/>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{AR_LABELS.role}</label>
                            <select value={formData.role} onChange={e => setFormData(f => ({...f, role: e.target.value as SystemRole}))} className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md shadow-sm">
                                <option value="Admin">{AR_LABELS.admin}</option>
                                <option value="Manager">{AR_LABELS.manager}</option>
                                <option value="Cashier">{AR_LABELS.cashier}</option>
                            </select>
                        </div>
                        <div className="flex items-center">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-4">{AR_LABELS.status}</label>
                            <ToggleSwitch enabled={formData.status === 'Active'} onChange={e => setFormData(f => ({...f, status: e ? 'Active' : 'Inactive'}))} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{AR_LABELS.screenAccessPermissions}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/50">
                            {ALL_PERMISSIONS.map(p => (
                                <div key={p} className="flex justify-end items-center">
                                    <label htmlFor={`perm-${p}`} className="text-sm font-medium text-gray-700 dark:text-gray-300">{PERMISSION_LABELS[p]}</label>
                                    <input type="checkbox" id={`perm-${p}`} checked={formData.permissions.includes(p)} onChange={e => handlePermissionChange(p, e.target.checked)} className="mr-2 h-4 w-4 text-orange-600 border-gray-300 dark:border-gray-600 rounded focus:ring-orange-500" />
                                </div>
                            ))}
                        </div>
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
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{AR_LABELS.userManagement}</h1>
                <p className="text-gray-600 dark:text-gray-400">{AR_LABELS.userManagementDescription}</p>
            </div>

            {/* Toolbar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-1/3">
                        <input type="text" placeholder={AR_LABELS.searchByUserNameOrRole} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-3 pr-10 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 focus:ring-orange-500 text-right"/>
                        <SearchIcon className="absolute top-1/2 left-3 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                        <select onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="w-full md:w-auto border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                            <option value="all">{AR_LABELS.allStatuses}</option>
                            <option value="active">{AR_LABELS.active}</option>
                            <option value="inactive">{AR_LABELS.inactive}</option>
                        </select>
                         <select onChange={e => setFilters(f => ({...f, role: e.target.value}))} className="w-full md:w-auto border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md shadow-sm text-right">
                            <option value="all">كل الأدوار</option>
                            <option value="Admin">{AR_LABELS.admin}</option>
                            <option value="Manager">{AR_LABELS.manager}</option>
                            <option value="Cashier">{AR_LABELS.cashier}</option>
                        </select>
                        <button onClick={() => setModal({ isOpen: true, data: null })} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-500 hover:bg-orange-600">
                            <PlusIcon className="h-4 w-4 ml-2" /><span>{AR_LABELS.addNewUser}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.fullName}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.role}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.permissions}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.lastLogin}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{AR_LABELS.status}</th>
                                <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase text-center">{AR_LABELS.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                           {filteredUsers.map(user => (
                               <tr key={user.id}>
                                   <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.fullName}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.username}</div>
                                   </td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{AR_LABELS[user.role.toLowerCase() as keyof typeof AR_LABELS]}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{user.permissions.length} / {ALL_PERMISSIONS.length}</td>
                                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG') : 'لم يسجل دخول'}
                                   </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                            {user.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <button onClick={() => setModal({ isOpen: true, data: user })} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2 p-1" aria-label={`Edit ${user.fullName}`}><EditIcon /></button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1" aria-label={`Delete ${user.fullName}`}><DeleteIcon /></button>
                                    </td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
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