import React, { memo, useCallback } from 'react';
import { AR_LABELS } from '../../../../../../shared/constants';
import { SearchIcon, PlusIcon } from '../../../../../../shared/assets/icons';
import { components, typography } from '../../../../../../shared/styles/design-tokens';
import CustomDropdown, { DropdownOption } from '../../../../../../shared/components/ui/CustomDropdown/CustomDropdown';

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
      (value: string) => {
        onFilterChange({ ...filters, status: value });
      },
      [filters, onFilterChange]
    );

    const handleRoleChange = useCallback(
      (value: string) => {
        onFilterChange({ ...filters, role: value });
      },
      [filters, onFilterChange]
    );

    const statusOptions: DropdownOption[] = [
      { value: 'all', label: AR_LABELS.allStatuses },
      { value: 'active', label: AR_LABELS.active },
      { value: 'inactive', label: AR_LABELS.inactive },
    ];

    const roleOptions: DropdownOption[] = [
      { value: 'all', label: 'كل الأدوار' },
      { value: 'Admin', label: AR_LABELS.admin },
      { value: 'Manager', label: AR_LABELS.manager },
      { value: 'Cashier', label: AR_LABELS.cashier },
    ];

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
            <div className="w-full md:w-auto">
              <CustomDropdown
                id="status-filter"
                value={filters.status}
                onChange={handleStatusChange}
                options={statusOptions}
                placeholder={AR_LABELS.allStatuses}
                className="w-full md:w-auto"
              />
            </div>
            <div className="w-full md:w-auto">
              <CustomDropdown
                id="role-filter"
                value={filters.role}
                onChange={handleRoleChange}
                options={roleOptions}
                placeholder="كل الأدوار"
                className="w-full md:w-auto"
              />
            </div>
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
