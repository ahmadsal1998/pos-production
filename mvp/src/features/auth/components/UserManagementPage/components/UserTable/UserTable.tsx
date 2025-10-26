import React, { memo, useCallback } from 'react';
import { User, ALL_PERMISSIONS } from '../../../../../../shared/types';
import { AR_LABELS } from '../../../../../../shared/constants';
import { EditIcon, DeleteIcon } from '../../../../../../shared/assets/icons';
import { components, typography } from '../../../../../../shared/styles/design-tokens';

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
}

// Memoized user row to prevent re-rendering unchanged rows
const UserRow = memo(({ user, onEdit, onDelete }: UserRowProps) => {
  const handleEditClick = useCallback(() => {
    onEdit(user);
  }, [user, onEdit]);

  const handleDeleteClick = useCallback(() => {
    onDelete(user.id);
  }, [user.id, onDelete]);

  const formattedDate = user.lastLogin
    ? new Date(user.lastLogin).toLocaleString('ar-EG')
    : 'لم يسجل دخول';

  return (
    <tr>
      <td className={components.table.cell}>
        <div className={typography.body.primary}>{user.fullName}</div>
        <div className={typography.body.muted}>{user.username}</div>
      </td>
      <td className={`${components.table.cell} ${typography.body.secondary}`}>
        {AR_LABELS[user.role.toLowerCase() as keyof typeof AR_LABELS]}
      </td>
      <td className={`${components.table.cell} ${typography.body.muted}`}>
        {user.permissions.length} / {ALL_PERMISSIONS.length}
      </td>
      <td className={`${components.table.cell} ${typography.body.muted}`}>{formattedDate}</td>
      <td className={components.table.cell}>
        <span
          className={
            user.status === 'Active' ? components.status.active : components.status.inactive
          }
        >
          {user.status === 'Active' ? AR_LABELS.active : AR_LABELS.inactive}
        </span>
      </td>
      <td className={`${components.table.cell} text-center`}>
        <button
          onClick={handleEditClick}
          className={`${components.button.icon} ml-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300`}
          aria-label={`Edit ${user.fullName}`}
        >
          <EditIcon />
        </button>
        <button
          onClick={handleDeleteClick}
          className={`${components.button.icon} text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300`}
          aria-label={`Delete ${user.fullName}`}
        >
          <DeleteIcon />
        </button>
      </td>
    </tr>
  );
});

UserRow.displayName = 'UserRow';

export const UserTable = memo(({ users, onEdit, onDelete }: UserTableProps) => {
  return (
    <div className={components.table.container}>
      <div className="overflow-x-auto">
        <table className={`min-w-full ${components.table.row} text-right`}>
          <thead className={components.table.header}>
            <tr>
              <th
                className={`${components.table.cell} text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.fullName}
              </th>
              <th
                className={`${components.table.cell} text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.role}
              </th>
              <th
                className={`${components.table.cell} text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.permissions}
              </th>
              <th
                className={`${components.table.cell} text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.lastLogin}
              </th>
              <th
                className={`${components.table.cell} text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.status}
              </th>
              <th
                className={`${components.table.cell} text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400`}
              >
                {AR_LABELS.actions}
              </th>
            </tr>
          </thead>
          <tbody className={`${components.table.row} bg-white dark:bg-gray-800`}>
            {users.map(user => (
              <UserRow key={user.id} user={user} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

UserTable.displayName = 'UserTable';
