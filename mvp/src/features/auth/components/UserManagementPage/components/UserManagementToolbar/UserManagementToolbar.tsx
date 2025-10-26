import React, { memo, useCallback } from 'react';
import { AR_LABELS } from '../../../../../../shared/constants';
import { SearchIcon, PlusIcon } from '../../../../../../shared/assets/icons';
import { components, typography } from '../../../../../../shared/styles/design-tokens';

export interface UserFilters {
  status: string;
  role: string;
}

interface UserManagementToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: UserFilters;
  onFilterChange: (filters: UserFilters) => void;
  onAddUser: () => void;
}

export const UserManagementToolbar = memo(
  ({
    searchTerm,
    onSearchChange,
    filters,
    onFilterChange,
    onAddUser,
  }: UserManagementToolbarProps) => {
    const handleSearchChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
      },
      [onSearchChange]
    );

    const handleStatusChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, status: e.target.value });
      },
      [filters, onFilterChange]
    );

    const handleRoleChange = useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        onFilterChange({ ...filters, role: e.target.value });
      },
      [filters, onFilterChange]
    );

    return (
      <div className={components.card}>
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder={AR_LABELS.searchByUserNameOrRole}
              value={searchTerm}
              onChange={handleSearchChange}
              className={`${components.input} py-2 pl-3 pr-10 text-right`}
            />
            <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
            <select
              value={filters.status}
              onChange={handleStatusChange}
              className={`${components.input} w-full text-right md:w-auto`}
            >
              <option value="all">{AR_LABELS.allStatuses}</option>
              <option value="active">{AR_LABELS.active}</option>
              <option value="inactive">{AR_LABELS.inactive}</option>
            </select>
            <select
              value={filters.role}
              onChange={handleRoleChange}
              className={`${components.input} w-full text-right md:w-auto`}
            >
              <option value="all">كل الأدوار</option>
              <option value="Admin">{AR_LABELS.admin}</option>
              <option value="Manager">{AR_LABELS.manager}</option>
              <option value="Cashier">{AR_LABELS.cashier}</option>
            </select>
            <button onClick={onAddUser} className={components.button.primary}>
              <PlusIcon className="ml-2 h-4 w-4" />
              <span>{AR_LABELS.addNewUser}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);

UserManagementToolbar.displayName = 'UserManagementToolbar';
