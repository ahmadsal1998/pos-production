import { useState, useMemo, useCallback } from 'react';
import { User } from '../../../../shared/types';
import { AR_LABELS } from '../../../../shared/constants';
import { UserFormModal, UserManagementToolbar, UserTable } from './components';
import type { UserFilters } from './components/UserManagementToolbar/UserManagementToolbar';
import { typography } from '../../../../shared/styles/design-tokens';
import { useConfirmDialog } from '@/shared/contexts';

interface ModalState {
  isOpen: boolean;
  data: User | null;
}

const UserManagementPage = () => {
  const confirmDialog = useConfirmDialog();
  const [users, setUsers] = useState<User[]>(createInitialUsers());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<UserFilters>({ status: 'all', role: 'all' });
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    data: null,
  });

  const handleSaveUser = useCallback((userData: User) => {
    setUsers(prev => {
      const exists = prev.some(u => u.id === userData.id);
      if (exists) {
        return prev.map(u => (u.id === userData.id ? { ...u, ...userData, password: '' } : u));
      }
      return [{ ...userData, password: '' }, ...prev];
    });
    setModal({ isOpen: false, data: null });
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    const confirmed = await confirmDialog({
      message: 'هل أنت متأكد من حذف هذا المستخدم؟',
    });
    if (!confirmed) return;
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, [confirmDialog]);

  const handleEditUser = useCallback((user: User) => {
    setModal({ isOpen: true, data: user });
  }, []);

  const handleAddUser = useCallback(() => {
    setModal({ isOpen: true, data: null });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal({ isOpen: false, data: null });
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = searchTerm
        ? user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.username.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesStatus =
        filters.status !== 'all' ? user.status.toLowerCase() === filters.status : true;
      const matchesRole = filters.role !== 'all' ? user.role === filters.role : true;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchTerm, filters]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleFilterChange = useCallback((newFilters: UserFilters) => {
    setFilters(newFilters);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={typography.heading.h1}>{AR_LABELS.userManagement}</h1>
        <p className={typography.body.secondary}>{AR_LABELS.userManagementDescription}</p>
      </div>

      {/* Toolbar */}
      <UserManagementToolbar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onAddUser={handleAddUser}
      />

      {/* Table */}
      <UserTable users={filteredUsers} onEdit={handleEditUser} onDelete={handleDeleteUser} />

      {/* Modal */}
      <UserFormModal
        isOpen={modal.isOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        userToEdit={modal.data}
        existingUsers={users}
      />
    </div>
  );
};

export default UserManagementPage;
