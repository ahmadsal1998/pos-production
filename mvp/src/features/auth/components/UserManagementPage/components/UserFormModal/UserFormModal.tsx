import React, { useState, useEffect } from 'react';
import {
  User,
  SystemRole,
  ScreenPermission,
  ALL_PERMISSIONS,
} from '../../../../../../shared/types';
import { AR_LABELS, UUID, ToggleSwitch } from '../../../../../../shared/constants';
import { components, typography } from '../../../../../../shared/styles/design-tokens';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User) => void;
  userToEdit: User | null;
  existingUsers: User[];
}

interface FormErrors {
  fullName?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
}

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

export const UserFormModal = ({
  isOpen,
  onClose,
  onSave,
  userToEdit,
  existingUsers,
}: UserFormModalProps) => {
  const [formData, setFormData] =
    useState<Omit<User, 'id' | 'createdAt' | 'lastLogin'>>(EMPTY_USER);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditMode = !!userToEdit;

  useEffect(() => {
    if (isEditMode) {
      setFormData({ ...userToEdit, password: '' });
    } else {
      setFormData(EMPTY_USER);
    }
    setConfirmPassword('');
    setErrors({});
  }, [userToEdit, isOpen]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'الاسم الكامل مطلوب.';
    if (!formData.username.trim()) newErrors.username = 'اسم المستخدم مطلوب.';
    else if (existingUsers.some(u => u.username === formData.username && u.id !== userToEdit?.id)) {
      newErrors.username = 'اسم المستخدم موجود بالفعل.';
    }

    if (!isEditMode || formData.password) {
      if (!formData.password) newErrors.password = 'كلمة المرور مطلوبة.';
      else if (formData.password.length < 6)
        newErrors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
      else if (formData.password !== confirmPassword)
        newErrors.confirmPassword = 'كلمتا المرور غير متطابقتين.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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
    <div className={components.modal.overlay} onClick={onClose}>
      <div className={components.modal.content} onClick={e => e.stopPropagation()}>
        <form
          onSubmit={handleSubmit}
          className={`${components.form.section} max-h-[80vh] overflow-y-auto pr-2`}
        >
          <h2 className={typography.heading.h2}>
            {isEditMode ? AR_LABELS.userDetails : AR_LABELS.addNewUser}
          </h2>

          <div className={components.form.grid}>
            <div className={components.form.field}>
              <label className={components.label}>{AR_LABELS.fullName}</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                className={components.input}
              />
              {errors.fullName && <p className={components.form.error}>{errors.fullName}</p>}
            </div>
            <div className={components.form.field}>
              <label className={components.label}>{AR_LABELS.username}</label>
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData(f => ({ ...f, username: e.target.value }))}
                className={components.input}
              />
              {errors.username && <p className={components.form.error}>{errors.username}</p>}
            </div>
            <div className={components.form.field}>
              <label className={components.label}>{AR_LABELS.password}</label>
              <input
                type="password"
                placeholder={isEditMode ? 'اتركه فارغاً لعدم التغيير' : ''}
                value={formData.password}
                onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                className={components.input}
              />
              {errors.password && <p className={components.form.error}>{errors.password}</p>}
            </div>
            <div className={components.form.field}>
              <label className={components.label}>{AR_LABELS.confirmPassword}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={components.input}
              />
              {errors.confirmPassword && (
                <p className={components.form.error}>{errors.confirmPassword}</p>
              )}
            </div>
            <div className={components.form.field}>
              <label className={components.label}>{AR_LABELS.role}</label>
              <select
                value={formData.role}
                onChange={e => setFormData(f => ({ ...f, role: e.target.value as SystemRole }))}
                className={components.input}
              >
                <option value="Admin">{AR_LABELS.admin}</option>
                <option value="Manager">{AR_LABELS.manager}</option>
                <option value="Cashier">{AR_LABELS.cashier}</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="ml-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {AR_LABELS.status}
              </label>
              <ToggleSwitch
                enabled={formData.status === 'Active'}
                onChange={e => setFormData(f => ({ ...f, status: e ? 'Active' : 'Inactive' }))}
              />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {AR_LABELS.screenAccessPermissions}
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-gray-50 p-4 md:grid-cols-3 dark:border-gray-700 dark:bg-gray-900/50">
              {ALL_PERMISSIONS.map(p => (
                <div key={p} className="flex items-center justify-end">
                  <label
                    htmlFor={`perm-${p}`}
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    {PERMISSION_LABELS[p]}
                  </label>
                  <input
                    type="checkbox"
                    id={`perm-${p}`}
                    checked={formData.permissions.includes(p)}
                    onChange={e => handlePermissionChange(p, e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 dark:border-gray-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-start space-x-4 space-x-reverse pt-4">
            <button type="submit" className={components.button.primary}>
              {AR_LABELS.save}
            </button>
            <button type="button" onClick={onClose} className={components.button.secondary}>
              {AR_LABELS.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
