import { apiClient } from '../client';

export interface UsersListResponse {
  success: boolean;
  data: {
    items: any[];
    users: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage?: boolean; hasPreviousPage?: boolean };
  };
}

export const usersApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    apiClient.get<UsersListResponse>('/users', params),

  getUser: (id: string) =>
    apiClient.get<{ success: boolean; data: { user: any } }>(`/users/${id}`),

  createUser: (user: any) =>
    apiClient.post<{ success: boolean; data: { user: any } }>('/users', user),

  updateUser: (id: string, user: any) =>
    apiClient.put<{ success: boolean; data: { user: any } }>(`/users/${id}`, user),

  deleteUser: (id: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/users/${id}`),
};
