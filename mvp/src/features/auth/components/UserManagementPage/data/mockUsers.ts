import { User } from '../../../../../shared/types';
import { UUID } from '../../../../../shared/constants';
import { ALL_PERMISSIONS } from '../../../../../shared/types';

export const createInitialUsers = (): User[] => [
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
    permissions: [
      'dashboard',
      'products',
      'categories',
      'brands',
      'salesToday',
      'salesHistory',
      'refunds',
    ],
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
